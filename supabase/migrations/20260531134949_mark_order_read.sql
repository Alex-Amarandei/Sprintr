-- Mark an order's chat read for the current user using SERVER time (the client-side upsert
-- used new Date() — clock skew could leave a just-read message counted as unread, so the
-- unread badge never cleared). SECURITY DEFINER + auth.uid() pins it to the caller's own row.
create or replace function public.mark_order_read(p_order_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.message_reads (order_id, profile_id, last_read_at)
  values (p_order_id, auth.uid(), now())
  on conflict (order_id, profile_id) do update set last_read_at = now();
$$;

revoke execute on function public.mark_order_read(uuid) from public;
revoke execute on function public.mark_order_read(uuid) from anon;
grant execute on function public.mark_order_read(uuid) to authenticated;
