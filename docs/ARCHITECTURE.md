# ATM Town Architecture

## Current baseline

ATM Town is an HTML5 Canvas browser game with a large legacy runtime in `index.html`. Cleanup versions place stable boundaries around that runtime so one dependency group can be extracted at a time without rewriting the game.

## Runtime load order

1. `js/config.js`
   - Build/version identity
   - Tile size
   - Map metadata and asset paths
   - Supabase CDN fallbacks
2. `js/maps.js`
   - Validated map lookup helpers
   - Asset, world size, pixel size, spawn, and label accessors
   - Runtime entry zoom/direction, entrance lookup, exit targets, and Town return rules
3. `js/interactions.js`
   - Standard color-to-interaction contract
   - Cached authored-mask reader
   - Pixel classification and nearby searches
   - Shared rectangle/zone geometry helpers
   - Shared interaction prompts
4. `js/bootstrap.js`
   - Safe local-storage wrappers
   - Safe JSON parsing
   - Non-blocking Supabase library loading
   - Global boot-error display
   - Build identity initialization
5. Inline runtime in `index.html`
   - Existing gameplay engine
   - Character data and sprites
   - Rendering and depth sorting
   - Movement, collision, jumping, and jetpack
   - Map render/mask builders
   - Map-specific interaction result descriptions and actions
   - Supabase multiplayer, LiveKit voice, identity/Xaman flow, UI, and game loop

## Shared interaction contract

Authored masks are scaled to the matching map canvas with nearest-neighbor rendering and converted once into cached numeric type arrays. Runtime checks read the cached array rather than repeatedly reading canvas pixels.

```text
Blue    entry / exit
Red     vending
Yellow  miscellaneous
Purple  HTML window
Cyan    ATM terminal
Green   voice chat
```

Town, ATM HQ, and Community Lounge use this shared reader. Gallery and Arcade currently use registry-based doorway exit fallbacks because they do not yet have authored interaction masks.

The interaction module detects a type. Map-specific metadata still supplies the location name, description, destination, or feature action. This separation prevents duplicated color-reading code while preserving current gameplay.

## Existing major systems inside `index.html`

- Audio and power-up controls
- Canvas sizing, camera, touch, keyboard, and pointer controls
- Player state and animation
- Character selection and embedded sprite data
- Town day/night rendering and foreground depth pieces
- Collision and stair masks
- Per-map interaction result metadata and dispatch
- ATM HQ, NFT Gallery, Arcade, and Community Lounge rendering/depth behavior
- Supabase real-time player synchronization
- LiveKit proximity voice
- Chat and remote-player interpolation
- Login, passkey, and Xaman wallet linking
- Main animation/update loop

## Refactor rule

Only one dependency group should be extracted per version. The game must remain deployable after every extraction. No system is removed merely because it appears unused; usage must be verified first.

## Map runtime contract

Each registered map now defines its entry spawn, entry direction, entry zoom, Town entrance ID, exit target, and Town return rule. The inline engine asks `ATMMaps.runtime()` for these settings rather than maintaining parallel constants and condition chains. Town keeps a user-saved zoom; interior maps use authored defaults.

## Next recommended extraction

v161 should move one interior map's runtime assets into `assets/maps/<map>/` by changing registry paths only.
