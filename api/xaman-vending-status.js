import { setCors, requireUser, sendError } from './_auth.js';

const ATM_CURRENCY = 'ATM';
const ATM_ISSUER = 'raDZ4t8WPXkmDfJWMLBcNZmmSHmBC523NZ';
const ATM_DESTINATION = 'rMSDXpxDpV2pQJDHbp77XHHhT9QHMrfPYB';
const POWER_SECONDS_PER_CAN = 30;
const LEGACY_DELIVERY_CUTOFF = Date.parse('2026-08-06T00:00:00.000Z');
const LEGACY_RECOVERY_MARKER = 'v214-legacy-credit-acknowledged';
const RIPPLE_EPOCH_OFFSET_SECONDS = 946684800;

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

function exactAtmAmount(amount, expected) {
  return !!amount && typeof amount === 'object' &&
    normalizeCurrency(amount.currency) === ATM_CURRENCY &&
    String(amount.issuer || '') === ATM_ISSUER &&
    normalizeDecimal(amount.value) === normalizeDecimal(expected);
}

function transactionParts(entry) {
  const tx = entry?.tx_json || entry?.tx || entry?.transaction || {};
  const meta = entry?.meta || entry?.metaData || entry?.metadata || {};
  const hash = String(entry?.hash || tx?.hash || tx?.Hash || entry?.tx_hash || '').toUpperCase();
  const closeTime = Number.isFinite(Date.parse(entry?.close_time_iso || ''))
    ? Date.parse(entry.close_time_iso)
    : Number.isFinite(Number(tx?.date))
      ? (Number(tx.date) + RIPPLE_EPOCH_OFFSET_SECONDS) * 1000
      : 0;
  return { tx, meta, hash, closeTime, validated: entry?.validated !== false };
}

async function requestAccountTx(endpoint, marker = null) {
  const params = {
    account: ATM_DESTINATION,
    ledger_index_min: -1,
    ledger_index_max: -1,
    binary: false,
    forward: false,
    limit: 200
  };
  if (marker) params.marker = marker;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'atm-town-vending-status',
      method: 'account_tx',
      params: [params],
      api_version: 2
    })
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(`XRPL account transaction lookup failed (${response.status}).`);
  const result = payload?.result || {};
  if (result.status === 'error' || result.error) {
    throw new Error(result.error_message || result.error || 'XRPL account transaction lookup failed.');
  }
  return result;
}

async function fetchRecentDestinationTransactions() {
  let lastError = null;
  for (const endpoint of rpcEndpoints()) {
    try {
      const entries = [];
      let marker = null;
      for (let page = 0; page < 3; page += 1) {
        const result = await requestAccountTx(endpoint, marker);
        if (Array.isArray(result.transactions)) entries.push(...result.transactions);
        marker = result.marker || null;
        if (!marker || entries.length >= 500) break;
      }
      return entries;
    } catch (error) {
      lastError = error;
      console.warn(`XRPL endpoint failed (${endpoint}):`, error?.message || error);
    }
  }
  throw Object.assign(lastError || new Error('All XRPL transaction lookup servers failed.'), { status: 502 });
}

function paymentCandidate(entry, request) {
  const { tx, meta, hash, closeTime, validated } = transactionParts(entry);
  if (!validated || !tx || typeof tx !== 'object') return null;
  if (String(tx.TransactionType || '') !== 'Payment') return null;
  if (String(tx.Account || '') !== String(request.expected_wallet || '')) return null;
  if (String(tx.Destination || '') !== ATM_DESTINATION) return null;
  if (String(meta.TransactionResult || entry?.engine_result || '') !== 'tesSUCCESS') return null;
  if (!/^[A-F0-9]{64}$/.test(hash)) return null;

  const deliveredAmount = meta.delivered_amount ?? meta.DeliveredAmount ?? null;
  if (!exactAtmAmount(deliveredAmount, request.total_amount)) return null;

  const createdAt = Date.parse(request.created_at || '') || 0;
  const expiresAt = Date.parse(request.expires_at || '') || (createdAt + 30 * 60 * 1000);
  if (closeTime && (closeTime < createdAt - 2 * 60 * 1000 || closeTime > expiresAt + 30 * 60 * 1000)) return null;

  const invoice = String(tx.InvoiceID || tx.invoice_id || '').toUpperCase();
  const expectedInvoice = String(request.invoice_id || '').toUpperCase();
  return {
    hash,
    closeTime,
    invoiceMatches: !!invoice && invoice === expectedInvoice,
    invoicePresent: !!invoice,
    ledgerIndex: entry?.ledger_index || tx?.ledger_index || null,
    payerWallet: String(tx.Account || '')
  };
}

function findMatchingPayment(entries, request) {
  const candidates = entries.map(entry => paymentCandidate(entry, request)).filter(Boolean);
  const strict = candidates.find(candidate => candidate.invoiceMatches);
  if (strict) return { ...strict, matchType: 'invoice' };

  // Xaman payment-request links can pathfind and transaction serializers may omit
  // the optional InvoiceID. The fallback remains constrained to the verified payer,
  // receiver, exact delivered ATM amount, successful result, and checkout time window.
  const createdAt = Date.parse(request.created_at || '') || 0;
  const fallback = candidates
    .filter(candidate => !candidate.invoicePresent)
    .sort((a, b) => Math.abs((a.closeTime || createdAt) - createdAt) - Math.abs((b.closeTime || createdAt) - createdAt))[0];
  return fallback ? { ...fallback, matchType: 'wallet-amount-time' } : null;
}

function grantResponse(request, extra = {}) {
  const legacyRecovery = !!request.delivered_at &&
    Date.parse(request.delivered_at) < LEGACY_DELIVERY_CUTOFF &&
    String(request.failure_reason || '') !== LEGACY_RECOVERY_MARKER;
  const canGrant = !request.delivered_at || legacyRecovery;
  return {
    status: 'paid',
    quantity: request.quantity,
    total: request.total_amount,
    currency: request.currency,
    tx_hash: request.tx_hash,
    ledger_index: request.ledger_index,
    grant_seconds: canGrant ? Number(request.quantity) * POWER_SECONDS_PER_CAN : 0,
    requires_acknowledgement: canGrant,
    legacy_recovery: legacyRecovery,
    ...extra
  };
}

async function acknowledgeGrant(admin, userId, lookupId) {
  const { data: request, error } = await admin
    .from('vending_payment_requests')
    .select('*')
    .eq('payload_uuid', lookupId)
    .eq('user_id', userId)
    .single();
  if (error || !request) return { status: 404, body: { error: 'Magnet Can payment request not found.' } };
  if (request.status !== 'paid') return { status: 409, body: { error: 'The payment is not confirmed yet.' } };

  const legacyRecovery = !!request.delivered_at &&
    Date.parse(request.delivered_at) < LEGACY_DELIVERY_CUTOFF &&
    String(request.failure_reason || '') !== LEGACY_RECOVERY_MARKER;
  const update = legacyRecovery
    ? { failure_reason: LEGACY_RECOVERY_MARKER, delivered_at: new Date().toISOString() }
    : { delivered_at: new Date().toISOString() };
  const { error: updateError } = await admin
    .from('vending_payment_requests')
    .update(update)
    .eq('id', request.id);
  if (updateError) throw updateError;
  return { status: 200, body: { acknowledged: true, payload_uuid: lookupId } };
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'GET or POST required.' });
  }

  try {
    const { admin, user } = await requireUser(req);

    if (req.method === 'POST') {
      const lookupId = String(req.body?.payload_uuid || '');
      if (!/^[0-9a-f-]{36}$/i.test(lookupId)) return res.status(400).json({ error: 'A valid payment request ID is required.' });
      const result = await acknowledgeGrant(admin, user.id, lookupId);
      return res.status(result.status).json(result.body);
    }

    const lookupId = String(req.query?.payload_uuid || '');
    if (!/^[0-9a-f-]{36}$/i.test(lookupId)) {
      return res.status(400).json({ error: 'A valid payment request ID is required.' });
    }

    const { data: request, error: requestError } = await admin
      .from('vending_payment_requests')
      .select('*')
      .eq('payload_uuid', lookupId)
      .eq('user_id', user.id)
      .single();
    if (requestError || !request) {
      return res.status(404).json({ error: 'Magnet Can payment request not found.' });
    }

    if (request.status === 'paid') return res.status(200).json(grantResponse(request));
    if (request.status === 'failed' || request.status === 'rejected') {
      return res.status(200).json({ status: request.status, error: request.failure_reason || null });
    }

    const entries = await fetchRecentDestinationTransactions();
    const payment = findMatchingPayment(entries, request);

    if (!payment) {
      const expired = new Date(request.expires_at).getTime() < Date.now();
      if (expired && request.status !== 'expired') {
        await admin.from('vending_payment_requests').update({
          status: 'expired',
          failure_reason: 'No matching validated XRPL payment has been found yet.',
          completed_at: new Date().toISOString()
        }).eq('id', request.id);
      }
      return res.status(200).json({
        status: expired ? 'expired' : 'pending',
        phase: 'waiting-for-ledger-payment'
      });
    }

    const { data: reused } = await admin
      .from('vending_payment_requests')
      .select('id')
      .eq('tx_hash', payment.hash)
      .neq('id', request.id)
      .maybeSingle();
    if (reused) return res.status(200).json({ status: 'failed', error: 'That transaction has already been used.' });

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
        failure_reason: null
      })
      .eq('id', request.id)
      .select('*')
      .single();
    if (paidError) throw paidError;

    return res.status(200).json(grantResponse(paidRow, { match_type: payment.matchType }));
  } catch (error) {
    console.error('ATM Town Magnet payment status failed:', error);
    sendError(res, error);
  }
}
