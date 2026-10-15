create table public.atm_friendships (
 pair_key text primary key,
 requester_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted')),
 created_at timestamptz not null default now(),
 check(requester_id<>recipient_id),
 check(pair_key=least(requester_id::text,recipient_id::text)||':'||greatest(requester_id::text,recipient_id::text))
);
create index atm_friendships_recipient on public.atm_friendships(recipient_id);
create index atm_friendships_requester on public.atm_friendships(requester_id);
create table public.atm_notification_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 player_pings boolean not null default true,
 world_events boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.atm_friendships enable row level security;
alter table public.atm_notification_preferences enable row level security;
revoke all on public.atm_friendships,public.atm_notification_preferences from anon,authenticated;
grant all on public.atm_friendships,public.atm_notification_preferences to service_role;
