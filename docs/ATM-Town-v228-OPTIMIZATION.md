# ATM Town v228 — Asset Architecture Optimization

- Preserves v227 gameplay and the current Xaman vending callback architecture.
- Moves map assets out of repository root into `assets/maps/<map>/`.
- Keeps collision, stairs, interaction and depth masks as PNG.
- Converts eligible character, foreground and lounge visual PNG assets to lossless WebP when smaller.
- Extracts embedded base64 images from `index.html` into cacheable asset files.
- Moves audio into `assets/audio/`.
- Removes confirmed unused legacy duplicate deployment assets.
- Updates runtime config, validation and asset-audit tooling for the new layout.

## Measured result

- Reconstructed v227 repository payload: **90.94 MB**
- v228 optimized repository payload: **52.73 MB**
- Reduction: **38.21 MB (42.0%)**
- `index.html`: reduced from roughly **12.4 MB** to roughly **0.55 MB** by externalizing 39 embedded image references into cacheable assets (36 unique files).
- 14 gameplay-data masks were moved only; their bytes were not changed.

Four legacy inline-derived PNG visuals have malformed source streams and are intentionally preserved byte-for-byte until clean originals are supplied; see `docs/ASSET-AUDIT.md`.
