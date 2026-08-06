import { setCors, requireUser, sendError } from './_auth.js';

const ATM_CURRENCY = 'ATM';
const ATM_ISSUER = 'raDZ4t8WPXkmDfJWMLBcNZmmSHmBC523NZ';
const ATM_DESTINATION = 'rMSDXpxDpV2pQJDHbp77XHHhT9QHMrfPYB';
const POWER_SECONDS_PER_CAN = 30;
// v215 could acknowledge a paid row before the browser actually applied the reward.
// Limit that one-time repair to exact locally retained purchase IDs created before v216.
const LEGACY_DELIVERY_CUTOFF = Date.parse('2026-08-06T20:00:00.000Z');
const LEGACY_RECOVERY_MARKER = 'v216-pre-ack-credit-recovered';
const LEGACY_RECOVERY_MARKERS = new Set([
  'v214-legacy-credit-acknowledged',
  LEGACY_RECOVERY_MARKER
]);
const RIPPLE_EPOCH_OFFSET_SECONDS = 946684800;
const TF_PARTIAL_PAYMENT = 0x00020000;
const STRICT_INVOICE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const FALLBACK_WINDOW_MS = 90 * 60 * 1000;
const LEDGER_FRESHNESS_GRACE_MS = 5 * 60 * 1000;
const AMOUNT_ROUNDING_TOLERANCE = 1e-9;

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

function atmAmountMatch(amount, expected) {
  if (!amount || typeof amount !== 'object') return null;
  if (normalizeCurrency(amount.currency) !== ATM_CURRENCY) return null;
  if (String(amount.issuer || '') !== ATM_ISSUER) return null;
  const actualText = normalizeDecimal(amount.value);
  const expectedText = normalizeDecimal(expected);
  if (actualText === null || expectedText === null) return null;
  if (actualText === expectedText) return 'exact';
  const actual = Number(actualText);
  const target = Number(expectedText);
  if (!Number.isFinite(actual) || !Number.isFinite(target)) return null;
  return Math.abs(actual - target) <= AMOUNT_ROUNDING_TOLERANCE ? 'rounded' : null;
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
    limit: 200,
    api_version: 2
  };
  if (marker) params.marker = marker;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'atm-town-vending-status-v216',
      method: 'account_tx',
      params: [params]
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

async function fetchRecentDestinationTransactions(sinceMs = 0) {
  let lastError = null;
  let successfulEndpoint = false;
  const collected = new Map();

  for (const endpoint of rpcEndpoints()) {
    try {
      const endpointEntries = [];
      let marker = null;
      for (let page = 0; page < 5; page += 1) {
        const result = await requestAccountTx(endpoint, marker);
        if (Array.isArray(result.transactions)) endpointEntries.push(...result.transactions);
        marker = result.marker || null;
        if (!marker || endpointEntries.length >= 800) break;
      }
      successfulEndpoint = true;
      for (const entry of endpointEntries) {
        const { hash } = transactionParts(entry);
        const key = hash || JSON.stringify(entry);
        if (!collected.has(key)) collected.set(key, entry);
      }

      const newestCloseTime = endpointEntries.reduce((latest, entry) => {
        const { closeTime } = transactionParts(entry);
        return Math.max(latest, closeTime || 0);
      }, 0);
      // Do not trust an empty or obviously stale first server; continue to the
      // next public XRPL endpoint before declaring a still-pending payment.
      if (endpointEntries.length && (!sinceMs || newestCloseTime >= sinceMs - LEDGER_FRESHNESS_GRACE_MS)) {
        return [...collected.values()];
      }
    } catch (error) {
      lastError = error;
      console.warn(`XRPL endpoint failed (${endpoint}):`, error?.message || error);
    }
  }

  if (collected.size) return [...collected.values()];
  if (successfulEndpoint) return [];
  throw Object.assign(lastError || new Error('All XRPL transaction lookup servers failed.'), { status: 502 });
}

function actualDeliveredAmount(tx, meta) {
  const delivered = meta?.delivered_amount ?? meta?.DeliveredAmount ?? null;
  if (delivered && delivered !== 'unavailable') return delivered;
  const flags = Number(tx?.Flags || 0);
  if ((flags & TF_PARTIAL_PAYMENT) !== 0) return null;
  return tx?.DeliverMax ?? tx?.Amount ?? null;
}

function paymentCandidate(entry, request) {
  const { tx, meta, hash, closeTime, validated } = transactionParts(entry);
  if (!validated || !tx || typeof tx !== 'object') return null;
  if (String(tx.TransactionType || '') !== 'Payment') return null;
  if (String(tx.Destination || '') !== ATM_DESTINATION) return null;
  const resultCode = String(meta.TransactionResult || meta.transaction_result || entry?.engine_result || '');
  if (resultCode !== 'tesSUCCESS') return null;
  if (!/^[A-F0-9]{64}$/.test(hash)) return null;

  const deliveredAmount = actualDeliveredAmount(tx, meta);
  const amountMatch = atmAmountMatch(deliveredAmount, request.total_amount);
  if (!amountMatch) return null;

  const createdAt = Date.parse(request.created_at || '') || 0;
  const expiresAt = Date.parse(request.expires_at || '') || 0;
  const invoice = String(tx.InvoiceID || tx.invoice_id || '').toUpperCase();
  const expectedInvoice = String(request.invoice_id || '').toUpperCase();
  const invoiceMatches = !!invoice && !!expectedInvoice && invoice === expectedInvoice;
  const payerWallet = String(tx.Account || '');
  const payerMatches = payerWallet === String(request.expected_wallet || '');

  if (closeTime && createdAt) {
    const earliest = createdAt - 5 * 60 * 1000;
    const fallbackLatest = Math.max(createdAt + FALLBACK_WINDOW_MS, expiresAt ? expiresAt + 30 * 60 * 1000 : 0);
    const latest = invoiceMatches ? createdAt + STRICT_INVOICE_WINDOW_MS : fallbackLatest;
    if (closeTime < earliest || closeTime > latest) return null;
  }

  return {
    hash,
    closeTime,
    invoiceMatches,
    invoicePresent: !!invoice,
    payerMatches,
    amountMatch,
    ledgerIndex: entry?.ledger_index || tx?.ledger_index || tx?.inLedger || null,
    payerWallet
  };
}

function findMatchingPayment(entries, request) {
  const createdAt = Date.parse(request.created_at || '') || 0;
  const candidates = entries.map(entry => paymentCandidate(entry, request)).filter(Boolean);
  const strict = candidates
    .filter(candidate => candidate.invoiceMatches)
    .sort((a, b) => Math.abs((a.closeTime || createdAt) - createdAt) - Math.abs((b.closeTime || createdAt) - createdAt))[0];
  if (strict) {
    const rounded = strict.amountMatch === 'rounded' ? '-rounded' : '';
    return { ...strict, matchType: `${strict.payerMatches ? 'invoice-wallet' : 'invoice'}${rounded}` };
  }

  // Xaman direct request links may omit or replace InvoiceID. The linked payer,
  // exact destination/asset/amount, validated success, and tight time window are
  // still enough to identify the payment safely. Reuse protection remains server-side.
  const fallback = candidates
    .filter(candidate => candidate.payerMatches)
    .sort((a, b) => Math.abs((a.closeTime || createdAt) - createdAt) - Math.abs((b.closeTime || createdAt) - createdAt))[0];
  if (!fallback) return null;
  const invoiceSuffix = fallback.invoicePresent ? '-invoice-mismatch' : '';
  const roundedSuffix = fallback.amountMatch === 'rounded' ? '-rounded' : '';
  return { ...fallback, matchType: `wallet-amount-time${invoiceSuffix}${roundedSuffix}` };
}

function legacyRecoveryEligible(request) {
  const deliveredAt = Date.parse(request?.delivered_at || '');
  if (!Number.isFinite(deliveredAt) || deliveredAt >= LEGACY_DELIVERY_CUTOFF) return false;
  return !LEGACY_RECOVERY_MARKERS.has(String(request?.failure_reason || ''));
}

function grantResponse(request, options = {}) {
  const { allowLegacyRecovery = false, ...extra } = options;
  const legacyRecovery = allowLegacyRecovery && legacyRecoveryEligible(request);
  const canGrant = !request.delivered_at || legacyRecovery;
  return {
    status: 'paid',
    payload_uuid: request.payload_uuid,
    quantity: request.quantity,
    total: request.total_amount,
    currency: request.currency,
    tx_hash: request.tx_hash,
    ledger_index: request.ledger_index,
    grant_seconds: canGrant ? Number(request.quantity) * POWER_SECONDS_PER_CAN : 0,
    requires_acknowledgement: canGrant,
    legacy_recovery: legacyRecovery,
    already_delivered: !!request.delivered_at && !legacyRecovery,
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

  const update = legacyRecoveryEligible(request)
    ? { failure_reason: LEGACY_RECOVERY_MARKER, delivered_at: new Date().toISOString() }
    : { delivered_at: new Date().toISOString() };
  const { error: updateError } = await admin
    .from('vending_payment_requests')
    .update(update)
    .eq('id', request.id);
  if (updateError) throw updateError;
  return { status: 200, body: { acknowledged: true, payload_uuid: lookupId } };
}

async function markPaid(admin, request, payment) {
  const { data: reused } = await admin
    .from('vending_payment_requests')
    .select('id')
    .eq('tx_hash', payment.hash)
    .neq('id', request.id)
    .maybeSingle();
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

async function recoverLatest(admin, userId) {
  const { data: requests, error } = await admin
    .from('vending_payment_requests')
    .select('*')
    .eq('user_id', userId)
    .eq('product', 'magnet')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  const rows = Array.isArray(requests) ? requests : [];

  // Generic recovery only returns rewards that were never acknowledged. The
  // v215 repair path is intentionally restricted to an exact local purchase ID.
  const alreadyPaid = rows.find(row => row.status === 'paid' && !row.delivered_at);
  if (alreadyPaid) return grantResponse(alreadyPaid, { recovery: true });

  const pending = rows.filter(row => ['pending', 'opened', 'expired'].includes(row.status));
  if (!pending.length) return { status: 'none' };
  const oldestCreatedAt = pending.reduce((oldest, row) => {
    const createdAt = Date.parse(row.created_at || '') || 0;
    return createdAt && (!oldest || createdAt < oldest) ? createdAt : oldest;
  }, 0);
  const entries = await fetchRecentDestinationTransactions(oldestCreatedAt);
  for (const request of pending) {
    const payment = findMatchingPayment(entries, request);
    if (!payment) continue;
    const result = await markPaid(admin, request, payment);
    if (result.reused) continue;
    return grantResponse(result.paidRow, { recovery: true, match_type: payment.matchType });
  }
  return { status: 'pending', phase: 'background-recovery' };
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

    if (String(req.query?.recover || '') === '1') {
      return res.status(200).json(await recoverLatest(admin, user.id));
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

    const allowLegacyRecovery = String(req.query?.recover_legacy || '') === '1';
    if (request.status === 'paid') {
      return res.status(200).json(grantResponse(request, { allowLegacyRecovery }));
    }
    if (request.status === 'failed' || request.status === 'rejected') {
      return res.status(200).json({ status: request.status, error: request.failure_reason || null });
    }

    const createdAt = Date.parse(request.created_at || '') || 0;
    const entries = await fetchRecentDestinationTransactions(createdAt);
    const payment = findMatchingPayment(entries, request);

    if (!payment) {
      const ageMs = Date.now() - (createdAt || Date.now());
      return res.status(200).json({
        status: 'pending',
        phase: 'waiting-for-ledger-payment',
        stale: ageMs > 10 * 60 * 1000
      });
    }

    const result = await markPaid(admin, request, payment);
    if (result.reused) return res.status(200).json({ status: 'failed', error: 'That transaction has already been used.' });
    return res.status(200).json(grantResponse(result.paidRow, { match_type: payment.matchType }));
  } catch (error) {
    console.error('ATM Town Magnet payment status failed:', error);
    sendError(res, error);
  }
}
