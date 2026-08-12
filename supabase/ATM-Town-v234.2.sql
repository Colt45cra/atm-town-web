-- ATM Town v234.2 — ATM Pay (Testnet identity + payment intents)
-- Run once in Supabase SQL Editor before deploying v234.2.
--
-- Security model:
-- * Player-facing payments use @handles; wallet addresses stay out of normal UI.
-- * The server resolves @handle -> current ATM embedded Testnet wallet.
-- * The browser still signs locally; signed blobs are submitted directly to XRPL Testnet.
-- * RLS is enabled with NO browser policies. Authenticated Vercel API routes use service role.

create table if not exists public.atm_pay_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atm_pay_handle_format check (handle = lower(handle) and handle ~ '^[a-z0-9_]{3,20}$')
);

create index if not exists atm_pay_profiles_handle_idx
  on public.atm_pay_profiles(handle);

create table if not exists public.atm_pay_intents (
  id uuid primary key,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_handle text not null,
  recipient_display_name text not null,
  route_type text not null default 'embedded' check (route_type = 'embedded'),
  network text not null default 'testnet' check (network = 'testnet'),
  asset text not null default 'XRP' check (asset = 'XRP'),
  amount_drops bigint not null check (amount_drops > 0 and amount_drops <= 10000000),
  destination_address text not null check (destination_address ~ '^r[1-9A-HJ-NP-Za-km-z]{24,34}$'),
  note text not null default '' check (char_length(note) <= 80),
  status text not null default 'pending' check (status in ('pending','submitted','validated','failed','cancelled','expired')),
  request_id uuid,
  tx_hash text unique,
  result_code text,
  ledger_index bigint,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  constraint atm_pay_not_self check (sender_user_id <> recipient_user_id)
);

create index if not exists atm_pay_intents_sender_idx
  on public.atm_pay_intents(sender_user_id, created_at desc);
create index if not exists atm_pay_intents_recipient_idx
  on public.atm_pay_intents(recipient_user_id, created_at desc);
create index if not exists atm_pay_intents_status_idx
  on public.atm_pay_intents(status, expires_at);
create unique index if not exists atm_pay_intents_one_active_request_idx
  on public.atm_pay_intents(request_id)
  where request_id is not null and status in ('pending','submitted','validated');

create table if not exists public.atm_pay_requests (
  id uuid primary key,
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  payer_user_id uuid not null references auth.users(id) on delete cascade,
  requester_handle text not null,
  requester_display_name text not null,
  payer_handle text not null,
  payer_display_name text not null,
  network text not null default 'testnet' check (network = 'testnet'),
  asset text not null default 'XRP' check (asset = 'XRP'),
  amount_drops bigint not null check (amount_drops > 0 and amount_drops <= 10000000),
  note text not null default '' check (char_length(note) <= 80),
  status text not null default 'pending' check (status in ('pending','paid','declined','cancelled','expired')),
  payment_intent_id uuid references public.atm_pay_intents(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  constraint atm_pay_request_not_self check (requester_user_id <> payer_user_id)
);

alter table public.atm_pay_intents
  drop constraint if exists atm_pay_intents_request_id_fkey;
alter table public.atm_pay_intents
  add constraint atm_pay_intents_request_id_fkey
  foreign key (request_id) references public.atm_pay_requests(id) on delete set null
  deferrable initially deferred;

create index if not exists atm_pay_requests_requester_idx
  on public.atm_pay_requests(requester_user_id, created_at desc);
create index if not exists atm_pay_requests_payer_idx
  on public.atm_pay_requests(payer_user_id, created_at desc);
create index if not exists atm_pay_requests_status_idx
  on public.atm_pay_requests(status, expires_at);

alter table public.atm_pay_profiles enable row level security;
alter table public.atm_pay_intents enable row level security;
alter table public.atm_pay_requests enable row level security;

comment on table public.atm_pay_profiles is
  'ATM Pay public identity handles. No wallet secrets are stored here.';
comment on table public.atm_pay_intents is
  'Short-lived server-bound ATM Pay routing intents. Browser signing remains local.';
comment on table public.atm_pay_requests is
  'ATM Pay person-to-person payment requests. Server-only access through authenticated API.';
