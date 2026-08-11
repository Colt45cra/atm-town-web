import { randomUUID } from 'node:crypto';
import { setCors, requireUser, sendError } from './_auth.js';
import { XRPL_ADDRESS, NFT_ID, OFFER_ID, findOwnedNft, getBuyOffers, createXamanTransaction, cancelXamanTransaction } from './_xrpl-nft-trading.js';

function tableMissing(error) { const t = `${error?.code || ''} ${error?.message || ''}`.toLowerCase(); return t.includes('42p01') || t.includes('does not exist') || t.includes('could not find the table'); }
export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'POST required.' }); }
  try {
    const { admin, user } = await requireUser(req);
    const tokenId = String(req.body?.token_id || '').toUpperCase();
    const offerIndex = String(req.body?.offer_index || '').toUpperCase();
    if (!NFT_ID.test(tokenId) || !OFFER_ID.test(offerIndex)) return res.status(400).json({ error: 'Invalid NFT offer.' });
    const { data: seller, error: sellerError } = await admin.from('player_accounts').select('wallet_address').eq('user_id', user.id).maybeSingle();
    if (sellerError) throw sellerError;
    const sellerWallet = String(seller?.wallet_address || '');
    if (!XRPL_ADDRESS.test(sellerWallet)) return res.status(409).json({ error: 'Link and verify Xaman before accepting NFT offers.' });
    const nft = await findOwnedNft(sellerWallet, tokenId);
    if (!nft) return res.status(409).json({ error: 'This linked wallet no longer owns that NFT.' });
    const offers = await getBuyOffers(tokenId);
    const offer = offers.find(o => String(o?.nft_offer_index || '').toUpperCase() === offerIndex);
    if (!offer) return res.status(409).json({ error: 'That buy offer is no longer active on XRPL.' });
    const amountDrops = /^\d+$/.test(String(offer.amount || '')) ? Number(offer.amount) : null;
    if (!amountDrops || amountDrops <= 0) return res.status(409).json({ error: 'ATM Town v233 only accepts XRP-denominated NFT buy offers.' });
    const buyerWallet = String(offer.owner || '');
    const id = randomUUID();
    const created = await createXamanTransaction({ TransactionType: 'NFTokenAcceptOffer', NFTokenBuyOffer: offerIndex }, {
      identifier: id,
      instruction: `Accept the ${(amountDrops / 1_000_000).toFixed(6).replace(/0+$/, '').replace(/\.$/, '')} XRP NFT buy offer in ATM Town.`
    });
    const { error: insertError } = await admin.from('nft_trade_requests').insert({ id, action: 'accept_buy_offer', user_id: user.id, expected_wallet: sellerWallet, counterparty_wallet: buyerWallet, token_id: tokenId, amount_drops: amountDrops, offer_index: offerIndex, payload_uuid: created.uuid, status: 'pending', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() });
    if (insertError) {
      await cancelXamanTransaction(created.uuid);
      if (tableMissing(insertError)) throw Object.assign(new Error('NFT trading database setup is required. Run supabase/ATM-Town-v233.sql first.'), { status: 503 });
      throw insertError;
    }
    return res.status(201).json({ request_id: id, payload_uuid: created.uuid, deeplink: created.next.always, offer_index: offerIndex, token_id: tokenId, amount_drops: amountDrops, amount_xrp: amountDrops / 1_000_000, buyer_wallet: buyerWallet });
  } catch (error) { sendError(res, error); }
}
