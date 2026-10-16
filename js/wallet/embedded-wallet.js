/* Compatibility entry points route exclusively to the connected ATM Pay application. */
(function(global){
 'use strict';
 function wallet(){return global.ATMMainnetWallet;}
 function open(){if(wallet())return wallet().linkedAddress()?wallet().openApp():wallet().open();global.ATMAccountSettings?.open('ATM Pay is starting. Please try again in a moment.');}
 function close(){document.getElementById('atmEmbeddedWalletModal')?.classList.remove('open');}
 function getPublicIdentity(){
  const id=typeof authSession!=='undefined'?authSession?.user?.id:null;
  if(!id)return null;
  return {user_id:id,display_name:typeof playerAccount!=='undefined'?playerAccount?.display_name||'ATM Player':'ATM Player',character_id:typeof playerAccount!=='undefined'?playerAccount?.selected_character||'classic':'classic',atm_pay_ready:!!wallet()?.linkedAddress(),network:'mainnet'};
 }
 function getConsumerSnapshot(){return {ready:!!wallet()?.linkedAddress(),profile:getPublicIdentity(),pendingRequestCount:0,balanceXrp:null,balanceAvailable:false,balanceFunded:false,recentPeople:[],incomingRequests:[],recentActivity:[]};}
 async function refresh(){await wallet()?.refresh();global.dispatchEvent(new CustomEvent('atm:pay-state-changed'));return getPublicIdentity();}
 async function refreshConsumerSnapshot(){await refresh();return getConsumerSnapshot();}
 function bind(){const button=document.getElementById('embeddedWalletBtn');if(button){button.textContent='ATM Pay';button.onclick=open;}}
 global.ATMEmbeddedWallet={open,close,refresh,refreshBalance:()=>wallet()?.refresh(),lock:close,resetForAuthChange:close,signPayloadMoneyRainFunding:async()=>{throw Error('This payment flow has been retired. Reopen Money Rain to use mainnet funding.');}};
 global.ATMPay={open,openToRecipient:open,openRequest:open,refresh,getPublicIdentity,getConsumerSnapshot,refreshConsumerSnapshot,searchPeople:async()=>[]};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})(window);
