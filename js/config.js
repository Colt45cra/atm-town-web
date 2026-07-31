/*
 * ATM Town runtime configuration
 * v160: map entry, exit, zoom, spawn, and runtime settings live in one registry.
 * Keep this file data-only. Runtime behavior belongs in the appropriate module.
 */
(function initializeATMTownConfig(global) {
  'use strict';

  const TILE_SIZE = 48;

  const BUILD = Object.freeze({
    number: 160,
    version: 'v160',
    name: 'Map Runtime Registry',
    title: 'ATM Town v160 — Map Runtime Registry'
  });

  const MAPS = Object.freeze({
    town: Object.freeze({
      id: 'town',
      label: 'ATM TOWN',
      world: Object.freeze({ w: 65, h: 90 }),
      entrySpawn: Object.freeze({ x: 1560, y: 3850 }),
      entryDirection: 'up',
      entryZoom: null,
      interior: false,
      entranceId: null,
      exitTarget: null,
      townReturn: null,
      assets: Object.freeze({
        visual: 'town.webp',
        nightVisual: 'town-night.webp',
        collision: 'town-blocked.png',
        stairs: 'town-stairs.png',
        lighting: 'town-lighting.webp',
        interaction: 'ATM TOWN INTERACTION MAP(1).png'
      })
    }),
    hq: Object.freeze({
      id: 'hq',
      label: 'ATM HQ',
      world: Object.freeze({ w: 32, h: 32 }),
      entrySpawn: Object.freeze({ x: (32 * TILE_SIZE) / 2, y: (32 * TILE_SIZE) - 32 }),
      entryDirection: 'up',
      entryZoom: 0.60,
      interior: true,
      entranceId: 'hq',
      exitTarget: 'town',
      townReturn: Object.freeze({ mode: 'doorOffset', x: 0, y: 165 }),
      assets: Object.freeze({
        visual: 'hq.webp',
        collision: 'hq-blocked.png',
        depth: 'hq-depth.png',
        interaction: 'Hq interaction zones(1).png'
      })
    }),
    gallery: Object.freeze({
      id: 'gallery',
      label: 'NFT ART GALLERY',
      world: Object.freeze({ w: 33, h: 11 }),
      entrySpawn: Object.freeze({ x: (33 * TILE_SIZE) / 2, y: 454 }),
      entryDirection: 'up',
      entryZoom: 0.60,
      interior: true,
      entranceId: 'nftmega',
      exitTarget: 'town',
      townReturn: Object.freeze({ mode: 'doorOffset', x: 0, y: 165 }),
      assets: Object.freeze({
        visual: 'gallery.webp',
        collision: 'gallery-blocked.png',
        depth: 'gallery-depth.png'
      })
    }),
    arcade: Object.freeze({
      id: 'arcade',
      label: 'ATM TOKEN ARCADE',
      world: Object.freeze({ w: 1254 / TILE_SIZE, h: 1254 / TILE_SIZE }),
      pixelSize: Object.freeze({ w: 1254, h: 1254 }),
      entrySpawn: Object.freeze({ x: 627, y: 1165 }),
      entryDirection: 'up',
      entryZoom: 0.60,
      interior: true,
      entranceId: 'arcade',
      exitTarget: 'town',
      townReturn: Object.freeze({ mode: 'fixedY', y: 700 }),
      assets: Object.freeze({
        visual: 'arcade.webp',
        collision: 'arcade-blocked.png',
        depth: 'arcade-depth.png'
      })
    }),
    lounge: Object.freeze({
      id: 'lounge',
      label: 'COMMUNITY LOUNGE',
      world: Object.freeze({ w: 1254 / TILE_SIZE, h: 1254 / TILE_SIZE }),
      pixelSize: Object.freeze({ w: 1254, h: 1254 }),
      entrySpawn: Object.freeze({ x: 627, y: 1140 }),
      entryDirection: 'up',
      entryZoom: 0.70,
      interior: true,
      entranceId: 'gameLounge',
      exitTarget: 'town',
      townReturn: Object.freeze({ mode: 'doorOffset', x: 0, y: 165 }),
      assets: Object.freeze({
        visual: 'lounge.png',
        collision: 'lounge-blocked.png',
        depth: 'lounge-depth.png',
        interaction: 'lounge-interaction.png'
      })
    })
  });

  const SUPABASE_CDN_SOURCES = Object.freeze([
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.0',
    'https://unpkg.com/@supabase/supabase-js@2.105.0'
  ]);

  global.ATM_TOWN_CONFIG = Object.freeze({
    tileSize: TILE_SIZE,
    build: BUILD,
    maps: MAPS,
    supabaseCdnSources: SUPABASE_CDN_SOURCES
  });
})(window);
