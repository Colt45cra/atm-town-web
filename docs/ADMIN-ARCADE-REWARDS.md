# ATM Town economy control

The current payout implementation is documented in [Automatic Payload arcade rewards](AUTOMATIC-PAYLOAD-ARCADE-REWARDS.md). Arcade payouts use the signed ATM Town–Payload integration automatically on exit; no per-reward review or treasury signature is required.

The standalone, installable admin app is at `https://www.atmtown.fun/admin/`. It controls attribute prices, each game’s rate and limits, the Payload vault connection, payout status and the audit log.

Sign in using the existing ATM Town email magic link or passkey. No new password is needed. Admin authorization uses the service-only `town_admins` table; ordinary accounts cannot access admin operations. The explicitly verified owner is `colton18771@gmail.com`. Both production host variants and their callback paths are allowed in Supabase, and the magic-link email uses `{{ .ConfirmationURL }}`.

Rules stay paused until the operator connects and funds a dedicated ATM arcade vault and sets positive rates. Attribute prices allow blank currencies to disable checkout with that currency. Disabled attributes cannot fall back to a default price.

### Wallet overview and compact pricing
Reward wallets are read through the signed Payload integration after saving a connected vault slug in game settings. The admin displays actual ATM balance, spendable XRP fees, funded payout allowance, and payment slots. Low means insufficient balance or allowance for one maximum game reward, no payment slots, or insufficient transaction fees. Refresh checks confirmed deposits; Xaman top-up adds a funded budget through the existing replenishment flow. The funder signs each deposit in Xaman, while player payouts remain automatic.
Attribute filters use the game playable character list and equipment compatibility mappings, independently of the administrator inventory. Regenerate admin/catalog.json with node scripts/export-admin-catalog.mjs after catalog changes. Compact price cards show three columns on wide screens, two on medium screens, and one on phones.


## NPC rewards and shared wallet

The Control room’s NPC rewards tab manages ATM, Fuzzy, Miracle, Luci and Triskeleton. Each NPC has a pause switch, a positive reward amount (up to six decimal places), and once/daily/weekly/monthly frequency. Periods are calendar periods in UTC; one successful reward per verified wallet per NPC per period. Existing reserved and submitted transactions retain their amount and reconcile before retrying. Changing frequency establishes the selected period schedule.

The ATM Town arcade allowance and the four new ATM NPC allowances use Luci’s existing delegated user-owned wallet, with separate funded allowances. Luci retains its 666 asset and existing funding. New ATM allowances start awaiting funding with NPC payouts disabled. Use Reward wallets to request a Xaman top-up, confirm each stage, then enable the relevant NPC or arcade rules. Only one top-up may be pending for the shared wallet at a time, preventing a deposit from being credited to multiple allowances. Players without an ATM trustline can request one from the NPC reward button and approve it in Xaman.

Reward configuration and claims travel through the server’s signed Payload integration. The player supplies no payout amount, destination, asset or period; the server uses their verified linked wallet. Pausing is checked both before eligibility and within the database reservation lock. No real payout is sent during deployment.
