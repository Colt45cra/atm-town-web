import { createHash, randomUUID } from 'node:crypto';
import { setCors, requireUser, adminClient, sendError } from '../lib/auth.js';
import {
  XAMAN_API_BASE,
  ATM_CURRENCY,
  ATM_ISSUER,
  ATM_DESTINATION,
  readJson,
  xamanHeaders,
  xamanError
} from '../lib/xaman-vending.js';
import {
  ATTRIBUTE_STORE_DESTINATION,
  ATTRIBUTE_STORE_PAYMENT_WINDOW_MINUTES,
  ATTRIBUTE_STORE_ASSETS,
  loadStorePrices,
  priceCart,
  invoiceIdForPurchase,
  createAttributeXamanPayload,
  cancelAttributePayload,
  verifyDestinationTrustline as verifyAttributeDestinationTrustline,
  validWallet
} from '../lib/attribute-store.js';

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


async function handleAttributeStoreGet(req, res) {
  const mode = String(req.query?.mode || 'catalog').toLowerCase();
  if (mode === 'catalog') {
    const admin = adminClient();
    const prices = await loadStorePrices(admin);
    return res.status(200).json({
      network: 'mainnet',
      prices,
      crypto_assets: Object.values(ATTRIBUTE_STORE_ASSETS).map(asset => ({ id: asset.id, label: asset.label }))
    });
  }
  if (mode === 'entitlements') {
    const { admin, user } = await requireUser(req);
    const { data, error } = await admin
      .from('attribute_entitlements')
      .select('item_id,source,granted_at,tx_hash')
      .eq('user_id', user.id)
      .order('granted_at', { ascending: false });
    if (error) throw error;
    return res.status(200).json({ item_ids: (data || []).map(row => row.item_id), entitlements: data || [] });
  }
  return res.status(400).json({ error: 'Unknown Attribute Store mode.' });
}

async function handleAttributeStoreStart(req, res) {
  let payloadUuid = '';
  try {
    const { admin, user } = await requireUser(req);
    const priced = await priceCart(admin, req.body?.item_ids, req.body?.asset_id);
    const { data: owned, error: ownedError } = await admin
      .from('attribute_entitlements')
      .select('item_id')
      .eq('user_id', user.id)
      .in('item_id', priced.ids);
    if (ownedError) throw ownedError;
    if (owned?.length) throw Object.assign(new Error('Remove attributes you already purchased before checking out.'), { status: 409 });

    const { data: account, error: accountError } = await admin
      .from('player_accounts')
      .select('wallet_address')
      .eq('user_id', user.id)
      .single();
    if (accountError) throw accountError;
    const expectedWallet = String(account?.wallet_address || '');
    if (!validWallet(expectedWallet)) throw Object.assign(new Error('Link and verify Xaman before purchasing attributes.'), { status: 409 });

    await verifyAttributeDestinationTrustline(priced.asset);
    const purchaseId = randomUUID();
    const invoiceId = invoiceIdForPurchase(purchaseId);
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.parse(createdAt) + ATTRIBUTE_STORE_PAYMENT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const xaman = await createAttributeXamanPayload({ purchaseId, invoiceId, asset: priced.asset, total: priced.total, itemCount: priced.ids.length });
    payloadUuid = xaman.uuid;

    const { error: insertError } = await admin.from('attribute_purchase_requests').insert({
      id: purchaseId,
      user_id: user.id,
      payload_uuid: xaman.uuid,
      item_ids: priced.ids,
      asset_id: priced.asset.id,
      currency: priced.asset.currency,
      issuer: priced.asset.issuer,
      destination: ATTRIBUTE_STORE_DESTINATION,
      expected_wallet: expectedWallet,
      total_amount: priced.total,
      pricing_snapshot: priced.lineItems,
      invoice_id: invoiceId,
      status: 'pending',
      created_at: createdAt,
      expires_at: expiresAt
    });
    if (insertError) throw insertError;

    return res.status(201).json({
      purchase_id: purchaseId,
      payload_uuid: xaman.uuid,
      deeplink: xaman.next.always,
      qr_png: xaman.refs?.qr_png || null,
      item_ids: priced.ids,
      total: priced.total,
      asset_id: priced.asset.id,
      asset_label: priced.asset.label,
      network: 'mainnet',
      expires_at: expiresAt
    });
  } catch (error) {
    if (payloadUuid) await cancelAttributePayload(payloadUuid);
    throw error;
  }
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'GET or POST required.' });
  }

  try {
    if (String(req.query?.commerce || '').toLowerCase() === 'attribute-store') {
      if (req.method === 'GET') return await handleAttributeStoreGet(req, res);
      return await handleAttributeStoreStart(req, res);
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST required for Magnet Can checkout.' });
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
