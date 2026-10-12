create table public.town_nft_donation_requests (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 wallet_address text not null,
 provider text not null check (provider in ('atm_pay','xaman')),
 token_ids text[] not null check (cardinality(token_ids) between 1 and 8),
 transaction_json jsonb not null,
 sign_request jsonb not null,
 status text not null check (status in ('signing','submitting','receiving','received','failed','expired')),
 tx_hash text unique,
 signed_blob text,
 failure_reason text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 expires_at timestamptz not null
);
create index town_nft_donation_user_created on public.town_nft_donation_requests(user_id,created_at desc);
create unique index town_nft_donation_one_active_wallet on public.town_nft_donation_requests(wallet_address) where status in ('signing','submitting','receiving');
alter table public.town_nft_donation_requests enable row level security;
revoke all on public.town_nft_donation_requests from public,anon,authenticated;
grant all on public.town_nft_donation_requests to service_role;
alter table public.town_nft_drops add column donation_request_id uuid references public.town_nft_donation_requests(id);
create index town_nft_drop_donation_request on public.town_nft_drops(donation_request_id) where donation_request_id is not null;
