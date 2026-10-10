import { randomUUID } from 'node:crypto';
import { setCors, requireUser, sendError } from '../lib/auth.js';
import { NFT_ID, XRPL_ADDRESS, cancelXamanTransaction } from '../lib/xrpl-nft-trading.js';
import { batchCapability, prepareSwapBatch, checkSwapOwnership, checkSwapSequences, createSwapPayload, signatureState, settleSwap, terminalSwap, swapError } from '../lib/xrpl-nft-swap.js';
const TABLE = 'nft_atomic_swaps';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function write(admin, id, previous, patch) {
  const { data, error } = await admin.from(TABLE).update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).eq('status', previous).select('*').maybeSingle();
  if (error) throw error;
  if (!data) throw swapError('This trade changed in another session. Refresh its status.');
  return data;
}
function visible(swap, userId) {
  const isA = swap.user_a === userId;
  const status = !terminalSwap(swap.status) && swap.status !== 'settling' && Date.parse(swap.expires_at) <= Date.now() ? 'expired' : swap.status;
  return { id: swap.id, role: isA ? 'proposer' : 'recipient', status,
    offered_token_id: swap.token_a, requested_token_id: swap.token_b,
    offered_name: swap.name_a, requested_name: swap.name_b,
    wallet_a: swap.wallet_a, wallet_b: swap.wallet_b, created_at: swap.created_at, expires_at: swap.expires_at,
    fee_drops: swap.batch_json?.Fee || null, tx_hash: swap.tx_hash, error: swap.failure_reason,
    sign_request: !isA && status === 'signing' ? swap.inner_payload : isA && status === 'settling' ? swap.final_payload : null };
}
async function resolve(admin, swap) {
  if (terminalSwap(swap.status)) return swap;
  if (['preparing', 'finalizing'].includes(swap.status) && Date.parse(swap.updated_at) < Date.now() - 120000) return write(admin, swap.id, swap.status, { status: 'failed', failure_reason: 'Sign request preparation was interrupted. Create a new proposal.' });
  if (swap.status === 'settling') {
    const result = await settleSwap(swap);
    if (terminalSwap(result.status)) return write(admin, swap.id, swap.status, { status: result.status, tx_hash: result.tx_hash || null, failure_reason: result.error || null });
    return { ...swap, tx_hash: result.tx_hash || swap.tx_hash };
  }
  if (Date.parse(swap.expires_at) <= Date.now()) {
    const expired = await write(admin, swap.id, swap.status, { status: 'expired' });
    await cancelXamanTransaction(swap.inner_payload?.uuid);
    return expired;
  }
  if (swap.status === 'signing' && swap.inner_payload?.uuid) {
    const result = await signatureState(swap.inner_payload.uuid, swap.wallet_b);
    if (result.status === 'signed') return write(admin, swap.id, swap.status, { status: 'ready' });
    if (terminalSwap(result.status)) return write(admin, swap.id, swap.status, { status: result.status, failure_reason: result.error || null });
  }
  return swap;
}
export default async function handler(req, res) {
  if (setCors(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');
  const action = String(req.query?.action || '').replace(/^swap-/, '');
  if (req.method !== (['capability', 'list', 'status'].includes(action) ? 'GET' : 'POST')) return res.status(405).json({ error: 'Unsupported request method.' });
  try {
    // Capability is public and read-only; all trade operations require a verified account.
    if (action === 'capability') return res.json({ enabled: await batchCapability(), network: 'mainnet', mode: 'all_or_nothing', wallet: 'Xaman 4.5 or newer' });
    const { admin, user } = await requireUser(req);
    const { data: player, error: playerError } = await admin.from('player_accounts').select('wallet_address,wallet_verified_at').eq('user_id', user.id).maybeSingle();
    if (playerError) throw playerError;
    if (!XRPL_ADDRESS.test(player?.wallet_address || '') || !player?.wallet_verified_at) throw swapError('Link and verify Xaman before trading NFTs.');
    if (action === 'list') {
      const { data, error } = await admin.from(TABLE).select('*').or(`user_a.eq.${user.id},user_b.eq.${user.id}`).order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      return res.json({ swaps: data.map(s => visible(s, user.id)) });
    }
    if (action === 'propose') {
      const walletB = String(req.body?.counterparty_wallet || '').trim();
      const tokenA = String(req.body?.offered_token_id || '').toUpperCase(), tokenB = String(req.body?.requested_token_id || '').toUpperCase();
      if (!XRPL_ADDRESS.test(walletB) || !NFT_ID.test(tokenA) || !NFT_ID.test(tokenB) || walletB === player.wallet_address || tokenA === tokenB) throw swapError('Choose your NFT and a different player’s NFT.', 400);
      const { data: recipients, error: recipientError } = await admin.from('player_accounts').select('user_id,wallet_verified_at').eq('wallet_address', walletB).not('wallet_verified_at', 'is', null).limit(2);
      if (recipientError) throw recipientError;
      if (recipients?.length !== 1 || recipients[0].user_id === user.id) throw swapError('The other player must have one verified ATM Town account linked to this wallet.');
      const { count, error: countError } = await admin.from(TABLE).select('id', { count: 'exact', head: true }).eq('user_a', user.id).gte('created_at', new Date(Date.now() - 3600000).toISOString());
      if (countError) throw countError;
      if (count >= 20) throw swapError('You have sent many proposals. Wait before sending more.', 429);
      if (!await batchCapability()) throw swapError('Atomic NFT trades are currently unavailable on XRPL.', 503);
      const swap = { id: randomUUID(), user_a: user.id, user_b: recipients[0].user_id, wallet_a: player.wallet_address, wallet_b: walletB,
        token_a: tokenA, token_b: tokenB, name_a: String(req.body?.offered_name || 'Your NFT').slice(0, 100), name_b: String(req.body?.requested_name || 'Requested NFT').slice(0, 100),
        status: 'offered', expires_at: new Date(Date.now() + 30 * 60000).toISOString() };
      await checkSwapOwnership(swap);
      const { error } = await admin.from(TABLE).insert(swap);
      if (error) throw error;
      return res.status(201).json(visible(swap, user.id));
    }
    const id = String(req.query?.id || req.body?.id || '');
    if (!UUID.test(id)) throw swapError('Invalid trade ID.', 400);
    const { data: original, error } = await admin.from(TABLE).select('*').eq('id', id).or(`user_a.eq.${user.id},user_b.eq.${user.id}`).maybeSingle();
    if (error) throw error;
    if (!original) throw swapError('Trade not found.', 404);
    if ((original.user_a === user.id ? original.wallet_a : original.wallet_b) !== player.wallet_address) throw swapError('Your linked wallet changed. This trade belongs to the previously linked wallet.');
    const swap = await resolve(admin, original);
    if (action === 'status') return res.json(visible(swap, user.id));
    if (action === 'cancel') {
      if (!['offered', 'signing', 'ready'].includes(swap.status)) throw swapError('This trade cannot be cancelled here. A final Xaman request must be rejected in Xaman.');
      const cancelled = await write(admin, id, swap.status, { status: 'cancelled' });
      await cancelXamanTransaction(swap.inner_payload?.uuid);
      return res.json(visible(cancelled, user.id));
    }
    if (action === 'sign') {
      if (swap.user_b !== user.id) throw swapError('Only the receiving player can approve this proposal.', 403);
      if (swap.status === 'signing' && swap.inner_payload) return res.json(visible(swap, user.id));
      if (swap.status !== 'offered') throw swapError('This proposal is no longer awaiting approval.');
      await write(admin, id, swap.status, { status: 'preparing' });
      let payload;
      try {
        const batch = await prepareSwapBatch(swap);
        payload = await createSwapPayload(batch, { id, signer: swap.wallet_b, submit: false });
        const signed = await write(admin, id, 'preparing', { status: 'signing', batch_json: batch, inner_payload: payload, expires_at: new Date(Date.now() + 10 * 60000).toISOString() });
        return res.json(visible(signed, user.id));
      } catch (err) {
        await cancelXamanTransaction(payload?.uuid);
        await write(admin, id, 'preparing', { status: 'failed', failure_reason: err.message });
        throw err;
      }
    }
    if (action === 'finalize') {
      if (swap.user_a !== user.id) throw swapError('Only the proposing player can submit the trade.', 403);
      if (swap.status === 'settling' && swap.final_payload) return res.json(visible(swap, user.id));
      if (swap.status !== 'ready') throw swapError('Wait for the other player to approve in Xaman.');
      await write(admin, id, 'ready', { status: 'finalizing' });
      let payload;
      try {
        if (!await batchCapability()) throw swapError('XRPL Batch is unavailable.', 503);
        await checkSwapSequences(swap);
        payload = await createSwapPayload({ ...swap.batch_json, BatchSigners: [swap.inner_payload.uuid] }, { id, submit: true });
        const final = await write(admin, id, 'finalizing', { status: 'settling', final_payload: payload });
        return res.json(visible(final, user.id));
      } catch (err) {
        await cancelXamanTransaction(payload?.uuid);
        await write(admin, id, 'finalizing', { status: 'failed', failure_reason: err.message });
        throw err;
      }
    }
    throw swapError('Unknown NFT swap action.', 400);
  } catch (error) { sendError(res, error); }
}
