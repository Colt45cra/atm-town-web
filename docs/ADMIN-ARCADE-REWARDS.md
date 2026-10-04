# ATM Town Control and arcade rewards

Standalone installable control app: `/admin/`. It uses ATM Town sign-in with the existing same-origin ATM Town session, email magic links or a registered device passkey and a server-only `town_admins` allowlist. It shares the game backend rather than duplicating account or pricing data.

## Setup required before launch

1. Run existing attribute-commerce setup if not installed, then `supabase/ATM-Town-v236-Admin-Arcade-Rewards.sql` in the **ATM Town** project (`xnyjurertwohlqczaeux`). Applied and verified on 2026-10-04 using the ATM Town + connection.
2. Add the deployed `/admin/` URL to Supabase Auth’s redirect allowlist. For this draft also add `https://atm-town-web-git-admin-arcade-rewards-colton-adams-s-projects.vercel.app/admin/`. The email flow uses `shouldCreateUser: false`, so it only signs in existing accounts. Verify the email return once the project is connected.
3. The user-confirmed `colton18771@gmail.com` account is authorized in `town_admins`. Do not infer additional privileges from display names or editable user metadata.
4. Set `ATM_TOWN_REWARDS_WALLET` to a dedicated Mainnet treasury controlled through Xaman. Fund it with ATM and sufficient XRP for fees; establish the ATM issuer trustline. Existing Xaman server credentials are reused. No wallet seeds are collected.
5. Deploy after the database setup. Open `/admin/` and configure attribute prices and game rules. Rules default paused with zero value; no invented launch reward rates.
6. Test one small payout to a linked verified wallet with an ATM trustline. Confirm on the ledger before showing it as paid.

## Implemented behavior

Attribute prices for USD, ATM, RLUSD and XRP; explicit currency disable with a blank field; attribute pause; server-side cart pricing; transactional changes and audit history. Previously, an inactive row or blank XRP amount silently restored a 3 XRP default. This is fixed: fallback applies only to attributes with no database price row.

Sky Run cash and Platform Panic, Flappy Jetpack, Neon Racer coins each report sequential pickups into an authenticated server session. Replay opens a new session and closes the previous run. Exit submits the claim, preserving interrupted/offline exit requests on the same device for retry. Daily limits are reserved atomically across games, claims are idempotent, and the wallet and rate are snapshotted when the run begins. Daily limits use UTC calendar days. In-flight runs retain their configured rate when rules change.

The admin app supports review, approve/reject, Xaman treasury payment, ledger confirmation, and payment history. Unknown payment-creation outcomes stay locked for reconciliation rather than producing another payable request. Signed, validated payments must match the exact treasury, destination, amount, issuer and invoice. A claim is never described as paid merely because a signing request exists.

## Outstanding requirement: automatic payouts on exit

**This draft does not enable automatic real-money payouts.** Pickups are reported by browser code. Sequence, timing, authenticated sessions and limits reduce accidental duplicates but do not prove legitimate play: a malicious client can emulate these requests. Claims therefore require administrator review and treasury signing. Enabling unattended payments safely needs authoritative server simulation/input replay for each reward game plus an authorized funded payout executor (for example, a reusable Payload treasury integration). Neither has been silently replaced with a wallet seed or trusted browser total.

The player message explicitly says submitted for review. Admin reports automatic payouts disabled. This limitation and the email redirect setup must be resolved before the user's complete requested flow is live.

## Verification

Run `npm run validate` and `node --test tests/town-economy.test.mjs`. Validate the SQL and concurrency behavior in an accessible ATM Town staging database, then test iPad/mobile close, replay, network retry and one real small payment. Live database tests passed for duplicate coin reporting, idempotent exits, daily budget reservation, owner access and restricted function/table privileges. Test changes were rolled back. Wallet signing and ledger payouts remain untested. Supabase Auth redirect settings still require dashboard access.
