# ATM Town economy control

The current payout implementation is documented in [Automatic Payload arcade rewards](AUTOMATIC-PAYLOAD-ARCADE-REWARDS.md). Arcade payouts use the signed ATM Town–Payload integration automatically on exit; no per-reward review or treasury signature is required.

The standalone, installable admin app is at `https://www.atmtown.fun/admin/`. It controls attribute prices, each game’s rate and limits, the Payload vault connection, payout status and the audit log.

Sign in using the existing ATM Town email magic link or passkey. No new password is needed. Admin authorization uses the service-only `town_admins` table; ordinary accounts cannot access admin operations. The explicitly verified owner is `colton18771@gmail.com`. Both production host variants and their callback paths are allowed in Supabase, and the magic-link email uses `{{ .ConfirmationURL }}`.

Rules stay paused until the operator connects and funds a dedicated ATM arcade vault and sets positive rates. Attribute prices allow blank currencies to disable checkout with that currency. Disabled attributes cannot fall back to a default price.
