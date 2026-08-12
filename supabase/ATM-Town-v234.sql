-- ATM Town v234 — Embedded XRPL wallet, Phase 1 (Testnet only)
-- Run in Supabase SQL Editor before deploying the v234 client/API files.
--
-- Security model:
-- * The browser generates and encrypts the wallet seed locally.
-- * Only public address + encrypted backup material are stored here.
-- * RLS is enabled with NO browser policies. The authenticated Vercel API
--   accesses a user's row via the Supabase service role after requireUser().

create table if not exists public.embedded_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  network text not null default 'testnet' check (network = 'testnet'),
  address text not null unique check (address ~ '^r[1-9A-HJ-NP-Za-km-z]{24,34}$'),
  encrypted_backup jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.embedded_wallets enable row level security;

comment on table public.embedded_wallets is
  'ATM Town non-custodial embedded XRPL wallet metadata. Testnet only. Never store plaintext XRPL seeds/private keys.';
comment on column public.embedded_wallets.encrypted_backup is
  'Client-side AES-GCM ciphertext plus recovery/passkey wrappers. Server cannot decrypt it.';
