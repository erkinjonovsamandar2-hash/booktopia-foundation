-- Restore admin dashboard access to miniapp_orders.
--
-- Context: the QA hardening migration revoked all privileges on
-- public.miniapp_orders from anon AND authenticated to close a data leak
-- (the anon key could read all orders, including names, phones and
-- addresses). Admins sign in through Supabase Auth, so they act as the
-- `authenticated` role and lost access too — the Bot admin pages
-- (BotStats, OrdersManager, BotCustomers) read this table directly from the
-- browser and now fail.
--
-- Fix: give the privilege back to `authenticated` only, gated by an RLS
-- policy that admits nobody except users with role 'admin' in user_roles.
-- anon stays fully revoked.

begin;

grant select, update on public.miniapp_orders to authenticated;

drop policy if exists "admins can read orders" on public.miniapp_orders;
create policy "admins can read orders"
  on public.miniapp_orders
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
       where user_id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "admins can update orders" on public.miniapp_orders;
create policy "admins can update orders"
  on public.miniapp_orders
  for update
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
       where user_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
       where user_id = auth.uid() and role = 'admin'
    )
  );

-- Order events feed the admin timeline; same rule.
grant select on public.miniapp_order_events to authenticated;
drop policy if exists "admins can read order events" on public.miniapp_order_events;
alter table public.miniapp_order_events enable row level security;
create policy "admins can read order events"
  on public.miniapp_order_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
       where user_id = auth.uid() and role = 'admin'
    )
  );

commit;

-- Verify:
--   * signed in as an admin  -> order list loads
--   * signed in as non-admin -> zero rows
--   * anon key               -> still 401 (unchanged)
