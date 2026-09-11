-- ATM Town v235.13 — shared ATM identity foundation
-- ATM Town Auth is canonical for ATM Town + standalone ATM Pay.
-- Wallet backups remain encrypted client-side. This migration stores no plaintext wallet secret.

create table if not exists public.wallet_routes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xrpl_address text not null,
  network text not null default 'testnet',
  route_version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_routes_address_format check (xrpl_address ~ '^r[1-9A-HJ-NP-Za-km-z]{24,34}$'),
  constraint wallet_routes_network check (network in ('testnet','mainnet')),
  constraint wallet_routes_version check (route_version >= 1),
  constraint wallet_routes_network_address_unique unique (network, xrpl_address)
);

create table if not exists public.wallet_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  vault_version integer not null default 1,
  vault_record jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_backups_version check (vault_version >= 1),
  constraint wallet_backups_encrypted_shape check (
    jsonb_typeof(vault_record) = 'object'
    and vault_record ? 'payload'
    and vault_record ? 'recovery'
    and vault_record ? 'address'
    and vault_record ? 'network'
    and (vault_record -> 'payload') ? 'ciphertext'
    and (vault_record -> 'recovery') ? 'ciphertext'
    and not (vault_record ? 'seed')
    and not (vault_record ? 'secret')
    and not (vault_record ? 'privateKey')
    and not (vault_record ? 'private_key')
  )
);

create table if not exists public.wallet_route_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  route_version bigint not null,
  xrpl_address text not null,
  network text not null,
  changed_at timestamptz not null default now(),
  constraint wallet_route_history_network check (network in ('testnet','mainnet'))
);
create index if not exists wallet_route_history_user_version_idx
  on public.wallet_route_history(user_id, route_version desc);

create table if not exists public.atm_pay_handle_aliases (
  alias text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'legacy_atm_pay',
  created_at timestamptz not null default now(),
  constraint atm_pay_handle_alias_format check (alias = lower(alias) and alias ~ '^[a-z0-9_]{3,20}$')
);
create index if not exists atm_pay_handle_aliases_user_idx
  on public.atm_pay_handle_aliases(user_id);

alter table public.wallet_routes enable row level security;
alter table public.wallet_backups enable row level security;
alter table public.wallet_route_history enable row level security;
alter table public.atm_pay_handle_aliases enable row level security;

revoke all on public.wallet_routes from anon, authenticated;
revoke all on public.wallet_backups from anon, authenticated;
revoke all on public.wallet_route_history from anon, authenticated;
revoke all on public.atm_pay_handle_aliases from anon, authenticated;
grant select on public.wallet_routes to authenticated;
grant select, insert, update, delete on public.wallet_backups to authenticated;
grant select, insert, update, delete on public.wallet_routes to service_role;
grant select, insert, update, delete on public.wallet_backups to service_role;
grant select, insert, update, delete on public.wallet_route_history to service_role;
grant select, insert, update, delete on public.atm_pay_handle_aliases to service_role;

drop policy if exists wallet_routes_select_own on public.wallet_routes;
create policy wallet_routes_select_own on public.wallet_routes
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists wallet_backups_select_own on public.wallet_backups;
create policy wallet_backups_select_own on public.wallet_backups
  for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists wallet_backups_insert_own on public.wallet_backups;
create policy wallet_backups_insert_own on public.wallet_backups
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists wallet_backups_update_own on public.wallet_backups;
create policy wallet_backups_update_own on public.wallet_backups
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists wallet_backups_delete_own on public.wallet_backups;
create policy wallet_backups_delete_own on public.wallet_backups
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists atm_pay_profiles_select_own on public.atm_pay_profiles;
create policy atm_pay_profiles_select_own on public.atm_pay_profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);
grant select on public.atm_pay_profiles to authenticated;

create or replace function public.atm_pay_reject_alias_collision()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from public.atm_pay_handle_aliases a
    where a.alias = new.handle and a.user_id <> new.user_id
  ) then
    raise exception 'That ATM Pay username is already taken';
  end if;
  return new;
end;
$$;

drop trigger if exists atm_pay_profiles_alias_collision on public.atm_pay_profiles;
create trigger atm_pay_profiles_alias_collision
before insert or update of handle on public.atm_pay_profiles
for each row execute function public.atm_pay_reject_alias_collision();

create or replace function public.claim_atm_username(p_username text, p_display_name text default null)
returns table(username text, display_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_username text := lower(trim(both '@' from trim(p_username)));
  v_existing text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'Username must be 3-20 characters using lowercase letters, numbers, or underscore';
  end if;
  if v_username = any(array['admin','administrator','support','help','security','system','official','atmtown','atm_town','atm','payments','payment','pay','cashapp','venmo','xaman','xrpl']) then
    raise exception 'That ATM Pay username is reserved';
  end if;

  select p.handle into v_existing from public.atm_pay_profiles p where p.user_id = v_uid;
  if v_existing is not null and v_existing <> v_username then
    raise exception 'ATM Pay username changes are locked to protect payment identity';
  end if;
  if exists (select 1 from public.atm_pay_handle_aliases a where a.alias = v_username and a.user_id <> v_uid) then
    raise exception 'That ATM Pay username is already taken';
  end if;

  insert into public.atm_pay_profiles(user_id, handle)
  values (v_uid, v_username)
  on conflict (user_id) do nothing;

  if nullif(trim(p_display_name), '') is not null then
    update public.player_accounts
      set display_name = coalesce(nullif(display_name,''), left(trim(p_display_name), 30)),
          updated_at = now()
      where user_id = v_uid;
  end if;

  return query
  select p.handle::text, pa.display_name::text
  from public.atm_pay_profiles p
  left join public.player_accounts pa on pa.user_id = p.user_id
  where p.user_id = v_uid;
exception
  when unique_violation then raise exception 'That ATM Pay username is already taken';
end;
$$;

create or replace function public.resolve_atm_username(p_username text)
returns table(user_id uuid, username text, display_name text, xrpl_address text, network text, route_version bigint)
language sql
stable
security definer
set search_path = public
as $$
  with requested as (
    select lower(trim(both '@' from trim(p_username))) as handle
  ), matched as (
    select p.user_id
    from public.atm_pay_profiles p, requested r
    where p.handle = r.handle
    union all
    select a.user_id
    from public.atm_pay_handle_aliases a, requested r
    where a.alias = r.handle
    limit 1
  )
  select p.user_id, p.handle::text as username, pa.display_name::text,
         r.xrpl_address::text, r.network::text, r.route_version
  from matched m
  join public.atm_pay_profiles p on p.user_id = m.user_id
  join public.wallet_routes r on r.user_id = m.user_id
  left join public.player_accounts pa on pa.user_id = m.user_id
  limit 1;
$$;

create or replace function public.set_wallet_route(p_xrpl_address text, p_network text default 'testnet')
returns table(xrpl_address text, network text, route_version bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_current public.wallet_routes%rowtype;
  v_next_version bigint;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_network not in ('testnet','mainnet') then raise exception 'Invalid network'; end if;
  if p_xrpl_address !~ '^r[1-9A-HJ-NP-Za-km-z]{24,34}$' then raise exception 'Invalid XRPL classic address'; end if;

  select * into v_current from public.wallet_routes where user_id = v_uid for update;
  if found then
    if v_current.xrpl_address = p_xrpl_address and v_current.network = p_network then
      return query select v_current.xrpl_address, v_current.network, v_current.route_version;
      return;
    end if;
    v_next_version := v_current.route_version + 1;
  else
    v_next_version := 1;
  end if;

  insert into public.wallet_routes(user_id, xrpl_address, network, route_version)
  values (v_uid, p_xrpl_address, p_network, v_next_version)
  on conflict (user_id) do update
    set xrpl_address = excluded.xrpl_address,
        network = excluded.network,
        route_version = excluded.route_version,
        updated_at = now();

  insert into public.wallet_route_history(user_id, route_version, xrpl_address, network)
  values (v_uid, v_next_version, p_xrpl_address, p_network);

  return query select p_xrpl_address, p_network, v_next_version;
end;
$$;

revoke all on function public.claim_atm_username(text,text) from public, anon;
revoke all on function public.resolve_atm_username(text) from public, anon;
revoke all on function public.set_wallet_route(text,text) from public, anon;
grant execute on function public.claim_atm_username(text,text) to authenticated;
grant execute on function public.resolve_atm_username(text) to authenticated;
grant execute on function public.set_wallet_route(text,text) to authenticated;

create or replace view public.profiles
with (security_invoker = true)
as
select
  p.user_id,
  p.handle as username,
  pa.display_name,
  p.created_at,
  p.updated_at
from public.atm_pay_profiles p
left join public.player_accounts pa on pa.user_id = p.user_id;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
