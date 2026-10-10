# Atomic NFT trades

Players approach an OPEN TO TRADE beacon and choose OFFER MY NFT. They select a transferable NFT from their verified wallet. Incoming and outgoing proposals appear in Locker → XRPL NFTs → NFT TRADES. Names are display labels; both full token IDs and counterparty addresses are shown for review.

The receiving player approves in Xaman first (`submit: false`, `options.signer`). The proposer then approves the outer Batch, paying only its disclosed XRPL network fee (`submit: true`, `BatchSigners` references the recipient's signed payload UUID). No wallet seeds or private keys are requested by ATM Town.

Each exchange includes four unsigned inner transactions in `tfAllOrNothing` mode: create A's zero-XRP sell offer restricted to B; create B's zero-XRP sell offer restricted to A; B accepts A's offer; A accepts B's offer. Both offers are created and consumed inside the same Batch. No standalone zero-price offers are submitted. Each inner transaction has the Batch flag, zero fee and empty signing public key. The proposing wallet's outer sequence is reserved when the batch is prepared, and inner sequences account for it. Changing wallet sequences requires a new proposal.

The Mainnet network ID and enabled BatchV1_1 amendment are checked before preparing sign requests. Offers expire after ten minutes; the final Batch has a 150-ledger deadline. Both signatures authorize frozen inner transaction terms, outer account and outer sequence. The server verifies the exact validated outer transaction and all four inner transaction hashes, success codes, ledger indexes and ParentBatchID before marking completion. Outer tesSUCCESS alone is insufficient. Rollback is confirmed using the validated ledger's expanded transaction set if individual transaction indexing is incomplete.

Proposal expiry and decline/cancel are supported before final submission. Once the final Xaman request exists, a player must reject that request in Xaman; ATM Town continues checking settlement rather than declaring a possibly submitted transaction cancelled. Interrupted preparation is recoverable after two minutes. Phase transitions use conditional database updates, preventing concurrent requests from producing multiple active sign requests.

The `nft_atomic_swaps` table is backend-only, with RLS enabled and REST grants revoked from anonymous and authenticated roles. The API authenticates and authorizes each participant using verified player_accounts wallets. Other participants' sign request IDs are not exposed. Proposal creation is capped at 20 per hour per account.

API actions share the existing `/api/xrpl-nft-trade` Vercel function: swap-capability, swap-propose, swap-list, swap-status, swap-sign, swap-finalize and swap-cancel. Existing XRP offer routes are preserved.

Validation: `node --test tests/nft-atomic-swap.test.mjs` covers serialized signatures, transaction structure, altered terms, partial failures, parent/ledger matching, authentication, wallet mismatches and network gating. The existing build validation has 15 identical failures on the pre-change main branch and this change; those legacy assertions were not altered. A two-player Xaman approval on actual owned NFTs requires the players' wallet signatures and is not performed by automated checks.

References:
- https://xrpl.org/docs/references/protocol/transactions/types/batch
- https://xrpl.org/docs/concepts/transactions/batch-transactions
- https://docs.xaman.dev/concepts/special-transaction-types/batch-multiple-inner-signers
- https://github.com/XRPLF/rippled/blob/develop/src/libxrpl/protocol/Indexes.cpp (NFTokenOffer keylet namespace)
