# Asset Migration Staging

ATM Town currently leaves live runtime assets in the repository root so existing URLs remain backward compatible.

The map registry in `js/config.js` allows assets to be moved safely in later versions into folders such as:

```text
assets/
  maps/
    town/
    hq/
    gallery/
    arcade/
    lounge/
  characters/
  ui/
  audio/
  effects/
```

Assets will be moved map-by-map. Each move must update registry paths, validate every path, and be visually tested before the next group is migrated.

Collision, depth, stair, blocked, and interaction masks remain PNG files because exact pixel values drive gameplay systems. Normal transparent artwork can be reviewed for WebP conversion using `npm run audit:assets`.
