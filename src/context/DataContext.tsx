import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_QUIZ_CONFIG, DEFAULT_SITE_SETTINGS } from "@/lib/mockData";
import type { Book, NewBook, Article } from "@/types/database";

export type { Book, NewBook, Article };

// ── Review type ───────────────────────────────────────────────────────────────
export interface Review {
  id: string;
  name: string;
  role: string | null;
  city: string | null;
  text: string;
  stars: number;
  status: "pending" | "published" | "rejected";
  created_at: string;
  book_id?: string | null;
  book_title?: string | null;
}

// ── Team & Author types ──────────────────────────────────────────────────────
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  image_url: string | null;
  is_founder: boolean;
  sort_order: number;
  created_at: string;
}

export interface AuthorSpotlightItem {
  id: string;
  name: string;
  role: "MUALLIF" | "TARJIMON";
  image_url: string | null;
  sort_order: number;
  description: string | null;
  books: string | null;
  created_at: string;
}

// ── Partner type ──────────────────────────────────────────────────────────────
export interface PartnerMapEntry {
  label: string;
  url: string;
}

export interface PartnerWebsiteEntry {
  label: string;
  url: string;
}

export interface Partner {
  id: string;
  name: string;
  type: "Rasmiy hamkor" | "Onlayn hamkor";
  bio: string | null;
  location: string | null;
  branches: number | null;
  phone: string | null;
  website: string | null;
  websites: PartnerWebsiteEntry[];
  maps_url: string | null;
  maps_urls: PartnerMapEntry[];
  image_url: string | null;
  accent_color: string;
  sort_order: number;
  created_at: string;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface QuizStep {
  question: string;
  options: { label: string; value: string }[];
}

export interface QuizPath {
  key: string;
  bookId: string;
  reason: string;
}

export interface EditableOption {
  label: string;
  sublabel: string;
}

export interface EditableQuestion {
  question: string;
  aunt: string;
  options: EditableOption[];
}

export interface QuizConfig {
  steps: QuizStep[];
  paths: QuizPath[];
  defaultBookId: string;
  defaultReason: string;
  questions?: EditableQuestion[];
  certStatements?: Record<string, [string, string]>;
  browseBooks?: Record<string, string[]>; // archetype key → up to 6 pinned book IDs
}

export interface SiteSettings {
  hero: { motto: string; subtitle: string; cta_text: string };
  footer: { phone: string; email: string; address: string; telegram: string; instagram: string };
  map: { enabled: boolean; embed_url: string; title: string };
  bookOfMonth: { quote: string; quote_author: string; badge: string };
  theme: { primary_color: "blue" | "sky" | "gold" };
  yangiNashrlar: { bg_image_url: string };
}

// ── Context shape ─────────────────────────────────────────────────────────────
interface DataContextType {
  books: Book[];
  newBooks: NewBook[];
  articles: Article[];
  reviews: Review[];
  teamMembers: TeamMember[];
  authorSpotlights: AuthorSpotlightItem[];
  partners: Partner[];
  partnersLoading: boolean;
  partnersTableReady: boolean;
  quizConfig: QuizConfig;
  siteSettings: SiteSettings;
  loading: boolean;
  teamLoading: boolean;
  authorsLoading: boolean;
  booksError: boolean;
  articlesError: boolean;
  addBook: (book: Omit<Book, "id" | "created_at" | "updated_at">) => Promise<void>;
  updateBook: (id: string, data: Partial<Book>) => Promise<void>;
  deleteBook: (id: string, coverUrl?: string | null) => Promise<void>;
  addNewBook: (book: Omit<NewBook, "id" | "created_at" | "updated_at">) => Promise<void>;
  updateNewBook: (id: string, data: Partial<NewBook>) => Promise<void>;
  deleteNewBook: (id: string, coverUrl?: string | null) => Promise<void>;
  addArticle: (article: Omit<Article, "id" | "created_at" | "updated_at">) => Promise<void>;
  updateArticle: (id: string, data: Partial<Article>) => Promise<void>;
  deleteArticle: (id: string, coverUrl?: string | null) => Promise<void>;
  updateQuizConfig: (config: QuizConfig) => Promise<void>;
  updateSiteSettings: (settings: SiteSettings) => Promise<void>;
  refreshBooks: () => Promise<void>;
  refreshNewBooks: () => Promise<void>;
  refreshArticles: () => Promise<void>;
  submitReview: (payload: Omit<Review, "id" | "status" | "created_at">) => Promise<{ error: string | null }>;
  addTeamMember: (m: Omit<TeamMember, "id" | "created_at">) => Promise<void>;
  updateTeamMember: (id: string, data: Partial<TeamMember>) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;
  addAuthorSpotlight: (a: Omit<AuthorSpotlightItem, "id" | "created_at">) => Promise<void>;
  updateAuthorSpotlight: (id: string, data: Partial<AuthorSpotlightItem>) => Promise<void>;
  deleteAuthorSpotlight: (id: string) => Promise<void>;
  addPartner: (p: Omit<Partner, "id" | "created_at">) => Promise<void>;
  updatePartner: (id: string, data: Partial<Partner>) => Promise<void>;
  deletePartner: (id: string, imageUrl?: string | null) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
};

// ── Supabase error codes ──────────────────────────────────────────────────────
// 42P01  = table does not exist (PostgreSQL)
// PGRST116 = no rows returned (PostgREST)
const TABLE_NOT_FOUND = "42P01";
const NO_ROWS = "PGRST116";

// ── Storage helper ────────────────────────────────────────────────────────────
// Extracts the object path within a bucket from a full Supabase public URL.
// Returns null if the URL doesn't belong to the given bucket.
const extractStoragePath = (url: string | null | undefined, bucket: string): string | null => {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
};

// ── Provider ──────────────────────────────────────────────────────────────────
export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [newBooks, setNewBooks] = useState<NewBook[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [authorSpotlights, setAuthorSpotlights] = useState<AuthorSpotlightItem[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);
  const [partnersTableReady, setPartnersTableReady] = useState(false);
  const [quizConfig, setQuizConfig] = useState<QuizConfig>(DEFAULT_QUIZ_CONFIG);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(true);
  const [authorsLoading, setAuthorsLoading] = useState(true);
  const [booksError, setBooksError] = useState(false);
  const [articlesError, setArticlesError] = useState(false);

  // ── Fetchers ──────────────────────────────────────────────────────────────

  // FIX: Wrapped in try/catch to match all other fetchers.
  // FIX: Removed .setHeader("x-client-info", ...) — this method does NOT exist
  //      on the Supabase JS v2 query builder. It was throwing a synchronous
  //      TypeError before the await resolved, which could propagate outside
  //      Promise.allSettled and cause the loading state to hang forever.
  const fetchBooks = useCallback(async () => {
    try {
      console.log("[DataContext] Attempting to fetch books...");
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: false });

      if (error) {
        console.error("[DataContext] FAILED to fetch books:", error);
        if (error.code === TABLE_NOT_FOUND) {
          console.warn("[DataContext] fetchBooks: books table not found");
          return;
        }
        setBooksError(true);
        return;
      }

      console.log(`[DataContext] Successfully fetched ${data?.length || 0} books.`);
      if (data) {
        setBooks(data as Book[]);
        setBooksError(false);
      }
    } catch (err) {
      console.error("[DataContext] fetchBooks threw unexpected error:", err);
      setBooksError(true);
    }
  }, []);

  const fetchNewBooks = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("new_books")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: false });
      if (error) {
        if (error.code === TABLE_NOT_FOUND) return;
        console.warn("[DataContext] fetchNewBooks:", error.message);
        return;
      }
      if (data) setNewBooks(data as NewBook[]);
    } catch (err) {
      console.warn("[DataContext] fetchNewBooks unexpected:", err);
    }
  }, []);

  // fetchBlogPosts — dedicated fetch for the blog_posts table
  const fetchBlogPosts = useCallback(async () => {
    try {
      console.log("[DataContext] Attempting to fetch blog posts...");
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("published_at", { ascending: false });

      if (error) {
        if (error.code === TABLE_NOT_FOUND) {
          console.warn("[DataContext] fetchBlogPosts: blog_posts table not found");
          return;
        }
        console.error("[DataContext] FAILED to fetch blog posts:", error);
        setArticlesError(true);
        return;
      }

      console.log("[DataContext] Successfully fetched", data?.length ?? 0, "blog posts.");
      if (data) {
        setArticles(data as Article[]);
        setArticlesError(false);
      }
    } catch (err) {
      console.error("[DataContext] fetchBlogPosts threw unexpected error:", err);
      setArticlesError(true);
    }
  }, []);

  // fetchReviews — silently handles missing table (42P01)
  const fetchReviews = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("reviews")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === TABLE_NOT_FOUND) return;
        console.warn("[DataContext] fetchReviews:", error.message);
        return;
      }
      if (data) setReviews(data as Review[]);
    } catch (err) {
      console.warn("[DataContext] fetchReviews unexpected:", err);
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("team_members")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) { if (error.code === TABLE_NOT_FOUND) return; console.warn("[DataContext] fetchTeamMembers:", error.message); return; }
      if (data) setTeamMembers(data as TeamMember[]);
    } catch (err) { console.warn("[DataContext] fetchTeamMembers unexpected:", err); }
    finally { setTeamLoading(false); }
  }, []);

  const fetchAuthorSpotlights = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("author_spotlights")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) { if (error.code === TABLE_NOT_FOUND) return; console.warn("[DataContext] fetchAuthorSpotlights:", error.message); return; }
      if (data) setAuthorSpotlights(data as AuthorSpotlightItem[]);
    } catch (err) { console.warn("[DataContext] fetchAuthorSpotlights unexpected:", err); }
    finally { setAuthorsLoading(false); }
  }, []);

  const fetchPartners = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("partners")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) { if (error.code === TABLE_NOT_FOUND) return; console.warn("[DataContext] fetchPartners:", error.message); return; }
      setPartnersTableReady(true);
      if (data) setPartners(data as Partner[]);
    } catch (err) { console.warn("[DataContext] fetchPartners unexpected:", err); }
    finally { setPartnersLoading(false); }
  }, []);

  // fetchQuiz — silently handles missing table (42P01) and empty table.
  // Uses .limit(1) without .single() — .single() returns 406 when zero rows
  // exist, which causes a noisy console error and a slow request cycle.
  const fetchQuiz = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("quiz_config")
        .select("*")
        .limit(1);

      if (error) {
        if (error.code === TABLE_NOT_FOUND) return;
        console.warn("[DataContext] fetchQuiz:", error.message);
        return;
      }
      const row = Array.isArray(data) ? data[0] : null;
      if (row?.config) setQuizConfig(row.config as unknown as QuizConfig);
    } catch (err) {
      console.warn("[DataContext] fetchQuiz unexpected:", err);
    }
  }, []);

  // fetchSiteSettings — silently handles missing table (42P01)
  const fetchSiteSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*");

      if (error) {
        if (error.code === TABLE_NOT_FOUND) return;
        console.warn("[DataContext] fetchSiteSettings:", error.message);
        return;
      }
      if (data && data.length > 0) {
        const merged: Record<string, unknown> = { ...DEFAULT_SITE_SETTINGS };
        data.forEach((row: { key: string; value: unknown }) => {
          const def = (DEFAULT_SITE_SETTINGS as unknown as Record<string, unknown>)[row.key];
          if (def && typeof def === "object" && typeof row.value === "object" && row.value !== null) {
            merged[row.key] = { ...def as object, ...row.value as object };
          } else {
            merged[row.key] = row.value;
          }
        });
        setSiteSettings(merged as unknown as SiteSettings);
      }
    } catch (err) {
      console.warn("[DataContext] fetchSiteSettings unexpected:", err);
    }
  }, []);

  // ── Initial parallel data load ────────────────────────────────────────────
  // Promise.allSettled — one failing fetch never blocks others.
  // Each fetcher has its own try/catch so allSettled never sees a rejection.
  // The finally block GUARANTEES setLoading(false) runs no matter what.
  useEffect(() => {
    const init = async () => {
      try {
        // Quick raw-fetch diagnostic — tells us whether it's a Supabase JS client
        // issue or a plain network/CORS issue in this browser environment.
        console.log("[DataContext] Fetching data...");
        const fetchAllPromise = Promise.allSettled([
          fetchBooks(),
          fetchNewBooks(),
          fetchBlogPosts(),
          fetchReviews(),
          fetchQuiz(),
          fetchSiteSettings(),
          fetchTeamMembers(),
          fetchAuthorSpotlights(),
          fetchPartners(),
        ]);

        let timer: ReturnType<typeof setTimeout>;
        const timeoutPromise = new Promise((resolve) => {
          timer = setTimeout(() => {
            console.warn("[DataContext] Fetch loop timed out after 15s! Resolving early to prevent deadlock.");
            resolve(null);
          }, 15000);
        });

        await Promise.race([fetchAllPromise, timeoutPromise]);
        clearTimeout(timer!);
      } catch (err) {
        // Outermost safety net — Promise.allSettled itself never rejects,
        // but this catches any synchronous error in the orchestration layer.
        console.warn("[DataContext] init unexpected:", err);
      } finally {
        // CRITICAL: This MUST be in finally — it runs even if catch fires.
        // This is the single source of truth that resolves the loading splash.
        console.log("[DataContext] Resolving initial load state... setLoading(false)");
        setLoading(false);
      }
    };

    init();
  }, [fetchBooks, fetchNewBooks, fetchBlogPosts, fetchReviews, fetchQuiz, fetchSiteSettings, fetchTeamMembers, fetchAuthorSpotlights, fetchPartners]);

  // ── Realtime subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("new_books_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "new_books" }, () => { fetchNewBooks(); })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") console.warn("[DataContext] new_books realtime error.");
      });
    return () => { supabase.removeChannel(channel); };
  }, [fetchNewBooks]);

  useEffect(() => {
    const channel = supabase
      .channel("site_settings_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => { fetchSiteSettings(); })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") console.warn("[DataContext] site_settings realtime error.");
      });
    return () => { supabase.removeChannel(channel); };
  }, [fetchSiteSettings]);

  // ── submitReview ──────────────────────────────────────────────────────────
  const submitReview = useCallback(async (
    payload: Omit<Review, "id" | "status" | "created_at">
  ): Promise<{ error: string | null }> => {
    try {
      const insert: Record<string, unknown> = {
        name: payload.name,
        role: payload.role,
        city: payload.city,
        text: payload.text,
        stars: payload.stars,
        status: "pending",
      };
      if (payload.book_id) insert.book_id = payload.book_id;
      if (payload.book_title) insert.book_title = payload.book_title;

      const { error } = await (supabase as any)
        .from("reviews")
        .insert(insert);

      if (error?.code === TABLE_NOT_FOUND) {
        return { error: "Sharh xizmati hozircha mavjud emas." };
      }
      return { error: error?.message ?? null };
    } catch (err) {
      return { error: "Kutilmagan xato yuz berdi." };
    }
  }, []);

  // ── Mutators — Books ──────────────────────────────────────────────────────

  const addBook = useCallback(async (
    book: Omit<Book, "id" | "created_at" | "updated_at">
  ) => {
    const { error } = await supabase.from("books").insert({
      title: book.title,
      title_en: book.title_en,
      title_ru: book.title_ru,
      author: book.author,
      author_en: book.author_en,
      author_ru: book.author_ru,
      description: book.description,
      description_en: book.description_en,
      description_ru: book.description_ru,
      cover_url: book.cover_url,
      bg_color: book.bg_color,
      category: book.category,
      price: book.price,
      enable_3d_flip: book.enable_3d_flip,
      featured: book.featured,
      sort_order: book.sort_order,
      excerpt_url: book.excerpt_url ?? null,
    });
    if (error) {
      console.warn("[DataContext] addBook:", error.message);
      throw new Error(error.message);
    }
    await fetchBooks();
  }, [fetchBooks]);

  const updateBook = useCallback(async (id: string, data: Partial<Book>) => {
    const payload: Record<string, unknown> = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.title_en !== undefined) payload.title_en = data.title_en;
    if (data.title_ru !== undefined) payload.title_ru = data.title_ru;
    if (data.author !== undefined) payload.author = data.author;
    if (data.author_en !== undefined) payload.author_en = data.author_en;
    if (data.author_ru !== undefined) payload.author_ru = data.author_ru;
    if (data.description !== undefined) payload.description = data.description;
    if (data.description_en !== undefined) payload.description_en = data.description_en;
    if (data.description_ru !== undefined) payload.description_ru = data.description_ru;
    if (data.cover_url !== undefined) payload.cover_url = data.cover_url;
    if (data.bg_color !== undefined) payload.bg_color = data.bg_color;
    if (data.category !== undefined) payload.category = data.category;
    if (data.price !== undefined) payload.price = data.price;
    if (data.enable_3d_flip !== undefined) payload.enable_3d_flip = data.enable_3d_flip;
    if (data.featured !== undefined) payload.featured = data.featured;
    if (data.sort_order !== undefined) payload.sort_order = data.sort_order;
    if (data.excerpt_url !== undefined) payload.excerpt_url = data.excerpt_url;

    const { error } = await supabase.from("books").update(payload).eq("id", id);
    if (error) {
      console.warn("[DataContext] updateBook:", error.message);
      throw new Error(error.message);
    }
    // Optimistic update — reflect immediately
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, ...payload } : b)));
    // Re-fetch to ensure remote sync
    await fetchBooks();
  }, [fetchBooks]);

  const deleteBook = useCallback(async (id: string, coverUrl?: string | null) => {
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) {
      console.warn("[DataContext] deleteBook:", error.message);
      throw new Error(error.message);
    }
    if (coverUrl) {
      const path = extractStoragePath(coverUrl, "books");
      if (path) {
        const { error: storageErr } = await supabase.storage.from("books").remove([path]);
        if (storageErr) console.warn("[DataContext] deleteBook storage cleanup:", storageErr.message);
      }
    }
    // Also clean up the PDF excerpt if one exists
    const bookToDelete = books.find((b) => b.id === id);
    if (bookToDelete?.excerpt_url) {
      const excerptPath = extractStoragePath(bookToDelete.excerpt_url, "books");
      if (excerptPath) {
        const { error: excerptErr } = await supabase.storage.from("books").remove([excerptPath]);
        if (excerptErr) console.warn("[DataContext] deleteBook excerpt cleanup:", excerptErr.message);
      }
    }
    await fetchBooks();
  }, [fetchBooks]);

  // ── Mutators — New Books ─────────────────────────────────────────────────

  // Coerce empty-string cover_url → null so the DB never stores "" (falsy),
  // which would make every {book.cover_url ? <img/> : fallback} render the fallback.
  const sanitizeCoverUrl = (url: string | null | undefined): string | null =>
    url && url.trim() !== "" ? url : null;

  const addNewBook = useCallback(async (
    book: Omit<NewBook, "id" | "created_at" | "updated_at">
  ) => {
    const { error } = await (supabase as any).from("new_books").insert({
      title: book.title, title_en: book.title_en, title_ru: book.title_ru,
      author: book.author, author_en: book.author_en, author_ru: book.author_ru,
      description: book.description, description_en: book.description_en, description_ru: book.description_ru,
      cover_url: sanitizeCoverUrl(book.cover_url),
      bg_color: book.bg_color, category: book.category,
      price: book.price, enable_3d_flip: book.enable_3d_flip, featured: book.featured,
      sort_order: book.sort_order,
      img_focus_x: book.img_focus_x, img_focus_y: book.img_focus_y,
      focus_desktop_x: book.focus_desktop_x, focus_desktop_y: book.focus_desktop_y,
      focus_mobile_x: book.focus_mobile_x, focus_mobile_y: book.focus_mobile_y,
    });
    if (error) { console.warn("[DataContext] addNewBook:", error.message); throw new Error(error.message); }
    await fetchNewBooks();
  }, [fetchNewBooks]);

  const updateNewBook = useCallback(async (id: string, data: Partial<NewBook>) => {
    const p: Record<string, unknown> = {};
    const fields: (keyof NewBook)[] = [
      "title", "title_en", "title_ru", "author", "author_en", "author_ru",
      "description", "description_en", "description_ru", "cover_url", "bg_color",
      "category", "price", "enable_3d_flip", "featured", "sort_order",
      "img_focus_x", "img_focus_y",
      "focus_desktop_x", "focus_desktop_y", "focus_mobile_x", "focus_mobile_y",
    ];
    for (const f of fields) if (data[f] !== undefined) p[f] = data[f];
    // Sanitize cover_url: "" → null to prevent falsy cover rendering
    if ("cover_url" in p) p.cover_url = sanitizeCoverUrl(p.cover_url as string | null);
    const { error } = await (supabase as any).from("new_books").update(p).eq("id", id);
    if (error) { console.warn("[DataContext] updateNewBook:", error.message); throw new Error(error.message); }
    // Optimistic update — mirror sanitized payload so table re-renders immediately
    setNewBooks((prev) => prev.map((b) => (b.id === id ? { ...b, ...p } : b)));
    await fetchNewBooks();
  }, [fetchNewBooks]);

  const deleteNewBook = useCallback(async (id: string, coverUrl?: string | null) => {
    const { error } = await (supabase as any).from("new_books").delete().eq("id", id);
    if (error) { console.warn("[DataContext] deleteNewBook:", error.message); throw new Error(error.message); }
    if (coverUrl) {
      const path = extractStoragePath(coverUrl, "books");
      if (path) {
        const { error: se } = await supabase.storage.from("books").remove([path]);
        if (se) console.warn("[DataContext] deleteNewBook storage:", se.message);
      }
    }
    await fetchNewBooks();
  }, [fetchNewBooks]);

  // ── Mutators — Articles ───────────────────────────────────────────────────

  const addArticle = useCallback(async (
    article: Omit<Article, "id" | "created_at" | "updated_at">
  ) => {
    const { error } = await supabase.from("blog_posts").insert({
      title: article.title,
      title_en: article.title_en,
      title_ru: article.title_ru,
      excerpt: article.excerpt,
      excerpt_en: article.excerpt_en,
      excerpt_ru: article.excerpt_ru,
      content: article.content,
      content_en: article.content_en,
      content_ru: article.content_ru,
      image_url: article.image_url,
      published_at: article.published_at,
      published: article.published,
      category: article.category,
      reading_time: article.reading_time,
      focus_desktop_x: article.focus_desktop_x,
      focus_desktop_y: article.focus_desktop_y,
      focus_mobile_x: article.focus_mobile_x,
      focus_mobile_y: article.focus_mobile_y,
      slug: article.slug,
      author_name: article.author_name,
      author_photo: article.author_photo,
      author_link: article.author_link,
      related_book_ids: article.related_book_ids,
    });
    if (error) {
      console.warn("[DataContext] addArticle:", error.message);
      throw new Error(error.message);
    }
    await fetchBlogPosts();
  }, [fetchBlogPosts]);

  const updateArticle = useCallback(async (id: string, data: Partial<Article>) => {
    const payload: Record<string, unknown> = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.title_en !== undefined) payload.title_en = data.title_en;
    if (data.title_ru !== undefined) payload.title_ru = data.title_ru;
    if (data.excerpt !== undefined) payload.excerpt = data.excerpt;
    if (data.excerpt_en !== undefined) payload.excerpt_en = data.excerpt_en;
    if (data.excerpt_ru !== undefined) payload.excerpt_ru = data.excerpt_ru;
    if (data.content !== undefined) payload.content = data.content;
    if (data.content_en !== undefined) payload.content_en = data.content_en;
    if (data.content_ru !== undefined) payload.content_ru = data.content_ru;
    if (data.image_url !== undefined) payload.image_url = data.image_url;
    if (data.published_at !== undefined) payload.published_at = data.published_at;
    if (data.published !== undefined) payload.published = data.published;
    if (data.category !== undefined) payload.category = data.category;
    if (data.reading_time !== undefined) payload.reading_time = data.reading_time;
    if (data.focus_desktop_x !== undefined) payload.focus_desktop_x = data.focus_desktop_x;
    if (data.focus_desktop_y !== undefined) payload.focus_desktop_y = data.focus_desktop_y;
    if (data.focus_mobile_x !== undefined) payload.focus_mobile_x = data.focus_mobile_x;
    if (data.focus_mobile_y !== undefined) payload.focus_mobile_y = data.focus_mobile_y;
    if (data.slug !== undefined) payload.slug = data.slug;
    if (data.author_name !== undefined) payload.author_name = data.author_name;
    if (data.author_photo !== undefined) payload.author_photo = data.author_photo;
    if (data.author_link !== undefined) payload.author_link = data.author_link;
    if (data.related_book_ids !== undefined) payload.related_book_ids = data.related_book_ids;

    const { data: updated, error } = await supabase.from("blog_posts").update(payload).eq("id", id).select("id");
    if (error) {
      console.warn("[DataContext] updateArticle:", error.message);
      throw new Error(error.message);
    }
    if (!updated || updated.length === 0) {
      throw new Error("Ruxsat yo'q yoki maqola topilmadi. Admin rolini tekshiring.");
    }
    await fetchBlogPosts();
  }, [fetchBlogPosts]);

  const deleteArticle = useCallback(async (id: string, coverUrl?: string | null) => {
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      console.warn("[DataContext] deleteArticle:", error.message);
      throw new Error(error.message);
    }
    if (coverUrl) {
      const path = extractStoragePath(coverUrl, "books");
      if (path) {
        const { error: storageErr } = await supabase.storage.from("books").remove([path]);
        if (storageErr) console.warn("[DataContext] deleteArticle storage cleanup:", storageErr.message);
      }
    }
    await fetchBlogPosts();
  }, [fetchBlogPosts]);

  // ── Mutators — Team Members ──────────────────────────────────────────────

  const addTeamMember = useCallback(async (m: Omit<TeamMember, "id" | "created_at">) => {
    const { error } = await (supabase as any).from("team_members").insert(m);
    if (error) { throw new Error(error.message); }
    await fetchTeamMembers();
  }, [fetchTeamMembers]);

  const updateTeamMember = useCallback(async (id: string, data: Partial<TeamMember>) => {
    const { error } = await (supabase as any).from("team_members").update(data).eq("id", id);
    if (error) { throw new Error(error.message); }
    setTeamMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...data } : m)));
    await fetchTeamMembers();
  }, [fetchTeamMembers]);

  const deleteTeamMember = useCallback(async (id: string) => {
    const { error } = await (supabase as any).from("team_members").delete().eq("id", id);
    if (error) { throw new Error(error.message); }
    await fetchTeamMembers();
  }, [fetchTeamMembers]);

  // ── Mutators — Author Spotlights ─────────────────────────────────────────

  const addAuthorSpotlight = useCallback(async (a: Omit<AuthorSpotlightItem, "id" | "created_at">) => {
    const { error } = await (supabase as any).from("author_spotlights").insert(a);
    if (error) { throw new Error(error.message); }
    await fetchAuthorSpotlights();
  }, [fetchAuthorSpotlights]);

  const updateAuthorSpotlight = useCallback(async (id: string, data: Partial<AuthorSpotlightItem>) => {
    const { error } = await (supabase as any).from("author_spotlights").update(data).eq("id", id);
    if (error) { throw new Error(error.message); }
    setAuthorSpotlights((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
    await fetchAuthorSpotlights();
  }, [fetchAuthorSpotlights]);

  const deleteAuthorSpotlight = useCallback(async (id: string) => {
    const { error } = await (supabase as any).from("author_spotlights").delete().eq("id", id);
    if (error) { throw new Error(error.message); }
    await fetchAuthorSpotlights();
  }, [fetchAuthorSpotlights]);

  // ── Mutators — Partners ──────────────────────────────────────────────────

  const addPartner = useCallback(async (p: Omit<Partner, "id" | "created_at">) => {
    const { error } = await (supabase as any).from("partners").insert(p);
    if (error) { throw new Error(error.message); }
    await fetchPartners();
  }, [fetchPartners]);

  const updatePartner = useCallback(async (id: string, data: Partial<Partner>) => {
    const { error } = await (supabase as any).from("partners").update(data).eq("id", id);
    if (error) { throw new Error(error.message); }
    setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    await fetchPartners();
  }, [fetchPartners]);

  const deletePartner = useCallback(async (id: string, imageUrl?: string | null) => {
    const { error } = await (supabase as any).from("partners").delete().eq("id", id);
    if (error) { throw new Error(error.message); }
    if (imageUrl) {
      const path = extractStoragePath(imageUrl, "books");
      if (path) {
        const { error: se } = await supabase.storage.from("books").remove([path]);
        if (se) console.warn("[DataContext] deletePartner storage:", se.message);
      }
    }
    await fetchPartners();
  }, [fetchPartners]);

  // ── Mutators — Quiz & Settings ────────────────────────────────────────────

  const updateQuizConfig = useCallback(async (config: QuizConfig) => {
    const serialized = JSON.parse(JSON.stringify(config));
    const { error } = await (supabase as any).rpc("upsert_quiz_config", { config_data: serialized });
    if (error) {
      console.warn("[DataContext] updateQuizConfig:", error.message);
      throw new Error(error.message);
    }
    setQuizConfig(config);
  }, []);

  const updateSiteSettings = useCallback(async (settings: SiteSettings) => {
    setSiteSettings(settings);
    for (const [key, value] of Object.entries(settings)) {
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          { key, value: JSON.parse(JSON.stringify(value)) },
          { onConflict: "key" }
        );
      if (error) {
        console.warn("[DataContext] updateSiteSettings:", error.message);
        throw new Error(error.message);
      }
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DataContext.Provider
      value={{
        books, newBooks, articles, reviews, teamMembers, authorSpotlights, partners, partnersLoading, partnersTableReady,
        quizConfig, siteSettings, loading, teamLoading, authorsLoading, booksError, articlesError,
        addBook, updateBook, deleteBook,
        addNewBook, updateNewBook, deleteNewBook,
        addArticle, updateArticle, deleteArticle,
        updateQuizConfig, updateSiteSettings,
        refreshBooks: fetchBooks,
        refreshNewBooks: fetchNewBooks,
        refreshArticles: fetchBlogPosts,
        submitReview,
        addTeamMember, updateTeamMember, deleteTeamMember,
        addAuthorSpotlight, updateAuthorSpotlight, deleteAuthorSpotlight,
        addPartner, updatePartner, deletePartner,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};