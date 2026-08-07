# ATM Town Changelog

## v160 — Map Runtime Registry

### Map runtime architecture

- Moved interior entry zoom, spawn direction, entrance IDs, exit targets, and Town return rules into `js/config.js`.
- Added registry helpers for runtime settings, interior detection, entrance lookup, exit targets, and Town return points.
- Replaced repeated map-selection chains for camera bounds and map dimensions with `ATMMaps.pixelSize()`.
- Replaced four hardcoded Town-building entry branches with one registry lookup.
- Replaced repeated interior exit coordinates with one shared exit helper based on each map's registered spawn.

### Requested entry zooms

- NFT Art Gallery enters at 60%.
- ATM Token Arcade enters at 60%.
- ATM HQ enters at 60%.
- Community Lounge enters at 70%.
- Town continues to restore the player's saved Town zoom.

### Compatibility

- Preserved all existing spawn coordinates, map labels, collision/depth systems, multiplayer map IDs, and return locations.
- Preserved the Arcade's special Town return Y position of 700 through registry metadata.
- Kept Gallery and Arcade doorway exit fallbacks until authored interaction masks are added.

## v159 — Shared Interaction Foundation

### Interaction architecture

- Added `js/interactions.js` as the shared interaction-mask module.
- Centralized the standard interaction colors:
  - Blue: entry/exit
  - Red: vending
  - Yellow: miscellaneous
  - Purple: HTML display
  - Cyan: ATM terminal
  - Green: voice chat
- Standardized the Lounge mask so games and the jukebox use the shared yellow miscellaneous color instead of map-only colors.
- Added one cached mask reader, color classifier, nearby-pixel search, zone geometry helper set, and prompt generator.

### Map migrations

- Town now loads `assets/maps/town/masks/interaction.png` at runtime and uses it for entry, vending, and miscellaneous interaction detection.
- ATM HQ now loads `assets/maps/hq/masks/interaction.png` at runtime and uses it for HTML, ATM, miscellaneous, and green voice-chat areas.
- Community Lounge now uses the same shared reader instead of maintaining a duplicate classifier and pixel-search implementation.
- Cleaned `assets/maps/lounge/masks/interaction.png` to four exact colors: black, purple, yellow, and green.
- Legacy coordinate checks remain only as temporary loading fallbacks when an authored mask is not ready.
- Vending interactions now dispatch through the same action behavior from any map.

### Validation

- Added the shared module and Town/HQ interaction masks to required-file validation.
- Added checks for script order, all three shared mask readers, and removal of the Lounge's duplicate mask implementation.
- Kept exact-color interaction masks as PNG files.

## v158 — Project Cleanup Foundation

### Structure

- Added `js/config.js` for build identity, tile size, map metadata, asset paths, and Supabase CDN sources.
- Added `js/maps.js` as the validated map registry interface.
- Added `js/bootstrap.js` for startup helpers previously embedded in `index.html`.
- Added `docs/`, `scripts/`, and `assets/` migration documentation.

### Runtime integration

- Updated Town, HQ, Gallery, Arcade, and Lounge base/collision/depth/interaction asset loading to use the shared map registry.
- Updated map dimensions, entry spawns, map labels, and build labels to use shared configuration.
- Preserved the existing inline gameplay engine and all current behavior.

### Developer tooling

- Added `npm run validate` for required-file, script-order, version-marker, and JavaScript syntax checks.
- Added `npm run audit:assets` to inventory PNG masks and transparent WebP conversion candidates.

### Assets

- No runtime asset was moved, deleted, or converted in this version.
- Exact-color masks remain PNG.

## v157 — Town Night Depth Fix

- Corrected nighttime foreground depth asset lookup and preserved daytime foreground fallback during loading.

## v156 — Community Lounge Interaction Mask

- Connected `assets/maps/lounge/masks/interaction.png` to the Community Lounge interaction system.
