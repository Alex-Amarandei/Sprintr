-- Photos in chat: an attachments array on messages + a private bucket for the images.
-- Reads are served by the service role through an order-participant-checked signed-URL endpoint
-- (1-day TTL), so the bucket has no public read policy — only own-folder upload/select.

alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do nothing;

-- Senders upload into their own folder ({uid}/...).
create policy "chat_media_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chat_media_select_own"
  on storage.objects for select to authenticated
  using (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);
