create table if not exists public.town_daily_visitors (
 day date not null, visitor_id text not null, is_guest boolean not null,
 first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
 primary key(day,visitor_id)
);
alter table public.town_daily_visitors enable row level security;
revoke all on public.town_daily_visitors from anon,authenticated;
grant all on public.town_daily_visitors to service_role;
create or replace function public.town_record_visit(p_visitor text,p_guest boolean) returns void
language sql security invoker set search_path='' as $$
 insert into public.town_daily_visitors(day,visitor_id,is_guest) values ((now() at time zone 'America/Chicago')::date,p_visitor,p_guest)
 on conflict(day,visitor_id) do update set last_seen_at=now();
$$;
create or replace function public.town_admin_stats(p_since timestamptz default null) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'day_start',((now() at time zone 'America/Chicago')::date::timestamp at time zone 'America/Chicago'),'day',(now() at time zone 'America/Chicago')::date,'tracking_started_at',(select min(first_seen_at) from public.town_daily_visitors),
 'visitors',(select jsonb_build_object('total',count(*),'players',count(*) filter(where not is_guest),'guests',count(*) filter(where is_guest)) from public.town_daily_visitors where day=(now() at time zone 'America/Chicago')::date),
 'rewards',coalesce((select jsonb_agg(r) from (select wallet_address,reward_currency as currency,reward_issuer as issuer,sum(amount)::text as amount,count(*) as payouts from public.arcade_reward_sessions where status='paid' and tx_hash is not null and (p_since is null or payout_attempted_at>=p_since) group by wallet_address,reward_currency,reward_issuer) r),'[]'::jsonb));
$$;
revoke all on function public.town_record_visit(text,boolean) from public,anon,authenticated;
revoke all on function public.town_admin_stats(timestamptz) from public,anon,authenticated;
grant execute on function public.town_record_visit(text,boolean) to service_role;
grant execute on function public.town_admin_stats(timestamptz) to service_role;
