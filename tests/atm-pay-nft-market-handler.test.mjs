import test from 'node:test';
import assert from 'node:assert/strict';
import {Wallet} from 'xrpl';
import handler from '../server/atm-pay-nft-market.js';
import {payRequest} from '../lib/atm-pay-town.js';
test('market submission rejects changed terms, stores hash before broadcast, and never submits twice on retry',async()=>{
 const wallet=Wallet.generate(),token='A'.repeat(64),id='00000000-0000-0000-0000-000000000001';
 const sign_request=payRequest('market',id),params=new URLSearchParams(new URL(sign_request.deeplink).hash.slice(1));
 const transaction_json={TransactionType:'NFTokenCreateOffer',Account:wallet.address,Sequence:100,Fee:'20',LastLedgerSequence:107000150,Flags:1,NFTokenID:token,Amount:'25000000',Expiration:900000000};
 let row={id,user_id:id,operation:'sell',wallet_address:wallet.address,token_id:token,token_name:'Test NFT',status:'signing',amount_drops:'25000000',expires_at:new Date(Date.now()+600000).toISOString(),sign_request,transaction_json};
 const oldFetch=global.fetch,oldError=console.error,env={SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY};
 process.env.SUPABASE_URL='https://mock.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-service-role';console.error=()=>{};
 let submissions=0,updates=0;
 global.fetch=async(url,options={})=>{
  url=String(url);const method=options.method||'GET';
  if(url.includes('mock.supabase.co')){
   if(url.includes('/player_atm_pay_links'))return Response.json([{wallet_address:wallet.address,active:true,verified_at:new Date().toISOString()}]);
   if(url.includes('/player_accounts'))return Response.json([{wallet_address:wallet.address,wallet_verified_at:new Date().toISOString()}]);
   if(url.includes('/atm_pay_nft_market_requests')){
    if(method==='PATCH'){updates++;row={...row,...JSON.parse(options.body)};return Response.json([{id}]);}
    return Response.json([row]);
   }
   throw Error('Unexpected database query');
  }
  const rpc=JSON.parse(options.body).method;
  if(rpc==='submit'){submissions++;assert.equal(row.status,'submitting');assert.match(row.tx_hash,/^[A-F0-9]{64}$/);return Response.json({result:{engine_result:'tesSUCCESS'}});}
  const results={account_nfts:{account_nfts:[{NFTokenID:token,Flags:8}]},account_info:{account_data:{Sequence:100},ledger_index:107000000},server_info:{info:{network_id:0}},fee:{drops:{open_ledger_fee:'10'}}};
  if(!results[rpc])throw Error('Unexpected RPC '+rpc);return Response.json({result:results[rpc]});
 };
 const call=async(blob,secret=params.get('secret'))=>{
  let code=200,data;const res={setHeader(){},status(n){code=n;return this;},json(v){data=v;return this;}};
  await handler({method:'POST',headers:{},query:{action:'pay-market-complete'},body:{id,kind:'market',request:params.get('request'),secret,blob}},res);return {code,data};
 };
 try{
  const signed=wallet.sign(transaction_json);
  assert.equal((await call(signed.tx_blob,'f'.repeat(64))).code,404);assert.equal(updates,0);
  assert.equal((await call(wallet.sign({...transaction_json,Amount:'1'}).tx_blob)).code,409);assert.equal(submissions,0);assert.equal(updates,0);
  assert.equal((await call(signed.tx_blob)).data.status,'submitting');assert.equal(submissions,1);assert.equal(updates,1);
  assert.equal((await call(signed.tx_blob)).data.status,'submitting');assert.equal(submissions,1);assert.equal(updates,1);
 }finally{global.fetch=oldFetch;console.error=oldError;for(const [key,value]of Object.entries(env))if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
