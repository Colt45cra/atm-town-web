# Automatic arcade payouts through Payload

Sky Run, Platform Panic, Flappy Jetpack and Neon Racer queue their earned ATM reward on exit. There is no per-payout admin approval or Xaman signature. The existing server-to-server Ed25519 integration calls Payload, which executes through the owner's funded reward vault and revocable automation key.

## One-time setup

1. In Payload, create a mainnet reward vault paying ATM issued by `raDZ4t8WPXkmDfJWMLBcNZmmSHmBC523NZ`. Use a one-time interval, fixed reward amount, and ATM Town (`atm_town`) as the only external participant qualification. The fixed amount is the maximum payout for one arcade session. This vault must be separate from the 666 welcome reward.
2. Prepare the vault in Payload so its slug and funding setup exist, but do not fund or activate it yet. Open `https://www.atmtown.fun/admin/`, select Game rewards, enter the vault slug for each game, and press Connect vault to Payload. A vault may be shared by all four games.
3. Activate the vault's automation permission and fund its ATM balance, XRP fees and claim count through Payload's existing owner-controlled funding flow. Funding/permission setup may require wallet signatures; individual arcade payouts do not. The funded vault configuration is immutable, so connect it before activation.
4. Set ATM per coin, maximum coins per run and the daily ATM limit per player, then enable and save. The maximum reward `min(rate × coin cap, daily limit)` must fit the Payload vault's session cap. Rates stay at zero and games stay paused until configured.

## Payment lifecycle

- Verified player wallet, coin sequence, rate, coin cap, daily limit and vault slug are stored server-side at session start. Client-provided payment totals and destinations are never accepted.
- `town_arcade_exit` closes the session once, locks the player's UTC daily budget and records an immutable amount. Positive rewards become queued; zero rewards become empty. Repeat exits do not increase the amount.
- Payload permanently binds the session ID to one integration, program, wallet and amount. A different retry binding is rejected. Its existing reservation RPC atomically enforces the funded cycle budget and payment count.
- Payload persists the signed transaction blob, hash and LastLedgerSequence before broadcast. Unknown outcomes reconcile the same transaction. A replacement is permitted only after the prior transaction is provably unsuccessful or expired.
- The game marks a reward paid only when Payload reports confirmed success with the matching mainnet ATM asset, wallet, amount and transaction hash. Pending or failed requests remain queued for retry; the admin page shows the reason and a manual retry control, not an approval requirement.
- Browser pending exits retry every 30 seconds and after reconnect. Payload enqueues a delayed QStash job for each unpaid event, with duplicate-job suppression and retries. Protected cron recovery also runs daily in both apps. Interrupted active sessions older than one hour are closed by game cron. Daily cron processes three items per run and rotates failed items; it is a recovery fallback, not the normal payment trigger.

## Limits and verification

Coin pickups are browser reports constrained by a server sequence, timing, run cap, verified wallet and player daily budget. These checks are **not authoritative gameplay replay or anti-cheat proof**. A modified client can fabricate reports within the limits. The funded vault bounds aggregate exposure, but it does not prove a coin was collected. Keep monetary budgets modest until authoritative gameplay validation is added.

Reward rules remain paused and no real funds were transferred during verification. Unit tests cover duplicate-paid retries, ambiguous network outcomes, pending vs confirmed status, response mismatches, fixed-point caps and integration/asset isolation. Database tests run in rolled-back transactions to check replay, queue state, daily caps and private grants. The existing 666 welcome program is unchanged.

`CRON_SECRET` must exist in production in each app. Payload also uses its existing `QSTASH_TOKEN` and `NEXT_PUBLIC_APP_URL`. If the job URL is deployment-protected, allow authenticated QStash delivery or use the public production domain; cron and browser reconciliation remain available if delivery fails.
