# ATM Town v233 — Leaderboards + Player NFT Offers

## Arcade leaderboards

V233 adds one server-backed Top 20 system shared by the four current ATM Token Arcade games:

- ATM Sky Run — fastest validated completion time.
- ATM Platform Panic — highest validated climb; coins are retained as a secondary result.
- ATM Flappy Jetpack — highest validated score; coins are retained as a secondary result.
- ATM Ring Rumble — cumulative online wins only.

A signed-in player receives a server game-session ID when a run starts. On completion/end, the client submits the result against that session. The server performs basic time/result plausibility checks and records the score as `verification_level=session`.

This is useful anti-tamper groundwork but it is **not sufficient by itself for high-value rewards** because the games still simulate primarily in the browser. Valuable competition rewards should later use stronger event/state verification or a more server-authoritative game mode.

Public leaderboard responses expose only shortened wallet addresses. The full linked address is stored server-side so ATM Town can distribute future rewards.

## Player-to-player XRP offers for NFTs

When a remote player is broadcasting an `OPEN TO TRADE` Trade Beacon, another signed-in player can choose **MAKE XRP OFFER**. ATM Town:

1. verifies the buyer's linked Xaman wallet,
2. verifies the displayed seller still owns the NFToken on the validated XRPL ledger,
3. verifies the NFT is transferable,
4. builds an XRPL `NFTokenCreateOffer` buy offer,
5. sends the transaction to Xaman for the buyer to review/sign,
6. verifies the exact validated XRPL transaction before reporting the offer as open.

The NFT owner can open the NFT in **Locker → XRPL NFTs → BUY OFFERS**, see active XRP buy offers returned directly by XRPL `nft_buy_offers`, and accept one through Xaman with `NFTokenAcceptOffer`.

ATM Town never receives either player's secret/private key.

## Database setup

Run `supabase/ATM-Town-v233.sql` once in the Supabase SQL Editor before using leaderboards or signed NFT-offer flows.
