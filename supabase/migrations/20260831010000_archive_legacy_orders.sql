-- Archive pre-launch orders so the admin statistics start from zero.
--
-- Nothing is deleted. Every existing order keeps its full record — customer
-- name, phone, address, items, totals, payment state — and stays reachable in
-- the admin UI through the "Arxiv" filter. Only the live statistics and the
-- default order/customer lists exclude archived rows.
--
-- To undo completely:  update public.miniapp_orders set archived_at = null;

begin;

alter table public.miniapp_orders
  add column if not exists archived_at timestamptz;

comment on column public.miniapp_orders.archived_at is
  'Set for pre-launch orders. Excluded from admin statistics and default lists. NULL = live order.';

-- Stamp everything that exists right now. Orders created after this migration
-- run keep archived_at NULL and count towards the live statistics.
update public.miniapp_orders
   set archived_at = now()
 where archived_at is null;

create index if not exists miniapp_orders_archived_at_idx
  on public.miniapp_orders (archived_at);

commit;

-- Verify:
--   select count(*) filter (where archived_at is null)  as live,
--          count(*) filter (where archived_at is not null) as archived
--     from public.miniapp_orders;
--   -> live should be 0, archived should be the pre-launch count (83).
