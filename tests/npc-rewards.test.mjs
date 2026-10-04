import test from 'node:test';import assert from 'node:assert/strict';
import {npcProgram,npcReceipt} from '../lib/npc-rewards.js';
test('only actual town NPCs map to reward programs',()=>{assert.equal(npcProgram('luci').slug,'luci-666-welcome');assert.throws(()=>npcProgram('genesis'));});
test('a newly confirmed reward is not reported as previously claimed',()=>{
 const result={network:'mainnet',wallet:'verified-wallet',status:'success',amount:'6',currency:'666',txHash:'A'.repeat(64),alreadyClaimed:true,newClaim:true};
 const receipt=npcReceipt(result,'verified-wallet');assert.equal(receipt.ok,true);assert.equal(receipt.already_claimed,false);
 assert.equal(npcReceipt({...result,newClaim:false},'verified-wallet').already_claimed,true);
 assert.equal(npcReceipt({...result,txHash:null},'verified-wallet').ok,false);
 assert.throws(()=>npcReceipt({...result,wallet:'other'},'verified-wallet'));
});
