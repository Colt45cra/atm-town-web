import { setCors, requireUser, sendError } from '../lib/auth.js';
import { XRPL_ADDRESS, NFT_ID, findOwnedNft, getBuyOffers } from '../lib/xrpl-nft-trading.js';

function shortWallet(value) { const v = String(value || ''); return XRPL_ADDRESS.test(v) ? `${v.slice(0, 6)}…${v.slice(-6)}` : ''; }
export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'GET required.' }); }
  try {
    const { admin, user } = await requireUser(req);
    const tokenId = String(req.query?.token_id || '').toUpperCase();
    if (!NFT_ID.test(tokenId)) return res.status(400).json({ error: 'Invalid NFTokenID.' });
    const { data: player, error: playerError } = await admin.from('player_accounts').select('wallet_address').eq('user_id', user.id).maybeSingle();
    if (playerError) throw playerError;
    const ownerWallet = String(player?.wallet_address || '');
    if (!XRPL_ADDRESS.test(ownerWallet)) return res.status(409).json({ error: 'Link and verify Xaman first.' });
    const nft = await findOwnedNft(ownerWallet, tokenId);
    if (!nft) return res.status(409).json({ error: 'Your linked wallet no longer owns this NFT.' });
    const offers = await getBuyOffers(tokenId);
    const xrpOffers = offers.filter(o => /^\d+$/.test(String(o?.amount || '')) && Number(o.amount) > 0);
    const wallets = [...new Set(xrpOffers.map(o => String(o.owner || '')).filter(value => XRPL_ADDRESS.test(value)))];
    const names = new Map();
    if (wallets.length) {
      const { data: rows } = await admin.from('player_accounts').select('wallet_address,display_name').in('wallet_address', wallets);
      for (const row of rows || []) names.set(row.wallet_address, row.display_name || '');
    }
    return res.status(200).json({ token_id: tokenId, owner_wallet: shortWallet(ownerWallet), offers: xrpOffers.map(o => ({ offer_index: String(o.nft_offer_index || '').toUpperCase(), buyer_wallet: shortWallet(o.owner), buyer_name: names.get(o.owner) || '', amount_drops: Number(o.amount), amount_xrp: Number(o.amount) / 1_000_000, expiration: o.expiration || null })).sort((a, b) => b.amount_drops - a.amount_drops) });
  } catch (error) { sendError(res, error); }
}
