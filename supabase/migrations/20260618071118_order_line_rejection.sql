-- Per-line rejection: a shop can reject some lines of an order (e.g. out of stock) instead of the
-- whole order. The rejected line stays on the record (struck through) but no longer counts.
alter table public.order_items add column rejected boolean not null default false;

-- Atomically reject a subset of an order's lines: mark the still-active target lines and reduce the
-- order's subtotal/total/payout by their summed line_total. Returns the amount actually removed
-- (only the NEWLY-rejected lines) so a double-submit can't double-reduce. Service-role only; the
-- caller performs the Stripe partial refund (for paid online orders) before invoking this.
create or replace function public.reject_order_lines(p_order_id uuid, p_line_ids uuid[])
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare v_sum numeric;
begin
  with marked as (
    update public.order_items
       set rejected = true
     where order_id = p_order_id and id = any(p_line_ids) and rejected = false
     returning line_total
  )
  select coalesce(sum(line_total), 0) into v_sum from marked;
  if v_sum > 0 then
    update public.orders
       set subtotal = round(subtotal - v_sum, 2),
           total    = round(total - v_sum, 2),
           payout   = round(payout - v_sum, 2)
     where id = p_order_id;
  end if;
  return v_sum;
end;
$$;
revoke execute on function public.reject_order_lines(uuid, uuid[]) from public, anon, authenticated;
grant  execute on function public.reject_order_lines(uuid, uuid[]) to service_role;
