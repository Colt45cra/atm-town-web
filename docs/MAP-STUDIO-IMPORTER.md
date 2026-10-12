# Map Studio imports

Map Studio connects through `/admin/?connect-map=1#maps`. Existing ATM Town authentication and the `town_admins` table authorize the connection. The returned capability is scoped to map API actions, expires after 30 minutes, and never grants access to wallets or reward settings. Each request rechecks the user and administrator membership.

Studio prepares the highlighted region without downloading a ZIP. Administrators can also import a selected-area ZIP from Admin → Map imports. Images upload directly to immutable server-minted `world-maps` paths. The server checks PNG checksums, dimensions, encoding, selected cell alignment, footprints, and size limits before a version becomes ready. Publication is a separate explicit button after the merged overview appears.

`town_map_activate` atomically compares the expected revision, switches the live pointer, and writes the admin audit record. The client cannot execute it through the Data API. A previous published version or the original map can be restored from Map imports. Database tables are service-only with RLS enabled. Apply `supabase/town-map-importer.sql` once.

Terrain and collision updates replace only selected sections. Spawn, native objects, imported objects with other IDs, stairs, interaction masks, night artwork, and lighting remain. Preserved partial sections retain per-layer rectangles so they are not stretched. Added space receives a shaded terrain fallback at night. New overview images retain the full world bounds.

The public `rewards-map-manifest` action supplies the active version; existing game loading falls back to the bundled manifest if that request fails. Imported objects join the existing public world-object feed. Players load a map version when they re-enter town; publication does not replace chunks beneath active players.

Validation: `node --test tests/map-importer.test.mjs`. Tests cover signed connection tampering/expiration, selection validation, corrupt uploads, partial-edge geometry, preservation, staged upload/validation/publication, stale revisions, and runtime layer rectangles. Activation, conflict rejection, authorization, and rollback were also checked in a database transaction that was rolled back.
