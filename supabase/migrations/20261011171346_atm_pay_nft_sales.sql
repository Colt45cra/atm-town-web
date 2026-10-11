create table public.atm_pay_nft_market_requests (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 operation text not null check (operation in ('sell','accept_sell','accept_buy','cancel_sell')),
 wallet_address text not null,
 token_id text not null check (token_id ~ '^[A-F0-9]{64}$'),
 token_name text not null,
 amount_drops text,
 counterparty_wallet text,
 offer_index text,
 transaction_json jsonb not null,
 sign_request jsonb not null,
 status text not null check (status in ('signing','submitting','open','accepted','cancelled','failed','expired')),
 tx_hash text,
 failure_reason text,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null
);
create index atm_pay_nft_market_user_created on public.atm_pay_nft_market_requests(user_id,created_at desc);
alter table public.atm_pay_nft_market_requests enable row level security;
revoke all on public.atm_pay_nft_market_requests from public,anon,authenticated;
grant all on public.atm_pay_nft_market_requests to service_role;
