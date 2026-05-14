import type { Book, NewBook } from "@/context/DataContext";

/**
 * Generates an SEO-friendly URL slug for a book by combining its title and ID.
 * Example: "ultrabilim-9f04d148-bb2a-42c4-abb0-790835ce70b9"
 */
export const getBookSlug = (book: Book | NewBook | any): string => {
  if (!book) return "";
  
  // Create a URL-friendly version of the title
  const title = book.title_en || book.title || "";
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
    
  return `${titleSlug}-${book.id}`;
};

/**
 * Extracts the 36-character UUID from a book slug.
 * Also handles legacy URLs that just contain the ID.
 */
export const extractBookId = (slugParam: string): string => {
  if (!slugParam) return "";
  if (slugParam.length >= 36) {
    return slugParam.slice(-36);
  }
  return slugParam;
};
