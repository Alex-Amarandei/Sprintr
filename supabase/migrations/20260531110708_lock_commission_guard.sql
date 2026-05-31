-- Trigger-only function: never callable as an RPC (CLAUDE.md EXECUTE-grant gotcha).
revoke execute on function public.shops_guard_commission() from public, anon, authenticated;
