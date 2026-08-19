-- ATM Town v235.8 — Zombie Outbreak world-event type
-- Run once in the ATM Town Supabase SQL editor before triggering the first outbreak.

begin;

alter table public.world_events
  drop constraint if exists world_events_event_type_check;

alter table public.world_events
  add constraint world_events_event_type_check
  check (event_type in ('money_rain', 'zombie_outbreak'));

comment on table public.world_events is
  'Server-backed ATM Town world-event timeline/config. Money Rain uses authoritative claims; Zombie Outbreak v235.8 synchronizes lifecycle/spawn manifest while combat remains client-local preview.';

commit;
