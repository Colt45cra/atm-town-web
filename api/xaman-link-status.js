import { setCors, requireUser, sendError } from './_auth.js';

const XAMAN_API_BASE = 'https://xumm.app/api/v1/platform';
const XRPL_ADDRESS = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

function cleanCredential(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '').trim();
}
async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text }; }
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
    if (!/^[0-9a-f-]{36}$/i.test(payloadUuid)) return res.status(400).json({ error: 'A valid payload UUID is required.' });

    const { data: request, error: requestError } = await admin
      .from('wallet_link_requests').select('*')
      .eq('payload_uuid', payloadUuid).eq('user_id', user.id).single();
    if (requestError || !request) return res.status(404).json({ error: 'Wallet-link request not found.' });
    if (request.status === 'signed') return res.status(200).json({ status: 'signed', wallet_address: request.wallet_address || null });
    if (request.status === 'failed') return res.status(200).json({ status: 'failed', wallet_address: request.wallet_address || null });
    if (request.status === 'rejected') return res.status(200).json({ status: 'rejected' });

    const apiKey = cleanCredential(process.env.XAMAN_API_KEY);
    const apiSecret = cleanCredential(process.env.XAMAN_API_SECRET);
    if (!apiKey || !apiSecret) throw Object.assign(new Error('Xaman server environment variables are missing.'), { status: 500 });

    const response = await fetch(`${XAMAN_API_BASE}/payload/${encodeURIComponent(payloadUuid)}`, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey, 'X-API-Secret': apiSecret, 'Accept': 'application/json' },
      cache: 'no-store'
    });
    const payload = await readJson(response);
    if (!response.ok) {
      const detail = payload?.error?.message || payload?.message || `Xaman payload lookup failed (${response.status}).`;
      throw Object.assign(new Error(detail), { status: 502 });
    }

    if (!payload?.meta?.resolved) {
      const expired = payload?.meta?.expired === true;
      const opened = payload?.meta?.opened_by_deeplink !== null && payload?.meta?.opened_by_deeplink !== undefined;
      if (expired && request.status !== 'expired') {
        await admin.from('wallet_link_requests').update({ status: 'expired' }).eq('id', request.id);
      }
      return res.status(200).json({ status: expired ? 'expired' : 'pending', phase: opened ? 'opened' : 'waiting' });
    }

    if (!payload.meta.signed) {
      await admin.from('wallet_link_requests').update({ status: 'rejected', completed_at: new Date().toISOString() }).eq('id', request.id);
      return res.status(200).json({ status: 'rejected' });
    }

    const wallet = String(payload.response?.account || '');
    if (!XRPL_ADDRESS.test(wallet)) throw new Error('Xaman returned an invalid XRPL address.');

    const { data: existing, error: existingError } = await admin
      .from('player_accounts').select('user_id').eq('wallet_address', wallet).maybeSingle();
    if (existingError) throw existingError;
    if (existing && existing.user_id !== user.id) {
      const now = new Date().toISOString();
      await admin.from('wallet_link_requests').update({ status: 'failed', wallet_address: wallet, completed_at: now }).eq('id', request.id);
      return res.status(409).json({ error: 'That wallet is already linked to another ATM Town account.', status: 'failed' });
    }

    const now = new Date().toISOString();
    const { error: updateError } = await admin.from('player_accounts')
      .update({ wallet_address: wallet, wallet_verified_at: now }).eq('user_id', user.id);
    if (updateError) throw updateError;

    const { error: requestUpdateError } = await admin.from('wallet_link_requests')
      .update({ status: 'signed', wallet_address: wallet, completed_at: now }).eq('id', request.id);
    if (requestUpdateError) throw requestUpdateError;

    return res.status(200).json({ status: 'signed', wallet_address: wallet });
  } catch (error) {
    sendError(res, error);
  }
}
