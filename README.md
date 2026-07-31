# ATM Town

ATM Town is a lightweight browser-based multiplayer social game built with HTML5 Canvas, JavaScript, Supabase Realtime, LiveKit voice, and XRPL/Xaman account features.

## Current version

**v158 — Project Cleanup Foundation**

This version begins the incremental move away from a monolithic `index.html` without rewriting the game or changing existing gameplay.

## Project structure

```text
index.html              Existing game runtime and UI
api/                    Vercel serverless endpoints
js/config.js            Build and map configuration
js/maps.js              Map registry helpers
js/bootstrap.js         Startup, storage, and Supabase loader helpers
scripts/                 Repeatable validation and asset-audit tools
docs/                    Architecture, roadmap, changelog, and test checklist
assets/README.md         Safe staged asset-migration policy
```

Live map and gameplay assets remain at the repository root in v158 for backward compatibility. They will be moved incrementally through the map registry.

## Local development

Serve the repository through a local web server rather than opening `index.html` directly, because browser security rules can differ for local files.

Example:

```bash
npx serve .
```

## Validation

```bash
npm run validate
npm run audit:assets
```

## Deployment

The repository is Vercel-ready. Commit the complete v158 structure, not only `index.html`, because v158 now loads files from the `js/` directory.

See `docs/REGRESSION-CHECKLIST.md` before replacing production.
