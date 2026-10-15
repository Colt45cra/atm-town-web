import { readJson,XAMAN_API_BASE,xamanHeaders,xamanError,fetchXamanPayload,XRPL_TX_HASH } from './xaman-vending.js';
import codec from './xrpl-swap-codec.cjs';
import { rpc, findOwnedNft, getBuyOffers } from './xrpl-nft-trading.js';
export const marketError = message => Object.assign(new Error(message),{status:409});
export function xrpDrops(value) {
  if(!/^\d{1,9}(?:\.\d{1,6})?$/.test(String(value||'')))throw marketError('Enter a positive XRP price with up to six decimals.');
  const [whole,fraction='']=String(value).split('.');const drops=BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'));
  if(drops<1n||drops>100000000000000n)throw marketError('Enter a price between 0.000001 and 100,000,000 XRP.');
  return drops.toString();
}
export async function sellOffers(token) {
  try {return (await rpc('nft_sell_offers',{nft_id:token,ledger_index:'validated',limit:400})).offers||[];}
  catch(e){if(String(e.xrplCode).toLowerCase()==='objectnotfound')return [];throw e;}
}
export function activeOffer(offer,wallet) {
  return /^\d+$/.test(String(offer.amount))&&BigInt(offer.amount)>0n&&(!offer.destination||offer.destination===wallet)&&(!offer.expiration||offer.expiration>Math.floor(Date.now()/1000)-946684800);
}
export async function marketEligibility(row) {
  if(row.operation==='sell'){
    const nft=await findOwnedNft(row.wallet_address,row.token_id);
    if(!nft||(Number(nft.Flags)&8)===0)throw marketError('Your wallet must own this transferable NFT.');
    return;
  }
  const offers=row.operation==='accept_buy'?await getBuyOffers(row.token_id):await sellOffers(row.token_id);
  const offer=offers.find(o=>o.nft_offer_index===row.offer_index);
  if(!offer)throw marketError('This offer is no longer available.');
  if(row.operation==='cancel_sell'){
    if(offer.owner!==row.wallet_address)throw marketError('Only your own listing can be cancelled.');return;
  }
  if(!activeOffer(offer,row.wallet_address)||String(offer.amount)!==row.amount_drops||offer.owner!==row.counterparty_wallet)throw marketError('The price, destination, or owner changed. Review a fresh offer.');
  const owner=row.operation==='accept_buy'?row.wallet_address:row.counterparty_wallet;
  if(!await findOwnedNft(owner,row.token_id)||row.counterparty_wallet===row.wallet_address)throw marketError('The NFT owner changed or this is your own offer.');
}
export async function marketAccount(wallet) {
  const [a,c,s,f]=await Promise.all([rpc('account_info',{account:wallet,ledger_index:'validated'}),rpc('account_info',{account:wallet,ledger_index:'current',queue:true}),rpc('server_info',{}),rpc('fee',{})]);
  if(s.info?.network_id!==0)throw marketError('Mainnet is required.');
  if(a.account_data?.Sequence!==c.account_data?.Sequence||Number(c.queue_data?.txn_count||0))throw marketError('Wait for your pending wallet transactions to finish.');
  const fee=BigInt(f.drops?.open_ledger_fee||'10')*2n;if(fee<1n||fee>100000n)throw marketError('Network fees are too high. Try later.');
  return {Account:wallet,Sequence:a.account_data.Sequence,Fee:fee.toString(),LastLedgerSequence:Number(a.ledger_index)+150};
}
export function verifyMarketBlob(blob,row) {
  if(typeof blob!=='string'||blob.length>10000||!/^[a-f0-9]+$/i.test(blob))throw marketError('Invalid signed approval.');
  const tx=codec.decode(blob),{SigningPubKey,TxnSignature,...terms}=tx;
  if(!SigningPubKey||!TxnSignature||codec.deriveAddress(SigningPubKey)!==row.wallet_address||codec.encode(terms)!==codec.encode(row.transaction_json)||!codec.verify(codec.encodeForSigning(tx),TxnSignature,SigningPubKey))throw marketError('The signature does not match this wallet and the reviewed sale.');
  return codec.hashSignedTx(tx);
}
export async function createMarketXamanPayload(row){
 const response=await fetch(`${XAMAN_API_BASE}/payload`,{method:'POST',headers:xamanHeaders(),cache:'no-store',body:JSON.stringify({txjson:row.transaction_json,options:{submit:true,expire:8,force_network:'MAINNET',signer:row.wallet_address},custom_meta:{identifier:row.id,instruction:`ATM Town NFT ${row.operation}: review the NFT and XRP amount.`}})});
 const created=await readJson(response);if(!response.ok||!created?.uuid||!created?.next?.always)throw xamanError(created,'Xaman could not prepare this NFT sale.');
 return {provider:'xaman',uuid:created.uuid,deeplink:created.next.always};
}
export async function reconcileMarket(admin,row) {
 if(row.status==='signing'&&row.sign_request?.provider==='xaman'){
  const lookup=await fetchXamanPayload(row.sign_request.uuid);if(!lookup.found)throw marketError('The Xaman approval could not be found.');
  const payload=lookup.payload||{},meta=payload.meta||{};let patch;
  if(meta.resolved&&meta.signed!==true)patch={status:'failed',failure_reason:'The Xaman approval was declined.'};
  else if(meta.expired&&!meta.signed)patch={status:'expired',failure_reason:'The Xaman approval expired.'};
  else if(meta.signed&&XRPL_TX_HASH.test(String(payload.response?.txid||'').toUpperCase()))patch={status:'submitting',tx_hash:String(payload.response.txid).toUpperCase()};
  if(!patch)return row;
  const updated=await admin.from('atm_pay_nft_market_requests').update(patch).eq('id',row.id).eq('status','signing');if(updated.error)throw updated.error;row={...row,...patch};
 }
  if(row.status!=='submitting')return row;
  let result;try{result=await rpc('tx',{transaction:row.tx_hash,binary:false,api_version:2});}catch(e){if(e.xrplCode!=='txnNotFound')throw e;}
  let patch;
  if(result?.validated){
    const tx=result.tx_json||result.tx||{}, meta=result.meta||{};
    // RPC responses can include hash/date/ledger fields alongside the transaction.
    const matched=Object.keys(row.transaction_json).every(k=>JSON.stringify(tx[k])===JSON.stringify(row.transaction_json[k]));
    if(meta.TransactionResult!=='tesSUCCESS'||!matched)patch={status:'failed',failure_reason:meta.TransactionResult||'The validated sale did not match the approval.'};
    else {
      const created=(meta.AffectedNodes||[]).map(n=>n.CreatedNode).find(n=>n?.LedgerEntryType==='NFTokenOffer');
      patch={status:row.operation==='sell'?'open':row.operation==='cancel_sell'?'cancelled':'accepted',...(created?{offer_index:created.LedgerIndex}:{}),failure_reason:null};
      if(row.operation==='sell'&&!created)patch={status:'failed',failure_reason:'The validated listing offer was not found.'};
    }
  }else {
    const ledger=await rpc('ledger',{ledger_index:'validated'});
    if(Number(ledger.ledger_index)>row.transaction_json.LastLedgerSequence)patch={status:'expired',failure_reason:'The signing window expired without a validated sale.'};
  }
  if(patch){const r=await admin.from('atm_pay_nft_market_requests').update(patch).eq('id',row.id).eq('status','submitting');if(r.error)throw r.error;return {...row,...patch};}
  return row;
}
