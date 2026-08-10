# ATM Town Map Expansion Workflow

## Purpose

The ATM Map Tiler removes the need to manually crop dozens or hundreds of world images in Photoshop. You export aligned source layers; the tool validates and slices them on the exact global chunk grid.

Tool:

```text
scripts/tile-world.py
```

Python dependency:

```text
requirements-map-tiler.txt
```

## Source-layer rule

Every source layer in one tiling run must have **exactly the same pixel dimensions and top-left alignment**.

Use one common canvas for:

- visual terrain/day artwork
- night artwork
- collision mask
- interaction mask
- stair mask
- lighting/illumination layer

Do not separately resize, crop, or offset any gameplay mask.

### Format policy

Source/output rules:

- visual terrain/night/lighting → WebP runtime chunks
- collision → PNG
- interaction → PNG
- stairs → PNG
- any future exact-color/pixel gameplay-data layer → PNG unless separately proven safe

The current tiler writes terrain/night/lighting chunks as **lossless WebP**, so re-chunking does not add another generation of visual loss.

## Rebuild the current Phase 1 town

From the repository root:

```bash
python3 -m pip install -r requirements-map-tiler.txt
npm run tile:world
npm run validate:world
npm run validate
npm run audit:assets
```

Default source paths are the current organized ATM Town files:

```text
assets/maps/town/visual.webp
assets/maps/town/night.webp
assets/maps/town/lighting.webp
assets/maps/town/masks/collision.png
assets/maps/town/masks/interaction.png
assets/maps/town/masks/stairs.png
```

The default output is `assets/world/`.

## Expanding east and/or south while preserving town coordinates

If the enlarged source canvas still begins at current world coordinate `(0, 0)`, export every aligned layer at the new full dimensions and replace the corresponding authored source files above.

Then run:

```bash
npm run tile:world
npm run validate:world
```

The existing town stays at the same x/y coordinates because its top-left world origin did not change.

## Expanding west and/or north with negative coordinates

A source image cannot have negative image pixels, so the Map Tiler lets the **source canvas top-left** represent a negative world coordinate.

Example: you add 2048 pixels west and 1024 pixels north of the current town. In the new source canvas, the old ATM Town artwork is placed 2048 pixels from the left and 1024 pixels from the top. Its game/world coordinates are still unchanged.

Run:

```bash
python3 scripts/tile-world.py \
  --origin-x -2048 \
  --origin-y -1024
```

The generated manifest will use negative chunk names where appropriate, such as `-2_-1.webp`, while current building/NPC/saved coordinates remain based on the same ATM Town world origin.

## Using alternate export filenames

You do not have to rename a new export before tiling. Pass explicit files:

```bash
python3 scripts/tile-world.py \
  --terrain exports/world-day.webp \
  --night exports/world-night.webp \
  --lighting exports/world-lighting.webp \
  --collision exports/world-collision.png \
  --interaction exports/world-interaction.png \
  --stairs exports/world-stairs.png \
  --origin-x 0 \
  --origin-y 0
```

The tool stops before deployment output is accepted if source dimensions disagree.

## What the tiler validates automatically

For each run it:

1. Confirms every required source exists.
2. Confirms every layer has identical dimensions.
3. Computes global chunk coordinates from the supplied world origin.
4. Uses one shared chunk rectangle for every layer.
5. Writes visual chunks as WebP.
6. Writes gameplay masks as lossless PNG.
7. Skips only chunks proven exactly empty where that is safe:
   - black/zero interaction masks
   - black/zero stair masks
   - black/zero collision masks
   - fully transparent lighting chunks
8. Decodes every generated chunk and pixel-compares it to its exact source crop.
9. Writes `assets/world/manifest.json`.
10. Writes `assets/world/tiler-report.json` with counts and source SHA-256 hashes.
11. Generates lightweight day/night overview images for the minimap/directory.

Run `npm run validate:world` after tiling. That validator independently reopens the generated chunks and rechecks dimensions, source hashes, pixel equality, empty-chunk claims, mask formats, manifest coverage, and overview sizes.

## Safe deployment rule

Do not deploy a newly expanded world if either command fails:

```bash
npm run validate:world
npm run validate
```

A mask mismatch is a deployment blocker, not a warning.

## Region metadata

`assets/world/manifest.json` contains a `regions` array. Phase 1 only defines the current ATM Town core and leaves `metadata` empty.

Future versions can add fields to region metadata for systems such as:

```text
music
weather
ambient effects
NPC groups
fishing tables
quests
project events
reward/event identifiers
```

Those systems should reference normal world coordinates and region IDs. They should not depend on canvas pixel offsets or a fixed total world size.

## Tablet/iPad + GitHub Codespaces update workflow

For updating the existing GitHub repository, use the **changed-files ZIP** delivered with v230. It contains every added/modified file plus `DELETED-FILES.txt` for obsolete root duplicates.

### 1. Upload the ZIP in Codespaces

In the Codespaces file explorer, upload:

```text
ATM-Town-v230-World-Streaming-CHANGED-FILES.zip
```

to the repository root (the same folder containing `index.html` and `package.json`).

### 2. Apply it from the Codespaces terminal

```bash
cd /workspaces/$(basename "$PWD") 2>/dev/null || true
unzip -o ATM-Town-v230-World-Streaming-CHANGED-FILES.zip
while IFS= read -r file; do
  [ -n "$file" ] && rm -f -- "$file"
done < DELETED-FILES.txt
rm -f DELETED-FILES.txt ATM-Town-v230-World-Streaming-CHANGED-FILES.zip
```

If your terminal was already at the repository root, the first command is harmless. Before continuing, verify that you can see `index.html` with:

```bash
pwd
ls index.html package.json assets/world/manifest.json
```

### 3. Install the tiler dependency and validate

```bash
python3 -m pip install -r requirements-map-tiler.txt
npm install
npm run validate:world
npm run validate
npm run audit:assets
```

### 4. Review exactly what Git will change

```bash
git status --short
git diff --stat
git diff -- index.html js/config.js js/world-streaming.js
```

The many new files under `assets/world/` are expected. The root-level legacy image/audio deletions listed in `docs/LEGACY-ROOT-ASSET-REMOVALS.txt` are also expected.

### 5. Commit and push

```bash
git add -A
git commit -m "Add ATM Town world streaming chunk engine"
git push
```

Vercel can deploy the same repository structure directly; no custom build step is required for the static chunk files.

## Full-build ZIP

The full v230 ZIP is intended for a fresh copy/backup of the project. For an existing GitHub repository, the changed-files ZIP is safer because it explicitly applies both additions/modifications and the legacy-file deletions.
