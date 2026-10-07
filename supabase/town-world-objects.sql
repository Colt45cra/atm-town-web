create table public.town_world_objects (
 id uuid primary key default gen_random_uuid(), name text not null,
 sprite_path text not null, image_width integer not null, image_height integer not null,
 x double precision not null, y double precision not null, width double precision not null,
 solid boolean not null default false, active boolean not null default true,
 created_by uuid not null references auth.users(id), updated_at timestamptz not null default now()
);
alter table public.town_world_objects enable row level security;
grant all on public.town_world_objects to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('world-objects','world-objects',true,6291456,array['image/png']);
