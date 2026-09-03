-- books.category was doing three unrelated jobs at once: genre (jahon, ilmiy,
-- amir-temur, erkin-millat), lifecycle (new, soon) and merchandising (gold).
-- Because it holds one value, marking a book "Yangi nashrlar" erased its genre.
-- Four books ended up with no genre at all and were unreachable from every
-- category filter in the mini app:
--
--   Ijarachi (Anna Bronte), Bygone days (Abdulla Qodiriy),
--   Ultrabilim (Skott Yang), O'zbekistonda yana bir kun (Jahongir Azimov)
--
-- Genre stays single-valued. Lifecycle becomes its own pair of flags, so a book
-- can be new AND world literature.

alter table public.books
  add column if not exists is_new      boolean not null default false,
  add column if not exists coming_soon boolean not null default false;

comment on column public.books.is_new is
  'Editorially marked as a new release. Independent of genre, and no longer inferred from `featured` — that made two thirds of the catalogue show a YANGI badge.';
comment on column public.books.coming_soon is
  'Announced but not yet on sale. Was the category value ''soon''.';

-- Carry the old meaning across before the constraint stops allowing it.
update public.books set is_new      = true where category = 'new';
update public.books set coming_soon = true where category = 'soon';

-- Give the stranded books the genre they should always have had.
update public.books set category = 'jahon'        where category = 'new' and title = 'Ijarachi';
update public.books set category = 'amir-temur'   where category = 'new' and title = 'Bygone days';
update public.books set category = 'ilmiy'        where category = 'new' and title = 'Ultrabilim';
update public.books set category = 'erkin-millat' where category = 'new' and title like 'O%zbekistonda yana bir kun';

-- Safety net: anything still carrying a lifecycle value would violate the new
-- constraint. Land it somewhere valid rather than failing the migration; the
-- flag above has already preserved the "new"/"soon" meaning.
update public.books set category = 'jahon' where category in ('new', 'soon');

alter table public.books drop constraint if exists books_category_check;

-- 'gold' stays permitted only because src/components/GlobalClassics.tsx still
-- selects on it. No book uses it, so that section renders empty today — it is
-- the same conflation as 'new' and wants the same treatment.
alter table public.books
  add constraint books_category_check
  check (category in ('jahon', 'ilmiy', 'amir-temur', 'erkin-millat', 'gold'));
