(function ATMPwaModule(global){
  'use strict';

  const SW_URL='/service-worker.js';
  const IOS=/iPad|iPhone|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&Number(navigator.maxTouchPoints||0)>1);
  const STANDALONE=()=>Boolean(global.matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone===true);
  const seenPingIds=new Set();
  const hadServiceWorkerController=Boolean(navigator.serviceWorker?.controller);
  let serviceWorkerUpdateReady=false;
  let deferredInstallPrompt=null;
  let registration=null;
  let state={
    supported:'serviceWorker' in navigator,
    serviceWorkerReady:false,
    installable:false,
    installed:STANDALONE(),
    ios:IOS,
    pushSupported:'serviceWorker' in navigator&&'PushManager' in global&&'Notification' in global,
    notificationPermission:'Notification' in global?Notification.permission:'unsupported',
    subscribed:false,
    download:{active:false,completed:0,total:0,status:'idle',error:''}
  };

  function emit(){global.dispatchEvent(new CustomEvent('atm:pwa-state-changed',{detail:getState()}));}
  function getState(){return JSON.parse(JSON.stringify(state));}
  function update(patch){state={...state,...patch};emit();}
  function cleanMessage(value){return String(value||'').replace(/\s+/g,' ').trim().slice(0,180);}

  function ensurePingToast(){
    let toast=document.getElementById('atmPlayerPingToast');
    if(toast)return toast;
    const style=document.createElement('style');
    style.textContent=`#atmPlayerPingToast{position:fixed;left:50%;top:var(--hud-notice-top,calc(var(--vv-top,0px) + 72px));transform:translate(-50%,-16px);z-index:12050;width:min(520px,calc(100vw - 24px));display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid rgba(88,241,230,.48);border-radius:15px;background:rgba(5,18,26,.97);box-shadow:0 18px 48px rgba(0,0,0,.5);color:#eaffff;font:800 12px/1.35 system-ui;opacity:0;pointer-events:none;transition:.2s ease;backdrop-filter:blur(12px)}#atmPlayerPingToast.show{opacity:1;transform:translate(-50%,0);pointer-events:auto}#atmPlayerPingToast .atmPingIcon{display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;border-radius:12px;background:rgba(88,241,230,.12);font-size:20px}#atmPlayerPingToast .atmPingText{min-width:0;flex:1}#atmPlayerPingToast .atmPingText b{display:block;color:#58f1e6;font-size:10px;letter-spacing:.04em;text-transform:uppercase;margin-bottom:2px}#atmPlayerPingToast .atmPingText span{display:block;white-space:normal}#atmPlayerPingToast button{border:0;border-radius:10px;background:#17313d;color:#dffcff;padding:8px 10px;font:1000 8px system-ui;text-transform:uppercase}`;
    document.head.appendChild(style);
    toast=document.createElement('div');toast.id='atmPlayerPingToast';toast.innerHTML='<span class="atmPingIcon">📣</span><span class="atmPingText"><b>Player Ping</b><span id="atmPlayerPingText"></span></span><button type="button" id="atmPlayerPingOpen">People</button>';
    document.body.appendChild(toast);
    document.getElementById('atmPlayerPingOpen')?.addEventListener('click',()=>{toast.classList.remove('show');global.ATMPeopleHub?.open?.('online');});
    return toast;
  }

  let pingToastTimer=null;
  function positionPingToast(toast){
    if(!toast)return;
    const vv=global.visualViewport;
    const vvTop=vv?vv.offsetTop:0;
    const sharedTop=Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hud-notice-top'));
    let top=Number.isFinite(sharedTop)?sharedTop:vvTop+72;
    const payment=document.getElementById('xrplPaymentToast');
    if(payment?.classList.contains('visible')) top=Math.max(top,payment.getBoundingClientRect().bottom+8);
    const eventHud=document.getElementById('atmWorldEventHud');
    if(eventHud?.classList.contains('show')) top=Math.max(top,eventHud.getBoundingClientRect().bottom+8);
    toast.style.top=Math.round(top)+'px';
  }
  function receivePing(payload){
    if(!payload||payload.type!=='player_ping'||global.ATMSocial?.getState()?.preferences?.player_pings===false)return false;
    const id=String(payload.ping_id||'');
    if(id&&seenPingIds.has(id))return false;
    if(id){seenPingIds.add(id);if(seenPingIds.size>80)seenPingIds.delete(seenPingIds.values().next().value);}
    const message=cleanMessage(payload.message||'A player pinged you in ATM Town.');
    const toast=ensurePingToast();const text=document.getElementById('atmPlayerPingText');if(text)text.textContent=message;
    positionPingToast(toast);
    toast.classList.add('show');clearTimeout(pingToastTimer);pingToastTimer=setTimeout(()=>toast.classList.remove('show'),9000);
    try{navigator.vibrate?.([80,50,80]);}catch(_error){}
    global.dispatchEvent(new CustomEvent('atm:player-ping',{detail:payload}));
    return true;
  }

  async function readyRegistration(){
    if(!state.supported)throw new Error('This browser does not support service workers.');
    if(registration)return registration;
    registration=await navigator.serviceWorker.register(SW_URL,{scope:'/'});
    await navigator.serviceWorker.ready;
    update({serviceWorkerReady:true,installed:STANDALONE()});
    const subscription=await registration.pushManager?.getSubscription?.();
    update({subscribed:Boolean(subscription),notificationPermission:'Notification' in global?Notification.permission:'unsupported'});
    return registration;
  }

  function b64ToUint8Array(base64String){
    const padding='='.repeat((4-base64String.length%4)%4);const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(base64);return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)));
  }

  async function authenticatedApi(action,options={}){
    if(typeof global.atmApiWithAuth!=='function')throw new Error('Sign in to ATM Town first.');
    return global.atmApiWithAuth(`/api/embedded-wallet?action=${encodeURIComponent(action)}`,options);
  }

  async function syncSubscription(){
    if(!state.pushSupported||Notification.permission!=='granted')return false;
    const reg=await readyRegistration();
    const config=await authenticatedApi('push-config');
    if(!config?.available||!config.public_key)throw new Error('ATM Town notifications are not configured yet.');
    let subscription=await reg.pushManager.getSubscription();
    if(!subscription){
      subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToUint8Array(config.public_key)});
    }
    const json=subscription.toJSON();
    await authenticatedApi('push-subscribe',{method:'POST',body:JSON.stringify({subscription:{endpoint:json.endpoint,keys:json.keys}})});
    update({subscribed:true,notificationPermission:Notification.permission});
    return true;
  }

  async function enableNotifications(){
    if(!state.pushSupported)throw new Error('Push notifications are not supported in this browser.');
    if(IOS&&!STANDALONE())throw new Error('On iPhone/iPad, add ATM Town to the Home Screen first, then open the installed app and enable notifications.');
    const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
    update({notificationPermission:permission});
    if(permission!=='granted')throw new Error('Notification permission was not granted.');
    await syncSubscription();
    return getState();
  }

  async function disableNotifications(){
    if(!state.supported)return false;
    const reg=await readyRegistration();const subscription=await reg.pushManager?.getSubscription?.();
    if(subscription){
      try{await authenticatedApi('push-unsubscribe',{method:'POST',body:JSON.stringify({endpoint:subscription.endpoint})});}catch(_error){}
      await subscription.unsubscribe().catch(()=>false);
    }
    update({subscribed:false});return true;
  }

  async function onAuthChanged(signedIn){
    global.ATMSocial?.refresh().catch(()=>{});
    if(!signedIn){
      if(!state.supported)return;
      try{const reg=await readyRegistration();const subscription=await reg.pushManager?.getSubscription?.();if(subscription)await subscription.unsubscribe();}catch(_error){}
      update({subscribed:false});
      return;
    }
    if(state.pushSupported&&Notification.permission==='granted'){
      try{await syncSubscription();}catch(error){console.warn('ATM Town push subscription sync failed',error?.message||error);}
    }
  }

  async function install(){
    if(STANDALONE()){update({installed:true,installable:false});return {installed:true};}
    if(deferredInstallPrompt){
      const prompt=deferredInstallPrompt;deferredInstallPrompt=null;update({installable:false});
      await prompt.prompt();const choice=await prompt.userChoice.catch(()=>({outcome:'dismissed'}));
      update({installed:STANDALONE()||choice?.outcome==='accepted'});return choice;
    }
    if(IOS)throw new Error('On iPhone/iPad: tap Share, choose Add to Home Screen, then open ATM Town from the new Home Screen icon.');
    throw new Error('Use your browser’s Install ATM Town / Add to Home Screen option.');
  }

  let worldPreparation=null;
  async function downloadWorld(manifest){
    const reg=await readyRegistration();
    try{await reg.update?.();}catch{}
    if(reg.installing){const installing=reg.installing;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Game update is still installing. Please retry.')),30000);const check=()=>{if(installing.state==='activated'){clearTimeout(timer);resolve();}else if(installing.state==='redundant'){clearTimeout(timer);reject(Error('Game update interrupted. Please retry.'));}};installing.addEventListener('statechange',check);check();});}
    const worker=reg.active||navigator.serviceWorker.controller;
    if(!worker)throw Error('ATM Town offline cache is still starting. Try again in a moment.');
    state.download={active:true,completed:0,total:0,status:'starting',error:''};emit();
    try{await navigator.storage?.persist?.();}catch{}
    return new Promise((resolve,reject)=>{
      const channel=new MessageChannel();let timer;
      const close=()=>{clearTimeout(timer);channel.port1.close();};
      const watchdog=()=>{clearTimeout(timer);timer=setTimeout(()=>{close();reject(Error('Map download stopped responding. Retry to resume saved progress.'));},180000);};
      channel.port1.onmessage=({data})=>{
        watchdog();
        if(data.type==='ATM_PWA_DOWNLOAD_PROGRESS'){state.download={active:true,completed:data.completed||0,total:data.total||0,status:data.phase||'world',retry_seconds:Number(data.retry_seconds||0),error:''};emit();}
        else if(data.type==='ATM_PWA_DOWNLOAD_COMPLETE'){state.download={active:false,completed:data.completed,total:data.total,status:'complete',error:''};emit();close();resolve(data);}
        else if(data.type==='ATM_PWA_DOWNLOAD_ERROR'){state.download={...state.download,active:false,status:'error',error:cleanMessage(data.message)};emit();close();reject(Error(state.download.error));}
      };
      watchdog();worker.postMessage({type:'ATM_PWA_DOWNLOAD_WORLD',manifest},[channel.port2]);
    });
  }
  async function prepareWorld(manifest){
    if(!state.supported)return false;
    if(worldPreparation)return worldPreparation;
    worldPreparation=(async()=>{
      const overlay=document.createElement('section');overlay.id='atmMapPreparation';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Updating map');
      overlay.style.cssText='position:fixed;inset:0;z-index:40000;display:grid;place-items:center;background:#071923;color:#eaffff;font:16px system-ui;padding:24px;text-align:center';
      const card=document.createElement('div');card.style.cssText='width:min(420px,100%)';
      const title=document.createElement('h2');title.textContent='Updating ATM Town map…';
      const text=document.createElement('p');text.setAttribute('aria-live','polite');
      const progress=document.createElement('progress');progress.style.cssText='width:100%;height:20px';
      const hint=document.createElement('p');hint.textContent='Saving the map on this device. Later visits reuse saved files.';
      const controls=document.createElement('div');card.append(title,text,progress,hint,controls);overlay.appendChild(card);
      const paint=()=>{const d=state.download;if((d.status==='world'&&d.total>0||d.status==='waiting')&&!overlay.isConnected)document.body.appendChild(overlay);progress.max=Math.max(1,d.total);progress.value=d.completed;text.textContent=d.status==='waiting'?`Map server is busy. Continuing automatically in ${d.retry_seconds||1}s…${d.total?' ('+d.completed+' / '+d.total+' files ready)':''}`:d.total?`${d.completed} / ${d.total} map files ready`:'Checking the live map and buildings…';};
      global.addEventListener('atm:pwa-state-changed',paint);
      try{
        while(true){
          controls.replaceChildren();
          try{await downloadWorld(manifest);return true;}
          catch(error){
            if(!overlay.isConnected)document.body.appendChild(overlay);title.textContent='Map download paused';text.textContent=cleanMessage(error.message);hint.textContent='Downloaded files are saved. Retry to continue where you left off.';
            const again=await new Promise(resolve=>{const retry=document.createElement('button');retry.textContent='Retry download';const back=document.createElement('button');back.textContent='Back';for(const b of [retry,back])b.style.cssText='margin:8px;padding:14px;border-radius:10px;background:#53e1cb;color:#062731;border:0;font-size:16px';retry.onclick=()=>resolve(true);back.onclick=()=>resolve(false);controls.append(retry,back);});
            if(!again)throw error;title.textContent='Updating ATM Town map…';
          }
        }
      }finally{global.removeEventListener('atm:pwa-state-changed',paint);overlay.remove();}
    })();
    try{return await worldPreparation;}finally{worldPreparation=null;}
  }

  async function storageEstimate(){
    try{
      const estimate=await navigator.storage?.estimate?.();
      return {usage:Number(estimate?.usage||0),quota:Number(estimate?.quota||0)};
    }catch(_error){return {usage:0,quota:0};}
  }

  async function sendPing(targetUserId,kind='hello',message=''){
    const target=String(targetUserId||'');if(!target)throw new Error('Choose a player first.');
    const result=await authenticatedApi('player-ping',{method:'POST',body:JSON.stringify({target_user_id:target,kind,message})});
    if(result?.ping)global.ATMGamePeople?.sendPing?.(result.ping);
    return result;
  }

  global.addEventListener('beforeinstallprompt',(event)=>{event.preventDefault();deferredInstallPrompt=event;update({installable:true,installed:STANDALONE()});});
  global.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;update({installable:false,installed:true});});
  global.matchMedia?.('(display-mode: standalone)')?.addEventListener?.('change',()=>update({installed:STANDALONE()}));

  if('serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      // v235.11.4: never hard-reload an active game when a deploy installs a
      // new service worker. The new worker controls the next navigation, while
      // the current town session keeps its already-loaded, version-consistent JS.
      if(!hadServiceWorkerController||serviceWorkerUpdateReady)return;
      serviceWorkerUpdateReady=true;
      global.dispatchEvent(new CustomEvent('atm:pwa-update-ready'));
    });
    navigator.serviceWorker.addEventListener('message',(event)=>{
      const data=event.data||{};
      if(data.type==='ATM_PLAYER_PING'){receivePing(data.payload);return;}
      if(data.type==='ATM_PWA_DOWNLOAD_PROGRESS'){
        state.download={active:true,completed:Number(data.completed||0),total:Number(data.total||0),status:String(data.phase||'world'),retry_seconds:Number(data.retry_seconds||0),error:''};emit();return;
      }
      if(data.type==='ATM_PWA_DOWNLOAD_COMPLETE'){
        state.download={active:false,completed:Number(data.completed||0),total:Number(data.total||0),status:'complete',error:''};emit();return;
      }
      if(data.type==='ATM_PWA_DOWNLOAD_ERROR'){
        state.download={...state.download,active:false,status:'error',error:cleanMessage(data.message||'Download failed.')};emit();
      }
    });
    readyRegistration().catch((error)=>console.warn('ATM Town PWA registration failed',error));
  }

  global.visualViewport?.addEventListener('resize',()=>positionPingToast(document.getElementById('atmPlayerPingToast')));
  global.visualViewport?.addEventListener('scroll',()=>positionPingToast(document.getElementById('atmPlayerPingToast')));
  global.ATMPWA={getState,install,enableNotifications,disableNotifications,syncSubscription,onAuthChanged,downloadWorld,prepareWorld,storageEstimate,sendPing,receivePing};
})(window);
