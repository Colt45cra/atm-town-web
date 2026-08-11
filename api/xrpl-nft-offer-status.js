import { setCors, requireUser, sendError } from './_auth.js';
import { resolveTradePayload } from './_xrpl-nft-trading.js';

function tableMissing(error) { const t = `${error?.code || ''} ${error?.message || ''}`.toLowerCase(); return t.includes('42p01') || t.includes('does not exist') || t.includes('could not find the table'); }
export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'GET required.' }); }
  try {
    const { admin, user } = await requireUser(req);
    const payloadUuid = String(req.query?.payload_uuid || '');
    const { data: request, error } = await admin.from('nft_trade_requests').select('*').eq('payload_uuid', payloadUuid).eq('user_id', user.id).maybeSingle();
    if (error) {
      if (tableMissing(error)) throw Object.assign(new Error('NFT trading database setup is required. Run supabase/ATM-Town-v233.sql first.'), { status: 503 });
      throw error;
    }
    if (!request) return res.status(404).json({ error: 'NFT trade request not found.' });
    if (['open', 'accepted', 'failed', 'rejected', 'expired'].includes(request.status)) return res.status(200).json({ status: request.status, phase: request.status, tx_hash: request.tx_hash, offer_index: request.offer_index, token_id: request.token_id, amount_drops: request.amount_drops, amount_xrp: Number(request.amount_drops || 0) / 1_000_000, counterparty_wallet: request.counterparty_wallet, error: request.failure_reason });
    const result = await resolveTradePayload(request);
    if (['open', 'accepted', 'failed', 'rejected', 'expired'].includes(result.status)) {
      const patch = { status: result.status, tx_hash: result.tx_hash || request.tx_hash || null, offer_index: result.offer_index || request.offer_index || null, completed_at: new Date().toISOString(), failure_reason: result.error || null };
      const { error: updateError } = await admin.from('nft_trade_requests').update(patch).eq('id', request.id);
      if (updateError) throw updateError;
      if (result.status === 'accepted' && patch.offer_index) await admin.from('nft_trade_requests').update({ status: 'accepted', completed_at: new Date().toISOString() }).eq('offer_index', patch.offer_index).eq('action', 'create_buy_offer');
    }
    return res.status(200).json({ ...result, token_id: request.token_id, amount_drops: request.amount_drops, amount_xrp: Number(request.amount_drops || 0) / 1_000_000, counterparty_wallet: request.counterparty_wallet });
  } catch (error) { sendError(res, error); }
}
