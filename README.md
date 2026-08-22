# ATM Town

ATM Town is a browser-based multiplayer social game built with HTML5 Canvas/JavaScript, Supabase Realtime, LiveKit voice, and XRPL/Xaman account/payment features.

## Current version

**v235.11.3 — Attribute Store Mobile Payment Fit + Vending Guard**

This build preserves v235.9.4 Horde Nightfall and adds the first monetization foundation to the Locker. A signed-in player's verified Xaman-linked XRPL wallet is scanned for the **You Are ATM** collection (`rsQJqZ7gbHR8hAfWP2fSzY2Zbg6akcMd2H`, Taxon `1`). Explicitly mapped metadata traits unlock their matching in-game equipment while the NFT remains in that wallet. Starter characters remain free; other former development-grant cosmetics are now store-locked pending direct checkout in the next commerce phase.

The existing vending Jetpack remains available as temporary time. A verified You Are ATM `Back: Jetpack` trait now grants permanent Jetpack access while the Jetpack is equipped.

The Locker is now owned-assets-only, and a new character-catalog Attribute Store sits below the Locker button. See `docs/V235.11-ATTRIBUTE-STORE.md` for store behavior, cart rules, payment policy, and test checklist. The v235.10 NFT mapping remains documented in `docs/V235.10-YOU-ARE-ATM-ENTITLEMENTS.md`.

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



### v235.11.3 mobile payment fit

- Keeps the Attribute Store payment controls fully inside the mobile viewport.
- CASH / CRYPTO now share the available width evenly instead of allowing a payment button to overflow off-screen.
- ATM / RLUSD / XRP likewise share one bounded row on mobile.
- The v235.11.2 persistent Store close button and vending open-gesture guard are preserved.
- Store crypto remains XRPL Mainnet; world-event funding/rewards remain Testnet.

### v235.11.2 store UX + vending input fix

- Attribute Store has an always-visible close button pinned to the upper-right.
- Vending machines ignore ghost/synthetic close events for 850 ms after opening, preventing touch double-fire open/close behavior.

### v235.11.2 commerce rail policy

- Player-facing checkout is grouped into **CASH** or **CRYPTO**.
- CRYPTO currently exposes **ATM**, **RLUSD**, and **XRP** on **XRPL Mainnet**.
- Store crypto payments are configured for the same merchant destination as Magnet Can vending: `rMSDXpxDpV2pQJDHbp77XHHhT9QHMrfPYB`.
- Official XRPL Mainnet RLUSD issuer: `rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De`.
- CASH is the future USD/card rail for non-crypto players.
- Money Rain / world-event funding and rewards remain **XRPL Testnet**.
- This patch does not activate checkout or charge users; prices and server-side permanent purchase entitlements still come next.

## Validation

```bash
npm run validate
npm run validate:world
npm run audit:assets
```

## Deployment

Apply the v235.11.3 change files to the repository root, preserving all folders and paths. Do not flatten `/assets`, `/api`, `/js`, `/docs`, or `/scripts`.
