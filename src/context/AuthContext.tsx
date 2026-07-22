import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isAdminLoading: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

// ── Internal helpers (not exported — keeps HMR boundary clean) ────────────────

// Supabase error code for missing table — silently ignored
const TABLE_NOT_FOUND = "42P01";

// ── Admin role cache ──────────────────────────────────────────────────────────
// Stores the result of the user_roles DB query in localStorage so subsequent
// page loads are instant instead of waiting for a slow DB round-trip.
// TTL: 60 minutes. Cleared on sign-out.
const ADMIN_CACHE_KEY = "bt_admin_cache";
const ADMIN_CACHE_TTL = 60 * 60 * 1000;

const readAdminCache = (userId: string): boolean | null => {
  try {
    const raw = localStorage.getItem(ADMIN_CACHE_KEY);
    if (!raw) return null;
    const { uid, value, expires } = JSON.parse(raw) as { uid: string; value: boolean; expires: number };
    if (uid !== userId || Date.now() > expires) return null;
    return value;
  } catch {
    return null;
  }
};

const writeAdminCache = (userId: string, value: boolean) => {
  try {
    localStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify({
      uid: userId, value, expires: Date.now() + ADMIN_CACHE_TTL,
    }));
  } catch { /* storage full — silently skip */ }
};

const clearAdminCache = () => {
  try { localStorage.removeItem(ADMIN_CACHE_KEY); } catch { /* ignore */ }
};

// Fetches the admin role for a given userId from user_roles.
// Has its own try/catch — auth flow must never crash over a role check.
// Uses a ref guard to prevent duplicate fetches for the same userId.
const fetchIsAdmin = async (
  userId: string,
  lastCheckedRef: React.MutableRefObject<string | null>
): Promise<boolean> => {
  // Return cached result instantly — avoids the slow user_roles query on every load
  const cached = readAdminCache(userId);
  if (cached !== null) return cached;

  // Skip if we already fetched for this exact userId this session
  if (lastCheckedRef.current === userId) return false;

  // Mark as in-flight BEFORE the await — prevents concurrent duplicate calls
  lastCheckedRef.current = userId;

  try {
    // Use .limit(1) instead of .maybeSingle() — avoids the 406 "Not Acceptable"
    // error that .maybeSingle() returns when zero rows exist, which was causing
    // a slow 10s round-trip before the error resolved.
    const queryPromise = supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .limit(1)
      .then((res) => res);

    let timer: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<{ data: null; error: { code: string; message: string } }>((resolve) => {
      timer = setTimeout(() => {
        console.warn("[AuthContext] fetchIsAdmin timed out after 20s — treating as non-admin.");
        resolve({ data: null, error: { code: "TIMEOUT", message: "timeout" } });
      }, 20000);
    });

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
    clearTimeout(timer!);

    if (error) {
      if (error.code !== TABLE_NOT_FOUND && error.code !== "TIMEOUT") {
        console.warn("[AuthContext] fetchIsAdmin:", error.message);
      }
      return false;
    }

    const isAdmin = Array.isArray(data) && data.length > 0;
    writeAdminCache(userId, isAdmin);
    return isAdmin;
  } catch (err) {
    console.warn("[AuthContext] fetchIsAdmin unexpected:", err);
    return false;
  }
};

// Detects whether a Supabase login token exists in localStorage WITHOUT making
// any network call. Anonymous visitors (no token) can skip the entire auth
// bootstrap — getSession() would otherwise attempt a token refresh over the
// network, which hangs for far-away users and competes with the data queries
// for the connection. Only users who have actually signed in have this key.
const hasStoredSession = (): boolean => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) return true;
    }
  } catch { /* localStorage blocked — treat as anonymous */ }
  return false;
};

// ── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Tracks the last userId we fetched a role for.
  // Passed into fetchIsAdmin to prevent triple-fetch:
  //   (1) initializeSession  (2) INITIAL_SESSION event  (3) StrictMode remount
  const lastCheckedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // isMounted guard — prevents setState calls after unmount (StrictMode safe)
    let isMounted = true;

    // ── Step 1: Initialize session on mount ───────────────────────────────
    // This is the SINGLE owner of setLoading(false).
    // The finally block guarantees it fires regardless of success or failure.
    // onAuthStateChange below handles FUTURE changes only — it never
    // touches the loading state.
    const initializeSession = async () => {
      // Fast path for anonymous visitors: no stored login token means there is
      // nothing to restore, so skip getSession() entirely. This removes the
      // token-refresh network round-trip (and its 15s hang on slow links) for
      // everyone who hasn't signed in — i.e. the entire public audience.
      if (!hasStoredSession()) {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        console.log("[AuthContext] Fetching session...");

        // Failsafe: If getSession hangs (slow network on cold start), resolve
        // anonymously after 8s so the app can boot. We do NOT wipe localStorage
        // here — a slow response is not the same as a corrupted token, and wiping
        // it would log the admin out on every sluggish page load.
        const sessionPromise = supabase.auth.getSession();
        let timer: ReturnType<typeof setTimeout>;
        const timeoutPromise = new Promise<{ data: { session: null }, error: null }>((resolve) => {
          timer = setTimeout(() => {
            console.warn("[AuthContext] getSession took >15s — resolving anonymously to unblock app. Token preserved.");
            resolve({ data: { session: null }, error: null });
          }, 15000);
        });

        const {
          data: { session },
          error,
        } = await Promise.race([sessionPromise, timeoutPromise]);
        clearTimeout(timer!);

        if (error) throw error;

        if (!isMounted) return;

        if (session?.user) {
          // Session found — populate state and fetch role
          setSession(session);
          setUser(session.user);

          const admin = await fetchIsAdmin(session.user.id, lastCheckedUserIdRef);
          if (isMounted) setIsAdmin(admin);
        } else {
          // No session — user is anonymous guest
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        }
      } catch (err) {
        // getSession() failed (network error, corrupted localStorage, etc.)
        // Log it but never block the app — user proceeds as anonymous guest.
        console.warn("[AuthContext] initializeSession error:", err);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        }
      } finally {
        // CRITICAL: This is the ONLY place setLoading(false) is called.
        // Runs unconditionally — success path, error path, or throw.
        // The app is guaranteed to exit the loading state after this.
        if (isMounted) setLoading(false);
      }
    };

    // Run auth immediately on admin routes (they need it to render). On public
    // pages, defer it until the browser is idle so the token-refresh round-trip
    // never competes with the homepage's critical data fetch — this is what made
    // an admin's own homepage load slower than a guest's on a slow link. The
    // public UI never blocks on auth, so a brief delay is invisible.
    let deferTimer: ReturnType<typeof setTimeout> | undefined;
    const onAdminPath = window.location.pathname.startsWith("/admin");
    if (onAdminPath || !hasStoredSession()) {
      initializeSession();
    } else {
      const ric = (window as typeof window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }).requestIdleCallback;
      if (ric) ric(() => { if (isMounted) initializeSession(); }, { timeout: 3000 });
      else deferTimer = setTimeout(() => { if (isMounted) initializeSession(); }, 1500);
    }

    // ── Step 2: Listen for FUTURE auth state changes ──────────────────────
    // Handles sign-in and sign-out events that happen AFTER initial load.
    // Does NOT call setLoading — that concern belongs only to initializeSession.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      // Skip INITIAL_SESSION — initializeSession already handled it above.
      // Without this guard, INITIAL_SESSION would trigger a duplicate
      // role fetch and potentially race with initializeSession's setState calls.
      if (event === "INITIAL_SESSION") return;

      try {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // New sign-in or token refresh — reset ref so role is re-fetched
          setIsAdminLoading(true);
          if (lastCheckedUserIdRef.current !== session.user.id) {
            lastCheckedUserIdRef.current = null;
          }
          const admin = await fetchIsAdmin(session.user.id, lastCheckedUserIdRef);
          if (isMounted) {
            setIsAdmin(admin);
            setIsAdminLoading(false);
          }
        } else {
          // SIGNED_OUT — clear everything including cached admin status
          lastCheckedUserIdRef.current = null;
          clearAdminCache();
          setIsAdmin(false);
          setIsAdminLoading(false);
        }
      } catch (err) {
        console.warn("[AuthContext] onAuthStateChange handler error:", err);
        if (isMounted) setIsAdmin(false);
      }
    });

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      isMounted = false;
      if (deferTimer) clearTimeout(deferTimer);
      subscription.unsubscribe();
    };
  }, []); // Empty dep array — runs once on mount only

  // ── signIn ────────────────────────────────────────────────────────────────
  // onAuthStateChange fires SIGNED_IN after this resolves —
  // state update is handled there automatically.
  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  // ── signOut ───────────────────────────────────────────────────────────────
  // onAuthStateChange fires SIGNED_OUT after this resolves —
  // state clear is handled there automatically.
  // We also eagerly clear local state for instant UI response.
  const signOut = async (): Promise<void> => {
    lastCheckedUserIdRef.current = null;
    clearAdminCache();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, isAdmin, isAdminLoading, loading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook (exported at bottom — clean HMR boundary for Vite React-SWC) ────────
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};