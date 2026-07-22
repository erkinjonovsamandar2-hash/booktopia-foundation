import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "❌ [Supabase] Missing env vars: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is undefined.\n" +
    "   → If running locally: restart the dev server (Vite reads .env on startup, not hot-reload).\n" +
    "   → If running on Lovable/Vercel/etc: add these vars in the platform's environment settings."
  );
}

const directUrl = SUPABASE_URL ?? "https://ovlqfgjdmbvstqibrqrl.supabase.co";
const anonKey = SUPABASE_ANON_KEY ?? "placeholder";

// Route ALL Supabase traffic (REST + auth + storage + realtime) through the
// same-origin /_sb proxy. This is NOT just a dev CORS shim — it is a real
// performance fix for the target audience: a direct browser->supabase.co
// connection from Uzbekistan/Central Asia takes the slow international route and
// can hang for 8-20s. The /_sb rewrite (see vercel.json) sends the request
// through Vercel's edge, which has fast connectivity to Supabase. In DEV, Vite's
// proxy handles /_sb. (Storage IMAGES are the exception — those go direct to the
// Cloudflare CDN via imgUrl(); this fetch only carries the JS client's traffic.)
const proxyFetch: typeof fetch = (url, options) => {
  if (typeof window !== "undefined") {
    const urlStr = url.toString();
    if (urlStr.startsWith(directUrl)) {
      return fetch(urlStr.replace(directUrl, window.location.origin + "/_sb"), options);
    }
  }
  return fetch(url, options);
};

// Authenticated client — persists the session and auto-refreshes the token.
// Use for anything that needs the signed-in user (admin panels, mutations).
export const supabase = createClient<Database>(directUrl, anonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: { fetch: proxyFetch },
});

// Public/anonymous client — never reads, persists, or refreshes a session.
//
// Why this exists: supabase-js serializes queries behind auth initialization.
// When a stored admin token is present, every read on the main client waits for
// that token to be refreshed — and on a slow link that refresh hangs, blocking
// the homepage's data fetch for 8-20s. A guest (no token) never hits this.
//
// Public data (books, blog, settings, …) is readable anonymously, so we fetch it
// through this token-less client. It always loads at guest speed, regardless of
// whether an admin token is sitting in localStorage. A unique storageKey keeps
// it fully isolated from the authenticated client's session.
export const supabasePublic = createClient<Database>(directUrl, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: "sb-public-noauth",
  },
  global: { fetch: proxyFetch },
});