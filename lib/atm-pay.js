import { randomUUID } from 'node:crypto';
import { xrplTestnetRpc } from './xrpl-testnet-rpc.js';
const NETWORK = 'testnet';
const ASSET = 'XRP';
const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_RE = /^[A-F0-9]{64}$/i;
const CLASSIC_ADDRESS_RE = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
const MAX_PAYMENT_DROPS = 10_000_000n;
const MAX_TEST_FEE_DROPS = 10_000n;
const LEDGER_EXPIRY_OFFSET = 20;
const TX_BLOB_RE = /^[A-F0-9]+$/i;
const MAX_TX_BLOB_HEX = 8192;
const INTENT_TTL_MS = 2 * 60 * 1000;
const REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ATM_PAY_MEMO_TYPE = 'ATM-PAY-INTENT';
const RESERVED_HANDLES = new Set(['admin','administrator','support','help','security','system','official','atmtown','atm_town','atm','payments','payment','pay','cashapp','venmo','xaman','xrpl']);

function badRequest(message) { return Object.assign(new Error(message), { status: 400 }); }
function notFound(message) { return Object.assign(new Error(message), { status: 404 }); }
function conflict(message) { return Object.assign(new Error(message), { status: 409 }); }
function tableMissing(error) {
  const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  return text.includes('42p01') || text.includes('does not exist') || text.includes('could not find the table');
}
function setupError(error) {
  if (!tableMissing(error)) return error;
  return Object.assign(new Error('ATM Pay database setup is required. Run supabase/ATM-Town-v234.2.sql in Supabase SQL Editor.'), { status: 503 });
}
function cleanHandle(value) {
  return String(value || '').trim().toLowerCase().replace(/^@+/, '');
}
function assertHandle(value) {
  const handle = cleanHandle(value);
  if (!HANDLE_RE.test(handle)) throw badRequest('ATM Pay handles must be 3–20 characters using lowercase letters, numbers, or underscore.');
  if (RESERVED_HANDLES.has(handle)) throw badRequest('That ATM Pay handle is reserved. Choose another one.');
  return handle;
}
function cleanSearch(value) {
  return String(value || '').trim().replace(/^@+/, '').replace(/[^a-z0-9_ .-]/gi, '').slice(0, 30);
}
function cleanNote(value) {
  return String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 80);
}
function assertUuid(value, label = 'ID') {
  const id = String(value || '').trim();
  if (!UUID_RE.test(id)) throw badRequest(`${label} is invalid.`);
  return id;
}
function assertDrops(value) {
  const text = String(value ?? '').trim();
  if (!/^[1-9][0-9]*$/.test(text)) throw badRequest('Payment amount is invalid.');
  const drops = BigInt(text);
  if (drops <= 0n || drops > MAX_PAYMENT_DROPS) throw badRequest('ATM Pay Testnet payments are currently limited to 10 XRP per payment.');
  return drops.toString();
}
function dropsToXrp(drops) {
  const value = BigInt(String(drops || '0'));
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, '0');
  return `${whole}.${fraction}`;
}
function memoHex(value) {
  return Buffer.from(String(value || ''), 'utf8').toString('hex').toUpperCase();
}
function intentMemoMatches(tx, intentId) {
  const memos = tx?.Memos;
  if (!Array.isArray(memos) || memos.length !== 1 || !memos[0]?.Memo || Object.keys(memos[0]).length !== 1) return false;
  const memo = memos[0].Memo;
  const keys = Object.keys(memo).sort();
  return keys.length === 2
    && keys[0] === 'MemoData'
    && keys[1] === 'MemoType'
    && String(memo.MemoType || '').toUpperCase() === memoHex(ATM_PAY_MEMO_TYPE)
    && String(memo.MemoData || '').toUpperCase() === memoHex(intentId);
}
function suggestedHandle(displayName, userId) {
  const base = String(displayName || '').toLowerCase().replace(/[^a-z0-9_]+/g, '').slice(0, 16);
  if (base.length >= 3 && !RESERVED_HANDLES.has(base)) return base;
  return `atm${String(userId || '').replace(/-/g, '').slice(0, 8)}`;
}
async function readProfile(admin, userId) {
  const { data, error } = await admin.from('atm_pay_profiles').select('user_id,handle,created_at,updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw setupError(error);
  return data || null;
}
async function readPlayer(admin, userId) {
  const { data, error } = await admin.from('player_accounts').select('user_id,display_name,selected_character').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data || { user_id: userId, display_name: 'ATM Player', selected_character: 'classic' };
}
async function readWallet(admin, userId) {
  const { data, error } = await admin.from('embedded_wallets').select('user_id,network,address').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.network !== NETWORK || !CLASSIC_ADDRESS_RE.test(String(data.address || ''))) throw conflict('ATM Pay wallet routing is not valid for Testnet.');
  return data;
}
async function identity(admin, userId) {
  const [profile, player, wallet] = await Promise.all([readProfile(admin, userId), readPlayer(admin, userId), readWallet(admin, userId)]);
  return {
    user_id: userId,
    handle: profile?.handle || null,
    display_name: String(player?.display_name || 'ATM Player').slice(0, 30),
    character_id: String(player?.selected_character || 'classic').slice(0, 40),
    wallet_ready: Boolean(wallet),
    wallet,
  };
}
async function rpc(method, params) {
  return xrplTestnetRpc(method, params, { retryXrplCodes: method === 'tx' ? ['txnNotFound'] : [] });
}

function safeFeeDrops(feeResult) {
  const drops = feeResult?.drops || {};
  const candidates = [drops.open_ledger_fee, drops.minimum_fee, drops.base_fee].map((value) => BigInt(String(value || '0')));
  const base = candidates.reduce((max, value) => value > max ? value : max, 0n);
  if (base <= 0n) throw conflict('XRPL Testnet did not return a usable network fee.');
  const buffered = (base * 12n + 9n) / 10n;
  if (buffered > MAX_TEST_FEE_DROPS) throw conflict('XRPL Testnet fee is above the ATM Pay safety limit.');
  return buffered;
}

function intentMemos(intentId) {
  return [{ Memo: { MemoType: memoHex(ATM_PAY_MEMO_TYPE), MemoData: memoHex(intentId) } }];
}

function assertTxBlob(value) {
  const blob = String(value || '').trim().toUpperCase();
  if (!blob || blob.length % 2 !== 0 || blob.length > MAX_TX_BLOB_HEX || !TX_BLOB_RE.test(blob)) throw badRequest('Signed XRPL transaction blob is invalid.');
  return blob;
}

async function prepareLedgerTransaction(admin, user, body) {
  const intentId = assertUuid(body?.intent_id, 'Payment intent');
  const intent = await getIntent(admin, user.id, intentId);
  const recipient = await verifyIntentRouting(admin, intent);
  const senderWallet = await readWallet(admin, user.id);
  if (!senderWallet) throw conflict('Sender ATM Pay wallet is unavailable.');
  const [accountInfo, feeInfo] = await Promise.all([
    rpc('account_info', [{ account: senderWallet.address, ledger_index: 'current', queue: true }]),
    rpc('fee', [{}]),
  ]);
  const sequence = Number(accountInfo?.account_data?.Sequence);
  const ledgerIndex = Number(feeInfo?.ledger_current_index || accountInfo?.ledger_current_index || accountInfo?.ledger_index || 0);
  const feeDrops = safeFeeDrops(feeInfo);
  if (!Number.isSafeInteger(sequence) || sequence <= 0) throw conflict('XRPL Testnet did not return a valid account sequence.');
  if (!Number.isSafeInteger(ledgerIndex) || ledgerIndex <= 0) throw conflict('XRPL Testnet did not return a valid ledger index.');
  const tx = {
    TransactionType: 'Payment',
    Account: senderWallet.address,
    Destination: recipient.wallet.address,
    Amount: String(intent.amount_drops),
    Fee: feeDrops.toString(),
    Sequence: sequence,
    LastLedgerSequence: ledgerIndex + LEDGER_EXPIRY_OFFSET,
    Memos: intentMemos(intent.id),
  };
  return { tx, ledger_index: ledgerIndex };
}

async function recheckLedgerTransaction(admin, user, body) {
  const intentId = assertUuid(body?.intent_id, 'Payment intent');
  const intent = await getIntent(admin, user.id, intentId);
  await verifyIntentRouting(admin, intent);
  const senderWallet = await readWallet(admin, user.id);
  if (!senderWallet) throw conflict('Sender ATM Pay wallet is unavailable.');
  const [accountInfo, feeInfo] = await Promise.all([
    rpc('account_info', [{ account: senderWallet.address, ledger_index: 'validated', queue: false }]),
    rpc('fee', [{}]),
  ]);
  const sequence = Number(accountInfo?.account_data?.Sequence);
  const ledgerIndex = Number(feeInfo?.ledger_current_index || accountInfo?.ledger_index || 0);
  if (!Number.isSafeInteger(sequence) || sequence <= 0 || !Number.isSafeInteger(ledgerIndex) || ledgerIndex <= 0) throw conflict('ATM Pay could not confirm the live XRPL Testnet ledger.');
  return { sequence, ledger_index: ledgerIndex };
}

async function relaySignedTransaction(admin, user, body) {
  const intentId = assertUuid(body?.intent_id, 'Payment intent');
  const txHash = String(body?.tx_hash || '').trim().toUpperCase();
  if (!HASH_RE.test(txHash)) throw badRequest('XRPL transaction hash is invalid.');
  const txBlob = assertTxBlob(body?.tx_blob);
  const intent = await getIntent(admin, user.id, intentId);
  if (intent.status === 'validated' && String(intent.tx_hash || '').toUpperCase() === txHash) {
    return { submitted: true, validated: true, tx_hash: txHash, engine_result: intent.result_code || 'tesSUCCESS' };
  }
  if (intent.status !== 'submitted' || String(intent.tx_hash || '').toUpperCase() !== txHash) throw conflict('ATM Pay must record this locally signed transaction before relay.');
  await verifyCurrentIntentRoute(admin, intent);
  const result = await rpc('submit', [{ tx_blob: txBlob, fail_hard: false }]);
  const returnedHash = String(result?.tx_json?.hash || result?.tx_json?.Hash || '').toUpperCase();
  if (returnedHash && returnedHash !== txHash) throw conflict('XRPL returned a different transaction hash than ATM Pay expected.');
  return { submitted: true, validated: false, tx_hash: txHash, engine_result: String(result?.engine_result || 'UNKNOWN') };
}

function publicIdentity(value) {
  return {
    user_id: value.user_id,
    handle: value.handle,
    display_name: value.display_name,
    character_id: value.character_id,
    atm_pay_ready: Boolean(value.handle && value.wallet_ready),
  };
}

async function activityIdentityMap(admin, userIds) {
  const ids = [...new Set((userIds || []).map((value) => String(value || '')).filter((value) => UUID_RE.test(value)))];
  if (!ids.length) return new Map();
  const [{ data: profiles, error: profilesError }, { data: players, error: playersError }] = await Promise.all([
    admin.from('atm_pay_profiles').select('user_id,handle').in('user_id', ids),
    admin.from('player_accounts').select('user_id,display_name,selected_character').in('user_id', ids),
  ]);
  if (profilesError) throw setupError(profilesError);
  if (playersError) throw playersError;
  const profileMap = new Map((profiles || []).map((row) => [row.user_id, row]));
  const playerMap = new Map((players || []).map((row) => [row.user_id, row]));
  return new Map(ids.map((userId) => {
    const profile = profileMap.get(userId) || {};
    const player = playerMap.get(userId) || {};
    return [userId, {
      user_id: userId,
      handle: String(profile.handle || ''),
      display_name: String(player.display_name || 'ATM Player').slice(0, 30),
      character_id: String(player.selected_character || 'classic').slice(0, 40),
      atm_pay_ready: Boolean(profile.handle),
    }];
  }));
}
async function resolveRecipient(admin, recipientId) {
  const recipient = await identity(admin, recipientId);
  if (!recipient.handle) throw conflict('That player has not finished ATM Pay setup yet.');
  if (!recipient.wallet_ready || !recipient.wallet) throw conflict('That player cannot receive ATM Pay Testnet payments yet.');
  return recipient;
}
async function getIntent(admin, userId, intentId) {
  const { data, error } = await admin.from('atm_pay_intents').select('*').eq('id', intentId).eq('sender_user_id', userId).maybeSingle();
  if (error) throw setupError(error);
  if (!data) throw notFound('ATM Pay payment intent was not found.');
  return data;
}
async function verifyCurrentIntentRoute(admin, intent) {
  if (intent.network !== NETWORK || intent.asset !== ASSET || intent.route_type !== 'embedded') throw conflict('ATM Pay route is no longer valid.');
  const recipient = await resolveRecipient(admin, intent.recipient_user_id);
  if (recipient.handle !== intent.recipient_handle || recipient.wallet.address !== intent.destination_address) throw conflict('The recipient payment route changed. Review the payment again.');
  return recipient;
}

async function verifyIntentRouting(admin, intent) {
  if (intent.status !== 'pending') throw conflict('This ATM Pay payment is no longer pending.');
  if (Date.parse(intent.expires_at || '') <= Date.now()) {
    await admin.from('atm_pay_intents').update({ status: 'expired' }).eq('id', intent.id).eq('status', 'pending');
    throw conflict('This ATM Pay review expired. Review the payment again.');
  }
  return verifyCurrentIntentRoute(admin, intent);
}

async function status(admin, user) {
  const own = await identity(admin, user.id);
  return {
    profile: own.handle ? publicIdentity(own) : null,
    wallet_ready: own.wallet_ready,
    suggested_handle: suggestedHandle(own.display_name, user.id),
    display_name: own.display_name,
    network: NETWORK,
  };
}

async function claimHandle(admin, user, body) {
  const handle = assertHandle(body?.handle);
  const wallet = await readWallet(admin, user.id);
  if (!wallet) throw conflict('Set up the ATM embedded Testnet wallet before claiming an ATM Pay handle.');
  const existing = await readProfile(admin, user.id);
  if (existing) {
    if (existing.handle !== handle) throw conflict('ATM Pay handle changes are locked in this release to protect payment identity.');
    const own = await identity(admin, user.id);
    return { profile: publicIdentity(own), created: false };
  }
  const now = new Date().toISOString();
  const { error } = await admin.from('atm_pay_profiles').insert({ user_id: user.id, handle, created_at: now, updated_at: now });
  if (error) {
    if (String(error.code || '') === '23505') throw conflict(`@${handle} is already taken.`);
    throw setupError(error);
  }
  const own = await identity(admin, user.id);
  return { profile: publicIdentity(own), created: true };
}

async function searchRecipients(admin, user, query) {
  const q = cleanSearch(query);
  if (q.length < 2) return { results: [] };
  const lower = q.toLowerCase();
  const ids = new Set();
  const { data: handleRows, error: handleError } = await admin.from('atm_pay_profiles').select('user_id,handle').ilike('handle', `${lower}%`).limit(12);
  if (handleError) throw setupError(handleError);
  for (const row of handleRows || []) if (row.user_id !== user.id) ids.add(row.user_id);
  const { data: playerRows, error: playerError } = await admin.from('player_accounts').select('user_id,display_name').ilike('display_name', `%${q}%`).limit(12);
  if (playerError) throw playerError;
  for (const row of playerRows || []) if (row.user_id !== user.id) ids.add(row.user_id);
  if (!ids.size) return { results: [] };
  const userIds = [...ids].slice(0, 20);
  const [{ data: profiles, error: profilesError }, { data: players, error: playersError }, { data: wallets, error: walletsError }] = await Promise.all([
    admin.from('atm_pay_profiles').select('user_id,handle').in('user_id', userIds),
    admin.from('player_accounts').select('user_id,display_name,selected_character').in('user_id', userIds),
    admin.from('embedded_wallets').select('user_id,network').in('user_id', userIds).eq('network', NETWORK),
  ]);
  if (profilesError) throw setupError(profilesError);
  if (playersError) throw playersError;
  if (walletsError) throw walletsError;
  const profileMap = new Map((profiles || []).map((row) => [row.user_id, row]));
  const playerMap = new Map((players || []).map((row) => [row.user_id, row]));
  const walletIds = new Set((wallets || []).map((row) => row.user_id));
  const results = userIds.map((userId) => {
    const profile = profileMap.get(userId);
    if (!profile || !walletIds.has(userId)) return null;
    const player = playerMap.get(userId) || {};
    return {
      user_id: userId,
      handle: profile.handle,
      display_name: String(player.display_name || 'ATM Player').slice(0, 30),
      character_id: String(player.selected_character || 'classic').slice(0, 40),
      atm_pay_ready: true,
    };
  }).filter(Boolean);
  results.sort((a, b) => {
    const ax = a.handle === lower ? 0 : a.handle.startsWith(lower) ? 1 : 2;
    const bx = b.handle === lower ? 0 : b.handle.startsWith(lower) ? 1 : 2;
    return ax - bx || a.handle.localeCompare(b.handle);
  });
  return { results: results.slice(0, 8) };
}

async function prepareIntent(admin, user, body) {
  const sender = await identity(admin, user.id);
  if (!sender.handle) throw conflict('Finish ATM Pay setup before sending money.');
  if (!sender.wallet_ready || !sender.wallet) throw conflict('Set up the ATM embedded Testnet wallet before sending money.');
  const recipientId = assertUuid(body?.recipient_id, 'Recipient');
  if (recipientId === user.id) throw badRequest('Choose another ATM Town player.');
  const amountDrops = assertDrops(body?.amount_drops);
  let note = cleanNote(body?.note);
  const recipient = await resolveRecipient(admin, recipientId);
  let requestId = null;
  if (body?.request_id) {
    requestId = assertUuid(body.request_id, 'Payment request');
    const { data: request, error } = await admin.from('atm_pay_requests').select('*').eq('id', requestId).eq('payer_user_id', user.id).maybeSingle();
    if (error) throw setupError(error);
    if (!request || request.status !== 'pending') throw conflict('That ATM Pay request is no longer payable.');
    if (request.requester_user_id !== recipientId || String(request.amount_drops) !== amountDrops) throw conflict('The payment no longer matches the request.');
    if (Date.parse(request.expires_at || '') <= Date.now()) throw conflict('That ATM Pay request expired.');
    note = cleanNote(request.note);
  }
  const id = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INTENT_TTL_MS).toISOString();
  const row = {
    id,
    sender_user_id: user.id,
    recipient_user_id: recipientId,
    recipient_handle: recipient.handle,
    recipient_display_name: recipient.display_name,
    route_type: 'embedded',
    network: NETWORK,
    asset: ASSET,
    amount_drops: amountDrops,
    destination_address: recipient.wallet.address,
    note,
    status: 'pending',
    request_id: requestId,
    created_at: now.toISOString(),
    expires_at: expiresAt,
  };
  const { error } = await admin.from('atm_pay_intents').insert(row);
  if (error) {
    if (String(error.code || '') === '23505' && requestId) throw conflict('That ATM Pay request already has a payment in progress or completed.');
    throw setupError(error);
  }
  return {
    intent: {
      id,
      recipient: publicIdentity(recipient),
      amount_drops: amountDrops,
      amount_xrp: dropsToXrp(amountDrops),
      note,
      network: NETWORK,
      asset: ASSET,
      expires_at: expiresAt,
      request_id: requestId,
      // Internal settlement field. The ATM Pay UI must never render this value.
      destination_address: recipient.wallet.address,
    },
  };
}

async function verifyIntent(admin, user, body) {
  const intentId = assertUuid(body?.intent_id, 'Payment intent');
  const intent = await getIntent(admin, user.id, intentId);
  const recipient = await verifyIntentRouting(admin, intent);
  return {
    valid: true,
    intent: {
      id: intent.id,
      recipient: publicIdentity(recipient),
      amount_drops: String(intent.amount_drops),
      network: intent.network,
      asset: intent.asset,
      expires_at: intent.expires_at,
      destination_address: recipient.wallet.address,
    },
  };
}

async function cancelIntent(admin, user, body) {
  const intentId = assertUuid(body?.intent_id, 'Payment intent');
  const { error } = await admin.from('atm_pay_intents').update({ status: 'cancelled' }).eq('id', intentId).eq('sender_user_id', user.id).eq('status', 'pending');
  if (error) throw setupError(error);
  return { cancelled: true };
}

async function markSubmitted(admin, user, body) {
  const intentId = assertUuid(body?.intent_id, 'Payment intent');
  const txHash = String(body?.tx_hash || '').trim().toUpperCase();
  if (!HASH_RE.test(txHash)) throw badRequest('XRPL transaction hash is invalid.');
  const intent = await getIntent(admin, user.id, intentId);
  if (intent.status === 'validated' && String(intent.tx_hash || '').toUpperCase() === txHash) return { submitted: true, validated: true, tx_hash: txHash };
  if (intent.status === 'submitted') {
    if (String(intent.tx_hash || '').toUpperCase() !== txHash) throw conflict('This ATM Pay payment already has a different submitted transaction.');
    return { submitted: true, validated: false, tx_hash: txHash };
  }
  await verifyIntentRouting(admin, intent);
  const { error } = await admin.from('atm_pay_intents').update({ status: 'submitted', tx_hash: txHash }).eq('id', intent.id).eq('sender_user_id', user.id).eq('status', 'pending');
  if (error) {
    if (String(error.code || '') === '23505') throw conflict('That XRPL transaction is already attached to another ATM Pay payment.');
    throw setupError(error);
  }
  return { submitted: true, validated: false, tx_hash: txHash };
}

async function completeIntent(admin, user, body) {
  const intentId = assertUuid(body?.intent_id, 'Payment intent');
  const txHash = String(body?.tx_hash || '').trim().toUpperCase();
  if (!HASH_RE.test(txHash)) throw badRequest('XRPL transaction hash is invalid.');
  const intent = await getIntent(admin, user.id, intentId);
  if (intent.status === 'validated' && String(intent.tx_hash || '').toUpperCase() === txHash) {
    return { validated: true, result: intent.result_code || 'tesSUCCESS', ledger_index: intent.ledger_index, tx_hash: txHash };
  }
  if (!['pending', 'submitted'].includes(intent.status)) throw conflict('This ATM Pay payment cannot be completed from its current state.');
  const senderWallet = await readWallet(admin, user.id);
  if (!senderWallet) throw conflict('Sender ATM Pay wallet is unavailable.');
  let txResult;
  try {
    txResult = await rpc('tx', [{ transaction: txHash, binary: false }]);
  } catch (error) {
    if (error?.xrplCode === 'txnNotFound') return { validated: false, pending: true, tx_hash: txHash };
    throw error;
  }
  const tx = txResult?.tx_json || txResult?.tx || txResult;
  const resultCode = String(txResult?.meta?.TransactionResult || '');
  const validated = txResult?.validated === true;
  if (!validated) return { validated: false, pending: true, tx_hash: txHash };
  if (tx?.TransactionType !== 'Payment' || tx?.Account !== senderWallet.address || tx?.Destination !== intent.destination_address || String(tx?.Amount || '') !== String(intent.amount_drops) || !intentMemoMatches(tx, intent.id)) {
    throw conflict('Validated XRPL transaction does not match the ATM Pay payment intent.');
  }
  const status = resultCode === 'tesSUCCESS' ? 'validated' : 'failed';
  const completedAt = new Date().toISOString();
  const ledgerIndex = Number(txResult?.ledger_index || txResult?.inLedger || 0) || null;
  const { error } = await admin.from('atm_pay_intents').update({ status, tx_hash: txHash, result_code: resultCode || 'UNKNOWN', ledger_index: ledgerIndex, completed_at: completedAt }).eq('id', intent.id).eq('sender_user_id', user.id);
  if (error) {
    if (String(error.code || '') === '23505') throw conflict('That XRPL transaction is already attached to another ATM Pay payment.');
    throw setupError(error);
  }
  if (intent.request_id && status === 'validated') {
    await admin.from('atm_pay_requests').update({ status: 'paid', payment_intent_id: intent.id, completed_at: completedAt }).eq('id', intent.request_id).eq('status', 'pending');
  }
  return { validated: true, success: status === 'validated', result: resultCode || 'UNKNOWN', ledger_index: ledgerIndex, tx_hash: txHash };
}

async function createRequest(admin, user, body) {
  const requester = await identity(admin, user.id);
  if (!requester.handle || !requester.wallet_ready) throw conflict('Finish ATM Pay setup before requesting money.');
  const payerId = assertUuid(body?.payer_id, 'Player');
  if (payerId === user.id) throw badRequest('Choose another ATM Town player.');
  const payer = await resolveRecipient(admin, payerId);
  const amountDrops = assertDrops(body?.amount_drops);
  const note = cleanNote(body?.note);
  const id = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REQUEST_TTL_MS).toISOString();
  const { error } = await admin.from('atm_pay_requests').insert({
    id,
    requester_user_id: user.id,
    payer_user_id: payerId,
    requester_handle: requester.handle,
    requester_display_name: requester.display_name,
    payer_handle: payer.handle,
    payer_display_name: payer.display_name,
    network: NETWORK,
    asset: ASSET,
    amount_drops: amountDrops,
    note,
    status: 'pending',
    created_at: now.toISOString(),
    expires_at: expiresAt,
  });
  if (error) throw setupError(error);
  return { request: { id, payer: publicIdentity(payer), amount_drops: amountDrops, amount_xrp: dropsToXrp(amountDrops), note, status: 'pending', expires_at: expiresAt } };
}

async function requestAction(admin, user, body) {
  const requestId = assertUuid(body?.request_id, 'Payment request');
  const action = String(body?.request_action || '').toLowerCase();
  const { data: request, error } = await admin.from('atm_pay_requests').select('*').eq('id', requestId).maybeSingle();
  if (error) throw setupError(error);
  if (!request || request.status !== 'pending') throw conflict('That ATM Pay request is no longer pending.');
  if (Date.parse(request.expires_at || '') <= Date.now()) {
    await admin.from('atm_pay_requests').update({ status: 'expired', completed_at: new Date().toISOString() }).eq('id', requestId).eq('status', 'pending');
    throw conflict('That ATM Pay request expired.');
  }
  let next;
  if (action === 'decline' && request.payer_user_id === user.id) next = 'declined';
  else if (action === 'cancel' && request.requester_user_id === user.id) next = 'cancelled';
  else throw Object.assign(new Error('You cannot perform that action on this ATM Pay request.'), { status: 403 });
  const { error: updateError } = await admin.from('atm_pay_requests').update({ status: next, completed_at: new Date().toISOString() }).eq('id', requestId).eq('status', 'pending');
  if (updateError) throw setupError(updateError);
  return { updated: true, status: next };
}

async function activity(admin, user) {
  const [{ data: intents, error: intentError }, { data: requests, error: requestError }] = await Promise.all([
    admin.from('atm_pay_intents').select('id,sender_user_id,recipient_user_id,recipient_handle,recipient_display_name,asset,amount_drops,note,status,tx_hash,result_code,ledger_index,created_at,completed_at').or(`sender_user_id.eq.${user.id},recipient_user_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(30),
    admin.from('atm_pay_requests').select('id,requester_user_id,payer_user_id,requester_handle,requester_display_name,payer_handle,payer_display_name,asset,amount_drops,note,status,payment_intent_id,created_at,expires_at,completed_at').or(`requester_user_id.eq.${user.id},payer_user_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(30),
  ]);
  if (intentError) throw setupError(intentError);
  if (requestError) throw setupError(requestError);
  const otherIds = new Set();
  for (const row of intents || []) otherIds.add(row.sender_user_id === user.id ? row.recipient_user_id : row.sender_user_id);
  for (const row of requests || []) otherIds.add(row.requester_user_id === user.id ? row.payer_user_id : row.requester_user_id);
  otherIds.delete(user.id);
  const identityMap = await activityIdentityMap(admin, [...otherIds]);
  const items = [];
  for (const row of intents || []) {
    const sent = row.sender_user_id === user.id;
    if (!['validated', 'failed', 'submitted'].includes(row.status)) continue;
    const otherId = sent ? row.recipient_user_id : row.sender_user_id;
    const current = identityMap.get(otherId);
    const other = current && current.handle ? current : { user_id: otherId, handle: sent ? row.recipient_handle : 'player', display_name: sent ? row.recipient_display_name : 'ATM Player', character_id: 'classic', atm_pay_ready: true };
    items.push({
      kind: 'payment', id: row.id, direction: sent ? 'sent' : 'received', other,
      amount_drops: String(row.amount_drops), amount_xrp: dropsToXrp(row.amount_drops), asset: row.asset,
      note: row.note || '', status: row.status, result: row.result_code || '', tx_hash: row.tx_hash || null,
      ledger_index: row.ledger_index || null, created_at: row.completed_at || row.created_at,
    });
  }
  for (const row of requests || []) {
    const outgoing = row.requester_user_id === user.id;
    const effectiveStatus = row.status === 'pending' && Date.parse(row.expires_at || '') <= Date.now() ? 'expired' : row.status;
    items.push({
      kind: 'request', id: row.id, direction: outgoing ? 'requested' : 'request_received',
      other: identityMap.get(outgoing ? row.payer_user_id : row.requester_user_id) || (outgoing
        ? { user_id: row.payer_user_id, handle: row.payer_handle, display_name: row.payer_display_name, character_id: 'classic', atm_pay_ready: true }
        : { user_id: row.requester_user_id, handle: row.requester_handle, display_name: row.requester_display_name, character_id: 'classic', atm_pay_ready: true }),
      amount_drops: String(row.amount_drops), amount_xrp: dropsToXrp(row.amount_drops), asset: row.asset,
      note: row.note || '', status: effectiveStatus, created_at: row.completed_at || row.created_at,
      expires_at: row.expires_at, payment_intent_id: row.payment_intent_id || null,
    });
  }
  items.sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0));
  return { items: items.slice(0, 40) };
}

export const ATM_PAY_ACTIONS = new Set(['pay-status','pay-search','pay-activity','pay-claim-handle','pay-prepare','pay-ledger-prepare','pay-ledger-recheck','pay-verify','pay-cancel-intent','pay-submitted','pay-relay-submit','pay-complete','pay-request','pay-request-action']);

export function isAtmPayAction(action) {
  return ATM_PAY_ACTIONS.has(String(action || '').toLowerCase());
}

export async function handleAtmPayAction(req, res, { admin, user, action }) {
  if (req.method === 'GET' && action === 'pay-status') return res.status(200).json(await status(admin, user));
  if (req.method === 'GET' && action === 'pay-search') return res.status(200).json(await searchRecipients(admin, user, req.query?.q));
  if (req.method === 'GET' && action === 'pay-activity') return res.status(200).json(await activity(admin, user));
  if (req.method === 'POST' && action === 'pay-claim-handle') return res.status(200).json(await claimHandle(admin, user, req.body));
  if (req.method === 'POST' && action === 'pay-prepare') return res.status(201).json(await prepareIntent(admin, user, req.body));
  if (req.method === 'POST' && action === 'pay-ledger-prepare') return res.status(200).json(await prepareLedgerTransaction(admin, user, req.body));
  if (req.method === 'POST' && action === 'pay-ledger-recheck') return res.status(200).json(await recheckLedgerTransaction(admin, user, req.body));
  if (req.method === 'POST' && action === 'pay-verify') return res.status(200).json(await verifyIntent(admin, user, req.body));
  if (req.method === 'POST' && action === 'pay-cancel-intent') return res.status(200).json(await cancelIntent(admin, user, req.body));
  if (req.method === 'POST' && action === 'pay-submitted') return res.status(200).json(await markSubmitted(admin, user, req.body));
  if (req.method === 'POST' && action === 'pay-relay-submit') return res.status(200).json(await relaySignedTransaction(admin, user, req.body));
  if (req.method === 'POST' && action === 'pay-complete') return res.status(200).json(await completeIntent(admin, user, req.body));
  if (req.method === 'POST' && action === 'pay-request') return res.status(201).json(await createRequest(admin, user, req.body));
  if (req.method === 'POST' && action === 'pay-request-action') return res.status(200).json(await requestAction(admin, user, req.body));
  return res.status(405).json({ error: 'ATM Pay method/action not allowed.' });
}
