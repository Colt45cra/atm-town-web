(function(){
 'use strict';
 const modal=document.createElement('dialog');modal.setAttribute('aria-label','NFT sales');modal.style.cssText='max-width:520px;width:90%;max-height:85dvh;overflow:auto;background:#092330;color:#eafcff;border:1px solid #58ddd0;border-radius:20px;padding:22px';document.body.appendChild(modal);
 let view=null,timer=null;const pendingKey=()=>`atm-town:nft-sale:${authSession?.user?.id||''}`;
 const node=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n;};
 const api=(action,body)=>apiWithAuth('/api/xrpl-nft-trade?action=pay-market-'+action,{method:'POST',body:JSON.stringify(body)});
 const button=(label,fn)=>{const b=node('button',label);b.type='button';b.className='atmWalletBtn';b.style.margin='6px';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){modal.appendChild(node('p',e.message));}finally{b.disabled=false;}};return b;};
 async function poll(){
  const id=localStorage.getItem(pendingKey());if(!id)return;
  try{const r=await api('status',{id});
   if(['open','accepted','cancelled','failed','expired'].includes(r.status)){
    localStorage.removeItem(pendingKey());clearInterval(timer);timer=null;
    showXrplPaymentToast(r.error|| (r.status==='open'?'NFT listed on XRPL.':r.status==='accepted'?'NFT sale completed on XRPL.':`NFT listing ${r.status}.`),r.error?'error':'success',9000);
    if(r.status==='open'&&view?.own&&view.nft&&view.token===r.token_id)await tradeBeaconSet(view.nft,'open_to_trade');
    if(r.status==='accepted')await lockerRefreshXrpl(true);
    if(modal.open&&view)await render();
   }
  }catch(e){if(modal.open)modal.appendChild(node('p',e.message));}
 }
 async function start(operation,offer,amount){
  const r=await api('start',{operation,token_id:view.token,token_name:view.name,offer_index:offer?.offer_index,amount_xrp:amount});
  localStorage.setItem(pendingKey(),r.id);clearInterval(timer);timer=setInterval(poll,3000);
  const link=node('a','Open ATM Pay to review and approve');link.href=r.deeplink;link.target='_blank';link.rel='noopener noreferrer';modal.appendChild(link);
  modal.appendChild(node('p','Approve with your passkey, then return to this Town tab.'));
  if(/Android|iPhone|iPad/i.test(navigator.userAgent))window.location.assign(r.deeplink);else window.open(r.deeplink,'_blank','noopener');
 }
 async function render(){
  const current=view;modal.textContent='';modal.append(node('h2',current.own?'Sell your NFT':'Buy this NFT'),node('p',current.name));
  modal.appendChild(button('Close',()=>modal.close()));
  if(window.ATMMainnetWallet?.provider()!=='atm_pay'){
   modal.append(node('p','Select your connected ATM Pay mainnet wallet to list, buy, or cancel an NFT sale.'));
   modal.appendChild(button('ATM PAY MAINNET',()=>{modal.close();window.ATMMainnetWallet?.open();}));return;
  }
  if(current.own){
   const input=document.createElement('input');input.type='number';input.inputMode='decimal';input.min='0.000001';input.step='0.000001';input.placeholder='Price in XRP';input.style.cssText='font-size:18px;padding:12px;width:85%';const label=node('label','Sale price (XRP)');label.appendChild(input);modal.appendChild(label);
   modal.appendChild(button('LIST WITH ATM PAY',()=>start('sell',null,input.value)));
   modal.append(node('p','Public listing · seven days. Your NFT stays in your wallet until purchased. Other XRPL marketplaces can also accept it. Issuer royalties may reduce your proceeds.'));
  }
  const r=await api('list',{token_id:current.token,owner_wallet:current.owner});if(current!==view||!modal.open)return;
  modal.appendChild(node('h3',current.own?'Your active listings':'Active XRP listings'));
  if(!r.offers.length)modal.appendChild(node('p','No active XRP listings.'));
  for(const offer of r.offers){const row=node('div',`${offer.amount_xrp} XRP${offer.expiration&&offer.expiration<=Math.floor(Date.now()/1000)-946684800?' · expired':''}`);row.appendChild(button(current.own?'CANCEL LISTING':`BUY · ${offer.amount_xrp} XRP`,()=>start(current.own?'cancel_sell':'accept_sell',offer)));modal.appendChild(row);}
  modal.appendChild(button('Refresh listings',render));
 }
 async function open(nft,owner,own=false){
  if(!authSession?.user){showXrplPaymentToast('Sign in to use NFT sales.','error',7000);return;}
  await window.ATMMainnetWallet?.refresh();
  view={nft:own?nft:null,token:own?lockerNftTokenId(nft):nft.tokenId,name:own?lockerNftDisplayName(nft):nft.name,owner,own};
  if(!modal.open)modal.showModal();try{await render();}catch(e){modal.appendChild(node('p',e.message));}
 }
 window.ATMNftMarket={sell:nft=>open(nft,lockerWalletAddress(),true),buy:beacon=>open(beacon,beacon.wallet),acceptBuy:async(nft,offer)=>{await open(nft,lockerWalletAddress(),true);if(window.ATMMainnetWallet?.provider()==='atm_pay')await start('accept_buy',offer);}};
 window.addEventListener('focus',()=>{if(authSession?.user){poll();if(localStorage.getItem(pendingKey())&&!timer)timer=setInterval(poll,3000);}});
})();
