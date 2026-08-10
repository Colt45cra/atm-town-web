# ATM Town Regression Checklist

Run this checklist after every version before replacing the production build.

## Startup and identity

- Welcome screen fits without vertical scrolling on mobile and desktop.
- Guest entry works.
- Account/passkey entry remains responsive.
- Xaman linking UI opens and returns correctly.
- Character selection displays each available character.

## Town

- Town loads in daytime and nighttime.
- Character walks behind buildings, trees, signs, and other depth pieces.
- Collision prevents walking through blocked areas.
- Stairs remain walkable and aligned.
- Coins spawn, collect, and update the quest counter.
- Blue entry regions open the correct building.
- Red vending regions open the power-up vending panel.
- Yellow miscellaneous regions show the correct location dialog.

## Interiors

- ATM HQ enters at 60% zoom; entry/exit, collision, and depth work.
- HQ purple display, cyan ATM, yellow terminals, and green voice areas trigger correctly.
- NFT Gallery enters at 60% zoom; entry/exit, collision, and depth work.
- Arcade enters at 60% zoom; entry/exit, collision, and depth work.
- Community Lounge enters at 70% zoom; entry/exit, collision, and depth work.
- Lounge purple display, yellow arcade cabinet/games/jukebox regions, and green voice areas trigger correctly.
- Lounge vending opens the vending panel rather than only showing a dialog.

## Player and controls

- Desktop keyboard movement works.
- Mobile joystick movement works.
- Diagonal movement uses four-direction sprites.
- Tap-to-move works.
- Jump works.
- Jetpack activation, rise, release, landing, and sound work.
- Lightning, Bounce, and Magnet durations stack by time only.

## Multiplayer

- Online room join works.
- Remote players appear on the correct map.
- Remote interpolation is smooth.
- Chat sends and displays.
- Emotes and map synchronization remain intact.
- Voice joins, mutes, leaves, and respects the authored green proximity areas.

## Automated checks

```bash
npm run validate
npm run audit:assets
```

## XRPL NFT collection (v231+)

- Signed-in player with no linked wallet sees a clear link/refresh message rather than a broken grid.
- Linked Xaman wallet opens **Locker → XRPL NFTs** and returns the wallet's current on-ledger NFT count.
- NFT cards remain usable when metadata is missing, slow, malformed, or hosted somewhere unavailable.
- Search works by NFT name, issuer, token ID, collection, serial, taxon, and decoded URI.
- Sort works for newest/oldest serial, name, and issuer.
- Selecting an NFT opens the detail panel and shows issuer, taxon, NFTokenID, decoded URI, and transfer flags.
- IPFS/HTTP(S)/direct-image metadata that resolves successfully displays artwork without blocking the ledger inventory.
- Mobile/tablet NFT grid remains touch-friendly and the detail panel can be closed.
- SHOWCASE, TRADE, and SELL remain disabled in Phase 1; no XRPL transaction is created by the collection UI.
