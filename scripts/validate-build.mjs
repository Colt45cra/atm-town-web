import { mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

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

for (const marker of ['ATM Town v159 — Shared Interaction Foundation', 'ATM TOWN · v159']) {
  if (!html.includes(marker)) errors.push(`Missing v159 marker: ${marker}`);
}

for (const runtimeMarker of [
  'townInteractionReader=ATM_INTERACTIONS.createMaskReader',
  'hqInteractionReader=ATM_INTERACTIONS.createMaskReader',
  'loungeInteractionReader=ATM_INTERACTIONS.createMaskReader',
  "if(t&&t.type==='vending'){openVending();return;}"
]) {
  if (!html.includes(runtimeMarker)) errors.push(`Missing shared interaction runtime marker: ${runtimeMarker}`);
}

for (const legacyMarker of [
  'function classifyLoungeInteractionColor',
  'const loungeInteractionMask=',
  'function rebuildLoungeInteractionMask'
]) {
  if (html.includes(legacyMarker)) errors.push(`Legacy duplicate interaction logic remains: ${legacyMarker}`);
}

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

console.log('ATM Town v159 build validation passed.');
console.log(`Checked ${requiredFiles.length} required runtime files, shared interaction module order, version markers, migration markers, and JavaScript syntax.`);
