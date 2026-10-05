const CACHE_MS=60000;
const MIN_POOL_USD=1000;
const priceCache=new Map();
let xrpCache=null;
const endpoints=['https://xrplcluster.com/','https://s1.ripple.com:51234/','https://s2.ripple.com:51234/'];
const positive=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?n:null;};
export function exactToken(asset){
 let currency=String(asset?.currency||'').trim().toUpperCase();const issuer=String(asset?.issuer||'').trim();
 if(/^[A-Z0-9]{4,20}$/.test(currency))currency=Buffer.from(currency,'ascii').toString('hex').toUpperCase().padEnd(40,'0');
 if(!(/^[A-Z0-9]{3}$/.test(currency)||/^[A-F0-9]{40}$/.test(currency))||currency==='XRP'||/^0{40}$/.test(currency)||!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(issuer))throw new Error('Invalid project token.');
 return {currency,issuer};
}
export function krakenXrpUsd(payload){
 if(!Array.isArray(payload?.error)||payload.error.length)throw new Error('XRP/USD quote unavailable.');
 const ticker=payload.result?.XXRPZUSD,bid=positive(ticker?.b?.[0]),ask=positive(ticker?.a?.[0]);
 if(!bid||!ask||ask<bid||ask/bid>1.1)throw new Error('XRP/USD quote unavailable.');
 return (bid+ask)/2;
}
export function ammTokenUsd(result,asset,xrpUsd){
 const {currency,issuer}=exactToken(asset),amm=result?.amm;
 if(result?.validated!==true||!amm||amm.asset_frozen||amm.asset2_frozen)throw new Error('No usable validated pool price.');
 const amounts=[amm.amount,amm.amount2],native=amounts.find(amount=>typeof amount==='string'&&/^\d+$/.test(amount)),token=amounts.find(amount=>amount&&typeof amount==='object'&&amount.currency?.toUpperCase()===currency&&amount.issuer===issuer);
 const xrp=positive(native)?Number(native)/1000000:null,units=positive(token?.value),usd=positive(xrpUsd);
 if(!xrp||!units||!usd||2*xrp*usd<MIN_POOL_USD)throw new Error('No usable pool liquidity.');
 const price=xrp/units*usd;if(!positive(price))throw new Error('No usable token price.');
 return {usd_per_token:price,pool_liquidity_usd:2*xrp*usd,ledger_index:result.ledger_index??null};
}
async function jsonFetch(url,options={},timeoutMs=6000){const response=await fetch(url,{...options,signal:AbortSignal.timeout(timeoutMs),cache:'no-store'});if(!response.ok)throw new Error('Price source unavailable.');return response.json();}
async function xrpUsd(){
 if(xrpCache&&xrpCache.expires>Date.now())return xrpCache.promise;
 const promise=jsonFetch('https://api.kraken.com/0/public/Ticker?pair=XRPUSD').then(krakenXrpUsd);xrpCache={promise,expires:Date.now()+CACHE_MS};
 try{return await promise;}catch(error){xrpCache=null;throw error;}
}
async function pool(asset){
 return Promise.any(endpoints.map(async endpoint=>{const payload=await jsonFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'amm_info',params:[{asset:{currency:'XRP'},asset2:asset,ledger_index:'validated'}]})},10000);if(payload.result?.validated===true&&payload.result.amm)return payload.result;throw new Error('Pool price unavailable.');}));
}
export async function tokenUsdPrice(input){
 const asset=exactToken(input),key=`${asset.currency}:${asset.issuer}`,cached=priceCache.get(key);
 if(cached&&cached.expires>Date.now())return cached.promise;
 const promise=(async()=>{try{const [result,usd]=await Promise.all([pool(asset),xrpUsd()]);const price=ammTokenUsd(result,asset,usd),now=Date.now();return {...asset,...price,available:true,checked_at:new Date(now).toISOString(),expires_at:new Date(now+CACHE_MS).toISOString(),source:'XRPL XRP/token AMM + Kraken XRP/USD'};}catch{return {...asset,available:false,checked_at:new Date().toISOString(),expires_at:new Date(Date.now()+15000).toISOString(),source:null};}})();
 if(priceCache.size>100)priceCache.clear();priceCache.set(key,{promise,expires:Date.now()+CACHE_MS});const quote=await promise;priceCache.set(key,{promise,expires:Date.parse(quote.expires_at)});return quote;
}
