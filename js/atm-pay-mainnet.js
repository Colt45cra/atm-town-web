/* Mainnet ATM Pay links are independent of Town login and its testnet vault. */
(function(){
  'use strict';
  let state=null,userId='',opened=false,timer=null;
  const key=()=>`atm-town:pay-link:${authSession?.user?.id||''}`;
  const dialog=document.createElement('dialog');dialog.id='atmPayMainnetLink';dialog.setAttribute('aria-label','ATM Pay mainnet wallet');dialog.style.cssText='max-width:520px;width:90%;max-height:85dvh;overflow:auto;background:#092330;color:#eafcff;border:1px solid #58ddd0;border-radius:20px;padding:22px';
  const body=document.createElement('div');dialog.appendChild(body);document.body.appendChild(dialog);
  const text=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n;};
  function button(label,fn){const b=text('button',label);b.type='button';b.className='atmWalletBtn';b.style.margin='6px';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){body.appendChild(text('p',e.message));}finally{b.disabled=false;}};return b;}
  const api=(action,body)=>apiWithAuth('/api/xrpl-nft-trade?action=pay-link-'+action,body?{method:'POST',body:JSON.stringify(body)}:{});
  async function refresh(){
    const id=authSession?.user?.id||'';
    if(!id){state=null;userId='';return null;}
    const data=await api('status');if(authSession?.user?.id!==id)return null;
    const old=userId===id?state?.wallet?.wallet_address:null;state=data;userId=id;
    if(old&&old!==data.wallet?.wallet_address)tradeBeaconClear('NFT wallet changed. Choose a beacon from this wallet.');
    window.ATMAccountSettings?.refresh();return data;
  }
  async function changed(){await refresh();render();window.ATMAccountSettings?.refresh();lockerState.status='idle';lockerState.nfts=[];lockerState.selectedNftId=null;try{await lockerRefreshXrpl(true);}catch(e){body.appendChild(text('p','Wallet linked. NFT refresh: '+e.message));}}
  async function inspect(){
    const pending=localStorage.getItem(key());if(!pending)return;
    try{
      const r=await api('inspect',{id:pending});
      if(r.status==='proved')await api('confirm',{id:pending});
      if(r.status==='proved'||r.status==='linked'){localStorage.removeItem(key());clearInterval(timer);timer=null;await changed();}
    }catch(e){if(opened)body.appendChild(text('p',e.message));clearInterval(timer);timer=null;}
  }
  function render(){
    body.textContent='';body.append(text('h2','ATM Pay · Mainnet'),text('p','Choose the wallet used by your NFT locker and trade beacon. Your Xaman link and testnet wallet stay available.'));
    if(state?.link){body.append(text('p','ATM Pay: '+state.link.wallet_address),text('p',state.link.active?'Active NFT wallet':'Connected'));
      if(!state.link.active)body.appendChild(button('Use ATM Pay for NFTs',async()=>{await api('select',{provider:'atm_pay'});await changed();}));
      if(state.link.active&&playerAccount?.wallet_address)body.appendChild(button('Use Xaman for NFTs',async()=>{await api('select',{provider:'xaman'});await changed();}));
    }
    body.appendChild(button(state?.link?'Connect another ATM Pay wallet':'Connect ATM Pay',async()=>{
      const r=await api('start',{});localStorage.setItem(key(),r.id);r.deeplink=window.ATMTownWalletReturn?.decorate(r.deeplink,r.id)||r.deeplink;
      const link=text('a','Open ATM Pay to approve');link.href=r.deeplink;link.target='_self';link.rel='noopener noreferrer';body.appendChild(link);
      clearInterval(timer);timer=setInterval(inspect,3000);
      window.location.assign(r.deeplink);
    }));
    body.append(text('p','NFT exchanges, sales, purchases, and sale cancellation use your selected mainnet ATM Pay wallet. Free drops and creating XRP buy offers use Xaman.'),button('Check connection',inspect),button('Close',()=>{dialog.close();opened=false;}));
  }
  async function show(){opened=true;if(!dialog.open)dialog.showModal();render();try{await refresh();await inspect();render();}catch(e){body.appendChild(text('p',e.message));}}
  dialog.addEventListener('close',()=>{opened=false;});
  document.getElementById('atmPayMainnetBtn')?.addEventListener('click',show);
  const lockerHost=document.getElementById('lockerNftSort')?.parentElement;
  if(lockerHost){const b=button('ATM PAY MAINNET',show);b.className='flowSecondary cyan';b.style.gridColumn='1 / -1';lockerHost.appendChild(b);}
  window.ATMMainnetWallet={openApp:()=>{if(userId!==authSession?.user?.id||!state?.link?.wallet_address){show();return;}window.open('https://atm-pay-two.vercel.app/','_blank','noopener,noreferrer');},refresh,check:async()=>{await refresh();await inspect();},linkedAddress:()=>userId===authSession?.user?.id?state?.link?.wallet_address:null,address:fallback=>userId===authSession?.user?.id&&state?.wallet?String(state.wallet.wallet_address||''):fallback,provider:()=>userId===authSession?.user?.id?state?.wallet?.provider:'xaman',open:show};
  const check=()=>{if(authSession?.user&&!document.hidden)refresh().then(inspect).catch(()=>{});};
  window.addEventListener('focus',check);window.addEventListener('pageshow',check);document.addEventListener('visibilitychange',check);setTimeout(check,500);
})();
