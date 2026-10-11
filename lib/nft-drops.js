import { readFileSync } from 'node:fs';
import { NFT_ID, OFFER_ID, XRPL_ADDRESS } from './xrpl-nft-trading.js';

export const REWARDS_NFT_WALLET = 'rBFiKoUpq11CrQWnAGFtAtAuMNf1aaKLrg';
export const DONATION_BOX_ID = 'a8c7e168-1620-42af-a9d5-1f21fdb2c71e';
export const RIPPLE_EPOCH = 946684800;
const bounds = JSON.parse(readFileSync(new URL('../assets/world/manifest.json', import.meta.url))).bounds;
export const fail = (message, status = 400) => Object.assign(new Error(message), { status });
export function placement(input) {
  const { x, y, map } = input;
  if (map !== 'town' || !Number.isFinite(x) || !Number.isFinite(y) || x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) throw fail('Place the NFT on walkable land in ATM Town.');
  return { map, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}
export function freeOfferTransaction(wallet, tokenId, destination = null) {
  if (!XRPL_ADDRESS.test(wallet) || !NFT_ID.test(tokenId) || (destination && !XRPL_ADDRESS.test(destination))) throw fail('Invalid NFT wallet or token.');
  return { TransactionType: 'NFTokenCreateOffer', Account: wallet, NFTokenID: tokenId, Amount: '0', Flags: 1, ...(destination ? { Destination: destination } : {}) };
}
export function matchesFreeOffer(tx, row) {
  return tx?.TransactionType === 'NFTokenCreateOffer' && tx.Account === row.wallet_address && String(tx.NFTokenID || '').toUpperCase() === row.token_id && tx.Amount === '0' && (Number(tx.Flags || 0) & 1) === 1 && (tx.Destination || null) === (row.kind === 'donation' ? REWARDS_NFT_WALLET : null);
}
export function validFreeOffer(offer, row, now = Date.now()) {
  return offer?.LedgerEntryType === 'NFTokenOffer' && offer.Owner === row.wallet_address && String(offer.NFTokenID || '').toUpperCase() === row.token_id && offer.Amount === '0' && (Number(offer.Flags || 0) & 1) === 1 && (offer.Destination || null) === (row.kind === 'donation' ? REWARDS_NFT_WALLET : null) && (!offer.Expiration || offer.Expiration > Math.floor(now / 1000) - RIPPLE_EPOCH);
}
export function offerIndex(meta) {
  const created = (meta?.AffectedNodes || []).map(n => n.CreatedNode).find(n => n?.LedgerEntryType === 'NFTokenOffer' && OFFER_ID.test(n.LedgerIndex || ''));
  return created?.LedgerIndex?.toUpperCase() || null;
}
