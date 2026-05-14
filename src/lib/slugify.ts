import type { Book, NewBook } from "@/context/DataContext";

/**
 * Returns the SEO-friendly URL slug for a book.
 * It uses the database `slug` if available, otherwise falls back to a generated one.
 */
export const getBookSlug = (book: Book | NewBook | any): string => {
  if (!book) return "";
  
  // If the book has a DB slug, use it!
  if (book.slug) return book.slug;
  
  // Fallback for books before the migration is run
  const title = book.title_en || book.title || "";
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
    
  return `${titleSlug}-${book.id}`;
};
