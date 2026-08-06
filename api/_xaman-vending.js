import { createHmac, timingSafeEqual } from 'node:crypto';

export const XAMAN_API_BASE = 'https://xumm.app/api/v1/platform';
export const ATM_CURRENCY = 'ATM';
export const ATM_ISSUER = 'raDZ4t8WPXkmDfJWMLBcNZmmSHmBC523NZ';
export const ATM_DESTINATION = 'rMSDXpxDpV2pQJDHbp77XHHhT9QHMrfPYB';
export const XAMAN_PAYLOAD_UUID = /^[0-9a-f-]{36}$/i;
export const XRPL_TX_HASH = /^[A-F0-9]{64}$/i;

const TF_PARTIAL_PAYMENT = 0x00020000;
const AMOUNT_ROUNDING_TOLERANCE = 1e-9;

export function cleanCredential(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '').trim();
}

export async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

export function xamanCredentials() {
  const apiKey = cleanCredential(process.env.XAMAN_API_KEY);
  const apiSecret = cleanCredential(process.env.XAMAN_API_SECRET);
  if (!apiKey || !apiSecret) {
    throw Object.assign(new Error('Xaman server environment variables are missing.'), { status: 500 });
  }
  return { apiKey, apiSecret };
}

export function xamanHeaders() {
  const { apiKey, apiSecret } = xamanCredentials();
  return {
    'X-API-Key': apiKey,
    'X-API-Secret': apiSecret,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
}

export function xamanError(payload, fallback, status = 502) {
  const code = payload?.error?.code ?? payload?.code ?? null;
  const reference = payload?.error?.reference ?? payload?.reference ?? null;
  const message = payload?.error?.message || payload?.message || null;
  const details = [
    code ? `code ${code}` : null,
    reference ? `reference ${reference}` : null
  ].filter(Boolean).join(', ');
  return Object.assign(new Error(message || (details ? `${fallback} (${details}).` : fallback)), {
    status,
    xamanCode: code,
    xamanReference: reference
  });
}

export async function fetchXamanPayload(payloadUuid) {
  if (!XAMAN_PAYLOAD_UUID.test(String(payloadUuid || ''))) {
    return { found: false, payload: null };
  }
  const response = await fetch(`${XAMAN_API_BASE}/payload/${encodeURIComponent(payloadUuid)}`, {
    method: 'GET',
    headers: xamanHeaders(),
    cache: 'no-store'
  });
  const payload = await readJson(response);
  if (response.status === 404) return { found: false, payload: null };
  if (!response.ok) throw xamanError(payload, 'Xaman payload lookup failed');
  return { found: true, payload };
}

function secureHexEqual(left, right) {
  const a = Buffer.from(String(left || '').toLowerCase(), 'utf8');
  const b = Buffer.from(String(right || '').toLowerCase(), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyXamanWebhookSignature(req) {
  const timestamp = String(req.headers?.['x-xumm-request-timestamp'] || '');
  const signature = String(req.headers?.['x-xumm-request-signature'] || '');
  if (!timestamp || !/^[a-f0-9]{40}$/i.test(signature)) return false;
  const { apiSecret } = xamanCredentials();
  const body = JSON.stringify(req.body ?? {});
  const candidateKeys = [...new Set([
    apiSecret.replace('-', ''),
    apiSecret,
    apiSecret.replace(/-/g, '')
  ])];
  return candidateKeys.some(key => {
    const expected = createHmac('sha1', key).update(timestamp + body).digest('hex');
    return secureHexEqual(expected, signature);
  });
}

export function extractXamanPayloadUuid(body) {
  const candidates = [
    body?.payload_uuidv4,
    body?.payload_uuid,
    body?.uuid,
    body?.payload?.uuid,
    body?.payload?.payload_uuidv4,
    body?.payloadResponse?.payload_uuidv4,
    body?.payloadResponse?.payload_uuid,
    body?.payloadResponse?.uuid,
    body?.response?.payload_uuidv4,
    body?.response?.payload_uuid
  ];
  return String(candidates.find(value => XAMAN_PAYLOAD_UUID.test(String(value || ''))) || '');
}

function rpcEndpoints() {
  return [...new Set([
    String(process.env.XRPL_RPC_URL || '').trim(),
    'https://xrplcluster.com/',
    'https://s1.ripple.com:51234/',
    'https://s2.ripple.com:51234/'
  ].filter(Boolean))];
}

function normalizeCurrency(value) {
  const input = String(value || '').toUpperCase();
  if (/^[A-F0-9]{40}$/.test(input)) {
    try {
      const decoded = Buffer.from(input, 'hex').toString('ascii').replace(/\0+$/g, '');
      return decoded || input;
    } catch { return input; }
  }
  return input;
}

function normalizeDecimal(value) {
  const input = String(value ?? '').trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(input)) return null;
  const negative = input.startsWith('-');
  const unsigned = negative ? input.slice(1) : input;
  let [whole, fraction = ''] = unsigned.split('.');
  whole = whole.replace(/^0+(?=\d)/, '') || '0';
  fraction = fraction.replace(/0+$/, '');
  const normalized = fraction ? `${whole}.${fraction}` : whole;
  return negative && normalized !== '0' ? `-${normalized}` : normalized;
}

function atmAmountMatches(amount, expected) {
  if (!amount || typeof amount !== 'object') return false;
  if (normalizeCurrency(amount.currency) !== ATM_CURRENCY) return false;
  if (String(amount.issuer || '') !== ATM_ISSUER) return false;
  const actualText = normalizeDecimal(amount.value);
  const expectedText = normalizeDecimal(expected);
  if (actualText === null || expectedText === null) return false;
  if (actualText === expectedText) return true;
  const actual = Number(actualText);
  const target = Number(expectedText);
  return Number.isFinite(actual) && Number.isFinite(target)
    && Math.abs(actual - target) <= AMOUNT_ROUNDING_TOLERANCE;
}

function actualDeliveredAmount(tx, meta) {
  const delivered = meta?.delivered_amount ?? meta?.DeliveredAmount ?? null;
  if (delivered && delivered !== 'unavailable') return delivered;
  if ((Number(tx?.Flags || 0) & TF_PARTIAL_PAYMENT) !== 0) return null;
  return tx?.DeliverMax ?? tx?.Amount ?? null;
}

async function requestTransaction(endpoint, txHash) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'atm-town-vending-tx-v217',
      method: 'tx',
      params: [{ transaction: txHash, binary: false, api_version: 2 }]
    })
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(`XRPL transaction lookup failed (${response.status}).`);
  const result = payload?.result || {};
  if (result.status === 'error' || result.error) {
    const code = String(result.error || '');
    if (code === 'txnNotFound') return { found: false, result: null };
    throw new Error(result.error_message || code || 'XRPL transaction lookup failed.');
  }
  return { found: true, result };
}

async function fetchTransactionByHash(txHash) {
  let lastError = null;
  let reachedServer = false;
  let unvalidated = null;
  for (const endpoint of rpcEndpoints()) {
    try {
      const response = await requestTransaction(endpoint, txHash);
      reachedServer = true;
      if (!response.found) continue;
      if (response.result?.validated === true) return { state: 'found', result: response.result };
      unvalidated = response.result;
    } catch (error) {
      lastError = error;
      console.warn(`XRPL exact transaction endpoint failed (${endpoint}):`, error?.message || error);
    }
  }
  if (unvalidated) return { state: 'pending', result: unvalidated };
  if (reachedServer) return { state: 'pending', result: null };
  throw Object.assign(lastError || new Error('All XRPL transaction lookup servers failed.'), { status: 502 });
}

function validateTransactionResult(result, txHash, request) {
  const tx = result?.tx_json || result?.tx || result?.transaction || (result?.TransactionType ? result : {});
  const meta = result?.meta || result?.metaData || result?.metadata || {};
  const actualHash = String(result?.hash || tx?.hash || tx?.Hash || txHash || '').toUpperCase();
  if (result?.validated !== true) return { state: 'pending' };
  if (actualHash !== String(txHash || '').toUpperCase()) return { state: 'invalid', error: 'Xaman returned a transaction hash that did not match the XRPL transaction.' };
  if (String(tx?.TransactionType || '') !== 'Payment') return { state: 'invalid', error: 'The signed XRPL transaction was not a Payment.' };
  if (String(tx?.Destination || '') !== ATM_DESTINATION) return { state: 'invalid', error: 'The payment destination did not match ATM Town.' };
  if (String(tx?.Account || '') !== String(request.expected_wallet || '')) return { state: 'invalid', error: 'The payment was not sent by the wallet linked to this ATM Town account.' };
  const resultCode = String(meta?.TransactionResult || meta?.transaction_result || result?.engine_result || '');
  if (resultCode !== 'tesSUCCESS') return { state: 'invalid', error: `The XRPL payment did not succeed${resultCode ? ` (${resultCode})` : ''}.` };
  const invoice = String(tx?.InvoiceID || tx?.invoice_id || '').toUpperCase();
  if (!invoice || invoice !== String(request.invoice_id || '').toUpperCase()) return { state: 'invalid', error: 'The payment invoice did not match this Magnet Can checkout.' };
  if (!atmAmountMatches(actualDeliveredAmount(tx, meta), request.total_amount)) return { state: 'invalid', error: 'The delivered ATM amount did not match the Magnet Can total.' };
  return {
    state: 'verified',
    payment: {
      hash: actualHash,
      payerWallet: String(tx.Account || ''),
      ledgerIndex: result?.ledger_index || tx?.ledger_index || tx?.inLedger || null,
      matchType: 'xaman-payload-tx-hash'
    }
  };
}

export async function verifyExactXrplPayment(txHash, request, options = {}) {
  const attempts = Math.max(1, Number(options.attempts) || 1);
  const delayMs = Math.max(0, Number(options.delayMs) || 0);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const found = await fetchTransactionByHash(txHash);
    if (found.state === 'found') return validateTransactionResult(found.result, txHash, request);
    if (attempt + 1 < attempts && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return { state: 'pending' };
}

async function updateTerminalStatus(admin, request, status, reason) {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('vending_payment_requests')
    .update({ status, failure_reason: reason || null, completed_at: now })
    .eq('id', request.id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function markVendingPaymentPaid(admin, request, payment) {
  const { data: reused, error: reuseError } = await admin
    .from('vending_payment_requests')
    .select('id')
    .eq('tx_hash', payment.hash)
    .neq('id', request.id)
    .maybeSingle();
  if (reuseError) throw reuseError;
  if (reused) return { reused: true };

  const now = new Date().toISOString();
  const { data: paidRow, error: paidError } = await admin
    .from('vending_payment_requests')
    .update({
      status: 'paid',
      tx_hash: payment.hash,
      payer_wallet: payment.payerWallet,
      ledger_index: payment.ledgerIndex,
      paid_at: now,
      completed_at: now,
      delivered_at: null,
      failure_reason: null
    })
    .eq('id', request.id)
    .select('*')
    .single();
  if (paidError) throw paidError;
  return { paidRow };
}

export async function resolveXamanVendingPayment(admin, request, options = {}) {
  const lookup = await fetchXamanPayload(request.payload_uuid);
  if (!lookup.found) return { kind: 'legacy' };
  const payload = lookup.payload || {};
  const meta = payload.meta || {};

  if (!meta.resolved) {
    const opened = meta.opened_by_deeplink !== null && meta.opened_by_deeplink !== undefined;
    if (meta.expired === true) {
      const row = await updateTerminalStatus(admin, request, 'expired', 'The Xaman payment request expired before it was signed.');
      return { kind: 'expired', request: row, phase: 'expired' };
    }
    return { kind: 'pending', phase: opened ? 'opened' : 'waiting' };
  }

  if (meta.signed !== true) {
    const row = await updateTerminalStatus(admin, request, 'rejected', 'The Xaman payment request was rejected.');
    return { kind: 'rejected', request: row };
  }

  const response = payload.response || {};
  const nodeType = String(response.dispatched_nodetype || '').toUpperCase();
  if (nodeType && !nodeType.includes('MAINNET')) {
    const row = await updateTerminalStatus(admin, request, 'failed', 'The payment was not submitted to XRPL Mainnet.');
    return { kind: 'failed', request: row };
  }

  const responseAccount = String(response.account || '');
  if (responseAccount && responseAccount !== String(request.expected_wallet || '')) {
    const row = await updateTerminalStatus(admin, request, 'failed', 'The Xaman payment was signed by a different wallet than the one linked to this ATM Town account.');
    return { kind: 'failed', request: row };
  }

  const txHash = String(response.txid || '').toUpperCase();
  if (!XRPL_TX_HASH.test(txHash)) return { kind: 'pending', phase: 'validating' };

  const verification = await verifyExactXrplPayment(txHash, request, {
    attempts: options.attempts,
    delayMs: options.delayMs
  });
  if (verification.state === 'pending') return { kind: 'pending', phase: 'validating', txHash };
  if (verification.state === 'invalid') {
    const row = await updateTerminalStatus(admin, request, 'failed', verification.error);
    return { kind: 'failed', request: row, error: verification.error };
  }

  const paid = await markVendingPaymentPaid(admin, request, verification.payment);
  if (paid.reused) {
    const error = 'That XRPL transaction has already been used for another purchase.';
    const row = await updateTerminalStatus(admin, request, 'failed', error);
    return { kind: 'failed', request: row, error };
  }
  return { kind: 'paid', request: paid.paidRow, matchType: verification.payment.matchType };
}
