# ATM Town v232 — XRPL Trade Beacon

v232 adds a visual, read-only multiplayer NFT Trade Beacon on top of the v231.2 XRPL Collection system.

## Player flow

1. Open **Locker → XRPL NFTs**.
2. Select an NFT that the linked wallet currently owns.
3. Choose **SHOWCASE** or **OPEN TO TRADE**.
4. The selected NFT appears above the player's avatar.
5. Nearby multiplayer users see the beacon and receive a **VIEW NFT** contextual action.
6. **VIEW NFT** opens a read-only viewer with the NFT name, collection, issuer, token ID, serial, owner display name, and shortened linked wallet.

## Modes

- `showcase`: visual display only.
- `open_to_trade`: communicates that the player wants offers/trade interest.
- hidden/cleared: no beacon is broadcast.

Only one NFT beacon can be active for a player at a time.

## Multiplayer state

Trade Beacon data is included in the existing Supabase Realtime `player_state` broadcast. It is ephemeral multiplayer presence data, not a blockchain transaction or ownership record.

The beacon payload includes only the display data needed by remote clients: token ID, name, collection, issuer, serial, image candidates, linked wallet, mode, and the ledger index at which the local collection was last read.

## Ownership safety

The local player can activate a beacon only from NFTs returned by ATM Town's authenticated XRPL Collection UI. On an XRPL inventory refresh, ATM Town clears the beacon if the linked wallet changed or the selected NFT is no longer in the wallet's verified inventory.

v232 does not move assets or XRP and never asks for a wallet seed/private key.

## Intentionally not included yet

The **MAKE OFFER** and **OFFER MY NFT** controls in the remote viewer are disabled placeholders. Actual selling, offers, Xaman signing, and settlement are later phases.
