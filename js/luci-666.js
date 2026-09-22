/*
 * ATM Town — Luci / $666 project NPC
 * Pre-written, zero-AI dialogue with proximity beckoning and patrol pause.
 * Real-token reward settlement is intentionally left behind a server hook;
 * this browser module never holds an XRPL secret or pretends a payout occurred.
 */
(function initializeLuci666(global){
  'use strict';

  if(global.ATMLuci666)return;

  const LUCI_ID='bot-luci';
  const TALK_RADIUS=92;
  const AWARENESS_RADIUS=210;
  const AWARENESS_RESET_RADIUS=300;
  const DIALOGUE_LEASH=190;
  const BECKON_MS=6200;
  const BECKON_COOLDOWN_MS=45000;
  const OUTSIDE_RESET_MS=1200;
  const ISSUER='rhvf9fe6PP3GC8Bku2Ug7iQPjPDxYZfrxN';

  const state={
    open:false,
    beckonUntil:0,
    nextBeckonAt:0,
    seenInsideAwareness:false,
    outsideAwarenessSince:0,
    beckonLine:'',
    answered:new Set(),
    answerId:'welcome'
  };

  const QUESTIONS=Object.freeze([
    {id:'what',label:'What is $666?',answer:'$666 is a community memecoin on the XRP Ledger. The project is built around a simple monthly drawing, the LightBringers community, and long-term XRPL participation. It is still a memecoin, so treat it as high risk — never as a guaranteed investment.'},
    {id:'drawing',label:'How does the monthly drawing work?',answer:'Hold at least 1 $666 in a valid XRPL wallet. On the 6th of each month at 00:00 UTC, eligible wallets are snapshotted. Thirteen wallets are selected at random and each winner receives 666 $666. No staking or signup is required for the drawing.'},
    {id:'meaning',label:'Why is it called 666?',answer:'Here, 666 is used as a playful symbol of balance and alignment — flipping an old warning label into community lore about luck, consistency and bringing the light. The community calls itself the LightBringers.'},
    {id:'amount',label:'How many tokens do I need?',answer:'One $666 is enough to qualify for the monthly drawing while you hold it. The published weighting is 1 coin = 1 entry, 66 coins = 7 entries, and 666 or more = 13 entries. Holding more changes entry weight; it never guarantees a win.'},
    {id:'lightbringers',label:'What are LightBringers?',answer:'LightBringers is the community name. The vibe is simple: bring the light, have some fun, help people understand XRPL, and favor consistency over one hype cycle.'},
    {id:'snapshot',label:'When is the snapshot?',answer:'The published schedule is the 6th of each month at 12:00 AM UTC. If your wallet still meets the eligibility rules at that snapshot, it can be included in that month’s drawing.'},
    {id:'repeat',label:'Can I win more than once?',answer:'Yes. A wallet can win again in a later month if it remains eligible. Winning once does not permanently remove that wallet from future monthly drawings.'},
    {id:'issuer',label:'What is the official issuer?',answer:`The XRPL issuer supplied by the project is ${ISSUER}. Always verify that exact issuer before setting a trustline or swapping because unrelated tokens can use the same 666 ticker.`},
    {id:'buy',label:'Where can I get $666?',answer:'Use an XRPL wallet and verify the official issuer first. The project points people toward XRPL DEX venues and tracking tools such as First Ledger and XPMarket. Never trust a random 666 token just because the ticker matches.'},
    {id:'tokenomics',label:'What are the tokenomics?',answer:'The published total supply is 10,000,000 $666: 66.6% for the community rewards pool, 26.6% for the developer wallet, and about 6.8% circulating for listings, liquidity and early distribution.'},
    {id:'roadmap',label:'What is planned for the project?',answer:'The project promotes the monthly drawing now, plus community and merch activity. It has also discussed optional farming through OpulFi and future NFTs, mini-games and DAO voting. Live APRs and future features can change, so Luci will not invent a number or pretend a roadmap item has shipped.'},
    {id:'price',label:'Will $666 go up?',answer:'Nobody knows. $666 is a memecoin and price can move sharply in either direction. The monthly drawing is a project mechanic; it is not a promise of profit, price appreciation, APY or a future listing.'},
    {id:'gift',label:'Can I get my 6 $666 welcome gift?',answer:'You found me — so yes, the ATM Town welcome reward is 6 $666 once per eligible visitor. The claim button below uses ATM Town’s reward hook. A real payout is only confirmed after the server returns a validated XRPL transaction; the game will never fake a successful send.'}
  ]);

  function getLuci(){
    try{return Array.isArray(townBots)?townBots.find(bot=>bot&&bot.id===LUCI_ID)||null:null;}catch(_error){return null;}
  }
  function inTown(){try{return currentMap==='town';}catch(_error){return false;}}
  function distanceToLuci(){const luci=getLuci();if(!luci||!inTown())return Infinity;try{return Math.hypot(player.x-luci.x,player.y-luci.y);}catch(_error){return Infinity;}}
  function facePlayer(luci){
    if(!luci)return;
    try{
      const dx=player.x-luci.x,dy=player.y-luci.y;
      luci.dir=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
      luci.moving=false;luci.animTimer=0;luci.frame=1;
    }catch(_error){}
  }

  function ensureUi(){
    if(document.getElementById('luci666Panel'))return;
    const style=document.createElement('style');
    style.dataset.luci666='1';
    style.textContent=`
#luci666Beckon{position:fixed;z-index:210;display:none;max-width:min(250px,62vw);padding:7px 10px;border:1px solid rgba(255,91,91,.5);border-radius:12px;background:rgba(24,8,13,.94);color:#fff1ef;font:900 10px/1.3 system-ui;text-align:center;pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,.42),0 0 20px rgba(255,82,82,.12);transform:translate(-50%,-100%)}
#luci666Beckon::after{content:'';position:absolute;left:50%;bottom:-7px;transform:translateX(-50%);border:7px solid transparent;border-top-color:rgba(255,91,91,.5);border-bottom:0}
#luci666Panel{position:fixed;inset:0;z-index:9800;display:none;align-items:flex-end;justify-content:center;padding:14px;background:linear-gradient(180deg,rgba(2,6,10,.18),rgba(2,6,10,.7));pointer-events:none}
#luci666Panel.open{display:flex}#luci666Card{width:min(720px,100%);max-height:min(640px,84dvh);display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden;border:1px solid rgba(255,86,86,.5);border-radius:20px;background:linear-gradient(180deg,#281017,#090f16);box-shadow:0 28px 90px rgba(0,0,0,.72),0 0 34px rgba(255,75,75,.09);pointer-events:auto}
.luci666Header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 13px;border-bottom:1px solid rgba(255,255,255,.08)}.luci666Identity{display:flex;align-items:center;gap:10px;min-width:0}.luci666Avatar{width:48px;height:52px;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 7px 8px rgba(0,0,0,.5))}.luci666Eyebrow{color:#ff7676;font:1000 8px/1 system-ui;letter-spacing:.16em}.luci666Header h2{margin:3px 0 0;color:#fff;font-size:17px}.luci666Header small{display:block;margin-top:2px;color:#ba9ea3;font-size:8px}.luci666Close{flex:0 0 38px;width:38px;height:38px;border:1px solid rgba(255,255,255,.14);border-radius:11px;background:#34212a;color:#fff;font-size:22px;font-weight:900}
.luci666Body{min-height:0;overflow-y:auto;padding:12px;display:grid;gap:10px}.luci666Answer{padding:12px;border:1px solid rgba(255,105,105,.16);border-radius:14px;background:rgba(255,255,255,.035)}.luci666Answer strong{display:block;color:#ff8d75;font-size:10px;letter-spacing:.09em}.luci666Answer p{margin:6px 0 0;color:#f3e7e9;font:750 12px/1.48 system-ui}.luci666Questions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.luci666Question{min-width:0;min-height:42px;padding:8px 9px;border:1px solid rgba(255,255,255,.11);border-radius:10px;background:#18242d;color:#eaffff;font:900 9px/1.25 system-ui;text-align:left}.luci666Question:hover,.luci666Question:focus-visible{border-color:rgba(255,103,103,.58);outline:none}.luci666Question.asked{border-color:rgba(255,209,102,.28);color:#ffe3a0}.luci666Question.reward{grid-column:1/-1;border-color:rgba(255,209,102,.46);background:linear-gradient(90deg,rgba(255,76,76,.15),rgba(255,209,102,.1));color:#ffd166;text-align:center}
.luci666Footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;border-top:1px solid rgba(255,255,255,.07);color:#917b81;font:800 7px/1.35 system-ui}.luci666Footer b{color:#ff8d75}.luci666Claim{display:none;flex:0 0 auto;min-height:38px;padding:0 12px;border:0;border-radius:10px;background:linear-gradient(90deg,#ff6969,#ffd166);color:#2a1010;font:1000 9px system-ui}.luci666Claim.visible{display:block}.luci666Claim:disabled{opacity:.55}.luci666Status{color:#ffd166;font:900 8px/1.35 system-ui;text-align:right}
body.luci-666-open #hint,body.luci-666-open #hudSocialRail,body.luci-666-open #chatComposerDock{visibility:hidden!important;pointer-events:none!important}
@media(max-width:600px){#luci666Panel{padding:6px}#luci666Card{max-height:calc(var(--vv-height,100dvh) - 12px);border-radius:16px}.luci666Header{padding:9px}.luci666Avatar{width:40px;height:44px}.luci666Header h2{font-size:14px}.luci666Body{padding:9px}.luci666Questions{grid-template-columns:1fr}.luci666Question.reward{grid-column:auto}.luci666Answer p{font-size:11px}.luci666Footer{align-items:flex-start;flex-direction:column}.luci666Status{text-align:left}}
`;
    document.head.appendChild(style);

    const beckon=document.createElement('div');beckon.id='luci666Beckon';beckon.setAttribute('aria-hidden','true');document.body.appendChild(beckon);
    const panel=document.createElement('div');panel.id='luci666Panel';panel.setAttribute('aria-hidden','true');panel.innerHTML=`
<div id="luci666Card" role="dialog" aria-modal="true" aria-labelledby="luci666Title">
  <header class="luci666Header"><div class="luci666Identity"><img class="luci666Avatar" src="assets/characters/thumbnails/character-luci.webp" alt="Luci"><div><div class="luci666Eyebrow">LIGHTBRINGER · XRPL</div><h2 id="luci666Title">Luci · $666</h2><small>Pre-written project guide · no AI usage</small></div></div><button class="luci666Close" id="luci666Close" type="button" aria-label="Close Luci conversation">×</button></header>
  <main class="luci666Body"><section class="luci666Answer"><strong id="luci666AnswerTitle">LUCI</strong><p id="luci666AnswerText"></p></section><div class="luci666Questions" id="luci666Questions"></div></main>
  <footer class="luci666Footer"><span><b>VERIFY:</b> ${ISSUER}<br>$666 is a high-risk memecoin. Nothing Luci says is financial advice.</span><div><button class="luci666Claim" id="luci666Claim" type="button">CLAIM 6 $666</button><div class="luci666Status" id="luci666Status"></div></div></footer>
</div>`;
    document.body.appendChild(panel);
    document.getElementById('luci666Close')?.addEventListener('click',closeDialogue);
    document.getElementById('luci666Claim')?.addEventListener('click',requestReward);
    renderQuestions();showAnswer('welcome');
  }

  function showAnswer(id){
    ensureUi();state.answerId=id;
    const item=QUESTIONS.find(q=>q.id===id);
    const text=document.getElementById('luci666AnswerText');
    const claim=document.getElementById('luci666Claim');
    if(id==='welcome'){
      if(text)text.textContent='Well, look who wandered into my corner of ATM Town. Pick a question, LightBringer. I deal in sixes — and I’ve got a one-time 6 $666 welcome gift for eligible visitors.';
    }else if(item){
      state.answered.add(id);if(text)text.textContent=item.answer;
    }
    if(claim)claim.classList.toggle('visible',id==='gift');
    renderQuestions();
  }

  function renderQuestions(){
    const host=document.getElementById('luci666Questions');if(!host)return;host.textContent='';
    const initial=['what','drawing','meaning','amount','lightbringers'];
    const followups=['snapshot','repeat','issuer','buy','tokenomics','roadmap','price'];
    const visible=state.answered.size?initial.concat(followups):initial;
    for(const id of visible){
      const q=QUESTIONS.find(item=>item.id===id);if(!q)continue;
      const button=document.createElement('button');button.type='button';button.className='luci666Question'+(state.answered.has(id)?' asked':'');button.textContent=q.label;button.addEventListener('click',()=>showAnswer(id));host.appendChild(button);
    }
    const gift=QUESTIONS.find(q=>q.id==='gift');const button=document.createElement('button');button.type='button';button.className='luci666Question reward'+(state.answered.has('gift')?' asked':'');button.textContent=gift.label;button.addEventListener('click',()=>showAnswer('gift'));host.appendChild(button);
  }

  function openDialogue(){
    if(!inTown()||distanceToLuci()>TALK_RADIUS+18)return false;
    ensureUi();state.open=true;state.beckonUntil=0;
    const panel=document.getElementById('luci666Panel');if(panel){panel.classList.add('open');panel.setAttribute('aria-hidden','false');}
    document.body.classList.add('luci-666-open');
    const beckon=document.getElementById('luci666Beckon');if(beckon)beckon.style.display='none';
    facePlayer(getLuci());showAnswer(state.answerId||'welcome');return true;
  }
  function closeDialogue(){
    state.open=false;const panel=document.getElementById('luci666Panel');if(panel){panel.classList.remove('open');panel.setAttribute('aria-hidden','true');}
    document.body.classList.remove('luci-666-open');
  }

  async function requestReward(){
    const button=document.getElementById('luci666Claim'),status=document.getElementById('luci666Status');
    if(button)button.disabled=true;if(status)status.textContent='Claiming 6 $666 from Payload…';
    try{
      if(typeof global.atmApiWithAuth!=='function')throw new Error('Sign in to ATM Town before claiming Luci’s reward.');
      const result=await global.atmApiWithAuth('/api/reward-claim',{
        method:'POST',
        body:JSON.stringify({program:'luci-666-welcome'})
      });
      finishReward({
        ok:result?.ok===true,
        pending:result?.pending===true,
        message:result?.message||(result?.ok===true?'6 $666 sent and confirmed on XRPL. 🔥':'Reward claim is still processing.')
      });
    }catch(error){
      finishReward({ok:false,message:error?.message||'Could not claim Luci’s $666 reward yet.'});
    }
  }
  function finishReward(result={}){
    const button=document.getElementById('luci666Claim'),status=document.getElementById('luci666Status');
    if(button)button.disabled=!!result.ok;
    if(status)status.textContent=result.ok?(result.message||'6 $666 sent and confirmed on XRPL. 🔥'):(result.message||'Could not claim the reward yet.');
  }

  function triggerBeckon(now){
    if(state.beckonUntil>now)return;
    const lines=['Hey, LightBringer… got a second?','Come here. I’ve got 6 $666 for visitors.','You there — want to know why everything is sixes?','Hold up, traveler. Let Luci bring you the light.'];
    state.beckonLine=lines[Math.floor(Math.random()*lines.length)];
    state.beckonUntil=now+BECKON_MS;
    state.nextBeckonAt=now+BECKON_COOLDOWN_MS;
    const node=document.getElementById('luci666Beckon');
    if(node){node.textContent=state.beckonLine;node.style.display='block';}
  }

  function placeBeckon(){
    const node=document.getElementById('luci666Beckon'),luci=getLuci();if(!node||!luci||!inTown())return;
    try{
      const canvas=document.getElementById('game'),rect=canvas.getBoundingClientRect();
      const sx=(luci.x-cam.x)*zoom,sy=(luci.y-64-cam.y)*zoom;
      const px=rect.left+(sx/Math.max(1,W))*rect.width,py=rect.top+(sy/Math.max(1,H))*rect.height;
      node.style.left=`${px}px`;node.style.top=`${py}px`;
      if(node.textContent!==state.beckonLine)node.textContent=state.beckonLine;
    }catch(_error){}
  }

  function tick(){
    ensureUi();const now=Date.now(),distance=distanceToLuci(),luci=getLuci();
    if(state.open){
      state.outsideAwarenessSince=0;
      if(!inTown()||distance>DIALOGUE_LEASH)closeDialogue();else facePlayer(luci);
    }else if(inTown()&&distance<=AWARENESS_RADIUS){
      state.outsideAwarenessSince=0;
      if(!state.seenInsideAwareness&&now>=state.nextBeckonAt)triggerBeckon(now);
      state.seenInsideAwareness=true;
    }else if(!inTown()||distance>AWARENESS_RESET_RADIUS){
      if(!state.outsideAwarenessSince)state.outsideAwarenessSince=now;
      if(now-state.outsideAwarenessSince>=OUTSIDE_RESET_MS){
        state.seenInsideAwareness=false;
        state.outsideAwarenessSince=0;
      }
    }
    if(now<state.beckonUntil&&!state.open&&inTown()){
      facePlayer(luci);placeBeckon();
    }else{
      const node=document.getElementById('luci666Beckon');if(node)node.style.display='none';
    }
    requestAnimationFrame(tick);
  }

  // Make Luci a normal ACTION target without changing the authored interaction mask.
  try{
    const originalNearestThing=nearestThing;
    nearestThing=function(){
      if(inTown()&&distanceToLuci()<=TALK_RADIUS)return{id:'luci-666',type:'npc',name:'LUCI · $666',text:'Talk with Luci about $666 and the LightBringers.',radius:TALK_RADIUS};
      return originalNearestThing();
    };
  }catch(error){console.warn('Luci 666 could not hook nearestThing.',error);}

  try{
    const originalInteract=interact;
    interact=function(){if(inTown()&&distanceToLuci()<=TALK_RADIUS&&!state.open){openDialogue();return;}return originalInteract();};
  }catch(error){console.warn('Luci 666 could not hook interact.',error);}

  // Patrol wrapper: while beckoning or talking, only Luci is frozen. All other
  // town bots continue through the original authoritative movement update.
  try{
    const originalUpdateTownBots=updateTownBots;
    updateTownBots=function(dt){
      const luci=getLuci(),now=Date.now(),locked=!!luci&&(state.open||now<state.beckonUntil);
      if(locked)luci.wait=Math.max(Number(luci.wait)||0,Math.max(.18,Number(dt)||0)+.12);
      originalUpdateTownBots(dt);
      if(locked){luci.wait=Math.max(Number(luci.wait)||0,.12);facePlayer(luci);}
    };
  }catch(error){console.warn('Luci 666 could not hook town bot movement.',error);}

  global.ATMLuci666=Object.freeze({open:openDialogue,close:closeDialogue,getLuci,distance:distanceToLuci,issuer:ISSUER,questions:QUESTIONS,requestReward});
  ensureUi();requestAnimationFrame(tick);
})(window);