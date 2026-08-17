-- ATM Town v235.6.2 — Persistent Live Chat
-- Run once in the ATM Town Supabase project before deploying v235.6.2.
--
-- Browser clients do not read or write this table directly. Authenticated
-- ATM Town API actions use the service-role key. The UI keeps the entire local
-- play-session chat in memory while the server only serves the last 10 minutes.

create table if not exists public.atm_live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  client_message_id text not null,
  room text not null,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint atm_live_chat_client_message_id_length check (char_length(client_message_id) between 8 and 96),
  constraint atm_live_chat_room_length check (char_length(room) between 1 and 40),
  constraint atm_live_chat_sender_name_length check (char_length(sender_name) between 1 and 30),
  constraint atm_live_chat_message_length check (char_length(message) between 1 and 180),
  constraint atm_live_chat_sender_message_unique unique (sender_user_id, client_message_id)
);

create index if not exists atm_live_chat_room_created_idx
  on public.atm_live_chat_messages(room, created_at desc);

create index if not exists atm_live_chat_sender_created_idx
  on public.atm_live_chat_messages(sender_user_id, created_at desc);

alter table public.atm_live_chat_messages enable row level security;
