/*
 * ATM Town — TRISK HQ / $TRISK project NPC
 * Liquidity-first, pre-written, zero-AI interaction using the shared NPC standard.
 */
(function initializeTriskXrp(global){
  'use strict';

  if(global.ATMTriskXrp)return;

  const TALK_RADIUS=92;
  const AWARENESS_RADIUS=210;
  const AWARENESS_RESET_RADIUS=300;
  const DIALOGUE_LEASH=190;
  const BECKON_MS=6200;
  const BECKON_COOLDOWN_MS=45000;
  const OUTSIDE_RESET_MS=1200;
  const SPIRAL_THRESHOLD=3;
  const ISSUER='rhu8q21DEWekDcvqakABXPJbm3MAnQa8oy';

  const DOORS=Object.freeze({
    site:'https://triskonxrpl.com',
    x:'https://x.com/Trisk_xrp'
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
    spiralShown:false
  };

  const QUESTIONS=Object.freeze([
    {id:'mission',label:'What is TRISK?',answer:'I’m TRISK. Three arms, one turn: art, technology, community. The project takes the triskelion — three locked spirals — and turns it into an XRPL community built around psychedelic art, Electric Triskeletons, active AMM liquidity, and partnerships instead of isolation.'},
    {id:'symbol',label:'What does the triskelion mean?',answer:'Three spirals: balance, progress, forward motion. For us they are art, technology, and community. None of the arms is supposed to spin alone. The symbol is the reminder that the project works best when the art has rails, the rails have people, and the people keep connecting outward.'},
    {id:'different',label:'What makes TRISK different?',answer:'Liquidity is part of our identity. We do not only want a token sitting beside a chart. TRISK HQ actively works AMM pools that connect $TRISK with other XRPL memes. We would rather build bridges between communities than try to out-shout every ticker around us.'},
    {id:'design',label:'How is $TRISK designed?',answer:`The project states a 1 billion supply, zero tax, and 100% burned LP. The issuer presented for the main TRISK token is ${ISSUER}. Other TRISK issuers can exist, so verify that exact address before setting a trustline, swapping, or entering a pool.`},
    {id:'nfts',label:'What are Electric Triskeletons?',answer:'Electric Triskeletons are the project’s on-ledger skeleton art — psychedelic bones carrying the visual side of the triskelion. The first NFT drop followed the token launch, and later collections are meant to give holders more art, earlier access windows, and extra community benefits.'},
    {id:'liquidity',label:'Why are you so focused on liquidity?',answer:'Because liquidity is the project’s love language. A healthy pool is a working connection between communities. Instead of treating another meme as an enemy, we can pair with it, buy into the relationship, and make the rails between us thicker. The pool is not background plumbing to us. It is part of the mission.'},
    {id:'bridges',label:'How do the AMM bridges work?',answer:'XRPL has native issued assets, a built-in decentralized exchange, and AMMs. That lets $TRISK participate in pools alongside XRP or sister tokens. The simple idea is that capital sits in the pool so people can trade against shared liquidity, while the project uses those pools to create real connections across the meme ecosystem.'},
    {id:'xrpl',label:'Why build on the XRP Ledger?',answer:'Because XRPL gives us fast settlement, very low fees, native tokens, a built-in DEX, AMMs, NFTs, and bridge assets like XRP and RLUSD. That is a strong base for a project that wants its art collectible, its token liquid, and its community connected without building every rail from scratch.'},
    {id:'atm',label:'What does the ATM partnership mean?',answer:'ATM is family. TRISK is an ATM partner because the whole point is interconnected communities. ATM brings the town, payments, tools, games, and wider ecosystem. TRISK brings art, liquidity, and a willingness to pair with the family instead of standing off in a separate corner.'},
    {id:'rewards',label:'What kind of holder rewards exist?',answer:'The project has talked about Bear Bones NFT bounties, treasure-chest style lotteries, holder perks, early access to later art, and special recognition for committed holders. Those programs can evolve, so treat them as project mechanics and community benefits — never as guaranteed yield or profit.'},
    {id:'why',label:'Why does TRISK need a token?',answer:'Because three spirals need a centre. $TRISK is the hub. The art is one arm, XRPL and the AMM rails are the second, and community is the third. The token gives those arms something shared to collect, pair, reward around, and build outward from.'},
    {id:'price',label:'Will $TRISK go up?',answer:'No one knows. The spiral turns either way. $TRISK is a crypto asset and can move sharply up or down. TRISK HQ does not promise candles. Judge the project by the art, the pools, the partnerships, and whether the community keeps building useful connections.'}
  ]);

  let profile=null;

  function registerProfile(){
    const standard=global.ATMNpcDialogueStandard;
    if(!standard)return null;
    profile=standard.get('trisk-xrp')||standard.register({
      id:'trisk-xrp',
      name:'TRISK HQ · $TRISK',
      rewardUnlockQuestions:SPIRAL_THRESHOLD,
      reward:false,
      theme:{
        accent:'#b877ff',
        accentSoft:'rgba(184,119,255,.58)',
        accentText:'#f4e9ff',
        panel:'rgba(16,10,29,.95)',
        headerA:'rgba(89,32,135,.98)',
        headerB:'rgba(6,73,86,.97)',
        question:'rgba(25,23,48,.98)',
        answered:'#65f7ff',
        rewardA:'rgba(118,46,182,.98)',
        rewardB:'rgba(0,157,170,.98)',
        rewardText:'#fff8d8',
        speech:'rgba(25,13,43,.97)',
        speechText:'#f8f3ff'
      }
    });
    return profile;
  }

  function getTrisk(){
    try{
      if(!Array.isArray(townBots))return null;
      const bots=townBots.filter(Boolean);
      const exact=bots.find(bot=>{
        const id=String(bot.id||'').toLowerCase();
        return id==='bot-triskeleton'||id==='bot-trisk'||id==='triskeleton'||id==='trisk'||id==='trisk-bot';
      });
      if(exact)return exact;
      const named=bots.find(bot=>{
        const name=String(bot.name||bot.label||'').toLowerCase();
        return name.includes('triskeleton')||name.includes('trisk');
      });
      if(named)return named;
      return bots.find(bot=>{
        const key=String(bot.charKey||bot.character||bot.key||'').toLowerCase();
        const id=String(bot.id||'').toLowerCase();
        return key==='triskeleton'||key==='trisk'||id.includes('triskeleton')||id.includes('trisk');
      })||null;
    }catch(_error){return null;}
  }

  function inTown(){try{return currentMap==='town';}catch(_error){return false;}}
  function distanceToTrisk(){const npc=getTrisk();if(!npc||!inTown())return Infinity;try{return Math.hypot(player.x-npc.x,player.y-npc.y);}catch(_error){return Infinity;}}

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
    if(document.getElementById('triskXrpPanel'))return;
    registerProfile();

    const style=document.createElement('style');
    style.dataset.triskXrp='1';
    style.textContent=`
#triskXrpBeckon{position:fixed;z-index:210;display:none;box-sizing:border-box;width:250px;min-width:250px;max-width:250px;min-height:56px;padding:9px 12px;border:1px solid var(--atm-npc-accent-soft,rgba(184,119,255,.58));border-radius:13px;background:rgba(25,13,43,.97);color:#f8f3ff;font:900 13px/1.32 system-ui;text-align:center;pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 24px rgba(101,247,255,.12);transform:translate(-50%,-100%);transition:none;contain:layout style paint}
#triskXrpBeckon::after{content:'';position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);border:8px solid transparent;border-top-color:var(--atm-npc-accent-soft);border-bottom:0}
#triskXrpPanel{position:fixed;inset:0;z-index:9750;display:none;background:transparent;pointer-events:none}#triskXrpPanel.open{display:block}
#triskXrpCard{position:fixed;left:50%;bottom:max(102px,calc(env(safe-area-inset-bottom) + 86px));transform:translateX(-50%);width:min(760px,calc(100vw - 18px));height:94px;display:grid;grid-template-rows:31px 63px;overflow:hidden;border:1px solid var(--atm-npc-accent-soft);border-radius:14px;background:var(--atm-npc-panel);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 13px 38px rgba(0,0,0,.5),0 0 25px rgba(101,247,255,.08);pointer-events:auto;z-index:9780}
.triskXrpHeader{height:31px;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:3px 6px 3px 8px;border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(90deg,var(--atm-npc-header-a),var(--atm-npc-header-b))}.triskXrpIdentity{display:flex;align-items:center;gap:6px;min-width:0}.triskXrpAvatar{width:24px;height:26px;object-fit:contain;image-rendering:pixelated}.triskXrpHeader h2{margin:0;color:#fff;font:1000 10px/1 system-ui;white-space:nowrap}.triskXrpClose{width:25px;height:25px;flex:0 0 25px;border:1px solid rgba(255,255,255,.16);border-radius:7px;background:rgba(255,255,255,.08);color:#fff;font-size:16px;font-weight:1000;line-height:1;touch-action:manipulation}
.triskXrpBody{height:63px;overflow:hidden;padding:6px}.triskXrpQuestions{box-sizing:border-box;width:100%;height:51px;display:flex;flex-flow:row nowrap;align-items:stretch;gap:7px;overflow-x:auto;overflow-y:hidden;padding:0 3px 2px;pointer-events:auto;touch-action:pan-x;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;scrollbar-width:none}.triskXrpQuestions::-webkit-scrollbar{display:none}.triskXrpQuestion{box-sizing:border-box;flex:0 0 clamp(152px,36vw,210px);height:49px;display:flex;align-items:center;justify-content:flex-start;padding:7px 10px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:var(--atm-npc-question);color:#f1efff;font:900 9px/1.18 system-ui;text-align:left;scroll-snap-align:start;pointer-events:auto;touch-action:pan-x;-webkit-user-select:none;user-select:none}.triskXrpQuestion.asked{border-color:var(--atm-npc-accent-soft);color:var(--atm-npc-answered)}
#triskXrpSpiralPrompt{position:fixed;left:50%;bottom:max(54px,calc(env(safe-area-inset-bottom) + 38px));transform:translateX(-50%);z-index:9785;display:none;align-items:center;justify-content:center;width:min(390px,calc(100vw - 28px));min-height:42px;padding:8px 14px;border:1px solid var(--atm-npc-accent-soft);border-radius:12px;background:linear-gradient(90deg,var(--atm-npc-reward-a),var(--atm-npc-reward-b));box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 20px rgba(101,247,255,.13);color:var(--atm-npc-reward-text);font:1000 10px/1.15 system-ui;text-align:center;pointer-events:auto;touch-action:manipulation}.visible#triskXrpSpiralPrompt{display:flex}
#triskXrpWorldSpeech{position:fixed;z-index:9790;display:none;width:min(300px,76vw);max-width:300px;padding:10px 11px 9px;border:1px solid var(--atm-npc-accent-soft);border-radius:14px;background:var(--atm-npc-speech);color:var(--atm-npc-speech-text);box-shadow:0 14px 38px rgba(0,0,0,.5),0 0 24px rgba(101,247,255,.11);transform:translate(-50%,-100%);transform-origin:50% 100%;pointer-events:auto}#triskXrpWorldSpeech:after{content:'';position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);border:8px solid transparent;border-top-color:var(--atm-npc-accent-soft);border-bottom:0}.triskXrpWorldName{color:var(--atm-npc-accent);font:1000 8px/1 system-ui;letter-spacing:.12em;margin-bottom:5px}.triskXrpWorldText{font:800 11px/1.4 system-ui;color:var(--atm-npc-speech-text)}.triskXrpWorldActions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.triskXrpWorldAction{min-height:34px;padding:0 9px;border:1px solid var(--atm-npc-accent-soft);border-radius:9px;background:linear-gradient(90deg,rgba(109,43,168,.96),rgba(0,110,123,.96));color:#fff8db;font:1000 8px system-ui;touch-action:manipulation}
@media(max-width:600px){#triskXrpBeckon{width:min(238px,calc(100vw - 28px));min-width:min(238px,calc(100vw - 28px));max-width:min(238px,calc(100vw - 28px))}#triskXrpCard{bottom:max(160px,calc(env(safe-area-inset-bottom) + 144px));width:calc(100vw - 12px);height:88px;grid-template-rows:29px 59px;border-radius:12px}.triskXrpHeader{height:29px}.triskXrpBody{height:59px;padding:5px}.triskXrpQuestions{height:49px;gap:6px}.triskXrpQuestion{flex-basis:clamp(145px,44vw,190px);height:47px;font-size:8.7px;padding:6px 9px}#triskXrpSpiralPrompt{bottom:max(108px,calc(env(safe-area-inset-bottom) + 92px));width:min(330px,calc(100vw - 40px));min-height:40px;font-size:9.5px}#triskXrpWorldSpeech{width:min(310px,82vw);max-width:310px;padding:9px 10px}.triskXrpWorldText{font-size:10px;line-height:1.38}}
`;
    document.head.appendChild(style);

    const panel=document.createElement('div');panel.id='triskXrpPanel';panel.setAttribute('aria-hidden','true');
    panel.innerHTML=`<div id="triskXrpCard" role="group"><header class="triskXrpHeader"><div class="triskXrpIdentity"><img class="triskXrpAvatar" src="assets/characters/thumbnails/character-triskeleton.webp" alt="Trisk"><h2>TRISK HQ · $TRISK</h2></div><button class="triskXrpClose" id="triskXrpClose" type="button" aria-label="Close TRISK conversation">×</button></header><main class="triskXrpBody"><div class="triskXrpQuestions" id="triskXrpQuestions"></div></main></div>`;
    document.body.appendChild(panel);

    const speech=document.createElement('div');speech.id='triskXrpWorldSpeech';speech.innerHTML=`<div class="triskXrpWorldName">TRISK HQ</div><div class="triskXrpWorldText" id="triskXrpWorldText"></div><div class="triskXrpWorldActions" id="triskXrpWorldActions"></div>`;document.body.appendChild(speech);
    const beckon=document.createElement('div');beckon.id='triskXrpBeckon';document.body.appendChild(beckon);
    const spiral=document.createElement('button');spiral.id='triskXrpSpiralPrompt';spiral.type='button';spiral.textContent='ENTER THE SPIRAL';document.body.appendChild(spiral);

    const profileNow=registerProfile();
    for(const node of [panel,speech,beckon,spiral])global.ATMNpcDialogueStandard?.applyTheme(node,profileNow);
    document.getElementById('triskXrpClose')?.addEventListener('click',closeDialogue);
    spiral.addEventListener('click',showSpiral);
    renderQuestions();showAnswer('welcome');
  }

  function answerText(id){
    if(id==='welcome')return 'I’m TRISK. Three arms, one turn: art, tech, community. We put electric skeletons on the XRP Ledger and keep AMM pools warm so this project touches the other good memes — especially our $ATM family. Interconnected destinies. That’s the whole cipher.';
    if(id==='spiral')return 'Hold if the spiral fits. Peek at the Triskeletons. If you build or collect elsewhere on XRPL, we would rather pair with you than compete in the dark. Come for the art. Stay because the pools actually work. Three turns, one motion. Keep bridging.';
    return QUESTIONS.find(q=>q.id===id)?.answer||'';
  }

  function showAnswer(id){
    ensureUi();state.answerId=id;
    if(id!=='welcome'&&id!=='spiral')state.answered.add(id);
    const text=document.getElementById('triskXrpWorldText');if(text)text.textContent=answerText(id);
    const actions=document.getElementById('triskXrpWorldActions');
    if(actions){
      actions.textContent='';
      if(id==='spiral'){
        const site=document.createElement('button');site.className='triskXrpWorldAction';site.type='button';site.textContent='TRISKONXRPL.COM';site.addEventListener('click',()=>openExternal(DOORS.site));actions.appendChild(site);
        const x=document.createElement('button');x.className='triskXrpWorldAction';x.type='button';x.textContent='@TRISK_XRP';x.addEventListener('click',()=>openExternal(DOORS.x));actions.appendChild(x);
      }
    }
    renderQuestions();syncSpiralPrompt();
  }

  function renderQuestions(){
    const host=document.getElementById('triskXrpQuestions');if(!host)return;host.textContent='';
    const initial=['mission','symbol','different','design','nfts'];
    const followups=['liquidity','bridges','xrpl','atm','rewards','why','price'];
    const visible=state.answered.size?initial.concat(followups):initial;
    for(const id of visible){
      const q=QUESTIONS.find(item=>item.id===id);if(!q)continue;
      const button=document.createElement('button');button.type='button';button.className='triskXrpQuestion'+(state.answered.has(id)?' asked':'');button.dataset.npcQuestion=id;button.textContent=q.label;button.addEventListener('click',()=>showAnswer(id));host.appendChild(button);
    }
  }

  function syncSpiralPrompt(){
    const button=document.getElementById('triskXrpSpiralPrompt');if(!button)return;
    const visible=state.open&&state.answered.size>=SPIRAL_THRESHOLD&&!state.spiralShown;
    button.classList.toggle('visible',visible);
  }

  function showSpiral(){state.spiralShown=true;showAnswer('spiral');syncSpiralPrompt();}

  function openDialogue(){
    if(!inTown()||distanceToTrisk()>TALK_RADIUS+18)return false;
    ensureUi();state.open=true;state.beckonUntil=0;
    const panel=document.getElementById('triskXrpPanel');if(panel){panel.classList.add('open');panel.setAttribute('aria-hidden','false');}
    const speech=document.getElementById('triskXrpWorldSpeech');if(speech)speech.style.display='block';
    const beckon=document.getElementById('triskXrpBeckon');if(beckon)beckon.style.display='none';
    facePlayer(getTrisk());showAnswer(state.answerId||'welcome');positionSpeech();syncSpiralPrompt();return true;
  }

  function closeDialogue(){
    state.open=false;
    const panel=document.getElementById('triskXrpPanel');if(panel){panel.classList.remove('open');panel.setAttribute('aria-hidden','true');}
    const speech=document.getElementById('triskXrpWorldSpeech');if(speech)speech.style.display='none';
    document.getElementById('triskXrpSpiralPrompt')?.classList.remove('visible');
  }

  function triggerBeckon(now){
    if(state.beckonUntil>now)return;
    const lines=['Three spirals. One motion. Got a second?','Hey traveler — want to see what liquidity looks like with neon bones?','Come closer. The pools are warmer than the charts.','Art, tech, community. Pick an arm and step into the spiral.'];
    state.beckonLine=lines[Math.floor(Math.random()*lines.length)];state.beckonUntil=now+BECKON_MS;state.nextBeckonAt=now+BECKON_COOLDOWN_MS;
    const node=document.getElementById('triskXrpBeckon');if(node){node.textContent=state.beckonLine;node.style.display='block';}
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
    const npc=getTrisk(),node=document.getElementById('triskXrpWorldSpeech');if(!npc||!node||!state.open)return;
    const p=worldPoint(npc,66);if(!p)return;const width=Math.min(300,global.innerWidth*.76);node.style.left=`${clampX(p.x,width)}px`;node.style.top=`${Math.max(74,p.y)}px`;
  }

  function placeBeckon(){
    const npc=getTrisk(),node=document.getElementById('triskXrpBeckon');if(!npc||!node||!inTown())return;
    const p=worldPoint(npc,64);if(!p)return;node.style.left=`${clampX(p.x,250)}px`;node.style.top=`${Math.max(72,p.y)}px`;if(node.textContent!==state.beckonLine)node.textContent=state.beckonLine;
  }

  function tick(){
    ensureUi();const now=Date.now(),distance=distanceToTrisk(),npc=getTrisk();
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
    else{const node=document.getElementById('triskXrpBeckon');if(node)node.style.display='none';}
    if(state.open){positionSpeech();syncSpiralPrompt();}
    requestAnimationFrame(tick);
  }

  try{
    const originalNearestThing=nearestThing;
    nearestThing=function(){if(inTown()&&distanceToTrisk()<=TALK_RADIUS)return{id:'trisk-xrp',type:'npc',name:'TRISK HQ · $TRISK',text:'Talk with TRISK about the triskelion, Electric Triskeletons and XRPL liquidity.',radius:TALK_RADIUS};return originalNearestThing();};
  }catch(error){console.warn('TRISK XRP could not hook nearestThing.',error);}

  try{
    const originalInteract=interact;
    interact=function(){if(inTown()&&distanceToTrisk()<=TALK_RADIUS&&!state.open){openDialogue();return;}return originalInteract();};
  }catch(error){console.warn('TRISK XRP could not hook interact.',error);}

  try{
    const originalUpdateTownBots=updateTownBots;
    updateTownBots=function(dt){
      const npc=getTrisk(),now=Date.now(),locked=!!npc&&(state.open||now<state.beckonUntil);
      if(locked)npc.wait=Math.max(Number(npc.wait)||0,Math.max(.18,Number(dt)||0)+.12);
      originalUpdateTownBots(dt);
      if(locked){npc.wait=Math.max(Number(npc.wait)||0,.12);facePlayer(npc);}
    };
  }catch(error){console.warn('TRISK XRP could not hook town bot movement.',error);}

  global.ATMTriskXrp=Object.freeze({open:openDialogue,close:closeDialogue,getTrisk,distance:distanceToTrisk,issuer:ISSUER,questions:QUESTIONS});
  ensureUi();requestAnimationFrame(tick);
})(window);