create table if not exists public.town_vehicle_state (
 vehicle_id uuid primary key,
 x double precision not null check (x between -65536 and 65536),
 y double precision not null check (y between -65536 and 65536),
 facing text not null check (facing in ('north','south','east','west')),
 driver_session uuid,
 lease_token uuid,
 lease_expires timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.town_vehicle_state enable row level security;
revoke all on public.town_vehicle_state from anon, authenticated;
grant all on public.town_vehicle_state to service_role;
create or replace function public.town_vehicle_drive(p_op text,p_vehicle uuid,p_session uuid,p_token uuid,p_x double precision,p_y double precision,p_facing text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v public.town_vehicle_state; t timestamptz:=clock_timestamp(); elapsed double precision;
begin
 if p_op not in ('claim','heartbeat','release') or p_session is null or p_vehicle is null or p_facing not in ('north','south','east','west') or p_x not between -65536 and 65536 or p_y not between -65536 and 65536 then raise exception 'Invalid vehicle request'; end if;
 if p_op='claim' then
  insert into public.town_vehicle_state(vehicle_id,x,y,facing) values(p_vehicle,p_x,p_y,p_facing) on conflict do nothing;
 end if;
 select * into v from public.town_vehicle_state where vehicle_id=p_vehicle for update;
 if not found then return null; end if;
 if p_op='claim' then
  if v.driver_session is not null and v.lease_expires>t then return null; end if;
  update public.town_vehicle_state set driver_session=p_session,lease_token=gen_random_uuid(),lease_expires=t+interval '20 seconds',updated_at=t where vehicle_id=p_vehicle returning * into v;
 else
  if v.driver_session is distinct from p_session or v.lease_token is distinct from p_token or p_token is null or v.lease_expires<=t then return null; end if;
  elapsed:=greatest(0.1,extract(epoch from t-v.updated_at));
  if sqrt(power(p_x-v.x,2)+power(p_y-v.y,2))>500*elapsed+100 then raise exception 'Vehicle moved too far'; end if;
  update public.town_vehicle_state set x=p_x,y=p_y,facing=p_facing,driver_session=case when p_op='release' then null else p_session end,lease_token=case when p_op='release' then null else v.lease_token end,lease_expires=case when p_op='release' then null else t+interval '20 seconds' end,updated_at=t where vehicle_id=p_vehicle returning * into v;
 end if;
 return to_jsonb(v);
end $$;
revoke all on function public.town_vehicle_drive(text,uuid,uuid,uuid,double precision,double precision,text) from public,anon,authenticated;
grant execute on function public.town_vehicle_drive(text,uuid,uuid,uuid,double precision,double precision,text) to service_role;
