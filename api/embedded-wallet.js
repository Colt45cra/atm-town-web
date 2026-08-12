import { requireUser, sendError, setCors } from '../lib/auth.js';

const TESTNET_RPC = process.env.XRPL_TESTNET_RPC_URL || 'https://s.altnet.rippletest.net:51234/';
const NETWORK = 'testnet';
const CLASSIC_ADDRESS_RE = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
const MAX_BACKUP_BYTES = 24 * 1024;

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
}

function assertWalletBackup(backup) {
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
    throw Object.assign(new Error('Encrypted wallet backup is required.'), { status: 400 });
  }
  const encoded = JSON.stringify(backup);
  if (Buffer.byteLength(encoded, 'utf8') > MAX_BACKUP_BYTES) {
    throw Object.assign(new Error('Encrypted wallet backup is too large.'), { status: 413 });
  }
  if (/"(?:seed|secret|private[_-]?key|privateKey)"\s*:/i.test(encoded)) {
    throw Object.assign(new Error('Plaintext wallet secrets must never be sent to ATM Town.'), { status: 400 });
  }
  if (backup.version !== 1 || backup.network !== NETWORK) {
    throw Object.assign(new Error('Only ATM Town Testnet wallet backup version 1 is accepted.'), { status: 400 });
  }
  if (!CLASSIC_ADDRESS_RE.test(String(backup.address || ''))) {
    throw Object.assign(new Error('A valid XRPL classic address is required.'), { status: 400 });
  }
  const payload = backup.payload || {};
  const recovery = backup.recovery || {};
  if (payload.alg !== 'AES-GCM' || typeof payload.iv !== 'string' || typeof payload.ciphertext !== 'string') {
    throw Object.assign(new Error('Encrypted wallet payload is incomplete.'), { status: 400 });
  }
  if (recovery.kdf !== 'HKDF-SHA-256' || typeof recovery.salt !== 'string' || typeof recovery.iv !== 'string' || typeof recovery.ciphertext !== 'string') {
    throw Object.assign(new Error('Recovery wrapper is incomplete.'), { status: 400 });
  }
  if (backup.passkey != null) {
    const passkey = backup.passkey;
    if (
      passkey.kdf !== 'HKDF-SHA-256' ||
      typeof passkey.credential_id !== 'string' ||
      typeof passkey.prf_salt !== 'string' ||
      typeof passkey.salt !== 'string' ||
      typeof passkey.iv !== 'string' ||
      typeof passkey.ciphertext !== 'string'
    ) {
      throw Object.assign(new Error('Passkey wrapper is incomplete.'), { status: 400 });
    }
  }
  return backup;
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
  const response = await fetch(TESTNET_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params })
  });
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

    if (req.method === 'GET' && action === 'status') {
      const row = await readWallet(admin, user.id);
      return res.status(200).json({
        wallet: row ? {
          network: row.network,
          address: row.address,
          encrypted_backup: row.encrypted_backup,
          created_at: row.created_at,
          updated_at: row.updated_at
        } : null
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
      if (address !== backup.address || !CLASSIC_ADDRESS_RE.test(address)) {
        throw Object.assign(new Error('Wallet address does not match the encrypted backup.'), { status: 400 });
      }
      const now = new Date().toISOString();
      const { data, error } = await admin
        .from('embedded_wallets')
        .upsert({
          user_id: user.id,
          network: NETWORK,
          address,
          encrypted_backup: backup,
          updated_at: now
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
