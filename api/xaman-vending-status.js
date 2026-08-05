import { setCors, requireUser, sendError } from './_auth.js';

const XAMAN_API_BASE = 'https://xumm.app/api/v1/platform';
const XRPL_RPC_URL = String(process.env.XRPL_RPC_URL || 'https://s1.ripple.com:51234/').trim();
const ATM_CURRENCY = 'ATM';
const ATM_ISSUER = 'raDZ4t8WPXkmDfJWMLBcNZmmSHmBC523NZ';
const ATM_DESTINATION = 'rMSDXpxDpV2pQJDHbp77XHHhT9QHMrfPYB';
const POWER_SECONDS_PER_CAN = 30;
const TF_PARTIAL_PAYMENT = 0x00020000;

function cleanCredential(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '').trim();
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function exactInteger(value, expected) {
  const text = String(value ?? '').trim();
  return /^\d+(?:\.0+)?$/.test(text) && Number(text) === Number(expected);
}

function exactAtmAmount(amount, expected) {
  return !!amount && typeof amount === 'object' &&
    String(amount.currency || '') === ATM_CURRENCY &&
    String(amount.issuer || '') === ATM_ISSUER &&
    exactInteger(amount.value, expected);
}

async function fetchXrplTransaction(txHash) {
  const response = await fetch(XRPL_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      method: 'tx',
      params: [{ transaction: txHash, binary: false }]
    })
  });
  const payload = await readJson(response);
  if (!response.ok) throw Object.assign(new Error(`XRPL transaction lookup failed (${response.status}).`), { status: 502 });
  const result = payload?.result || {};
  if (result.error === 'txnNotFound') return null;
  if (result.status === 'error' || result.error) {
    throw Object.assign(new Error(result.error_message || result.error || 'XRPL transaction lookup failed.'), { status: 502 });
  }
  return result;
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

async function failRequest(admin, request, reason, status = 'failed') {
  const now = new Date().toISOString();
  await admin.from('vending_payment_requests').update({
    status,
    failure_reason: String(reason || '').slice(0, 500),
    completed_at: now
  }).eq('id', request.id);
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET required.' });
  }

  try {
    const { admin, user } = await requireUser(req);
    const payloadUuid = String(req.query?.payload_uuid || '');
    if (!/^[0-9a-f-]{36}$/i.test(payloadUuid)) {
      return res.status(400).json({ error: 'A valid Xaman payload UUID is required.' });
    }

    const { data: request, error: requestError } = await admin
      .from('vending_payment_requests')
      .select('*')
      .eq('payload_uuid', payloadUuid)
      .eq('user_id', user.id)
      .single();
    if (requestError || !request) return res.status(404).json({ error: 'Magnet Can payment request not found.' });

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
    if (['rejected', 'expired', 'failed'].includes(request.status)) {
      return res.status(200).json({ status: request.status, error: request.failure_reason || null });
    }

    const apiKey = cleanCredential(process.env.XAMAN_API_KEY);
    const apiSecret = cleanCredential(process.env.XAMAN_API_SECRET);
    if (!apiKey || !apiSecret) {
      throw Object.assign(new Error('Xaman server environment variables are missing.'), { status: 500 });
    }

    const xamanResponse = await fetch(`${XAMAN_API_BASE}/payload/${encodeURIComponent(payloadUuid)}`, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey, 'X-API-Secret': apiSecret, 'Accept': 'application/json' },
      cache: 'no-store'
    });
    const payload = await readJson(xamanResponse);
    if (!xamanResponse.ok) {
      throw Object.assign(new Error(payload?.error?.message || payload?.message || 'Xaman payload lookup failed.'), { status: 502 });
    }

    if (!payload?.meta?.resolved) {
      const expired = payload?.meta?.expired === true || new Date(request.expires_at).getTime() < Date.now();
      const opened = payload?.meta?.opened_by_deeplink !== null && payload?.meta?.opened_by_deeplink !== undefined;
      if (expired) {
        await failRequest(admin, request, 'The Xaman payment request expired before it was signed.', 'expired');
        return res.status(200).json({ status: 'expired' });
      }
      if (opened && request.status !== 'opened') {
        await admin.from('vending_payment_requests').update({ status: 'opened' }).eq('id', request.id);
      }
      return res.status(200).json({ status: 'pending', phase: opened ? 'opened' : 'waiting' });
    }

    if (!payload.meta.signed) {
      await failRequest(admin, request, 'The Xaman payment request was rejected.', 'rejected');
      return res.status(200).json({ status: 'rejected' });
    }

    const txHash = String(payload.response?.txid || '').toUpperCase();
    const payerWallet = String(payload.response?.account || '');
    if (!/^[A-F0-9]{64}$/.test(txHash)) {
      await failRequest(admin, request, 'Xaman did not return a valid transaction hash.');
      return res.status(200).json({ status: 'failed', error: 'Xaman did not return a valid transaction hash.' });
    }
    if (payerWallet !== request.expected_wallet) {
      await failRequest(admin, request, 'The payment was signed by a wallet other than the wallet linked to this ATM Town account.');
      return res.status(200).json({ status: 'failed', error: 'Payment wallet did not match the linked wallet.' });
    }

    const networkType = String(payload.response?.network_type || '').toUpperCase();
    if (networkType && !networkType.includes('MAIN')) {
      await failRequest(admin, request, `Payment was signed on ${networkType}, not XRPL Mainnet.`);
      return res.status(200).json({ status: 'failed', error: 'The payment must be completed on XRPL Mainnet.' });
    }

    const xrpl = await fetchXrplTransaction(txHash);
    if (!xrpl || xrpl.validated !== true) {
      return res.status(200).json({ status: 'pending', phase: 'validating', tx_hash: txHash });
    }

    const tx = xrpl.tx_json || xrpl;
    const meta = xrpl.meta || xrpl.metaData || {};
    const resultCode = String(meta.TransactionResult || xrpl.engine_result || '');
    const expectedTotal = Number(request.total_amount);
    const requestedAmount = tx.Amount || tx.DeliverMax;
    const deliveredAmount = meta.delivered_amount || meta.DeliveredAmount || xrpl.delivered_amount || null;
    const flags = Number(tx.Flags || 0);

    const checks = [
      [resultCode === 'tesSUCCESS', `XRPL result was ${resultCode || 'unknown'}, not tesSUCCESS.`],
      [String(tx.TransactionType || '') === 'Payment', 'The signed transaction was not a Payment.'],
      [String(tx.Account || '') === request.expected_wallet, 'The XRPL sender did not match the linked wallet.'],
      [String(tx.Destination || '') === ATM_DESTINATION, 'The payment destination was incorrect.'],
      [String(tx.InvoiceID || '').toUpperCase() === String(request.invoice_id || '').toUpperCase(), 'The payment invoice identifier was incorrect.'],
      [exactAtmAmount(requestedAmount, expectedTotal), 'The requested ATM amount, currency, or issuer was incorrect.'],
      [deliveredAmount ? exactAtmAmount(deliveredAmount, expectedTotal) : (flags & TF_PARTIAL_PAYMENT) === 0, 'The exact ATM amount was not delivered.']
    ];
    const failed = checks.find(([ok]) => !ok);
    if (failed) {
      await failRequest(admin, request, failed[1]);
      return res.status(200).json({ status: 'failed', error: failed[1] });
    }

    const { data: reused } = await admin
      .from('vending_payment_requests')
      .select('id')
      .eq('tx_hash', txHash)
      .neq('id', request.id)
      .maybeSingle();
    if (reused) {
      await failRequest(admin, request, 'This XRPL transaction was already used for another vending purchase.');
      return res.status(200).json({ status: 'failed', error: 'That transaction has already been used.' });
    }

    const now = new Date().toISOString();
    const { data: paidRow, error: paidError } = await admin
      .from('vending_payment_requests')
      .update({
        status: 'paid',
        tx_hash: txHash,
        payer_wallet: payerWallet,
        ledger_index: xrpl.ledger_index || null,
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
      tx_hash: txHash,
      ledger_index: paidRow.ledger_index,
      grant_seconds: grantSeconds
    });
  } catch (error) {
    console.error('ATM Town Magnet payment status failed:', error);
    sendError(res, error);
  }
}
