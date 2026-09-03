-- Unify the two ways an order could be archived.
--
-- There were two, and they did not know about each other:
--   • the admin panel's archive button set status = 'archived'
--   • the pre-launch cleanup set archived_at = now()
--
-- Every statistic, badge and customer list filters on `archived_at is null`,
-- so orders archived from the panel were still counted as live. That is why
-- five archived test orders kept showing as "5 ta / 4 000 so'm" on the bot
-- sales dashboard.
--
-- `archived_at is null` is now the single meaning of "live". The panel sets
-- both columns from here on; this backfills the rows it already touched.

update public.miniapp_orders
   set archived_at = coalesce(archived_at, now())
 where status = 'archived'
   and archived_at is null;

-- The customer's own order list had no archive filter at all, so archived test
-- orders still appeared under "Mening buyurtmalarim" in the mini app.
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
     and o.archived_at is null
   order by o.created_at desc
   limit 100;
$$;

grant execute on function public.get_my_orders(bigint) to anon, authenticated;
