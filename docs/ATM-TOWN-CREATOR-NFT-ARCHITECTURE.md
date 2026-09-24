# ATM Town Creator + Official Attribute NFT Architecture

## Canonical issuer model

All official ATM Town game-asset NFTs use one dedicated **ATM Town issuer account** on XRPL Mainnet.

The issuer should be treated as a cold identity account. Routine minting should be performed by a separate operational account authorized through the issuer's `NFTokenMinter` setting. The authorized minter includes the cold issuer in the `Issuer` field of each `NFTokenMint`.

Creators never receive the issuer secret or minter secret.

## Current ATM Town assets

The existing ATM character catalog is the first official Attribute NFT collection.

- Each asset keeps its current ATM Town `item_id`.
- Each NFT metadata record includes the exact `item_id`.
- ATM Town verifies issuer + taxon + metadata `item_id`.
- Ownership of the NFT unlocks the corresponding game asset.
- Transfer or sale of the NFT transfers the game entitlement after wallet refresh.
- Existing You Are ATM trait unlocks remain a parallel entitlement source.
- Initial ATM Town store target price: **3 XRP per attribute NFT**.

## Future /create flow

Planned route: `atmtown.fun/create`

1. Creator signs into ATM Town.
2. Creator creates an attribute project.
3. Creator uploads art/assets and selects the compatible character and slot.
4. ATM Town validates dimensions/formats and builds a draft game layer.
5. Creator launches a private testing map with the attribute equipped.
6. Creator iterates until the visual result is approved.
7. Creator submits the attribute for ATM Town review.
8. ATM Town records creator attribution and primary-sale revenue share.
9. Once approved, metadata is pinned/finalized.
10. ATM Town's authorized minter mints the NFT on behalf of the canonical ATM Town issuer.
11. The asset is added to the ATM Town Attribute Store.
12. A player purchase transfers the NFT to the buyer.
13. The player's verified XRPL wallet becomes the ownership source of truth for the in-game unlock.

## Revenue model

Each creator attribute stores a primary-sale split in basis points.

- `atm_town_bps` MUST be at least **2000** (20%).
- `creator_bps` receives the remaining configured share.
- Total primary-sale basis points must equal 10000.
- Future collaborations can add additional recipients only if ATM Town remains >= 20%.

Until XRPL atomic batching is available and enabled for the production flow, the application should not pretend a multi-recipient primary-sale payment is atomic. The commerce layer should keep the split model in metadata/database now and activate atomic distribution only after the production XRPL feature is verified.

## Secondary sales

XRPL `NFTokenMint.TransferFee` is separate from the primary-sale split. It is an immutable percentage paid to the NFT issuer on qualifying secondary NFT sales.

The collection's secondary royalty should be decided before minting because the transfer fee and transferability flags are immutable NFT settings.

## Metadata contract

Minimum official attribute metadata:

```json
{
  "name": "ATM Town Attribute — Blue Mohawk",
  "description": "Transferable ATM Town character attribute.",
  "collection": "ATM Town Attributes",
  "game": "ATM Town",
  "item_id": "head:blue-mohawk",
  "slot": "head",
  "character_ids": ["classic"],
  "creator": {
    "display_name": "Example Artist",
    "wallet": "r..."
  },
  "primary_sale_split": {
    "atm_town_bps": 2000,
    "creator_bps": 8000
  },
  "image": "ipfs://..."
}
```

Creator and split values are descriptive metadata; the backend remains authoritative for commerce validation.

## Security

- Cold issuer seed must not be stored in the public repository, browser localStorage, or normal application environment variables.
- Operational minting should use the authorized minter rather than the cold issuer seed.
- Production minter credentials must be stored in an appropriate secret-management system.
- Mint requests must be authenticated, authorized, validated against an approved asset record, and idempotent.
- ATM Town must never accept arbitrary NFT metadata as an entitlement. The issuer, taxon, and exact approved `item_id` must all match.
