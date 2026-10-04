import test from 'node:test';
import assert from 'node:assert/strict';
import {economyDecimal,requireTownAdmin} from '../lib/town-economy.js';
import {loadStorePrices,priceCart} from '../lib/attribute-store.js';
function admin(rows){const query={select(){return this;},in(){return this;},then(resolve){return Promise.resolve({data:rows,error:null}).then(resolve);}};return {from(){return query;}};}
test('disabled attributes cannot silently regain fallback XRP pricing',async()=>{
 const db=admin([{item_id:'body:astronaut',active:false,xrp_amount:'3'}]);
 assert.equal((await loadStorePrices(db))['body:astronaut'].active,false);
 await assert.rejects(priceCart(db,['body:astronaut'],'xrp'),/not currently for sale/);
});
test('explicit blank XRP prices remain disabled; missing rows retain existing default',async()=>{
 const prices=await loadStorePrices(admin([{item_id:'body:astronaut',active:true,xrp_amount:null,atm_amount:'10'}]));
 assert.equal(prices['body:astronaut'].xrp,null);assert.equal(prices['body:gold'].xrp,'3');
});
test('economy inputs reject negative, exponent, invalid and excess precision',()=>{
 for(const value of ['-1','1e8','NaN','0.0000001','1000000000000000000'])assert.throws(()=>economyDecimal(value));
 assert.equal(economyDecimal('001.2500'),'1.25');assert.equal(economyDecimal('',{nullable:true}),null);
});
test('ordinary authenticated users cannot access admin operations',async()=>{
 const db={from(){return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:null,error:null};}};}};
 await assert.rejects(requireTownAdmin(db,{id:'ordinary-user'}),error=>error.status===403);
});
