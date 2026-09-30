# ATM Town Attribute NFT Metadata v1

## Locked collection settings

- Network: XRPL Mainnet
- Issuer: `rnCv6dCu3r1ANVD6vYuHikxV8TYphecdff`
- Authorized minter: `rM5oXXzDLJxLqKp6ZwZjjesPvNvh669uCc`
- NFTokenTaxon: `321`
- Secondary-sale royalty: `10%`
- XRPL `TransferFee`: `10000`
- Metadata schema: `atm-town.attribute.v1`

The XRPL NFToken stores a URI. That URI points to the JSON metadata. ATM Town should mint only after the JSON is complete, validated, and stored at a durable content-addressed location such as IPFS.

## Design rule

The NFT metadata is the portable declarative description of the game asset. It can tell ATM Town:

- which character or characters can equip it;
- what type of asset it is and which slot it occupies;
- its art/rendering profile, colorway, and colors;
- its base gameplay stat multipliers;
- which named abilities it has and the parameters for those abilities;
- equip requirements, conflicts, and stacking rules;
- provenance and metadata version.

Metadata never contains executable JavaScript. ATM Town recognizes a finite set of ability IDs and validates/caps numeric parameters before applying them. This lets official NFTs describe gameplay without allowing arbitrary code execution.

## Required top-level fields

`schema_version`, `name`, `description`, `image`, `external_url`, `game`, `collection`, `item_id`, `asset_type`, `slot`, `compatible_character_ids`, `appearance`, `gameplay`, `abilities`, `equip_rules`, and `provenance`.

### Identity and compatibility

`item_id` is the permanent ATM Town key, for example `body:astronaut`.

`compatible_character_ids` identifies which base character can use the asset. The current 61-item catalog belongs to the ATM character family, whose game ID is `classic`. Future creator assets can list one or more compatible characters.

### Appearance

`appearance.asset_key` is the game's stable visual key. `appearance.asset_uri` can point to remotely hosted creator art in the future. `colorway` and `colors` describe the visual variant. `render_profile` describes the sprite-sheet format and alignment.

Current ATM Town character equipment uses a 3×4 sprite sheet with rows Down, Left, Up, Right. The schema carries frame dimensions, anchor, and scale so creator assets can be rendered consistently.

### Gameplay

Every attribute carries a complete neutral-or-modified stat profile:

- `strength_multiplier`
- `speed_multiplier`
- `jump_height_multiplier`
- `jump_duration_multiplier`
- `health_multiplier`
- `damage_multiplier`
- `armor_multiplier`

A cosmetic with no gameplay advantage uses `1.0` for normal multipliers. An item with a special effect changes only the fields it actually affects.

The current Astronaut Body already has a known low-gravity profile in game code: 4× normal jump height and 2.7× jump duration. That existing behavior should be represented in its final metadata rather than invented again during minting.

### Abilities

Abilities are declarative records such as:

```json
{
  "id": "low_gravity",
  "name": "Low Gravity",
  "type": "movement",
  "enabled": true,
  "parameters": {
    "jump_height_multiplier": 4,
    "jump_duration_multiplier": 2.7
  }
}
```

The game maps `low_gravity` to an approved handler. Unknown ability IDs are ignored, not executed.

### Equip rules

`equip_rules` records whether the slot is exclusive, required companion items, conflicts, and allowed stacking/synergies. This is where combinations such as Astronaut Body + Jetpack can be represented explicitly.

## Mint gate

An item must not be marked `mint_status: "ready"` until every required metadata field is complete and the image/art URI is final. The first Mainnet mint should be one attribute only. Once that token is visible in the linked wallet and ATM Town reads the expected `item_id`, compatibility, visuals, stats, and abilities, the same pipeline can be used for the remaining catalog.
