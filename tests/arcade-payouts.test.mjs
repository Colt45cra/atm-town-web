import test from 'node:test';
import assert from 'node:assert/strict';
import {payArcadeReward,validateRewardProgram,rewardUnits} from '../lib/arcade-payouts.js';
import {ATM_ISSUER} from '../lib/xaman-vending.js';
const hash='A'.repeat(64);
function database(status='queued'){
 let row={id:'d9964bcb-6b73-4e66-bb33-5a955a181342',status,amount:'1.250000',wallet_address:'rGQjB1JL31cHKdEkz7LArEkVbTnjWJwvCk',payload_program_slug:'town-arcade'};
 return {read:()=>row,from(){let patch=null,allowed=null;const query={select(){return this;},eq(){return this;},in(_key,statuses){allowed=statuses;return this;},update(value){patch=value;return this;},single(){return Promise.resolve({data:row});},maybeSingle(){if(allowed&&!allowed.includes(row.status))return Promise.resolve({data:null});row={...row,...patch};return Promise.resolve({data:row});},then(resolve){if(!allowed||allowed.includes(row.status))row={...row,...patch};return Promise.resolve({data:row}).then(resolve);}};return query;}};
}
const response=(db,status='success')=>({status,network:'mainnet',currency:'ATM',issuer:ATM_ISSUER,wallet:db.read().wallet_address,amount:'1.25',txHash:hash});
test('automatic payout uses stored wallet and amount; a paid retry never calls Payload',async()=>{
 const db=database();let calls=0;
 const request=async(path,body)=>{calls++;assert.equal(path,'/api/integrations/v1/arcade-programs/town-arcade');assert.deepEqual(body,{sessionId:db.read().id,walletAddress:db.read().wallet_address,amount:'1.250000'});return response(db);};
 assert.equal((await payArcadeReward(db,db.read().id,{request})).status,'paid');
 await payArcadeReward(db,db.read().id,{request});assert.equal(calls,1);
});
test('unknown network outcome retains the same queued session for retry',async()=>{
 const db=database();let ids=[];
 const request=async(_path,body)=>{ids.push(body.sessionId);if(ids.length===1)throw Error('Timeout');return response(db);};
 assert.equal((await payArcadeReward(db,db.read().id,{request})).status,'queued');
 assert.equal((await payArcadeReward(db,db.read().id,{request})).status,'paid');assert.equal(ids[0],ids[1]);
});
test('pending ledger response is never labelled paid',async()=>{
 const db=database();assert.equal((await payArcadeReward(db,db.read().id,{request:async()=>response(db,'pending')})).status,'pending');
});
test('wrong wallet, asset, amount or missing confirmation hash cannot mark a reward paid',async()=>{
 for(const patch of [{wallet:'different'},{currency:'XRP'},{issuer:'different'},{amount:'2'},{txHash:null}]){
 const db=database();assert.equal((await payArcadeReward(db,db.read().id,{request:async()=>({...response(db),...patch})})).status,'queued');
 }
});
test('enabled reward settings must fit Payload session cap and a funded ATM vault',async()=>{
 const request=async()=>({network:'mainnet',currency:'ATM',issuer:ATM_ISSUER,status:'active',maxAmountPerSession:'3'});
 await validateRewardProgram('town-arcade',{atm_per_coin:'0.01',max_coins:10000,daily_atm_limit:'3'},request);
 await assert.rejects(validateRewardProgram('town-arcade',{atm_per_coin:'0.01',max_coins:10000,daily_atm_limit:'4'},request),/exceeds/);
 assert.equal(rewardUnits('0.000001'),1n);assert.throws(()=>rewardUnits('1e8'));
});
test('sponsor payout verifies the immutable session token rather than ATM',async()=>{
 const db=database();db.read().reward_currency='46555A5A59000000000000000000000000000000';db.read().reward_issuer='rhCAT4hRdi2Y9puNdkpMzxrdKa5wkppR62';
 const request=async()=>({...response(db),currency:db.read().reward_currency,issuer:db.read().reward_issuer});
 assert.equal((await payArcadeReward(db,db.read().id,{request})).status,'paid');
 const wrong=database();wrong.read().reward_currency=db.read().reward_currency;wrong.read().reward_issuer=db.read().reward_issuer;
 assert.equal((await payArcadeReward(wrong,wrong.read().id,{request:async()=>response(wrong)})).status,'queued');
});
