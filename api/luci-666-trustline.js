import { setCors, requireUser, sendError } from '../lib/auth.js';
import {
  XAMAN_API_BASE,
  readJson,
  xamanHeaders,
  xamanError
} from '../lib/xaman-vending.js';

const XRPL_RPC_URL = String(process.env.XRPL_RPC_URL || 'https://s1.ripple.com:51234/').trim();
const CURRENCY = '666';
const ISSUER = 'rhvf9fe6PP3GC8Bku2Ug7iQPjPDxYZfrxN';
const TRUST_LIMIT = '10000000';
const XRPL_ADDRESS = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
const TF_SET_NO_RIPPLE = 0x00020000;

async function linkedWallet(admin, userId) {
  const { data, error } = await admin
    .from('player_accounts')
    .select('wallet_address')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  const wallet = String(data?.wallet_address || '').trim();
  if (!XRPL_ADDRESS.test(wallet)) {
    throw Object.assign(new Error('Link and verify a Xaman wallet in ATM Town before creating the $666 trustline.'), { status: 409 });
  }
  return wallet;
}

async function hasTrustline(wallet) {
  const response = await fetch(XRPL_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      method: 'account_lines',
      params: [{
        account: wallet,
        peer: ISSUER,
        ledger_index: 'validated',
        limit: 400
      }]
    })
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw Object.assign(new Error('The XRPL server could not check your $666 trustline.'), { status: 502 });
  }
  const result = payload?.result || {};
  if (result.status === 'error' || result.error) {
    const detail = String(result.error || '');
    if (detail === 'actNotFound') return false;
    throw Object.assign(new Error(result.error_message || detail || 'The XRPL trustline check failed.'), { status: 502 });
  }
  return Array.isArray(result.lines) && result.lines.some(line =>
    String(line?.currency || '') === CURRENCY && String(line?.account || '') === ISSUER
  );
}

async function createTrustlinePayload(wallet) {
  const response = await fetch(`${XAMAN_API_BASE}/payload`, {
    method: 'POST',
    headers: xamanHeaders(),
    cache: 'no-store',
    body: JSON.stringify({
      txjson: {
        TransactionType: 'TrustSet',
        Account: wallet,
        Flags: TF_SET_NO_RIPPLE,
        LimitAmount: {
          currency: CURRENCY,
          issuer: ISSUER,
          value: TRUST_LIMIT
        }
      },
      options: {
        submit: true,
        expire: 10,
        force_network: 'MAINNET'
      },
      custom_meta: {
        identifier: `atm-town-luci-666-trustline:${wallet}`,
        instruction: 'Create the $666 trustline required to receive Luci’s 6 $666 ATM Town welcome gift.'
      }
    })
  });
  const created = await readJson(response);
  if (!response.ok || !created?.uuid || !created?.next?.always) {
    throw xamanError(created, 'Xaman rejected the $666 trustline request');
  }
  return created;
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'GET or POST required.' });
  }

  try {
    const { admin, user } = await requireUser(req);
    const wallet = await linkedWallet(admin, user.id);
    const trusted = await hasTrustline(wallet);

    if (req.method === 'GET' || trusted) {
      return res.status(200).json({
        network: 'mainnet',
        wallet,
        currency: CURRENCY,
        issuer: ISSUER,
        has_trustline: trusted
      });
    }

    const created = await createTrustlinePayload(wallet);
    return res.status(201).json({
      network: 'mainnet',
      wallet,
      currency: CURRENCY,
      issuer: ISSUER,
      has_trustline: false,
      payload_uuid: created.uuid,
      deeplink: created.next.always,
      qr_png: created.refs?.qr_png || null,
      expires_in_minutes: 10
    });
  } catch (error) {
    console.error('Luci $666 trustline flow failed:', error);
    sendError(res, error);
  }
}
