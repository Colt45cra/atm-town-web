# ATM Town

ATM Town is a browser-based multiplayer social game built with HTML5 Canvas/JavaScript, Supabase Realtime, LiveKit voice, and XRPL/Xaman account/payment features.

## Current version

**v235.10 — You Are ATM Entitlements**

This build preserves v235.9.4 Horde Nightfall and adds the first monetization foundation to the Locker. A signed-in player's verified Xaman-linked XRPL wallet is scanned for the **You Are ATM** collection (`rsQJqZ7gbHR8hAfWP2fSzY2Zbg6akcMd2H`, Taxon `1`). Explicitly mapped metadata traits unlock their matching in-game equipment while the NFT remains in that wallet. Starter characters remain free; other former development-grant cosmetics are now store-locked pending direct checkout in the next commerce phase.

The existing vending Jetpack remains available as temporary time. A verified You Are ATM `Back: Jetpack` trait now grants permanent Jetpack access while the Jetpack is equipped.

See `docs/V235.10-YOU-ARE-ATM-ENTITLEMENTS.md` for the mapping, entitlement rules, and test checklist.

## Project structure

```text
index.html              Main game runtime and UI
api/                    Vercel serverless endpoints
js/                     Shared config, maps, interactions, startup helpers
assets/
  maps/                  Authored map sources, interiors, foregrounds and PNG gameplay masks
  world/                 Runtime streamed town chunks, overview and manifest
  characters/            Playable characters, equipment and thumbnails
  ui/                    Landing/UI artwork extracted from the HTML
  audio/                 Music and sound effects
  items/                 Coin/item artwork
  environment/           Reusable environmental artwork
scripts/                 Validation and asset-audit tools
docs/                    Architecture, asset policy, changelog and testing docs
```

## Asset format policy

- Visual PNG artwork is converted to WebP when WebP is smaller and safe.
- Sprite/character artwork uses lossless WebP to preserve crisp pixels and alpha.
- Collision, interaction, stairs, depth and similar gameplay-data masks remain PNG.
- New runtime artwork should not be added loose to repository root.

See `docs/ASSET-POLICY.md`.

## Validation

```bash
npm run validate
npm run validate:world
npm run audit:assets
```

## Deployment

Apply the v235.10 change files to the repository root, preserving all folders and paths. Do not flatten `/assets`, `/api`, `/js`, `/docs`, or `/scripts`.
