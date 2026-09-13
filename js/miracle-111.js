/*
 * ATM Town — Miracle / 111 Miracles project NPC
 * Mission-first, pre-written, zero-AI interaction following ATM Town's shared
 * in-world NPC dialogue standard. No market promises and no invented rewards.
 */
(function initializeMiracle111(global){
  'use strict';

  if(global.ATMMiracle111)return;

  const MIRACLE_ID='bot-miracle';
  const TALK_RADIUS=92;
  const AWARENESS_RADIUS=210;
  const AWARENESS_RESET_RADIUS=300;
  const DIALOGUE_LEASH=190;
  const BECKON_MS=6200;
  const BECKON_COOLDOWN_MS=45000;
  const OUTSIDE_RESET_MS=1200;
  const BEGIN_THRESHOLD=3;

  const DOORS=Object.freeze({
    site:'https://111miracles.mobirisesite.com',
    links:'https://linktr.ee/111Miracles',
    x:'https://x.com/111miracles',
    telegram:'https://t.me/Real111Miracles'
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
    beginning:false
  };

  const QUESTIONS=Object.freeze([
    {id:'mission',label:'What is 111 Miracles?',answer:'We are building an archive of #Real111Miracles — 111 biblical, 111 historical, and 111 modern events that we believe show God is not silent. For more than twenty-five years the work has been gathering the stories, researching them, and turning them into art, little books, and collectables so they are not quietly forgotten.'},
    {id:'meaning',label:'What does 111 mean?',answer:'One. One. One. To us, 111 is trinity written like a knock: alignment, witness, and a collecting vow. The library is being built as three houses — 111 biblical miracles, 111 historical miracles, and 111 modern miracles — 333 events carried across 23 Little Books.'},
    {id:'littlebooks',label:'What are the Little Books?',answer:'The Little Book of Epic Miracles is meant to be a doorway, not a brick — about fifteen minutes to read. Each edition gathers miracles into its own art style, with the wider plan unfolding across 23 books. The project has described editions such as Jerusalem, Jerusalem Gold, and America 1st, with a free digital path intended to remain available.'},
    {id:'relics',label:'What are Gold Relic NFTs?',answer:'The Gold Relics turn individual miracles into collectable pieces of the archive: art, research, and the story of the event, minted so the record is harder to quietly erase. Different frames and editions let collectors walk through the library one relic at a time.'},
    {id:'angels',label:'Who are the 111 Angels?',answer:'The 111 Angels are the first family around the work. They are the early holders and collectors who helped stand around the archive before the larger Real Miracles collections open. The project has promised Angels a place at the table through free mints and whitelist access when those collections arrive.'},
    {id:'onchain',label:'Why put miracles on-chain?',answer:'Because memory is fragile. A story can disappear when a site closes, a platform changes, or a generation stops carrying it. Putting the art and archive on-chain is our way of stamping the testimony into the timeline so the stories can keep travelling forward.'},
    {id:'token',label:'Why does $MIRACLES exist?',answer:'$MIRACLES is the workhorse, not the religion. Research, art, books, hosting, minting, and exhibitions cost real money. The token was created on the XRP Ledger as a shared table around the work — a way to help keep the lamp lit, gather the community, and point people back toward the miracles themselves.'},
    {id:'jackpot',label:'Is $MIRACLES a jackpot coin?',answer:'No. We are not a monthly draw and we do not promise profit. The coin is a banner and a workhorse for the archive. The miracles, books, relics, and community are the treasure. If markets come up, keep them in proportion to the mission.'},
    {id:'jerusalem589',label:'What is the 589 Jerusalem edition?',answer:'The 589 Little Books — Jerusalem Edition is a limited XRPL NFT edition carrying the book on-chain. The project describes it as a fixed edition of 589, built so the Jerusalem book itself becomes part of the permanent archive.'},
    {id:'faith',label:'What do you believe?',answer:'Our confession is simple: God exists. Christ is King. Creation still speaks. We proclaim that without demanding anyone arrive already certain. Read one story. Look at one event. The invitation is to look.'},
    {id:'drops',label:'How are the miracle collections organised?',answer:'The full map is 333 events: 111 biblical, 111 historical, and 111 modern. Drops have been described in batches of 37 drawn across all three houses, with each miracle carrying its own lore page, clippings, archive material, and the story of the wonder.'},
    {id:'future',label:'What are you building beyond NFTs?',answer:'The same archive is meant to have many doors: picture booklets, merch, cards, future games, and metaverse spaces. A child can meet an angel, a reader can finish a Little Book before the kettle boils, and a collector can hold a relic. Different doors, same stories.'}
  ]);

  let profile=null;

  function registerProfile(){
    const standard=global.ATMNpcDialogueStandard;
    if(!standard)return null;
    profile=standard.get('miracle-111')||standard.register({
      id:'miracle-111',
      name:'Miracle · 111 Miracles',
      rewardUnlockQuestions:BEGIN_THRESHOLD,
      reward:false,
      theme:{
        accent:'#f3cf73',
        accentSoft:'rgba(243,207,115,.52)',
        accentText:'#fff4c8',
        panel:'rgba(10,15,31,.94)',
        headerA:'rgba(45,31,76,.97)',
        headerB:'rgba(12,24,45,.97)',
        question:'rgba(19,37,57,.97)',
        answered:'#f7d987',
        rewardA:'rgba(94,70,142,.98)',
        rewardB:'rgba(42,78,111,.98)',
        rewardText:'#fff4c8',
        speech:'rgba(22,19,42,.96)',
        speechText:'#fffaf0'
      }
    });
    return profile;
  }

  function getMiracle(){
    try{
      if(!Array.isArray(townBots))return null;
      return townBots.find(bot=>{
        if(!bot)return false;
        const id=String(bot.id||'').toLowerCase();
        const key=String(bot.charKey||bot.character||bot.key||bot.name||'').toLowerCase();
        return id===MIRACLE_ID||id==='miracle'||key==='miracle'||id.includes('miracle');
      })||null;
    }catch(_error){return null;}
  }

  function inTown(){try{return currentMap==='town';}catch(_error){return false;}}
  function distanceToMiracle(){const npc=getMiracle();if(!npc||!inTown())return Infinity;try{return Math.hypot(player.x-npc.x,player.y-npc.y);}catch(_error){return Infinity;}}

  function facePlayer(npc){
    if(!npc)return;
    try{
      const dx=player.x-npc.x,dy=player.y-npc.y;
      npc.dir=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
      npc.moving=false;npc.animTimer=0;npc.frame=1;
    }catch(_error){}
  }

  function openExternal(url){
    try{global.open(url,'_blank','noopener,noreferrer');}catch(_error){}
  }

  function ensureUi(){
    if(document.getElementById('miracle111Panel'))return;
    registerProfile();

    const style=document.createElement('style');
    style.dataset.miracle111='1';
    style.textContent=`
#miracle111Beckon{position:fixed;z-index:210;display:none;box-sizing:border-box;width:250px;min-width:250px;max-width:250px;min-height:56px;padding:9px 12px;border:1px solid var(--atm-npc-accent-soft,#f3cf73);border-radius:13px;background:rgba(22,19,42,.95);color:#fff7df;font:900 13px/1.32 system-ui;text-align:center;pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 22px rgba(243,207,115,.12);transform:translate(-50%,-100%);transition:none;contain:layout style paint}
#miracle111Beckon::after{content:'';position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);border:8px solid transparent;border-top-color:var(--atm-npc-accent-soft,#f3cf73);border-bottom:0}
#miracle111Panel{position:fixed;inset:0;z-index:9750;display:none;background:transparent;pointer-events:none}
#miracle111Panel.open{display:block}
#miracle111Card{position:fixed;left:50%;bottom:max(102px,calc(env(safe-area-inset-bottom) + 86px));transform:translateX(-50%);width:min(760px,calc(100vw - 18px));height:94px;display:grid;grid-template-rows:31px 63px;overflow:hidden;border:1px solid var(--atm-npc-accent-soft,#f3cf73);border-radius:14px;background:var(--atm-npc-panel,rgba(10,15,31,.94));backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 13px 38px rgba(0,0,0,.5),0 0 24px rgba(243,207,115,.07);pointer-events:auto;z-index:9780}
.miracle111Header{height:31px;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:3px 6px 3px 8px;border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(90deg,var(--atm-npc-header-a),var(--atm-npc-header-b))}
.miracle111Identity{display:flex;align-items:center;gap:6px;min-width:0}.miracle111Avatar{width:24px;height:26px;object-fit:contain;image-rendering:pixelated}.miracle111Header h2{margin:0;color:#fff;font:1000 10px/1 system-ui;white-space:nowrap}.miracle111Close{width:25px;height:25px;flex:0 0 25px;border:1px solid rgba(255,255,255,.16);border-radius:7px;background:rgba(255,255,255,.08);color:#fff;font-size:16px;font-weight:1000;line-height:1;touch-action:manipulation}
.miracle111Body{height:63px;overflow:hidden;padding:6px}.miracle111Questions{box-sizing:border-box;width:100%;height:51px;display:flex;flex-flow:row nowrap;align-items:stretch;gap:7px;overflow-x:auto;overflow-y:hidden;padding:0 3px 2px;pointer-events:auto;touch-action:pan-x;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;scrollbar-width:none}.miracle111Questions::-webkit-scrollbar{display:none}
.miracle111Question{box-sizing:border-box;flex:0 0 clamp(152px,36vw,210px);height:49px;display:flex;align-items:center;justify-content:flex-start;padding:7px 10px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:var(--atm-npc-question,rgba(19,37,57,.97));color:#eefaff;font:900 9px/1.18 system-ui;text-align:left;scroll-snap-align:start;pointer-events:auto;touch-action:pan-x;-webkit-user-select:none;user-select:none}.miracle111Question.asked{border-color:var(--atm-npc-accent-soft);color:var(--atm-npc-answered,#f7d987)}
#miracle111BeginPrompt{position:fixed;left:50%;bottom:max(54px,calc(env(safe-area-inset-bottom) + 38px));transform:translateX(-50%);z-index:9785;display:none;align-items:center;justify-content:center;width:min(390px,calc(100vw - 28px));min-height:42px;padding:8px 14px;border:1px solid var(--atm-npc-accent-soft);border-radius:12px;background:linear-gradient(90deg,var(--atm-npc-reward-a),var(--atm-npc-reward-b));box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 18px rgba(243,207,115,.1);color:var(--atm-npc-reward-text,#fff4c8);font:1000 10px/1.15 system-ui;text-align:center;pointer-events:auto;touch-action:manipulation}.visible#miracle111BeginPrompt{display:flex}
#miracle111WorldSpeech{position:fixed;z-index:9790;display:none;width:min(300px,76vw);max-width:300px;padding:10px 11px 9px;border:1px solid var(--atm-npc-accent-soft);border-radius:14px;background:var(--atm-npc-speech,rgba(22,19,42,.96));color:var(--atm-npc-speech-text,#fffaf0);box-shadow:0 14px 38px rgba(0,0,0,.5),0 0 24px rgba(243,207,115,.1);transform:translate(-50%,-100%);transform-origin:50% 100%;pointer-events:auto}
#miracle111WorldSpeech:after{content:'';position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);border:8px solid transparent;border-top-color:var(--atm-npc-accent-soft);border-bottom:0}.miracle111WorldName{color:var(--atm-npc-accent,#f3cf73);font:1000 8px/1 system-ui;letter-spacing:.12em;margin-bottom:5px}.miracle111WorldText{font:800 11px/1.4 system-ui;color:var(--atm-npc-speech-text,#fffaf0)}.miracle111WorldActions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.miracle111WorldAction{min-height:34px;padding:0 9px;border:1px solid var(--atm-npc-accent-soft);border-radius:9px;background:linear-gradient(90deg,rgba(88,66,133,.96),rgba(44,75,106,.96));color:#fff4c8;font:1000 8px system-ui;touch-action:manipulation}
@media(max-width:600px){#miracle111Beckon{width:min(238px,calc(100vw - 28px));min-width:min(238px,calc(100vw - 28px));max-width:min(238px,calc(100vw - 28px))}#miracle111Card{bottom:max(160px,calc(env(safe-area-inset-bottom) + 144px));width:calc(100vw - 12px);height:88px;grid-template-rows:29px 59px;border-radius:12px}.miracle111Header{height:29px}.miracle111Body{height:59px;padding:5px}.miracle111Questions{height:49px;gap:6px}.miracle111Question{flex-basis:clamp(145px,44vw,190px);height:47px;font-size:8.7px;padding:6px 9px}#miracle111BeginPrompt{bottom:max(108px,calc(env(safe-area-inset-bottom) + 92px));width:min(330px,calc(100vw - 40px));min-height:40px;font-size:9.5px}#miracle111WorldSpeech{width:min(310px,82vw);max-width:310px;padding:9px 10px}.miracle111WorldText{font-size:10px;line-height:1.38}}
`;
    document.head.appendChild(style);

    const panel=document.createElement('div');panel.id='miracle111Panel';panel.setAttribute('aria-hidden','true');panel.innerHTML=`<div id="miracle111Card" role="group"><header class="miracle111Header"><div class="miracle111Identity"><img class="miracle111Avatar" src="assets/characters/thumbnails/character-miracle.webp" alt="Miracle"><h2>Miracle · 111 Miracles</h2></div><button class="miracle111Close" id="miracle111Close" type="button" aria-label="Close Miracle conversation">×</button></header><main class="miracle111Body"><div class="miracle111Questions" id="miracle111Questions"></div></main></div>`;document.body.appendChild(panel);

    const beckon=document.createElement('div');beckon.id='miracle111Beckon';beckon.setAttribute('aria-hidden','true');document.body.appendChild(beckon);
    const speech=document.createElement('div');speech.id='miracle111WorldSpeech';speech.setAttribute('role','status');speech.innerHTML='<div class="miracle111WorldName">MIRACLE · MADE WITH MIRACLES</div><div class="miracle111WorldText" id="miracle111WorldText"></div><div class="miracle111WorldActions" id="miracle111WorldActions"></div>';document.body.appendChild(speech);
    const begin=document.createElement('button');begin.type='button';begin.id='miracle111BeginPrompt';begin.textContent='SHOW ME WHERE TO BEGIN';begin.setAttribute('aria-label','Ask Miracle where to begin with 111 Miracles');document.body.appendChild(begin);

    const standard=global.ATMNpcDialogueStandard;
    if(standard&&profile){standard.applyTheme(panel,profile);standard.applyTheme(beckon,profile);standard.applyTheme(speech,profile);standard.applyTheme(begin,profile);}

    document.getElementById('miracle111Close')?.addEventListener('click',closeDialogue);
    for(const type of ['pointerdown','pointerup'])begin.addEventListener(type,event=>event.stopPropagation(),{passive:true});
    begin.addEventListener('click',event=>{event.stopPropagation();showBeginning();});
    const host=document.getElementById('miracle111Questions');
    for(const type of ['pointerdown','pointerup','click'])host?.addEventListener(type,event=>{if(event.target?.closest?.('.miracle111Question'))event.stopPropagation();},{passive:type!=='click'});

    renderQuestions();showAnswer('welcome');
  }

  function clearActions(){const host=document.getElementById('miracle111WorldActions');if(host&&host.childNodes.length)host.textContent='';}
  function addAction(label,url){const host=document.getElementById('miracle111WorldActions');if(!host)return;const button=document.createElement('button');button.type='button';button.className='miracle111WorldAction';button.textContent=label;button.addEventListener('click',event=>{event.stopPropagation();openExternal(url);});host.appendChild(button);}
  function speechText(message){ensureUi();const text=document.getElementById('miracle111WorldText');if(text)text.textContent=message;}

  function showAnswer(id){
    ensureUi();state.beginning=false;state.answerId=id;clearActions();
    if(id==='welcome'){
      speechText('Welcome. We’re 111 Miracles. For more than twenty-five years we’ve been gathering wonders from scripture, history, and the modern world — then carrying them into little books, art, and relics so time can’t quietly lose them. We believe God is not a rumour. Christ is King.');
    }else{
      const item=QUESTIONS.find(q=>q.id===id);if(!item)return;
      state.answered.add(id);speechText(item.answer);
    }
    renderQuestions();syncBeginPrompt();
  }

  function renderQuestions(){
    const host=document.getElementById('miracle111Questions');if(!host)return;host.textContent='';
    const initial=['mission','meaning','littlebooks','relics','angels'];
    const followups=['onchain','token','jackpot','jerusalem589','faith','drops','future'];
    const visible=state.answered.size?initial.concat(followups):initial;
    for(const id of visible){
      const q=QUESTIONS.find(item=>item.id===id);if(!q)continue;
      const button=document.createElement('button');button.type='button';button.className='miracle111Question'+(state.answered.has(id)?' asked':'');button.dataset.npcQuestion=id;button.textContent=q.label;button.addEventListener('click',()=>showAnswer(id));host.appendChild(button);
    }
  }

  function syncBeginPrompt(){
    const prompt=document.getElementById('miracle111BeginPrompt');if(!prompt)return;
    const visible=state.open&&state.answered.size>=BEGIN_THRESHOLD&&!state.beginning;
    prompt.classList.toggle('visible',visible);
  }

  function showBeginning(){
    state.beginning=true;clearActions();syncBeginPrompt();
    speechText('Aye — start with one story. Read the Little Book, look closely at one event, and see whether the world feels thinner or thicker afterward. The coin is not the miracle. The archive is the work. One. One. One. That’s the knock. Come in when you’re ready.');
    addAction('OPEN THE ARCHIVE',DOORS.site);
    addAction('OFFICIAL LINKS',DOORS.links);
    addAction('@111MIRACLES',DOORS.x);
  }

  function openDialogue(){
    if(!inTown()||distanceToMiracle()>TALK_RADIUS+18)return false;
    ensureUi();state.open=true;state.beckonUntil=0;state.beginning=false;
    const panel=document.getElementById('miracle111Panel');if(panel){panel.classList.add('open');panel.setAttribute('aria-hidden','false');}
    const beckon=document.getElementById('miracle111Beckon');if(beckon)beckon.style.display='none';
    facePlayer(getMiracle());showAnswer(state.answerId||'welcome');syncBeginPrompt();return true;
  }

  function closeDialogue(){
    state.open=false;state.beginning=false;const panel=document.getElementById('miracle111Panel');if(panel){panel.classList.remove('open');panel.setAttribute('aria-hidden','true');}
    document.getElementById('miracle111WorldSpeech')?.style.setProperty('display','none');document.getElementById('miracle111BeginPrompt')?.classList.remove('visible');
  }

  function triggerBeckon(now){
    if(state.beckonUntil>now)return;
    const lines=['Aye, traveler — spare a minute for a miracle?','One. One. One. That’s the knock. Curious?','Some stories deserve not to be forgotten. Come have a look.','We’ve been gathering wonders for twenty-five years. Want to know why?'];
    state.beckonLine=lines[Math.floor(Math.random()*lines.length)];state.beckonUntil=now+BECKON_MS;state.nextBeckonAt=now+BECKON_COOLDOWN_MS;
    const node=document.getElementById('miracle111Beckon');if(node){node.textContent=state.beckonLine;node.style.display='block';}
  }

  function worldToScreen(x,y){
    try{const canvas=document.getElementById('game'),rect=canvas?.getBoundingClientRect();if(!rect||!Number.isFinite(x)||!Number.isFinite(y))return null;const sx=(x-cam.x)*zoom,sy=(y-cam.y)*zoom;return{x:rect.left+(sx/Math.max(1,W))*rect.width,y:rect.top+(sy/Math.max(1,H))*rect.height};}catch(_error){return null;}
  }

  function placeBeckon(){
    const node=document.getElementById('miracle111Beckon'),npc=getMiracle();if(!node||!npc||!inTown())return;
    const point=worldToScreen(npc.x,npc.y-64);if(!point)return;node.style.left=`${point.x}px`;node.style.top=`${point.y}px`;if(node.textContent!==state.beckonLine)node.textContent=state.beckonLine;
  }

  function positionSpeech(){
    const speech=document.getElementById('miracle111WorldSpeech');if(!speech)return;if(!state.open){speech.style.display='none';return;}
    const npc=getMiracle(),point=npc?worldToScreen(npc.x,npc.y-66):null;if(!point){speech.style.display='none';return;}speech.style.display='block';
    const width=Math.max(180,speech.offsetWidth||220),half=width/2;const x=Math.min(Math.max(half+8,global.innerWidth-half-8),Math.max(half+8,point.x));const card=document.getElementById('miracle111Card')?.getBoundingClientRect();const lowerLimit=card?Math.max(90,card.top-12):global.innerHeight-12;const y=Math.min(lowerLimit,Math.max(88,point.y));speech.style.left=`${x}px`;speech.style.top=`${y}px`;
  }

  function tick(){
    ensureUi();registerProfile();const now=Date.now(),distance=distanceToMiracle(),npc=getMiracle();
    if(state.open){state.outsideAwarenessSince=0;if(!inTown()||distance>DIALOGUE_LEASH)closeDialogue();else facePlayer(npc);}else if(inTown()&&distance<=AWARENESS_RADIUS){state.outsideAwarenessSince=0;if(!state.seenInsideAwareness&&now>=state.nextBeckonAt)triggerBeckon(now);state.seenInsideAwareness=true;}else if(!inTown()||distance>AWARENESS_RESET_RADIUS){if(!state.outsideAwarenessSince)state.outsideAwarenessSince=now;if(now-state.outsideAwarenessSince>=OUTSIDE_RESET_MS){state.seenInsideAwareness=false;state.outsideAwarenessSince=0;}}
    if(now<state.beckonUntil&&!state.open&&inTown()){facePlayer(npc);placeBeckon();}else{const node=document.getElementById('miracle111Beckon');if(node)node.style.display='none';}
    if(state.open){positionSpeech();syncBeginPrompt();}
    requestAnimationFrame(tick);
  }

  try{
    const originalNearestThing=nearestThing;
    nearestThing=function(){if(inTown()&&distanceToMiracle()<=TALK_RADIUS)return{id:'miracle-111',type:'npc',name:'MIRACLE · 111 MIRACLES',text:'Talk with Miracle about the Real 111 Miracles archive.',radius:TALK_RADIUS};return originalNearestThing();};
  }catch(error){console.warn('Miracle 111 could not hook nearestThing.',error);}

  try{
    const originalInteract=interact;
    interact=function(){if(inTown()&&distanceToMiracle()<=TALK_RADIUS&&!state.open){openDialogue();return;}return originalInteract();};
  }catch(error){console.warn('Miracle 111 could not hook interact.',error);}

  try{
    const originalUpdateTownBots=updateTownBots;
    updateTownBots=function(dt){const npc=getMiracle(),now=Date.now(),locked=!!npc&&(state.open||now<state.beckonUntil);if(locked)npc.wait=Math.max(Number(npc.wait)||0,Math.max(.18,Number(dt)||0)+.12);originalUpdateTownBots(dt);if(locked){npc.wait=Math.max(Number(npc.wait)||0,.12);facePlayer(npc);}};
  }catch(error){console.warn('Miracle 111 could not hook town bot movement.',error);}

  global.ATMMiracle111=Object.freeze({open:openDialogue,close:closeDialogue,getMiracle,distance:distanceToMiracle,questions:QUESTIONS,doors:DOORS});
  ensureUi();requestAnimationFrame(tick);
})(window);
