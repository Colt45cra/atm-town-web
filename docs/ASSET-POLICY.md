# ATM Town Asset Policy

## Runtime visual artwork
Use WebP for map artwork, foreground scenery, character sheets, equipment, thumbnails, UI artwork, collectible art and decorative environment art when it reduces file size. Pixel-art/sprite assets should use **lossless WebP** so crisp edges and alpha are preserved.

## Gameplay-data images
Keep these as PNG because the game reads their exact pixels/colors:

- collision / blocked masks
- interaction masks
- stair masks
- depth / occlusion masks
- any future image used as data rather than displayed as artwork

Do not use lossy compression on gameplay-data masks.

## Folder rules
- `assets/maps/<map>/` — map visuals and map-local data
- `assets/maps/<map>/masks/` — exact PNG gameplay masks
- `assets/maps/town/foreground/day|night/` — depth-sorted visual foreground WebP files
- `assets/characters/` — playable bodies, equipment layers and thumbnails
- `assets/ui/` — landing and interface art
- `assets/audio/` — music and sound effects
- `assets/items/` — coins and future collectible/item art
- `assets/environment/` — reusable environmental art

## New asset workflow
1. Identify whether the supplied image is **visual artwork** or **gameplay data**.
2. Visual PNG: test lossless WebP first. Use WebP when it is smaller without changing the intended appearance.
3. Gameplay-data PNG: keep PNG unless a separately validated lossless format is explicitly approved.
4. Put the file in the correct asset folder; do not add new loose runtime images to repository root.
5. Update runtime references and run `npm run validate` and `npm run audit:assets`.
