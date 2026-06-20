-- 0003_markets_venues.sql
-- LMC Phase 1 — market-aware catalog (DATA-03, MKT-ready).
--
-- Money carries a currency; a market carries country + locale as DATA, not code.
-- v1 is US-only but NOTHING here hard-codes USD/US — currency/locale/country are
-- columns so launching a new market later is a data change, not a schema change.
-- Catalog rows are service/admin-managed (seeded from app/data/markets.ts).

create table public.markets (
  id        text primary key,                               -- e.g. 'mia', 'nyc'
  name      text not null,
  country   text not null,                                  -- ISO 3166-1 alpha-2 e.g. 'US'
  currency  text not null default 'USD',                    -- ISO 4217 e.g. 'USD'
  locale    text not null default 'en-US',                  -- BCP-47 e.g. 'en-US'
  is_live   boolean not null default false,                 -- launched vs soon/waitlist
  center    geography(point, 4326)                          -- [lon,lat] city center
);

comment on table public.markets is
  'Market-aware catalog. currency/locale/country are data (MKT-ready); never hard-code USD/US.';

create table public.venues (
  id         text primary key,                              -- stable slug/key
  market_id  text not null references public.markets(id),
  name       text not null,
  category   text,
  coord      geography(point, 4326),                        -- [lon,lat]
  is_partner boolean not null default false                 -- partner = interior-check eligible
);

create index venues_market_idx on public.venues (market_id);

comment on table public.venues is
  'Catalog venues keyed to a market. is_partner unlocks +interior checks. Service/admin-managed.';
