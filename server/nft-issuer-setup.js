import { setCors, requireUser, publicOriginForRequest, sendError } from '../lib/auth.js';
import {
  XAMAN_API_BASE,
  readJson,
  xamanHeaders,
  xamanError,
  fetchXamanPayload,
  XRPL_TX_HASH
} from '../lib/xaman-vending.js';

export const ATM_TOWN_NFT_ISSUER = 'rnCv6dCu3r1ANVD6vYuHikxV8TYphecdff';
export const ATM_TOWN_NFT_MINTER = 'rM5oXXzDLJxLqKp6ZwZjjesPvNvh669uCc';
export const AUTHORIZED_NFT_MINTER_FLAG = 10;

const XRPL_ADDRESS = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
const PAYLOAD_UUID = /^[0-9a-f-]{36}$/i;

function rpcEndpoints() {
  return [...new Set([
    String(process.env.XRPL_RPC_URL || '').trim(),
    'https://xrplcluster.com/',
    'https://s1.ripple.com:51234/',
    'https://s2.ripple.com:51234/'
  ].filter(Boolean))];
}

async function rpc(endpoint, method, params) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'atm-town-nft-issuer-setup',
      method,
      params: [params]
    })
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(`XRPL server returned HTTP ${response.status}.`);
  const result = payload?.result || {};
  if (result.status === 'error' || result.error) {
    const error = new Error(result.error_message || result.error || 'XRPL request failed.');
    error.xrplCode = String(result.error || '');
    throw error;
  }
  return result;
}

async function accountInfo(account) {
  let lastError = null;
  for (const endpoint of rpcEndpoints()) {
    try {
      const result = await rpc(endpoint, 'account_info', {
        account,
        ledger_index: 'validated',
        queue: false,
        api_version: 2
      });
      const data = result.account_data || {};
      return {
        exists: true,
        address: account,
        balance_drops: String(data.Balance || '0'),
        owner_count: Number(data.OwnerCount || 0),
        sequence: Number(data.Sequence || 0),
        nftoken_minter: String(data.NFTokenMinter || ''),
        ledger_index: result.ledger_index ?? null
      };
    } catch (error) {
      if (error?.xrplCode === 'actNotFound') {
        return {
          exists: false,
          address: account,
          balance_drops: '0',
          owner_count: 0,
          sequence: 0,
          nftoken_minter: '',
          ledger_index: null
        };
      }
      lastError = error;
    }
  }
  throw Object.assign(lastError || new Error('No XRPL server was available.'), { status: 502 });
}

async function txByHash(hash) {
  let lastError = null;
  let reachedServer = false;
  for (const endpoint of rpcEndpoints()) {
    try {
      const result = await rpc(endpoint, 'tx', {
        transaction: hash,
        binary: false,
        api_version: 2
      });
      reachedServer = true;
      if (result?.validated === true) return result;
    } catch (error) {
      if (error?.xrplCode === 'txnNotFound') {
        reachedServer = true;
        continue;
      }
      lastError = error;
    }
  }
  if (reachedServer) return null;
  throw Object.assign(lastError || new Error('No XRPL server was available.'), { status: 502 });
}

function authorizationMatches(result, hash) {
  const tx = result?.tx_json || result?.tx || result?.transaction || result || {};
  const meta = result?.meta || result?.metaData || result?.metadata || {};
  const txHash = String(result?.hash || tx?.hash || tx?.Hash || '').toUpperCase();
  const engine = String(meta?.TransactionResult || meta?.transaction_result || result?.engine_result || '');
  return {
    ok:
      result?.validated === true &&
      txHash === String(hash || '').toUpperCase() &&
      String(tx?.TransactionType || '') === 'AccountSet' &&
      String(tx?.Account || '') === ATM_TOWN_NFT_ISSUER &&
      Number(tx?.SetFlag) === AUTHORIZED_NFT_MINTER_FLAG &&
      String(tx?.NFTokenMinter || '') === ATM_TOWN_NFT_MINTER &&
      engine === 'tesSUCCESS',
    tx,
    engine
  };
}

async function createAuthorizationPayload(req) {
  const origin = publicOriginForRequest(req);
  const returnUrl = `${origin}/?nft_setup=1&nft_auth_return=1&payload={id}`;
  const response = await fetch(`${XAMAN_API_BASE}/payload`, {
    method: 'POST',
    headers: xamanHeaders(),
    cache: 'no-store',
    body: JSON.stringify({
      txjson: {
        TransactionType: 'AccountSet',
        Account: ATM_TOWN_NFT_ISSUER,
        SetFlag: AUTHORIZED_NFT_MINTER_FLAG,
        NFTokenMinter: ATM_TOWN_NFT_MINTER
      },
      options: {
        submit: true,
        expire: 10,
        force_network: 'MAINNET',
        return_url: {
          app: returnUrl,
          web: returnUrl
        }
      },
      custom_meta: {
        identifier: 'atm-town-authorized-nft-minter',
        instruction: `Authorize ${ATM_TOWN_NFT_MINTER} as the ATM Town NFToken minter. Verify both addresses before signing.`
      }
    })
  });
  const created = await readJson(response);
  if (!response.ok || !created?.uuid || !created?.next?.always) {
    throw xamanError(created, 'Xaman rejected the ATM Town NFT minter authorization request');
  }
  return created;
}

async function handleLedgerStatus(req, res) {
  await requireUser(req);
  const [issuer, minter] = await Promise.all([
    accountInfo(ATM_TOWN_NFT_ISSUER),
    accountInfo(ATM_TOWN_NFT_MINTER)
  ]);
  const authorized = issuer.exists && issuer.nftoken_minter === ATM_TOWN_NFT_MINTER;
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({
    network: 'mainnet',
    issuer: {
      ...issuer,
      configured_minter: ATM_TOWN_NFT_MINTER,
      authorized_minter_matches: authorized
    },
    minter,
    authorized
  });
}

async function handleAuthorizeStart(req, res) {
  await requireUser(req);
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required.' });

  if (!XRPL_ADDRESS.test(ATM_TOWN_NFT_ISSUER) || !XRPL_ADDRESS.test(ATM_TOWN_NFT_MINTER)) {
    throw Object.assign(new Error('ATM Town NFT wallet configuration is invalid.'), { status: 500 });
  }

  const issuer = await accountInfo(ATM_TOWN_NFT_ISSUER);
  const minter = await accountInfo(ATM_TOWN_NFT_MINTER);
  if (!issuer.exists) {
    return res.status(409).json({
      error: 'The ATM Town issuer account is not active on XRPL Mainnet yet. Fund the issuer wallet with XRP, then retry.'
    });
  }
  if (!minter.exists) {
    return res.status(409).json({
      error: 'The ATM Town operational/minter account is not active on XRPL Mainnet yet. Fund the operational wallet with XRP, then retry.'
    });
  }
  if (issuer.nftoken_minter === ATM_TOWN_NFT_MINTER) {
    return res.status(200).json({
      already_authorized: true,
      network: 'mainnet',
      issuer: ATM_TOWN_NFT_ISSUER,
      minter: ATM_TOWN_NFT_MINTER
    });
  }

  const created = await createAuthorizationPayload(req);
  return res.status(201).json({
    already_authorized: false,
    network: 'mainnet',
    issuer: ATM_TOWN_NFT_ISSUER,
    minter: ATM_TOWN_NFT_MINTER,
    payload_uuid: created.uuid,
    deeplink: created.next.always,
    qr_png: created.refs?.qr_png || null,
    expires_in_minutes: 10
  });
}

async function handleAuthorizeStatus(req, res) {
  await requireUser(req);
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET required.' });
  const payloadUuid = String(req.query?.payload_uuid || '').trim();
  if (!PAYLOAD_UUID.test(payloadUuid)) return res.status(400).json({ error: 'A valid Xaman payload UUID is required.' });

  const lookup = await fetchXamanPayload(payloadUuid);
  if (!lookup.found) return res.status(404).json({ error: 'Xaman authorization request was not found.' });
  const payload = lookup.payload || {};
  const meta = payload.meta || {};

  if (!meta.resolved) {
    return res.status(200).json({
      status: meta.expired === true ? 'expired' : 'pending',
      phase: meta.opened_by_deeplink ? 'opened' : 'waiting'
    });
  }
  if (meta.signed !== true) return res.status(200).json({ status: 'rejected' });

  const response = payload.response || {};
  const signer = String(response.account || '');
  if (signer && signer !== ATM_TOWN_NFT_ISSUER) {
    return res.status(409).json({
      status: 'failed',
      error: 'The authorization was signed by a different XRPL account. It must be signed by the ATM Town issuer.'
    });
  }
  const nodeType = String(response.dispatched_nodetype || '').toUpperCase();
  if (nodeType && !nodeType.includes('MAINNET')) {
    return res.status(409).json({ status: 'failed', error: 'The authorization was not submitted to XRPL Mainnet.' });
  }

  const txHash = String(response.txid || '').toUpperCase();
  if (!XRPL_TX_HASH.test(txHash)) {
    return res.status(200).json({ status: 'pending', phase: 'validating' });
  }

  const validated = await txByHash(txHash);
  if (!validated) {
    return res.status(200).json({ status: 'pending', phase: 'validating', tx_hash: txHash });
  }
  const match = authorizationMatches(validated, txHash);
  if (!match.ok) {
    return res.status(409).json({
      status: 'failed',
      tx_hash: txHash,
      error: `The validated transaction did not exactly match the ATM Town minter authorization${match.engine ? ` (${match.engine})` : ''}.`
    });
  }

  const issuer = await accountInfo(ATM_TOWN_NFT_ISSUER);
  const authorized = issuer.nftoken_minter === ATM_TOWN_NFT_MINTER;
  return res.status(200).json({
    status: authorized ? 'authorized' : 'pending',
    phase: authorized ? 'complete' : 'ledger-setting',
    tx_hash: txHash,
    issuer: ATM_TOWN_NFT_ISSUER,
    minter: ATM_TOWN_NFT_MINTER,
    authorized
  });
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  try {
    const action = String(req.query?.action || '').toLowerCase();
    if (action === 'ledger-status') return await handleLedgerStatus(req, res);
    if (action === 'authorize-start') return await handleAuthorizeStart(req, res);
    if (action === 'authorize-status') return await handleAuthorizeStatus(req, res);
    return res.status(400).json({ error: 'Unknown ATM Town NFT issuer setup action.' });
  } catch (error) {
    console.error('ATM Town NFT issuer setup failed:', error);
    sendError(res, error);
  }
}
