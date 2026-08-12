import { requireUser, sendError, setCors } from '../lib/auth.js';
import { handleAtmPayAction, isAtmPayAction } from '../lib/atm-pay.js';

const TESTNET_RPC = process.env.XRPL_TESTNET_RPC_URL || 'https://s.altnet.rippletest.net:51234/';
const NETWORK = 'testnet';
const CLASSIC_ADDRESS_RE = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
const MAX_BACKUP_BYTES = 24 * 1024;
const RPC_TIMEOUT_MS = 8_000;

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
}

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw badRequest(`${label} is invalid.`);
  return value;
}

function assertExactKeys(value, allowed, required, label) {
  const object = assertPlainObject(value, label);
  const keys = Object.keys(object);
  const extra = keys.filter((key) => !allowed.includes(key));
  if (extra.length) throw badRequest(`${label} contains unsupported field${extra.length === 1 ? '' : 's'}: ${extra.join(', ')}.`);
  const missing = required.filter((key) => !(key in object));
  if (missing.length) throw badRequest(`${label} is missing required field${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}.`);
  return object;
}

function assertB64u(value, label, { exactBytes = null, minBytes = 1, maxBytes = 4096 } = {}) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw badRequest(`${label} must be canonical base64url.`);
  let bytes;
  try { bytes = Buffer.from(value, 'base64url'); }
  catch { throw badRequest(`${label} is not valid base64url.`); }
  if (bytes.toString('base64url') !== value) throw badRequest(`${label} must use canonical base64url encoding.`);
  if (exactBytes != null && bytes.length !== exactBytes) throw badRequest(`${label} has an invalid byte length.`);
  if (bytes.length < minBytes || bytes.length > maxBytes) throw badRequest(`${label} has an invalid byte length.`);
  return value;
}

function assertIsoTimestamp(value, label) {
  if (typeof value !== 'string' || value.length > 64 || !Number.isFinite(Date.parse(value))) throw badRequest(`${label} must be a valid timestamp.`);
  return value;
}

function assertWrapper(wrapper, kind) {
  const isPasskey = kind === 'passkey';
  const allowed = isPasskey
    ? ['kdf', 'credential_id', 'prf_salt', 'salt', 'iv', 'ciphertext']
    : ['kdf', 'salt', 'iv', 'ciphertext'];
  const object = assertExactKeys(wrapper, allowed, allowed, `${kind} wrapper`);
  if (object.kdf !== 'HKDF-SHA-256') throw badRequest(`${kind} wrapper KDF is invalid.`);
  assertB64u(object.salt, `${kind} wrapper salt`, { exactBytes: 32 });
  assertB64u(object.iv, `${kind} wrapper IV`, { exactBytes: 12 });
  assertB64u(object.ciphertext, `${kind} wrapper ciphertext`, { exactBytes: 48 });
  if (isPasskey) {
    assertB64u(object.credential_id, 'passkey credential id', { minBytes: 1, maxBytes: 1024 });
    assertB64u(object.prf_salt, 'passkey PRF salt', { exactBytes: 32 });
  }
  return object;
}

function assertWalletBackup(backup) {
  const object = assertExactKeys(
    backup,
    ['version', 'network', 'address', 'payload', 'recovery', 'passkey', 'created_at', 'updated_at'],
    ['version', 'network', 'address', 'payload', 'recovery', 'passkey', 'created_at'],
    'Encrypted wallet backup',
  );

  const encoded = JSON.stringify(object);
  if (Buffer.byteLength(encoded, 'utf8') > MAX_BACKUP_BYTES) throw Object.assign(new Error('Encrypted wallet backup is too large.'), { status: 413 });
  // Defense in depth: exact schemas above are authoritative; this also catches accidental future secret-named fields.
  if (/"(?:seed|secret|private[_-]?key|privateKey)"\s*:/i.test(encoded)) throw badRequest('Plaintext wallet secrets must never be sent to ATM Town.');

  if (object.version !== 1 || object.network !== NETWORK) throw badRequest('Only ATM Town Testnet wallet backup version 1 is accepted.');
  if (!CLASSIC_ADDRESS_RE.test(String(object.address || ''))) throw badRequest('A valid XRPL classic address is required.');

  const payload = assertExactKeys(object.payload, ['alg', 'iv', 'ciphertext'], ['alg', 'iv', 'ciphertext'], 'Encrypted wallet payload');
  if (payload.alg !== 'AES-GCM') throw badRequest('Encrypted wallet payload algorithm is invalid.');
  assertB64u(payload.iv, 'wallet payload IV', { exactBytes: 12 });
  assertB64u(payload.ciphertext, 'wallet payload ciphertext', { minBytes: 64, maxBytes: 4096 });

  assertWrapper(object.recovery, 'recovery');
  if (object.passkey !== null) assertWrapper(object.passkey, 'passkey');
  assertIsoTimestamp(object.created_at, 'Wallet backup created_at');
  if (object.updated_at != null) assertIsoTimestamp(object.updated_at, 'Wallet backup updated_at');
  return object;
}

async function readWallet(admin, userId) {
  const { data, error } = await admin
    .from('embedded_wallets')
    .select('network,address,encrypted_backup,created_at,updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function rpc(method, params) {
  let response;
  try {
    response = await fetch(TESTNET_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, params }),
      signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw new Error('XRPL Testnet request timed out.');
    throw error;
  }
  if (!response.ok) throw new Error(`XRPL Testnet request failed (${response.status}).`);
  const json = await response.json();
  if (json?.result?.status === 'error') {
    const err = new Error(json.result.error_message || json.result.error || 'XRPL Testnet request failed.');
    err.xrplCode = json.result.error;
    throw err;
  }
  return json?.result || {};
}

async function readBalance(address) {
  try {
    const result = await rpc('account_info', [{ account: address, ledger_index: 'validated', strict: true }]);
    const drops = BigInt(String(result?.account_data?.Balance || '0'));
    const whole = drops / 1_000_000n;
    const fraction = (drops % 1_000_000n).toString().padStart(6, '0');
    return { funded: true, balance_drops: drops.toString(), balance_xrp: `${whole}.${fraction}` };
  } catch (error) {
    if (error?.xrplCode === 'actNotFound') return { funded: false, balance_drops: '0', balance_xrp: '0.000000' };
    throw error;
  }
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  noStore(res);
  try {
    const { admin, user } = await requireUser(req);
    const action = String(req.query?.action || (req.method === 'POST' ? 'save' : 'status')).toLowerCase();

    if (isAtmPayAction(action)) return await handleAtmPayAction(req, res, { admin, user, action });

    if (req.method === 'GET' && action === 'status') {
      const row = await readWallet(admin, user.id);
      return res.status(200).json({
        wallet: row ? {
          network: row.network,
          address: row.address,
          encrypted_backup: row.encrypted_backup,
          created_at: row.created_at,
          updated_at: row.updated_at,
        } : null,
      });
    }

    if (req.method === 'GET' && action === 'balance') {
      const row = await readWallet(admin, user.id);
      if (!row) return res.status(404).json({ error: 'No ATM Testnet wallet exists for this account.' });
      if (row.network !== NETWORK || !CLASSIC_ADDRESS_RE.test(String(row.address || ''))) {
        throw Object.assign(new Error('Stored wallet network/address is invalid.'), { status: 409 });
      }
      const balance = await readBalance(row.address);
      return res.status(200).json({ network: NETWORK, address: row.address, ...balance });
    }

    if (req.method === 'POST' && action === 'save') {
      const backup = assertWalletBackup(req.body?.encrypted_backup || req.body?.backup);
      const address = String(req.body?.address || backup.address || '');
      if (address !== backup.address || !CLASSIC_ADDRESS_RE.test(address)) throw badRequest('Wallet address does not match the encrypted backup.');

      // A normal wrapper refresh may update ciphertext for the SAME public address. Replacing
      // the account's wallet address needs a future dedicated, explicit recovery flow instead
      // of silently overwriting the only encrypted backup associated with this account.
      const existing = await readWallet(admin, user.id);
      if (existing && existing.address !== address) {
        throw Object.assign(new Error('Embedded wallet replacement is blocked. Use a dedicated wallet-replacement recovery flow.'), { status: 409 });
      }
      const existingCreatedAt = existing?.encrypted_backup?.created_at;
      if (existingCreatedAt && existingCreatedAt !== backup.created_at) {
        throw Object.assign(new Error('Embedded wallet backup identity changed unexpectedly.'), { status: 409 });
      }

      const now = new Date().toISOString();
      const { data, error } = await admin
        .from('embedded_wallets')
        .upsert({
          user_id: user.id,
          network: NETWORK,
          address,
          encrypted_backup: backup,
          updated_at: now,
        }, { onConflict: 'user_id' })
        .select('network,address,created_at,updated_at')
        .single();
      if (error) {
        if (String(error.code || '') === '23505') {
          throw Object.assign(new Error('That Testnet wallet is already attached to another ATM Town account.'), { status: 409 });
        }
        throw error;
      }
      return res.status(200).json({ wallet: data });
    }

    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ error: 'Method/action not allowed.' });
  } catch (error) {
    sendError(res, error);
  }
}
