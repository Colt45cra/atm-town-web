/* Only a short-lived, account-bound wallet round trip may resume gameplay. */
(function(){
 'use strict';
 const PREFIX='atm-town:wallet-return:',MAX_AGE=20*60*1000;
 const params=new URLSearchParams(location.hash.slice(1)),token=params.get('atm_pay_return');
 let restoring=false,done=false,attempts=0;
 function prepare(request){
  const saved=window.ATMTownWalletSession?.capture();if(!saved?.user)return null;
  const nonce=crypto.randomUUID();localStorage.setItem(PREFIX+nonce,JSON.stringify({...saved,request,created:Date.now()}));
  const back=new URL(location.href);back.search='';back.hash='atm_pay_return='+nonce;return back.href;
 }
 function decorate(url,request){const back=prepare(request);if(!back)return url;const result=new URL(url);const fragment=new URLSearchParams(result.hash.slice(1));fragment.set('return_to',back);result.hash=fragment.toString();return result.href;}
 async function resume(){
  if(!token||done||restoring||document.hidden)return;
  let saved;try{saved=JSON.parse(localStorage.getItem(PREFIX+token)||'null');}catch{return;}
  if(!saved||Date.now()-saved.created>MAX_AGE||saved.created>Date.now()){done=true;localStorage.removeItem(PREFIX+token);return;}
  if(!authSession?.user){if(++attempts<60)setTimeout(resume,500);return;}
  if(saved.user!==authSession.user.id){done=true;return;}
  restoring=true;
  try{
   if(!await window.ATMTownWalletSession?.resume(saved)){if(++attempts<60)setTimeout(resume,1000);return;}
   localStorage.removeItem(PREFIX+token);done=true;
   const url=new URL(location.href);const hash=new URLSearchParams(url.hash.slice(1));hash.delete('atm_pay_return');url.hash=hash.toString();window.history.replaceState(null,'',url.href);
   await window.ATMMainnetWallet?.check();
   await window.ATMAccountSettings?.open('Returned from ATM Pay. Checking your wallet connection…');
  }catch(e){window.ATMAccountSettings?.status(e.message);if(++attempts<60)setTimeout(resume,1000);}
  finally{restoring=false;}
 }
 window.ATMTownWalletReturn={decorate,resume};
 window.addEventListener('pageshow',resume);window.addEventListener('focus',resume);document.addEventListener('visibilitychange',resume);setTimeout(resume,0);
})();
