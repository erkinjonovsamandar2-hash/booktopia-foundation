-- 1. Add 'slug' column to the tables
ALTER TABLE books ADD COLUMN slug TEXT UNIQUE;
ALTER TABLE new_books ADD COLUMN slug TEXT UNIQUE;

-- 2. Automatically generate unique slugs for existing books
-- We use the book title, lowercase it, replace spaces and special characters with dashes, 
-- and append a short 6-character random string to ensure it's 100% unique.
UPDATE books 
SET slug = REGEXP_REPLACE(LOWER(title), '[^a-z0-9]+', '-', 'g') || '-' || SUBSTRING(MD5(id::text), 1, 6) 
WHERE slug IS NULL;

UPDATE new_books 
SET slug = REGEXP_REPLACE(LOWER(title), '[^a-z0-9]+', '-', 'g') || '-' || SUBSTRING(MD5(id::text), 1, 6) 
WHERE slug IS NULL;
