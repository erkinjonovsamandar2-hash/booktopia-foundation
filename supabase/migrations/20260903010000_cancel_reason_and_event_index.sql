-- Dashboard support. Both changes are additive and touch nothing the checkout
-- writes, so an order being placed while this runs is unaffected.

-- Why an order was cancelled. Without it a cancellation tells you nothing, and
-- "customer changed their mind" is indistinguishable from "the payment gateway
-- keeps failing" — which is the difference between ignoring it and having an
-- outage. Nullable with no default, so adding it rewrites no rows and the
-- insert in checkout.js keeps working untouched.
alter table public.miniapp_orders
  add column if not exists cancel_reason text;

comment on column public.miniapp_orders.cancel_reason is
  'Free-text reason recorded by the admin when cancelling. Null for orders cancelled before this column existed, and for every non-cancelled order.';

-- The dashboard measures fulfilment speed as the gap between an order being
-- placed and its "delivered" event. That reads miniapp_order_events by status
-- and date, which is a sequential scan without this.
create index if not exists miniapp_order_events_status_created_idx
  on public.miniapp_order_events (status, created_at desc);
