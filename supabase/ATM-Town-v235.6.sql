-- ATM Town v235.6 — PWA Push Notifications + Player Pings
-- Run once in the ATM Town Supabase project before deploying v235.6.
--
-- Security model:
-- * Browser clients never access these tables directly.
-- * Authenticated Vercel API routes use the service-role key.
-- * Push subscriptions may contain browser endpoint/auth material, so RLS is
--   enabled with no browser policies.

create table if not exists public.atm_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atm_push_endpoint_https check (endpoint ~ '^https://'),
  constraint atm_push_p256dh_length check (char_length(p256dh) between 20 and 512),
  constraint atm_push_auth_length check (char_length(auth) between 8 and 256),
  constraint atm_push_user_agent_length check (char_length(user_agent) <= 500)
);

create index if not exists atm_push_subscriptions_user_idx
  on public.atm_push_subscriptions(user_id, updated_at desc);

create table if not exists public.atm_player_pings (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'hello'
    check (kind in ('hello','join','find_me','money_rain','custom')),
  message text not null default '' check (char_length(message) between 1 and 180),
  push_attempted integer not null default 0 check (push_attempted >= 0),
  push_delivered integer not null default 0 check (push_delivered >= 0),
  created_at timestamptz not null default now(),
  constraint atm_player_ping_not_self check (sender_user_id <> target_user_id)
);

create index if not exists atm_player_pings_sender_target_idx
  on public.atm_player_pings(sender_user_id, target_user_id, created_at desc);

create index if not exists atm_player_pings_target_idx
  on public.atm_player_pings(target_user_id, created_at desc);

alter table public.atm_push_subscriptions enable row level security;
alter table public.atm_player_pings enable row level security;
