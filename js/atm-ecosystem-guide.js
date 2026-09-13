/*
 * ATM Town — ATM / All The Money ecosystem guide NPC
 * Pre-written, zero-AI conversation using the shared in-world NPC standard.
 */
(function initializeAtmEcosystemGuide(global){
  'use strict';

  if(global.ATMAtmGuide)return;

  const TALK_RADIUS=92;
  const AWARENESS_RADIUS=210;
  const AWARENESS_RESET_RADIUS=300;
  const DIALOGUE_LEASH=190;
  const BECKON_MS=6200;
  const BECKON_COOLDOWN_MS=45000;
  const OUTSIDE_RESET_MS=1200;
  const NEXT_THRESHOLD=3;
  const ATM_ISSUER='raDZ4t8WPXkmDfJWMLBcNZmmSHmBC523NZ';

  const state={
    open:false,
    beckonUntil:0,
    nextBeckonAt:0,
    seenInsideAwareness:false,
    outsideAwarenessSince:0,
    beckonLine:'',
    answered:new Set(),
    answerId:'welcome',
    ecosystemShown:false
  };

  const QUESTIONS=Object.freeze([
    {id:'what',label:'What is ATM?',answer:'ATM means All The Money. It started as an XRPL community and token, but the bigger idea is an ecosystem people can actually use — a social world, self-custodial payments, collectibles, and XRPL tools that connect back to the same community.'},
    {id:'motto',label:'What does “You Are All The Money” mean?',answer:'It means the person is more important than the ticker. The community, the builders, the players, the merchants, the collectors — that is where the value begins. “You Are All The Money” is the reminder that the ecosystem is supposed to serve people, not turn people into exit liquidity.'},
    {id:'town',label:'What is ATM Town?',answer:'ATM Town is the playable social side of the ecosystem. You can explore, chat, meet other communities through project characters, play arcade and event modes, collect gear, show NFTs, and use wallet-connected features without leaving the world.'},
    {id:'pay',label:'What is ATM Pay?',answer:'ATM Pay is the payment side: a self-custodial XRPL wallet experience built around simple real-world payments. The goal is to make XRP, RLUSD, ATM, and other supported XRPL assets feel usable without giving custody of the wallet keys to ATM Town.'},
    {id:'machine',label:'What is The Machine?',answer:'The Machine is the visual XRPL execution and automation side of the ecosystem. It is being built to turn multi-step blockchain jobs — distributions, recurring programs, reward logic, and other workflows — into visible, understandable flows instead of hidden scripts.'},
    {id:'token',label:'What is $ATM for?',answer:`$ATM is the XRPL community token at the center of All The Money. Its official issuer is ${ATM_ISSUER}. Inside the wider ecosystem it can be used as a community asset, a payment option where supported, and a bridge between the culture, games, rewards, and tools. It is still a crypto token, so nothing here is a promise of profit.`},
    {id:'xrpl',label:'Why build on the XRP Ledger?',answer:'XRPL gives the ecosystem fast settlement, low transaction costs, native issued assets, a built-in decentralized exchange, NFTs, and mature wallet signing. That makes it a strong fit for payments, rewards, collectibles, and high-volume community tools.'},
    {id:'nfts',label:'What are the ATM NFTs?',answer:'ATM has several collections, including You Are ATM, ATM Elements, Community Genesis, and Eyes on ATM. In ATM Town, supported NFTs are more than a gallery item — ownership can unlock matching characters, attributes, cosmetics, and other in-game identity.'},
    {id:'custody',label:'Who controls my wallet?',answer:'You should. ATM Pay is being designed around self-custody: wallet signing and wallet-protection credentials are separate from ordinary game login, and private signing material should never be exposed to the browser as a server secret or treated like a custodial game balance.'},
    {id:'community',label:'What is ATM trying to build?',answer:'One connected place where culture becomes useful. Play in ATM Town. Pay with ATM Pay. Build or automate XRPL workflows with The Machine. Carry the same identity and community across those experiences instead of starting from zero in every app.'},
    {id:'future',label:'Where is the ecosystem going next?',answer:'Deeper shared identity, more project characters, stronger wallet and merchant flows, more useful NFT ownership, richer multiplayer events, and more ways for communities to plug into ATM Town without every feature becoming a separate app. The direction is integration, not clutter.'},
    {id:'price',label:'Will $ATM go up?',answer:'Nobody can promise that. $ATM can move up or down like any crypto asset. The part ATM can control is whether the ecosystem keeps building useful things around the community. Treat the token as high risk and verify the official issuer before interacting with it.'}
  ]);

  let profile=null;

  function registerProfile(){
    const standard=global.ATMNpcDialogueStandard;
    if(!standard)return null;
    profile=standard.get('atm-ecosystem')||standard.register({
      id:'atm-ecosystem',
      name:'ATM · All The Money',
      rewardUnlockQuestions:NEXT_THRESHOLD,
      reward:false,
      theme:{
        accent:'#58f1e6',
        accentSoft:'rgba(88,241,230,.52)',
        accentText:'#eaffff',
        panel:'rgba(5,18,26,.94)',
        headerA:'rgba(8,61,73,.98)',
        headerB:'rgba(63,15,58,.96)',
        question:'rgba(12,36,48,.97)',
        answered:'#ffd166',
        rewardA:'rgba(24,156,163,.98)',
        rewardB:'rgba(190,41,122,.98)',
        rewardText:'#ffffff',
        speech:'rgba(5,26,35,.96)',
        speechText:'#efffff'
      }
    });
    return profile;
  }

  function getAtmNpc(){
    try{
      if(!Array.isArray(townBots))return null;
      const bots=townBots.filter(Boolean);
      const exact=bots.find(bot=>{
        const id=String(bot.id||'').toLowerCase();
        return id==='bot-atm'||id==='atm-bot'||id==='bot-classic'||id==='atm';
      });
      if(exact)return exact;
      const named=bots.find(bot=>{
        const name=String(bot.name||bot.label||'').trim().toLowerCase();
        return name==='atm bot'||name==='atm'||name.startsWith('atm bot ');
      });
      if(named)return named;
      return bots.find(bot=>{
        const id=String(bot.id||'').toLowerCase();
        const key=String(bot.charKey||bot.character||bot.key||'').toLowerCase();
        const name=String(bot.name||'').toLowerCase();
        return key==='classic'&&/atm/.test(name||id)&&!/(luci|miracle|fuzzy)/.test(name+id);
      })||null;
    }catch(_error){return null;}
  }

  function inTown(){try{return currentMap==='town';}catch(_error){return false;}}
  function distanceToAtm(){const npc=getAtmNpc();if(!npc||!inTown())return Infinity;try{return Math.hypot(player.x-npc.x,player.y-npc.y);}catch(_error){return Infinity;}}

  function facePlayer(npc){
    if(!npc)return;
    try{
      const dx=player.x-npc.x,dy=player.y-npc.y;
      npc.dir=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
      npc.moving=false;npc.animTimer=0;npc.frame=1;
    }catch(_error){}
  }

  function ensureUi(){
    if(document.getElementById('atmGuidePanel'))return;
    registerProfile();
    const style=document.createElement('style');
    style.dataset.atmGuide='1';
    style.textContent=`
#atmGuideBeckon{position:fixed;z-index:210;display:none;box-sizing:border-box;width:250px;min-width:250px;max-width:250px;min-height:56px;padding:9px 12px;border:1px solid var(--atm-npc-accent-soft,rgba(88,241,230,.52));border-radius:13px;background:rgba(5,26,35,.96);color:#efffff;font:900 13px/1.32 system-ui;text-align:center;pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 22px rgba(88,241,230,.12);transform:translate(-50%,-100%);transition:none;contain:layout style paint}
#atmGuideBeckon::after{content:'';position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);border:8px solid transparent;border-top-color:var(--atm-npc-accent-soft,rgba(88,241,230,.52));border-bottom:0}
#atmGuidePanel{position:fixed;inset:0;z-index:9750;display:none;background:transparent;pointer-events:none}#atmGuidePanel.open{display:block}
#atmGuideCard{position:fixed;left:50%;bottom:max(102px,calc(env(safe-area-inset-bottom) + 86px));transform:translateX(-50%);width:min(760px,calc(100vw - 18px));height:94px;display:grid;grid-template-rows:31px 63px;overflow:hidden;border:1px solid var(--atm-npc-accent-soft,rgba(88,241,230,.52));border-radius:14px;background:var(--atm-npc-panel,rgba(5,18,26,.94));backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 13px 38px rgba(0,0,0,.5),0 0 24px rgba(255,79,163,.08);pointer-events:auto;z-index:9780}
.atmGuideHeader{height:31px;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:3px 6px 3px 8px;border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(90deg,var(--atm-npc-header-a),var(--atm-npc-header-b))}.atmGuideIdentity{display:flex;align-items:center;gap:6px;min-width:0}.atmGuideAvatar{width:24px;height:26px;object-fit:contain;image-rendering:pixelated}.atmGuideHeader h2{margin:0;color:#fff;font:1000 10px/1 system-ui;white-space:nowrap}.atmGuideClose{width:25px;height:25px;flex:0 0 25px;border:1px solid rgba(255,255,255,.16);border-radius:7px;background:rgba(255,255,255,.08);color:#fff;font-size:16px;font-weight:1000;line-height:1;touch-action:manipulation}
.atmGuideBody{height:63px;overflow:hidden;padding:6px}.atmGuideQuestions{box-sizing:border-box;width:100%;height:51px;display:flex;flex-flow:row nowrap;align-items:stretch;gap:7px;overflow-x:auto;overflow-y:hidden;padding:0 3px 2px;pointer-events:auto;touch-action:pan-x;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;scrollbar-width:none}.atmGuideQuestions::-webkit-scrollbar{display:none}.atmGuideQuestion{box-sizing:border-box;flex:0 0 clamp(152px,36vw,210px);height:49px;display:flex;align-items:center;justify-content:flex-start;padding:7px 10px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:var(--atm-npc-question,rgba(12,36,48,.97));color:#eefaff;font:900 9px/1.18 system-ui;text-align:left;scroll-snap-align:start;pointer-events:auto;touch-action:pan-x;-webkit-user-select:none;user-select:none}.atmGuideQuestion.asked{border-color:var(--atm-npc-accent-soft);color:var(--atm-npc-answered,#ffd166)}
#atmGuideNextPrompt{position:fixed;left:50%;bottom:max(54px,calc(env(safe-area-inset-bottom) + 38px));transform:translateX(-50%);z-index:9785;display:none;align-items:center;justify-content:center;width:min(390px,calc(100vw - 28px));min-height:42px;padding:8px 14px;border:1px solid var(--atm-npc-accent-soft);border-radius:12px;background:linear-gradient(90deg,var(--atm-npc-reward-a),var(--atm-npc-reward-b));box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 18px rgba(255,79,163,.12);color:var(--atm-npc-reward-text,#fff);font:1000 10px/1.15 system-ui;text-align:center;pointer-events:auto;touch-action:manipulation}.visible#atmGuideNextPrompt{display:flex}
#atmGuideWorldSpeech{position:fixed;z-index:9790;display:none;width:min(300px,76vw);max-width:300px;padding:10px 11px 9px;border:1px solid var(--atm-npc-accent-soft);border-radius:14px;background:var(--atm-npc-speech,rgba(5,26,35,.96));color:var(--atm-npc-speech-text,#efffff);box-shadow:0 14px 38px rgba(0,0,0,.5),0 0 24px rgba(88,241,230,.1);transform:translate(-50%,-100%);transform-origin:50% 100%;pointer-events:auto}#atmGuideWorldSpeech:after{content:'';position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);border:8px solid transparent;border-top-color:var(--atm-npc-accent-soft);border-bottom:0}.atmGuideWorldName{color:var(--atm-npc-accent,#58f1e6);font:1000 8px/1 system-ui;letter-spacing:.12em;margin-bottom:5px}.atmGuideWorldText{font:800 11px/1.4 system-ui;color:var(--atm-npc-speech-text,#efffff)}
@media(max-width:600px){#atmGuideBeckon{width:min(238px,calc(100vw - 28px));min-width:min(238px,calc(100vw - 28px));max-width:min(238px,calc(100vw - 28px))}#atmGuideCard{bottom:max(160px,calc(env(safe-area-inset-bottom) + 144px));width:calc(100vw - 12px);height:88px;grid-template-rows:29px 59px;border-radius:12px}.atmGuideHeader{height:29px}.atmGuideBody{height:59px;padding:5px}.atmGuideQuestions{height:49px;gap:6px}.atmGuideQuestion{flex-basis:clamp(145px,44vw,190px);height:47px;font-size:8.7px;padding:6px 9px}#atmGuideNextPrompt{bottom:max(108px,calc(env(safe-area-inset-bottom) + 92px));width:min(330px,calc(100vw - 40px));min-height:40px;font-size:9.5px}#atmGuideWorldSpeech{width:min(310px,82vw);max-width:310px;padding:9px 10px}.atmGuideWorldText{font-size:10px;line-height:1.38}}
`;
    document.head.appendChild(style);

    const panel=document.createElement('div');
    panel.id='atmGuidePanel';panel.setAttribute('aria-hidden','true');
    panel.innerHTML=`<div id="atmGuideCard" role="group"><header class="atmGuideHeader"><div class="atmGuideIdentity"><img class="atmGuideAvatar" src="assets/characters/thumbnails/character-atm.webp" alt="ATM"><h2>ATM · ALL THE MONEY</h2></div><button class="atmGuideClose" id="atmGuideClose" type="button" aria-label="Close ATM conversation">×</button></header><main class="atmGuideBody"><div class="atmGuideQuestions" id="atmGuideQuestions"></div></main></div>`;
    document.body.appendChild(panel);

    const speech=document.createElement('div');
    speech.id='atmGuideWorldSpeech';speech.setAttribute('role','status');
    speech.innerHTML='<div class="atmGuideWorldName">ATM</div><div class="atmGuideWorldText" id="atmGuideWorldText"></div>';
    document.body.appendChild(speech);

    const prompt=document.createElement('button');
    prompt.type='button';prompt.id='atmGuideNextPrompt';prompt.textContent='SHOW ME THE ATM ECOSYSTEM';
    prompt.addEventListener('click',showEcosystem);
    document.body.appendChild(prompt);

    const beckon=document.createElement('div');beckon.id='atmGuideBeckon';beckon.setAttribute('aria-hidden','true');document.body.appendChild(beckon);

    document.getElementById('atmGuideClose')?.addEventListener('click',closeDialogue);
    const host=document.getElementById('atmGuideQuestions');
    for(const type of ['pointerdown','pointerup','click'])host?.addEventListener(type,event=>{if(event.target?.closest?.('.atmGuideQuestion'))event.stopPropagation();},{passive:type!=='click'});

    const standard=global.ATMNpcDialogueStandard;
    if(standard&&profile){
      for(const node of [panel,document.getElementById('atmGuideCard'),speech,prompt,beckon])standard.applyTheme(node,profile);
    }
    renderQuestions();showAnswer('welcome');
  }

  function showAnswer(id){
    ensureUi();state.answerId=id;
    const text=document.getElementById('atmGuideWorldText');
    if(id==='welcome'){
      if(text)text.textContent='Welcome to ATM Town. Around here, ATM means All The Money — but the idea is bigger than a ticker. You are all the money. Pick a question and I’ll show you how the town, the wallet, the collectibles, and the XRPL tools fit together.';
    }else{
      const item=QUESTIONS.find(q=>q.id===id);
      if(item){state.answered.add(id);if(text)text.textContent=item.answer;}
    }
    renderQuestions();syncNextPrompt();
  }

  function renderQuestions(){
    const host=document.getElementById('atmGuideQuestions');if(!host)return;host.textContent='';
    const initial=['what','motto','town','pay','machine'];
    const followups=['token','xrpl','nfts','custody','community','future','price'];
    const visible=state.answered.size?initial.concat(followups):initial;
    for(const id of visible){
      const q=QUESTIONS.find(item=>item.id===id);if(!q)continue;
      const button=document.createElement('button');button.type='button';button.className='atmGuideQuestion'+(state.answered.has(id)?' asked':'');button.dataset.npcQuestion=id;button.textContent=q.label;button.addEventListener('click',()=>showAnswer(id));host.appendChild(button);
    }
  }

  function syncNextPrompt(){
    const prompt=document.getElementById('atmGuideNextPrompt');if(!prompt)return;
    prompt.classList.toggle('visible',state.open&&state.answered.size>=NEXT_THRESHOLD&&!state.ecosystemShown);
  }

  function showEcosystem(){
    state.ecosystemShown=true;
    const text=document.getElementById('atmGuideWorldText');
    if(text)text.textContent='Start with the town you’re standing in. Explore, meet the project characters, play, collect, and make the place yours. ATM Pay is the self-custodial payment door. The Machine is the XRPL execution door. The NFTs carry identity and ownership. Different doors — same ecosystem. You are all the money.';
    syncNextPrompt();
  }

  function openDialogue(){
    if(!inTown()||distanceToAtm()>TALK_RADIUS+18)return false;
    ensureUi();state.open=true;state.beckonUntil=0;state.ecosystemShown=false;
    const panel=document.getElementById('atmGuidePanel');if(panel){panel.classList.add('open');panel.setAttribute('aria-hidden','false');}
    const beckon=document.getElementById('atmGuideBeckon');if(beckon)beckon.style.display='none';
    facePlayer(getAtmNpc());showAnswer(state.answerId||'welcome');syncNextPrompt();return true;
  }

  function closeDialogue(){
    state.open=false;const panel=document.getElementById('atmGuidePanel');if(panel){panel.classList.remove('open');panel.setAttribute('aria-hidden','true');}
    document.getElementById('atmGuideWorldSpeech')?.style.setProperty('display','none');
    document.getElementById('atmGuideNextPrompt')?.classList.remove('visible');
  }

  function worldToScreen(x,y){
    try{
      const canvas=document.getElementById('game'),rect=canvas?.getBoundingClientRect();
      if(!rect||!Number.isFinite(x)||!Number.isFinite(y))return null;
      const sx=(x-cam.x)*zoom,sy=(y-cam.y)*zoom;
      return{x:rect.left+(sx/Math.max(1,W))*rect.width,y:rect.top+(sy/Math.max(1,H))*rect.height};
    }catch(_error){return null;}
  }

  function positionSpeech(){
    const speech=document.getElementById('atmGuideWorldSpeech');if(!speech)return;
    if(!state.open){speech.style.display='none';return;}
    const npc=getAtmNpc(),point=npc?worldToScreen(npc.x,npc.y-66):null;
    if(!point){speech.style.display='none';return;}
    speech.style.display='block';
    const width=Math.max(180,speech.offsetWidth||220),half=width/2;
    const x=Math.min(Math.max(half+8,global.innerWidth-half-8),Math.max(half+8,point.x));
    const card=document.getElementById('atmGuideCard')?.getBoundingClientRect();
    const lowerLimit=card?Math.max(90,card.top-12):global.innerHeight-12;
    const y=Math.min(lowerLimit,Math.max(88,point.y));
    speech.style.left=`${x}px`;speech.style.top=`${y}px`;
  }

  function triggerBeckon(now){
    if(state.beckonUntil>now)return;
    const lines=['Hey — welcome to ATM Town. Want the tour?','You are all the money. Want to know what that means?','Town, payments, NFTs, XRPL tools — come ask me how it fits together.','New around here? I can show you the ATM ecosystem.'];
    state.beckonLine=lines[Math.floor(Math.random()*lines.length)];
    state.beckonUntil=now+BECKON_MS;state.nextBeckonAt=now+BECKON_COOLDOWN_MS;
    const node=document.getElementById('atmGuideBeckon');if(node){node.textContent=state.beckonLine;node.style.display='block';}
  }

  function placeBeckon(){
    const node=document.getElementById('atmGuideBeckon'),npc=getAtmNpc();if(!node||!npc||!inTown())return;
    const point=worldToScreen(npc.x,npc.y-64);if(!point)return;
    node.style.left=`${point.x}px`;node.style.top=`${point.y}px`;if(node.textContent!==state.beckonLine)node.textContent=state.beckonLine;
  }

  function tick(){
    ensureUi();const now=Date.now(),distance=distanceToAtm(),npc=getAtmNpc();
    if(state.open){
      state.outsideAwarenessSince=0;
      if(!inTown()||distance>DIALOGUE_LEASH)closeDialogue();else facePlayer(npc);
    }else if(inTown()&&distance<=AWARENESS_RADIUS){
      state.outsideAwarenessSince=0;
      if(!state.seenInsideAwareness&&now>=state.nextBeckonAt)triggerBeckon(now);
      state.seenInsideAwareness=true;
    }else if(!inTown()||distance>AWARENESS_RESET_RADIUS){
      if(!state.outsideAwarenessSince)state.outsideAwarenessSince=now;
      if(now-state.outsideAwarenessSince>=OUTSIDE_RESET_MS){state.seenInsideAwareness=false;state.outsideAwarenessSince=0;}
    }
    if(now<state.beckonUntil&&!state.open&&inTown()){facePlayer(npc);placeBeckon();}
    else{const node=document.getElementById('atmGuideBeckon');if(node)node.style.display='none';}
    if(state.open){positionSpeech();syncNextPrompt();}
    requestAnimationFrame(tick);
  }

  try{
    const originalNearestThing=nearestThing;
    nearestThing=function(){if(inTown()&&distanceToAtm()<=TALK_RADIUS)return{id:'atm-ecosystem-guide',type:'npc',name:'ATM · ALL THE MONEY',text:'Talk with ATM about the All The Money ecosystem.',radius:TALK_RADIUS};return originalNearestThing();};
  }catch(error){console.warn('ATM guide could not hook nearestThing.',error);}

  try{
    const originalInteract=interact;
    interact=function(){if(inTown()&&distanceToAtm()<=TALK_RADIUS&&!state.open){openDialogue();return;}return originalInteract();};
  }catch(error){console.warn('ATM guide could not hook interact.',error);}

  try{
    const originalUpdateTownBots=updateTownBots;
    updateTownBots=function(dt){
      const npc=getAtmNpc(),now=Date.now(),locked=!!npc&&(state.open||now<state.beckonUntil);
      if(locked)npc.wait=Math.max(Number(npc.wait)||0,Math.max(.18,Number(dt)||0)+.12);
      originalUpdateTownBots(dt);
      if(locked){npc.wait=Math.max(Number(npc.wait)||0,.12);facePlayer(npc);}
    };
  }catch(error){console.warn('ATM guide could not hook town bot movement.',error);}

  global.ATMAtmGuide=Object.freeze({open:openDialogue,close:closeDialogue,getAtm:getAtmNpc,distance:distanceToAtm,issuer:ATM_ISSUER,questions:QUESTIONS});
  ensureUi();requestAnimationFrame(tick);
})(window);
