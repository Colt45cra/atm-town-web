# Asset Migration Staging

ATM Town v158 intentionally leaves live runtime assets in the repository root so existing URLs remain backward compatible.

The map registry in `js/config.js` is the first step toward moving assets safely into folders such as:

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

Assets will be moved map-by-map in later versions. Each move must update the registry, validate every path, and be tested before the next group is migrated.

Collision, depth, stair, blocked, and interaction masks remain PNG files because their exact pixel values drive gameplay systems. Normal transparent artwork can be reviewed for WebP conversion using `npm run audit:assets`.
