-- QA hardening migration — booktopia-miniapp
-- Generated 2026-08-30 from QA_FIXES.md (W0-1, W1-2, W2-7, W2-8)
--
-- READ BEFORE APPLYING. This changes who can read orders. Apply to a branch or
-- staging database first, then re-run flows #32, #35, #36 before production.
--
-- Prerequisite: api/checkout.js must already be deployed with initData
-- verification (W0-4), otherwise orders will be written with a NULL
-- telegram_user_id and will not be readable by their owner.

begin;

-- ── W2-7: persist the GPS coordinates the checkout sheet already collects ────
alter table public.miniapp_orders
  add column if not exists delivery_lat double precision,
  add column if not exists delivery_lng double precision;

-- ── W2-8: idempotency key so a retried checkout cannot create a duplicate ────
alter table public.miniapp_orders
  add column if not exists idempotency_key text;

create unique index if not exists miniapp_orders_idempotency_key_uniq
  on public.miniapp_orders (idempotency_key)
  where idempotency_key is not null;

-- ── W1-2: atomic stock decrement, so concurrent orders cannot oversell ──────
-- NULL stock means "not tracked" and is left alone. Stock never goes below 0.
create or replace function public.decrement_stock(p_book_id uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.books
     set stock = greatest(0, stock - p_qty)
   where id = p_book_id
     and stock is not null;
end;
$$;

revoke all on function public.decrement_stock(uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_stock(uuid, integer) to service_role;

-- ── W0-1: lock down miniapp_orders ──────────────────────────────────────────
-- Today the anon key can read every row, including full_name, phone and
-- delivery_address (confirmed: 83 rows enumerable). Enable RLS and add no
-- anon policy: with RLS on and no permissive policy, anon reads return zero
-- rows. service_role bypasses RLS, so the server keeps full access.
alter table public.miniapp_orders enable row level security;

-- Remove any pre-existing permissive policies (adjust names if yours differ).
drop policy if exists "Enable read access for all users" on public.miniapp_orders;
drop policy if exists "public read" on public.miniapp_orders;

-- ── Scoped reads for the app ────────────────────────────────────────────────
-- The client can no longer SELECT the table. It calls these instead.

-- Order history for one Telegram user. The caller passes an id, so this is only
-- safe because the app obtains it from verified initData and the function
-- returns no PII beyond what the owner already submitted.
-- NOTE: this still trusts its argument. If you want it airtight, move the
-- initData verification into an Edge Function and call this from there.
create or replace function public.get_my_orders(p_telegram_user_id bigint)
returns table (
  id uuid,
  status text,
  payment_status text,
  created_at timestamptz,
  items jsonb,
  total_uzs numeric,
  payment_method text,
  delivery_address text
)
language sql
security definer
set search_path = public
as $$
  select o.id, o.status, o.payment_status, o.created_at,
         o.items, o.total_uzs, o.payment_method, o.delivery_address
    from public.miniapp_orders o
   where o.telegram_user_id = p_telegram_user_id
   order by o.created_at desc
   limit 100;
$$;

grant execute on function public.get_my_orders(bigint) to anon, authenticated;

-- Payment polling for /payment-return. Returns status only — no PII — so
-- knowing an order id reveals nothing beyond whether it is paid.
create or replace function public.get_order_payment_status(p_order_id uuid)
returns table (payment_status text, status text)
language sql
security definer
set search_path = public
as $$
  select o.payment_status, o.status
    from public.miniapp_orders o
   where o.id = p_order_id;
$$;

grant execute on function public.get_order_payment_status(uuid) to anon, authenticated;

commit;

-- ── Verification after applying ─────────────────────────────────────────────
-- With the ANON key, this must return zero rows (previously returned 83):
--   select * from miniapp_orders limit 1;
-- These must still work:
--   select * from get_my_orders(<your telegram id>);
--   select * from get_order_payment_status('<an order id>');
