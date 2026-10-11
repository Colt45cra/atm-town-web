import test from 'node:test';
import assert from 'node:assert/strict';
import {Wallet} from 'xrpl';
import {xrpDrops,verifyMarketBlob,activeOffer,reconcileMarket,marketEligibility} from '../lib/atm-pay-nft-market.js';
const w=Wallet.generate(),other=Wallet.generate(),token='A'.repeat(64),offer='B'.repeat(64);
const base={Account:w.address,Sequence:100,Fee:'20',LastLedgerSequence:107000150};
test('XRP sale prices use exact drops and never create an accidental free listing',()=>{
 assert.equal(xrpDrops('1.000001'),'1000001');assert.equal(xrpDrops('25'),'25000000');
 for(const v of ['0','-1','1e3','0.0000001','100000001','NaN',''])assert.throws(()=>xrpDrops(v));
});
test('sale, purchase and cancellation signatures bind the full reviewed transaction and wallet',()=>{
 for(const tx of [{...base,TransactionType:'NFTokenCreateOffer',Flags:1,NFTokenID:token,Amount:'25000000',Expiration:900000000},{...base,TransactionType:'NFTokenAcceptOffer',NFTokenSellOffer:offer},{...base,TransactionType:'NFTokenAcceptOffer',NFTokenBuyOffer:offer},{...base,TransactionType:'NFTokenCancelOffer',NFTokenOffers:[offer]}]){
  const row={wallet_address:w.address,transaction_json:tx},signed=w.sign(tx);assert.equal(verifyMarketBlob(signed.tx_blob,row),signed.hash);
  for(const patch of [{Fee:'30'},{Sequence:101},{Account:other.address},{Memos:[{Memo:{MemoData:'AB'}}]}])assert.throws(()=>verifyMarketBlob(w.sign({...tx,...patch}).tx_blob,row));
  if(tx.Amount)assert.throws(()=>verifyMarketBlob(w.sign({...tx,Amount:'1'}).tx_blob,row));
  if(tx.NFTokenSellOffer)assert.throws(()=>verifyMarketBlob(w.sign({...tx,NFTokenSellOffer:'C'.repeat(64)}).tx_blob,row));
 }
});
test('only positive XRP offers with a valid destination and expiry are displayed',()=>{
 const valid={amount:'25000000'};assert.equal(activeOffer(valid,w.address),true);
 for(const patch of [{amount:'0'},{amount:{currency:'USD',value:'1'}},{destination:other.address},{expiration:1}])assert.equal(activeOffer({...valid,...patch},w.address),false);
});
test('offer acceptance rejects stale NFT ownership and changed prices before broadcast',async()=>{
 const previous=global.fetch;
 global.fetch=async(_url,options)=>{const {method}=JSON.parse(options.body);return new Response(JSON.stringify({result:method==='nft_sell_offers'?{offers:[{nft_offer_index:offer,owner:other.address,amount:'25'}]}:{account_nfts:[]}}));};
 try{
  await assert.rejects(marketEligibility({operation:'accept_sell',wallet_address:w.address,counterparty_wallet:other.address,token_id:token,offer_index:offer,amount_drops:'26'}),/price/);
  await assert.rejects(marketEligibility({operation:'accept_sell',wallet_address:w.address,counterparty_wallet:other.address,token_id:token,offer_index:offer,amount_drops:'25'}),/owner/);
 }finally{global.fetch=previous;}
});
test('a sale is open only after validated success and an actual created offer; expiry is checked on ledger',async()=>{
 const previous=global.fetch,updates=[];let response;
 const admin={from:()=>({update:patch=>({eq:()=>({eq:async()=>{updates.push(patch);return {error:null};}})})})};
 const transaction_json={...base,TransactionType:'NFTokenCreateOffer',Flags:1,NFTokenID:token,Amount:'25',Expiration:900000000},row={id:'test',status:'submitting',operation:'sell',transaction_json,tx_hash:'C'.repeat(64)};
 global.fetch=async(_url,options)=>{const {method}=JSON.parse(options.body);return new Response(JSON.stringify({result:method==='ledger'?{ledger_index:107000151}:response}));};
 try{
  response={validated:true,tx_json:transaction_json,meta:{TransactionResult:'tesSUCCESS',AffectedNodes:[{CreatedNode:{LedgerEntryType:'NFTokenOffer',LedgerIndex:offer}}]}};
  assert.equal((await reconcileMarket(admin,row)).status,'open');
  response.meta.TransactionResult='tecINSUFFICIENT_RESERVE';assert.equal((await reconcileMarket(admin,row)).status,'failed');
  response={error:'txnNotFound',status:'error'};assert.equal((await reconcileMarket(admin,row)).status,'expired');
 }finally{global.fetch=previous;}
});
