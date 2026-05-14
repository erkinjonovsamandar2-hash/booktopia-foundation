// ── Auto-synced to live Supabase schema ───────────────────────────────────────
// Source of truth: the generated types.ts from Supabase CLI.
// Do NOT invent column names here. Every field must exist in the real DB.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // ── books ───────────────────────────────────────────────────────────────
      books: {
        Row: {
          id: string;
          title: string;
          title_en: string | null;
          title_ru: string | null;
          author: string;
          author_en: string | null;
          author_ru: string | null;
          description: string | null;
          description_en: string | null;
          description_ru: string | null;
          cover_url: string | null;
          /** HSL string e.g. "210 60% 15%" — drives dynamic background glows. */
          bg_color: string | null;
          category: string;
          price: number | null;
          enable_3d_flip: boolean | null;
          featured: boolean | null;
          sort_order: number | null;
          /** Horizontal focal point 0–100 for CSS object-position */
          img_focus_x: number | null;
          /** Vertical focal point 0–100 for CSS object-position */
          img_focus_y: number | null;
          /** Path/URL to a PDF excerpt stored in Supabase Storage (books/excerpts/) */
          excerpt_url: string | null;
          slug: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          title_en?: string | null;
          title_ru?: string | null;
          author: string;
          author_en?: string | null;
          author_ru?: string | null;
          description?: string | null;
          description_en?: string | null;
          description_ru?: string | null;
          cover_url?: string | null;
          bg_color?: string | null;
          category?: string;
          price?: number | null;
          enable_3d_flip?: boolean | null;
          featured?: boolean | null;
          sort_order?: number | null;
          img_focus_x?: number | null;
          img_focus_y?: number | null;
          excerpt_url?: string | null;
          slug?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          title_en?: string | null;
          title_ru?: string | null;
          author?: string;
          author_en?: string | null;
          author_ru?: string | null;
          description?: string | null;
          description_en?: string | null;
          description_ru?: string | null;
          cover_url?: string | null;
          bg_color?: string | null;
          category?: string;
          price?: number | null;
          enable_3d_flip?: boolean | null;
          featured?: boolean | null;
          sort_order?: number | null;
          img_focus_x?: number | null;
          img_focus_y?: number | null;
          excerpt_url?: string | null;
          slug?: string | null;
          updated_at?: string;
        };
      };

      // ── new_books ───────────────────────────────────────────────────────────
      new_books: {
        Row: {
          id: string;
          title: string;
          title_en: string | null;
          title_ru: string | null;
          author: string;
          author_en: string | null;
          author_ru: string | null;
          description: string | null;
          description_en: string | null;
          description_ru: string | null;
          cover_url: string | null;
          bg_color: string | null;
          category: string;
          price: number | null;
          enable_3d_flip: boolean | null;
          featured: boolean | null;
          sort_order: number | null;
          img_focus_x: number | null;
          img_focus_y: number | null;
          /** Desktop focal point X 0–100 */
          focus_desktop_x: number | null;
          /** Desktop focal point Y 0–100 */
          focus_desktop_y: number | null;
          /** Mobile focal point X 0–100 */
          focus_mobile_x: number | null;
          /** Mobile focal point Y 0–100 */
          focus_mobile_y: number | null;
          slug: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          title_en?: string | null;
          title_ru?: string | null;
          author?: string;
          author_en?: string | null;
          author_ru?: string | null;
          description?: string | null;
          description_en?: string | null;
          description_ru?: string | null;
          cover_url?: string | null;
          bg_color?: string | null;
          category?: string;
          price?: number | null;
          enable_3d_flip?: boolean | null;
          featured?: boolean | null;
          sort_order?: number | null;
          img_focus_x?: number | null;
          img_focus_y?: number | null;
          focus_desktop_x?: number | null;
          focus_desktop_y?: number | null;
          focus_mobile_x?: number | null;
          focus_mobile_y?: number | null;
          slug?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          title_en?: string | null;
          title_ru?: string | null;
          author?: string;
          author_en?: string | null;
          author_ru?: string | null;
          description?: string | null;
          description_en?: string | null;
          description_ru?: string | null;
          cover_url?: string | null;
          bg_color?: string | null;
          category?: string;
          price?: number | null;
          enable_3d_flip?: boolean | null;
          featured?: boolean | null;
          sort_order?: number | null;
          img_focus_x?: number | null;
          img_focus_y?: number | null;
          focus_desktop_x?: number | null;
          focus_desktop_y?: number | null;
          focus_mobile_x?: number | null;
          focus_mobile_y?: number | null;
          slug?: string | null;
          updated_at?: string;
        };
      };

      // ── blog_posts ──────────────────────────────────────────────────────────
      blog_posts: {
        Row: {
          id: string;
          slug: string | null;
          title: string;
          title_en: string | null;
          title_ru: string | null;
          excerpt: string | null;
          excerpt_en: string | null;
          excerpt_ru: string | null;
          content: string | null;
          content_en: string | null;
          content_ru: string | null;
          /** Cover image URL stored in Supabase Storage */
          image_url: string | null;
          /** ISO date string — display date for the post */
          published_at: string;
          published: boolean | null;
          category: string | null;
          reading_time: string | null;
          /** Desktop focal point X 0–100 for CSS object-position */
          focus_desktop_x: number | null;
          /** Desktop focal point Y 0–100 for CSS object-position */
          focus_desktop_y: number | null;
          /** Mobile focal point X 0–100 for CSS object-position */
          focus_mobile_x: number | null;
          /** Mobile focal point Y 0–100 for CSS object-position */
          focus_mobile_y: number | null;
          author_name: string | null;
          author_photo: string | null;
          author_link: string | null;
          /** UUIDs of curated related books (from books or new_books table) */
          related_book_ids: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug?: string | null;
          title: string;
          title_en?: string | null;
          title_ru?: string | null;
          excerpt?: string | null;
          excerpt_en?: string | null;
          excerpt_ru?: string | null;
          content?: string | null;
          content_en?: string | null;
          content_ru?: string | null;
          image_url?: string | null;
          published_at?: string;
          published?: boolean | null;
          category?: string | null;
          reading_time?: string | null;
          focus_desktop_x?: number | null;
          focus_desktop_y?: number | null;
          focus_mobile_x?: number | null;
          focus_mobile_y?: number | null;
          author_name?: string | null;
          author_photo?: string | null;
          author_link?: string | null;
          related_book_ids?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string | null;
          title?: string;
          title_en?: string | null;
          title_ru?: string | null;
          excerpt?: string | null;
          excerpt_en?: string | null;
          excerpt_ru?: string | null;
          content?: string | null;
          content_en?: string | null;
          content_ru?: string | null;
          image_url?: string | null;
          published_at?: string;
          published?: boolean | null;
          category?: string | null;
          reading_time?: string | null;
          focus_desktop_x?: number | null;
          focus_desktop_y?: number | null;
          focus_mobile_x?: number | null;
          focus_mobile_y?: number | null;
          author_name?: string | null;
          author_photo?: string | null;
          author_link?: string | null;
          related_book_ids?: string[] | null;
          updated_at?: string;
        };
      };

      // ── quiz_config ─────────────────────────────────────────────────────────
      quiz_config: {
        Row: { id: string; config: Json; updated_at: string };
        Insert: { id?: string; config?: Json; updated_at?: string };
        Update: { id?: string; config?: Json; updated_at?: string };
      };

      // ── site_settings ───────────────────────────────────────────────────────
      site_settings: {
        Row: { key: string; value: Json; updated_at: string };
        Insert: { key: string; value?: Json; updated_at?: string };
        Update: { key?: string; value?: Json; updated_at?: string };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: "admin" | "user";
    };
  };
}

// ── Convenience row-type aliases ──────────────────────────────────────────────
export type Book    = Database["public"]["Tables"]["books"]["Row"];
export type NewBook = Database["public"]["Tables"]["new_books"]["Row"];
export type Article = Database["public"]["Tables"]["blog_posts"]["Row"];

// ── Convenience insert/update aliases ────────────────────────────────────────
export type BookInsert    = Database["public"]["Tables"]["books"]["Insert"];
export type BookUpdate    = Database["public"]["Tables"]["books"]["Update"];
export type NewBookInsert = Database["public"]["Tables"]["new_books"]["Insert"];
export type NewBookUpdate = Database["public"]["Tables"]["new_books"]["Update"];
export type ArticleInsert = Database["public"]["Tables"]["blog_posts"]["Insert"];
export type ArticleUpdate = Database["public"]["Tables"]["blog_posts"]["Update"];
