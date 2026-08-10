# XRPL NFT Collection — Phase 1 (v231)

ATM Town v231 adds a read-only XRPL NFT collection inside the existing Locker. This is the foundation for later Trade Beacon, player offers, selling, frames, world drops, and gifting.

## Player flow

1. Sign in to ATM Town.
2. Link and verify a Xaman wallet using the existing account flow.
3. Open **Locker**.
4. Select **XRPL NFTs**.
5. ATM Town reads the NFTs currently owned by the linked wallet from a validated XRP Ledger.
6. NFT cards populate with on-ledger issuer, serial, taxon, token ID, URI, and flags.
7. Metadata/artwork is resolved asynchronously so a slow or broken NFT metadata host does not block the inventory itself.
8. Select any NFT to inspect its details.

Phase 1 is intentionally read-only. SHOWCASE, TRADE, and SELL controls are visible as disabled future actions so the collection UI can grow without changing the basic interaction model.

## Server endpoints

### `GET /api/xrpl-inventory`

Authenticated ATM Town users only. The endpoint:

- reads the linked `wallet_address` from `player_accounts` server-side;
- does not accept an arbitrary wallet from the browser;
- queries `account_nfts` using a validated ledger;
- follows XRPL pagination markers;
- normalizes URI text and useful NFToken flags;
- returns ledger metadata with the owned NFT array.

The XRP Ledger remains the ownership source of truth. ATM Town does not maintain a duplicate ownership inventory.

### `POST /api/xrpl-nft-metadata`

Authenticated metadata helper used after the ledger inventory is loaded.

Input:

```json
{
  "nftoken_id": "<64 hex chars>",
  "uri": "<XRPL URI hex>"
}
```

The resolver supports common `ipfs://`, `ar://`, HTTP(S), direct-image, and data-JSON metadata patterns. HTTP(S) metadata is fetched only after public-network checks; loopback/private/link-local destinations are rejected to reduce SSRF risk. Redirect destinations are checked again.

Metadata is presentation data only. A metadata response never changes ownership or unlocks a blockchain transaction.

## Client behavior

The Locker includes a third tab: **XRPL NFTs**.

Features in v231:

- linked wallet display;
- validated ledger indicator;
- NFT count;
- search by name, issuer, token ID, collection, serial, taxon, or URI;
- sort by newest serial, oldest serial, name, or issuer;
- responsive NFT card grid;
- lazy/asynchronous artwork and metadata hydration;
- NFT detail panel;
- transferability, XRP-only, mutable URI, and burnable flag badges;
- issuer, taxon, full NFTokenID, and decoded URI display;
- metadata traits when available;
- graceful placeholders for missing/broken metadata.

## Security boundary

Phase 1 does not request or store a seed/private key and does not create XRPL transactions. The player's existing verified Xaman-linked address identifies the collection to read.

Future transaction phases should continue to use Xaman for user authorization and should re-check ledger ownership immediately before any sell, trade, gift, or world-drop action.

## Future phases

- Phase 2: Trade Beacon / show NFT above avatar.
- Phase 3: player-to-player NFT inspection and offer UI.
- Phase 4: create and cancel sell offers.
- Phase 5: buy and make XRP offers.
- Later: NFT-for-NFT trade settlement, wall frames, gallery/store displays, gifting, and chunk-aware world drops.
