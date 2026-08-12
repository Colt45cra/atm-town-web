/* ===== v195: Flappy Jetpack stabilized flight angle + authored Arcade interaction reach ===== */
(()=>{
  const panel=document.getElementById('flappyJetpackPanel');
  const canvas=document.getElementById('flappyJetpackCanvas');
  const stage=canvas?.closest('.flappyJetpackStage');
  const ctx=canvas?.getContext('2d');
  if(!panel||!canvas||!stage||!ctx)return;

  const ui={
    score:document.getElementById('flappyJetpackScore'),coins:document.getElementById('flappyJetpackCoins'),best:document.getElementById('flappyJetpackBest'),
    mode:document.getElementById('flappyJetpackMode'),message:document.getElementById('flappyJetpackMessage'),detail:document.getElementById('flappyJetpackMessageDetail'),
    start:document.getElementById('flappyJetpackStart'),close:document.getElementById('flappyJetpackClose')
  };
  const VIEW_H=540,MIN_VIEW_W=360,MAX_VIEW_W=960,PIPE_W=82;
  const state={open:false,running:false,over:false,last:0,time:0,viewW:960,score:0,coins:0,best:0,speed:185,flame:0,astronaut:false};
  const flyer={x:240,y:270,vy:0,rotation:0};
  let pipes=[];

  function isAstronaut(){return typeof lockerLoadout!=='undefined'&&lockerLoadout?.body==='body:astronaut';}
  function loadBest(){try{state.best=Math.max(0,Number(localStorage.getItem('atm_flappy_jetpack_best_v1')||0));}catch(_e){state.best=0;}ui.best.textContent=String(state.best);}
  function saveBest(){if(state.score<=state.best)return;state.best=state.score;try{localStorage.setItem('atm_flappy_jetpack_best_v1',String(state.best));}catch(_e){}ui.best.textContent=String(state.best);}
  function resize(){
    const rect=stage.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const dpr=Math.min(2,Math.max(1,window.devicePixelRatio||1));
    const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    state.viewW=Math.max(MIN_VIEW_W,Math.min(MAX_VIEW_W,VIEW_H*(rect.width/rect.height)));
    flyer.x=state.viewW*.28;
  }
  function randomGap(){
    const gapH=Math.max(142,188-Math.min(38,state.score*1.8));
    const margin=72;
    const gapY=margin+Math.random()*(VIEW_H-gapH-margin*2);
    return{gapY,gapH};
  }
  function makePipe(x){const gap=randomGap();return{x,gapY:gap.gapY,gapH:gap.gapH,passed:false,coinTaken:false,coinOffset:(Math.random()-.5)*Math.min(70,gap.gapH*.4)};}
  function reset(){
    resize();state.running=false;state.over=false;state.time=0;state.score=0;state.coins=0;state.speed=185;state.flame=0;state.astronaut=isAstronaut();
    flyer.x=state.viewW*.28;flyer.y=VIEW_H*.48;flyer.vy=0;flyer.rotation=0;
    pipes=[];let x=state.viewW+180;for(let i=0;i<4;i++){pipes.push(makePipe(x));x+=330;}
    ui.score.textContent='0';ui.coins.textContent='0';ui.mode.textContent=state.astronaut?'ASTRONAUT LOW GRAVITY':'STANDARD FLIGHT';loadBest();
  }
  function setMessage(title,detail,button){ui.message.querySelector('h3').textContent=title;ui.detail.textContent=detail;ui.start.textContent=button;ui.message.classList.remove('hidden');}
  function showIntro(){reset();setMessage('Flappy Jetpack','Tap anywhere in the play area. Desktop players can also use Space or the up arrow.','START FLIGHT');}
  function start(){reset();state.running=true;state.last=performance.now();ui.message.classList.add('hidden');window.atmLeaderboardStart?.('flappy-jetpack',{mode:state.astronaut?'astronaut':'standard'});flap();requestAnimationFrame(loop);}
  function end(reason){if(!state.running)return;state.running=false;state.over=true;saveBest();window.atmLeaderboardSubmit?.('flappy-jetpack',{score_value:state.score,secondary_value:state.coins,details:{coins:state.coins,duration_ms:Math.round(state.time*1000)}});setMessage('FLIGHT OVER',`${reason} · Score ${state.score} · Coins ${state.coins} · Best ${state.best}`,'FLY AGAIN');}
  function open(){
    if(state.open)return;state.open=true;dialogOpen=true;joy.x=joy.y=0;knob.style.transform='translate(0,0)';
    if(jumpState?.active)jumpState.active=false;if(jetpackState?.active)endJetpack();
    window.atmVoiceEnterGameZone?.('flappy-jetpack','FLAPPY JETPACK VOICE','arcade','shared');document.body.classList.add('flappy-jetpack-open');panel.classList.add('open');panel.setAttribute('aria-hidden','false');showIntro();resize();render();
  }
  function close(){window.atmVoiceExitGameZone?.('flappy-jetpack');state.open=false;state.running=false;dialogOpen=false;document.body.classList.remove('flappy-jetpack-open');panel.classList.remove('open');panel.setAttribute('aria-hidden','true');}
  window.openATMFlappyJetpack=open;

  function flap(){if(!state.running)return;flyer.vy=state.astronaut?-315:-385;state.flame=.22;}
  function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
  function update(dt){
    state.time+=dt;state.flame=Math.max(0,state.flame-dt);
    state.speed=185+Math.min(170,state.score*5+state.time*1.2);
    const gravity=state.astronaut?610:900,maxFall=state.astronaut?410:570;
    flyer.vy=Math.min(maxFall,flyer.vy+gravity*dt);flyer.y+=flyer.vy*dt;
    // Keep Flappy Jetpack readable: velocity influences a small lean, but the
    // body angle eases toward it instead of snapping after every thrust tap.
    const targetRotation=Math.max(-.13,Math.min(.24,flyer.vy/1500));
    const rotationResponse=flyer.vy<0?3.2:2.4;
    flyer.rotation+=(targetRotation-flyer.rotation)*(1-Math.exp(-rotationResponse*dt));
    for(const p of pipes)p.x-=state.speed*dt;
    while(pipes.length&&pipes[0].x+PIPE_W<-30)pipes.shift();
    while(!pipes.length||pipes[pipes.length-1].x<state.viewW+380){const last=pipes[pipes.length-1];pipes.push(makePipe((last?last.x:state.viewW)+330));}

    const playerBox={x:flyer.x-15,y:flyer.y-20,w:30,h:40};
    for(const p of pipes){
      if(!p.passed&&p.x+PIPE_W<flyer.x){p.passed=true;state.score++;ui.score.textContent=String(state.score);}
      const top={x:p.x,y:0,w:PIPE_W,h:p.gapY};
      const bottom={x:p.x,y:p.gapY+p.gapH,w:PIPE_W,h:VIEW_H-(p.gapY+p.gapH)};
      if(overlap(playerBox,top)||overlap(playerBox,bottom)){end('Tower collision');return;}
      if(!p.coinTaken){const cx=p.x+PIPE_W*.5,cy=p.gapY+p.gapH*.5+p.coinOffset;if(Math.hypot(flyer.x-cx,flyer.y-cy)<24){p.coinTaken=true;state.coins++;ui.coins.textContent=String(state.coins);}}
    }
    if(flyer.y<22||flyer.y>VIEW_H-22)end(flyer.y<22?'Too high':'Fell below the skyline');
    window.atmPublishArcadeGameState?.('flappy-jetpack',{x:flyer.x,y:flyer.y,rotation:flyer.rotation,vy:flyer.vy,time:state.time});
  }

  function drawBackground(){
    const g=ctx.createLinearGradient(0,0,0,VIEW_H);g.addColorStop(0,'#07192c');g.addColorStop(.58,'#1a4962');g.addColorStop(1,'#ff7d7a');ctx.fillStyle=g;ctx.fillRect(0,0,state.viewW,VIEW_H);
    ctx.fillStyle='rgba(255,255,255,.45)';for(let i=0;i<42;i++){const x=((i*191-state.time*state.speed*.08)%1200+1200)%1200,y=28+(i*53)%250;ctx.fillRect(x,y,2,2);}
    const parallax=(state.time*state.speed*.18)%220;ctx.fillStyle='rgba(2,9,17,.55)';for(let i=-1;i<Math.ceil(state.viewW/220)+2;i++){const x=i*220-parallax,h=95+((i+20)*67)%170;ctx.fillRect(x,VIEW_H-h,170,h);ctx.fillStyle='rgba(88,241,230,.1)';for(let yy=VIEW_H-25;yy>VIEW_H-h+20;yy-=24)for(let xx=x+18;xx<x+150;xx+=27)ctx.fillRect(xx,yy,5,8);ctx.fillStyle='rgba(2,9,17,.55)';}
  }
  function drawPipe(p){
    const topH=p.gapY,bottomY=p.gapY+p.gapH;
    const gradTop=ctx.createLinearGradient(p.x,0,p.x+PIPE_W,0);gradTop.addColorStop(0,'#183743');gradTop.addColorStop(.5,'#4f7680');gradTop.addColorStop(1,'#132b35');
    ctx.fillStyle=gradTop;ctx.fillRect(p.x,0,PIPE_W,topH);ctx.fillRect(p.x,bottomY,PIPE_W,VIEW_H-bottomY);
    ctx.fillStyle='#58f1e6';ctx.fillRect(p.x-7,topH-18,PIPE_W+14,18);ctx.fillRect(p.x-7,bottomY,PIPE_W+14,18);
    ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(p.x+10,0,7,Math.max(0,topH-18));ctx.fillRect(p.x+10,bottomY+18,7,Math.max(0,VIEW_H-bottomY-18));
    if(!p.coinTaken){const cx=p.x+PIPE_W*.5,cy=p.gapY+p.gapH*.5+p.coinOffset;ctx.fillStyle='#ffd166';ctx.beginPath();ctx.arc(cx,cy,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5c3b00';ctx.font='900 13px system-ui';ctx.textAlign='center';ctx.fillText('$',cx,cy+4);}
  }
  function currentSprite(){
    let characterId=typeof selectedCharacter!=='undefined'?selectedCharacter:'classic';let config=CHARACTER_SHEETS?.[characterId],image=characterSheetImgs?.[characterId];
    const bodyId=typeof lockerLoadout!=='undefined'?lockerLoadout?.body:null;
    if(characterId==='classic'&&bodyId&&ATM_EQUIPMENT_SHEETS?.[bodyId]&&equipmentSheetImgs?.[bodyId]?.complete&&equipmentSheetImgs[bodyId].naturalWidth){config=ATM_EQUIPMENT_SHEETS[bodyId];image=equipmentSheetImgs[bodyId];}
    return{characterId,config,image};
  }
  function drawLayer(image,config,row,frame,scale,footX=0,footY=27){
    if(!image?.complete||!image.naturalWidth||!config)return null;
    const cols=config.cols||3,rows=config.rows||4,fw=Math.floor(image.naturalWidth/cols),fh=Math.floor(image.naturalHeight/rows),ax=Number.isFinite(config.anchorX)?config.anchorX:fw/2,ay=Number.isFinite(config.anchorY)?config.anchorY:fh-1;
    const x=Math.round(footX-ax*scale),y=Math.round(footY-ay*scale),w=Math.round(fw*scale),h=Math.round(fh*scale);
    ctx.drawImage(image,frame*fw,row*fh,fw,fh,x,y,w,h);return{x,y,w,h,fw,fh};
  }
  function drawFlyer(){
    const {characterId,config,image}=currentSprite();if(!config||!image?.complete||!image.naturalWidth){ctx.fillStyle='#58f1e6';ctx.fillRect(flyer.x-15,flyer.y-20,30,40);return;}
    const dir='right',row=Math.max(0,(config.rowOrder||['down','left','up','right']).indexOf(dir)),frame=1,scale=.18;
    ctx.save();ctx.translate(flyer.x,flyer.y);ctx.rotate(flyer.rotation);
    drawLayer(image,config,row,frame,scale);
    const drawEquip=(slotId)=>{const itemId=lockerLoadout?.[slotId];if(!itemId)return;const ec=ATM_EQUIPMENT_SHEETS?.[itemId],ei=equipmentSheetImgs?.[itemId];drawLayer(ei,ec,Math.max(0,(ec?.rowOrder||['down','left','up','right']).indexOf(dir)),frame,scale);};
    if(characterId==='classic'){drawEquip('katana');for(const slotId of ['chest','face','feet','head'])drawEquip(slotId);}
    let overlay=null;
    if(jetpackOverlayImg?.complete&&jetpackOverlayImg.naturalWidth){overlay=drawLayer(jetpackOverlayImg,jetpackOverlaySheet,Math.max(0,(jetpackOverlaySheet.rowOrder||['down','left','up','right']).indexOf(dir)),frame,scale);}
    if(characterId==='classic')drawEquip('hands');
    if(state.flame>0&&overlay){
      const nozzle={x:76,y:251},nozzleX=overlay.x+(nozzle.x/overlay.fw)*overlay.w,nozzleY=overlay.y+(nozzle.y/overlay.fh)*overlay.h;
      const pulse=4+Math.abs(Math.sin(performance.now()*.03))*7;
      ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle='rgba(88,241,230,.8)';ctx.beginPath();ctx.moveTo(nozzleX-2.5,nozzleY);ctx.lineTo(nozzleX+2.5,nozzleY);ctx.lineTo(nozzleX,nozzleY+13+pulse);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,139,36,.98)';ctx.beginPath();ctx.moveTo(nozzleX-1.7,nozzleY+.5);ctx.lineTo(nozzleX+1.7,nozzleY+.5);ctx.lineTo(nozzleX,nozzleY+7+pulse*.55);ctx.closePath();ctx.fill();ctx.restore();
    }
    ctx.restore();
  }
  function drawRemoteFlyers(){for(const remote of window.atmArcadeGameRemotes?.('flappy-jetpack')||[]){const s=remote.miniState||{};window.atmDrawArcadeMiniGhost?.(ctx,remote,Number.isFinite(s.x)?s.x:state.viewW*.28,(Number.isFinite(s.y)?s.y:VIEW_H*.48)+27,'right',1,.18);}}
  function render(){
    ctx.setTransform(canvas.width/state.viewW,0,0,canvas.height/VIEW_H,0,0);ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,state.viewW,VIEW_H);
    drawBackground();for(const p of pipes)drawPipe(p);drawRemoteFlyers();drawFlyer();ctx.setTransform(1,0,0,1,0,0);
  }
  function loop(now){if(!state.open||!state.running)return;const dt=Math.min(.033,Math.max(.001,(now-state.last)/1000));state.last=now;update(dt);render();if(state.running)requestAnimationFrame(loop);}

  stage.addEventListener('pointerdown',event=>{if(!state.open||!state.running)return;if(event.pointerType==='mouse'&&event.button!==0)return;event.preventDefault();flap();},{passive:false});
  window.addEventListener('keydown',event=>{if(!state.open||!state.running)return;if(event.key===' '||event.key==='ArrowUp'||event.key.toLowerCase()==='w'){event.preventDefault();flap();}},{passive:false});
  ui.start.addEventListener('click',start);ui.close.addEventListener('click',close);panel.addEventListener('pointerdown',event=>{if(event.target===panel)close();});
  window.addEventListener('resize',()=>{if(state.open){resize();render();}},{passive:true});
})();
