import test from 'node:test';
import assert from 'node:assert/strict';
import { freeOfferTransaction, matchesFreeOffer, validFreeOffer, placement, offerIndex, REWARDS_NFT_WALLET } from '../lib/nft-drops.js';
import handler from '../server/nft-drops.js';

const donor='raDZ4t8WPXkmDfJWMLBcNZmmSHmBC523NZ',finder='rnCv6dCu3r1ANVD6vYuHikxV8TYphecdff';
const token='A'.repeat(64),offer='B'.repeat(64),hash='C'.repeat(64),user='11111111-1111-4111-8111-111111111111';
const base={id:'22222222-2222-4222-8222-222222222222',user_id:user,wallet_address:donor,kind:'drop',token_id:token,status:'pending',payload_uuid:'33333333-3333-4333-8333-333333333333'};
const ledgerOffer={LedgerEntryType:'NFTokenOffer',Owner:donor,NFTokenID:token,Flags:1,Amount:'0'};
test('player offers are public free sell offers; donations target only the existing rewards wallet',()=>{
 assert.deepEqual(freeOfferTransaction(donor,token),{TransactionType:'NFTokenCreateOffer',Account:donor,NFTokenID:token,Amount:'0',Flags:1});
 assert.equal(freeOfferTransaction(donor,token,REWARDS_NFT_WALLET).Destination,REWARDS_NFT_WALLET);
 assert.ok(matchesFreeOffer(freeOfferTransaction(donor,token),base));
 for(const patch of [{Amount:'1'},{Flags:0},{Destination:finder},{Account:finder},{NFTokenID:'D'.repeat(64)}])assert.equal(matchesFreeOffer({...freeOfferTransaction(donor,token),...patch},base),false);
 assert.equal(validFreeOffer({...ledgerOffer,Expiration:1},base),false);
 assert.equal(validFreeOffer({...ledgerOffer,Destination:finder},base),false);
});
test('placement rejects other maps, nonfinite coordinates and out-of-bounds land',()=>{
 assert.deepEqual(placement({map:'town',x:1500.123,y:3800.456}),{map:'town',x:1500.1,y:3800.5});
 for(const patch of [{map:'arcade'},{x:NaN},{y:Infinity},{x:-1},{y:999999}])assert.throws(()=>placement({map:'town',x:1500,y:3800,...patch}));
 assert.equal(offerIndex({AffectedNodes:[{CreatedNode:{LedgerEntryType:'NFTokenOffer',LedgerIndex:offer}}]}),offer);
});

function setup({row={...base},signed=false,tx=null,offerActive=true,owned=true,wrongWallet=false}={}){
 process.env.SUPABASE_URL='https://nft-test.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test-service-key';process.env.XAMAN_API_KEY='test';process.env.XAMAN_API_SECRET='test';
 const tables={town_nft_drops:[structuredClone(row)],town_nft_drop_claims:[],player_accounts:[{user_id:user,wallet_address:donor,wallet_verified_at:'2026-01-01'}]};
 const requests=[];const original=globalThis.fetch;
 globalThis.fetch=async(input,options={})=>{
   const url=new URL(input),headers=new Headers(options.headers);requests.push({url,options});
   if(url.pathname.endsWith('/auth/v1/user'))return Response.json({id:user,email:'test@example.invalid'});
   if(url.pathname.includes('/rest/v1/')){
     const name=url.pathname.split('/').at(-1),rows=tables[name]||[];
     const match=r=>[...url.searchParams].every(([k,v])=>['select','order','limit'].includes(k)||v.startsWith('eq.')&&String(r[k])===v.slice(3)||v.startsWith('in.')&&v.slice(4,-1).split(',').includes(String(r[k])));
     let found=rows.filter(match);
     if(options.method==='PATCH'){const patch=JSON.parse(options.body);found.forEach(r=>Object.assign(r,patch));}
     if(options.method==='POST'){const body=JSON.parse(options.body);found=[{id:'44444444-4444-4444-8444-444444444444',status:'preparing',...body}];rows.push(...found);tables[name]=rows;}
     return Response.json(headers.get('Accept')?.includes('vnd.pgrst.object')?found[0]||null:found);
   }
   if(url.pathname.includes('/payload/'))return Response.json({meta:{resolved:signed,signed},response:{account:wrongWallet?finder:row.wallet_address,txid:hash,dispatched_nodetype:'MAINNET'}});
   if(url.pathname.endsWith('/payload')&&options.method==='POST')return Response.json({uuid:'55555555-5555-4555-8555-555555555555',next:{always:'https://xaman.app/sign/test'}});
   const body=JSON.parse(options.body||'{}');
   if(body.method==='tx')return Response.json({result:tx||{validated:true,tx_json:freeOfferTransaction(row.wallet_address,token),meta:{TransactionResult:'tesSUCCESS',AffectedNodes:[{CreatedNode:{LedgerEntryType:'NFTokenOffer',LedgerIndex:offer}}]}}});
   if(body.method==='ledger_entry')return Response.json({result:offerActive?{node:ledgerOffer}:{status:'error',error:'entryNotFound'}});
   if(body.method==='account_nfts')return Response.json({result:{account_nfts:owned?[{NFTokenID:token,Flags:8}]:[]}});
   throw Error('Unexpected test request '+url+' '+body.method);
 };
 return {tables,requests,restore(){globalThis.fetch=original;}};
}
async function call(action,body=null,id=base.id){let code=200,output;const res={setHeader(){},status(n){code=n;return this;},json(v){output=v;return this;}};await handler({method:body?'POST':'GET',query:{action,id},headers:{authorization:'Bearer test-access-token'},body},res);return {code,output};}
test('unsigned requests create no carried object; exact validated signatures create one',async()=>{
 let s=setup();try{const result=await call('drop-status');assert.equal(result.output.status,'pending');assert.equal(s.tables.town_nft_drops[0].offer_index,undefined);}finally{s.restore();}
 s=setup({signed:true});try{const result=await call('drop-status');assert.equal(result.output.status,'carried');assert.equal(result.output.offer_index,offer);assert.equal(s.tables.town_nft_drops[0].tx_hash,hash);}finally{s.restore();}
});
test('wrong-wallet or paid signatures never become free game drops',async()=>{
 for(const settings of [{signed:true,wrongWallet:true},{signed:true,tx:{validated:true,tx_json:{...freeOfferTransaction(donor,token),Amount:'100'},meta:{TransactionResult:'tesSUCCESS'}}}]){const s=setup(settings);try{const result=await call('drop-status');assert.equal(result.output.status,'failed');assert.equal(s.tables.town_nft_drops[0].offer_index,undefined);}finally{s.restore();}}
});
test('cancelled offers remove carried/placed objects, and pending signatures cannot be placed',async()=>{
 let s=setup({row:{...base,status:'placed',offer_index:offer,map:'town',x:1500,y:3800},offerActive:false});try{assert.equal((await call('drop-status')).output.status,'unavailable');}finally{s.restore();}
 s=setup();try{assert.equal((await call('drop-place',{id:base.id,map:'town',x:1500,y:3800})).code,409);}finally{s.restore();}
});
test('competing ledger acceptance removes an object before another claim is prepared',async()=>{
 const s=setup({row:{...base,status:'placed',offer_index:offer,map:'town',x:1500,y:3800},offerActive:false,owned:false});
 try{const result=await call('drop-claim',{id:base.id});assert.equal(result.code,409);assert.equal(s.tables.town_nft_drops[0].status,'claimed');assert.equal(s.tables.town_nft_drop_claims.length,0);}finally{s.restore();}
});
test('finder signs their own free acceptance; delivery requires validated success and ownership',async()=>{
 const s=setup({row:{...base,status:'placed',offer_index:offer,map:'town',x:1500,y:3800},signed:true,wrongWallet:true,tx:{validated:true,tx_json:{TransactionType:'NFTokenAcceptOffer',Account:finder,NFTokenSellOffer:offer},meta:{TransactionResult:'tesSUCCESS'}}});
 try{
   s.tables.player_accounts[0].wallet_address=finder;
   const created=await call('drop-claim',{id:base.id});assert.equal(created.code,201);assert.equal(s.tables.town_nft_drops[0].status,'placed');
   const submitted=JSON.parse(s.requests.find(r=>r.url.pathname.endsWith('/payload')&&r.options.method==='POST').options.body).txjson;
   assert.deepEqual(submitted,{TransactionType:'NFTokenAcceptOffer',Account:finder,NFTokenSellOffer:offer});
   const result=await call('drop-claim-status',null,created.output.id);assert.equal(result.output.status,'claimed');assert.equal(result.output.tx_hash,hash);assert.equal(s.tables.town_nft_drops[0].status,'claimed');
 }finally{s.restore();}
});
