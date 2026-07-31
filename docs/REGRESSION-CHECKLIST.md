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
- Town interaction points still show the correct prompts.

## Interiors

- ATM HQ entry/exit, collision, depth, interactions, and voice table work.
- NFT Gallery entry/exit, collision, and depth work.
- Arcade entry/exit, collision, and depth work.
- Community Lounge entry/exit, collision, depth, authored interactions, and voice areas work.

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
- Voice joins, mutes, leaves, and respects proximity.

## Automated checks

Run:

```bash
npm run validate
npm run audit:assets
```
