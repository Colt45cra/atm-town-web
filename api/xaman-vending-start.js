import { createHash, randomUUID } from 'node:crypto';
import { setCors, requireUser, sendError } from './_auth.js';

const XAMAN_API_BASE = 'https://xumm.app/api/v1/platform';
const XRPL_RPC_URL = String(process.env.XRPL_RPC_URL || 'https://s1.ripple.com:51234/').trim();
const ATM_TOWN_RETURN_URL = 'https://atm-town-web.vercel.app/?xaman_payment_return=1&payload={id}';
const ATM_CURRENCY = 'ATM';
const ATM_ISSUER = 'raDZ4t8WPXkmDfJWMLBcNZmmSHmBC523NZ';
const ATM_DESTINATION = 'rMSDXpxDpV2pQJDHbp77XHHhT9QHMrfPYB';
const UNIT_PRICE = 100;
const MAX_QUANTITY = 99;
const XRPL_ADDRESS = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

function cleanCredential(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '').trim();
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function toHex(value) {
  return Buffer.from(String(value), 'utf8').toString('hex').toUpperCase();
}

function xamanError(payload, fallback) {
  const code = payload?.error?.code ?? payload?.code ?? null;
  const reference = payload?.error?.reference ?? payload?.reference ?? null;
  const detail = [code ? `code ${code}` : null, reference ? `reference ${reference}` : null]
    .filter(Boolean).join(', ');
  return Object.assign(new Error(detail ? `${fallback} (${detail}).` : fallback), {
    status: 502,
    xamanCode: code,
    xamanReference: reference
  });
}

async function verifyDestinationTrustline() {
  const response = await fetch(XRPL_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      method: 'account_lines',
      params: [{
        account: ATM_DESTINATION,
        peer: ATM_ISSUER,
        ledger_index: 'validated',
        limit: 400
      }]
    })
  });
  const payload = await readJson(response);
  if (!response.ok) throw Object.assign(new Error('The XRPL server could not check the receiving wallet.'), { status: 502 });
  const result = payload?.result || {};
  if (result.status === 'error' || result.error) {
    throw Object.assign(new Error(result.error_message || result.error || 'The XRPL trust-line check failed.'), { status: 502 });
  }
  const hasTrustline = Array.isArray(result.lines) && result.lines.some(line =>
    String(line?.currency || '') === ATM_CURRENCY && String(line?.account || '') === ATM_ISSUER
  );
  if (!hasTrustline) {
    throw Object.assign(new Error('The ATM receiving wallet does not currently have the required ATM trust line.'), { status: 409 });
  }
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST required.' });
  }

  try {
    const { admin, user } = await requireUser(req);
    const quantity = Number(req.body?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return res.status(400).json({ error: `Choose between 1 and ${MAX_QUANTITY} Magnet Cans.` });
    }

    const { data: accountRow, error: accountError } = await admin
      .from('player_accounts')
      .select('wallet_address')
      .eq('user_id', user.id)
      .single();
    if (accountError) throw accountError;

    const payerWallet = String(accountRow?.wallet_address || '');
    if (!XRPL_ADDRESS.test(payerWallet)) {
      return res.status(409).json({ error: 'Link and verify a Xaman wallet before purchasing Magnet Cans.' });
    }

    await verifyDestinationTrustline();

    const apiKey = cleanCredential(process.env.XAMAN_API_KEY);
    const apiSecret = cleanCredential(process.env.XAMAN_API_SECRET);
    if (!apiKey || !apiSecret) {
      throw Object.assign(new Error('Xaman server environment variables are missing.'), { status: 500 });
    }

    const purchaseId = randomUUID();
    const invoiceId = createHash('sha256')
      .update(`atm-town-magnet:${purchaseId}`)
      .digest('hex')
      .toUpperCase();
    const total = quantity * UNIT_PRICE;
    const headers = {
      'X-API-Key': apiKey,
      'X-API-Secret': apiSecret,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const payloadResponse = await fetch(`${XAMAN_API_BASE}/payload`, {
      method: 'POST',
      headers,
      cache: 'no-store',
      body: JSON.stringify({
        txjson: {
          TransactionType: 'Payment',
          Destination: ATM_DESTINATION,
          Amount: {
            currency: ATM_CURRENCY,
            issuer: ATM_ISSUER,
            value: String(total)
          },
          InvoiceID: invoiceId,
          Memos: [{
            Memo: {
              MemoType: toHex('ATM Town Magnet Can'),
              MemoData: toHex(`magnet:${purchaseId}`)
            }
          }]
        },
        options: {
          return_url: {
            app: ATM_TOWN_RETURN_URL,
            web: ATM_TOWN_RETURN_URL
          }
        },
        custom_meta: {
          identifier: `atm-magnet-${purchaseId}`,
          instruction: `${quantity} Magnet Can${quantity === 1 ? '' : 's'} · ${total} ATM total`
        }
      })
    });

    const created = await readJson(payloadResponse);
    if (!payloadResponse.ok || !created?.uuid || !created?.next?.always) {
      throw xamanError(created, 'Xaman rejected the Magnet Can payment request');
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insertError } = await admin.from('vending_payment_requests').insert({
      id: purchaseId,
      user_id: user.id,
      payload_uuid: created.uuid,
      product: 'magnet',
      quantity,
      unit_price: UNIT_PRICE,
      total_amount: total,
      currency: ATM_CURRENCY,
      issuer: ATM_ISSUER,
      destination: ATM_DESTINATION,
      expected_wallet: payerWallet,
      invoice_id: invoiceId,
      status: 'pending',
      expires_at: expiresAt
    });
    if (insertError) throw insertError;

    return res.status(201).json({
      purchase_id: purchaseId,
      payload_uuid: created.uuid,
      deeplink: created.next.always,
      qr_png: created.refs?.qr_png || null,
      websocket_status: created.refs?.websocket_status || null,
      quantity,
      unit_price: UNIT_PRICE,
      total,
      currency: ATM_CURRENCY,
      expires_at: expiresAt
    });
  } catch (error) {
    console.error('ATM Town Magnet payment start failed:', error);
    sendError(res, error);
  }
}
