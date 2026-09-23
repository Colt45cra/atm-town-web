/*
 * Luci $666 in-world conversation UX.
 * ATM Town stays visible while talking: Luci answers over his character,
 * questions live in a bottom horizontal carousel, and the welcome reward is a
 * local/private pickup visible only to the speaking player.
 */
(function installLuciWorldConversation(global){
  'use strict';

  if(global.ATMLuci666BeckonUx)return;

  const POLL_MS=700;
  const GIFT_QUESTION_THRESHOLD=3;
  const giftState={resolving:false,mode:'idle',lastCheck:0,coin:null,pickupBusy:false,pickupAttempted:false,claimed:false,receipt:null};
  let lastOrdinaryAnswer='';

  function panelOpen(){return document.getElementById('luci666Panel')?.classList.contains('open')===true;}
  function giftSelected(){return document.getElementById('luci666Claim')?.classList.contains('visible')===true;}
  function sourceAnswer(){return String(document.getElementById('luci666AnswerText')?.textContent||'').trim();}
  function hiddenStatus(){return String(document.getElementById('luci666Status')?.textContent||'').trim();}

  function loadTrustlineGate(){
    if(global.ATMLuci666Trustline||document.querySelector('script[data-atm-luci-666-trustline]'))return;
    const script=document.createElement('script');
    script.src='/js/luci-666-trustline.js?v=1.0.2';
    script.async=false;
    script.dataset.atmLuci666Trustline='1';
    script.onerror=()=>script.remove();
    document.body.appendChild(script);
  }

  function installStyles(){
    if(document.querySelector('style[data-luci-666-world-ui-v5]'))return;
    document.querySelector('style[data-luci-666-world-ui]')?.remove();
    document.querySelector('style[data-luci-666-world-ui-v3]')?.remove();
    document.querySelector('style[data-luci-666-world-ui-v4]')?.remove();
    document.querySelector('style[data-luci-666-horizontal-questions]')?.remove();

    const style=document.createElement('style');
    style.dataset.luci666WorldUiV5='1';
    style.textContent=`
#luci666Panel{position:fixed!important;inset:0!important;display:none;background:transparent!important;padding:0!important;pointer-events:none!important;z-index:9750!important}
#luci666Panel.open{display:block!important}
#luci666Card{position:fixed!important;left:50%!important;right:auto!important;top:auto!important;bottom:max(102px,calc(env(safe-area-inset-bottom) + 86px))!important;transform:translateX(-50%)!important;width:min(760px,calc(100vw - 18px))!important;height:94px!important;min-height:94px!important;max-height:94px!important;display:grid!important;grid-template-rows:31px 63px!important;overflow:hidden!important;border:1px solid rgba(255,96,96,.44)!important;border-radius:14px!important;background:rgba(8,17,23,.92)!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important;box-shadow:0 13px 38px rgba(0,0,0,.5)!important;pointer-events:auto!important;z-index:9780!important}
#luci666Card .luci666Header{height:31px!important;min-height:31px!important;padding:3px 6px 3px 8px!important;gap:5px!important;border-bottom:1px solid rgba(255,255,255,.08)!important;background:linear-gradient(90deg,rgba(60,13,22,.96),rgba(20,18,24,.94))!important}
#luci666Card .luci666Identity{gap:5px!important;min-width:0!important}
#luci666Card .luci666Avatar{width:23px!important;height:25px!important}
#luci666Card .luci666Eyebrow,#luci666Card .luci666Header small{display:none!important}
#luci666Card .luci666Header h2{margin:0!important;font-size:10px!important;line-height:1!important;white-space:nowrap!important}
#luci666Card .luci666Close{width:25px!important;height:25px!important;flex:0 0 25px!important;border-radius:7px!important;font-size:16px!important;line-height:1!important;touch-action:manipulation!important}
#luci666Card .luci666Body{height:63px!important;min-height:0!important;overflow:hidden!important;padding:6px!important;display:block!important}
#luci666Card .luci666Answer,#luci666Card .luci666Footer{display:none!important}
#luci666Card .luci666Questions{box-sizing:border-box!important;width:100%!important;height:51px!important;min-height:51px!important;display:flex!important;flex-flow:row nowrap!important;align-items:stretch!important;gap:7px!important;overflow-x:auto!important;overflow-y:hidden!important;padding:0 3px 2px!important;pointer-events:auto!important;touch-action:pan-x!important;overscroll-behavior-x:contain!important;overscroll-behavior-y:none!important;-webkit-overflow-scrolling:touch!important;scroll-snap-type:x proximity!important;scrollbar-width:none!important}
#luci666Card .luci666Questions::-webkit-scrollbar{display:none!important}
#luci666Card .luci666Question{box-sizing:border-box!important;flex:0 0 clamp(152px,36vw,210px)!important;width:auto!important;min-width:0!important;height:49px!important;min-height:49px!important;max-height:49px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;padding:7px 10px!important;border-radius:10px!important;background:rgba(20,39,50,.96)!important;font-size:9px!important;line-height:1.18!important;white-space:normal!important;text-align:left!important;scroll-snap-align:start!important;pointer-events:auto!important;touch-action:pan-x!important;-webkit-user-select:none!important;user-select:none!important}
#luci666Card .luci666Question.asked{border-color:rgba(255,209,102,.48)!important;color:#ffe2a0!important}
/* The source reward question stays hidden. A dedicated prompt is shown below the carousel instead. */
#luci666Card .luci666Question.reward{display:none!important}
#luci666GiftPrompt{position:fixed;left:50%;bottom:max(54px,calc(env(safe-area-inset-bottom) + 38px));transform:translateX(-50%);z-index:9785;display:none;align-items:center;justify-content:center;width:min(390px,calc(100vw - 28px));min-height:42px;padding:8px 14px;border:1px solid rgba(255,209,102,.58);border-radius:12px;background:linear-gradient(90deg,rgba(99,29,35,.97),rgba(76,59,28,.97));box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 18px rgba(255,209,102,.08);color:#ffe29a;font:1000 10px/1.15 system-ui;text-align:center;pointer-events:auto;touch-action:manipulation;-webkit-user-select:none;user-select:none}
#luci666GiftPrompt.visible{display:flex}
#luci666WorldSpeech{position:fixed;z-index:9790;display:none;width:min(285px,72vw);max-width:285px;padding:10px 11px 9px;border:1px solid rgba(255,103,103,.55);border-radius:14px;background:rgba(29,9,14,.95);color:#fff3f0;box-shadow:0 14px 38px rgba(0,0,0,.5),0 0 24px rgba(255,77,77,.1);transform:translate(-50%,-100%);transform-origin:50% 100%;pointer-events:auto}
#luci666WorldSpeech:after{content:'';position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);border:8px solid transparent;border-top-color:rgba(255,103,103,.55);border-bottom:0}
#luci666WorldSpeech .luciWorldName{color:#ff8c76;font:1000 8px/1 system-ui;letter-spacing:.12em;margin-bottom:5px}
#luci666WorldSpeech .luciWorldText{font:800 11px/1.4 system-ui;color:#fff3f0}
#luci666WorldSpeech .luciWorldActions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
#luci666WorldSpeech .luciWorldAction{min-height:34px;padding:0 9px;border:1px solid rgba(255,209,102,.55);border-radius:9px;background:linear-gradient(90deg,#52262a,#5b4827);color:#ffe8a5;font:1000 8px system-ui;touch-action:manipulation}
#luci666WorldSpeech .luciWorldAction.secondary{border-color:rgba(130,220,255,.42);background:#12323d;color:#d9f8ff}
#luci666PrivateCoin{position:fixed;z-index:9650;display:none;width:42px;height:42px;border-radius:50%;place-items:center;background:radial-gradient(circle at 35% 28%,#fff5a8 0 12%,#ffd45f 22%,#f29a27 55%,#9b4719 78%,#4b1c13 100%);border:2px solid rgba(255,231,135,.92);box-shadow:0 8px 18px rgba(0,0,0,.5),0 0 22px rgba(255,187,64,.62);color:#562316;font:1000 16px/1 system-ui;text-shadow:0 1px rgba(255,255,255,.45);transform:translate(-50%,-78%);transform-origin:50% 100%;pointer-events:auto;cursor:pointer;animation:luciCoinBob .9s ease-in-out infinite alternate}
#luci666PrivateCoin.visible{display:grid}
#luci666PrivateCoin:after{content:'6 $666';position:absolute;top:43px;left:50%;transform:translateX(-50%);white-space:nowrap;padding:3px 6px;border-radius:7px;background:rgba(13,16,20,.88);color:#ffe39a;font:1000 7px system-ui;border:1px solid rgba(255,209,102,.3)}
@keyframes luciCoinBob{from{margin-top:0;filter:brightness(1)}to{margin-top:-6px;filter:brightness(1.15)}}
#luci666Beckon{transition:none!important;scale:1!important;text-wrap:balance!important;contain:layout style paint!important}
/* Luci conversation is an in-world HUD, not a modal lock. */
body.luci-666-open #hint,body.luci-666-open #hudSocialRail,body.luci-666-open #chatComposerDock{visibility:visible!important;pointer-events:auto!important}
@media(max-width:600px){
  #luci666Card{bottom:max(160px,calc(env(safe-area-inset-bottom) + 144px))!important;width:calc(100vw - 12px)!important;height:88px!important;min-height:88px!important;max-height:88px!important;grid-template-rows:29px 59px!important;border-radius:12px!important}
  #luci666Card .luci666Header{height:29px!important;min-height:29px!important}
  #luci666Card .luci666Body{height:59px!important;padding:5px!important}
  #luci666Card .luci666Questions{height:49px!important;min-height:49px!important;gap:6px!important}
  #luci666Card .luci666Question{flex-basis:clamp(145px,44vw,190px)!important;height:47px!important;min-height:47px!important;max-height:47px!important;font-size:8.7px!important;padding:6px 9px!important}
  #luci666GiftPrompt{bottom:max(108px,calc(env(safe-area-inset-bottom) + 92px));width:min(330px,calc(100vw - 40px));min-height:40px;font-size:9.5px}
  #luci666WorldSpeech{width:min(310px,82vw);max-width:310px;padding:9px 10px}
  #luci666WorldSpeech .luciWorldText{font-size:10px;line-height:1.38}
  #luci666PrivateCoin{width:38px;height:38px;font-size:14px}
}
`;
    document.head.appendChild(style);
  }

  function ensureWorldUi(){
    installStyles();
    const panel=document.getElementById('luci666Panel');
    const card=document.getElementById('luci666Card');
    if(panel)panel.removeAttribute('aria-modal');
    if(card){card.setAttribute('role','group');card.removeAttribute('aria-modal');}

    if(!document.getElementById('luci666WorldSpeech')){
      const speech=document.createElement('div');
      speech.id='luci666WorldSpeech';
      speech.setAttribute('role','status');
      speech.innerHTML='<div class="luciWorldName">LUCI</div><div class="luciWorldText" id="luci666WorldText"></div><div class="luciWorldActions" id="luci666WorldActions"></div>';
      document.body.appendChild(speech);
    }
    if(!document.getElementById('luci666GiftPrompt')){
      const prompt=document.createElement('button');
      prompt.type='button';
      prompt.id='luci666GiftPrompt';
      prompt.textContent='I’m ready for my welcome gift.';
      prompt.setAttribute('aria-label','Tell Luci you are ready for your welcome gift');
      for(const type of ['pointerdown','pointerup'])prompt.addEventListener(type,event=>event.stopPropagation(),{passive:true});
      prompt.addEventListener('click',event=>{
        event.stopPropagation();
        const source=document.querySelector('#luci666Questions .luci666Question.reward');
        source?.click();
      });
      document.body.appendChild(prompt);
    }
    if(!document.getElementById('luci666PrivateCoin')){
      const coin=document.createElement('button');
      coin.type='button';coin.id='luci666PrivateCoin';coin.setAttribute('aria-label','Pick up Luci’s 6 $666 welcome reward');coin.textContent='6';
      // Mobile game input can swallow a synthetic click after a pointer gesture.
      // Handle the pickup directly on pointer-up as well as click, and stop the
      // event before the canvas/joystick handlers see it.
      for(const type of ['pointerdown','pointerup','click']){
        coin.addEventListener(type,event=>{
          event.preventDefault();event.stopPropagation();
          if(type!=='pointerdown')pickupCoin();
        },{passive:false});
      }
      document.body.appendChild(coin);
    }
    const action=document.getElementById('action');
    if(action&&action.dataset.luciRewardPickup!=='1'){
      action.dataset.luciRewardPickup='1';
      action.addEventListener('click',()=>{
        if(giftState.coin&&!giftState.pickupBusy&&!giftState.pickupAttempted)pickupCoin();
      },true);
    }
  }

  function applyBeckonSizing(){
    const node=document.getElementById('luci666Beckon');if(!node)return false;
    const viewport=Math.max(0,global.innerWidth||document.documentElement.clientWidth||0);
    const width=viewport&&viewport<420?Math.max(210,Math.min(238,viewport-28)):250;
    Object.assign(node.style,{boxSizing:'border-box',width:`${width}px`,minWidth:`${width}px`,maxWidth:`${width}px`,minHeight:'56px',padding:'9px 12px',fontFamily:'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',fontSize:'13px',fontWeight:'900',lineHeight:'1.32',transition:'none',scale:'1',transform:'translate(-50%,-100%)',transformOrigin:'50% 100%'});
    return true;
  }

  function installQuestionBehavior(){
    const host=document.getElementById('luci666Questions');
    if(!host||host.dataset.worldCarouselV5==='1')return !!host;
    host.dataset.worldCarouselV5='1';

    // Stop game-level handlers only after the event reaches the carousel.
    // No preventDefault: native horizontal panning must remain available.
    for(const type of ['pointerdown','pointerup','click']){
      host.addEventListener(type,(event)=>{
        if(event.target?.closest?.('.luci666Question'))event.stopPropagation();
      },{passive:type!=='click'});
    }
    return true;
  }

  function syncGiftPrompt(){
    const prompt=document.getElementById('luci666GiftPrompt');
    const host=document.getElementById('luci666Questions');
    if(!prompt||!host){return;}
    const asked=host.querySelectorAll('.luci666Question.asked:not(.reward)').length;
    const visible=panelOpen()&&asked>=GIFT_QUESTION_THRESHOLD&&!giftSelected();
    prompt.classList.toggle('visible',visible);
  }

  function speechText(message){
    ensureWorldUi();
    const text=document.getElementById('luci666WorldText');
    if(text&&text.textContent!==message)text.textContent=message;
  }
  function clearActions(){const host=document.getElementById('luci666WorldActions');if(host&&host.childNodes.length)host.textContent='';}
  function addAction(label,handler,secondary=false){
    const host=document.getElementById('luci666WorldActions');if(!host)return;
    if([...host.querySelectorAll('button')].some(button=>button.textContent===label))return;
    const button=document.createElement('button');button.type='button';button.className='luciWorldAction'+(secondary?' secondary':'');button.textContent=label;button.addEventListener('click',handler);host.appendChild(button);
  }

  function syncOrdinaryAnswer(){
    if(!panelOpen()||giftSelected())return;
    const message=sourceAnswer();
    if(!message||message===lastOrdinaryAnswer)return;
    lastOrdinaryAnswer=message;clearActions();speechText(message);
  }

  function trustlineModule(){return global.ATMLuci666Trustline||null;}
  function looksLikeMissingWallet(message){return /link and verify xaman|sign in to atm town|wallet.*before|no linked/i.test(String(message||''));}

  function showReceipt(receipt={}){
    giftState.claimed=true;giftState.receipt=receipt;giftState.coin=null;
    document.getElementById('luci666PrivateCoin')?.classList.remove('visible');clearActions();
    const walletType=receipt.walletType||'Xaman';
    const wallet=receipt.wallet||'your linked wallet';
    const amount=receipt.amount||'6',currency=receipt.currency||'$666';
    const tx=receipt.txHash?\` XRPL tx: \${receipt.txHash}\`:'';
    speechText(\`Already claimed — \${amount} \${currency} was sent to your \${walletType} wallet \${wallet}.\${tx}\`);
  }

  async function resolveGiftState(force=false){
    if(!panelOpen()||!giftSelected()||giftState.resolving)return;
    if(giftState.claimed){showReceipt(giftState.receipt||{});return;}
    const now=Date.now();if(!force&&now-giftState.lastCheck<POLL_MS)return;
    giftState.lastCheck=now;giftState.resolving=true;clearActions();
    try{
      loadTrustlineGate();
      let waits=0;while(!trustlineModule()&&waits<25){await new Promise(r=>setTimeout(r,80));waits++;}
      const trust=trustlineModule();
      if(!trust){speechText('Thanks for coming to speak with me. I cannot check your $666 trustline yet — give ATM Town a moment and try again.');return;}
      const has=await trust.check();
      if(has||trust.state?.hasTrustline===true){
        giftState.mode='ready';speechText('Thanks for coming to speak with me. Great — I see your $666 trustline. Here, I have these tokens for you. Pick up the coin I dropped.');spawnCoin();return;
      }
      const status=hiddenStatus();
      if(looksLikeMissingWallet(status)){
        giftState.mode='no-wallet';speechText('Thanks for coming to speak with me. I don’t see a linked Mainnet wallet yet. Once you get one connected, come back and see me — I’ll keep your sixes waiting.');clearActions();return;
      }
      giftState.mode='needs-trustline';
      speechText('Thanks for coming to speak with me. I see you don’t have the $666 trustline yet. Set it up here, approve it in Xaman, and I’ll have your gift ready when XRPL confirms it.');
      addAction('SET UP $666 TRUSTLINE',async()=>{
        speechText('I’m sending the TrustSet request to Xaman. Approve it there, then come back — I’ll watch the ledger for you.');clearActions();
        try{await trust.create();}catch(_error){}giftState.lastCheck=0;
      });
    }finally{giftState.resolving=false;}
  }

  function worldToScreen(x,y){
    try{
      const canvas=document.getElementById('game'),rect=canvas?.getBoundingClientRect();
      if(!rect||!Number.isFinite(x)||!Number.isFinite(y))return null;
      const sx=(x-cam.x)*zoom,sy=(y-cam.y)*zoom;
      return {x:rect.left+(sx/Math.max(1,W))*rect.width,y:rect.top+(sy/Math.max(1,H))*rect.height};
    }catch(_error){return null;}
  }

  function positionSpeech(){
    const speech=document.getElementById('luci666WorldSpeech');if(!speech)return;
    if(!panelOpen()){speech.style.display='none';return;}
    const luci=global.ATMLuci666?.getLuci?.();const point=luci?worldToScreen(luci.x,luci.y-66):null;
    if(!point){speech.style.display='none';return;}
    speech.style.display='block';
    const width=Math.max(180,speech.offsetWidth||220),half=width/2;
    const x=Math.min(Math.max(half+8,global.innerWidth-half-8),Math.max(half+8,point.x));
    const card=document.getElementById('luci666Card')?.getBoundingClientRect();
    const lowerLimit=card?Math.max(90,card.top-12):global.innerHeight-12;
    const y=Math.min(lowerLimit,Math.max(88,point.y));
    speech.style.left=`${x}px`;speech.style.top=`${y}px`;
  }

  function spawnCoin(){
    if(giftState.coin)return;
    const luci=global.ATMLuci666?.getLuci?.();if(!luci)return;
    try{
      const dx=player.x-luci.x,dy=player.y-luci.y,dist=Math.max(1,Math.hypot(dx,dy));
      giftState.coin={x:luci.x+(dx/dist)*42,y:luci.y+(dy/dist)*42,spawnedAt:Date.now()};giftState.pickupAttempted=false;
      document.getElementById('luci666PrivateCoin')?.classList.add('visible');
    }catch(_error){}
  }

  function positionCoin(){
    const coin=document.getElementById('luci666PrivateCoin');
    if(!coin||!giftState.coin){if(coin)coin.classList.remove('visible');return;}
    const point=worldToScreen(giftState.coin.x,giftState.coin.y-8);if(!point){coin.classList.remove('visible');return;}
    coin.classList.add('visible');coin.style.left=`${point.x}px`;coin.style.top=`${point.y}px`;
    // Treat the reward like a real world pickup, not a precision hotspot.
    // Player coordinates are anchored near the sprite's feet while the visual
    // body extends well above them, so 28 world pixels was too strict on mobile.
    try{
      const px=Number(player?.x),py=Number(player?.y);
      if(Number.isFinite(px)&&Number.isFinite(py)){
        const dx=px-giftState.coin.x,dy=py-giftState.coin.y;
        const closeEnough=Math.abs(dx)<=110&&Math.abs(dy)<=125;
        if(closeEnough&&!giftState.pickupBusy)pickupCoin();
      }
    }catch(_error){}
  }

  async function pickupCoin(){
    if(!giftState.coin||giftState.pickupBusy)return;
    giftState.pickupBusy=true;giftState.pickupAttempted=true;speechText('That one’s yours, LightBringer. Picking it up now…');clearActions();
    try{
      if(typeof global.ATMLuci666?.requestReward!=='function')throw new Error('The reward connection is not ready yet.');
      const result=await global.ATMLuci666.requestReward();await new Promise(r=>setTimeout(r,250));
      const status=hiddenStatus();
      const success=result?.ok===true||(/sent and confirmed|validated|confirmed on xrpl|success/i.test(status)&&!/could not|no funded|not configured|pending/i.test(status));
      if(success){
        showReceipt({wallet:result?.wallet,walletType:String(result?.wallet_type||'xaman').toLowerCase()==='atm-pay'?'ATM Pay':'Xaman',txHash:result?.tx_hash,amount:result?.amount||'6',currency:result?.currency||'$666'});
      }
      else{speechText(status||'Your coin is reserved for you, but the $666 payout connection is not ready yet. It will stay here instead of pretending the send happened.');addAction('TRY PICKUP AGAIN',()=>{giftState.pickupAttempted=false;pickupCoin();},true);}
    }catch(error){speechText(error?.message||'I couldn’t finish that pickup yet. Your coin is still yours.');addAction('TRY PICKUP AGAIN',()=>{giftState.pickupAttempted=false;pickupCoin();},true);}
    finally{giftState.pickupBusy=false;}
  }

  function apply(){
    ensureWorldUi();loadTrustlineGate();applyBeckonSizing();installQuestionBehavior();syncGiftPrompt();
    if(panelOpen()){
      // Remove the old modal marker immediately; Luci is now a HUD interaction.
      document.body.classList.remove('luci-666-open');
      if(giftSelected())resolveGiftState();else syncOrdinaryAnswer();
    }
    return true;
  }

  function tick(){
    ensureWorldUi();installQuestionBehavior();syncGiftPrompt();
    if(panelOpen()){
      document.body.classList.remove('luci-666-open');
      positionSpeech();
      if(giftSelected())resolveGiftState();else syncOrdinaryAnswer();
    }else{
      lastOrdinaryAnswer='';
      document.getElementById('luci666WorldSpeech')?.style.setProperty('display','none');
      document.getElementById('luci666GiftPrompt')?.classList.remove('visible');
    }
    positionCoin();global.requestAnimationFrame(tick);
  }

  function install(){
    apply();
    const observer=new MutationObserver(()=>{
      if(installQuestionBehavior())observer.disconnect();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    global.setTimeout(()=>observer.disconnect(),20000);
    global.requestAnimationFrame(tick);
  }

  let resizeTimer=0;
  global.addEventListener('resize',()=>{global.clearTimeout(resizeTimer);resizeTimer=global.setTimeout(apply,120);},{passive:true});

  global.addEventListener('atm:npc-reward-receipt',event=>{
    const detail=event?.detail||{};
    if(detail.ok)showReceipt(detail);
  });
  global.ATMLuci666BeckonUx=Object.freeze({apply,resolveGiftState,spawnCoin,pickupCoin,showReceipt});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})(window);
