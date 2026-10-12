create table public.town_fishing_settings (
 id boolean primary key default true check(id), enabled boolean not null default true,
 catch_percent integer not null default 50 check(catch_percent between 0 and 100),
 daily_nft_limit integer not null default 10 check(daily_nft_limit between 0 and 10000),
 updated_at timestamptz not null default now()
);
insert into public.town_fishing_settings(id) values(true);
create table public.town_fishing_casts (
 id uuid primary key, user_id uuid not null references auth.users(id), wallet_address text not null,
 x numeric not null,y numeric not null,created_at timestamptz not null default now(),
 bite_at timestamptz not null,has_bite boolean not null,
 status text not null default 'casting' check(status in('casting','missed','caught','reward_pending','reward_ready','claimed','empty','limit')),
 award_day date, token_id text,image_url text,name text,offer_index text,payload_uuid uuid,signing_lease_until timestamptz,tx_hash text
);
create index town_fishing_wallet_casts on public.town_fishing_casts(wallet_address,created_at desc);
create index town_fishing_daily_awards on public.town_fishing_casts(award_day) where status in('reward_pending','reward_ready','claimed');
alter table public.town_fishing_settings enable row level security;
alter table public.town_fishing_casts enable row level security;
revoke all on public.town_fishing_settings,public.town_fishing_casts from anon,authenticated;
grant all on public.town_fishing_settings,public.town_fishing_casts to service_role;
create function public.begin_town_fishing_cast(p_id uuid,p_user uuid,p_wallet text,p_x numeric,p_y numeric,p_roll integer,p_delay integer)
returns public.town_fishing_casts language plpgsql security invoker set search_path=public,pg_temp as $$
declare cfg public.town_fishing_settings; r public.town_fishing_casts;
begin
 if p_roll not between 0 and 99 or p_delay not between 1800 and 4300 or p_x not between 1440 and 1690 or p_y not between 3650 and 4110 then raise exception 'Invalid fishing cast';end if;
 perform pg_advisory_xact_lock(hashtextextended('fishing:'||p_wallet,0));
 if exists(select 1 from public.town_fishing_casts where wallet_address=p_wallet and (created_at>now()-interval '6 seconds' or status in('reward_pending','reward_ready') or (status='casting' and bite_at>now()-interval '5 seconds')))then raise exception 'Finish or claim your current catch before casting again';end if;
 select * into cfg from public.town_fishing_settings where id=true;
 insert into public.town_fishing_casts(id,user_id,wallet_address,x,y,bite_at,has_bite)values(p_id,p_user,p_wallet,p_x,p_y,now()+p_delay*interval '1 millisecond',p_roll<cfg.catch_percent) returning * into r;
 return r;
end $$;
create function public.reel_town_fishing_cast(p_id uuid,p_user uuid)
returns public.town_fishing_casts language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.town_fishing_casts;cfg public.town_fishing_settings;used integer;today date=(now() at time zone 'UTC')::date;
begin
 select * into r from public.town_fishing_casts where id=p_id and user_id=p_user for update;
 if not found then raise exception 'Fishing cast not found';end if;
 if r.status<>'casting' then return r;end if;
 if now()<r.bite_at then raise exception 'Wait for the bite';end if;
 if not r.has_bite or now()>r.bite_at+interval '4 seconds' then update public.town_fishing_casts set status='missed' where id=p_id returning * into r;return r;end if;
 select * into cfg from public.town_fishing_settings where id=true for update;
 select count(*) into used from public.town_fishing_casts where award_day=today and status in('reward_pending','reward_ready','claimed');
 update public.town_fishing_casts set status=case when not cfg.enabled then 'caught' when used>=cfg.daily_nft_limit then 'limit' else 'reward_pending' end,award_day=today where id=p_id returning * into r;
 return r;
end $$;
revoke all on function public.begin_town_fishing_cast(uuid,uuid,text,numeric,numeric,integer,integer),public.reel_town_fishing_cast(uuid,uuid) from public,anon,authenticated;
grant execute on function public.begin_town_fishing_cast(uuid,uuid,text,numeric,numeric,integer,integer),public.reel_town_fishing_cast(uuid,uuid) to service_role;
