# ATM Town

ATM Town is a lightweight browser-based multiplayer social game built with HTML5 Canvas, JavaScript, Supabase Realtime, LiveKit voice, and XRPL/Xaman account features.

## Current version

**v160 — Map Runtime Registry**

This version moves map entry zoom, spawn direction, entrance IDs, exit targets, Town return rules, labels, and pixel dimensions behind the shared map registry without rewriting gameplay.

## Project structure

```text
index.html              Existing game runtime and UI
api/                    Vercel serverless endpoints
js/config.js            Build and map configuration
js/maps.js              Map registry and reusable enter/exit/runtime helpers
js/interactions.js      Shared interaction colors, mask readers, hints, and zone helpers
js/bootstrap.js         Startup, storage, and Supabase loader helpers
scripts/                Repeatable validation and asset-audit tools
docs/                   Architecture, roadmap, changelog, and test checklist
assets/README.md         Safe staged asset-migration policy
```

Live map and gameplay assets remain at the repository root for backward compatibility. They will be moved incrementally through the map registry.

## Local development

Serve the repository through a local web server rather than opening `index.html` directly, because browser security rules can differ for local files.

```bash
npx serve .
```

## Validation

```bash
npm run validate
npm run audit:assets
```

## Deployment

The repository is Vercel-ready. Commit the complete v160 changed-file structure, including `index.html`, `js/config.js`, and `js/maps.js`. Replacing only `index.html` will leave the registry out of sync.

See `docs/REGRESSION-CHECKLIST.md` before replacing production.
