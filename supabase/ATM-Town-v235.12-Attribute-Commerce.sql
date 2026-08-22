-- ATM Town v235.12 — Attribute Store permanent purchase entitlements
-- Run once in the Supabase SQL editor before enabling priced Mainnet checkout.

create table if not exists public.attribute_store_prices (
  item_id text primary key,
  usd_amount numeric(20,6),
  atm_amount numeric(30,10),
  rlusd_amount numeric(20,6),
  xrp_amount numeric(20,6),
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint attribute_store_prices_positive check (
    (usd_amount is null or usd_amount > 0) and
    (atm_amount is null or atm_amount > 0) and
    (rlusd_amount is null or rlusd_amount > 0) and
    (xrp_amount is null or xrp_amount > 0)
  )
);

create table if not exists public.attribute_purchase_requests (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload_uuid uuid not null unique,
  item_ids text[] not null,
  asset_id text not null check (asset_id in ('atm','rlusd','xrp')),
  currency text not null,
  issuer text,
  destination text not null,
  expected_wallet text not null,
  total_amount numeric(30,10) not null check (total_amount > 0),
  pricing_snapshot jsonb not null default '[]'::jsonb,
  invoice_id text not null unique,
  status text not null default 'pending' check (status in ('pending','paid','failed','rejected','expired')),
  tx_hash text unique,
  payer_wallet text,
  ledger_index bigint,
  failure_reason text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  paid_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.attribute_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  source text not null default 'purchase',
  purchase_id uuid references public.attribute_purchase_requests(id) on delete set null,
  tx_hash text,
  granted_at timestamptz not null default now(),
  unique(user_id,item_id)
);

create index if not exists attribute_purchase_requests_user_created_idx on public.attribute_purchase_requests(user_id,created_at desc);
create index if not exists attribute_entitlements_user_idx on public.attribute_entitlements(user_id);

alter table public.attribute_store_prices enable row level security;
alter table public.attribute_purchase_requests enable row level security;
alter table public.attribute_entitlements enable row level security;

drop policy if exists "Users can read own attribute entitlements" on public.attribute_entitlements;
create policy "Users can read own attribute entitlements"
on public.attribute_entitlements for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own attribute purchases" on public.attribute_purchase_requests;
create policy "Users can read own attribute purchases"
on public.attribute_purchase_requests for select
to authenticated
using (auth.uid() = user_id);

-- Prices are intentionally NOT inserted here because no launch prices have been approved yet.
-- When ready, add one row per purchasable item. Example shape ONLY (replace values/item id):
-- insert into public.attribute_store_prices(item_id,usd_amount,atm_amount,rlusd_amount,xrp_amount)
-- values ('body:example',4.99,500,4.99,2.0)
-- on conflict(item_id) do update set usd_amount=excluded.usd_amount,atm_amount=excluded.atm_amount,rlusd_amount=excluded.rlusd_amount,xrp_amount=excluded.xrp_amount,active=true,updated_at=now();
