create table public.nft_atomic_swaps (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  wallet_a text not null, wallet_b text not null,
  token_a text not null check (token_a ~ '^[A-F0-9]{64}$'),
  token_b text not null check (token_b ~ '^[A-F0-9]{64}$'),
  name_a text not null, name_b text not null,
  status text not null default 'offered' check (status in ('offered','preparing','signing','ready','finalizing','settling','completed','cancelled','expired','failed','rejected')),
  batch_json jsonb, inner_payload jsonb, final_payload jsonb,
  tx_hash text, failure_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (user_a <> user_b and wallet_a <> wallet_b and token_a <> token_b)
);
create index nft_atomic_swaps_user_a_created on public.nft_atomic_swaps(user_a, created_at desc);
create index nft_atomic_swaps_user_b_created on public.nft_atomic_swaps(user_b, created_at desc);
alter table public.nft_atomic_swaps enable row level security;
-- Backend-only: Xaman payload IDs/signatures must not be exposed by direct REST.
revoke all on public.nft_atomic_swaps from public, anon, authenticated;
grant all on public.nft_atomic_swaps to service_role;
