# ATM Town v234 — Embedded Wallet Phase 1

## Scope

v234 adds an optional ATM Town embedded XRPL wallet without changing the existing Xaman wallet path.

**This release is Testnet only. Do not use Mainnet funds or Mainnet seeds with this feature.**

## Compatibility boundary

Existing `player_accounts.wallet_address` remains the verified Xaman/existing-wallet identity used by current Mainnet NFT inventory, NFT offer, Magnet Can, Trade Beacon ownership, and leaderboard display logic.

The embedded wallet uses a separate `embedded_wallets` table and `/api/embedded-wallet` route. This prevents a Testnet embedded address from replacing or contaminating existing Mainnet/Xaman behavior.

## Non-custodial design

1. The XRPL keypair is generated in the browser with the exact-pinned `xrpl@5.0.0` browser bundle.
2. The plaintext seed exists only in browser memory while the wallet is unlocked.
3. A random 256-bit vault key encrypts the wallet payload with AES-GCM.
4. A random recovery key derives a wrapping key with HKDF-SHA-256 and wraps the vault key.
5. When WebAuthn PRF is supported, a dedicated ATM Wallet passkey derives a second wrapping key and wraps the same vault key for biometric/passkey unlock.
6. Only the encrypted payload, wrappers, public credential metadata, and public XRPL address are sent to ATM Town's API/Supabase.
7. If PRF is unavailable, the wallet remains usable with the recovery key. Recovery is deliberately independent of passkey support.
8. The API rejects backup objects containing plaintext-secret field names and never logs request bodies.

The dedicated wallet passkey is separate from Supabase's login passkey. Supabase login passkeys authenticate the ATM Town account; the wallet passkey is used only to derive a local encryption key and never sends its PRF output to the server.

## Phase 1 user capabilities

- Create a real XRPL Testnet wallet on-device.
- Save an encrypted cloud backup.
- Unlock with a PRF-capable passkey where supported.
- Unlock/restore with the recovery key on any compatible browser.
- Restore a downloaded encrypted ATM Town backup JSON and verify it locally before re-uploading ciphertext.
- Display the real Testnet classic address.
- Read validated Testnet XRP balance.
- Reveal/export the Testnet seed only after explicit unlock and confirmation.
- Download the encrypted backup JSON.
- Auto-lock the in-memory seed after five minutes and on page hide/sign-out events.

## Deliberately NOT in Phase 1

- Mainnet embedded-wallet support.
- Sending XRP/tokens.
- NFT signing.
- Vending purchases with the embedded wallet.
- Replacing Xaman.
- Server-side signing or seed recovery.

A later Testnet phase can prove local signing/submission with a small Testnet transaction after this storage/unlock boundary has been live-tested.

## Deployment

1. Run `supabase/ATM-Town-v234.sql` in the Supabase SQL Editor.
2. Ensure Vercel has the existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` variables.
3. Optional: set `XRPL_TESTNET_RPC_URL` to a trusted XRPL Testnet JSON-RPC endpoint. If omitted, the API uses the official XRPL Testnet public JSON-RPC endpoint.
4. Deploy the changed files.
5. Sign in to ATM Town, open **CREATE ATM WALLET · TESTNET**, create the wallet, save the recovery key, and verify the displayed Testnet address/balance.

## Mainnet gate

Before any Mainnet enablement, vendor/audit the XRPL browser dependency locally, add a strict CSP/SRI strategy, perform independent cryptographic review, add transaction-intent confirmation screens, rate limits, backup/recovery threat modeling, and a dedicated Mainnet rollout review. Mainnet remains intentionally disabled in v234.
