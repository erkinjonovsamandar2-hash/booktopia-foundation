-- Where the order's card lives in the admin Telegram group, so it can be edited in place.
-- Safe to re-run. Apply in the Supabase SQL editor before deploying the order-card change.
ALTER TABLE miniapp_orders
  ADD COLUMN IF NOT EXISTS admin_chat_id    BIGINT,
  ADD COLUMN IF NOT EXISTS admin_message_id BIGINT;
