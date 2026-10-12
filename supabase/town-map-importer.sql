create table if not exists public.town_map_versions (
 id uuid primary key default gen_random_uuid(), created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), published_at timestamptz,
 status text not null default 'draft' check(status in ('draft','ready')),
 base_revision bigint not null, label text not null, selection jsonb not null,
 assets jsonb not null, manifest jsonb, objects jsonb not null default '[]'::jsonb
);
create table if not exists public.town_map_live (
 singleton boolean primary key default true check(singleton), revision bigint not null default 0,
 version_id uuid references public.town_map_versions(id), updated_at timestamptz not null default now()
);
insert into public.town_map_live(singleton) values(true) on conflict do nothing;
alter table public.town_map_versions enable row level security;
alter table public.town_map_live enable row level security;
revoke all on public.town_map_versions,public.town_map_live from anon,authenticated;
grant all on public.town_map_versions,public.town_map_live to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('world-maps','world-maps',true,6291456,array['image/png']) on conflict(id) do nothing;
-- Only the authenticated server, after image validation, may switch the live pointer.
create or replace function public.town_map_activate(p_actor uuid,p_version uuid,p_expected_revision bigint,p_rollback boolean default false)
returns bigint language plpgsql security invoker set search_path=public,pg_temp as $$
declare current_row public.town_map_live; version_row public.town_map_versions;
begin
 if not exists(select 1 from public.town_admins where user_id=p_actor) then raise exception 'Administrator access required'; end if;
 select * into current_row from public.town_map_live where singleton for update;
 if current_row.revision<>p_expected_revision then raise exception 'Map changed. Refresh before publishing.' using errcode='40001'; end if;
 if p_version is not null then
  select * into version_row from public.town_map_versions where id=p_version;
  if not found or version_row.status<>'ready' then raise exception 'Map must be validated before publishing'; end if;
  if not p_rollback and version_row.base_revision<>current_row.revision then raise exception 'Map changed. Prepare the update again.' using errcode='40001'; end if;
  if p_rollback and version_row.published_at is null then raise exception 'Rollback target has never been published'; end if;
 elsif not p_rollback then raise exception 'Choose a validated map'; end if;
 update public.town_map_live set version_id=p_version,revision=revision+1,updated_at=now() where singleton;
 if p_version is not null then update public.town_map_versions set published_at=coalesce(published_at,now()) where id=p_version; end if;
 insert into public.town_admin_audit(actor,action,details) values(p_actor,case when p_rollback then 'map-rollback' else 'map-publish' end,jsonb_build_object('version_id',p_version,'previous_version_id',current_row.version_id,'revision',current_row.revision+1));
 return current_row.revision+1;
end $$;
revoke all on function public.town_map_activate(uuid,uuid,bigint,boolean) from public,anon,authenticated;
grant execute on function public.town_map_activate(uuid,uuid,bigint,boolean) to service_role;
