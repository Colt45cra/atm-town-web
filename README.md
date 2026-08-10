# ATM Town

ATM Town is a browser-based multiplayer social game built with HTML5 Canvas/JavaScript, Supabase Realtime, LiveKit voice, and XRPL/Xaman account/payment features.

## Current version

**v230 — World Streaming / Chunk Engine**

This build preserves the optimized gameplay baseline while converting the existing 3120 × 4320 outdoor town to a data-driven 1024px streamed world. The authored full-size source layers remain available for future re-tiling; runtime terrain, masks, night, and lighting load by chunk.

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

Upload the **contents** of the v230 build/ZIP to the repository root, preserving all folders and paths. Do not flatten the `/assets`, `/api`, `/js`, `/docs`, or `/scripts` directories.
