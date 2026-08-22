/* ATM Town v235.12.1 — Neon Racer responsive cabinet polish */
(function initATMNeonRacer(global){
  'use strict';
  const panel=document.getElementById('neonRacerPanel'),canvas=document.getElementById('neonRacerCanvas');
  if(!panel||!canvas)return;
  const ctx=canvas.getContext('2d');
  const DESKTOP_VIEW=Object.freeze({w:900,h:520});
  const MOBILE_VIEW=Object.freeze({w:560,h:820});
  const ui={score:document.getElementById('neonRacerScore'),coins:document.getElementById('neonRacerCoins'),best:document.getElementById('neonRacerBest'),message:document.getElementById('neonRacerMessage'),start:document.getElementById('neonRacerStart'),close:document.getElementById('neonRacerClose'),left:document.getElementById('neonRacerLeft'),right:document.getElementById('neonRacerRight')};
  const state={open:false,running:false,last:0,time:0,distance:0,coins:0,best:0,speed:250,lane:1,targetLane:1,x:0,traffic:[],pickups:[],roadOffset:0,spawnTimer:0,coinTimer:0,viewW:DESKTOP_VIEW.w,viewH:DESKTOP_VIEW.h,lanes:[],roadLeft:0,roadRight:0,mobile:false};
  const KEY='atm_neon_racer_best_v1';
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const isMobileLayout=()=>global.matchMedia?.('(max-width:760px)')?.matches===true;

  function syncGeometry({preserveObjects=true}={}){
    const mobile=isMobileLayout(),view=mobile?MOBILE_VIEW:DESKTOP_VIEW;
    const changed=state.viewW!==view.w||state.viewH!==view.h||state.mobile!==mobile;
    state.mobile=mobile;state.viewW=view.w;state.viewH=view.h;
    state.roadLeft=Math.round(state.viewW*(mobile?.10:.18));
    state.roadRight=Math.round(state.viewW*(mobile?.90:.82));
    const roadWidth=state.roadRight-state.roadLeft,laneWidth=roadWidth/3;
    state.lanes=[state.roadLeft+laneWidth*.5,state.roadLeft+laneWidth*1.5,state.roadLeft+laneWidth*2.5];
    if(!preserveObjects||!changed){state.x=state.lanes[state.targetLane]??state.lanes[1];return;}
    state.x=state.lanes[state.targetLane]??state.lanes[1];
    for(const item of state.traffic)item.x=state.lanes[item.lane]??state.lanes[1];
    for(const item of state.pickups)item.x=state.lanes[item.lane]??state.lanes[1];
  }
  function loadBest(){state.best=Math.max(0,Number(localStorage.getItem(KEY)||0)||0);ui.best.textContent=String(state.best);}
  function saveBest(){const score=Math.floor(state.distance);if(score>state.best){state.best=score;try{localStorage.setItem(KEY,String(score));}catch(_){}}ui.best.textContent=String(state.best);}
  function resize(){syncGeometry();const dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.max(1,Math.round(state.viewW*dpr));canvas.height=Math.max(1,Math.round(state.viewH*dpr));canvas.dataset.orientation=state.mobile?'portrait':'landscape';}
  function reset(){syncGeometry({preserveObjects:false});state.time=0;state.distance=0;state.coins=0;state.speed=250;state.lane=1;state.targetLane=1;state.x=state.lanes[1];state.traffic=[];state.pickups=[];state.roadOffset=0;state.spawnTimer=.45;state.coinTimer=1.1;ui.score.textContent='0';ui.coins.textContent='0';loadBest();}
  function showMessage(title,detail,button='RACE AGAIN'){ui.message.querySelector('h3').textContent=title;const ps=ui.message.querySelectorAll('p');if(ps[0])ps[0].textContent=detail;ui.start.textContent=button;ui.message.classList.remove('hidden');}
  function open(){if(state.open)return;state.open=true;dialogOpen=true;joy.x=joy.y=0;knob.style.transform='translate(0,0)';if(jumpState?.active)jumpState.active=false;if(jetpackState?.active)endJetpack();global.atmVoiceEnterGameZone?.('neon-racer','NEON RACER VOICE','arcade','shared');document.body.classList.add('neon-racer-open');panel.classList.add('open');panel.setAttribute('aria-hidden','false');resize();reset();showMessage('Neon Racer','Dodge traffic, switch lanes, and collect ATM coins.','START RACE');render();}
  function close(){global.atmVoiceExitGameZone?.('neon-racer');state.open=false;state.running=false;dialogOpen=false;document.body.classList.remove('neon-racer-open');panel.classList.remove('open');panel.setAttribute('aria-hidden','true');}
  global.openATMNeonRacer=open;
  function start(){resize();reset();state.running=true;state.last=performance.now();ui.message.classList.add('hidden');requestAnimationFrame(loop);}
  function move(dir){if(!state.open||!state.running)return;state.targetLane=clamp(state.targetLane+dir,0,2);}
  function vehicleMetrics(player=false){if(state.mobile)return player?{w:50,h:86}:{w:54,h:92};return player?{w:38,h:66}:{w:44,h:76};}
  function spawnTraffic(){const occupied=new Set(state.traffic.filter(t=>t.y<state.viewH*.20).map(t=>t.lane));let options=[0,1,2].filter(l=>!occupied.has(l));if(!options.length)options=[0,1,2];const lane=options[Math.floor(Math.random()*options.length)],m=vehicleMetrics(false);state.traffic.push({lane,x:state.lanes[lane],y:-m.h,speed:.82+Math.random()*.3,shade:Math.floor(Math.random()*3)});}
  function spawnCoin(){const lane=Math.floor(Math.random()*3);state.pickups.push({lane,x:state.lanes[lane],y:-28,taken:false,phase:Math.random()*6});}
  function overlap(a,b){return a.x-a.w/2<b.x+b.w/2&&a.x+a.w/2>b.x-b.w/2&&a.y-a.h/2<b.y+b.h/2&&a.y+a.h/2>b.y-b.h/2;}
  function end(){if(!state.running)return;state.running=false;saveBest();showMessage('CRASHED',`Distance ${Math.floor(state.distance)} · Coins ${state.coins} · Best ${state.best}`);}
  function update(dt){state.time+=dt;state.speed=Math.min(520,250+state.time*8+state.distance*.018);state.distance+=state.speed*dt*.055;state.roadOffset=(state.roadOffset+state.speed*dt)%88;state.x+=(state.lanes[state.targetLane]-state.x)*(1-Math.exp(-12*dt));
    state.spawnTimer-=dt;if(state.spawnTimer<=0){spawnTraffic();state.spawnTimer=Math.max(.42,1.05-state.time*.009)*(0.78+Math.random()*.38);}state.coinTimer-=dt;if(state.coinTimer<=0){spawnCoin();state.coinTimer=.9+Math.random()*1.25;}
    for(const t of state.traffic)t.y+=state.speed*t.speed*dt;for(const c of state.pickups){c.y+=state.speed*.92*dt;c.phase+=dt*7;}
    state.traffic=state.traffic.filter(t=>t.y<state.viewH+120);state.pickups=state.pickups.filter(c=>!c.taken&&c.y<state.viewH+55);
    const pm=vehicleMetrics(true),tm=vehicleMetrics(false),car={x:state.x,y:state.viewH-(state.mobile?112:88),w:pm.w,h:pm.h};for(const t of state.traffic){if(overlap(car,{x:t.x,y:t.y,w:tm.w,h:tm.h})){end();return;}}
    for(const c of state.pickups){if(Math.hypot(car.x-c.x,car.y-c.y)<(state.mobile?38:30)){c.taken=true;state.coins++;ui.coins.textContent=String(state.coins);}}
    ui.score.textContent=String(Math.floor(state.distance));global.atmPublishArcadeGameState?.('neon-racer',{x:state.x,lane:state.targetLane,distance:state.distance});}
  function drawRoad(){const W=state.viewW,H=state.viewH,g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#071325');g.addColorStop(1,'#02050a');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#071017';ctx.fillRect(state.roadLeft,0,state.roadRight-state.roadLeft,H);ctx.strokeStyle='rgba(88,241,230,.52)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(state.roadLeft,0);ctx.lineTo(state.roadLeft,H);ctx.moveTo(state.roadRight,0);ctx.lineTo(state.roadRight,H);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.19)';ctx.lineWidth=3;ctx.setLineDash([38,50]);ctx.lineDashOffset=state.roadOffset;for(const x of [(state.lanes[0]+state.lanes[1])/2,(state.lanes[1]+state.lanes[2])/2]){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}ctx.setLineDash([]);
    const sideWidth=Math.max(30,state.roadLeft-14);for(let i=0;i<(state.mobile?28:20);i++){const y=(i*73+state.roadOffset*1.4)%H;ctx.fillStyle=i%2?'rgba(255,79,163,.25)':'rgba(88,241,230,.22)';const len=Math.min(42,sideWidth*.55),left=12+(i*37)%Math.max(14,sideWidth-len);ctx.fillRect(left,y,len,3);ctx.fillRect(W-left-len,y,len,3);}}
  function drawCar(x,y,player=false,shade=0){const m=vehicleMetrics(player),w=m.w,h=m.h;ctx.save();ctx.translate(x,y);ctx.fillStyle=player?'#58f1e6':shade===0?'#ff4fa3':shade===1?'#ffd166':'#8e65ff';ctx.strokeStyle='#02080c';ctx.lineWidth=3;ctx.fillRect(-w/2,-h/2,w,h);ctx.strokeRect(-w/2,-h/2,w,h);ctx.fillStyle='#07141c';ctx.fillRect(-w*.31,-h*.34,w*.62,h*.31);ctx.fillStyle=player?'#ff4fa3':'#58f1e6';ctx.fillRect(-w*.42,h*.27,w*.84,Math.max(7,h*.10));ctx.fillStyle='#fff';ctx.fillRect(-w*.44,-h*.46,w*.20,Math.max(5,h*.07));ctx.fillRect(w*.24,-h*.46,w*.20,Math.max(5,h*.07));ctx.restore();}
  function render(){const dpr=Math.min(2,devicePixelRatio||1),W=state.viewW,H=state.viewH;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);drawRoad();for(const c of state.pickups){ctx.save();ctx.translate(c.x,c.y);ctx.scale(1+Math.sin(c.phase)*.08,1+Math.sin(c.phase)*.08);ctx.fillStyle='#ffd166';ctx.beginPath();ctx.arc(0,0,state.mobile?15:12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#543800';ctx.font=`1000 ${state.mobile?17:14}px system-ui`;ctx.textAlign='center';ctx.fillText('$',0,state.mobile?6:5);ctx.restore();}for(const t of state.traffic)drawCar(t.x,t.y,false,t.shade);drawCar(state.x,H-(state.mobile?112:88),true);ctx.setTransform(1,0,0,1,0,0);}
  function loop(now){if(!state.open||!state.running)return;const dt=Math.min(.033,Math.max(.001,(now-state.last)/1000));state.last=now;update(dt);render();if(state.running)requestAnimationFrame(loop);}
  const press=(button,dir)=>{const fn=e=>{e.preventDefault();move(dir);button.classList.add('active');setTimeout(()=>button.classList.remove('active'),100)};button.addEventListener('pointerdown',fn,{passive:false});};press(ui.left,-1);press(ui.right,1);
  global.addEventListener('keydown',e=>{if(!state.open)return;const k=e.key.toLowerCase();if(state.running&&(k==='a'||e.key==='ArrowLeft')){e.preventDefault();move(-1)}else if(state.running&&(k==='d'||e.key==='ArrowRight')){e.preventDefault();move(1)}else if(e.key==='Escape'){e.preventDefault();close();}});
  ui.start.addEventListener('click',start);ui.close.addEventListener('click',close);panel.addEventListener('pointerdown',e=>{if(e.target===panel)close();});global.addEventListener('resize',()=>{if(state.open){resize();render();}},{passive:true});global.addEventListener('orientationchange',()=>setTimeout(()=>{if(state.open){resize();render();}},120));
})(window);
