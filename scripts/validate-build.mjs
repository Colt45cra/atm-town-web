import { mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
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
  'town.webp',
  'town-night.webp',
  'town-blocked.png',
  'town-stairs.png',
  'town-lighting.webp',
  'ATM TOWN INTERACTION MAP(1).png',
  'hq.webp',
  'hq-blocked.png',
  'hq-depth.png',
  'Hq interaction zones(1).png',
  'gallery.webp',
  'gallery-blocked.png',
  'gallery-depth.png',
  'arcade.webp',
  'arcade-blocked.png',
  'arcade-depth.png',
  'lounge.png',
  'lounge-blocked.png',
  'lounge-depth.png',
  'lounge-interaction.png'
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

for (const marker of ['ATM Town v160 — Map Runtime Registry', 'ATM TOWN · v160']) {
  if (!html.includes(marker)) errors.push(`Missing v160 marker: ${marker}`);
}

for (const runtimeMarker of [
  'townInteractionReader=ATM_INTERACTIONS.createMaskReader',
  'hqInteractionReader=ATM_INTERACTIONS.createMaskReader',
  'loungeInteractionReader=ATM_INTERACTIONS.createMaskReader',
  'const destination=ATM_MAPS.runtime(map,townZoom)',
  'ATM_MAPS.fromEntrance(t.id)',
  'ATM_MAPS.townReturnPoint(map,door)',
  'const activeSize=ATM_MAPS.pixelSize(currentMap)',
  "if(t&&t.type==='vending'){openVending();return;}"
]) {
  if (!html.includes(runtimeMarker)) errors.push(`Missing v160 runtime marker: ${runtimeMarker}`);
}

for (const legacyMarker of [
  'function classifyLoungeInteractionColor',
  'const loungeInteractionMask=',
  'function rebuildLoungeInteractionMask',
  'HQ_ENTRY_ZOOM',
  'GALLERY_ENTRY_ZOOM',
  'ARCADE_ENTRY_ZOOM',
  'LOUNGE_ENTRY_ZOOM',
  "if(currentMap==='town'&&t&&t.id==='hq')",
  "currentMap==='hq'?hqWorld:(currentMap==='gallery'?galleryWorld"
]) {
  if (html.includes(legacyMarker)) errors.push(`Legacy duplicate runtime logic remains: ${legacyMarker}`);
}

const configSource = await readFile(path.join(root, 'js', 'config.js'), 'utf8');
for (const zoomMarker of [
  "id: 'hq'",
  "id: 'gallery'",
  "id: 'arcade'",
  "id: 'lounge'"
]) {
  if (!configSource.includes(zoomMarker)) errors.push(`Missing registered map: ${zoomMarker}`);
}
for (const exactZoom of [
  "entryZoom: 0.60",
  "entryZoom: 0.70"
]) {
  if (!configSource.includes(exactZoom)) errors.push(`Missing requested entry zoom: ${exactZoom}`);
}
if ((configSource.match(/entryZoom: 0\.60/g) || []).length !== 3) errors.push('Expected exactly three 60% interior entry zooms.');
if ((configSource.match(/entryZoom: 0\.70/g) || []).length !== 1) errors.push('Expected exactly one 70% interior entry zoom.');

const mapsSource = await readFile(path.join(root, 'js', 'maps.js'), 'utf8');
const registrySandbox = { window: {} };
vm.runInNewContext(configSource, registrySandbox, { filename: 'js/config.js' });
vm.runInNewContext(mapsSource, registrySandbox, { filename: 'js/maps.js' });
const registry = registrySandbox.window.ATMMaps;
const expectedZooms = { hq: 0.60, gallery: 0.60, arcade: 0.60, lounge: 0.70 };
for (const [mapId, expectedZoom] of Object.entries(expectedZooms)) {
  const runtime = registry.runtime(mapId, 0.92);
  if (runtime.zoom !== expectedZoom) errors.push(`${mapId} runtime zoom expected ${expectedZoom}, received ${runtime.zoom}`);
  if (!runtime.interior) errors.push(`${mapId} should be registered as an interior.`);
  if (runtime.exitTarget !== 'town') errors.push(`${mapId} exit target should be town.`);
}
if (registry.runtime('town', 0.92).zoom !== 0.92) errors.push('Town should preserve the supplied saved zoom.');
for (const [entranceId, mapId] of Object.entries({ hq: 'hq', nftmega: 'gallery', arcade: 'arcade', gameLounge: 'lounge' })) {
  if (registry.fromEntrance(entranceId) !== mapId) errors.push(`Entrance ${entranceId} should route to ${mapId}.`);
}
const normalReturn = registry.townReturnPoint('hq', { x: 100, y: 200 });
if (normalReturn.x !== 100 || normalReturn.y !== 365) errors.push('HQ Town return offset changed unexpectedly.');
const arcadeReturn = registry.townReturnPoint('arcade', { x: 321, y: 999 });
if (arcadeReturn.x !== 321 || arcadeReturn.y !== 700) errors.push('Arcade special Town return point changed unexpectedly.');
if (registry.pixelSize('lounge').w !== 1254 || registry.pixelSize('lounge').h !== 1254) errors.push('Lounge pixel size should remain 1254 × 1254.');

const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'atm-town-validate-'));
try {
  const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .filter((match) => !/\ssrc=/.test(match[0]))
    .map((match) => match[1]);
  const combinedInline = inlineScripts.join('\n');
  const inlinePath = path.join(tempDirectory, 'inline-game.js');
  await writeFile(inlinePath, combinedInline);

  const syntaxTargets = [
    path.join(root, 'js', 'config.js'),
    path.join(root, 'js', 'maps.js'),
    path.join(root, 'js', 'interactions.js'),
    path.join(root, 'js', 'bootstrap.js'),
    inlinePath
  ];

  for (const target of syntaxTargets) {
    const result = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
    if (result.status !== 0) errors.push(`JavaScript syntax failed for ${path.basename(target)}:\n${result.stderr.trim()}`);
  }
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
}

if (errors.length) {
  console.error(`ATM Town build validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('ATM Town v160 build validation passed.');
console.log(`Checked ${requiredFiles.length} required runtime files, module order, v160 map-runtime markers, requested zoom defaults, and JavaScript syntax.`);
