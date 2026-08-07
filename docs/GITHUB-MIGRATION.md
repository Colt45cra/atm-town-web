# ATM Town v228 GitHub Migration

v228 changes asset paths across the project, so **do not upload only `index.html`**.

## Safest rollout

1. Keep a backup of the current production repository/ZIP.
2. Upload the complete v228 folder structure in one migration, preserving paths.
3. Make sure these folders exist in GitHub exactly as supplied: `api/`, `assets/`, `js/`, `docs/`, `scripts/`.
4. Deploy and test the game before deleting old root-level PNG/WebP/audio files.
5. Old v227 assets may temporarily remain in GitHub; v228 no longer references them, so they will not be downloaded by players.
6. After v228 is confirmed live, the old duplicate files can be deleted in a cleanup commit.

## Why staged deletion is safer

The new `index.html` and `js/config.js` point to the new `/assets/...` paths. Uploading the new references before all new assets are present can cause missing images. Leaving the old files temporarily is harmless and gives you a rollback path.
