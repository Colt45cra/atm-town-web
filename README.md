# ATM Town v235.12 — Commerce + Horde Survival + Neon Racer

Current build adds permanent server-verified Mainnet Attribute Store checkout plumbing (ATM/RLUSD/XRP), removes the redundant ownership filter, adds ATM Neon Racer to the previously unused Racing Cabinet, adds Invisibility/Juggernaut/Inferno vending powers, and adds multiplayer Horde player damage/down/revive survival. World-event/payment reward infrastructure remains Testnet unless explicitly designated as Mainnet commerce.

See `docs/V235.12-COMMERCE-HORDE-SURVIVAL-NEON-RACER.md` and run `supabase/ATM-Town-v235.12-Attribute-Commerce.sql` before testing real Attribute Store purchases. No launch prices are inserted by this patch.

---

# ATM Town

ATM Town is a browser-based multiplayer social game built with HTML5 Canvas/JavaScript, Supabase Realtime, LiveKit voice, and XRPL/Xaman account/payment features.

## Current version

**v235.12 — Commerce + Horde Survival + Neon Racer**

This build keeps the owned-assets-only Locker and You Are ATM NFT entitlements, removes the redundant Store ownership dropdown, and adds server-verified permanent Attribute Store purchases for **ATM, RLUSD, and XRP on XRPL Mainnet**. Prices remain server-authoritative in Supabase; no launch prices are inserted automatically. Cash/card remains a future checkout rail.

The Horde now has player survival: normal players are downed after two hits, Juggernaut raises the threshold to five while active, downed sprites fall sideways and cannot move/shoot/interact, and nearby teammates can revive them. New vending test powers add Invisibility, Juggernaut, and Inferno/fire damage.

The previously unused Racing Cabinet now launches **ATM Neon Racer**, a three-lane arcade game. No existing arcade game was replaced.

See `docs/V235.12-COMMERCE-HORDE-SURVIVAL-NEON-RACER.md` for behavior and testing, and run `supabase/ATM-Town-v235.12-Attribute-Commerce.sql` before testing Attribute Store checkout.

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






### v235.11.8 mobile Store layout rebuild
- Replaces the fragile mobile Store grid/absolute-cart combination with a simple flex-column app layout.
- The catalog is now the only scrolling region; the cart CTA is a normal static footer inside the Store body.
- Mobile products render as compact list cards with a fixed art column and a flexible details column, so names, prices, badges, and Add to Cart controls cannot establish a wider intrinsic layout.
- Removes percentage-width dependency from mobile product cards and their actions; cards fill the available content box through normal block/flex stretching.
- Preserves the dedicated checkout sheet, Mainnet ATM/RLUSD/XRP commerce policy, NFT entitlements, Locker ownership rules, and Testnet world-event funding/rewards.

### v235.11.7 mobile Store width lock

- Removes the mobile cart from the catalog's intrinsic grid width by pinning it as an inset bottom action bar inside the Store body.
- `REVIEW PAYMENT` now uses the cart's left/right insets rather than `width:100%`, so it cannot extend beyond the visible Store card.
- Phone catalogs are one full-width product per row; larger mobile/tablet widths use two columns. This removes the clipped next-card sliver seen on narrow phones.
- The catalog reserves space above the pinned cart so products can still scroll fully into view.
- The dedicated v235.11.6 payment sheet remains unchanged: Cash/Card and Crypto are separated from the catalog, and ATM/RLUSD/XRP remain Mainnet Store payment rails while world events remain Testnet.

### v235.11.6 dedicated checkout UX

The Attribute Store no longer tries to squeeze payment rails into the same mobile layout as the catalog/cart. The store cart now exposes one `REVIEW PAYMENT` action, which opens a dedicated full-width checkout sheet. CASH / CARD and CRYPTO are full-width tap targets on mobile, and ATM / RLUSD / XRP are displayed as full-width crypto choices only when CRYPTO is selected. This also fixes the prior mobile CSS rule that could force the crypto-asset selector visible even when CASH was selected. Store commerce remains XRPL Mainnet; world-event funding/rewards remain Testnet.

### v235.11.5 mobile checkout fit
- Fixes the remaining narrow-phone overflow in the Attribute Store payment area.
- Mobile CASH / CRYPTO selectors now use a hard two-column grid instead of a nested flex row.
- Mobile ATM / RLUSD / XRP selectors now use a hard three-column grid with width-bounded buttons.
- The mobile cart/payment area is flattened to a single block layout so parent grid sizing cannot push payment controls off-screen.
- Store crypto remains XRPL Mainnet; world-event funding/rewards remain Testnet.

### v235.11.4 entry/session stability

- Prevents duplicate passkey sign-in attempts from reopening the entry flow after the player has entered town.
- Keeps late auth/Xaman callbacks from covering active gameplay with the landing/profile flow.
- Removes the duplicate touch `pointerup` path from Enter Town; the normal click path handles touch and mouse once.
- Restores the Enter Town button after a successful join so a browser DOM restore cannot leave it permanently disabled.
- Defers service-worker updates until the next natural navigation instead of forcibly reloading a live game during a deploy.

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

Apply the v235.12 change files to the repository root, preserving all folders and paths. Do not flatten `/assets`, `/api`, `/js`, `/docs`, or `/scripts`.
