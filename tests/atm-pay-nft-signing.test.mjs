import test from 'node:test';
import assert from 'node:assert/strict';
import { Wallet,signMultiBatch,encode,convertStringToHex } from 'xrpl';
import { verifyWalletLink,checkCapability,payRequest } from '../lib/atm-pay-town.js';
import { buildNftSwapBatch,verifyInnerBatchSignature,verifyFinalSwapBlob } from '../lib/xrpl-nft-swap.js';
const a=Wallet.generate(),b=Wallet.generate(),other=Wallet.generate();
const batch=buildNftSwapBatch({walletA:a.address,walletB:b.address,tokenA:'A'.repeat(64),tokenB:'B'.repeat(64),sequenceA:100,sequenceB:200,ledgerIndex:107000000,expiration:850000000,fee:'140'});
test('both ATM Pay signatures verify and final submission preserves the exact recipient approval',()=>{
  const inner=structuredClone(batch);signMultiBatch(b,inner);const innerBlob=encode(inner);
  assert.equal(verifyInnerBatchSignature(innerBlob,b.address,batch),true);
  const swap={batch_json:batch,wallet_a:a.address,wallet_b:b.address,inner_signed_blob:innerBlob};
  const final=a.sign(inner);assert.equal(verifyFinalSwapBlob(final.tx_blob,swap),final.hash);
  for(const patch of [{Fee:'9999'},{Account:other.address},{Flags:524288},{Memos:[{Memo:{MemoData:'AB'}}]}]){
    const modified={...structuredClone(inner),...patch};
    assert.throws(()=>verifyFinalSwapBlob(a.sign(modified).tx_blob,swap));
  }
  const forged=structuredClone(batch);signMultiBatch(other,forged,{batchAccount:b.address});
  assert.throws(()=>verifyFinalSwapBlob(a.sign(forged).tx_blob,swap));
});
test('wallet linking accepts only an expired proof bound to this Town account and Pay identity',()=>{
  const row={id:'00000000-0000-0000-0000-000000000001',user_id:'00000000-0000-0000-0000-000000000002'},pay='00000000-0000-0000-0000-000000000003';
  const tx={TransactionType:'AccountSet',Account:a.address,Fee:'0',Sequence:0,LastLedgerSequence:1,Memos:[{Memo:{MemoData:convertStringToHex(`ATM Town wallet link|${row.id}|${row.user_id}|${pay}`)}}]};
  const signed=a.sign(tx);assert.equal(verifyWalletLink(signed.tx_blob,row,pay),a.address);
  assert.throws(()=>verifyWalletLink(signed.tx_blob,{...row,user_id:pay},pay));
  assert.throws(()=>verifyWalletLink(signed.tx_blob,row,row.user_id));
  for(const patch of [{Fee:'10'},{LastLedgerSequence:107000100},{Sequence:1},{SetFlag:4}])assert.throws(()=>verifyWalletLink(a.sign({...tx,...patch}).tx_blob,row,pay));
});
test('ATM Pay links carry only an opaque single-request capability in the fragment',()=>{
  const p=payRequest('swap_inner','trade-id'),url=new URL(p.deeplink),params=new URLSearchParams(url.hash.slice(1));
  assert.equal(url.search,'');assert.equal(url.origin,'https://atm-pay-two.vercel.app');
  assert.doesNotThrow(()=>checkCapability(p,params.get('request'),params.get('secret')));
  assert.throws(()=>checkCapability(p,params.get('request'),'A'.repeat(64)));
  assert.throws(()=>checkCapability(p,'other',params.get('secret')));
  assert.equal(p.secret,undefined);
});
