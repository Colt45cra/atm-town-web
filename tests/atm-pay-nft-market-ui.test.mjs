import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.value='';}
 set textContent(s){this.text=s;this.children=[];}get textContent(){return(this.text||'')+this.children.map(c=>c.textContent).join('');}
 setAttribute(){}append(...c){this.children.push(...c);}appendChild(c){this.append(c);return c;}showModal(){this.open=true;}close(){this.open=false;}
}
function setup(provider='atm_pay'){
 const body=new Element('body'),calls=[],opened=[],local=new Map(),events={};let interval;
 const nft={tokenId:'A'.repeat(64),name:'Selected NFT'};
 const context=vm.createContext({document:{body,createElement:t=>new Element(t)},authSession:{user:{id:'user'}},navigator:{userAgent:'Desktop'},window:{ATMMainnetWallet:{connections:()=>({xaman:'xaman-wallet',atm_pay:'own-wallet'}),provider:()=>provider,refresh:async()=>{},open(){}},open:u=>opened.push(u),addEventListener:(e,f)=>events[e]=f},Date,Math,localStorage:{getItem:k=>local.get(k),setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)},setInterval:f=>{interval=f;return 1;},clearInterval(){},lockerWalletAddress:()=> 'own-wallet',lockerNftTokenId:n=>n.tokenId,lockerNftDisplayName:n=>n.name,tradeBeaconSet:async()=>{},lockerRefreshXrpl:async()=>{},showXrplPaymentToast(){},apiWithAuth:async(url,opts)=>{const b=JSON.parse(opts.body);calls.push({url,body:b});return url.endsWith('-list')?{offers:[{offer_index:'B'.repeat(64),amount_xrp:25}]}:{id:'request',deeplink:'https://atm-pay-two.vercel.app/town#kind=market'};}});
 vm.runInContext(fs.readFileSync(new URL('../js/atm-pay-nft-market.js',import.meta.url),'utf8'),context);
 return {api:context.window.ATMNftMarket,modal:body.children[0],calls,opened,nft};
}
test('SELL selects the exact NFT and price; listing starts only after explicit user action',async()=>{
 const t=setup();await t.api.sell(t.nft);assert.equal(t.calls.length,1);assert.equal(t.opened.length,0);
 const label=t.modal.children.find(c=>c.tag==='label');label.children[0].value='25.000001';
 await t.modal.children.find(c=>c.textContent==='LIST WITH ATM PAY').onclick();
 assert.equal(t.calls[1].body.token_id,t.nft.tokenId);assert.equal(t.calls[1].body.amount_xrp,'25.000001');assert.equal(t.calls[1].body.operation,'sell');assert.equal(t.opened.length,1);
});
test('beacon purchases use its listed offer and never expose seller cancellation controls',async()=>{
 const t=setup();await t.api.buy({tokenId:t.nft.tokenId,name:'Their NFT',wallet:'their-wallet'});
 assert.equal(t.calls[0].body.owner_wallet,'their-wallet');assert.equal(t.modal.textContent.includes('CANCEL LISTING'),false);
 const row=t.modal.children.find(c=>c.textContent.includes('BUY ·'));await row.children[0].onclick();assert.equal(t.calls[1].body.operation,'accept_sell');assert.equal(t.calls[1].body.offer_index,'B'.repeat(64));
});
test('purchase wallet choice is sent per request without changing the global locker provider',async()=>{
 const t=setup('atm_pay');await t.api.buy({tokenId:t.nft.tokenId,name:'Their NFT',wallet:'their-wallet'});
 await t.modal.children.find(c=>c.tag==='button'&&c.textContent.startsWith('Xaman ·')).onclick();
 const row=t.modal.children.find(c=>c.textContent.includes('BUY ·'));await row.children[0].onclick();
 assert.equal(t.calls.at(-1).body.provider,'xaman');assert.equal(t.calls.at(-1).body.operation,'accept_sell');assert.equal(t.calls.at(-1).body.token_id,t.nft.tokenId);
 assert.match(t.modal.textContent,/Open Xaman to review/);
});
test('Xaman and ATM Pay choices are both shown while links remain connected',async()=>{
 const t=setup();await t.api.buy({tokenId:t.nft.tokenId,name:'Their NFT',wallet:'their-wallet'});
 assert.match(t.modal.textContent,/Xaman · xaman-wallet/);assert.match(t.modal.textContent,/ATM Pay · own-wallet/);assert.equal(t.opened.length,0);
});
