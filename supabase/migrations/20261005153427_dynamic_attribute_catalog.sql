create table public.attribute_definitions (
 item_id text primary key check(item_id ~ '^[a-z]+:[a-z0-9-]+$'),
 name text not null check(char_length(name) between 2 and 70 and name !~ '[<>&"]'),
 character_id text not null,
 category text not null check(category in ('body','chest','face','head','backpack','back','gloves','shoes','aura','equipment')),
 slot text not null check(slot in ('body','chest','face','head','back','katana','hands','feet','aura')),
 sprite_path text,
 effects jsonb not null default '{"speed":1,"gravity":1,"jump":1}'::jsonb,
 created_by uuid references auth.users(id),
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now(),
 check(jsonb_typeof(effects)='object' and effects ?& array['speed','gravity','jump'] and (effects->>'speed')::numeric between .5 and 2.5 and (effects->>'gravity')::numeric between .2 and 3 and (effects->>'jump')::numeric between .5 and 4)
);
alter table public.attribute_definitions enable row level security;
revoke all on public.attribute_definitions from public,anon,authenticated;
grant select,insert,update,delete on public.attribute_definitions to service_role;
-- Sprite writes require an admin-created signed upload token. Public reads only.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('attribute-sprites','attribute-sprites',true,6291456,array['image/png']);
create function public.town_attribute_save(p_actor uuid,p_definition jsonb,p_price jsonb)
returns void language plpgsql security invoker set search_path=public as $$
declare prior public.attribute_definitions;
begin
 if not exists(select 1 from public.town_admins where user_id=p_actor) then raise exception 'Admin required'; end if;
 select * into prior from public.attribute_definitions where item_id=p_definition->>'item_id' for update;
 if found and (prior.character_id<>p_definition->>'character_id' or prior.category<>p_definition->>'category') then raise exception 'An existing attribute keeps its character and category'; end if;
 insert into public.attribute_definitions(item_id,name,character_id,category,slot,sprite_path,effects,created_by,updated_by)
 values(p_definition->>'item_id',p_definition->>'name',p_definition->>'character_id',p_definition->>'category',p_definition->>'slot',nullif(p_definition->>'sprite_path',''),p_definition->'effects',p_actor,p_actor)
 on conflict(item_id) do update set name=excluded.name,sprite_path=excluded.sprite_path,effects=excluded.effects,updated_by=p_actor,updated_at=now();
 perform public.town_economy_save(p_actor,'price',p_price||jsonb_build_object('item_id',p_definition->>'item_id'));
 insert into public.town_admin_audit(actor,action,details) values(p_actor,'attribute-published',p_definition);
end $$;
revoke all on function public.town_attribute_save(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.town_attribute_save(uuid,jsonb,jsonb) to service_role;
