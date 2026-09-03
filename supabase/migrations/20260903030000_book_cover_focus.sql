-- Focal point for book cover images.
--
-- The books editor has had X/Y sliders with a live preview for a long time, and
-- they never did anything: this column was only ever created on new_books (the
-- 20260411120000 migration says `alter table books` but production books has no
-- such column), updateBook never sent the value, and nothing rendered it.
--
-- Additive and defaulted, so nothing that writes an order or reads a book is
-- affected while it runs.
alter table public.books
  add column if not exists img_focus_x numeric not null default 50,
  add column if not exists img_focus_y numeric not null default 20;

comment on column public.books.img_focus_x is
  'Horizontal focal point as a percentage, used as CSS object-position wherever a cover is cropped. 50 = centred.';
comment on column public.books.img_focus_y is
  'Vertical focal point as a percentage. Defaults to 20 because cover artwork usually carries its title in the upper third.';
