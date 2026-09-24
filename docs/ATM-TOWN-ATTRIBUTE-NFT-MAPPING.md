# ATM Town Attribute NFT Mapping

This is the working bridge between the current ATM Town character catalog, legacy **You Are ATM** trait-based unlocks, and the planned transferable **ATM Town Attribute NFT** collection.

## Current status

- ATM Town character equipment catalog: **61 attributes**.
- Existing explicit You Are ATM trait rules: **32**.
- Planned official Attribute NFTs: **61**, one metadata definition per game item ID.
- Direct Attribute Store XRP price: **3 XRP per attribute**.
- Official Attribute NFT minting is not live yet; issuer, taxon, supply per item, and royalty are intentionally still unset.

The game now has two independent ownership paths: an existing You Are ATM NFT trait can unlock a mapped item, and a future official Attribute NFT can unlock the same item through its immutable `item_id` metadata field.

## Mapping table

| ATM Town item ID | Game asset | Slot | You Are ATM trait unlock | Official Attribute NFT |
|---|---|---|---|---|
| `body:astronaut` | Astronaut Body | body | **Needs collection trait match** | Planned · 3 XRP initial price |
| `body:black` | Black Body | body | **Needs collection trait match** | Planned · 3 XRP initial price |
| `body:cyber-blue` | Cyber Blue Body | body | **Needs collection trait match** | Planned · 3 XRP initial price |
| `body:cyber-orange` | Cyber Orange Body | body | **Needs collection trait match** | Planned · 3 XRP initial price |
| `body:cyber-pink` | Cyber Pink Body | body | **Needs collection trait match** | Planned · 3 XRP initial price |
| `body:cyber-purple` | Cyber Purple Body | body | **Needs collection trait match** | Planned · 3 XRP initial price |
| `body:gold` | Gold Body | body | **Needs collection trait match** | Planned · 3 XRP initial price |
| `body:green` | Green Body | body | **Needs collection trait match** | Planned · 3 XRP initial price |
| `body:navy-blue` | Navy Blue Body | body | **Needs collection trait match** | Planned · 3 XRP initial price |
| `body:red` | Red Body | body | ATM → Red | Planned · 3 XRP initial price |
| `backpack:blue-green` | Blue & Green Backpack | back | Back → Blue Green Backpack / Blue & Green Backpack | Planned · 3 XRP initial price |
| `backpack:blue-yellow` | Blue & Yellow Backpack | back | Back → Blue Yellow Backpack / Blue & Yellow Backpack | Planned · 3 XRP initial price |
| `backpack:bright-orange` | Bright Orange Backpack | back | Back → Bright Orange Backpack | Planned · 3 XRP initial price |
| `backpack:gold-purple` | Gold & Purple Backpack | back | Back → Gold Purple Backpack / Gold & Purple Backpack / Yellow Purple Backpack | Planned · 3 XRP initial price |
| `backpack:green` | Green Backpack | back | Back → Green Backpack | Planned · 3 XRP initial price |
| `backpack:pink-teal` | Pink & Teal Backpack | back | Back → Pink Teal Backpack / Pink & Teal Backpack | Planned · 3 XRP initial price |
| `backpack:rucksack` | Rucksack | back | Back → Rucksack | Planned · 3 XRP initial price |
| `backpack:teal` | Teal Backpack | back | Back → Teal Backpack | Planned · 3 XRP initial price |
| `backpack:yellow-pink` | Yellow & Pink Backpack | back | Back → Yellow Pink Backpack / Yellow & Pink Backpack | Planned · 3 XRP initial price |
| `head:baby-blue-headphones` | Baby Blue Headphones | head | Head → Baby Blue Headphones | Planned · 3 XRP initial price |
| `head:banana-headphones` | Banana Headphones | head | Head → Banana Headphones | Planned · 3 XRP initial price |
| `head:blue-mohawk` | Blue Mohawk | head | Head → Blue Mohawk / Teal Blue Mohawk | Planned · 3 XRP initial price |
| `head:bullish-black` | Bullish Black Horns | head | Head → Bullish Black / Bullish Black Horns / Black Horns | Planned · 3 XRP initial price |
| `head:buuvva-headphones` | Buuvva Headphones | head | Head → Buuvva Headphones | Planned · 3 XRP initial price |
| `head:green-headphones` | Green Headphones | head | Head → Green Headphones | Planned · 3 XRP initial price |
| `back:green-katana` | Green Katana | katana | Katana → Green / Green Katana | Planned · 3 XRP initial price |
| `head:orange-green-mohawk` | Orange Green Mohawk | head | Head → Orange Green Mohawk | Planned · 3 XRP initial price |
| `head:paper-hat` | Paper Hat | head | Head → Paper Hat | Planned · 3 XRP initial price |
| `head:pink-mohawk` | Pink Mohawk | head | Head → Pink Mohawk | Planned · 3 XRP initial price |
| `head:red-headphones` | Red Headphones | head | Head → Red Headphones | Planned · 3 XRP initial price |
| `back:white-katana` | White Katana | katana | Katana → White / White Katana | Planned · 3 XRP initial price |
| `back:yellow-katana` | Yellow Katana | katana | Katana → Yellow / Yellow Katana | Planned · 3 XRP initial price |
| `chest:baby-blue` | Baby Blue Chest | chest | Clothing → Baby Blue | Planned · 3 XRP initial price |
| `chest:blue` | Blue Chest | chest | **Needs collection trait match** | Planned · 3 XRP initial price |
| `chest:gold` | Gold Chest | chest | Clothing → Gold | Planned · 3 XRP initial price |
| `chest:green` | Green Chest | chest | **Needs collection trait match** | Planned · 3 XRP initial price |
| `chest:og` | OG Chest | chest | **Needs collection trait match** | Planned · 3 XRP initial price |
| `chest:pastel-blue` | Pastel Blue Chest | chest | **Needs collection trait match** | Planned · 3 XRP initial price |
| `chest:pastel-red` | Pastel Red Chest | chest | **Needs collection trait match** | Planned · 3 XRP initial price |
| `chest:red` | Red Chest | chest | **Needs collection trait match** | Planned · 3 XRP initial price |
| `chest:yellow` | Yellow Chest | chest | **Needs collection trait match** | Planned · 3 XRP initial price |
| `face:black-dead-face` | Black Dead Face | face | Face → Dead Emote Black / Black Dead Face | Planned · 3 XRP initial price |
| `face:gold` | Gold Face | face | Face → Gold / Gold Face | Planned · 3 XRP initial price |
| `face:og` | OG Face | face | **Needs collection trait match** | Planned · 3 XRP initial price |
| `face:squint-face-black` | Black Squint Face | face | Face → Squint Emote Black / Black Squint Face | Planned · 3 XRP initial price |
| `face:squint-face-white` | White Squint Face | face | Face → Squint Emote White / White Squint Face | Planned · 3 XRP initial price |
| `face:white-dead-face` | White Dead Face | face | Face → Dead Emote White / White Dead Face | Planned · 3 XRP initial price |
| `gloves:baby-blue` | Baby Blue Gloves | hands | **Needs collection trait match** | Planned · 3 XRP initial price |
| `gloves:blue` | Blue Gloves | hands | **Needs collection trait match** | Planned · 3 XRP initial price |
| `gloves:boxing-gloves` | Boxing Gloves | hands | Hand → Boxing Gloves | Planned · 3 XRP initial price |
| `gloves:green` | Green Gloves | hands | **Needs collection trait match** | Planned · 3 XRP initial price |
| `gloves:orange` | Orange Gloves | hands | **Needs collection trait match** | Planned · 3 XRP initial price |
| `gloves:purple` | Purple Gloves | hands | **Needs collection trait match** | Planned · 3 XRP initial price |
| `gloves:tan` | Tan Gloves | hands | **Needs collection trait match** | Planned · 3 XRP initial price |
| `gloves:yellow` | Yellow Gloves | hands | **Needs collection trait match** | Planned · 3 XRP initial price |
| `shoes:baby-blue` | Baby Blue Shoes | feet | **Needs collection trait match** | Planned · 3 XRP initial price |
| `shoes:gold` | Gold Shoes | feet | **Needs collection trait match** | Planned · 3 XRP initial price |
| `shoes:green` | Green Shoes | feet | **Needs collection trait match** | Planned · 3 XRP initial price |
| `shoes:red` | Red Shoes | feet | **Needs collection trait match** | Planned · 3 XRP initial price |
| `shoes:tan` | Tan Shoes | feet | **Needs collection trait match** | Planned · 3 XRP initial price |
| `equipment:jetpack` | Jetpack Module | back | Back → Jetpack / Jet Pack | Planned · 3 XRP initial price |

## Metadata contract for official Attribute NFTs

Each minted Attribute NFT should resolve to JSON containing at minimum:

```json
{
  "name": "ATM Town Attribute — Blue Mohawk",
  "description": "Transferable ATM Town character attribute.",
  "item_id": "head:blue-mohawk",
  "slot": "head",
  "game": "ATM Town",
  "image": "ipfs://..."
}
```

ATM Town trusts the collection issuer + taxon and then matches `item_id` exactly. Selling or transferring the NFT therefore transfers the in-game entitlement after the wallet's XRPL inventory refreshes.

## Before Mainnet minting

We still need to finalize four collection-level choices: the minting issuer wallet, a dedicated taxon, supply for each attribute, and the royalty/transfer fee. These values are left blank in the manifest on purpose so we do not accidentally mint the wrong supply or bind the collection to the wrong issuer.
