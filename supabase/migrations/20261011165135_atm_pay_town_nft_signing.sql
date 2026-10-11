create table public.player_atm_pay_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pay_user_id uuid not null,
  wallet_address text not null unique check(wallet_address ~ '^r[1-9A-HJ-NP-Za-km-z]{24,34}$'),
  active boolean not null default true,
  verified_at timestamptz not null default now()
);
create table public.atm_pay_link_requests (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  secret_hash text not null check(secret_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'pending' check(status in ('pending','proved','linked')),
  wallet_address text, pay_user_id uuid,
  created_at timestamptz not null default now(), expires_at timestamptz not null
);
create index atm_pay_link_requests_user_created on public.atm_pay_link_requests(user_id,created_at desc);
alter table public.player_atm_pay_links enable row level security;
alter table public.atm_pay_link_requests enable row level security;
revoke all on public.player_atm_pay_links,public.atm_pay_link_requests from public,anon,authenticated;
grant all on public.player_atm_pay_links,public.atm_pay_link_requests to service_role;

create function public.atm_pay_confirm_town_link(request_id uuid,town_user_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare r public.atm_pay_link_requests;
begin
  select * into r from public.atm_pay_link_requests where id=$1 and user_id=$2 for update;
  if not found or r.status <> 'proved' or r.expires_at <= now() then raise exception 'Wallet link expired or was already used'; end if;
  if exists(select 1 from public.player_accounts where wallet_address=r.wallet_address and user_id<>$2) then raise exception 'Wallet is linked to another player'; end if;
  insert into public.player_atm_pay_links(user_id,pay_user_id,wallet_address,active,verified_at)
    values($2,r.pay_user_id,r.wallet_address,true,now())
    on conflict(user_id) do update set pay_user_id=excluded.pay_user_id,wallet_address=excluded.wallet_address,active=true,verified_at=now();
  update public.atm_pay_link_requests set status='linked' where id=$1;
  return true;
end $$;
revoke all on function public.atm_pay_confirm_town_link(uuid,uuid) from public,anon,authenticated;
grant execute on function public.atm_pay_confirm_town_link(uuid,uuid) to service_role;
alter table public.nft_atomic_swaps
  add column provider_a text not null default 'xaman' check(provider_a in ('xaman','atm_pay')),
  add column provider_b text not null default 'xaman' check(provider_b in ('xaman','atm_pay')),
  add column inner_signed_blob text;
