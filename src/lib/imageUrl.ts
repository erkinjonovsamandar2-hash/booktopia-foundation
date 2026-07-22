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

  // IMPORTANT: images go DIRECT to Supabase storage, never through /_sb.
  // Unlike the REST/auth API (which lives at the DB origin and is slow to reach
  // directly from Central Asia — hence the proxy), Supabase storage is served
  // by Cloudflare's global CDN. A direct storage fetch is cached at the nearest
  // Cloudflare PoP: measured ~65ms from this region vs ~550ms through the Vercel
  // /_sb proxy (which adds a Singapore hop and does not edge-cache). So for
  // <img> we always want the direct, CDN-backed URL.

  // Absolute / data / full http(s) URL (incl. full Supabase storage URLs) —
  // pass through unchanged so they hit the Cloudflare CDN directly.
  if (
    url.startsWith("/") ||
    url.startsWith("data:") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  // Raw storage path — build the DIRECT public URL (Cloudflare-CDN backed).
  return `${SUPABASE_URL}/storage/v1/object/public/${url}`;
}

/**
 * Convenience alias — drop-in replacement for the scattered getImageUrl functions.
 */
export const getImageUrl = (url: string | null | undefined): string | null =>
  imgUrl(url);
