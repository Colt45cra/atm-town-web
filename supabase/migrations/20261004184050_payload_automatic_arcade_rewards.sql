begin;
alter table public.arcade_reward_rules add column payload_program_slug text;
alter table public.arcade_reward_sessions add column payload_program_slug text;
alter table public.arcade_reward_sessions add column payout_attempted_at timestamptz;
alter table public.arcade_reward_sessions drop constraint arcade_reward_sessions_status_check;
alter table public.arcade_reward_sessions add constraint arcade_reward_sessions_status_check check(status in ('active','review','approved','signing','paid','rejected','empty','queued','pending'));
create index arcade_reward_automatic_queue on public.arcade_reward_sessions(payout_attempted_at nulls first) where status in ('queued','pending');
create or replace function public.town_arcade_exit(p_user uuid,p_session uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare s public.arcade_reward_sessions; total numeric; value numeric;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into s from public.arcade_reward_sessions where id=p_session and user_id=p_user for update;
 if not found then raise exception 'Unknown reward session'; end if;
 if s.status<>'active' then return jsonb_build_object('id',s.id,'status',s.status,'coins',s.coins,'amount',s.amount::text); end if;
 select coalesce(sum(amount),0) into total from public.arcade_reward_sessions
 where user_id=p_user and ended_at>=date_trunc('day',now()) and status in ('review','approved','signing','queued','pending','paid');
 value:=least(s.coins*s.atm_per_coin,greatest(0,s.daily_atm_limit-total));
 update public.arcade_reward_sessions set ended_at=now(),amount=value,status=case when value>0 then case when s.payload_program_slug is not null then 'queued' else 'review' end else 'empty' end where id=s.id;
 return jsonb_build_object('id',s.id,'status',case when value>0 then case when s.payload_program_slug is not null then 'queued' else 'review' end else 'empty' end,'coins',s.coins,'amount',value::text);
end $$;
create or replace function public.town_economy_save(p_actor uuid,p_kind text,p_value jsonb)
returns void language plpgsql security invoker set search_path=public as $$
begin
 if not exists(select 1 from public.town_admins where user_id=p_actor) then raise exception 'Admin required'; end if;
 if p_kind='price' then
 insert into public.attribute_store_prices(item_id,usd_amount,atm_amount,rlusd_amount,xrp_amount,active)
 values(p_value->>'item_id',(p_value->>'usd_amount')::numeric,(p_value->>'atm_amount')::numeric,(p_value->>'rlusd_amount')::numeric,(p_value->>'xrp_amount')::numeric,(p_value->>'active')::boolean)
 on conflict(item_id) do update set usd_amount=excluded.usd_amount,atm_amount=excluded.atm_amount,rlusd_amount=excluded.rlusd_amount,xrp_amount=excluded.xrp_amount,active=excluded.active;
 elsif p_kind='rule' then
 update public.arcade_reward_rules set enabled=(p_value->>'enabled')::boolean,atm_per_coin=(p_value->>'atm_per_coin')::numeric,daily_atm_limit=(p_value->>'daily_atm_limit')::numeric,max_coins=(p_value->>'max_coins')::integer,payload_program_slug=nullif(p_value->>'payload_program_slug',''),updated_at=now() where game_id=p_value->>'game_id';
 elsif p_kind in ('approve','reject') then
 update public.arcade_reward_sessions set status=case when p_kind='approve' then 'approved' else 'rejected' end where id=(p_value->>'id')::uuid and status='review';
 if not found then raise exception 'Reward is no longer awaiting review'; end if;
 else raise exception 'Unknown action'; end if;
 insert into public.town_admin_audit(actor,action,details) values(p_actor,p_kind,p_value);
end $$;
revoke all on function public.town_economy_save(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.town_economy_save(uuid,text,jsonb) to service_role;
commit;
