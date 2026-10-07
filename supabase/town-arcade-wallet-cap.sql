-- Preserve account caps while sharing wallet allowances across accounts.
create index if not exists arcade_reward_wallet_date on public.arcade_reward_sessions(wallet_address,ended_at);
create or replace function public.town_arcade_exit(p_user uuid,p_session uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare s public.arcade_reward_sessions; account_total numeric; wallet_total numeric; value numeric;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into s from public.arcade_reward_sessions where id=p_session and user_id=p_user for update;
 if not found then raise exception 'Unknown reward session'; end if;
 if s.status<>'active' then return jsonb_build_object('id',s.id,'status',s.status,'coins',s.coins,'amount',s.amount::text); end if;
 -- Serialize exits from different accounts using the same wallet.
 perform pg_advisory_xact_lock(hashtextextended('arcade-wallet:'||s.wallet_address,0));
 select coalesce(sum(amount) filter(where user_id=p_user),0),
        coalesce(sum(amount) filter(where wallet_address=s.wallet_address),0)
 into account_total,wallet_total from public.arcade_reward_sessions
 where (user_id=p_user or wallet_address=s.wallet_address)
 and reward_currency=s.reward_currency and reward_issuer is not distinct from s.reward_issuer
 and ended_at>=date_trunc('day',now()) and status in ('review','approved','signing','queued','pending','paid');
 value:=least(s.coins*s.atm_per_coin,greatest(0,s.daily_atm_limit-account_total),greatest(0,s.daily_atm_limit-wallet_total));
 update public.arcade_reward_sessions set ended_at=now(),amount=value,status=case when value>0 then case when s.payload_program_slug is not null then 'queued' else 'review' end else 'empty' end where id=s.id;
 return jsonb_build_object('id',s.id,'status',case when value>0 then case when s.payload_program_slug is not null then 'queued' else 'review' end else 'empty' end,'coins',s.coins,'amount',value::text);
end $$;
