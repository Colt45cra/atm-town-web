import { setCors, requireUser, sendError } from './_auth.js';

const XRPL_ADDRESS = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
const PAGE_LIMIT = 400;
const MAX_PAGES = 12;

function rpcEndpoints() {
  return [...new Set([
    String(process.env.XRPL_RPC_URL || '').trim(),
    'https://xrplcluster.com/',
    'https://s1.ripple.com:51234/',
    'https://s2.ripple.com:51234/'
  ].filter(Boolean))];
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function decodeHexUri(value) {
  const hex = String(value || '').trim();
  if (!hex || hex.length % 2 || !/^[0-9a-f]+$/i.test(hex)) return '';
  try { return Buffer.from(hex, 'hex').toString('utf8').replace(/\0+$/g, ''); }
  catch { return ''; }
}

async function requestAccountNfts(endpoint, account, marker = null) {
  const params = {
    account,
    ledger_index: 'validated',
    limit: PAGE_LIMIT,
    api_version: 2
  };
  if (marker !== null && marker !== undefined) params.marker = marker;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'atm-town-xrpl-inventory-v231',
      method: 'account_nfts',
      params: [params]
    })
  });

  const payload = await readJson(response);
  if (!response.ok) throw new Error(`XRPL inventory server returned HTTP ${response.status}.`);
  const result = payload?.result || {};
  if (result.status === 'error' || result.error) {
    const error = new Error(result.error_message || result.error || 'XRPL inventory lookup failed.');
    error.xrplCode = result.error || '';
    throw error;
  }
  return result;
}

async function fetchInventory(account) {
  let lastError = null;
  for (const endpoint of rpcEndpoints()) {
    try {
      const nfts = [];
      let marker = null;
      let ledgerIndex = null;
      let ledgerHash = null;
      let validated = true;
      let pages = 0;

      do {
        const result = await requestAccountNfts(endpoint, account, marker);
        pages += 1;
        if (Array.isArray(result.account_nfts)) nfts.push(...result.account_nfts);
        ledgerIndex = result.ledger_index ?? result.ledger_current_index ?? ledgerIndex;
        ledgerHash = result.ledger_hash || ledgerHash;
        validated = validated && result.validated !== false;
        marker = result.marker ?? null;
      } while (marker && pages < MAX_PAGES);

      return {
        account,
        nfts,
        ledger_index: ledgerIndex,
        ledger_hash: ledgerHash,
        validated,
        pages,
        truncated: Boolean(marker),
        endpoint
      };
    } catch (error) {
      if (error?.xrplCode === 'actNotFound') {
        return {
          account,
          nfts: [],
          ledger_index: null,
          ledger_hash: null,
          validated: true,
          pages: 1,
          truncated: false,
          account_not_found: true,
          endpoint
        };
      }
      lastError = error;
    }
  }
  throw Object.assign(lastError || new Error('No XRPL inventory server was available.'), { status: 502 });
}

function normalizeNft(nft) {
  const flags = Number(nft?.Flags || 0);
  return {
    Flags: flags,
    Issuer: String(nft?.Issuer || ''),
    NFTokenID: String(nft?.NFTokenID || '').toUpperCase(),
    NFTokenTaxon: Number.isFinite(Number(nft?.NFTokenTaxon)) ? Number(nft.NFTokenTaxon) : 0,
    URI: String(nft?.URI || '').toUpperCase(),
    nft_serial: Number.isFinite(Number(nft?.nft_serial)) ? Number(nft.nft_serial) : null,
    uri: decodeHexUri(nft?.URI || ''),
    transferable: (flags & 0x0008) !== 0,
    xrp_only: (flags & 0x0002) !== 0,
    burnable: (flags & 0x0001) !== 0,
    mutable: (flags & 0x0010) !== 0
  };
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET required.' });
  }

  try {
    const { admin, user } = await requireUser(req);
    const { data: player, error: playerError } = await admin
      .from('player_accounts')
      .select('wallet_address,wallet_verified_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (playerError) throw playerError;

    const account = String(player?.wallet_address || '').trim();
    if (!XRPL_ADDRESS.test(account)) {
      return res.status(409).json({ error: 'Link and verify a Xaman wallet before viewing XRPL NFTs.', code: 'wallet_unlinked' });
    }

    const inventory = await fetchInventory(account);
    const nfts = inventory.nfts
      .map(normalizeNft)
      .filter((nft) => /^[A-F0-9]{64}$/.test(nft.NFTokenID));

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      account,
      wallet_verified: Boolean(player?.wallet_verified_at),
      nfts,
      count: nfts.length,
      ledger_index: inventory.ledger_index,
      ledger_hash: inventory.ledger_hash,
      validated: inventory.validated === true,
      pages: inventory.pages,
      truncated: inventory.truncated === true,
      account_not_found: inventory.account_not_found === true
    });
  } catch (error) {
    sendError(res, error);
  }
}
