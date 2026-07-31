# ATM Town Changelog

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

- Connected `lounge-interaction.png` to the Community Lounge interaction system.
