import { createHash } from 'node:crypto';
import { adminClient, setCors, sendError } from '../lib/auth.js';
import { checkCapability, nftWallet } from '../lib/atm-pay-town.js';
import { verifyInnerBatchSignature, verifyFinalSwapBlob, checkSwapSequences, batchCapability, swapError, terminalSwap } from '../lib/xrpl-nft-swap.js';
import { rpc } from '../lib/xrpl-nft-trading.js';
import codec from '../lib/xrpl-swap-codec.cjs';
const check = ({data,error}) => {if(error)throw error;return data;};
export default async function handler(req,res) {
  if(setCors(req,res))return;
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'POST required.'});
  try {
    const {id,request,secret,kind,blob} = req.body || {};
    if(!/^[0-9a-f-]{36}$/i.test(id || '') || !['swap_inner','swap_final'].includes(kind))throw swapError('Invalid signing request.',400);
    const admin=adminClient();
    const swap=check(await admin.from('nft_atomic_swaps').select('*').eq('id',id).maybeSingle());
    if(!swap)throw swapError('Trade not found.',404);
    const final=kind==='swap_final', payload=final?swap.final_payload:swap.inner_payload;
    checkCapability(payload,request,secret);
    const expectedWallet=final?swap.wallet_a:swap.wallet_b;
    if (req.query.action==='pay-swap-challenge' && (terminalSwap(swap.status) || (!final && swap.status==='ready'))) return res.json({kind,id,status:swap.status,expected_wallet:expectedWallet,tx_hash:swap.tx_hash});
    if(swap.status!==(final?'settling':'signing') || Date.parse(swap.expires_at)<=Date.now())throw swapError('This signing request is no longer active.');
    const [a,b]=await Promise.all([nftWallet(admin,swap.user_a),nftWallet(admin,swap.user_b)]);
    if(a.wallet_address!==swap.wallet_a || b.wallet_address!==swap.wallet_b || (final?a.provider:b.provider)!=='atm_pay')throw swapError('A player changed their NFT wallet. Create a new proposal.');
    const batch={...swap.batch_json,...(final?{BatchSigners:codec.decode(swap.inner_signed_blob).BatchSigners}:{})};
    const review_hash=createHash('sha256').update(Buffer.from(codec.encode(batch),'hex')).digest('hex');
    if(req.query.action==='pay-swap-challenge')return res.json({kind,id,network:'mainnet',expected_wallet:expectedWallet,transaction:batch,review_hash,expires_at:swap.expires_at,
      give:{id:final?swap.token_a:swap.token_b,name:final?swap.name_a:swap.name_b},receive:{id:final?swap.token_b:swap.token_a,name:final?swap.name_b:swap.name_a},wallet_a:swap.wallet_a,wallet_b:swap.wallet_b,
      token_a:swap.token_a,token_b:swap.token_b,status:swap.status,tx_hash:swap.tx_hash});
    if(req.query.action!=='pay-swap-complete')throw swapError('Unknown signing action.',400);
    if(!final) {
      if(typeof blob!=='string'||blob.length>20000||!verifyInnerBatchSignature(blob,expectedWallet,swap.batch_json))throw swapError('The inner signature does not match the agreed NFT exchange.');
      const signer=codec.decode(blob).BatchSigners[0].BatchSigner;
      if(!signer.SigningPubKey || codec.deriveAddress(signer.SigningPubKey)!==expectedWallet)throw swapError('Use the ATM Pay wallet that owns this NFT.');
      const updated=check(await admin.from('nft_atomic_swaps').update({status:'ready',inner_signed_blob:blob,updated_at:new Date().toISOString()}).eq('id',id).eq('status','signing').select('id').maybeSingle());
      if(!updated)throw swapError('This trade changed. Refresh its status.');
      return res.json({status:'ready'});
    }
    const hash=verifyFinalSwapBlob(blob,swap);
    if(swap.tx_hash && swap.tx_hash!==hash)throw swapError('A different transaction is already awaiting confirmation.');
    if(!swap.tx_hash){
      if(!await batchCapability())throw swapError('Atomic NFT exchanges are unavailable on XRPL.');
      await checkSwapSequences(swap);
      const updated=check(await admin.from('nft_atomic_swaps').update({tx_hash:hash,updated_at:new Date().toISOString()}).eq('id',id).eq('status','settling').is('tx_hash',null).select('id').maybeSingle());
      if(!updated)throw swapError('This trade changed. Refresh before submitting.');
    }
    // The exact reviewed blob can be retried; it cannot create a second trade.
    try {await rpc('submit',{tx_blob:blob,fail_hard:false});}catch { /* A timeout may follow a successful broadcast; keep the hash for reconciliation. */ }
    return res.json({status:'settling',tx_hash:hash});
  }catch(error){sendError(res,error);}
}
