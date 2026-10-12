import { createHash, randomUUID } from 'node:crypto';
import { adminClient, requireUser, setCors, sendError } from '../lib/auth.js';
import { nftWallet, payRequest, checkCapability } from '../lib/atm-pay-town.js';
import { rpc, findOwnedNft, createXamanTransaction, cancelXamanTransaction } from '../lib/xrpl-nft-trading.js';
import { fetchXamanPayload } from '../lib/xaman-vending.js';
import { batchCapability } from '../lib/xrpl-nft-swap.js';
import { marketAccount } from '../lib/atm-pay-nft-market.js';
import { donationTokens, donationTransaction, donationOperations, donationOfferIds, sameDonationTerms, verifyDonationBlob } from '../lib/nft-donation-batch.js';
import { REWARDS_NFT_WALLET, fail } from '../lib/nft-drops.js';
import { payloadIntegrationRequest } from '../lib/payload-integration.js';
import { resolveMetadata } from '../api/xrpl-nft-metadata.js';
import codec from '../lib/xrpl-swap-codec.cjs';

const table='town_nft_donation_requests',check=r=>{if(r.error)throw r.error;return r.data;};
const pool=body=>payloadIntegrationRequest('/api/integrations/v1/nft-pool',body,{timeoutMs:45000});
const running=new Map();
const xamanBatchReady=()=>process.env.XAMAN_NFT_DONATION_BATCH_ENABLED==='true';
const parts=r=>({tx:r.tx_json||r.tx||r.transaction||r,meta:r.meta||r.metaData||{}});
async function patch(admin,row,values){const saved=check(await admin.from(table).update({...values,updated_at:new Date().toISOString()}).eq('id',row.id).eq('status',row.status).select('*').maybeSingle());return saved||check(await admin.from(table).select('*').eq('id',row.id).single());}
async function finishFailure(admin,row,status,error){row=await patch(admin,row,{status,failure_reason:error});check(await admin.from('town_nft_drops').update({status:status==='expired'?'expired':'failed',failure_reason:error}).eq('donation_request_id',row.id).in('status',['preparing','pending']).is('offer_index',null));return row;}
async function eligible(wallet,tokens){
  const nfts=await Promise.all(tokens.map(t=>findOwnedNft(wallet,t)));
  if(nfts.some(n=>!n||(Number(n.Flags)&8)===0))throw fail('Your wallet must own every selected transferable NFT.',409);
  return nfts;
}
export async function donationReceipt(admin,row){
  const drops=check(await admin.from('town_nft_drops').select('id,token_id,name,image_url,status,failure_reason').eq('donation_request_id',row.id).order('created_at'));
  return {kind:'donation',donation_request:true,id:row.id,status:row.status,expected_wallet:row.wallet_address,provider:row.provider,tx_hash:row.tx_hash,error:row.failure_reason,drops,received:drops.filter(d=>d.status==='received').length,total:row.token_ids.length,...(row.status==='signing'?{deeplink:row.sign_request?.deeplink}: {})};
}
async function reconcile(admin,row){
  if(row.status==='signing'&&row.provider==='xaman'){
    const lookup=await fetchXamanPayload(row.sign_request.uuid);
    if(lookup.found){const {meta={},response={}}=lookup.payload||{};
      if(meta.signed&&/^[A-F0-9]{64}$/i.test(response.txid||'')){
        if(response.account!==row.wallet_address)return finishFailure(admin,row,'failed','A different wallet signed this donation.');
        row=await patch(admin,row,{status:'submitting',tx_hash:response.txid.toUpperCase()});
      }else if(meta.resolved&&!meta.signed)return finishFailure(admin,row,'failed','Donation signing was declined.');
      else if(meta.expired)return finishFailure(admin,row,'expired','The donation signing request expired.');
    }
  }
  if(row.status==='signing'&&row.provider==='atm_pay'&&Date.parse(row.expires_at)<=Date.now())return finishFailure(admin,row,'expired','This donation approval expired.');
  if(row.status==='submitting'){
    let outer;try{outer=await rpc('tx',{transaction:row.tx_hash,binary:false,api_version:2});}catch(e){if(e.xrplCode!=='txnNotFound')throw e;}
    if(!outer?.validated){
      const ledger=await rpc('ledger',{ledger_index:'validated'});
      if(Number(ledger.ledger_index)>row.transaction_json.LastLedgerSequence)return finishFailure(admin,row,'expired','The signing window expired without a validated donation.');
      if(!outer&&row.signed_blob){try{await rpc('submit',{tx_blob:row.signed_blob,fail_hard:false});}catch{/* Reconcile this exact hash on the next check. */}}
      return row;
    }
    const p=parts(outer);
    if(p.meta.TransactionResult!=='tesSUCCESS'||!sameDonationTerms(p.tx,row.transaction_json))return finishFailure(admin,row,'failed','The donation did not succeed with the reviewed terms.');
    const ops=donationOperations(row.transaction_json),ids=donationOfferIds(row.transaction_json);
    // A successful outer Batch alone does not prove its inner operations applied.
    let inner=ops.length===1?[outer]:await Promise.all(ops.map(async tx=>{try{return await rpc('tx',{transaction:codec.hashSignedTx(tx),binary:false,api_version:2});}catch{return null;}}));
    if(inner.some(r=>!r?.validated)){
      const ledger=await rpc('ledger',{ledger_index:outer.ledger_index,transactions:true,expand:true,api_version:2});
      if(!Array.isArray(ledger.ledger?.transactions))return row;
      inner=ops.map(tx=>{const r=ledger.ledger.transactions.find(r=>String(r.hash||r.tx_json?.hash||'').toUpperCase()===codec.hashSignedTx(tx));return r?{...r,validated:true,ledger_index:outer.ledger_index}:null;});
      if(inner.some(r=>!r))return finishFailure(admin,row,'failed','The donation batch rolled back. No donation was received.');
    }
    for(let i=0;i<ops.length;i++){
      const p=parts(inner[i]);
      const created=(p.meta.AffectedNodes||[]).some(n=>n.CreatedNode?.LedgerEntryType==='NFTokenOffer'&&n.CreatedNode.LedgerIndex===ids[i]);
      if(p.meta.TransactionResult!=='tesSUCCESS'||!sameDonationTerms(p.tx,ops[i])||!created||(ops.length>1&&(inner[i].ledger_index!==outer.ledger_index||String(p.meta.ParentBatchID||p.tx.ParentBatchID||'').toUpperCase()!==row.tx_hash)))return finishFailure(admin,row,'failed','The batch did not create all selected donation offers. No donation is marked received.');
    }
    for(let i=0;i<ops.length;i++)check(await admin.from('town_nft_drops').update({status:'pending',offer_index:ids[i],tx_hash:ops.length===1?row.tx_hash:codec.hashSignedTx(ops[i]),failure_reason:null}).eq('donation_request_id',row.id).eq('token_id',row.token_ids[i]).is('offer_index',null));
    row=await patch(admin,row,{status:'receiving',failure_reason:null});
  }
  if(row.status==='receiving'){
    const drops=check(await admin.from('town_nft_drops').select('*').eq('donation_request_id',row.id).eq('status','pending').not('offer_index','is',null).order('created_at').limit(1));
    for(const drop of drops){
      try{const result=await pool({action:'receive',drop_id:drop.id,donor_address:drop.wallet_address,token_id:drop.token_id,offer_index:drop.offer_index,kind:'donation',map:null,x:null,y:null});
        if(result.inventory_id)check(await admin.from('town_nft_drops').update({status:'received',payload_inventory_id:result.inventory_id,custody_tx_hash:result.receipt_tx_hash,failure_reason:null,updated_at:new Date().toISOString()}).eq('id',drop.id).eq('status','pending'));
      }catch(e){check(await admin.from('town_nft_drops').update({failure_reason:'Receiving delayed: '+String(e.message).slice(0,500)}).eq('id',drop.id).eq('status','pending'));}
    }
    const all=check(await admin.from('town_nft_drops').select('status').eq('donation_request_id',row.id));
    if(all.length===row.token_ids.length&&all.every(d=>d.status==='received'))row=await patch(admin,row,{status:'received',failure_reason:null});
  }
  return row;
}
export async function reconcileDonation(admin,id){
  if(running.has(id))return running.get(id);
  const task=(async()=>reconcile(admin,check(await admin.from(table).select('*').eq('id',id).single())))();running.set(id,task);
  try{return await task;}finally{running.delete(id);}
}
export default async function handler(req,res){
  if(setCors(req,res))return;res.setHeader('Cache-Control','no-store');
  try{
    if(req.method!=='POST')throw fail('POST required.',405);
    const action=String(req.query.action||'').replace(/^pay-donation-|^donation-/,''),body=req.body||{},publicAction=['challenge','complete'].includes(action);
    const {admin,user}=publicAction?{admin:adminClient()}:await requireUser(req);
    if(action==='config'){const w=await nftWallet(admin,user.id);let enabled=false;try{enabled=await batchCapability();}catch{}return res.json({provider:w.provider,batch_enabled:enabled,xaman_batch_ready:xamanBatchReady(),max_nfts:8});}
    if(action==='mine'){
      const rows=check(await admin.from(table).select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(10));
      return res.json({requests:await Promise.all(rows.map(r=>donationReceipt(admin,r)))});
    }
    if(action==='start'){
      const w=await nftWallet(admin,user.id),tokens=donationTokens(body.token_ids);
      if(!w.wallet_verified_at)throw fail('Connect and verify your NFT wallet first.',409);
      if(tokens.length>1&&w.provider!=='atm_pay'&&!xamanBatchReady())throw fail('Use ATM Pay for multiple NFTs. Xaman Batch donations will be enabled after compatibility is verified.',409);
      const old=check(await admin.from(table).select('*').eq('user_id',user.id).eq('wallet_address',w.wallet_address).in('status',['signing','submitting','receiving']).order('created_at',{ascending:false}).limit(1));
      if(old.length)return res.json(await donationReceipt(admin,await reconcileDonation(admin,old[0].id)));
      const ready=await pool({action:'status'});if(!ready.ready||ready.address!==REWARDS_NFT_WALLET||ready.network!=='mainnet')throw fail('The donation wallet is not ready.',409);
      if(tokens.length>1&&!await batchCapability())throw fail('Batch donations are not enabled on this XRPL Mainnet server.',503);
      const nfts=await eligible(w.wallet_address,tokens),common=await marketAccount(w.wallet_address);
      if(tokens.length>1)common.Fee=(BigInt(common.Fee)*BigInt(tokens.length+2)).toString();
      if(BigInt(common.Fee)>100000n)throw fail('The network fee is too high. Try later.',409);
      const expires_at=new Date(Date.now()+8*60000).toISOString(),expiration=Math.floor(Date.now()/1000)-946684800+3600;
      let row={id:randomUUID(),user_id:user.id,wallet_address:w.wallet_address,provider:w.provider,token_ids:tokens,transaction_json:donationTransaction(w.wallet_address,tokens,common,expiration),status:'signing',expires_at,sign_request:{}};
      const metadata=await Promise.all(nfts.map(n=>resolveMetadata(n.URI,n.NFTokenID)));
      if(w.provider==='atm_pay')row.sign_request=payRequest('donation',row.id);
      check(await admin.from(table).insert(row));
      try{
        check(await admin.from('town_nft_drops').insert(tokens.map((token,i)=>({id:randomUUID(),donation_request_id:row.id,user_id:user.id,wallet_address:w.wallet_address,token_id:token,kind:'donation',custody:true,status:'pending',name:String(metadata[i].name||'XRPL NFT').slice(0,180),image_url:metadata[i].image_url||null}))));
        if(w.provider==='xaman'){
          const created=await createXamanTransaction(row.transaction_json,{identifier:row.id,instruction:'Donate your selected NFT to the ATM Town rewards wallet for 0 XRP. Only this wallet can accept it.'});
          row.sign_request={uuid:created.uuid,deeplink:created.next.always};
          try{row=await patch(admin,row,{sign_request:row.sign_request});}catch(e){await cancelXamanTransaction(created.uuid);throw e;}
        }
      }catch(e){await finishFailure(admin,row,'failed',String(e.message).slice(0,500));throw e;}
      return res.status(201).json(await donationReceipt(admin,row));
    }
    if(!/^[0-9a-f-]{36}$/i.test(body.id||''))throw fail('Invalid donation request.');
    let row=check(await admin.from(table).select('*').eq('id',body.id).maybeSingle());if(!row)throw fail('Donation request not found.',404);
    if(publicAction){if(row.provider!=='atm_pay')throw fail('This donation uses another wallet.',409);checkCapability(row.sign_request,body.request,body.secret);}else if(row.user_id!==user.id)throw fail('Donation request not found.',404);
    if(action==='status'){row=await reconcileDonation(admin,row.id);return res.json(await donationReceipt(admin,row));}
    if(!publicAction)throw fail('Unknown donation action.');
    if(row.status!=='signing')return res.json(await donationReceipt(admin,row));
    if(Date.parse(row.expires_at)<=Date.now()){row=await finishFailure(admin,row,'expired','This donation approval expired.');return res.json(await donationReceipt(admin,row));}
    const w=await nftWallet(admin,row.user_id);if(w.provider!==row.provider||w.wallet_address!==row.wallet_address)throw fail('Your selected NFT wallet changed. Start again.',409);
    if(action==='challenge')return res.json({...await donationReceipt(admin,row),network:'mainnet',transaction:row.transaction_json,review_hash:createHash('sha256').update(Buffer.from(codec.encode(row.transaction_json),'hex')).digest('hex'),destination:REWARDS_NFT_WALLET,token_ids:row.token_ids,expires_at:row.expires_at});
    const hash=verifyDonationBlob(body.blob,row);await eligible(row.wallet_address,row.token_ids);
    const current=await marketAccount(row.wallet_address);if(current.Sequence!==row.transaction_json.Sequence||current.LastLedgerSequence-150>=row.transaction_json.LastLedgerSequence)throw fail('The wallet sequence or signing window changed. Start again.',409);
    if(row.token_ids.length>1&&!await batchCapability())throw fail('Batch donations are unavailable on this XRPL server.',503);
    const saved=check(await admin.from(table).update({status:'submitting',tx_hash:hash,signed_blob:body.blob,updated_at:new Date().toISOString()}).eq('id',row.id).eq('status','signing').select('*').maybeSingle());
    if(!saved)return res.json(await donationReceipt(admin,check(await admin.from(table).select('*').eq('id',row.id).single())));
    // Persist the one transaction hash before broadcast. Retries cannot sign or submit another donation.
    try{const result=await rpc('submit',{tx_blob:body.blob,fail_hard:false});if(/^(tem|tef|tel)/.test(result.engine_result||'')&&result.engine_result!=='tefALREADY')row=await finishFailure(admin,saved,'failed',result.engine_result);else row=saved;}catch{row=saved;}
    return res.json(await donationReceipt(admin,row));
  }catch(e){sendError(res,e);}
}
