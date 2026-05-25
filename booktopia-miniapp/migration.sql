-- ============================================================
-- Booktopia Miniapp — Database Migration
-- Safe to run on the existing Supabase project
-- NO changes to existing tables — only additions + new tables
-- ============================================================

-- 1. Add shop_visible flag to books (default false = no impact on website)
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS shop_visible BOOLEAN DEFAULT false;

-- 2. Mark featured books as shop-visible for the demo
UPDATE books SET shop_visible = true WHERE featured = true;
UPDATE books SET shop_visible = true WHERE category = 'new';

-- 3. Create miniapp_orders table (new — no collision)
CREATE TABLE IF NOT EXISTS miniapp_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  -- Customer
  telegram_user_id  BIGINT,
  telegram_username TEXT,
  full_name         TEXT NOT NULL,
  phone             TEXT NOT NULL,
  delivery_address  TEXT,

  -- Order
  items             JSONB NOT NULL DEFAULT '[]',  -- [{book_id, title, price, qty}]
  total_uzs         INTEGER DEFAULT 0,
  payment_method    TEXT DEFAULT 'payme',         -- payme | click | cash

  -- Status pipeline (mirrors Tasnim pattern)
  status            TEXT DEFAULT 'pending',       -- pending | confirmed | payment | paid | shipped | delivered | cancelled

  -- Admin tracking
  admin_note        TEXT,
  admin_notified    BOOLEAN DEFAULT false         -- has admin group been notified?
);

-- 4. Create order_events table for audit trail (same as Tasnim)
CREATE TABLE IF NOT EXISTS miniapp_order_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  order_id    UUID REFERENCES miniapp_orders(id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  note        TEXT  -- operator name or system
);

-- 5. RLS — allow insert from anon (miniapp users), admin read via service key
ALTER TABLE miniapp_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE miniapp_order_events ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "Allow anon insert orders"       ON miniapp_orders;
DROP POLICY IF EXISTS "Allow anon read own orders"     ON miniapp_orders;
DROP POLICY IF EXISTS "Allow auth read orders"         ON miniapp_orders;
DROP POLICY IF EXISTS "Allow auth read order events"   ON miniapp_order_events;
DROP POLICY IF EXISTS "Allow service insert order events" ON miniapp_order_events;

-- Anyone can insert (place an order)
CREATE POLICY "Allow anon insert orders"
  ON miniapp_orders FOR INSERT TO anon WITH CHECK (true);

-- Anon (miniapp users) can read orders — client filters by telegram_user_id
CREATE POLICY "Allow anon read own orders"
  ON miniapp_orders FOR SELECT TO anon USING (true);

-- Also authenticated (admin) can read all
CREATE POLICY "Allow auth read orders"
  ON miniapp_orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow auth read order events"
  ON miniapp_order_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service insert order events"
  ON miniapp_order_events FOR INSERT TO authenticated WITH CHECK (true);

-- 6. Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_miniapp_orders_status    ON miniapp_orders(status);
CREATE INDEX IF NOT EXISTS idx_miniapp_orders_tg_user   ON miniapp_orders(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_miniapp_orders_created   ON miniapp_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_miniapp_events_order_id  ON miniapp_order_events(order_id);
