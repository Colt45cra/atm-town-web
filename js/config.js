/*
 * ATM Town runtime configuration
 * v235.11.6: moves payment selection into a dedicated checkout sheet so mobile checkout never shares width with the scrolling catalog.
 * v235.11.4: stabilizes login/Enter Town state and prevents deploy-time service-worker reloads from interrupting active gameplay.
 * v235.11.3: keeps CASH/CRYPTO checkout fully inside the mobile Attribute Store viewport.
 * v235.11: adds the character-catalog Attribute Store foundation and makes the Locker owned-assets-only.
 * v235.10: connects verified You Are ATM issuer/taxon NFT attributes to Locker entitlements and store-locks non-starter cosmetics for monetization.
 * v235.9.4: forces Horde Nightfall outdoors, adds a limited local vision radius, and synchronizes a flickering street-light illumination layer while preserving v235.9.3 Horde grounding/animation.
 * v235.9.3: grounds Horde sprites with the playable-character foot anchor, uses the full 0/1/2 walk cycle, and synchronizes Horde direction/movement animation state.
 * v235.9.2: replaces Zombie Outbreak red boxes with The Horde enemy sprite sheets, renames the event to The Horde, and introduces tougher Beast Men.
 * v235.9.1: adds Daniel and ARMY as full starter playable characters across entry, profile, Locker, multiplayer, People Hub, and ATM Pay.
 * v235.9: synchronizes Zombie Outbreak combat with an elected realtime authority, shared zombie snapshots, and shared weapon-fire effects.
 * v235.8.1: hardens Zombie Outbreak multiplayer event delivery, late-join/resume synchronization, and remote-player weapon visibility.
 * v235.8: adds the HQ-triggered Zombie Outbreak combat preview with ±40° aim/facing, backpedal/strafe movement, and Rapid Micro / Spread ground upgrades.
 * v235.7.2: keeps Live Chat open when the visible SEND button is tapped, fixes the empty-state display, and unlocks a rechargeable jetpack phase in Platform Panic at 440m.
 * v235.7.1: couples Live Chat to the software keyboard, preserves the game canvas while typing, and restores transparent game visibility behind chat.
 * v235.6.2: adds persistent session live chat, a readable chat panel, and recent authenticated server history while preserving short overhead bubbles.
 * v235.6.1: fixes People Hub mobile scrolling and prevents live roster refreshes from resetting an active scroll.
 * v235.5: adds an explicit Testnet ATM Pay wallet reset/replacement flow while preserving the user's ATM Pay identity.
 * v235.4: adds desktop Xbox-style controller support with analog movement, controller UI navigation, camera look, jetpack controls, and arcade keyboard bridging.
 * v235.3.2: confirms Money Rain payouts in-game, exposes quick XRP balances, and tracks delayed Payload campaign-wallet reserve recovery.
 * v235.3.1: connects reward-enabled Testnet XRP Money Rain to Project Payload with one local funding signature and exact pay-what-you-collect settlement.
 * v235.2.1: restores intentional two-finger ATM Town camera zoom on Android while retaining the iPhone Safari viewport/multitouch protections.
 * v235.2: preserves every Money Rain participant's collected score for reward settlement and adds Salute, Brad, David, and Kaj.
 * v235.1.6: makes Supabase Presence the authoritative People Hub online roster so HUD count and player list stay consistent.
 * v235.1.5: keeps joystick pointer ownership during two-thumb jump while still blocking native iPhone Safari page zoom.
 * v235.1.4: prevents native iPhone Safari gameplay zoom while preserving mobile form input and game controls.
 * v235.1.2: triples Money Rain's visual density with a continuous viewport-wide atmospheric money storm.
 * v235.1.1: hardens iPhone/mobile input and makes Money Rain more atmospheric with wider scatter and high-altitude falling drops.
 * v235.1: polishes Money Rain with organic seeded clusters, responsive pickups, rare-drop types, and sponsor attribution.
 * v235: adds the reusable World Event Engine foundation and Money Rain preview.
 * v234.4: adds the People Hub — online players, recent people, and ATM Pay in one sliding social panel.
 * v234.3: consumer ATM Pay UX — character avatars, recent people, request notifications, one-tap request prep, and nearby-player Pay.
 * v234.2.6: fixes the ATM Pay ledger-index response contract used by payment-expiration safety checks.
 * v234.2.5: routes ATM Pay XRPL network transport through the authenticated ATM Town API while keeping signing local.
 * v234.2.4: makes ATM Pay mobile-friendly by using resilient HTTPS JSON-RPC Testnet transport.
 * v234.2: adds ATM Pay identity, request, activity, and server-bound Testnet payment intents.
 * v234.1: hardens the isolated XRPL Testnet embedded-wallet runtime configuration.
 * v234: adds isolated XRPL Testnet embedded-wallet runtime configuration.
 * v230: world streaming metadata joins map entry/exit/zoom/spawn runtime settings.
 * Keep this file data-only. Runtime behavior belongs in the appropriate module.
 */
(function initializeATMTownConfig(global) {
  'use strict';

  const TILE_SIZE = 48;

  const BUILD = Object.freeze({
    number: 235.116,
    version: 'v235.11.6',
    name: 'Checkout UX Rebuild + Entry Stability',
    title: 'ATM Town v235.11.6 — Dedicated Checkout UX + Entry Stability'
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
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.0'
  ]);

  const EMBEDDED_WALLET = Object.freeze({
    network: 'testnet',
    explorerBase: 'https://testnet.xrpl.org/accounts/',
    explorerTxBase: 'https://testnet.xrpl.org/transactions/',
    xrplBrowserSources: Object.freeze([
      'https://cdn.jsdelivr.net/npm/xrpl@5.0.0/build/xrpl-latest-min.js'
    ])
  });

  // v235.11.6 Attribute Store commerce policy.
  // Store purchases are real-value MAINNET commerce. World-event rewards remain
  // isolated on XRPL Testnet and are not changed by this configuration.
  // The merchant destination intentionally matches the existing Magnet Can
  // vending receiver. Future XRPL assets can be added behind the CRYPTO rail and
  // routed/swapped server-side without changing the player-facing CASH/CRYPTO UI.
  const ATTRIBUTE_STORE = Object.freeze({
    baseCurrency: 'USD',
    checkoutEnabled: false,
    purchaseNetwork: 'mainnet',
    merchantAddress: 'rMSDXpxDpV2pQJDHbp77XHHhT9QHMrfPYB',
    defaultUsdPrice: null,
    prices: Object.freeze({}),
    paymentCategories: Object.freeze([
      Object.freeze({ id: 'cash', label: 'CASH', rail: 'CARD', currency: 'USD' }),
      Object.freeze({ id: 'crypto', label: 'CRYPTO', rail: 'XRPL', network: 'mainnet' })
    ]),
    cryptoAssets: Object.freeze([
      Object.freeze({ id: 'atm', label: 'ATM', type: 'issued', currency: 'ATM', issuer: 'raDZ4t8WPXkmDfJWMLBcNZmmSHmBC523NZ' }),
      Object.freeze({ id: 'rlusd', label: 'RLUSD', type: 'issued', currency: '524C555344000000000000000000000000000000', issuer: 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De' }),
      Object.freeze({ id: 'xrp', label: 'XRP', type: 'native', currency: 'XRP', issuer: null })
    ])
  });

  global.ATM_TOWN_CONFIG = Object.freeze({
    tileSize: TILE_SIZE,
    build: BUILD,
    maps: MAPS,
    supabaseCdnSources: SUPABASE_CDN_SOURCES,
    embeddedWallet: EMBEDDED_WALLET,
    attributeStore: ATTRIBUTE_STORE
  });
})(window);
