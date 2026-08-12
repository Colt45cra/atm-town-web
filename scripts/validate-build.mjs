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
  'js/world-streaming.js',
  'js/bootstrap.js',
  'lib/auth.js',
  'api/xrpl-inventory.js',
  'api/xrpl-nft-metadata.js',
  'api/leaderboards.js',
  'lib/xrpl-nft-trading.js',
  'api/xrpl-nft-trade.js',
  'server/xrpl-nft-offer-start.js',
  'server/xrpl-nft-offer-accept-start.js',
  'server/xrpl-nft-offer-status.js',
  'server/xrpl-nft-offers.js',
  'lib/xaman-vending.js',
  'api/xaman-vending-start.js',
  'api/xaman-vending-status.js',
  'api/xaman-vending-webhook.js',
  'assets/maps/town/visual.webp',
  'assets/maps/town/night.webp',
  'assets/maps/town/lighting.webp',
  'assets/maps/town/masks/collision.png',
  'assets/maps/town/masks/stairs.png',
  'assets/maps/town/masks/interaction.png',
  'assets/world/manifest.json',
  'assets/world/tiler-report.json',
  'assets/world/overview/day.webp',
  'assets/world/overview/night.webp',
  'scripts/tile-world.py',
  'scripts/validate-world.py',
  'requirements-map-tiler.txt',
  'docs/WORLD-STREAMING.md',
  'docs/MAP-EXPANSION-WORKFLOW.md',
  'docs/WORLD-STREAMING-VALIDATION.md',
  'docs/LEGACY-ROOT-ASSET-REMOVALS.txt',
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
  'docs/ASSET-POLICY.md',
  'docs/XRPL-NFT-COLLECTION.md',
  'docs/XRPL-TRADE-BEACON.md',
  'docs/V233-LEADERBOARDS-NFT-OFFERS.md',
  'docs/V233.1-SERVERLESS-ROUTER-HOTFIX.md',
  'docs/V233.2-SCORE-RELIABILITY.md',
  'docs/V234-EMBEDDED-WALLET-PHASE1.md',
  'docs/V234-EMBEDDED-WALLET-PHASE2.md',
  'js/wallet/embedded-wallet.js',
  'api/embedded-wallet.js',
  'supabase/ATM-Town-v234.sql',
  'scripts/apply-v2331.sh',
  'api/xaman-link.js',
  'server/xaman-link-start.js',
  'server/xaman-link-status.js',
  'supabase/ATM-Town-v233.sql'
];

for (const file of requiredFiles) {
  try { await access(path.join(root, file)); }
  catch { errors.push(`Missing required file: ${file}`); }
}

const html = await readFile(path.join(root, 'index.html'), 'utf8');
const expectedOrder = ['js/config.js', 'js/maps.js', 'js/interactions.js', 'js/world-streaming.js', 'js/bootstrap.js', 'js/wallet/embedded-wallet.js'];
let previousIndex = -1;
for (const script of expectedOrder) {
  const index = html.indexOf(`<script src="${script}"></script>`);
  if (index === -1) errors.push(`index.html does not load ${script}`);
  if (index !== -1 && index < previousIndex) errors.push(`Script order is incorrect around ${script}`);
  previousIndex = index;
}

if (!html.includes("version:ATM_CONFIG?.build?.version||'v234'")) errors.push('Missing v234 display build marker.');
if (!html.includes("name:ATM_CONFIG?.build?.name||'Embedded Wallet — Testnet Phase 2'")) errors.push('Missing v234 Phase 2 display build fallback.');
if (!html.includes("add('local',player.x,player.y,jumpLift(),tradeBeaconState")) errors.push('Trade Beacon is not anchored to local airborne lift.');
if (!html.includes("p.jump||0,p.tradeBeacon")) errors.push('Trade Beacon is not anchored to remote airborne lift.');
if (!html.includes("route:[{x:888,y:659},{x:1080,y:680},{x:1080,y:740},{x:900,y:740},{x:720,y:690}]")) errors.push('Fuzzy collision-safe patrol route is missing.');
if (/data:image\//i.test(html)) errors.push('index.html still contains embedded data:image URIs; runtime art should be external/cacheable.');

const idMatches = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
const idCounts = new Map();
for (const id of idMatches) idCounts.set(id, (idCounts.get(id) || 0) + 1);
for (const [id, count] of idCounts) if (count > 1) errors.push(`Duplicate HTML id: ${id} (${count})`);

for (const runtimeMarker of [
  'const townWorldStream=ATMWorldStreaming.create',
  'townWorldStream.nearestInteraction',
  'hqInteractionReader=ATM_INTERACTIONS.createMaskReader',
  'loungeInteractionReader=ATM_INTERACTIONS.createMaskReader',
  'const destination=ATM_MAPS.runtime(map,townZoom)',
  'ATM_MAPS.fromEntrance(t.id)',
  'ATM_MAPS.townReturnPoint(map,door)',
  'const activeSize=ATM_MAPS.pixelSize(currentMap)',
  "if(t&&t.type==='vending'){openVending();return;}",
  'TOWN_BOT_DEFS',
  'spawnFootstepEffect',
  'WORLD_ALIVE_DESTINATIONS',
  'data-locker-tab="nfts"',
  'id="lockerNftGrid"',
  'lockerRenderNftCollection',
  "/api/xrpl-nft-metadata",
  'tradeBeaconBroadcastPayload',
  'nearestTradeBeaconRemote',
  "'VIEW NFT'",
  'id="tradeBeaconLayer"',
  'id="tradeNftPanel"',
  'id="arcadeLeaderboardPanel"',
  '/api/leaderboards',
  'atmLeaderboardStart',
  'atmLeaderboardSubmit',
  'ATM_LEADERBOARD_PENDING_KEY',
  'retryPendingLeaderboardScores',
  'MAKE XRP OFFER',
  '/api/xrpl-nft-trade?action=start',
  '/api/xrpl-nft-trade?action=accept',
  '/api/xrpl-nft-trade?action=status&payload_uuid=',
  '/api/xrpl-nft-trade?action=offers&token_id=',
  '/api/xaman-link?action=start',
  '/api/xaman-link?action=status&payload_uuid=',
  'id="embeddedWalletBtn"',
  'js/wallet/embedded-wallet.js',
  'window.atmApiWithAuth=apiWithAuth'
]) {
  if (!html.includes(runtimeMarker)) errors.push(`Missing current gameplay marker: ${runtimeMarker}`);
}

const leaderboardApiSource = await readFile(path.join(root, 'api', 'leaderboards.js'), 'utf8');
if (!leaderboardApiSource.includes('idempotent: true')) errors.push('Leaderboard API is missing idempotent score recovery.');
if (!leaderboardApiSource.includes("String(insertError.code || '') === '23505'")) errors.push('Leaderboard API is missing duplicate-session race recovery.');
const configPath = path.join(root, 'js', 'config.js');
const mapsPath = path.join(root, 'js', 'maps.js');
const configSource = await readFile(configPath, 'utf8');
const mapsSource = await readFile(mapsPath, 'utf8');
if (!configSource.includes("version: 'v234'")) errors.push('js/config.js is not marked v234.');

const registrySandbox = { window: {} };
vm.runInNewContext(configSource, registrySandbox, { filename: 'js/config.js' });
vm.runInNewContext(mapsSource, registrySandbox, { filename: 'js/maps.js' });
const registry = registrySandbox.window.ATMMaps;
const config = registrySandbox.window.ATM_TOWN_CONFIG;

if (config.embeddedWallet?.network !== 'testnet') errors.push('Embedded wallet must remain Testnet-only in v234.');
if (!String(config.embeddedWallet?.rpcHttp || '').includes('altnet.rippletest.net')) errors.push('Embedded wallet config must use XRPL Testnet RPC.');
if (!/^wss:\/\/s\.altnet\.rippletest\.net:51233\/?$/i.test(String(config.embeddedWallet?.rpcWs || ''))) errors.push('Embedded wallet signing client must use the approved XRPL Testnet WebSocket endpoint.');
if (!String(config.embeddedWallet?.explorerTxBase || '').startsWith('https://testnet.xrpl.org/transactions/')) errors.push('Embedded wallet transaction explorer must remain on XRPL Testnet.');
const embeddedWalletSource = await readFile(path.join(root, 'js', 'wallet', 'embedded-wallet.js'), 'utf8');
const embeddedWalletApiSource = await readFile(path.join(root, 'api', 'embedded-wallet.js'), 'utf8');
const embeddedWalletSql = await readFile(path.join(root, 'supabase', 'ATM-Town-v234.sql'), 'utf8');
if (!embeddedWalletSource.includes("const NETWORK = 'testnet'")) errors.push('Embedded wallet client is not hard-gated to Testnet.');
if (!embeddedWalletSource.includes('Wallet.generate()')) errors.push('Embedded wallet is not generating the XRPL keypair in the browser.');
if (!embeddedWalletSource.includes("crypto.subtle.encrypt")) errors.push('Embedded wallet client is missing local Web Crypto encryption.');
if (!embeddedWalletSource.includes("extensions:{prf:")) errors.push('Embedded wallet client is missing WebAuthn PRF unlock support.');
if (/localStorage|sessionStorage/.test(embeddedWalletSource) && /seed/i.test(embeddedWalletSource)) errors.push('Embedded wallet source may persist seed material in web storage.');
if (!embeddedWalletSource.includes("client.autofill({TransactionType:'Payment'")) errors.push('Phase 2 must autofill the Testnet payment before preview/signing.');
if (!embeddedWalletSource.includes('state.wallet.sign(tx)')) errors.push('Phase 2 must sign the prepared XRPL transaction locally in the browser.');
if (!embeddedWalletSource.includes('client.submitAndWait(signed.tx_blob)')) errors.push('Phase 2 must submit the locally signed blob directly to XRPL Testnet.');
if (!embeddedWalletSource.includes('MAX_TEST_PAYMENT_DROPS = 10_000_000n')) errors.push('Phase 2 small-payment hard cap is missing.');
if (!embeddedWalletSource.includes('MAX_TEST_FEE_DROPS = 10_000n')) errors.push('Phase 2 fee safety ceiling is missing.');
if (!embeddedWalletSource.includes('PAYMENT_PREVIEW_TTL_MS = 60 * 1000')) errors.push('Phase 2 prepared-payment expiry guard is missing.');
if (!embeddedWalletSource.includes('wallet locked after signing') && !embeddedWalletSource.includes('Wallet locked after signing')) errors.push('Phase 2 should lock the wallet after signing/submission.');
if (/walletApi\([^\n]*(?:tx_blob|signed)/i.test(embeddedWalletSource)) errors.push('Signed XRPL transaction data must not be relayed through the ATM Town authenticated API.');
if (!embeddedWalletApiSource.includes("const NETWORK = 'testnet'")) errors.push('Embedded wallet API is not hard-gated to Testnet.');
if (!embeddedWalletApiSource.includes('XRPL_TESTNET_RPC_URL')) errors.push('Embedded wallet API must use a dedicated XRPL_TESTNET_RPC_URL override.');
if (/s1\.ripple\.com|xrplcluster\.com|force_network[^\n]*MAINNET/i.test(embeddedWalletApiSource)) errors.push('Embedded wallet API contains a Mainnet endpoint/marker.');
if (!embeddedWalletApiSource.includes("from('embedded_wallets')")) errors.push('Embedded wallet API is not isolated to embedded_wallets.');
if (/from\('player_accounts'\)/.test(embeddedWalletApiSource)) errors.push('Embedded wallet API must not overwrite player_accounts.wallet_address.');
if (!embeddedWalletSql.includes('alter table public.embedded_wallets enable row level security')) errors.push('Embedded wallet table must have RLS enabled.');
if (/create policy/i.test(embeddedWalletSql)) errors.push('v234 embedded_wallets should expose no direct browser RLS policies.');

// Existing Xaman/Mainnet paths must remain unchanged and separate from the Testnet wallet.
const vendingSource = await readFile(path.join(root, 'api', 'xaman-vending-start.js'), 'utf8');
const nftTradingSource = await readFile(path.join(root, 'lib', 'xrpl-nft-trading.js'), 'utf8');
if (!vendingSource.includes("force_network: 'MAINNET'") && !vendingSource.includes('force_network:"MAINNET"') && !vendingSource.includes("force_network:'MAINNET'")) errors.push('Xaman vending must remain explicitly Mainnet.');
if (!nftTradingSource.includes("force_network: 'MAINNET'") && !nftTradingSource.includes('force_network:"MAINNET"') && !nftTradingSource.includes("force_network:'MAINNET'")) errors.push('Xaman NFT trading must remain explicitly Mainnet.');

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

// Streamed world metadata and generated chunk references must be deployable.
let worldManifest = null;
try {
  worldManifest = JSON.parse(await readFile(path.join(root, 'assets/world/manifest.json'), 'utf8'));
  if (worldManifest.chunkSize !== 1024) errors.push(`World chunkSize expected 1024, received ${worldManifest.chunkSize}`);
  if (!worldManifest.coordinateSystem?.supportsNegativeCoordinates) errors.push('World manifest must support negative chunk/world coordinates.');
  if (worldManifest.bounds?.width !== 3120 || worldManifest.bounds?.height !== 4320) errors.push('Phase 1 world bounds must remain 3120 × 4320.');
  const cells = worldManifest.cells || {};
  if (Object.keys(cells).length !== 20) errors.push(`Phase 1 expected 20 logical chunk cells, received ${Object.keys(cells).length}`);
  for (const [layerName, layer] of Object.entries(worldManifest.layers || {})) {
    if (['collision', 'interaction', 'stairs'].includes(layerName) && layer.format !== 'png') {
      errors.push(`Streamed gameplay-data layer must remain PNG: ${layerName}.${layer.format}`);
    }
    for (const key of layer.chunks || []) {
      const file = `${layer.path}/${key}.${layer.format}`;
      try { await access(path.join(root, file)); }
      catch { errors.push(`World manifest chunk is missing: ${file}`); }
      if (!cells[key]) errors.push(`World layer ${layerName} references unknown cell: ${key}`);
    }
  }
  for (const overviewPath of [worldManifest.overview?.day, worldManifest.overview?.night].filter(Boolean)) {
    try { await access(path.join(root, overviewPath)); }
    catch { errors.push(`World overview asset is missing: ${overviewPath}`); }
  }
} catch (error) {
  errors.push(`World manifest could not be parsed: ${error.message}`);
}

// Deployment root should not regress to loose runtime image/audio files.
const apiEntries = await readdir(path.join(root, 'api'), { withFileTypes: true });
const apiFunctionFiles = apiEntries.filter((entry) => entry.isFile() && entry.name.endsWith('.js'));
if (apiFunctionFiles.length > 12) errors.push(`Vercel Hobby API function limit exceeded: ${apiFunctionFiles.length} api/*.js files (max 12).`);
if (apiFunctionFiles.length !== 12) errors.push(`v234 expects 12 api/*.js serverless functions, found ${apiFunctionFiles.length}.`);
for (const obsolete of ['_auth.js','_xaman-vending.js','_xrpl-nft-trading.js','xaman-link-start.js','xaman-link-status.js','xrpl-nft-offer-start.js','xrpl-nft-offer-status.js','xrpl-nft-offers.js','xrpl-nft-offer-accept-start.js']) {
  if (apiFunctionFiles.some((entry) => entry.name === obsolete)) errors.push(`Obsolete API route/helper still present and would consume a Vercel function slot: api/${obsolete}`);
}

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
    'js/config.js', 'js/maps.js', 'js/interactions.js', 'js/world-streaming.js', 'js/bootstrap.js', 'js/wallet/embedded-wallet.js',
    'lib/auth.js', 'lib/xaman-vending.js', 'lib/xrpl-nft-trading.js',
    'api/xrpl-inventory.js', 'api/xrpl-nft-metadata.js', 'api/leaderboards.js', 'api/xrpl-nft-trade.js',
    'api/xaman-link.js', 'api/xaman-vending-start.js', 'api/xaman-vending-status.js', 'api/xaman-vending-webhook.js', 'api/embedded-wallet.js',
    'server/xaman-link-start.js', 'server/xaman-link-status.js',
    'server/xrpl-nft-offer-start.js', 'server/xrpl-nft-offer-accept-start.js', 'server/xrpl-nft-offer-status.js', 'server/xrpl-nft-offers.js'
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
  console.error(`ATM Town v234 build validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('ATM Town v234 build validation passed.');
console.log(`Checked ${requiredFiles.length} required files, ${assetRefs.size} direct asset references, ${dayFiles.length} day/night foreground pairs, map masks, duplicate IDs, and every inline JavaScript block.`);
