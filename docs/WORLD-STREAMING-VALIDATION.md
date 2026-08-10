# ATM Town v230 World Streaming Validation

## Source inspected

This Phase 1 conversion was produced from the uploaded ATM Town v228 optimized build supplied for this task. No older ATM Town build was used as the implementation source.

## Confirmed source dimensions

All active outdoor aligned layers were programmatically inspected at **3120 × 4320 pixels**:

- day terrain
- night terrain
- lighting
- collision
- interaction
- stairs

## Chunk result

- chunk size: **1024 × 1024 logical pixels**
- grid: **4 columns × 5 rows**
- logical cells: **20**
- generated chunk files pixel-verified against source: **94**

Layer counts:

| Layer | Format | Written | Safely omitted |
| --- | --- | ---: | ---: |
| Terrain | lossless WebP | 20 | 0 |
| Night terrain | lossless WebP | 20 | 0 |
| Collision | PNG | 20 | 0 |
| Interaction | PNG | 11 | 9 exact-zero cells |
| Stairs | PNG | 12 | 8 exact-zero cells |
| Lighting | lossless WebP | 11 | 9 fully transparent cells |

Overview files are 780 × 1080 WebP and are used only for minimap/directory/startup fallback rendering.

## Pixel/data validation

`scripts/tile-world.py` verifies every generated chunk immediately after writing it by decoding the file and comparing the pixels with the exact source crop.

`scripts/validate-world.py` independently rechecks:

- all source SHA-256 hashes from the tiler report
- source dimensions
- logical cell dimensions
- manifest coverage
- generated file presence
- exact decoded chunk dimensions
- decoded pixel equality against source crops
- that omitted mask cells are still exactly zero/black
- that omitted lighting cells are still fully transparent
- that collision/interaction/stair outputs use PNG
- overview dimensions
- legacy 520 × 720 nearest-neighbor collision/stair sampling equivalence to the v230 six-pixel/+3 runtime sampler

Latest packaged validation result: **PASS — 94 generated chunks re-verified.**

## Loading/memory strategy

- Terrain and lighting visual chunks follow the camera rectangle plus a 384-pixel preload margin.
- Night chunks are loaded only during night/fade periods or within one minute of an upcoming night transition.
- Visual chunks use a per-layer soft cache limit of 18 and a 15-second grace period before distant entries are released.
- Collision/stair/interaction data use a one-chunk neighborhood radius around the local player.
- Collision/stair data also keep chunks occupied by active off-camera bots.
- Collision/stair chunks are compressed to one-bit arrays after temporary image decoding.
- Interaction chunks are converted to one-byte interaction IDs using the existing ATM interaction palette.
- Missing/pending required collision data is treated as blocked.
- Foreground depth objects remain individually positioned and depth-sorted, but their images now lazy-load near the camera.
- Minimap/directory never render the full high-resolution streamed world.

## Existing coordinate preservation

The current town remains at world bounds `(0, 0)` through `(3120, 4320)`. Existing building positions, bot routes, entrances, vending locations, collectibles, and saved town coordinates remain in the same coordinate space.

The manifest/runtime use `floor(worldCoordinate / chunkSize)`, allowing future negative chunk coordinates without shifting the current town.

## Static/runtime validation

The build validation checks:

- required files
- script load order
- v230 build markers
- map registry behavior
- current gameplay markers
- direct local asset references
- day/night foreground pairing
- world-manifest chunk references
- no gameplay-data masks registered as WebP
- no loose runtime media regression in repository root
- duplicate HTML IDs
- JavaScript syntax for all inline game script blocks and external runtime/API JavaScript

The independent world validator is also run as part of the release validation procedure.

## Browser and end-to-end testing limitations

The project and all 97 world-manifest/static chunk URLs were served through a local HTTP server and returned successfully. A headless Chromium launch was also attempted, but the container's Chromium process did not complete a page load in this environment, so **no browser-rendering pass is claimed** for this release.

Physical iOS/iPadOS Safari, real Supabase multiplayer sessions, LiveKit multi-user voice, Xaman signing/payment callbacks, and Vercel production deployment cannot be fully exercised from this build container. Those items are therefore preserved by targeted code changes plus static/reference/syntax validation, but they still require normal device/staging regression testing after deployment.
