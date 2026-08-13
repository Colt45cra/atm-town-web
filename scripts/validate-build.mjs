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
  'assets/characters/playable/phnix.webp',
  'assets/characters/playable/bear.webp',
  'assets/characters/playable/xoge.webp',
  'assets/characters/playable/flippy.webp',
  'assets/characters/thumbnails/character-phnix.webp',
  'assets/characters/thumbnails/character-bear.webp',
  'assets/characters/thumbnails/character-xoge.webp',
  'assets/characters/thumbnails/character-flippy.webp',
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
  'docs/V234.1-WALLET-SECURITY-HARDENING.md',
  'docs/V234.2-ATM-PAY.md',
  'docs/V234.2.4-ATM-PAY-MOBILE-RPC.md',
  'docs/V234.2.5-ATM-PAY-SEAMLESS-RELAY.md',
  'docs/V234.2.6-ATM-PAY-LEDGER-CONTRACT-HOTFIX.md',
  'scripts/generate-security-headers.mjs',
  'vercel.json',
  'package.json',
  'js/wallet/embedded-wallet.js',
  'js/runtime/game-core.js',
  'js/runtime/sky-run.js',
  'js/runtime/platform-panic.js',
  'js/runtime/ring-rumble.js',
  'js/runtime/flappy-jetpack.js',
  'js/runtime/darts.js',
  'api/embedded-wallet.js',
  'lib/atm-pay.js',
  'lib/xrpl-testnet-rpc.js',
  'supabase/ATM-Town-v234.sql',
  'supabase/ATM-Town-v234.2.sql',
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
const gameRuntimeParts = await Promise.all([
  readFile(path.join(root, 'js/runtime/game-core.js'), 'utf8'),
  readFile(path.join(root, 'js/runtime/sky-run.js'), 'utf8'),
  readFile(path.join(root, 'js/runtime/platform-panic.js'), 'utf8'),
  readFile(path.join(root, 'js/runtime/ring-rumble.js'), 'utf8'),
  readFile(path.join(root, 'js/runtime/flappy-jetpack.js'), 'utf8'),
  readFile(path.join(root, 'js/runtime/darts.js'), 'utf8'),
]);
const gameRuntimeSource = gameRuntimeParts.join('\n');
const runtimeSource = `${html}\n${gameRuntimeSource}`;
const expectedOrder = ['js/config.js', 'js/maps.js', 'js/interactions.js', 'js/world-streaming.js', 'js/bootstrap.js', 'js/wallet/embedded-wallet.js', 'js/runtime/game-core.js', 'js/runtime/sky-run.js', 'js/runtime/platform-panic.js', 'js/runtime/ring-rumble.js', 'js/runtime/flappy-jetpack.js', 'js/runtime/darts.js'];
let previousIndex = -1;
for (const script of expectedOrder) {
  const index = html.indexOf(`<script src="${script}"></script>`);
  if (index === -1) errors.push(`index.html does not load ${script}`);
  if (index !== -1 && index < previousIndex) errors.push(`Script order is incorrect around ${script}`);
  previousIndex = index;
}

if (!runtimeSource.includes("version:ATM_CONFIG?.build?.version||'v234.2'")) errors.push('Missing v234.2 display build marker.');
if (!runtimeSource.includes("name:ATM_CONFIG?.build?.name||'ATM Pay'")) errors.push('Missing v234.2 ATM Pay display fallback.');
if (!runtimeSource.includes("add('local',player.x,player.y,jumpLift(),tradeBeaconState")) errors.push('Trade Beacon is not anchored to local airborne lift.');
if (!runtimeSource.includes("p.jump||0,p.tradeBeacon")) errors.push('Trade Beacon is not anchored to remote airborne lift.');
if (!runtimeSource.includes("route:[{x:888,y:659},{x:1080,y:680},{x:1080,y:740},{x:900,y:740},{x:720,y:690}]")) errors.push('Fuzzy collision-safe patrol route is missing.');
if (/data:image\//i.test(runtimeSource)) errors.push('index.html still contains embedded data:image URIs; runtime art should be external/cacheable.');

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
  'ATM Pay · Testnet',
  'window.atmApiWithAuth=apiWithAuth'
]) {
  if (!runtimeSource.includes(runtimeMarker)) errors.push(`Missing current gameplay marker: ${runtimeMarker}`);
}

for (const characterId of ['phnix','bear','xoge','flippy']) {
  if (!gameRuntimeParts[0].includes(`characterId:'${characterId}'`)) errors.push(`New playable character is missing from starter Locker catalog: ${characterId}`);
  if (!gameRuntimeParts[0].includes(`'${characterId}'`)) errors.push(`New playable character is missing from game runtime registry: ${characterId}`);
  if (!html.includes(`data-character="${characterId}"`)) errors.push(`New playable character is missing from signup character rail: ${characterId}`);
  if (!html.includes(`data-profile-character="${characterId}"`)) errors.push(`New playable character is missing from profile picker: ${characterId}`);
}

if (!gameRuntimeParts[0].includes('function nearestThing(){')) errors.push('Game core runtime is missing nearestThing definition.');
if (!gameRuntimeParts[1].includes('const originalNearestThing=nearestThing;')) errors.push('Sky Run runtime is missing the arcade nearestThing extension.');
if (!html.includes('<script src="js/runtime/game-core.js"></script>\n<script src="js/runtime/sky-run.js"></script>')) errors.push('Game core must load immediately before the Sky Run arcade extension.');

const leaderboardApiSource = await readFile(path.join(root, 'api', 'leaderboards.js'), 'utf8');
if (!leaderboardApiSource.includes('idempotent: true')) errors.push('Leaderboard API is missing idempotent score recovery.');
if (!leaderboardApiSource.includes("String(insertError.code || '') === '23505'")) errors.push('Leaderboard API is missing duplicate-session race recovery.');
const configPath = path.join(root, 'js', 'config.js');
const mapsPath = path.join(root, 'js', 'maps.js');
const configSource = await readFile(configPath, 'utf8');
const mapsSource = await readFile(mapsPath, 'utf8');
if (!configSource.includes("version: 'v234.2.6'")) errors.push('js/config.js is not marked v234.2.6.');
if (configSource.includes('unpkg.com')) errors.push('v234.1 must not retain the unpkg runtime fallback in browser configuration.');

const registrySandbox = { window: {} };
vm.runInNewContext(configSource, registrySandbox, { filename: 'js/config.js' });
vm.runInNewContext(mapsSource, registrySandbox, { filename: 'js/maps.js' });
const registry = registrySandbox.window.ATMMaps;
const config = registrySandbox.window.ATM_TOWN_CONFIG;

if (config.embeddedWallet?.network !== 'testnet') errors.push('Embedded wallet must remain Testnet-only in v234.');
if ('rpcHttp' in (config.embeddedWallet || {}) || 'rpcHttpSources' in (config.embeddedWallet || {}) || 'rpcWs' in (config.embeddedWallet || {})) errors.push('v234.2.5 browser wallet config must not expose direct XRPL transport endpoints.');
if (!String(config.embeddedWallet?.explorerTxBase || '').startsWith('https://testnet.xrpl.org/transactions/')) errors.push('Embedded wallet transaction explorer must remain on XRPL Testnet.');
const embeddedWalletSource = await readFile(path.join(root, 'js', 'wallet', 'embedded-wallet.js'), 'utf8');
const embeddedWalletApiSource = await readFile(path.join(root, 'api', 'embedded-wallet.js'), 'utf8');
const atmPaySource = await readFile(path.join(root, 'lib', 'atm-pay.js'), 'utf8');
const testnetRpcSource = await readFile(path.join(root, 'lib', 'xrpl-testnet-rpc.js'), 'utf8');
const embeddedWalletSql = await readFile(path.join(root, 'supabase', 'ATM-Town-v234.sql'), 'utf8');
const atmPaySql = await readFile(path.join(root, 'supabase', 'ATM-Town-v234.2.sql'), 'utf8');
if (!embeddedWalletSource.includes("const NETWORK = 'testnet'")) errors.push('Embedded wallet client is not hard-gated to Testnet.');
if (!embeddedWalletSource.includes('Wallet.generate()')) errors.push('Embedded wallet is not generating the XRPL keypair in the browser.');
if (!embeddedWalletSource.includes("crypto.subtle.encrypt")) errors.push('Embedded wallet client is missing local Web Crypto encryption.');
if (!embeddedWalletSource.includes("extensions:{prf:")) errors.push('Embedded wallet client is missing WebAuthn PRF authorization support.');
if (!embeddedWalletSource.includes("userVerification:'required'")) errors.push('Wallet passkey operations must require WebAuthn user verification.');
if (/localStorage|sessionStorage/.test(embeddedWalletSource) && /seed/i.test(embeddedWalletSource)) errors.push('Embedded wallet source may persist seed material in web storage.');
if (/state\.(?:wallet|seed)\b/.test(embeddedWalletSource)) errors.push('v234.1 must not keep a wallet or seed in persistent module state.');
if (/AUTO_LOCK_MS/.test(embeddedWalletSource)) errors.push('v234.1 should use operation-scoped key decryption rather than a timed unlocked-wallet session.');
if (!embeddedWalletSource.includes('withDecryptedWallet(state.record,vault,async(wallet)=>wallet.sign(tx))')) errors.push('v234.1 must decrypt and sign inside the operation-scoped wallet callback.');
if (!embeddedWalletSource.includes('FRESH AUTH PER PAYMENT')) errors.push('v234.2 fresh-authorization payment marker is missing.');
if (!embeddedWalletSource.includes('/api/embedded-wallet?action=pay-ledger-prepare')) errors.push('v234.2.5 wallet must prepare XRPL ledger fields through the authenticated ATM Pay API.');
if (!embeddedWalletSource.includes('Number(preparedLedger.ledger_index)')) errors.push('v234.2.6 client must read the server payment-preparation ledger_index field.');
if (embeddedWalletSource.includes('Number(preparedLedger.ledgerIndex)')) errors.push('v234.2.6 client must not use the obsolete ledgerIndex response field.');
if (!embeddedWalletSource.includes('/api/embedded-wallet?action=pay-ledger-recheck')) errors.push('v234.2.5 wallet must recheck live XRPL sequence/ledger through the authenticated ATM Pay API before signing.');
if (!embeddedWalletSource.includes('/api/embedded-wallet?action=pay-relay-submit')) errors.push('v234.2.5 wallet must relay only the locally signed transaction blob through the authenticated ATM Pay API.');
if (/testnetRpc\(|prepareTestnetPaymentTx|submitSignedBlobAndWait|new xrpl\.Client|submitAndWait\(|client\.autofill\(/.test(embeddedWalletSource)) errors.push('v234.2.5 browser wallet must not depend on direct XRPL network transport.');
if (!embeddedWalletSource.includes('MAX_TEST_PAYMENT_DROPS = 10_000_000n')) errors.push('Small-payment hard cap is missing.');
if (!embeddedWalletSource.includes('MAX_TEST_FEE_DROPS = 10_000n')) errors.push('Fee safety ceiling is missing.');
if (!embeddedWalletSource.includes('PAYMENT_PREVIEW_TTL_MS = 60 * 1000')) errors.push('Prepared-payment expiry guard is missing.');
if (!embeddedWalletSource.includes('PAYMENT_TX_FIELDS')) errors.push('v234.1 transaction-field allowlist is missing.');
if (!embeddedWalletSource.includes('intentDigest')) errors.push('v234.1 canonical transaction-intent digest is missing.');
if (!embeddedWalletSource.includes('recheckLiveLedgerBeforeSigning')) errors.push('v234.1 live ledger/sequence recheck is missing.');
if (/atmWalletConfirmSuffix|atmWalletPaymentDestination|verifyDestinationSuffix|Full destination|Type the last 6/i.test(embeddedWalletSource)) errors.push('v234.2 normal ATM Pay flow must not ask users to type or verify XRPL wallet addresses.');
if (!embeddedWalletSource.includes('/api/embedded-wallet?action=pay-prepare')) errors.push('v234.2 client is missing server-bound ATM Pay intent preparation.');
if (!embeddedWalletSource.includes('/api/embedded-wallet?action=pay-verify')) errors.push('v234.2 client is missing pre-sign ATM Pay recipient re-verification.');
if (!embeddedWalletSource.includes('/api/embedded-wallet?action=pay-submitted')) errors.push('v234.2 client must durably mark the locally signed transaction hash before XRPL broadcast.');
if (!embeddedWalletSource.includes('/api/embedded-wallet?action=pay-complete')) errors.push('v234.2 client is missing post-ledger ATM Pay verification/activity recording.');
if (!embeddedWalletSource.includes('atmPayIntentId') || !embeddedWalletSource.includes('recipientUserId') || !embeddedWalletSource.includes('recipientHandle')) errors.push('v234.2 canonical signing digest must bind ATM Pay identity to the XRPL transaction.');
if (!embeddedWalletSource.includes("ATM_PAY_MEMO_TYPE = 'ATM-PAY-INTENT'") || !embeddedWalletSource.includes('expectedIntentMemos(intentId)') || !atmPaySource.includes('intentMemos(intent.id)')) errors.push('v234.2 must bind the unique ATM Pay intent ID into the signed XRPL Payment memo.');
if (/escapeHtml\(prepared\.destination\)|\$\{prepared\.destination\}/.test(embeddedWalletSource)) errors.push('v234.2 must not render the settlement address in the normal payment review.');
if (!embeddedWalletSource.includes('copyEmergencySeed')) errors.push('v234.1 emergency seed export path is missing.');
if (/\$\{\s*(?:escapeHtml\(\s*)?seed\b|textContent\s*=\s*seed/i.test(embeddedWalletSource)) errors.push('Emergency seed material must never be rendered into page HTML.');
if (!/pay-relay-submit[^\n]*tx_blob/i.test(embeddedWalletSource)) errors.push('v234.2.5 signed XRPL blob relay is missing from the local-signing flow.');
if (/walletApi\([^\n]*(?:seed|private[_-]?key)/i.test(embeddedWalletSource)) errors.push('Plaintext wallet secrets must never be sent through the ATM Town API.');
if (!embeddedWalletApiSource.includes("const NETWORK = 'testnet'")) errors.push('Embedded wallet API is not hard-gated to Testnet.');
if (!embeddedWalletApiSource.includes('xrplTestnetRpc')) errors.push('Embedded wallet API must use the resilient shared Testnet RPC helper.');
if (!testnetRpcSource.includes('XRPL_TESTNET_RPC_URL')) errors.push('Shared Testnet RPC helper must honor XRPL_TESTNET_RPC_URL override.');
if (!testnetRpcSource.includes('AbortSignal.timeout')) errors.push('Shared Testnet RPC helper is missing a bounded request timeout.');
for (const host of ['testnet.xrpl-labs.com','testnet.honeycluster.io','s.altnet.rippletest.net:51234']) { if (!testnetRpcSource.includes(host)) errors.push(`Shared Testnet RPC helper missing endpoint: ${host}`); }
if (!embeddedWalletApiSource.includes('assertExactKeys')) errors.push('v234.1 encrypted-backup exact-schema validation is missing.');
if (!embeddedWalletApiSource.includes('existing.address !== address')) errors.push('v234.1 must block silent replacement of an account embedded-wallet address.');
if (/s1\.ripple\.com|xrplcluster\.com|force_network[^\n]*MAINNET/i.test(embeddedWalletApiSource)) errors.push('Embedded wallet API contains a Mainnet endpoint/marker.');
if (!embeddedWalletApiSource.includes("from('embedded_wallets')")) errors.push('Embedded wallet API is not isolated to embedded_wallets.');
if (/from\('player_accounts'\)/.test(embeddedWalletApiSource)) errors.push('Embedded wallet API must not overwrite player_accounts.wallet_address.');
if (!embeddedWalletSql.includes('alter table public.embedded_wallets enable row level security')) errors.push('Embedded wallet table must have RLS enabled.');
if (/create policy/i.test(embeddedWalletSql)) errors.push('v234 embedded_wallets should expose no direct browser RLS policies.');

if (!embeddedWalletApiSource.includes('isAtmPayAction(action)')) errors.push('v234.2 ATM Pay must route through the existing embedded-wallet serverless function.');
if (!atmPaySource.includes("new Set(['pay-status','pay-search','pay-activity'")) errors.push('v234.2 ATM Pay action router is missing.');
if (!atmPaySource.includes("from('atm_pay_profiles')") || !atmPaySource.includes("from('atm_pay_intents')") || !atmPaySource.includes("from('atm_pay_requests')")) errors.push('v234.2 ATM Pay server persistence is incomplete.');
if (!atmPaySource.includes("route_type: 'embedded'") || !atmPaySource.includes("network: NETWORK") || !atmPaySource.includes("asset: ASSET")) errors.push('v234.2 ATM Pay intent route/network/asset binding is missing.');
if (!atmPaySource.includes("rpc('tx', [{ transaction: txHash, binary: false }])")) errors.push('v234.2 server must independently look up the final XRPL transaction by hash.');
if (!atmPaySource.includes('xrplTestnetRpc')) errors.push('v234.2.5 ATM Pay server transport must use resilient Testnet RPC fallback.');
if (!atmPaySource.includes('async function prepareLedgerTransaction') || !atmPaySource.includes("'pay-ledger-prepare'")) errors.push('v234.2.5 server-side XRPL transaction preparation is missing.');
if (!atmPaySource.includes('return { tx, ledger_index: ledgerIndex };')) errors.push('v234.2.6 server payment preparation must return ledger_index explicitly.');
if (!atmPaySource.includes('async function recheckLedgerTransaction') || !atmPaySource.includes("'pay-ledger-recheck'")) errors.push('v234.2.5 server-side pre-sign ledger recheck is missing.');
if (!atmPaySource.includes('async function relaySignedTransaction') || !atmPaySource.includes("'pay-relay-submit'") || !atmPaySource.includes("rpc('submit'")) errors.push('v234.2.5 signed-blob XRPL relay is missing.');
if (!atmPaySource.includes('assertTxBlob') || !atmPaySource.includes('MAX_TX_BLOB_HEX')) errors.push('v234.2.5 signed transaction relay input validation is missing.');
if (!atmPaySource.includes("txResult?.validated === true") || !atmPaySource.includes("tx?.Account !== senderWallet.address") || !atmPaySource.includes("tx?.Destination !== intent.destination_address") || !atmPaySource.includes("String(tx?.Amount || '') !== String(intent.amount_drops)") || !atmPaySource.includes('intentMemoMatches(tx, intent.id)')) errors.push('v234.2 server-side validated-ledger payment matching is incomplete.');
if (!atmPaySource.includes('async function markSubmitted') || !atmPaySource.includes("'pay-submitted'")) errors.push('v234.2 server must persist a submitted transaction hash before broadcast for retry-safe UX.');
if (/body\?\.(?:seed|secret|private[_-]?key)|req\.body\?\.(?:seed|secret|private[_-]?key)/i.test(atmPaySource)) errors.push('ATM Pay server helper must never accept plaintext wallet secret fields.');
for (const table of ['atm_pay_profiles','atm_pay_intents','atm_pay_requests']) {
  if (!atmPaySql.includes(`alter table public.${table} enable row level security`)) errors.push(`v234.2 ${table} must have RLS enabled.`);
}
if (/create policy/i.test(atmPaySql)) errors.push('v234.2 ATM Pay tables should expose no direct browser RLS policies.');
if (!atmPaySql.includes("handle ~ '^[a-z0-9_]{3,20}$'")) errors.push('v234.2 ATM Pay handle format constraint is missing.');
if (!atmPaySql.includes('atm_pay_intents_one_active_request_idx') || !atmPaySql.includes("status in ('pending','submitted','validated')")) errors.push('v234.2 payment requests need a database guard against duplicate active/completed payments.');


// v234.2.2 browser-runtime hardening: all executable JavaScript must be external.
const vercelConfig = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
const securityHeaders = vercelConfig?.headers?.[0]?.headers || [];
const headerValue = (name) => String(securityHeaders.find((header) => String(header.key).toLowerCase() === name.toLowerCase())?.value || '');
const csp = headerValue('Content-Security-Policy');
if (!csp) errors.push('v234.1 Content-Security-Policy header is missing.');
if (!csp.includes("object-src 'none'") || !csp.includes("frame-ancestors 'none'") || !csp.includes("base-uri 'none'") || !csp.includes("script-src-attr 'none'")) errors.push('v234.1 CSP is missing baseline object/frame/base/script-attribute restrictions.');
const scriptDirective = csp.split(';').map((part) => part.trim()).find((part) => part.startsWith('script-src ')) || '';
if (!scriptDirective) errors.push('v234.1 CSP script-src directive is missing.');
if (scriptDirective.includes("'unsafe-inline'") || scriptDirective.includes("'unsafe-eval'")) errors.push('v234.1 script-src must not allow unsafe-inline or unsafe-eval.');
if (scriptDirective.includes('unpkg.com')) errors.push('v234.1 CSP must not authorize the removed unpkg runtime fallback.');
if (/sha256-/i.test(scriptDirective)) errors.push('v234.2.2 CSP must not depend on inline-script hashes.');
for (const endpoint of ['testnet.xrpl-labs.com','testnet.honeycluster.io','s.altnet.rippletest.net','clio.altnet.rippletest.net']) { if (csp.includes(endpoint)) errors.push(`v234.2.5 browser CSP must not connect directly to XRPL Testnet endpoint: ${endpoint}.`); }
const executableInlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter((match) => !/\bsrc\s*=/.test(match[1]) && match[2].trim().length > 0);
if (executableInlineScripts.length) errors.push(`v234.2.2 forbids executable inline JavaScript; found ${executableInlineScripts.length} inline block(s).`);
for (const runtimeFile of [
  'js/runtime/game-core.js',
  'js/runtime/sky-run.js',
  'js/runtime/platform-panic.js',
  'js/runtime/ring-rumble.js',
  'js/runtime/flappy-jetpack.js',
  'js/runtime/darts.js',
]) {
  if (!html.includes(`<script src="${runtimeFile}"></script>`)) errors.push(`index.html does not load external runtime script: ${runtimeFile}`);
}
for (const requiredHeader of ['Referrer-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Cross-Origin-Opener-Policy', 'Permissions-Policy', 'Strict-Transport-Security']) {
  if (!headerValue(requiredHeader)) errors.push(`v234.1 security header is missing: ${requiredHeader}`);
}
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (packageJson?.scripts?.['security:headers'] !== 'node scripts/generate-security-headers.mjs') errors.push('package.json security:headers generator command is missing.');

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
const sourceBundle = `${html}\n${configSource}\n${gameRuntimeSource}`;
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
  // Runtime files execute as classic browser scripts. Check them from a temporary
  // directory outside this package's module scope so node --check uses Script semantics.
  const classicRuntimeFiles = [
    'js/runtime/game-core.js',
    'js/runtime/sky-run.js',
    'js/runtime/platform-panic.js',
    'js/runtime/ring-rumble.js',
    'js/runtime/flappy-jetpack.js',
    'js/runtime/darts.js',
  ];
  for (let index = 0; index < classicRuntimeFiles.length; index += 1) {
    const relative = classicRuntimeFiles[index];
    const source = await readFile(path.join(root, relative), 'utf8');
    const target = path.join(tempDirectory, `classic-runtime-${index + 1}.js`);
    await writeFile(target, source);
    const result = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
    if (result.status !== 0) errors.push(`Classic runtime JavaScript failed syntax for ${relative}:\n${result.stderr.trim()}`);
  }

  const syntaxTargets = [
    'js/config.js', 'js/maps.js', 'js/interactions.js', 'js/world-streaming.js', 'js/bootstrap.js', 'js/wallet/embedded-wallet.js',
    'lib/auth.js', 'lib/xaman-vending.js', 'lib/xrpl-nft-trading.js', 'lib/atm-pay.js', 'lib/xrpl-testnet-rpc.js',
    'api/xrpl-inventory.js', 'api/xrpl-nft-metadata.js', 'api/leaderboards.js', 'api/xrpl-nft-trade.js',
    'api/xaman-link.js', 'api/xaman-vending-start.js', 'api/xaman-vending-status.js', 'api/xaman-vending-webhook.js', 'api/embedded-wallet.js',
    'server/xaman-link-start.js', 'server/xaman-link-status.js',
    'server/xrpl-nft-offer-start.js', 'server/xrpl-nft-offer-accept-start.js', 'server/xrpl-nft-offer-status.js', 'server/xrpl-nft-offers.js',
    'scripts/generate-security-headers.mjs'
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
  console.error(`ATM Town v234.2.6 build validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('ATM Town v234.2.6 build validation passed.');
console.log(`Checked ${requiredFiles.length} required files, ${assetRefs.size} direct asset references, ${dayFiles.length} day/night foreground pairs, map masks, duplicate IDs, zero executable inline scripts, and all external classic runtime scripts.`);
