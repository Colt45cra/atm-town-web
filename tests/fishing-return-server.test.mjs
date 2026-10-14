import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
function fixture(status='reward_ready',signed='pending'){
 let row={id:'catch',status,wallet_address:'wallet',payload_uuid:status==='reward_ready'?'payload':null},cancelled=0,released=0;
 const admin={from(){let values=null,filters=[];const q={update(v){values=v;return q;},eq(k,v){filters.push([k,v]);return q;},is(){return q;},or(){return q;},select(){return q;},async maybeSingle(){if(filters.some(([k,v])=>row[k]!==v))return{data:null};row={...row,...values};return{data:{...row}};},async single(){row={...row,...values};return{data:{...row}};}};return q;}};
 const context=vm.createContext({Date,console,payloadIntegrationRequest:async(_path,body)=>{released++;return{status:'returned',claim_key:body.claim_id,recipient_address:body.recipient_address};},verifyDropSignature:async()=>({status:signed,tx:{TransactionType:'NFTokenAcceptOffer',Account:'wallet',NFTokenSellOffer:undefined},hash:'hash'}),cancelXamanTransaction:async()=>{cancelled++;}});
 const source=fs.readFileSync(new URL('../server/fishing.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export default /g,'').replace(/export /g,'');vm.runInContext(source,context);
 return{run:()=>context.returnCatch(admin,{...row}),get row(){return row;},get cancelled(){return cancelled;},get released(){return released;}};
}
test('throw back cancels the signing request and releases only this wallet-bound catch',async()=>{const s=fixture();const r=await s.run();assert.equal(r.status,'thrown_back');assert.equal(s.cancelled,1);assert.equal(s.released,1);assert.equal(s.row.payload_uuid,null);await s.run();assert.equal(s.released,1);});
test('already claimed catches never enter the return path',async()=>{const s=fixture('claimed');assert.equal((await s.run()).status,'claimed');assert.equal(s.cancelled,0);assert.equal(s.released,0);});
test('interrupted returns resume their existing reservation without cancelling again',async()=>{const s=fixture('returning');assert.equal((await s.run()).status,'thrown_back');assert.equal(s.cancelled,0);assert.equal(s.released,1);});
