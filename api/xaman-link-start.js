import { setCors, requireUser } from './_auth.js';

const XAMAN_API_BASE = 'https://xumm.app/api/v1/platform';
const ATM_TOWN_RETURN_URL = 'https://atm-town-web.vercel.app/?xaman_return=1&payload={id}';

function cleanCredential(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '').trim();
}
async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text }; }
}
function xamanError(payload, fallback) {
  const code = payload?.error?.code ?? payload?.code ?? null;
  const reference = payload?.error?.reference ?? payload?.reference ?? null;
  const details = [code ? `code ${code}` : null, reference ? `reference ${reference}` : null].filter(Boolean).join(', ');
  return Object.assign(new Error(details ? `${fallback} (${details}).` : fallback), {
    status: 502, xamanCode: code, xamanReference: reference
  });
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST required.' });
  }
  try {
    const { admin, user } = await requireUser(req);
    const { data: account, error: accountError } = await admin
      .from('player_accounts').select('wallet_address').eq('user_id', user.id).single();
    if (accountError) throw accountError;
    if (account?.wallet_address) return res.status(409).json({ error: 'This ATM Town account already has a linked wallet.' });

    const apiKey = cleanCredential(process.env.XAMAN_API_KEY);
    const apiSecret = cleanCredential(process.env.XAMAN_API_SECRET);
    if (!apiKey || !apiSecret) return res.status(500).json({ error: 'Xaman server environment variables are missing.' });
    const headers = {
      'X-API-Key': apiKey,
      'X-API-Secret': apiSecret,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const pingResponse = await fetch(`${XAMAN_API_BASE}/ping`, { method: 'GET', headers, cache: 'no-store' });
    const ping = await readJson(pingResponse);
    if (!pingResponse.ok) throw xamanError(ping, 'Xaman rejected the ATM Town API credentials');
    if (Number(ping?.application?.disabled) === 1) {
      throw Object.assign(new Error('The Xaman application connected to ATM Town is disabled.'), { status: 502 });
    }

    const payloadResponse = await fetch(`${XAMAN_API_BASE}/payload`, {
      method: 'POST', headers, cache: 'no-store',
      body: JSON.stringify({
        txjson: { TransactionType: 'SignIn' },
        options: {
          return_url: {
            app: ATM_TOWN_RETURN_URL,
            web: ATM_TOWN_RETURN_URL
          }
        }
      })
    });
    const created = await readJson(payloadResponse);
    if (!payloadResponse.ok || !created?.uuid || !created?.next?.always) {
      throw xamanError(created, 'Xaman rejected the SignIn request');
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error: insertError } = await admin.from('wallet_link_requests').insert({
      user_id: user.id,
      payload_uuid: created.uuid,
      status: 'pending',
      expires_at: expiresAt
    });
    if (insertError) throw insertError;

    return res.status(201).json({
      payload_uuid: created.uuid,
      deeplink: created.next.always,
      websocket_status: created.refs?.websocket_status || null,
      expires_at: expiresAt,
      xaman_app: ping?.application?.name || null
    });
  } catch (error) {
    console.error('ATM Town Xaman link start failed:', error);
    return res.status(error?.status || 500).json({
      error: error?.message || 'Could not start Xaman wallet linking.',
      xaman_code: error?.xamanCode || null,
      xaman_reference: error?.xamanReference || null
    });
  }
}
