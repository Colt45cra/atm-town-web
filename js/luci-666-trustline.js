/*
 * Luci $666 trustline gate.
 * Checks the signed-in player's verified Xaman wallet on XRPL Mainnet.
 * If missing, creates a Xaman TrustSet payload and waits for validated ledger state
 * before enabling Luci's 6 $666 reward claim button.
 */
(function installLuci666Trustline(global){
  'use strict';

  if(global.ATMLuci666Trustline)return;

  const API='/api/luci-666-trustline';
  const ISSUER='rhvf9fe6PP3GC8Bku2Ug7iQPjPDxYZfrxN';
  const POLL_MS=2500;
  const POLL_TIMEOUT_MS=120000;
  const state={checked:false,checking:false,hasTrustline:false,deeplink:'',pollTimer:0,pollStarted:0};

  function api(path,options={}){
    if(typeof global.atmApiWithAuth!=='function')throw new Error('Sign in to ATM Town first.');
    return global.atmApiWithAuth(path,options);
  }

  function claimButton(){return document.getElementById('luci666Claim');}
  function statusNode(){return document.getElementById('luci666Status');}
  function giftVisible(){return claimButton()?.classList.contains('visible')===true;}

  function ensureUi(){
    const claim=claimButton();
    if(!claim)return false;
    if(document.getElementById('luci666Trustline'))return true;

    const style=document.createElement('style');
    style.dataset.luci666Trustline='1';
    style.textContent=`
#luci666Trustline{display:none;min-height:42px;padding:0 13px;border:1px solid rgba(94,225,255,.48);border-radius:10px;background:linear-gradient(90deg,#113746,#174d58);color:#dffaff;font:1000 9px system-ui;letter-spacing:.02em;box-shadow:0 8px 22px rgba(0,0,0,.18)}
#luci666Trustline.visible{display:block}#luci666Trustline:disabled{opacity:.55}.luci666TrustlineHint{color:#9fdce8!important}
`;
    document.head.appendChild(style);

    const button=document.createElement('button');
    button.type='button';
    button.id='luci666Trustline';
    button.textContent='CREATE $666 TRUSTLINE';
    button.addEventListener('click',createTrustline);
    claim.parentElement?.insertBefore(button,claim);
    return true;
  }

  function setStatus(message,hint=false){
    const node=statusNode();if(!node)return;
    node.textContent=message||'';
    node.classList.toggle('luci666TrustlineHint',!!hint);
  }

  function render(){
    if(!ensureUi())return;
    const claim=claimButton(),trust=document.getElementById('luci666Trustline');
    const visible=giftVisible();
    if(!claim||!trust)return;

    if(!visible){trust.classList.remove('visible');return;}

    if(state.hasTrustline){
      trust.classList.remove('visible');
      if(claim.dataset.luciTrustlineLocked==='1'){
        claim.disabled=false;
        delete claim.dataset.luciTrustlineLocked;
      }
      if(state.checked)setStatus('$666 trustline verified. You can claim your welcome gift.');
      return;
    }

    claim.dataset.luciTrustlineLocked='1';
    claim.disabled=true;
    trust.classList.add('visible');
    trust.disabled=state.checking;
    if(state.deeplink){
      trust.textContent='OPEN XAMAN TO APPROVE';
    }else if(state.checking){
      trust.textContent='CHECKING TRUSTLINE…';
    }else{
      trust.textContent='CREATE $666 TRUSTLINE';
    }
  }

  async function checkTrustline({quiet=false}={}){
    if(state.checking)return state.hasTrustline;
    state.checking=true;render();
    try{
      const data=await api(API,{method:'GET'});
      state.checked=true;
      state.hasTrustline=data?.has_trustline===true;
      if(state.hasTrustline){
        state.deeplink='';
        stopPolling();
      }else if(!quiet){
        setStatus('A $666 trustline is required before Luci can send your 6 $666 gift.',true);
      }
      return state.hasTrustline;
    }catch(error){
      state.checked=true;
      state.hasTrustline=false;
      if(!quiet)setStatus(error?.message||'Link and verify Xaman before creating the $666 trustline.',true);
      return false;
    }finally{
      state.checking=false;render();
    }
  }

  async function createTrustline(){
    if(state.deeplink){
      openXaman(state.deeplink);
      startPolling();
      return;
    }
    state.checking=true;render();setStatus('Preparing a Mainnet $666 trustline request in Xaman…',true);
    try{
      const data=await api(API,{method:'POST',body:JSON.stringify({})});
      if(data?.has_trustline===true){
        state.hasTrustline=true;state.checked=true;state.deeplink='';
        render();return;
      }
      if(!data?.deeplink)throw new Error('Xaman did not return a signing link.');
      state.deeplink=String(data.deeplink);
      setStatus('Approve the TrustSet in Xaman. Luci will unlock the claim as soon as XRPL validates it.',true);
      render();
      openXaman(state.deeplink);
      startPolling();
    }catch(error){
      setStatus(error?.message||'Could not create the $666 trustline request.',true);
    }finally{
      state.checking=false;render();
    }
  }

  function openXaman(url){
    try{
      const opened=global.open(url,'_blank','noopener,noreferrer');
      if(!opened)global.location.href=url;
    }catch(_error){
      try{global.location.href=url;}catch(_ignore){}
    }
  }

  function stopPolling(){
    if(state.pollTimer){global.clearTimeout(state.pollTimer);state.pollTimer=0;}
    state.pollStarted=0;
  }

  function startPolling(){
    stopPolling();state.pollStarted=Date.now();
    const loop=async()=>{
      if(state.hasTrustline||!giftVisible()){stopPolling();return;}
      if(Date.now()-state.pollStarted>POLL_TIMEOUT_MS){
        stopPolling();setStatus('Still waiting for XRPL validation. Tap CHECK TRUSTLINE after approving in Xaman.',true);
        const trust=document.getElementById('luci666Trustline');if(trust){trust.textContent='CHECK TRUSTLINE';state.deeplink='';}
        return;
      }
      const ok=await checkTrustline({quiet:true});
      if(ok){setStatus('$666 trustline verified. Your claim is unlocked.');return;}
      state.pollTimer=global.setTimeout(loop,POLL_MS);
    };
    state.pollTimer=global.setTimeout(loop,POLL_MS);
  }

  function activateGift(){
    if(!giftVisible())return;
    render();
    checkTrustline();
  }

  function install(){
    if(!ensureUi()){
      const observer=new MutationObserver(()=>{if(ensureUi()){observer.disconnect();install();}});
      observer.observe(document.documentElement,{childList:true,subtree:true});
      global.setTimeout(()=>observer.disconnect(),15000);
      return;
    }
    const claim=claimButton();
    const observer=new MutationObserver(()=>{
      if(giftVisible())activateGift();else{stopPolling();render();}
    });
    observer.observe(claim,{attributes:true,attributeFilter:['class']});
    global.addEventListener('focus',()=>{if(giftVisible()&&!state.hasTrustline)checkTrustline({quiet:true});});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&giftVisible()&&!state.hasTrustline)checkTrustline({quiet:true});});
    render();
  }

  global.ATMLuci666Trustline=Object.freeze({check:checkTrustline,create:createTrustline,get state(){return {...state};},issuer:ISSUER});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})(window);
