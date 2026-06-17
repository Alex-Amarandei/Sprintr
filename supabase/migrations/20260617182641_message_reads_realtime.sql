-- Surface read-state changes over Realtime so the shop's unread badge updates the instant a
-- thread is read in another tab (RLS keeps each member to their own read rows).
alter publication supabase_realtime add table public.message_reads;
