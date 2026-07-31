# ATM Town Architecture

## Current baseline

ATM Town is an HTML5 Canvas browser game with a large legacy runtime in `index.html`. The v158 cleanup does not rewrite that runtime. It establishes external modules around it so systems can be extracted in controlled versions.

## Runtime load order

1. `js/config.js`
   - Build/version identity
   - Tile size
   - Map metadata
   - Map asset paths
   - Supabase CDN fallbacks
2. `js/maps.js`
   - Validated map lookup helpers
   - Asset lookup
   - World size, pixel size, spawn, and label accessors
3. `js/bootstrap.js`
   - Safe local-storage wrappers
   - Safe JSON parsing
   - Non-blocking Supabase library loading
   - Global boot-error display
   - Build identity initialization
4. Inline runtime in `index.html`
   - Existing gameplay engine
   - Character data and sprites
   - Rendering and depth sorting
   - Movement, collision, jumping, and jetpack
   - Map-specific render/mask builders
   - Interaction handling
   - Supabase multiplayer
   - LiveKit voice
   - Identity/Xaman flow
   - UI and game loop

## Existing major systems inside `index.html`

- Audio and power-up controls
- Canvas sizing, camera, touch, keyboard, and pointer controls
- Player state and animation
- Character selection and embedded sprite data
- Town day/night rendering
- Town foreground depth pieces
- Collision and stair masks
- Town interaction zones
- ATM HQ map, collision, depth, and interaction behavior
- NFT Gallery map, collision, and depth behavior
- Arcade map, collision, and depth behavior
- Community Lounge map, collision, depth, and interaction mask behavior
- Supabase real-time player synchronization
- LiveKit proximity voice
- Chat and remote-player interpolation
- Login, passkey, and Xaman wallet linking
- Main animation/update loop

## Refactor rule

Only one dependency group should be extracted per version. The game must remain deployable after every extraction. No system is removed merely because it appears unused; usage must be verified first.

## Next recommended extraction

`interactions.js` should be the next major gameplay module because the lounge now uses an authored interaction mask and all future maps/minigames need a common interaction contract.
