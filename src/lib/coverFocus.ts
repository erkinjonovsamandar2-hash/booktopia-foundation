/**
 * CSS object-position for a book cover.
 *
 * Only meaningful where the cover is cropped (object-fit: cover). BookCover
 * letterboxes with object-contain, so it deliberately does not use this.
 *
 * The defaults match the column defaults: horizontally centred, and biased
 * towards the top, because cover artwork usually carries its title up there and
 * a centre crop cuts it off.
 */
export const coverFocus = (book: { img_focus_x?: number | null; img_focus_y?: number | null }) => ({
  objectPosition: `${book.img_focus_x ?? 50}% ${book.img_focus_y ?? 20}%`,
});
