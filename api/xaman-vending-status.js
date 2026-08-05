import { setCors, requireUser, sendError } from './_auth.js';

const XRPL_RPC_URL = String(process.env.XRPL_RPC_URL || 'https://s1.ripple.com:51234/').trim();
const ATM_CURRENCY = 'ATM';
const ATM_ISSUER = 'raDZ4t8WPXkmDfJWMLBcNZmmSHmBC523NZ';
const ATM_DESTINATION = 'rMSDXpxDpV2pQJDHbp77XHHhT9QHMrfPYB';
const POWER_SECONDS_PER_CAN = 30;
const TF_PARTIAL_PAYMENT = 0x00020000;

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function exactNumber(value, expected) {
  const text = String(value ?? '').trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return false;
  return Number(text) === Number(expected);
}

function exactAtmAmount(amount, expected) {
  return !!amount && typeof amount === 'object' &&
    String(amount.currency || '') === ATM_CURRENCY &&
    String(amount.issuer || '') === ATM_ISSUER &&
    exactNumber(amount.value, expected);
}

function transactionParts(entry) {
  const tx = entry?.tx_json || entry?.tx || entry?.transaction || {};
  const meta = entry?.meta || entry?.metaData || entry?.metadata || {};
  const hash = String(
    entry?.hash || tx?.hash || tx?.Hash || entry?.tx_hash || ''
  ).toUpperCase();
  return { tx, meta, hash, validated: entry?.validated !== false };
}

async function fetchRecentDestinationTransactions() {
  const response = await fetch(XRPL_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      method: 'account_tx',
      params: [{
        account: ATM_DESTINATION,
        ledger_index_min: -1,
        ledger_index_max: -1,
        binary: false,
        forward: false,
        limit: 200
      }]
    })
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw Object.assign(new Error(`XRPL account transaction lookup failed (${response.status}).`), { status: 502 });
  }

  const result = payload?.result || {};
  if (result.status === 'error' || result.error) {
    throw Object.assign(
      new Error(result.error_message || result.error || 'XRPL account transaction lookup failed.'),
      { status: 502 }
    );
  }

  return Array.isArray(result.transactions) ? result.transactions : [];
}

function findMatchingPayment(entries, request) {
  const expectedTotal = Number(request.total_amount);
  const expectedInvoice = String(request.invoice_id || '').toUpperCase();

  for (const entry of entries) {
    const { tx, meta, hash, validated } = transactionParts(entry);
    if (!validated || !tx || typeof tx !== 'object') continue;
    if (String(tx.TransactionType || '') !== 'Payment') continue;
    if (String(tx.InvoiceID || '').toUpperCase() !== expectedInvoice) continue;
    if (String(tx.Account || '') !== String(request.expected_wallet || '')) continue;
    if (String(tx.Destination || '') !== ATM_DESTINATION) continue;

    const resultCode = String(meta.TransactionResult || entry?.engine_result || '');
    if (resultCode !== 'tesSUCCESS') continue;

    const requestedAmount = tx.Amount || tx.DeliverMax;
    const deliveredAmount = meta.delivered_amount || meta.DeliveredAmount || null;
    const flags = Number(tx.Flags || 0);

    const requestedCorrect = exactAtmAmount(requestedAmount, expectedTotal);
    const deliveredCorrect = deliveredAmount
      ? exactAtmAmount(deliveredAmount, expectedTotal)
      : requestedCorrect && (flags & TF_PARTIAL_PAYMENT) === 0;

    if (!requestedCorrect || !deliveredCorrect) continue;
    if (!/^[A-F0-9]{64}$/.test(hash)) continue;

    return {
      hash,
      ledgerIndex: entry?.ledger_index || tx?.ledger_index || null,
      payerWallet: String(tx.Account || '')
    };
  }

  return null;
}

async function deliverGrant(admin, request) {
  if (request.delivered_at) return 0;
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('vending_payment_requests')
    .update({ delivered_at: now })
    .eq('id', request.id)
    .is('delivered_at', null)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return data ? Number(request.quantity) * POWER_SECONDS_PER_CAN : 0;
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET required.' });
  }

  try {
    const { admin, user } = await requireUser(req);
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

    if (request.status === 'paid') {
      const grantSeconds = await deliverGrant(admin, request);
      return res.status(200).json({
        status: 'paid',
        quantity: request.quantity,
        total: request.total_amount,
        currency: request.currency,
        tx_hash: request.tx_hash,
        grant_seconds: grantSeconds
      });
    }

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
    if (reused) {
      return res.status(200).json({ status: 'failed', error: 'That transaction has already been used.' });
    }

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

    const grantSeconds = await deliverGrant(admin, paidRow);
    return res.status(200).json({
      status: 'paid',
      quantity: paidRow.quantity,
      total: paidRow.total_amount,
      currency: paidRow.currency,
      tx_hash: payment.hash,
      ledger_index: payment.ledgerIndex,
      grant_seconds: grantSeconds
    });
  } catch (error) {
    console.error('ATM Town Magnet payment status failed:', error);
    sendError(res, error);
  }
}
