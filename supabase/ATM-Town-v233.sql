-- ATM Town v233 — Arcade Leaderboards + XRPL NFT Offers
-- Run once in Supabase SQL Editor before deploying v233.

create table if not exists public.arcade_game_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists arcade_game_sessions_user_game_idx
  on public.arcade_game_sessions(user_id, game_id, started_at desc);

create table if not exists public.arcade_scores (
  id uuid primary key,
  session_id uuid not null unique references public.arcade_game_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  display_name text not null,
  wallet_address text,
  character_id text,
  score_value bigint not null,
  secondary_value bigint not null default 0,
  verified boolean not null default false,
  verification_level text not null default 'session',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists arcade_scores_game_score_idx
  on public.arcade_scores(game_id, verified, score_value, created_at desc);
create index if not exists arcade_scores_user_game_idx
  on public.arcade_scores(user_id, game_id, created_at desc);

create table if not exists public.nft_trade_requests (
  id uuid primary key,
  action text not null check (action in ('create_buy_offer','accept_buy_offer')),
  user_id uuid not null references auth.users(id) on delete cascade,
  expected_wallet text not null,
  counterparty_wallet text,
  token_id text not null,
  amount_drops bigint,
  offer_index text,
  payload_uuid text not null unique,
  status text not null default 'pending',
  tx_hash text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  completed_at timestamptz,
  failure_reason text
);

create index if not exists nft_trade_requests_user_idx
  on public.nft_trade_requests(user_id, created_at desc);
create index if not exists nft_trade_requests_token_idx
  on public.nft_trade_requests(token_id, created_at desc);
create index if not exists nft_trade_requests_offer_idx
  on public.nft_trade_requests(offer_index) where offer_index is not null;

alter table public.arcade_game_sessions enable row level security;
alter table public.arcade_scores enable row level security;
alter table public.nft_trade_requests enable row level security;

-- No browser RLS policies are intentionally created. ATM Town accesses these
-- tables through authenticated Vercel API routes using the Supabase service role.
