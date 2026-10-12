import test from 'node:test';
import assert from 'node:assert/strict';
import {Wallet} from 'xrpl';
import {donationTokens,donationTransaction,donationOfferIds,verifyDonationBlob,sameDonationTerms} from '../lib/nft-donation-batch.js';
import {REWARDS_NFT_WALLET} from '../lib/nft-drops.js';
const wallet=Wallet.generate(),other=Wallet.generate(),tokens=Array.from({length:8},(_,i)=>(i+1).toString(16).padStart(64,'0').toUpperCase());
const common={Account:wallet.address,Sequence:100,Fee:'200',LastLedgerSequence:107000150};
test('eight NFTs use eight restricted free offers; one NFT uses the ordinary offer path',()=>{
 const tx=donationTransaction(wallet.address,tokens,common,900000000);
 assert.equal(tx.TransactionType,'Batch');assert.equal(tx.Flags,65536);assert.equal(tx.RawTransactions.length,8);
 assert.equal(new Set(donationOfferIds(tx)).size,8);
 for(const [i,{RawTransaction:r}] of tx.RawTransactions.entries()){assert.equal(r.Sequence,101+i);assert.equal(r.Amount,'0');assert.equal(r.Destination,REWARDS_NFT_WALLET);assert.equal(r.Fee,'0');assert.equal(r.SigningPubKey,'');}
 assert.equal(donationTransaction(wallet.address,tokens.slice(0,1),common,900000000).TransactionType,'NFTokenCreateOffer');
 for(const bad of [[],[tokens[0],tokens[0]],[...tokens,tokens[0]],['invalid']])assert.throws(()=>donationTokens(bad));
});
test('donation signature binds every NFT, destination, fee and inner sequence',()=>{
 const transaction_json=donationTransaction(wallet.address,tokens,common,900000000),row={wallet_address:wallet.address,transaction_json};
 const signed=wallet.sign(transaction_json);assert.equal(verifyDonationBlob(signed.tx_blob,row),signed.hash);
 assert.throws(()=>verifyDonationBlob(other.sign({...transaction_json,Account:other.address}).tx_blob,row));
 for(const field of ['Destination','Amount','NFTokenID','Sequence']){const tx=structuredClone(transaction_json);tx.RawTransactions[0].RawTransaction[field]=({Destination:other.address,Amount:'1',NFTokenID:'F'.repeat(64),Sequence:200})[field];assert.throws(()=>verifyDonationBlob(wallet.sign(tx).tx_blob,row));}
 assert.throws(()=>verifyDonationBlob(wallet.sign({...transaction_json,Fee:'1000'}).tx_blob,row));
 assert.equal(sameDonationTerms({...transaction_json,hash:signed.hash,date:123},transaction_json),true);
 const reordered=Object.fromEntries(Object.entries(transaction_json).reverse());assert.equal(sameDonationTerms(reordered,transaction_json),true);
});
