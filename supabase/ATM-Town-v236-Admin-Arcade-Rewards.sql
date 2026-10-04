-- Run using the ATM Town database owner. No user wallets or seeds are stored.
begin;
create table if not exists public.town_admins (
 user_id uuid primary key references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.arcade_reward_rules (
 game_id text primary key check(game_id in ('sky-run','platform-panic','flappy-jetpack','neon-racer')),
 enabled boolean not null default false,
 atm_per_coin numeric(24,6) not null default 0 check(atm_per_coin>=0),
 max_coins integer not null default 100 check(max_coins between 1 and 10000),
 daily_atm_limit numeric(24,6) not null default 0 check(daily_atm_limit>=0),
 updated_at timestamptz not null default now()
);
insert into public.arcade_reward_rules(game_id) values ('sky-run'),('platform-panic'),('flappy-jetpack'),('neon-racer') on conflict do nothing;
create table if not exists public.arcade_reward_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 game_id text not null references public.arcade_reward_rules(game_id), wallet_address text not null,
 started_at timestamptz not null default now(), ended_at timestamptz, last_coin_at timestamptz,
 coins integer not null default 0 check(coins>=0),
 atm_per_coin numeric(24,6) not null, max_coins integer not null, daily_atm_limit numeric(24,6) not null,
 status text not null default 'active' check(status in ('active','review','approved','signing','paid','rejected','empty')),
 amount numeric(24,6), payload_uuid uuid, tx_hash text unique, failure_reason text
);
create unique index if not exists arcade_one_active_reward on public.arcade_reward_sessions(user_id) where status='active';
create index if not exists arcade_reward_user_date on public.arcade_reward_sessions(user_id,started_at);
create table if not exists public.town_admin_audit (
 id bigint generated always as identity primary key, actor uuid not null references auth.users(id),
 action text not null, details jsonb not null, created_at timestamptz not null default now()
);
alter table public.town_admins enable row level security;
alter table public.arcade_reward_rules enable row level security;
alter table public.arcade_reward_sessions enable row level security;
alter table public.town_admin_audit enable row level security;
revoke all on public.town_admins,public.arcade_reward_rules,public.arcade_reward_sessions,public.town_admin_audit from anon,authenticated;
grant all on public.town_admins,public.arcade_reward_rules,public.arcade_reward_sessions,public.town_admin_audit to service_role;
grant usage,select on sequence public.town_admin_audit_id_seq to service_role;
-- Service-only functions lock each session and serialize each user's daily budget.
create or replace function public.town_arcade_coin(p_user uuid,p_session uuid,p_sequence integer)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare s public.arcade_reward_sessions; n timestamptz:=clock_timestamp();
begin
 select * into s from public.arcade_reward_sessions where id=p_session and user_id=p_user for update;
 if not found then raise exception 'Unknown reward session'; end if;
 if p_sequence<=s.coins then return jsonb_build_object('coins',s.coins); end if;
 if s.status<>'active' or p_sequence<>s.coins+1 or s.coins>=s.max_coins or n-s.started_at>interval '1 hour' then raise exception 'Invalid coin sequence'; end if;
 if extract(epoch from n-s.started_at)<greatest(1,p_sequence/4.0) then raise exception 'Coin pickup too fast'; end if;
 update public.arcade_reward_sessions set coins=coins+1,last_coin_at=n where id=s.id;
 return jsonb_build_object('coins',s.coins+1);
end $$;
create or replace function public.town_arcade_exit(p_user uuid,p_session uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare s public.arcade_reward_sessions; total numeric; value numeric;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into s from public.arcade_reward_sessions where id=p_session and user_id=p_user for update;
 if not found then raise exception 'Unknown reward session'; end if;
 if s.status<>'active' then return jsonb_build_object('id',s.id,'status',s.status,'coins',s.coins,'amount',s.amount::text); end if;
 select coalesce(sum(amount),0) into total from public.arcade_reward_sessions
 where user_id=p_user and ended_at>=date_trunc('day',now()) and status in ('review','approved','signing','paid');
 value:=least(s.coins*s.atm_per_coin,greatest(0,s.daily_atm_limit-total));
 update public.arcade_reward_sessions set ended_at=now(),amount=value,status=case when value>0 then 'review' else 'empty' end where id=s.id;
 return jsonb_build_object('id',s.id,'status',case when value>0 then 'review' else 'empty' end,'coins',s.coins,'amount',value::text);
end $$;
revoke all on function public.town_arcade_coin(uuid,uuid,integer),public.town_arcade_exit(uuid,uuid) from public,anon,authenticated;
grant execute on function public.town_arcade_coin(uuid,uuid,integer),public.town_arcade_exit(uuid,uuid) to service_role;
create or replace function public.town_economy_save(p_actor uuid,p_kind text,p_value jsonb)
returns void language plpgsql security invoker set search_path=public as $$
begin
 if not exists(select 1 from public.town_admins where user_id=p_actor) then raise exception 'Admin required'; end if;
 if p_kind='price' then
 insert into public.attribute_store_prices(item_id,usd_amount,atm_amount,rlusd_amount,xrp_amount,active)
 values(p_value->>'item_id',(p_value->>'usd_amount')::numeric,(p_value->>'atm_amount')::numeric,(p_value->>'rlusd_amount')::numeric,(p_value->>'xrp_amount')::numeric,(p_value->>'active')::boolean)
 on conflict(item_id) do update set usd_amount=excluded.usd_amount,atm_amount=excluded.atm_amount,rlusd_amount=excluded.rlusd_amount,xrp_amount=excluded.xrp_amount,active=excluded.active;
 elsif p_kind='rule' then
 update public.arcade_reward_rules set enabled=(p_value->>'enabled')::boolean,atm_per_coin=(p_value->>'atm_per_coin')::numeric,daily_atm_limit=(p_value->>'daily_atm_limit')::numeric,max_coins=(p_value->>'max_coins')::integer,updated_at=now() where game_id=p_value->>'game_id';
 elsif p_kind in ('approve','reject') then
 update public.arcade_reward_sessions set status=case when p_kind='approve' then 'approved' else 'rejected' end where id=(p_value->>'id')::uuid and status='review';
 if not found then raise exception 'Reward is no longer awaiting review'; end if;
 else raise exception 'Unknown action'; end if;
 insert into public.town_admin_audit(actor,action,details) values(p_actor,p_kind,p_value);
end $$;
revoke all on function public.town_economy_save(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.town_economy_save(uuid,text,jsonb) to service_role;
commit;
-- Bootstrap one verified owner explicitly (never infer admin rights from display names):
-- insert into public.town_admins(user_id) values ('OWNER_AUTH_USER_UUID');
