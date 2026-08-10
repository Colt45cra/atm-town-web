# ATM Town World Streaming / Chunk Engine

## Phase 1 baseline

ATM Town v230 converts the existing authored outdoor town from full-map runtime loading to a streamed large-image chunk architecture without moving or redesigning the town.

The uploaded source build was inspected before conversion. The active optimized outdoor source layers are:

- `assets/maps/town/visual.webp` — 3120 × 4320
- `assets/maps/town/night.webp` — 3120 × 4320
- `assets/maps/town/lighting.webp` — 3120 × 4320
- `assets/maps/town/masks/collision.png` — 3120 × 4320
- `assets/maps/town/masks/interaction.png` — 3120 × 4320
- `assets/maps/town/masks/stairs.png` — 3120 × 4320
- `assets/maps/town/foreground/day/*` and `night/*` — individually positioned depth-sorted scenery

Those full-size source files remain in the repository as the authored source for future re-tiling, but the outdoor runtime no longer loads the full terrain/night/mask images.

## Chunk grid

Phase 1 uses **1024 × 1024 pixel logical chunks**.

The existing 3120 × 4320 town occupies:

- 4 chunk columns
- 5 chunk rows
- 20 logical chunk cells

Edge cells retain their exact authored dimensions. The final east column is 48 pixels wide, and the final south row is 224 pixels high. No layer is resized to make it fit the grid.

All layers use the same world-coordinate grid and the same chunk key. For example, cell `2_3` means exactly the same world rectangle for terrain, collision, interaction, stairs, night, and lighting.

## Runtime world files

```text
assets/world/
  manifest.json
  tiler-report.json
  terrain/       # lossless WebP visual chunks
  night/         # lossless WebP visual chunks
  lighting/      # lossless WebP visual chunks; fully transparent chunks may be omitted
  collision/     # lossless PNG gameplay-data chunks
  interaction/   # lossless PNG gameplay-data chunks; exactly empty chunks may be omitted
  stairs/        # lossless PNG gameplay-data chunks; exactly empty chunks may be omitted
  overview/
    day.webp      # lightweight 780 × 1080 minimap/directory/startup fallback
    night.webp
```

Gameplay-data masks are never written as lossy WebP. The tiler decodes every generated chunk and pixel-compares it to the matching source crop before reporting success.

## World manifest

`assets/world/manifest.json` is the runtime source of truth for the streamed outdoor world. It currently defines:

- chunk size
- pixel/world coordinate convention
- negative-coordinate support
- current world bounds
- current spawn
- preload/cache settings
- overview map paths
- exact logical cell rectangles
- available and safely omitted chunks for each layer
- starter region metadata

The region structure intentionally includes an extensible `metadata` object. Future versions can add region-level music, weather, ambient effects, NPC groups, fishing tables, quests, project events, or other systems without changing the chunk-coordinate model.

## Negative world coordinates

Chunk conversion uses mathematical floor division:

```text
chunkX = floor(worldX / chunkSize)
chunkY = floor(worldY / chunkSize)
```

That means future chunks can use names such as:

```text
-1_0
-2_0
0_-1
0_-2
```

The existing ATM Town remains at its current authored coordinates. Future source exports can specify a negative top-left world origin through the Map Tiler instead of shifting the town's building/NPC/saved-position coordinates.

## Visual streaming

`js/world-streaming.js` owns streamed outdoor data.

For visual layers it:

1. Computes the camera's world rectangle.
2. Expands that rectangle by the manifest preload margin.
3. Requests only intersecting terrain/lighting chunks.
4. Preloads night chunks only while night is active or within one minute of a night transition.
5. Keeps recently used chunks for a grace period.
6. Releases older distant decoded images when they exceed the cache policy.
7. Handles missing visual files without crashing the game.

The camera—not a fixed 3 × 3 assumption—determines how many visual chunks are needed. This is important at ATM Town's low zoom settings, where an iPad/tablet viewport can span more than three chunks.

A lightweight overview image stays underneath streamed terrain. If a requested visual chunk has not decoded yet, the player sees the low-resolution world overview instead of a transparent/blank chunk boundary. Once the lossless chunk is ready, it replaces that area at exact world coordinates.

## Gameplay-mask streaming

Collision, stair, and interaction data are streamed separately from visual art.

### Collision and stairs

The v228 game did not actually test every full-resolution collision pixel. It downsampled the 3120 × 4320 masks to 520 × 720 using nearest-neighbor behavior, equivalent to sampling the authored source on a six-pixel grid with an offset of three pixels.

v230 preserves that existing movement behavior. The source chunks remain full-resolution lossless PNG, while runtime collision/stair queries use the manifest-configured legacy sample step/offset.

After a mask chunk loads, collision and stair pixels are compressed into one-bit runtime arrays. A 1024 × 1024 decoded RGBA surface is therefore temporary; the retained collision representation is about 128 KiB for a full 1024 × 1024 chunk rather than several MiB of RGBA pixels.

### Interaction

Interaction chunks remain exact-color PNG. After decoding, the existing `ATMInteractions.classifyColor()` contract converts each pixel to the existing compact interaction type ID. Only the player's nearby interaction chunks are retained.

### Pending collision safety

A collision chunk that is required but has not finished decoding is treated as blocked. This prevents the player from outrunning mask streaming into an unvalidated area.

### Bots/NPCs

Town bots continue moving when off-camera. To preserve that behavior, collision/stair chunks are also retained for chunks occupied by active bots. Interaction data still follows only the local player. Bot route areas are preloaded once before bot path initialization so safe-route correction does not operate against unavailable masks.

## Foreground/depth architecture

The existing authored foreground system was intentionally **not flattened into terrain chunks**.

Each existing foreground piece keeps its original:

- source image
- x/y world position
- width/height
- authored depth value
- day/night pairing

This preserves the existing render ordering among:

- local player
- remote multiplayer characters
- bots/NPCs
- foreground buildings/objects

The memory change is that foreground images are now lazy-loaded around the camera and released after a grace period when distant. Night foreground counterparts are loaded only when needed for the day/night transition.

## Minimap and directory

The minimap and ATM Town directory use `assets/world/overview/day.webp` and `night.webp`, not the streamed high-resolution terrain.

World-to-overview mapping uses manifest bounds:

```text
overviewX = (worldX - minX) / worldWidth
overviewY = (worldY - minY) / worldHeight
```

This is already compatible with future negative world bounds.

## Systems intentionally left intact

The Phase 1 change is limited to outdoor-world architecture. Existing systems remain in the same game runtime, including:

- Supabase account/player persistence
- multiplayer and remote-player rendering
- LiveKit proximity voice
- Xaman/XRPL flows and vending payments
- character selection and equipment
- jetpack and power-ups
- arcade/interiors
- day/night timing
- current interaction metadata/actions
- World Alive effects
- saved location behavior
- safe-spawn validation

Interior maps continue to use their existing non-streamed canvases and PNG masks.

## Runtime diagnostics

From the browser console:

```js
// Current cache/failure snapshot
townWorldStream.getStats()
```

The result reports manifest readiness, chunk size, visual/mask cache entry counts, and any chunk asset URLs that failed to decode.
