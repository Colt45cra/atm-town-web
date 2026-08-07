# ATM Town Runtime Assets

ATM Town v228 uses a structured, cache-friendly asset layout.

```text
assets/
  audio/
  characters/
    playable/
    body/
    chest/
    face/
    gloves/
    head/
    back/
    backpack/
    shoes/
    thumbnails/
    legacy/
    equipment/
  environment/
  items/
  maps/
    town/
    hq/
    gallery/
    arcade/
    lounge/
  ui/
```

## Format rule

- Runtime visual artwork uses WebP when WebP is smaller and safe. Character/sprite conversions are lossless WebP.
- Collision, interaction, stair, depth and other pixel/color-sensitive masks remain PNG.
- Do not convert a gameplay mask to lossy WebP.
- New PNG artwork should be reviewed and converted to WebP before being committed when appropriate.
