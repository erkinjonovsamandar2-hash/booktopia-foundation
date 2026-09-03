import { supabase } from './supabase';

/**
 * One shared read of the books table per session.
 *
 * Home, Catalog and Discover each used to query the table on mount, so moving
 * between them refetched the same rows three or four times in a single visit.
 * That is wasted egress, and it is why switching tabs showed a loading state
 * for data the app had already downloaded a moment earlier.
 *
 * Two things this does:
 *   • serves a single in-flight promise to concurrent callers, so two screens
 *     mounting together produce one request rather than two
 *   • keeps the result for TTL_MS, so tab-switching is instant
 *
 * Only the columns the listing screens actually render are selected — the
 * description and excerpt fields are large and are needed on the book detail
 * page alone, which fetches its own single row.
 */

const TTL_MS = 5 * 60 * 1000;

export const BOOK_LIST_COLUMNS = [
  'id', 'title', 'title_ru', 'title_en',
  'author', 'author_ru', 'author_en',
  'cover_url', 'price', 'stock', 'category', 'featured', 'is_new', 'coming_soon',
  'shop_visible', 'sort_order', 'created_at', 'slug',
].join(', ');

let cache = null;      // { at: number, rows: any[] }
let inFlight = null;   // Promise<any[]>

export function invalidateBooks() {
  cache = null;
  inFlight = null;
}

export async function getBooks({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  if (!force && inFlight) return inFlight;

  inFlight = supabase
    .from('books')
    .select(BOOK_LIST_COLUMNS)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .then(({ data, error }) => {
      if (error) throw error;
      cache = { at: Date.now(), rows: data ?? [] };
      return cache.rows;
    })
    .finally(() => { inFlight = null; });

  return inFlight;
}

/** Books a shopper can actually see. */
export const visibleBooks = (rows) => (rows ?? []).filter(b => b.shop_visible !== false);
