import { randomUUID,createHash } from 'node:crypto';
import { adminClient,requireUser,setCors,sendError } from '../lib/auth.js';
import { nftWallet,payRequest,checkCapability } from '../lib/atm-pay-town.js';
import { NFT_ID,OFFER_ID,XRPL_ADDRESS,rpc,getBuyOffers } from '../lib/xrpl-nft-trading.js';
import { xrpDrops,sellOffers,activeOffer,marketEligibility,marketAccount,verifyMarketBlob,reconcileMarket,marketError } from '../lib/atm-pay-nft-market.js';
import { createMarketXamanPayload } from '../lib/atm-pay-nft-market.js';
import codec from '../lib/xrpl-swap-codec.cjs';
const table='atm_pay_nft_market_requests';
const check=r=>{if(r.error)throw r.error;return r.data;};
const receipt=r=>({id:r.id,status:r.status,operation:r.operation,token_id:r.token_id,expected_wallet:r.wallet_address,tx_hash:r.tx_hash,offer_index:r.offer_index,error:r.failure_reason});
export default async function handler(req,res){
  if(setCors(req,res))return;res.setHeader('Cache-Control','no-store');
  const action=String(req.query.action).replace('pay-market-','');
  if(req.method!=='POST')return res.status(405).json({error:'POST required.'});
  try{
    const publicAction=['challenge','complete'].includes(action);
    const {admin,user}=publicAction?{admin:adminClient()}:await requireUser(req);
    const body=req.body||{};
    if(action==='list'){
      const token=String(body.token_id||'').toUpperCase(),owner=String(body.owner_wallet||'');
      if(!NFT_ID.test(token)||!XRPL_ADDRESS.test(owner))throw marketError('Invalid NFT or wallet.');
      const wallet=await nftWallet(admin,user.id,body.provider??null);
      const offers=(await sellOffers(token)).filter(o=>o.owner===owner&&/^\d+$/.test(String(o.amount))&&BigInt(o.amount)>0n&&(owner===wallet.wallet_address||activeOffer(o,wallet.wallet_address)));
      return res.json({offers:offers.map(o=>({offer_index:o.nft_offer_index,owner_wallet:o.owner,amount_drops:String(o.amount),amount_xrp:Number(o.amount)/1000000,expiration:o.expiration})),wallet_provider:wallet.provider});
    }
    if(action==='start'){
      const wallet=await nftWallet(admin,user.id,body.provider??null);
      if(!wallet.wallet_verified_at)throw marketError('Connect and verify the selected wallet first.');
      const operation=body.operation,token_id=String(body.token_id||'').toUpperCase();
      if(!['sell','accept_sell','accept_buy','cancel_sell'].includes(operation)||!NFT_ID.test(token_id))throw marketError('Choose a valid NFT sale.');
      const recent=await admin.from(table).select('id',{count:'exact',head:true}).eq('user_id',user.id).gte('created_at',new Date(Date.now()-3600000).toISOString());if(recent.error)throw recent.error;if(recent.count>=30)throw marketError('Wait before starting another sale approval.');
      const row={id:randomUUID(),user_id:user.id,operation,token_id,wallet_address:wallet.wallet_address,token_name:String(body.token_name||'NFT').slice(0,160),status:'signing',expires_at:new Date(Date.now()+8*60000).toISOString()};
      if(operation==='sell')row.amount_drops=xrpDrops(body.amount_xrp);
      else {
        row.offer_index=String(body.offer_index||'').toUpperCase();if(!OFFER_ID.test(row.offer_index))throw marketError('Invalid offer.');
        const offers=operation==='accept_buy'?await getBuyOffers(token_id):await sellOffers(token_id),offer=offers.find(o=>o.nft_offer_index===row.offer_index);
        if(!offer)throw marketError('That offer is no longer available.');row.amount_drops=String(offer.amount);row.counterparty_wallet=offer.owner;
      }
      await marketEligibility(row);
      const common=await marketAccount(row.wallet_address);
      row.transaction_json=operation==='sell'?{...common,TransactionType:'NFTokenCreateOffer',Flags:1,NFTokenID:token_id,Amount:row.amount_drops,Expiration:Math.floor(Date.now()/1000)-946684800+7*86400}:operation==='cancel_sell'?{...common,TransactionType:'NFTokenCancelOffer',NFTokenOffers:[row.offer_index]}:{...common,TransactionType:'NFTokenAcceptOffer',[operation==='accept_buy'?'NFTokenBuyOffer':'NFTokenSellOffer']:row.offer_index};
      row.sign_request=wallet.provider==='xaman'?await createMarketXamanPayload(row):payRequest('market',row.id);check(await admin.from(table).insert(row));
      return res.status(201).json({id:row.id,deeplink:row.sign_request.deeplink,provider:wallet.provider});
    }
    if(!/^[0-9a-f-]{36}$/i.test(body.id||''))throw marketError('Invalid request.');
    let row=check(await admin.from(table).select('*').eq('id',body.id).maybeSingle());if(!row)throw Object.assign(marketError('Sale request not found.'),{status:404});
    if(publicAction)checkCapability(row.sign_request,body.request,body.secret);else if(row.user_id!==user.id)throw Object.assign(marketError('Sale request not found.'),{status:404});
    if(action==='status'){row=await reconcileMarket(admin,row);if(row.status==='signing'&&Date.parse(row.expires_at)<=Date.now())return res.json({...receipt(row),status:'expired'});return res.json(receipt(row));}
    if(!publicAction)throw marketError('Unknown sale action.');
    if(row.status!=='signing')return res.json({kind:'market',...receipt(row)});
    if(Date.parse(row.expires_at)<=Date.now())throw marketError('This approval expired. Start again.');
    const wallet=await nftWallet(admin,row.user_id,'atm_pay');if(wallet.provider!=='atm_pay'||wallet.wallet_address!==row.wallet_address)throw marketError('Your NFT wallet changed. Start again.');
    if(action==='challenge')return res.json({kind:'market',...receipt(row),network:'mainnet',transaction:row.transaction_json,review_hash:createHash('sha256').update(Buffer.from(codec.encode(row.transaction_json),'hex')).digest('hex'),token_id:row.token_id,token_name:row.token_name,amount_drops:row.amount_drops,counterparty_wallet:row.counterparty_wallet,expires_at:row.expires_at});
    const hash=verifyMarketBlob(body.blob,row);await marketEligibility(row);
    const account=await marketAccount(row.wallet_address);if(account.Sequence!==row.transaction_json.Sequence||account.LastLedgerSequence-150>=row.transaction_json.LastLedgerSequence)throw marketError('Your wallet or signing window changed. Start again.');
    const updated=check(await admin.from(table).update({status:'submitting',tx_hash:hash}).eq('id',row.id).eq('status','signing').select('id').maybeSingle());if(!updated)throw marketError('This approval changed. Check its status.');
    // Hash is durable before broadcast; lost responses reconcile this one transaction.
    try{const result=await rpc('submit',{tx_blob:body.blob,fail_hard:false});if(/^(tem|tef|tel)/.test(result.engine_result||'')&&result.engine_result!=='tefALREADY')await admin.from(table).update({status:'failed',failure_reason:result.engine_result}).eq('id',row.id).eq('status','submitting');}catch{/* Keep the hash: a timeout can follow a successful broadcast. */}
    return res.json({status:'submitting',tx_hash:hash});
  }catch(e){sendError(res,e);}
}
