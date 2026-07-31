# ATM Town Incremental Refactor Roadmap

## v158 — Project Cleanup Foundation

- Add `js/`, `docs/`, `scripts/`, and asset migration staging.
- Extract build configuration, map metadata, map helpers, safe storage, and Supabase library bootstrap.
- Add repeatable build validation and asset auditing.
- Preserve all gameplay and root asset URLs.

## v159 — Shared Interaction Foundation

- Extract interaction color definitions and shared pixel-color classification.
- Create a common interaction result shape.
- Keep existing map-specific actions while routing detection through shared helpers.

## v160 — Map Registry Integration

- Move remaining map labels, spawn settings, zoom settings, return points, and mask metadata into the registry.
- Remove duplicated map-selection condition chains where behavior is identical.

## v161 — Asset Path Migration: Interiors

- Move one interior map at a time into `assets/maps/<map>/`.
- Update only registry paths.
- Validate collision, depth, and interaction alignment after each move.

## v162 — Transparent WebP Pass 1

- Convert approved non-mask interior artwork to transparent WebP.
- Keep source PNGs during verification, then remove only confirmed unused copies.
- Do not convert collision, depth, stair, blocked, or interaction masks.

## v163 — Render and Depth Module

- Extract shared depth-piece construction and rendering helpers.
- Preserve day/night crossfades and per-map foreground behavior.

## v164 — Player/Input Boundary

- Isolate movement/input state from rendering.
- Preserve mobile joystick, desktop keyboard, tap-to-move, jumping, and jetpack.

## Minigame readiness gate

Before the first minigame is added:

- Shared interaction detection is active.
- Maps are registered through one metadata system.
- Render/depth behavior has a stable interface.
- A minigame can enter and exit without adding map-specific logic to the core game loop.
