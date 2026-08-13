# ATM Town v235 — World Event Engine Foundation

v235 introduces a reusable synchronized world-event layer and the first event module: **Money Rain Preview**.

## Money Rain Preview

The ATM Command Core inside HQ can start a synchronized Money Rain event:

- 10-second server-timed countdown
- 45-second live event
- 60 server-authored pickup definitions
- 1,000 preview points total
- town-wide HUD and event announcements
- server-enforced one-winner-per-pickup claims
- live top-5 results
- automatic event completion/cleanup

The first release intentionally does **not** settle ATM, XRP, or any other real-value reward. This lets multiplayer timing, collision placement, claim behavior, scoring, reconnect behavior, and abuse resistance be tested before Reward Engine integration.

## Server authority

`world_events` stores the event timeline and the complete pickup manifest. `world_event_claims` owns pickup uniqueness and scoring. Clients render the event, but cannot create arbitrary pickups or award themselves points.

The server currently verifies:

- authenticated event starters/collectors
- one globally live event at a time
- HQ Command Core proximity for starting an event
- event start/end timing
- pickup existence
- pickup landing time
- town-map claims
- claim distance from the server-authored pickup coordinate
- one successful claim per pickup

Client position is still reported by the browser, so v235 preview scoring is **not yet sufficient for valuable token rewards**. Before Reward Engine settlement, position authority / anti-teleport validation should be strengthened.

## API routing

No additional Vercel serverless function was added. The existing `api/world-time.js` route now also handles World Event state/actions, keeping the Hobby-plan function count unchanged.

## Future event modules

The same lifecycle is intended to support Zombie Night, Triskeleton invasions, bosses, meteor drops, scavenger hunts, seasonal events, partner-project events, and funded reward events.
