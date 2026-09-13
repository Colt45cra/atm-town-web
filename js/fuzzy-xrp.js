/*
 * ATM Town — Fuzzybear / $FUZZY project NPC
 * Lore-first, pre-written, zero-AI interaction using the shared NPC standard.
 */
(function initializeFuzzyXrp(global){
  'use strict';

  if(global.ATMFuzzyXrp)return;

  const TALK_RADIUS=92;
  const AWARENESS_RADIUS=210;
  const AWARENESS_RESET_RADIUS=300;
  const DIALOGUE_LEASH=190;
  const BECKON_MS=6200;
  const BECKON_COOLDOWN_MS=45000;
  const OUTSIDE_RESET_MS=1200;
  const DEN_THRESHOLD=3;
  const ISSUER='rhCAT4hRdi2Y9puNdkpMzxrdKa5wkppR62';

  const DOORS=Object.freeze({
    site:'https://fuzzyxrp.com',
    x:'https://x.com/fuzzy_xrp'
  });

  const state={
    open:false,
    beckonUntil:0,
    nextBeckonAt:0,
    seenInsideAwareness:false,
    outsideAwarenessSince:0,
    beckonLine:'',
    answered:new Set(),
    answerId:'welcome',
    denShown:false
  };

  const QUESTIONS=Object.freeze([
    {id:'origin',label:'Who is Fuzzybear?',answer:'I am a commemoration of an old XRPL legend. On 1 January 2014 at 13:28:30 UTC, the original Fuzzybear account placed a DEX order offering 1 XRP for 1 BTC. That tiny ticket became our seed: someone believed XRP could be the better rail before most people knew where the order book was.'},
    {id:'oneforone',label:'What does “1 XRP for 1 BTC” mean?',answer:'It was Fuzzybear’s old order, not a promise that your wallet gets one Bitcoin for one XRP today. We carry the conviction, not a guaranteed fill. One-for-one is the lore: stubborn belief that XRP was built to be faster, cheaper, and greener than the thing on the other side of that order.'},
    {id:'supply',label:'Why 321 billion $FUZZY?',answer:'The supply is 321 billion as a nod to the XRP Ledger’s own genesis timing: 1 January 2013 at 03:21:10 UTC. Three-two-one is the clock stamped into the cap. Dates matter in the den because the whole project is built around remembering where the ledger came from.'},
    {id:'design',label:'How is $FUZZY designed?',answer:`The project states a 321B supply, zero tax, 100% burned LP, and a blackholed issuer. The issuer commonly given by the project is ${ISSUER}. Other FUZZY tickers exist, so verify that exact issuer before setting a trustline or swapping.`},
    {id:'why',label:'Why make a token for the story?',answer:'Because a legend on a ledger should be something you can hold, not only something you can screenshot. $FUZZY is the stuffed animal and the history plaque at the same time: the ticker keeps the memory liquid, and the bear keeps the memory lovable.'},
    {id:'xrpl',label:'Why does Fuzzy live on XRPL?',answer:'Because the lesson is easier when you can touch the rails. Trustline, swap, DEX, AMM — learn by doing. XRPL gives the bear fast settlement, low fees, native issued assets and on-ledger liquidity. The point is not to lecture newcomers. It is to leave the den door open.'},
    {id:'pool',label:'What is the burned LP about?',answer:'The project presents the liquidity design as simple and patient: 100% burned LP, zero tax, and a pool meant to feel sturdy rather than fragile. Community lore also says NFT royalties return to the pool. Think of liquidity as part of the lesson — show the AMM working instead of hiding it behind jargon.'},
    {id:'pfps',label:'What are the Fuzzy NFTs / PFPs?',answer:'The bear became a badge. The community talks about a limited PFP collection with a hard cap around 4,440, worn across Spaces and timelines as a sign that you live on the ledger. Seeing the face is meant to feel like finding another person from the den.'},
    {id:'onboarding',label:'How does Fuzzy onboard people?',answer:'Softly. Get a wallet. Learn what a trustline is. Make a small swap. See a DEX and an AMM without needing to finish a forty-post technical thread first. The project’s strength is making XRPL culture feel friendly enough that people are willing to take the first step.'},
    {id:'dates',label:'Why do dates like 1/1 and 1/23 matter?',answer:'Dates are winks in Fuzzy culture. The original order was on 1/1/2014, the ledger itself has its own 1/1 genesis story, and the community enjoys the old riddle-and-timing energy around XRP. They are clues and culture — not homework, and never a promise about price.'},
    {id:'utility',label:'Is $FUZZY a utility protocol?',answer:'Not in the usual enterprise sense. We are a commemoration and a community. The utility is the culture, the pool, and the door we hold open onto XRPL. Hold the coin, wear the bear, learn the rails, and you are in the den.'},
    {id:'price',label:'Will $FUZZY go up?',answer:'Nobody knows. $FUZZY is a crypto token and can move sharply in either direction. Fuzzy does not make price promises. The part we can point to is the story, the community, the XRPL rails, and the official issuer you should verify before interacting.'}
  ]);

  let profile=null;

  function registerProfile(){
    const standard=global.ATMNpcDialogueStandard;
    if(!standard)return null;
    profile=standard.get('fuzzy-xrp')||standard.register({
      id:'fuzzy-xrp',
      name:'Fuzzy · $FUZZY',
      rewardUnlockQuestions:DEN_THRESHOLD,
      reward:false,
      theme:{
        accent:'#d88943',
        accentSoft:'rgba(216,137,67,.55)',
        accentText:'#fff1cf',
        panel:'rgba(22,17,13,.94)',
        headerA:'rgba(94,53,24,.98)',
        headerB:'rgba(12,45,47,.97)',
        question:'rgba(25,42,43,.97)',
        answered:'#f3c36e',
        rewardA:'rgba(133,78,35,.98)',
        rewardB:'rgba(22,103,103,.98)',
        rewardText:'#fff6df',
        speech:'rgba(38,24,15,.96)',
        speechText:'#fff7e9'
      }
    });
    return profile;
  }

  function getFuzzy(){
    try{
      if(!Array.isArray(townBots))return null;
      const bots=townBots.filter(Boolean);
      const exact=bots.find(bot=>{
        const id=String(bot.id||'').toLowerCase();
        return id==='bot-fuzzy'||id==='fuzzy-bot'||id==='fuzzy';
      });
      if(exact)return exact;
      const named=bots.find(bot=>String(bot.name||bot.label||'').toLowerCase().includes('fuzzy'));
      if(named)return named;
      return bots.find(bot=>{
        const key=String(bot.charKey||bot.character||bot.key||'').toLowerCase();
        const id=String(bot.id||'').toLowerCase();
        return key==='fuzzy'||id.includes('fuzzy');
      })||null;
    }catch(_error){return null;}
  }

  function inTown(){try{return currentMap==='town';}catch(_error){return false;}}
  function distanceToFuzzy(){const npc=getFuzzy();if(!npc||!inTown())return Infinity;try{return Math.hypot(player.x-npc.x,player.y-npc.y);}catch(_error){return Infinity;}}

  function facePlayer(npc){
    if(!npc)return;
    try{
      const dx=player.x-npc.x,dy=player.y-npc.y;
      npc.dir=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
      npc.moving=false;npc.animTimer=0;npc.frame=1;
    }catch(_error){}
  }

  function openExternal(url){try{global.open(url,'_blank','noopener,noreferrer');}catch(_error){}}

  function ensureUi(){
    if(document.getElementById('fuzzyXrpPanel'))return;
    registerProfile();

    const style=document.createElement('style');
    style.dataset.fuzzyXrp='1';
    style.textContent=`
#fuzzyXrpBeckon{position:fixed;z-index:210;display:none;box-sizing:border-box;width:250px;min-width:250px;max-width:250px;min-height:56px;padding:9px 12px;border:1px solid var(--atm-npc-accent-soft,rgba(216,137,67,.55));border-radius:13px;background:rgba(38,24,15,.96);color:#fff7e9;font:900 13px/1.32 system-ui;text-align:center;pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 22px rgba(216,137,67,.13);transform:translate(-50%,-100%);transition:none;contain:layout style paint}
#fuzzyXrpBeckon::after{content:'';position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);border:8px solid transparent;border-top-color:var(--atm-npc-accent-soft,rgba(216,137,67,.55));border-bottom:0}
#fuzzyXrpPanel{position:fixed;inset:0;z-index:9750;display:none;background:transparent;pointer-events:none}#fuzzyXrpPanel.open{display:block}
#fuzzyXrpCard{position:fixed;left:50%;bottom:max(102px,calc(env(safe-area-inset-bottom) + 86px));transform:translateX(-50%);width:min(760px,calc(100vw - 18px));height:94px;display:grid;grid-template-rows:31px 63px;overflow:hidden;border:1px solid var(--atm-npc-accent-soft);border-radius:14px;background:var(--atm-npc-panel);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 13px 38px rgba(0,0,0,.5),0 0 24px rgba(216,137,67,.09);pointer-events:auto;z-index:9780}
.fuzzyXrpHeader{height:31px;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:3px 6px 3px 8px;border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(90deg,var(--atm-npc-header-a),var(--atm-npc-header-b))}.fuzzyXrpIdentity{display:flex;align-items:center;gap:6px;min-width:0}.fuzzyXrpAvatar{width:24px;height:26px;object-fit:contain;image-rendering:pixelated}.fuzzyXrpHeader h2{margin:0;color:#fff;font:1000 10px/1 system-ui;white-space:nowrap}.fuzzyXrpClose{width:25px;height:25px;flex:0 0 25px;border:1px solid rgba(255,255,255,.16);border-radius:7px;background:rgba(255,255,255,.08);color:#fff;font-size:16px;font-weight:1000;line-height:1;touch-action:manipulation}
.fuzzyXrpBody{height:63px;overflow:hidden;padding:6px}.fuzzyXrpQuestions{box-sizing:border-box;width:100%;height:51px;display:flex;flex-flow:row nowrap;align-items:stretch;gap:7px;overflow-x:auto;overflow-y:hidden;padding:0 3px 2px;pointer-events:auto;touch-action:pan-x;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;scrollbar-width:none}.fuzzyXrpQuestions::-webkit-scrollbar{display:none}.fuzzyXrpQuestion{box-sizing:border-box;flex:0 0 clamp(152px,36vw,210px);height:49px;display:flex;align-items:center;justify-content:flex-start;padding:7px 10px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:var(--atm-npc-question);color:#eefaff;font:900 9px/1.18 system-ui;text-align:left;scroll-snap-align:start;pointer-events:auto;touch-action:pan-x;-webkit-user-select:none;user-select:none}.fuzzyXrpQuestion.asked{border-color:var(--atm-npc-accent-soft);color:var(--atm-npc-answered)}
#fuzzyXrpDenPrompt{position:fixed;left:50%;bottom:max(54px,calc(env(safe-area-inset-bottom) + 38px));transform:translateX(-50%);z-index:9785;display:none;align-items:center;justify-content:center;width:min(390px,calc(100vw - 28px));min-height:42px;padding:8px 14px;border:1px solid var(--atm-npc-accent-soft);border-radius:12px;background:linear-gradient(90deg,var(--atm-npc-reward-a),var(--atm-npc-reward-b));box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 18px rgba(216,137,67,.12);color:var(--atm-npc-reward-text);font:1000 10px/1.15 system-ui;text-align:center;pointer-events:auto;touch-action:manipulation}.visible#fuzzyXrpDenPrompt{display:flex}
#fuzzyXrpWorldSpeech{position:fixed;z-index:9790;display:none;width:min(300px,76vw);max-width:300px;padding:10px 11px 9px;border:1px solid var(--atm-npc-accent-soft);border-radius:14px;background:var(--atm-npc-speech);color:var(--atm-npc-speech-text);box-shadow:0 14px 38px rgba(0,0,0,.5),0 0 24px rgba(216,137,67,.11);transform:translate(-50%,-100%);transform-origin:50% 100%;pointer-events:auto}#fuzzyXrpWorldSpeech:after{content:'';position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);border:8px solid transparent;border-top-color:var(--atm-npc-accent-soft);border-bottom:0}.fuzzyXrpWorldName{color:var(--atm-npc-accent);font:1000 8px/1 system-ui;letter-spacing:.12em;margin-bottom:5px}.fuzzyXrpWorldText{font:800 11px/1.4 system-ui;color:var(--atm-npc-speech-text)}.fuzzyXrpWorldActions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.fuzzyXrpWorldAction{min-height:34px;padding:0 9px;border:1px solid var(--atm-npc-accent-soft);border-radius:9px;background:linear-gradient(90deg,rgba(120,70,34,.96),rgba(23,86,86,.96));color:#fff4d6;font:1000 8px system-ui;touch-action:manipulation}
@media(max-width:600px){#fuzzyXrpBeckon{width:min(238px,calc(100vw - 28px));min-width:min(238px,calc(100vw - 28px));max-width:min(238px,calc(100vw - 28px))}#fuzzyXrpCard{bottom:max(160px,calc(env(safe-area-inset-bottom) + 144px));width:calc(100vw - 12px);height:88px;grid-template-rows:29px 59px;border-radius:12px}.fuzzyXrpHeader{height:29px}.fuzzyXrpBody{height:59px;padding:5px}.fuzzyXrpQuestions{height:49px;gap:6px}.fuzzyXrpQuestion{flex-basis:clamp(145px,44vw,190px);height:47px;font-size:8.7px;padding:6px 9px}#fuzzyXrpDenPrompt{bottom:max(108px,calc(env(safe-area-inset-bottom) + 92px));width:min(330px,calc(100vw - 40px));min-height:40px;font-size:9.5px}#fuzzyXrpWorldSpeech{width:min(310px,82vw);max-width:310px;padding:9px 10px}.fuzzyXrpWorldText{font-size:10px;line-height:1.38}}
`;
    document.head.appendChild(style);

    const panel=document.createElement('div');panel.id='fuzzyXrpPanel';panel.setAttribute('aria-hidden','true');
    panel.innerHTML=`<div id="fuzzyXrpCard" role="group"><header class="fuzzyXrpHeader"><div class="fuzzyXrpIdentity"><img class="fuzzyXrpAvatar" src="assets/characters/thumbnails/character-fuzzy.webp" alt="Fuzzy"><h2>FUZZY · $FUZZY</h2></div><button class="fuzzyXrpClose" id="fuzzyXrpClose" type="button" aria-label="Close Fuzzy conversation">×</button></header><main class="fuzzyXrpBody"><div class="fuzzyXrpQuestions" id="fuzzyXrpQuestions"></div></main></div>`;
    document.body.appendChild(panel);

    const speech=document.createElement('div');speech.id='fuzzyXrpWorldSpeech';speech.innerHTML=`<div class="fuzzyXrpWorldName">FUZZY</div><div class="fuzzyXrpWorldText" id="fuzzyXrpWorldText"></div><div class="fuzzyXrpWorldActions" id="fuzzyXrpWorldActions"></div>`;document.body.appendChild(speech);
    const beckon=document.createElement('div');beckon.id='fuzzyXrpBeckon';document.body.appendChild(beckon);
    const den=document.createElement('button');den.id='fuzzyXrpDenPrompt';den.type='button';den.textContent='SHOW ME THE DEN';document.body.appendChild(den);

    const profileNow=registerProfile();
    for(const node of [panel,speech,beckon,den])global.ATMNpcDialogueStandard?.applyTheme(node,profileNow);
    document.getElementById('fuzzyXrpClose')?.addEventListener('click',closeDialogue);
    den.addEventListener('click',showDen);
    renderQuestions();showAnswer('welcome');
  }

  function answerText(id){
    if(id==='welcome')return 'Hey. I’m Fuzzy. Not a random bear — a thank-you note. In 2014 a wallet called Fuzzybear offered one XRP for one Bitcoin on this very ledger. We’re what happened when the community decided that conviction deserved a face.';
    if(id==='den')return 'Get $FUZZY on the XRPL. Wear a bear if you find one. Learn the ledger the soft way — trustline, swap, pool — and remember someone believed in this chain when the order book was still empty. One for one was the old order. All of us together is the new one. Come sit. It’s fuzzy in here.';
    return QUESTIONS.find(q=>q.id===id)?.answer||'';
  }

  function showAnswer(id){
    ensureUi();state.answerId=id;
    if(id!=='welcome'&&id!=='den')state.answered.add(id);
    const text=document.getElementById('fuzzyXrpWorldText');if(text)text.textContent=answerText(id);
    const actions=document.getElementById('fuzzyXrpWorldActions');
    if(actions){
      actions.textContent='';
      if(id==='den'){
        const site=document.createElement('button');site.className='fuzzyXrpWorldAction';site.type='button';site.textContent='FUZZYXRP.COM';site.addEventListener('click',()=>openExternal(DOORS.site));actions.appendChild(site);
        const x=document.createElement('button');x.className='fuzzyXrpWorldAction';x.type='button';x.textContent='@FUZZY_XRP';x.addEventListener('click',()=>openExternal(DOORS.x));actions.appendChild(x);
      }
    }
    renderQuestions();syncDenPrompt();
  }

  function renderQuestions(){
    const host=document.getElementById('fuzzyXrpQuestions');if(!host)return;host.textContent='';
    const initial=['origin','oneforone','supply','design','why'];
    const followups=['xrpl','pool','pfps','onboarding','dates','utility','price'];
    const visible=state.answered.size?initial.concat(followups):initial;
    for(const id of visible){
      const q=QUESTIONS.find(item=>item.id===id);if(!q)continue;
      const button=document.createElement('button');button.type='button';button.className='fuzzyXrpQuestion'+(state.answered.has(id)?' asked':'');button.dataset.npcQuestion=id;button.textContent=q.label;button.addEventListener('click',()=>showAnswer(id));host.appendChild(button);
    }
  }

  function syncDenPrompt(){
    const button=document.getElementById('fuzzyXrpDenPrompt');if(!button)return;
    const visible=state.open&&state.answered.size>=DEN_THRESHOLD&&!state.denShown;
    button.classList.toggle('visible',visible);
  }

  function showDen(){state.denShown=true;showAnswer('den');syncDenPrompt();}

  function openDialogue(){
    if(!inTown()||distanceToFuzzy()>TALK_RADIUS+18)return false;
    ensureUi();state.open=true;state.beckonUntil=0;
    const panel=document.getElementById('fuzzyXrpPanel');if(panel){panel.classList.add('open');panel.setAttribute('aria-hidden','false');}
    const speech=document.getElementById('fuzzyXrpWorldSpeech');if(speech)speech.style.display='block';
    const beckon=document.getElementById('fuzzyXrpBeckon');if(beckon)beckon.style.display='none';
    facePlayer(getFuzzy());showAnswer(state.answerId||'welcome');positionSpeech();syncDenPrompt();return true;
  }

  function closeDialogue(){
    state.open=false;
    const panel=document.getElementById('fuzzyXrpPanel');if(panel){panel.classList.remove('open');panel.setAttribute('aria-hidden','true');}
    const speech=document.getElementById('fuzzyXrpWorldSpeech');if(speech)speech.style.display='none';
    document.getElementById('fuzzyXrpDenPrompt')?.classList.remove('visible');
  }

  function triggerBeckon(now){
    if(state.beckonUntil>now)return;
    const lines=['Psst… ever hear about one XRP for one Bitcoin?','Come sit. The old ledger has bear stories.','Hey traveler — want the soft version of XRPL history?','Get closer. I promise the lore is fuzzier than the charts.'];
    state.beckonLine=lines[Math.floor(Math.random()*lines.length)];state.beckonUntil=now+BECKON_MS;state.nextBeckonAt=now+BECKON_COOLDOWN_MS;
    const node=document.getElementById('fuzzyXrpBeckon');if(node){node.textContent=state.beckonLine;node.style.display='block';}
  }

  function worldPoint(npc,yOffset){
    try{
      const canvas=document.getElementById('game'),rect=canvas.getBoundingClientRect();
      const sx=(npc.x-cam.x)*zoom,sy=(npc.y-yOffset-cam.y)*zoom;
      return{x:rect.left+(sx/Math.max(1,W))*rect.width,y:rect.top+(sy/Math.max(1,H))*rect.height};
    }catch(_error){return null;}
  }

  function clampX(x,width){return Math.max(width/2+8,Math.min(global.innerWidth-width/2-8,x));}

  function positionSpeech(){
    const npc=getFuzzy(),node=document.getElementById('fuzzyXrpWorldSpeech');if(!npc||!node||!state.open)return;
    const p=worldPoint(npc,66);if(!p)return;const width=Math.min(300,global.innerWidth*.76);node.style.left=`${clampX(p.x,width)}px`;node.style.top=`${Math.max(74,p.y)}px`;
  }

  function placeBeckon(){
    const npc=getFuzzy(),node=document.getElementById('fuzzyXrpBeckon');if(!npc||!node||!inTown())return;
    const p=worldPoint(npc,64);if(!p)return;node.style.left=`${clampX(p.x,250)}px`;node.style.top=`${Math.max(72,p.y)}px`;if(node.textContent!==state.beckonLine)node.textContent=state.beckonLine;
  }

  function tick(){
    ensureUi();const now=Date.now(),distance=distanceToFuzzy(),npc=getFuzzy();
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
    else{const node=document.getElementById('fuzzyXrpBeckon');if(node)node.style.display='none';}
    if(state.open){positionSpeech();syncDenPrompt();}
    requestAnimationFrame(tick);
  }

  try{
    const originalNearestThing=nearestThing;
    nearestThing=function(){if(inTown()&&distanceToFuzzy()<=TALK_RADIUS)return{id:'fuzzy-xrp',type:'npc',name:'FUZZY · $FUZZY',text:'Talk with Fuzzy about the old XRPL order and the den.',radius:TALK_RADIUS};return originalNearestThing();};
  }catch(error){console.warn('Fuzzy XRP could not hook nearestThing.',error);}

  try{
    const originalInteract=interact;
    interact=function(){if(inTown()&&distanceToFuzzy()<=TALK_RADIUS&&!state.open){openDialogue();return;}return originalInteract();};
  }catch(error){console.warn('Fuzzy XRP could not hook interact.',error);}

  try{
    const originalUpdateTownBots=updateTownBots;
    updateTownBots=function(dt){
      const npc=getFuzzy(),now=Date.now(),locked=!!npc&&(state.open||now<state.beckonUntil);
      if(locked)npc.wait=Math.max(Number(npc.wait)||0,Math.max(.18,Number(dt)||0)+.12);
      originalUpdateTownBots(dt);
      if(locked){npc.wait=Math.max(Number(npc.wait)||0,.12);facePlayer(npc);}
    };
  }catch(error){console.warn('Fuzzy XRP could not hook town bot movement.',error);}

  global.ATMFuzzyXrp=Object.freeze({open:openDialogue,close:closeDialogue,getFuzzy,distance:distanceToFuzzy,issuer:ISSUER,questions:QUESTIONS});
  ensureUi();requestAnimationFrame(tick);
})(window);
