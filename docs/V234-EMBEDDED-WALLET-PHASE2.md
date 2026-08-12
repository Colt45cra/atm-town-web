# ATM Town v234 — Embedded Wallet Phase 2

## Scope

Phase 2 proves that the embedded ATM Wallet can authorize a real XRPL Testnet transaction without sending the plaintext seed/private key to ATM Town infrastructure.

Mainnet remains disabled. Existing Xaman/Mainnet wallet linking, vending, NFT inventory/trading, Trade Beacon, multiplayer, Competition Engine and v233.2 score reliability remain separate and unchanged.

## Payment flow

1. The user must first unlock the encrypted ATM Testnet wallet locally.
2. The user enters a classic XRPL Testnet destination address and an XRP amount.
3. The browser connects only to `wss://s.altnet.rippletest.net:51233/` using the pinned xrpl.js runtime.
4. `Client.autofill()` obtains the current `Fee`, `Sequence`, and `LastLedgerSequence` before the user is asked to sign.
5. ATM Town verifies that the autofilled transaction still exactly matches the requested account, destination and amount.
6. The UI previews amount, destination, fee, sequence and expiration ledger.
7. The user explicitly confirms signing.
8. `Wallet.sign()` runs locally against the already-unlocked wallet.
9. Only the signed `tx_blob` is submitted, directly from the browser to XRPL Testnet with `Client.submitAndWait()`.
10. ATM Town displays the final transaction result/hash and links to the Testnet explorer.
11. The embedded wallet locks immediately after a signing/submission attempt that produced a transaction hash.

## Phase 2 safety rails

- Testnet only. The WebSocket endpoint is hard-gated to the official XRPL Testnet server.
- Only classic `r...` destination addresses are accepted in this first payment UI.
- Sending to the wallet's own address is blocked.
- Maximum Phase 2 payment: 10 Testnet XRP per transaction.
- Maximum accepted autofilled fee: 10,000 drops (0.01 Testnet XRP).
- Prepared transaction previews expire after 60 seconds and must then be refreshed from the ledger.
- `Account`, `Destination`, `Amount`, `Fee`, `Sequence`, and `LastLedgerSequence` are rechecked immediately before signing.
- The signed transaction blob is not sent through `/api/embedded-wallet` or stored in Supabase.
- The recovery key and seed remain subject to the Phase 1 local-encryption/unlock design.
- A transaction whose submission status becomes uncertain is surfaced by hash so the user can check the Testnet explorer before attempting another transaction.

## Not included yet

- Mainnet embedded-wallet signing.
- TrustSet/token payments/NFT transactions.
- Destination tags or X-address entry.
- Transaction history persistence.
- Production custody/security sign-off.
- A vendored/self-hosted xrpl.js build and strict production CSP. Those are still required before Mainnet is considered.

## Validation

Run:

```bash
npm run validate
npm run validate:world
```

The build validator checks Phase 1 custody boundaries, Phase 2 Testnet-only endpoint/signing markers, and existing Xaman Mainnet separation/regression markers.
