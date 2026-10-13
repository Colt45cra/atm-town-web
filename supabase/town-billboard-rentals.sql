create table if not exists public.town_billboard_settings(id boolean primary key default true check(id),enabled boolean not null default true,daily_drops bigint not null default 1000000 check(daily_drops between 1 and 1000000000),destination text not null default 'rMSDXpxDpV2pQJDHbp77XHHhT9QHMrfPYB',updated_at timestamptz not null default now());
insert into public.town_billboard_settings(id) values(true) on conflict do nothing;
create table if not exists public.town_billboard_rentals(id uuid primary key,user_id uuid not null references auth.users(id),billboard_id uuid not null,wallet_address text not null,destination text not null,days integer not null check(days in(1,7,30,180,365)),amount_drops bigint not null check(amount_drops>0),status text not null default 'reserved' check(status in('reserved','pending','active','expired','cancelled')),payload_uuid uuid unique,ad_path text,tx_hash text unique,starts_at timestamptz,ends_at timestamptz,created_at timestamptz not null default now());
create index if not exists billboard_live_lookup on public.town_billboard_rentals(billboard_id,status,ends_at);
create index if not exists billboard_user_lookup on public.town_billboard_rentals(user_id,created_at);
create unique index if not exists billboard_one_checkout on public.town_billboard_rentals(billboard_id) where status in('reserved','pending');
alter table public.town_billboard_settings enable row level security;
alter table public.town_billboard_rentals enable row level security;
revoke all on public.town_billboard_settings,public.town_billboard_rentals from anon,authenticated;
grant all on public.town_billboard_settings,public.town_billboard_rentals to service_role;
create or replace function public.begin_billboard_rental(p_id uuid,p_user uuid,p_billboard uuid,p_wallet text,p_days integer,p_amount bigint,p_destination text) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtext(p_billboard::text));
 update town_billboard_rentals set status='expired' where billboard_id=p_billboard and status='active' and ends_at<=now();
 update town_billboard_rentals set status='cancelled' where billboard_id=p_billboard and status='reserved' and payload_uuid is null and created_at<now()-interval '2 minutes';
 if exists(select 1 from town_billboard_rentals where billboard_id=p_billboard and status in('active','reserved','pending')) then raise exception 'Billboard is occupied'; end if;
 if (select count(*) from town_billboard_rentals where user_id=p_user and created_at>now()-interval '1 hour')>=12 then raise exception 'Too many billboard checkout attempts';end if;
 insert into town_billboard_rentals(id,user_id,billboard_id,wallet_address,days,amount_drops,destination) values(p_id,p_user,p_billboard,p_wallet,p_days,p_amount,p_destination);return p_id;
end;$$;
create or replace function public.activate_billboard_rental(p_id uuid,p_hash text,p_paid_at timestamptz) returns public.town_billboard_rentals language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.town_billboard_rentals;
begin
 select * into r from town_billboard_rentals where id=p_id for update;
 if r.status='active' or r.status='expired' then return r;end if;
 if r.status<>'pending' or r.ad_path is null then raise exception 'Rental is not awaiting payment';end if;
 update town_billboard_rentals set status=case when p_paid_at+make_interval(days=>r.days)>now() then 'active' else 'expired' end,tx_hash=p_hash,starts_at=p_paid_at,ends_at=p_paid_at+make_interval(days=>r.days) where id=p_id returning * into r;return r;
end;$$;
revoke all on function public.begin_billboard_rental(uuid,uuid,uuid,text,integer,bigint,text),public.activate_billboard_rental(uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.begin_billboard_rental(uuid,uuid,uuid,text,integer,bigint,text),public.activate_billboard_rental(uuid,text,timestamptz) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('billboard-ads','billboard-ads',true,1572864,array['image/png']) on conflict(id) do nothing;

alter table public.town_billboard_rentals add column if not exists last_checked_at timestamptz;
