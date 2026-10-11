-- Player offers stay in their own wallets. Only validated ledger offers become objects.
create table if not exists public.town_nft_drops (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 wallet_address text not null,
 token_id text not null check(token_id ~ '^[A-F0-9]{64}$'),
 kind text not null check(kind in ('drop','donation')),
 status text not null default 'preparing' check(status in ('preparing','pending','carried','placed','offered','received','claimed','unavailable','rejected','failed','expired')),
 payload_uuid uuid unique, offer_index text unique, tx_hash text unique,
 map text, x double precision, y double precision,
 name text not null default 'XRPL NFT', image_url text,
 failure_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status <> 'placed' or (map='town' and x is not null and y is not null))
);
create unique index if not exists town_nft_one_active_offer on public.town_nft_drops(wallet_address,token_id)
 where status in ('preparing','pending','carried','placed','offered');
create index if not exists town_nft_visible on public.town_nft_drops(status,map);
create table if not exists public.town_nft_drop_claims (
 id uuid primary key default gen_random_uuid(), drop_id uuid not null references public.town_nft_drops(id),
 user_id uuid not null references auth.users(id), wallet_address text not null,
 payload_uuid uuid unique, status text not null default 'preparing', tx_hash text unique,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists town_nft_pending_claim on public.town_nft_drop_claims(drop_id,user_id) where status in ('preparing','pending');
alter table public.town_nft_drops enable row level security;
alter table public.town_nft_drop_claims enable row level security;
revoke all on public.town_nft_drops, public.town_nft_drop_claims from anon, authenticated;
grant all on public.town_nft_drops, public.town_nft_drop_claims to service_role;
insert into public.attribute_store_prices(item_id,xrp_amount,active)
values('equipment:fishing-pole',3,true) on conflict(item_id) do nothing;
