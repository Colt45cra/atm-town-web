import { createHash, randomUUID } from 'node:crypto';
import { setCors, requireUser, sendError } from './_auth.js';
import {
  XAMAN_API_BASE,
  ATM_CURRENCY,
  ATM_ISSUER,
  ATM_DESTINATION,
  readJson,
  xamanHeaders,
  xamanError
} from './_xaman-vending.js';

const XRPL_RPC_URL = String(process.env.XRPL_RPC_URL || 'https://s1.ripple.com:51234/').trim();
const UNIT_PRICE = 100;
const MAX_QUANTITY = 99;
const PAYMENT_WINDOW_MINUTES = 30;
const XRPL_ADDRESS = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

async function verifyDestinationTrustline() {
  const response = await fetch(XRPL_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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
  if (!response.ok) {
    throw Object.assign(new Error('The XRPL server could not check the receiving wallet.'), { status: 502 });
  }

  const result = payload?.result || {};
  if (result.status === 'error' || result.error) {
    throw Object.assign(
      new Error(result.error_message || result.error || 'The XRPL trust-line check failed.'),
      { status: 502 }
    );
  }

  const hasTrustline = Array.isArray(result.lines) && result.lines.some(line =>
    String(line?.currency || '') === ATM_CURRENCY && String(line?.account || '') === ATM_ISSUER
  );

  if (!hasTrustline) {
    throw Object.assign(
      new Error('The ATM receiving wallet does not currently have the required ATM trust line.'),
      { status: 409 }
    );
  }
}

async function createXamanPayload({ purchaseId, invoiceId, quantity, total }) {
  const response = await fetch(`${XAMAN_API_BASE}/payload`, {
    method: 'POST',
    headers: xamanHeaders(),
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
        InvoiceID: invoiceId
      },
      options: {
        submit: true,
        expire: PAYMENT_WINDOW_MINUTES,
        force_network: 'MAINNET'
      },
      custom_meta: {
        identifier: purchaseId,
        instruction: `Pay ${total} ATM for ${quantity} Magnet Can${quantity === 1 ? '' : 's'} in ATM Town.`
      }
    })
  });
  const created = await readJson(response);
  if (!response.ok || !created?.uuid || !created?.next?.always) {
    throw xamanError(created, 'Xaman rejected the Magnet Can payment request');
  }
  return created;
}

async function cancelXamanPayload(payloadUuid) {
  try {
    await fetch(`${XAMAN_API_BASE}/payload/${encodeURIComponent(payloadUuid)}`, {
      method: 'DELETE',
      headers: xamanHeaders(),
      cache: 'no-store'
    });
  } catch (error) {
    console.warn('Could not cancel orphaned Xaman vending payload:', error?.message || error);
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

    const purchaseId = randomUUID();
    const invoiceId = createHash('sha256')
      .update(`atm-town-magnet:${purchaseId}`)
      .digest('hex')
      .toUpperCase();
    const total = quantity * UNIT_PRICE;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.parse(createdAt) + PAYMENT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const xamanPayload = await createXamanPayload({ purchaseId, invoiceId, quantity, total });

    const { error: insertError } = await admin.from('vending_payment_requests').insert({
      id: purchaseId,
      user_id: user.id,
      payload_uuid: xamanPayload.uuid,
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
      created_at: createdAt,
      expires_at: expiresAt
    });
    if (insertError) {
      await cancelXamanPayload(xamanPayload.uuid);
      throw insertError;
    }

    return res.status(201).json({
      purchase_id: purchaseId,
      payload_uuid: xamanPayload.uuid,
      deeplink: xamanPayload.next.always,
      qr_png: xamanPayload.refs?.qr_png || null,
      websocket_status: xamanPayload.refs?.websocket_status || null,
      quantity,
      unit_price: UNIT_PRICE,
      total,
      currency: ATM_CURRENCY,
      created_at: createdAt,
      expires_at: expiresAt,
      payment_method: 'xaman-payload-webhook'
    });
  } catch (error) {
    console.error('ATM Town Magnet payment start failed:', error);
    sendError(res, error);
  }
}
