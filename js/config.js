/*
 * ATM Town runtime configuration
 * v234: adds isolated XRPL Testnet embedded-wallet runtime configuration.
 * v230: world streaming metadata joins map entry/exit/zoom/spawn runtime settings.
 * Keep this file data-only. Runtime behavior belongs in the appropriate module.
 */
(function initializeATMTownConfig(global) {
  'use strict';

  const TILE_SIZE = 48;

  const BUILD = Object.freeze({
    number: 234,
    version: 'v234',
    name: 'Embedded Wallet — Testnet Phase 1',
    title: 'ATM Town v234 — Embedded Wallet · Testnet Phase 1'
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
        worldManifest: 'assets/world/manifest.json',
        overview: 'assets/world/overview/day.webp',
        nightOverview: 'assets/world/overview/night.webp'
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
        visual: 'assets/maps/hq/visual.webp',
        collision: 'assets/maps/hq/masks/collision.png',
        depth: 'assets/maps/hq/masks/depth.png',
        interaction: 'assets/maps/hq/masks/interaction.png'
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
        visual: 'assets/maps/gallery/visual.webp',
        collision: 'assets/maps/gallery/masks/collision.png',
        depth: 'assets/maps/gallery/masks/depth.png'
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
        visual: 'assets/maps/arcade/visual.webp',
        collision: 'assets/maps/arcade/masks/collision.png',
        depth: 'assets/maps/arcade/masks/depth.png',
        interaction: 'assets/maps/arcade/masks/interaction.png'
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
        visual: 'assets/maps/lounge/visual.webp',
        collision: 'assets/maps/lounge/masks/collision.png',
        depth: 'assets/maps/lounge/masks/depth.png',
        interaction: 'assets/maps/lounge/masks/interaction.png'
      })
    })
  });

  const SUPABASE_CDN_SOURCES = Object.freeze([
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.0',
    'https://unpkg.com/@supabase/supabase-js@2.105.0'
  ]);

  const EMBEDDED_WALLET = Object.freeze({
    network: 'testnet',
    rpcHttp: 'https://s.altnet.rippletest.net:51234/',
    explorerBase: 'https://testnet.xrpl.org/accounts/',
    xrplBrowserSources: Object.freeze([
      'https://cdn.jsdelivr.net/npm/xrpl@5.0.0/build/xrpl-latest-min.js',
      'https://unpkg.com/xrpl@5.0.0/build/xrpl-latest-min.js'
    ])
  });

  global.ATM_TOWN_CONFIG = Object.freeze({
    tileSize: TILE_SIZE,
    build: BUILD,
    maps: MAPS,
    supabaseCdnSources: SUPABASE_CDN_SOURCES,
    embeddedWallet: EMBEDDED_WALLET
  });
})(window);
