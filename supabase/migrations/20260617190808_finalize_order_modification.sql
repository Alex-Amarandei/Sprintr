-- Atomic finalize for an order modification: flip pending→accepted AND apply the signed adjustment
-- to the order's total/payout/adjustment in ONE transaction. Returns true only for the call that
-- actually performed the transition, so the Stripe webhook + the client fallback can never
-- double-apply the adjustment. Service-role only (trusted server code).
create or replace function public.finalize_order_modification(p_mod_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_order_id uuid; v_adj numeric;
begin
  update public.order_modifications
     set status = 'accepted', resolved_at = now()
   where id = p_mod_id and status = 'pending'
   returning order_id, adjustment into v_order_id, v_adj;
  if not found then
    return false;  -- already finalized / not pending → no-op
  end if;
  update public.orders
     set total      = round(total + v_adj, 2),
         payout     = round(payout + v_adj, 2),
         adjustment = round(adjustment + v_adj, 2)
   where id = v_order_id;
  return true;
end;
$$;
revoke execute on function public.finalize_order_modification(uuid) from public, anon, authenticated;
grant  execute on function public.finalize_order_modification(uuid) to service_role;

-- At most one pending modification per order — TOCTOU-safe backing for the app-level check.
create unique index order_modifications_one_pending
  on public.order_modifications (order_id) where status = 'pending';
