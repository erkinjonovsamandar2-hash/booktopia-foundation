/**
 * ── Centralized Supabase Image URL Resolver ─────────────────────────────────
 *
 * Single source of truth for resolving Supabase storage paths to public URLs.
 * Replaces the 15+ duplicate `getImageUrl` functions scattered across components.
 *
 * NOTE: Supabase image transforms (`/render/image/`) require the Pro plan.
 * This project uses the free tier, so we serve original files via `/object/public/`.
 * The `width` parameter is accepted but currently ignored — it's a future-proof
 * hook for when the project upgrades to Pro.
 *
 * Usage:
 *   import { imgUrl } from "@/lib/imageUrl";
 *   <img src={imgUrl(book.cover_url)} />
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/**
 * Resolve a Supabase storage path (or full URL) into a public image URL.
 *
 * @param url   Raw path stored in the DB  (`books/1781…-abc.webp`)
 *              or a full URL (`https://…/storage/v1/object/public/books/…`).
 *              Also passes through absolute paths (`/assets/…`).
 * @param _width Reserved for future Supabase Pro image transforms. Currently unused.
 */
export function imgUrl(
  url: string | null | undefined,
  _width?: number,
): string | null {
  if (!url) return null;

  // Already an absolute or full URL — pass through unchanged
  if (
    url.startsWith("/") ||
    url.startsWith("data:") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  // Raw storage path — proxy through Vercel/Vite in browser for fast routing
  const base = typeof window !== "undefined" ? (window.location.origin + "/_sb") : SUPABASE_URL;
  return `${base}/storage/v1/object/public/${url}`;
}

/**
 * Convenience alias — drop-in replacement for the scattered getImageUrl functions.
 */
export const getImageUrl = (url: string | null | undefined): string | null =>
  imgUrl(url);
