# ATM Town Incremental Refactor Roadmap

## v158 — Project Cleanup Foundation — Complete

- Added `js/`, `docs/`, `scripts/`, and asset migration staging.
- Extracted build configuration, map metadata, map helpers, safe storage, and Supabase library bootstrap.
- Added repeatable build validation and asset auditing.

## v159 — Shared Interaction Foundation — Complete

- Extracted interaction color definitions and shared pixel-color classification.
- Added a common cached mask reader and interaction result helpers.
- Migrated Town, ATM HQ, and Community Lounge detection to the shared system.
- Preserved map-specific actions and temporary load-time fallbacks.

## v160 — Map Runtime Registry — Complete

- Moved map zoom settings, entry direction, entrance IDs, exit targets, and return behavior into the registry.
- Replaced duplicated map-selection condition chains for entry dispatch and camera/world sizing.
- Added a reusable runtime and enter/exit interface that future minigames can use.

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
