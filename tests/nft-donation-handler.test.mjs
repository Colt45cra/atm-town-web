import {generateKeyPairSync} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Wallet} from 'xrpl';
import handler,{reconcileDonation} from '../server/nft-donation-batch.js';
import {payRequest} from '../lib/atm-pay-town.js';
import {donationTransaction,donationOperations,donationOfferIds} from '../lib/nft-donation-batch.js';
import {BATCH_AMENDMENT} from '../lib/xrpl-nft-swap.js';
import codec from '../lib/xrpl-swap-codec.cjs';
import {adminClient} from '../lib/auth.js';
const wallet=Wallet.generate(),tokens=['A'.repeat(64),'B'.repeat(64)],id='00000000-0000-4000-8000-000000000001';
function setup({rollback=false,timeout=false}={}){
 const original=global.fetch,oldError=console.error;console.error=()=>{};
 const keys=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','PAYLOAD_API_BASE_URL','PAYLOAD_INTEGRATION_PRIVATE_KEY_PKCS8_B64'],saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 process.env.SUPABASE_URL='https://mock.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-service-role';process.env.PAYLOAD_API_BASE_URL='https://payload-test.invalid';process.env.PAYLOAD_INTEGRATION_PRIVATE_KEY_PKCS8_B64=generateKeyPairSync('ed25519').privateKey.export({format:'der',type:'pkcs8'}).toString('base64');
 const transaction_json=donationTransaction(wallet.address,tokens,{Account:wallet.address,Sequence:100,Fee:'80',LastLedgerSequence:107000150},900000000),signed=wallet.sign(transaction_json),sign_request=payRequest('donation',id),params=new URLSearchParams(new URL(sign_request.deeplink).hash.slice(1));
 const row={id,user_id:id,wallet_address:wallet.address,provider:'atm_pay',token_ids:tokens,transaction_json,sign_request,status:'signing',expires_at:new Date(Date.now()+600000).toISOString()},drops=tokens.map((token_id,i)=>({id:id.slice(0,-1)+(i+2),donation_request_id:id,wallet_address:wallet.address,token_id,name:'NFT',status:'pending'}));
 let submissions=0,receives=0,confirmed=false;
 global.fetch=async(input,options={})=>{
  const url=new URL(input),headers=new Headers(options.headers),method=options.method||'GET';
  if(url.hostname==='payload-test.invalid'){receives++;return Response.json({inventory_id:'inventory',receipt_tx_hash:'C'.repeat(64)});}
  if(url.hostname==='mock.supabase.co'){
   const table=url.pathname.split('/').at(-1);if(table==='player_atm_pay_links')return Response.json([{wallet_address:wallet.address,active:true,verified_at:new Date().toISOString()}]);if(table==='player_accounts')return Response.json([{wallet_address:wallet.address,wallet_verified_at:new Date().toISOString()}]);
   const source=table==='town_nft_donation_requests'?[row]:table==='town_nft_drops'?drops:[];
   let result=source.filter(r=>[...url.searchParams].every(([k,v])=>['select','order','limit'].includes(k)||(v==='is.null'&&r[k]==null)||(v==='not.is.null'&&r[k]!=null)||(v.startsWith('eq.')&&String(r[k])===v.slice(3))||(v.startsWith('in.')&&v.slice(4,-1).split(',').includes(String(r[k])))));
   if(url.searchParams.has('limit'))result=result.slice(0,Number(url.searchParams.get('limit')));
   if(method==='PATCH')result.forEach(r=>Object.assign(r,JSON.parse(options.body)));
   return Response.json(headers.get('Accept')?.includes('vnd.pgrst.object')?result[0]||null:result);
  }
  const body=JSON.parse(options.body),rpc=body.method;
  if(rpc==='submit'){submissions++;assert.equal(row.status,'submitting');assert.equal(row.tx_hash,signed.hash);assert.equal(row.signed_blob,signed.tx_blob);if(timeout)throw Error('lost response');return Response.json({result:{engine_result:'tesSUCCESS'}});}
  if(rpc==='tx'){
   if(!confirmed)return Response.json({result:{error:'txnNotFound',status:'error'}});
   if(body.params[0].transaction===signed.hash)return Response.json({result:{validated:true,ledger_index:107000001,tx_json:transaction_json,meta:{TransactionResult:'tesSUCCESS'}}});
   const ops=donationOperations(transaction_json),i=ops.findIndex(t=>codec.hashSignedTx(t)===body.params[0].transaction);
   if(rollback)return Response.json({result:{error:'txnNotFound',status:'error'}});
   return Response.json({result:{validated:true,ledger_index:107000001,tx_json:ops[i],meta:{TransactionResult:'tesSUCCESS',ParentBatchID:signed.hash,AffectedNodes:[{CreatedNode:{LedgerEntryType:'NFTokenOffer',LedgerIndex:donationOfferIds(transaction_json)[i]}}]}}});
  }
  const results={account_nfts:{account_nfts:tokens.map(NFTokenID=>({NFTokenID,Flags:8}))},account_info:{account_data:{Sequence:100},ledger_index:107000000},server_info:{info:{network_id:0}},feature:{[BATCH_AMENDMENT]:{enabled:true}},fee:{drops:{open_ledger_fee:'10'}},ledger:{ledger_index:107000000,ledger:{transactions:[]}}};
  if(!results[rpc])throw Error('Unexpected RPC '+rpc);return Response.json({result:results[rpc]});
 };
 const call=async(blob,secret=params.get('secret'))=>{let code=200,data;const res={setHeader(){},status(n){code=n;return this;},json(v){data=v;return this;}};await handler({method:'POST',headers:{},query:{action:'pay-donation-complete'},body:{id,request:params.get('request'),secret,blob}},res);return {code,data};};
 return {row,drops,signed,call,confirm(){confirmed=true;},get submissions(){return submissions;},get receives(){return receives;},restore(){global.fetch=original;console.error=oldError;for(const [k,v]of Object.entries(saved))if(v===undefined)delete process.env[k];else process.env[k]=v;}};
}
test('wrong capabilities and changed donation terms cannot submit; retries preserve one signed transaction',async()=>{
 const s=setup();try{
  assert.equal((await s.call(s.signed.tx_blob,'f'.repeat(64))).code,404);
  const changed=structuredClone(s.row.transaction_json);changed.RawTransactions[0].RawTransaction.Amount='1';assert.equal((await s.call(wallet.sign(changed).tx_blob)).code,409);assert.equal(s.submissions,0);
  assert.equal((await s.call(s.signed.tx_blob)).data.status,'submitting');assert.equal(s.submissions,1);
  assert.equal((await s.call(s.signed.tx_blob)).data.status,'submitting');assert.equal(s.submissions,1);
  s.confirm();assert.equal((await reconcileDonation(adminClient(),id)).status,'receiving');assert.equal(s.receives,1);assert.equal(s.drops.filter(d=>d.status==='received').length,1);
  assert.equal((await reconcileDonation(adminClient(),id)).status,'received');assert.equal(s.receives,2);assert.equal(s.submissions,1);
 }finally{s.restore();}
});
test('a validated outer batch with rolled-back inner offers never deposits NFTs',async()=>{
 const s=setup({rollback:true});try{await s.call(s.signed.tx_blob);s.confirm();const row=await reconcileDonation(adminClient(),id);assert.equal(row.status,'failed');assert.equal(s.receives,0);assert.equal(s.drops.some(d=>d.offer_index),false);}finally{s.restore();}
});

test('a lost submit response retries only the durable signed blob and transaction hash',async()=>{
 const s=setup({timeout:true});try{await s.call(s.signed.tx_blob);const first=s.submissions;assert.ok(first>=1);assert.equal(s.row.status,'submitting');await reconcileDonation(adminClient(),id);assert.ok(s.submissions>first);assert.equal(s.row.tx_hash,s.signed.hash);assert.equal(s.row.signed_blob,s.signed.tx_blob);s.confirm();await reconcileDonation(adminClient(),id);assert.equal(s.drops[0].status,'received');}finally{s.restore();}
});
