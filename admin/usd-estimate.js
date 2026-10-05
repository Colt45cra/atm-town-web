const prices=new Map();
export function tokenIdentity(token){let currency=String(token.currency).toUpperCase();if(/^[A-Z0-9]{4,20}$/.test(currency))currency=[...currency].map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('').toUpperCase().padEnd(40,'0');return `${currency}:${token.issuer||''}`;}
export function usdAmount(amount,quote,now=Date.now()){
 const raw=String(amount||'').trim();if(!/^\d+(?:\.\d+)?$/.test(raw)||!Number.isFinite(Number(raw))||Number(raw)<=0)return 'Enter a token amount to see its estimated USD value.';
 if(!quote?.available||!Number.isFinite(quote.usd_per_token)||quote.usd_per_token<=0||!Number.isFinite(Date.parse(quote.expires_at))||Date.parse(quote.expires_at)<=now)return 'USD estimate unavailable';
 const total=Number(raw)*quote.usd_per_token;if(!Number.isFinite(total))return 'USD estimate unavailable';
 if(total>0&&total<.005)return '≈ less than $0.01 USD';
 return `≈ ${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(total)} USD`;
}
export function attachUsdEstimate({form,input,details,token,getPrice}){
 const host=document.createElement('div');host.className='usd-estimate';const value=document.createElement('strong'),meta=document.createElement('small');value.setAttribute('role','status');value.setAttribute('aria-live','polite');host.append(value,meta);form.append(host);
 const key=tokenIdentity(token);let quote=null,loading=false;
 function render(){const cached=prices.get(key)?.quote;if(cached)quote=cached;value.textContent=loading&&!quote&&Number(input.value)>0?'Loading USD estimate…':usdAmount(input.value,quote);meta.textContent=quote?.available&&Date.parse(quote.expires_at)>Date.now()?`${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumSignificantDigits:6}).format(quote.usd_per_token)} per token · Checked ${new Date(quote.checked_at).toLocaleTimeString()} · Spot estimate`:'Prices refresh while this form is open.';}
 async function refresh(){if(details.hidden||loading)return;const cached=prices.get(key);if(cached?.quote&&Date.parse(cached.quote.expires_at)>Date.now()){quote=cached.quote;render();return;}
 loading=true;render();try{let promise=cached?.promise;if(!promise){promise=getPrice();prices.set(key,{promise});}const result=await promise;if(tokenIdentity(result)!==key)throw new Error('Token price identity mismatch.');quote=result;prices.set(key,{quote});}catch{quote={available:false,expires_at:new Date(Date.now()+15000).toISOString()};prices.set(key,{quote});}finally{loading=false;render();}}
 input.addEventListener('input',()=>{render();refresh();});details.addEventListener('toggle',()=>{render();refresh();});
 const timer=setInterval(()=>{if(!form.isConnected){clearInterval(timer);return;}if(!document.hidden){render();refresh();}},15000);render();return {refresh,render};
}
