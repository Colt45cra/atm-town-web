import { readJson, XAMAN_API_BASE, xamanHeaders, xamanError, fetchXamanPayload, XRPL_TX_HASH } from './xaman-vending.js';

export const XRPL_ADDRESS = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
export const NFT_ID = /^[A-F0-9]{64}$/i;
export const OFFER_ID = /^[A-F0-9]{64}$/i;

export function rpcEndpoints() {
  return [...new Set([
    String(process.env.XRPL_RPC_URL || '').trim(),
    'https://xrplcluster.com/',
    'https://s1.ripple.com:51234/',
    'https://s2.ripple.com:51234/'
  ].filter(Boolean))];
}

export async function rpc(method, params) {
  let lastError = null;
  for (const endpoint of rpcEndpoints()) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ jsonrpc: '2.0', id: `atm-town-${method}`, method, params: [params] })
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(`XRPL ${method} returned HTTP ${response.status}.`);
      const result = payload?.result || {};
      if (result.status === 'error' || result.error) {
        const error = new Error(result.error_message || result.error || `XRPL ${method} failed.`);
        error.xrplCode = result.error || '';
        throw error;
      }
      return result;
    } catch (error) { lastError = error; }
  }
  throw Object.assign(lastError || new Error(`No XRPL server was available for ${method}.`), { status: 502 });
}

export async function findOwnedNft(account, tokenId) {
  let marker = null;
  for (let page = 0; page < 12; page++) {
    const result = await rpc('account_nfts', { account, ledger_index: 'validated', limit: 400, ...(marker ? { marker } : {}), api_version: 2 });
    const found = (result.account_nfts || []).find(n => String(n?.NFTokenID || '').toUpperCase() === String(tokenId).toUpperCase());
    if (found) return found;
    marker = result.marker || null;
    if (!marker) break;
  }
  return null;
}

export async function getBuyOffers(tokenId) {
  const nftId = String(tokenId).toUpperCase();
  const offers = [];
  let marker = null;
  for (let page = 0; page < 12; page++) {
    let result;
    try {
      result = await rpc('nft_buy_offers', { nft_id: nftId, ledger_index: 'validated', limit: 400, ...(marker ? { marker } : {}), api_version: 2 });
    } catch (error) {
      // XRPL returns objectNotFound when an NFT has no active buy offers.
      if (String(error?.xrplCode || '').toLowerCase() === 'objectnotfound') return [];
      throw error;
    }
    offers.push(...(Array.isArray(result.offers) ? result.offers : []));
    marker = result.marker || null;
    if (!marker) break;
  }
  return offers;
}

export async function createXamanTransaction(txjson, { identifier, instruction, expire = 30 }) {
  const response = await fetch(`${XAMAN_API_BASE}/payload`, {
    method: 'POST', headers: xamanHeaders(), cache: 'no-store',
    body: JSON.stringify({ txjson, options: { submit: true, expire, force_network: 'MAINNET' }, custom_meta: { identifier, instruction } })
  });
  const created = await readJson(response);
  if (!response.ok || !created?.uuid || !created?.next?.always) throw xamanError(created, 'Xaman rejected the NFT transaction request');
  return created;
}

export async function cancelXamanTransaction(payloadUuid) {
  if (!payloadUuid) return;
  try {
    await fetch(`${XAMAN_API_BASE}/payload/${encodeURIComponent(payloadUuid)}`, {
      method: 'DELETE', headers: xamanHeaders(), cache: 'no-store'
    });
  } catch (error) {
    console.warn('Could not cancel orphaned ATM Town NFT Xaman payload:', error?.message || error);
  }
}

async function fetchTx(txHash) {
  const result = await rpc('tx', { transaction: txHash, binary: false, api_version: 2 });
  return result;
}

function txParts(result) {
  const tx = result?.tx_json || result?.tx || result?.transaction || (result?.TransactionType ? result : {});
  const meta = result?.meta || result?.metaData || result?.metadata || {};
  return { tx, meta };
}
function txSuccess(result) {
  const { meta } = txParts(result);
  return result?.validated === true && String(meta?.TransactionResult || meta?.transaction_result || result?.engine_result || '') === 'tesSUCCESS';
}
function createdOfferIndex(meta) {
  for (const node of meta?.AffectedNodes || []) {
    const created = node?.CreatedNode;
    if (created?.LedgerEntryType === 'NFTokenOffer' && OFFER_ID.test(String(created?.LedgerIndex || ''))) return String(created.LedgerIndex).toUpperCase();
  }
  return '';
}

export async function resolveTradePayload(request) {
  const lookup = await fetchXamanPayload(request.payload_uuid);
  if (!lookup.found) return { status: 'failed', error: 'The Xaman sign request could not be found.' };
  const payload = lookup.payload || {}, meta = payload.meta || {};
  if (!meta.resolved) return { status: meta.expired ? 'expired' : 'pending', phase: meta.opened_by_deeplink != null ? 'opened' : 'waiting' };
  if (meta.signed !== true) return { status: 'rejected', error: 'The Xaman sign request was rejected.' };
  const response = payload.response || {};
  const responseAccount = String(response.account || '');
  if (responseAccount && responseAccount !== request.expected_wallet) return { status: 'failed', error: 'The transaction was signed by a different wallet than the linked ATM Town wallet.' };
  const txHash = String(response.txid || '').toUpperCase();
  if (!XRPL_TX_HASH.test(txHash)) return { status: 'pending', phase: 'validating' };
  let result;
  try { result = await fetchTx(txHash); } catch { return { status: 'pending', phase: 'validating', tx_hash: txHash }; }
  if (result?.validated !== true) return { status: 'pending', phase: 'validating', tx_hash: txHash };
  if (!txSuccess(result)) return { status: 'failed', error: 'The XRPL transaction did not succeed.', tx_hash: txHash };
  const { tx, meta: txMeta } = txParts(result);
  if (String(tx?.Account || '') !== request.expected_wallet) return { status: 'failed', error: 'The validated transaction came from a different wallet.', tx_hash: txHash };
  if (request.action === 'create_buy_offer') {
    if (String(tx?.TransactionType || '') !== 'NFTokenCreateOffer') return { status: 'failed', error: 'The signed transaction was not an NFT buy offer.', tx_hash: txHash };
    if ((Number(tx?.Flags || 0) & 1) !== 0) return { status: 'failed', error: 'The signed NFT offer was a sell offer instead of a buy offer.', tx_hash: txHash };
    if (String(tx?.Owner || '') !== request.counterparty_wallet || String(tx?.NFTokenID || '').toUpperCase() !== request.token_id || String(tx?.Amount || '') !== String(request.amount_drops || '')) return { status: 'failed', error: 'The validated NFT offer did not match the ATM Town offer request.', tx_hash: txHash };
    const offerIndex = createdOfferIndex(txMeta);
    if (!offerIndex) return { status: 'pending', phase: 'validating', tx_hash: txHash };
    return { status: 'open', tx_hash: txHash, offer_index: offerIndex };
  }
  if (request.action === 'accept_buy_offer') {
    if (String(tx?.TransactionType || '') !== 'NFTokenAcceptOffer' || String(tx?.NFTokenBuyOffer || '').toUpperCase() !== String(request.offer_index || '').toUpperCase()) return { status: 'failed', error: 'The validated transaction did not accept the expected NFT buy offer.', tx_hash: txHash };
    return { status: 'accepted', tx_hash: txHash, offer_index: request.offer_index };
  }
  return { status: 'failed', error: 'Unknown NFT trade request.' };
}
