-- ATM Town v235 — World Event Engine Foundation
-- Run once in Supabase SQL Editor before deploying v235.
--
-- Security model:
-- * Browser clients never write directly to these tables.
-- * RLS is enabled with NO browser policies.
-- * Authenticated Vercel API routes use the Supabase service role.
-- * v235 Money Rain uses preview points only. No ATM/XRP settlement occurs.

create table if not exists public.world_events (
  id uuid primary key,
  event_type text not null check (event_type in ('money_rain')),
  status text not null default 'announced' check (status in ('announced','active','completed','cancelled')),
  slot text not null default 'atm-town-world',
  sponsor_user_id uuid references auth.users(id) on delete set null,
  sponsor_display_name text not null,
  sponsor_handle text not null default '',
  seed bigint not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint world_events_time_order check (ends_at > starts_at)
);

create unique index if not exists world_events_one_live_slot_idx
  on public.world_events(slot)
  where status in ('announced','active');

create index if not exists world_events_recent_idx
  on public.world_events(slot, created_at desc);

create table if not exists public.world_event_claims (
  event_id uuid not null references public.world_events(id) on delete cascade,
  pickup_id integer not null check (pickup_id > 0),
  user_id uuid not null references auth.users(id) on delete cascade,
  points integer not null check (points > 0 and points <= 1000),
  claim_map text not null check (claim_map = 'town'),
  claim_x double precision not null,
  claim_y double precision not null,
  claim_distance double precision not null check (claim_distance >= 0),
  claimed_at timestamptz not null default now(),
  primary key (event_id, pickup_id)
);

create index if not exists world_event_claims_user_idx
  on public.world_event_claims(event_id, user_id, claimed_at);

alter table public.world_events enable row level security;
alter table public.world_event_claims enable row level security;

comment on table public.world_events is
  'Server-authoritative ATM Town world event state. v235 begins with Money Rain preview events.';

comment on table public.world_event_claims is
  'Server-accepted event pickup claims. Preview scoring only in v235; not a token reward ledger.';
