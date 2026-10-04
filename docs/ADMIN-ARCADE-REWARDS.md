# ATM Town economy control

The current payout implementation is documented in [Automatic Payload arcade rewards](AUTOMATIC-PAYLOAD-ARCADE-REWARDS.md). Arcade payouts use the signed ATM Town–Payload integration automatically on exit; no per-reward review or treasury signature is required.

The standalone, installable admin app is at `https://www.atmtown.fun/admin/`. It controls attribute prices, each game’s rate and limits, the Payload vault connection, payout status and the audit log.

Sign in using the existing ATM Town email magic link or passkey. No new password is needed. Admin authorization uses the service-only `town_admins` table; ordinary accounts cannot access admin operations. The explicitly verified owner is `colton18771@gmail.com`. Both production host variants and their callback paths are allowed in Supabase, and the magic-link email uses `{{ .ConfirmationURL }}`.

Rules stay paused until the operator connects and funds a dedicated ATM arcade vault and sets positive rates. Attribute prices allow blank currencies to disable checkout with that currency. Disabled attributes cannot fall back to a default price.

### Wallet overview and compact pricing
Reward wallets are read through the signed Payload integration after saving a connected vault slug in game settings. The admin displays actual ATM balance, spendable XRP fees, funded payout allowance, and payment slots. Low means insufficient balance or allowance for one maximum game reward, no payment slots, or insufficient transaction fees. Refresh checks confirmed deposits; Xaman top-up adds a funded budget through the existing replenishment flow. The funder signs each deposit in Xaman, while player payouts remain automatic.
Attribute filters use the game playable character list and equipment compatibility mappings, independently of the administrator inventory. Regenerate admin/catalog.json with node scripts/export-admin-catalog.mjs after catalog changes. Compact price cards show three columns on wide screens, two on medium screens, and one on phones.
