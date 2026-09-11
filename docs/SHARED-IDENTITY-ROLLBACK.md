# Shared Identity Rollback Notes

The rollout is intentionally additive.

If standalone ATM Pay must temporarily return to its former Supabase project, revert the standalone app's shared-identity client commit and redeploy. The former standalone Supabase project is left intact during the rollout.

Do not delete the canonical ATM Town `wallet_routes`, `wallet_backups`, `wallet_route_history`, or `atm_pay_handle_aliases` tables during a rollback. They contain the migrated encrypted wallet state and public route history and are protected by RLS.

The NFT performance patch is independent of the shared identity tables. It can be reverted separately by removing `js/nft-performance.js` and the bootstrap loader if necessary.
