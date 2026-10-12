import codec from './xrpl-swap-codec.cjs';
import { NFT_ID, XRPL_ADDRESS } from './xrpl-nft-trading.js';
import { REWARDS_NFT_WALLET, freeOfferTransaction, fail } from './nft-drops.js';
import { INNER_BATCH, ALL_OR_NOTHING, nftOfferId } from './xrpl-nft-swap.js';

export function donationTokens(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 8) throw fail('Select between one and eight NFTs.');
  const tokens=input.map(t=>String(t).toUpperCase());
  if(tokens.some(t=>!NFT_ID.test(t))||new Set(tokens).size!==tokens.length)throw fail('Select different, valid NFTs.');
  return tokens;
}
export function donationTransaction(wallet,tokens,common,expiration) {
  tokens=donationTokens(tokens);
  if(!XRPL_ADDRESS.test(wallet)||wallet===REWARDS_NFT_WALLET||common.Account!==wallet||!Number.isSafeInteger(common.Sequence)||common.Sequence<1||common.Sequence>0xffffffff-9||!Number.isSafeInteger(expiration))throw fail('Invalid donation wallet or sequence.');
  const offers=tokens.map(token=>({...freeOfferTransaction(wallet,token,REWARDS_NFT_WALLET),Expiration:expiration}));
  const tx=tokens.length===1?{...common,...offers[0]}:{...common,TransactionType:'Batch',Flags:ALL_OR_NOTHING,RawTransactions:offers.map((offer,i)=>({RawTransaction:{...offer,Sequence:common.Sequence+i+1,Fee:'0',SigningPubKey:'',Flags:INNER_BATCH+1}}))};
  codec.encode(tx);return tx;
}
export function donationOperations(tx){return tx.TransactionType==='Batch'?tx.RawTransactions.map(t=>t.RawTransaction):[tx];}
export function donationOfferIds(tx){return donationOperations(tx).map(t=>nftOfferId(t.Account,t.Sequence));}
export function sameDonationTerms(actual,expected){
  // Providers may add response metadata. Every frozen transaction field must match.
  try { return codec.encode(Object.fromEntries(Object.keys(expected).map(k=>[k,actual?.[k]])))===codec.encode(expected); } catch { return false; }
}
export function verifyDonationBlob(blob,row){
  if(typeof blob!=='string'||blob.length>20000||!/^[A-F0-9]+$/i.test(blob))throw fail('Invalid donation approval.',409);
  const tx=codec.decode(blob),{SigningPubKey,TxnSignature,...terms}=tx;
  if(!SigningPubKey||!TxnSignature||codec.deriveAddress(SigningPubKey)!==row.wallet_address||codec.encode(terms)!==codec.encode(row.transaction_json)||!codec.verify(codec.encodeForSigning(tx),TxnSignature,SigningPubKey))throw fail('The donation signature does not match your wallet and selected NFTs.',409);
  return codec.hashSignedTx(tx);
}
