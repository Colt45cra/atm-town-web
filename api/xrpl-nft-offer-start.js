import { randomUUID } from 'node:crypto';
import { setCors, requireUser, sendError } from './_auth.js';
import { XRPL_ADDRESS, NFT_ID, findOwnedNft, createXamanTransaction, cancelXamanTransaction } from './_xrpl-nft-trading.js';

const MAX_XRP = 1000000000;
function xrpToDrops(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,6})?$/.test(text)) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_XRP) return null;
  return Math.round(n * 1_000_000);
}
function tableMissing(error) {
  const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  return text.includes('42p01') || text.includes('does not exist') || text.includes('could not find the table');
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'POST required.' }); }
  try {
    const { admin, user } = await requireUser(req);
    const tokenId = String(req.body?.token_id || '').toUpperCase();
    const sellerWallet = String(req.body?.seller_wallet || '').trim();
    const amountDrops = xrpToDrops(req.body?.amount_xrp);
    if (!NFT_ID.test(tokenId) || !XRPL_ADDRESS.test(sellerWallet) || !amountDrops) return res.status(400).json({ error: 'Choose a valid NFT and XRP offer amount.' });
    const { data: buyer, error: buyerError } = await admin.from('player_accounts').select('wallet_address').eq('user_id', user.id).maybeSingle();
    if (buyerError) throw buyerError;
    const buyerWallet = String(buyer?.wallet_address || '');
    if (!XRPL_ADDRESS.test(buyerWallet)) return res.status(409).json({ error: 'Link and verify Xaman before making NFT offers.' });
    if (buyerWallet === sellerWallet) return res.status(409).json({ error: 'You already own this displayed NFT.' });
    const nft = await findOwnedNft(sellerWallet, tokenId);
    if (!nft) return res.status(409).json({ error: 'The displayed player no longer owns this NFT.' });
    if ((Number(nft.Flags || 0) & 0x0008) === 0) return res.status(409).json({ error: 'This NFT is not transferable between ordinary XRPL accounts.' });

    const id = randomUUID();
    const created = await createXamanTransaction({ TransactionType: 'NFTokenCreateOffer', Owner: sellerWallet, NFTokenID: tokenId, Amount: String(amountDrops) }, {
      identifier: id,
      instruction: `Offer ${(amountDrops / 1_000_000).toFixed(6).replace(/0+$/, '').replace(/\.$/, '')} XRP for the displayed NFT in ATM Town.`
    });
    const createdAt = new Date().toISOString(), expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { error: insertError } = await admin.from('nft_trade_requests').insert({ id, action: 'create_buy_offer', user_id: user.id, expected_wallet: buyerWallet, counterparty_wallet: sellerWallet, token_id: tokenId, amount_drops: amountDrops, payload_uuid: created.uuid, status: 'pending', created_at: createdAt, expires_at: expiresAt });
    if (insertError) {
      await cancelXamanTransaction(created.uuid);
      if (tableMissing(insertError)) throw Object.assign(new Error('NFT trading database setup is required. Run supabase/ATM-Town-v233.sql first.'), { status: 503 });
      throw insertError;
    }
    return res.status(201).json({ request_id: id, payload_uuid: created.uuid, deeplink: created.next.always, qr_png: created.refs?.qr_png || null, amount_drops: amountDrops, amount_xrp: amountDrops / 1_000_000, token_id: tokenId, seller_wallet: sellerWallet });
  } catch (error) { sendError(res, error); }
}
