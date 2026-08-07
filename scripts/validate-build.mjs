import { mkdtemp, readFile, rm, writeFile, access, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const errors = [];
const requiredFiles = [
  'index.html',
  'js/config.js',
  'js/maps.js',
  'js/interactions.js',
  'js/bootstrap.js',
  'api/_auth.js',
  'api/_xaman-vending.js',
  'api/xaman-vending-start.js',
  'api/xaman-vending-status.js',
  'api/xaman-vending-webhook.js',
  'assets/maps/town/visual.webp',
  'assets/maps/town/night.webp',
  'assets/maps/town/lighting.webp',
  'assets/maps/town/masks/collision.png',
  'assets/maps/town/masks/stairs.png',
  'assets/maps/town/masks/interaction.png',
  'assets/maps/hq/visual.webp',
  'assets/maps/hq/masks/collision.png',
  'assets/maps/hq/masks/depth.png',
  'assets/maps/hq/masks/interaction.png',
  'assets/maps/gallery/visual.webp',
  'assets/maps/gallery/masks/collision.png',
  'assets/maps/gallery/masks/depth.png',
  'assets/maps/arcade/visual.webp',
  'assets/maps/arcade/masks/collision.png',
  'assets/maps/arcade/masks/depth.png',
  'assets/maps/arcade/masks/interaction.png',
  'assets/maps/lounge/visual.webp',
  'assets/maps/lounge/masks/collision.png',
  'assets/maps/lounge/masks/depth.png',
  'assets/maps/lounge/masks/interaction.png',
  'assets/characters/playable/atm.webp',
  'assets/characters/playable/fuzzy.webp',
  'assets/characters/playable/miracle.webp',
  'assets/characters/playable/luci.webp',
  'assets/characters/playable/triskeleton.webp',
  'assets/characters/equipment/jetpack.webp',
  'assets/audio/jetpack-boost.wav',
  'assets/audio/quest-drift.mp3',
  'docs/ASSET-POLICY.md'
];

for (const file of requiredFiles) {
  try { await access(path.join(root, file)); }
  catch { errors.push(`Missing required file: ${file}`); }
}

const html = await readFile(path.join(root, 'index.html'), 'utf8');
const expectedOrder = ['js/config.js', 'js/maps.js', 'js/interactions.js', 'js/bootstrap.js'];
let previousIndex = -1;
for (const script of expectedOrder) {
  const index = html.indexOf(`<script src="${script}"></script>`);
  if (index === -1) errors.push(`index.html does not load ${script}`);
  if (index !== -1 && index < previousIndex) errors.push(`Script order is incorrect around ${script}`);
  previousIndex = index;
}

if (!html.includes("version:'v228'")) errors.push('Missing v228 display build marker.');
if (!html.includes("name:'Asset Architecture Optimization'")) errors.push('Missing v228 display build name.');
if (/data:image\//i.test(html)) errors.push('index.html still contains embedded data:image URIs; runtime art should be external/cacheable.');

const idMatches = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
const idCounts = new Map();
for (const id of idMatches) idCounts.set(id, (idCounts.get(id) || 0) + 1);
for (const [id, count] of idCounts) if (count > 1) errors.push(`Duplicate HTML id: ${id} (${count})`);

for (const runtimeMarker of [
  'townInteractionReader=ATM_INTERACTIONS.createMaskReader',
  'hqInteractionReader=ATM_INTERACTIONS.createMaskReader',
  'loungeInteractionReader=ATM_INTERACTIONS.createMaskReader',
  'const destination=ATM_MAPS.runtime(map,townZoom)',
  'ATM_MAPS.fromEntrance(t.id)',
  'ATM_MAPS.townReturnPoint(map,door)',
  'const activeSize=ATM_MAPS.pixelSize(currentMap)',
  "if(t&&t.type==='vending'){openVending();return;}",
  'TOWN_BOT_DEFS',
  'spawnFootstepEffect',
  'WORLD_ALIVE_DESTINATIONS'
]) {
  if (!html.includes(runtimeMarker)) errors.push(`Missing current gameplay marker: ${runtimeMarker}`);
}

const configPath = path.join(root, 'js', 'config.js');
const mapsPath = path.join(root, 'js', 'maps.js');
const configSource = await readFile(configPath, 'utf8');
const mapsSource = await readFile(mapsPath, 'utf8');
if (!configSource.includes("version: 'v228'")) errors.push('js/config.js is not marked v228.');

const registrySandbox = { window: {} };
vm.runInNewContext(configSource, registrySandbox, { filename: 'js/config.js' });
vm.runInNewContext(mapsSource, registrySandbox, { filename: 'js/maps.js' });
const registry = registrySandbox.window.ATMMaps;
const config = registrySandbox.window.ATM_TOWN_CONFIG;

const expectedZooms = { hq: 0.60, gallery: 0.60, arcade: 0.60, lounge: 0.70 };
for (const [mapId, expectedZoom] of Object.entries(expectedZooms)) {
  const runtime = registry.runtime(mapId, 0.92);
  if (runtime.zoom !== expectedZoom) errors.push(`${mapId} runtime zoom expected ${expectedZoom}, received ${runtime.zoom}`);
  if (!runtime.interior) errors.push(`${mapId} should be registered as an interior.`);
  if (runtime.exitTarget !== 'town') errors.push(`${mapId} exit target should be town.`);
}
if (registry.runtime('town', 0.92).zoom !== 0.92) errors.push('Town should preserve the supplied saved zoom.');
if (registry.pixelSize('lounge').w !== 1254 || registry.pixelSize('lounge').h !== 1254) errors.push('Lounge pixel size should remain 1254 × 1254.');

for (const [mapId, map] of Object.entries(config.maps)) {
  for (const [assetType, assetPath] of Object.entries(map.assets || {})) {
    try { await access(path.join(root, assetPath)); }
    catch { errors.push(`Registered ${mapId}.${assetType} asset is missing: ${assetPath}`); }
    if (['collision', 'depth', 'interaction', 'stairs'].includes(assetType) && path.extname(assetPath).toLowerCase() !== '.png') {
      errors.push(`Gameplay-data mask must remain PNG: ${mapId}.${assetType} -> ${assetPath}`);
    }
  }
}

// Directly referenced local runtime assets should all exist.
const sourceBundle = `${html}\n${configSource}`;
const assetRefs = new Set();
for (const match of sourceBundle.matchAll(/["'`](assets\/[A-Za-z0-9_./() -]+\.(?:webp|png|wav|mp3))["'`]/g)) assetRefs.add(match[1]);
for (const asset of assetRefs) {
  try { await access(path.join(root, asset)); }
  catch { errors.push(`Referenced asset does not exist: ${asset}`); }
}

// Town foreground day/night pieces must stay paired by filename.
const dayDir = path.join(root, 'assets', 'maps', 'town', 'foreground', 'day');
const nightDir = path.join(root, 'assets', 'maps', 'town', 'foreground', 'night');
const dayFiles = (await readdir(dayDir)).sort();
const nightFiles = (await readdir(nightDir)).sort();
if (dayFiles.length !== nightFiles.length) errors.push(`Town foreground day/night count mismatch: ${dayFiles.length} vs ${nightFiles.length}`);
for (const dayFile of dayFiles) if (!nightFiles.includes(dayFile)) errors.push(`Missing night foreground pair for: ${dayFile}`);

// Deployment root should not regress to loose runtime image/audio files.
const rootEntries = await readdir(root, { withFileTypes: true });
for (const entry of rootEntries) {
  if (!entry.isFile()) continue;
  const ext = path.extname(entry.name).toLowerCase();
  if (['.png', '.webp', '.wav', '.mp3'].includes(ext)) errors.push(`Loose runtime asset found in repository root: ${entry.name}`);
}

const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'atm-town-validate-'));
try {
  const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .filter((match) => !/\ssrc=/.test(match[0]))
    .map((match) => match[1]);
  if (!inlineScripts.length) errors.push('No inline game scripts were found.');
  for (let index = 0; index < inlineScripts.length; index += 1) {
    const target = path.join(tempDirectory, `inline-${index + 1}.js`);
    await writeFile(target, inlineScripts[index]);
    const result = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
    if (result.status !== 0) errors.push(`Inline JavaScript block ${index + 1} failed syntax:\n${result.stderr.trim()}`);
  }

  const syntaxTargets = [
    'js/config.js', 'js/maps.js', 'js/interactions.js', 'js/bootstrap.js',
    'api/_auth.js', 'api/_xaman-vending.js', 'api/xaman-vending-start.js',
    'api/xaman-vending-status.js', 'api/xaman-vending-webhook.js'
  ];
  for (const relative of syntaxTargets) {
    const target = path.join(root, relative);
    const result = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
    if (result.status !== 0) errors.push(`JavaScript syntax failed for ${relative}:\n${result.stderr.trim()}`);
  }
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
}

if (errors.length) {
  console.error(`ATM Town v228 build validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('ATM Town v228 build validation passed.');
console.log(`Checked ${requiredFiles.length} required files, ${assetRefs.size} direct asset references, ${dayFiles.length} day/night foreground pairs, map masks, duplicate IDs, and every inline JavaScript block.`);
