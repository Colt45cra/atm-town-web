-- Relative world-pixel collision footprints. NULL preserves the legacy base.
alter table public.town_world_objects add column if not exists collision jsonb;
