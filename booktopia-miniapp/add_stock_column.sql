-- ============================================================
-- Booktopia Bot — Stock/Inventory Column
-- Safe to run on existing Supabase project (additive only)
-- ============================================================

-- Add stock/inventory tracking to books table
-- NULL = unlimited/not tracked, 0 = out of stock, >0 = available count
ALTER TABLE books ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT NULL;
