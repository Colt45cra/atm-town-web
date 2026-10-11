begin;
alter table public.town_nft_drops add column custody boolean not null default false;
alter table public.town_nft_drops add column payload_inventory_id uuid;
alter table public.town_nft_drops add column custody_tx_hash text;
alter table public.town_nft_drop_claims add column offer_index text;
alter table public.town_nft_drop_claims add column signing_lease_until timestamptz;
commit;
