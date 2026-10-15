import { createHash, randomBytes, randomUUID } from 'node:crypto';
import codec from './xrpl-swap-codec.cjs';
const { decode, encodeForSigning, verify, deriveAddress } = codec;
export const PAY_ORIGIN = 'https://atm-pay-two.vercel.app';
export const capabilityHash = secret => createHash('sha256').update(String(secret || '')).digest('hex');
export function payRequest(kind, id) {
  const uuid = randomUUID(), secret = randomBytes(32).toString('hex');
  return { provider: 'atm_pay', uuid, secret_hash: capabilityHash(secret), deeplink: `${PAY_ORIGIN}/town#kind=${kind}&id=${id}&request=${uuid}&secret=${secret}` };
}
export function checkCapability(payload, request, secret) {
  if (!payload || payload.provider !== 'atm_pay' || payload.uuid !== request || !/^[a-f0-9]{64}$/.test(String(secret || '')) || payload.secret_hash !== capabilityHash(secret)) throw Object.assign(new Error('This ATM Pay request is invalid or expired.'), { status: 404 });
}
export function verifyWalletLink(blob, request, payUserId) {
  if (typeof blob !== 'string' || blob.length > 4096 || !/^[A-F0-9]+$/i.test(blob) || !/^[0-9a-f-]{36}$/i.test(payUserId || '')) throw new Error('Invalid wallet link proof.');
  const tx = decode(blob);
  const expectedMemo = Buffer.from(`ATM Town wallet link|${request.id}|${request.user_id}|${payUserId}`).toString('hex').toUpperCase();
  const keys = ['TransactionType','Account','Fee','Sequence','LastLedgerSequence','SigningPubKey','TxnSignature','Memos'];
  if (Object.keys(tx).some(k => !keys.includes(k)) || tx.TransactionType !== 'AccountSet' || tx.Fee !== '0' || tx.Sequence !== 0 || tx.LastLedgerSequence !== 1 ||
      JSON.stringify(tx.Memos) !== JSON.stringify([{ Memo: { MemoData: expectedMemo } }]) || !tx.SigningPubKey || !tx.TxnSignature || deriveAddress(tx.SigningPubKey) !== tx.Account || !verify(encodeForSigning(tx), tx.TxnSignature, tx.SigningPubKey)) throw new Error('The wallet link signature does not match this request.');
  return tx.Account;
}
export async function nftWallet(admin, userId, provider = null) {
  const [p, l] = await Promise.all([
    admin.from('player_accounts').select('wallet_address,wallet_verified_at,display_name').eq('user_id', userId).maybeSingle(),
    admin.from('player_atm_pay_links').select('wallet_address,verified_at,active').eq('user_id', userId).maybeSingle()
  ]);
  if (p.error || l.error) throw p.error || l.error;
  if(provider!==null&&!['xaman','atm_pay'].includes(provider))throw Object.assign(new Error('Choose Xaman or ATM Pay.'),{status:400});
  if(provider==='atm_pay'&&!l.data?.verified_at)throw Object.assign(new Error('Connect ATM Pay first.'),{status:409});
  if(provider==='xaman'&&!p.data?.wallet_verified_at)throw Object.assign(new Error('Connect Xaman first.'),{status:409});
  return (provider==='atm_pay'||provider===null&&l.data?.active) ? { wallet_address: l.data.wallet_address, wallet_verified_at: l.data.verified_at, provider: 'atm_pay', display_name: p.data?.display_name } : { ...p.data, provider: 'xaman' };
}
export async function nftWalletOwner(admin, wallet) {
  const [p, l] = await Promise.all([
    admin.from('player_accounts').select('user_id').eq('wallet_address', wallet).not('wallet_verified_at', 'is', null).limit(2),
    admin.from('player_atm_pay_links').select('user_id').eq('wallet_address', wallet).eq('active', true).limit(2)
  ]);
  if (p.error || l.error) throw p.error || l.error;
  const ids = [...new Set([...(p.data || []), ...(l.data || [])].map(r => r.user_id))];
  const eligible = [];
  for (const user_id of ids) { const w = await nftWallet(admin, user_id); if (w.wallet_address === wallet && w.wallet_verified_at) eligible.push({ user_id, ...w }); }
  return eligible.length === 1 ? eligible[0] : null;
}
