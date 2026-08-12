/* ===== v186: ATM Platform Panic endless procedural climb ===== */
(()=>{
  const panel=document.getElementById('platformPanicPanel');
  const canvas=document.getElementById('platformPanicCanvas');
  const stage=canvas?.closest('.platformPanicStage');
  const ctx=canvas?.getContext('2d');
  if(!panel||!canvas||!stage||!ctx)return;

  const ui={
    time:document.getElementById('platformPanicTime'),coins:document.getElementById('platformPanicCoins'),height:document.getElementById('platformPanicHeight'),
    message:document.getElementById('platformPanicMessage'),detail:document.getElementById('platformPanicMessageDetail'),start:document.getElementById('platformPanicStart'),
    close:document.getElementById('platformPanicClose'),ability:document.getElementById('platformPanicAbility')
  };
  const joystick=document.getElementById('platformPanicJoystick');
  const joystickKnob=document.getElementById('platformPanicJoystickKnob');

  const WORLD_W=960,VIEW_H=540,BASE_VIEW_W=960,PLAYER_W=32,PLAYER_H=52;
  const START_Y=500,START_LAVA_Y=585,GEN_AHEAD=1050,CLEAN_BELOW=760;
  const input={left:false,right:false,axisX:0,jump:false,jumpPressed:false};
  const state={
    open:false,running:false,last:0,elapsed:0,viewW:BASE_VIEW_W,cameraX:0,cameraY:0,
    astronaut:false,bestHeight:0,bestCoins:0,lavaY:START_LAVA_Y,lavaSpeed:18,
    generatedTop:START_Y,seed:1,platformSerial:0
  };
  const runner={x:110,y:START_Y,vx:0,vy:0,onGround:true,face:1,coins:0};
  let platforms=[];
  let moving=[];
  let coins=[];

  function isAstronaut(){return typeof lockerLoadout!=='undefined'&&lockerLoadout?.body==='body:astronaut';}
  function rectsOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
  function playerRect(x=runner.x,y=runner.y){return{x:x-PLAYER_W/2,y:y-PLAYER_H,w:PLAYER_W,h:PLAYER_H};}
  function allPlatforms(){return platforms.concat(moving);}
  function fmtTime(seconds){const m=Math.floor(seconds/60),s=Math.floor(seconds%60);return `${m}:${String(s).padStart(2,'0')}`;}
  function rand(){state.seed=(state.seed*1664525+1013904223)>>>0;return state.seed/4294967296;}
  function randRange(min,max){return min+(max-min)*rand();}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

  function addPlatform(x,y,w,h=18,isMoving=false){
    const base={id:++state.platformSerial,x,y,w,h};
    if(isMoving){
      base.baseX=x;base.range=randRange(55,115);base.speed=randRange(.75,1.35);base.phase=randRange(0,Math.PI*2);
      moving.push(base);
    }else{
      platforms.push(base);
    }
    if(y<START_Y-40&&rand()<.68){coins.push({x:x+w/2,y:y-28,collected:false});}
    return base;
  }

  function generateNextPlatform(){
    const currentTop=state.generatedTop;
    const climbHeight=Math.max(0,START_Y-currentTop);
    const gap=randRange(56,74)+Math.min(8,climbHeight/1800*8);
    const y=currentTop-gap;
    const last=allPlatforms().reduce((best,p)=>p.y<best.y?p:best,{y:Infinity,x:60,w:170});
    const width=randRange(125,190)-Math.min(24,climbHeight/2200*24);
    const lastCenter=last.x+last.w/2;
    const maxShift=clamp(225+climbHeight*.015,225,285);
    const center=clamp(lastCenter+randRange(-maxShift,maxShift),width/2+24,WORLD_W-width/2-24);
    const movingChance=climbHeight>350?.18:.10;
    addPlatform(center-width/2,y,width,17,rand()<movingChance);

    // Periodically create a second route so procedural generation never becomes a single narrow path.
    if(state.platformSerial%7===0){
      const altWidth=randRange(110,155);
      const altCenter=clamp(center+(center<WORLD_W/2?randRange(210,320):randRange(-320,-210)),altWidth/2+20,WORLD_W-altWidth/2-20);
      addPlatform(altCenter-altWidth/2,y+randRange(-12,12),altWidth,16,rand()<.22);
    }
    state.generatedTop=y;
  }

  function ensurePlatformsAbove(targetY){
    while(state.generatedTop>targetY)generateNextPlatform();
  }

  function buildStartingTower(){
    platforms=[];moving=[];coins=[];state.platformSerial=0;state.generatedTop=START_Y;
    addPlatform(0,START_Y,960,40,false);
    const starters=[
      {x:55,y:432,w:175},{x:270,y:370,w:155},{x:485,y:308,w:160},{x:715,y:246,w:170},
      {x:500,y:184,w:150},{x:285,y:122,w:150},{x:65,y:62,w:165}
    ];
    for(let i=0;i<starters.length;i++){
      const p=starters[i];addPlatform(p.x,p.y,p.w,18,i===3);
      state.generatedTop=Math.min(state.generatedTop,p.y);
    }
    ensurePlatformsAbove(-GEN_AHEAD);
  }

  function cleanWorld(){
    const cutoff=state.cameraY+CLEAN_BELOW;
    platforms=platforms.filter(p=>p.y<=cutoff||p.y===START_Y);
    moving=moving.filter(p=>p.y<=cutoff);
    coins=coins.filter(c=>!c.collected&&c.y<=cutoff);
  }

  function resetRun(){
    state.elapsed=0;state.astronaut=isAstronaut();state.cameraX=0;state.cameraY=0;
    state.lavaY=START_LAVA_Y;state.lavaSpeed=18;state.seed=(Date.now()>>>0)||1;
    Object.assign(runner,{x:110,y:START_Y,vx:0,vy:0,onGround:true,face:1,coins:0});
    buildStartingTower();
    ui.time.textContent='0:00';ui.coins.textContent='0';ui.height.textContent='0m';
    ui.ability.textContent=state.astronaut?'ASTRONAUT LOW GRAVITY':'STANDARD PHYSICS';
  }

  function showIntro(){
    resetRun();state.running=false;ui.message.classList.remove('hidden');
    ui.message.querySelector('h3').textContent='Platform Panic';
    ui.detail.textContent='Climb forever while the lava gradually accelerates. Drag the joystick to move and tap anywhere in the play area to jump.';
    ui.start.textContent='START CLIMB';
  }

  function finish(reason='Lava caught you'){
    state.running=false;
    const height=Math.max(0,Math.floor((START_Y-runner.y)/10));
    window.atmLeaderboardSubmit?.('platform-panic',{score_value:height,secondary_value:runner.coins,details:{coins:runner.coins,elapsed_ms:Math.round(state.elapsed*1000)}});
    try{
      state.bestHeight=Math.max(Number(localStorage.getItem('atm_platform_panic_best_height_v2')||0),height);
      state.bestCoins=Math.max(Number(localStorage.getItem('atm_platform_panic_best_coins_v2')||0),runner.coins);
      localStorage.setItem('atm_platform_panic_best_height_v2',String(state.bestHeight));
      localStorage.setItem('atm_platform_panic_best_coins_v2',String(state.bestCoins));
    }catch(_e){}
    ui.message.classList.remove('hidden');ui.message.querySelector('h3').textContent='LAVA GOT YOU!';
    ui.detail.textContent=`${reason} · Height ${height}m · Coins ${runner.coins}${state.bestHeight?` · Best ${state.bestHeight}m`:''}`;
    ui.start.textContent='CLIMB AGAIN';
  }

  function startRun(){resetRun();state.running=true;state.last=performance.now();ui.message.classList.add('hidden');window.atmLeaderboardStart?.('platform-panic',{mode:'endless'});requestAnimationFrame(loop);}
  function open(){
    if(state.open)return;state.open=true;dialogOpen=true;joy.x=joy.y=0;knob.style.transform='translate(0,0)';
    if(jumpState?.active)jumpState.active=false;if(jetpackState?.active)endJetpack();
    window.atmVoiceEnterGameZone?.('platform-panic','PLATFORM PANIC VOICE','arcade','shared');document.body.classList.add('platform-panic-open');panel.classList.add('open');panel.setAttribute('aria-hidden','false');showIntro();resizeCanvas();
  }
  function close(){
    window.atmVoiceExitGameZone?.('platform-panic');state.open=false;state.running=false;dialogOpen=false;document.body.classList.remove('platform-panic-open');panel.classList.remove('open');panel.setAttribute('aria-hidden','true');
    input.left=input.right=input.jump=input.jumpPressed=false;input.axisX=0;resetJoystick();
  }
  window.openATMPlatformPanic=open;

  function resizeCanvas(){
    const rect=stage.getBoundingClientRect();if(rect.width<2||rect.height<2){requestAnimationFrame(resizeCanvas);return;}
    const dpr=Math.min(2,Math.max(1,window.devicePixelRatio||1));
    canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));
    state.viewW=Math.min(BASE_VIEW_W,Math.max(270,VIEW_H*(rect.width/rect.height)));
    state.cameraX=Math.max(0,Math.min(WORLD_W-state.viewW,state.cameraX));
  }
  window.addEventListener('resize',()=>{if(state.open)resizeCanvas();},{passive:true});

  function setControl(name,value){if(name==='jump'&&value&&!input.jump)input.jumpPressed=true;input[name]=value;}
  function updateMoving(){for(const p of moving)p.x=p.baseX+Math.sin(state.elapsed*p.speed+p.phase)*p.range;}
  function jumpIfNeeded(){if(!input.jumpPressed)return;input.jumpPressed=false;if(runner.onGround){runner.onGround=false;runner.vy=-(state.astronaut?720:625);}}

  function moveHorizontal(dt){
    const accel=runner.onGround?1850:state.astronaut?780:1050,maxSpeed=state.astronaut?300:335,friction=runner.onGround?1900:state.astronaut?180:260;
    const keyDir=(input.right?1:0)-(input.left?1:0);const dir=Math.abs(input.axisX)>.04?input.axisX:keyDir;
    if(Math.abs(dir)>.04){runner.vx+=dir*accel*dt;runner.face=dir<0?-1:1;}else{const dec=Math.min(Math.abs(runner.vx),friction*dt);runner.vx-=Math.sign(runner.vx)*dec;}
    runner.vx=Math.max(-maxSpeed,Math.min(maxSpeed,runner.vx));runner.x=Math.max(PLAYER_W/2,Math.min(WORLD_W-PLAYER_W/2,runner.x+runner.vx*dt));
  }

  function moveVertical(dt){
    const prevY=runner.y;runner.vy+=(state.astronaut?470:1550)*dt;runner.vy=Math.min(runner.vy,state.astronaut?520:900);
    let ny=runner.y+runner.vy*dt;runner.onGround=false;
    if(runner.vy>=0){
      let landing=null;
      for(const p of allPlatforms()){
        const within=runner.x+PLAYER_W*.36>p.x&&runner.x-PLAYER_W*.36<p.x+p.w;
        if(within&&prevY<=p.y+2&&ny>=p.y){if(!landing||p.y<landing.y)landing=p;}
      }
      if(landing){ny=landing.y;runner.vy=0;runner.onGround=true;}
    }
    runner.y=ny;
  }

  function updateCoins(){
    const r=playerRect();
    for(const coin of coins){
      if(coin.collected)continue;
      if(rectsOverlap(r,{x:coin.x-14,y:coin.y-14,w:28,h:28})){
        coin.collected=true;runner.coins++;ui.coins.textContent=String(runner.coins);
      }
    }
  }

  function updateLava(dt){
    const height=Math.max(0,START_Y-runner.y);
    const timeBoost=Math.min(52,state.elapsed*.42);
    const heightBoost=Math.min(65,height*.024);
    state.lavaSpeed=18+timeBoost+heightBoost;
    state.lavaY-=state.lavaSpeed*dt;
  }

  function update(dt){
    state.elapsed+=dt;updateMoving();jumpIfNeeded();moveHorizontal(dt);moveVertical(dt);updateCoins();

    const targetCameraY=Math.min(0,runner.y-VIEW_H*.58);
    state.cameraY+=(targetCameraY-state.cameraY)*Math.min(1,dt*4.8);
    const viewW=state.viewW||BASE_VIEW_W;
    const targetCameraX=Math.max(0,Math.min(WORLD_W-viewW,runner.x-viewW/2));
    state.cameraX+=(targetCameraX-state.cameraX)*Math.min(1,dt*5);

    ensurePlatformsAbove(state.cameraY-GEN_AHEAD);
    updateLava(dt);
    cleanWorld();

    if(runner.y-5>=state.lavaY){finish('Keep climbing');return;}
    if(runner.y>state.cameraY+VIEW_H+110){finish('You fell below the tower');return;}

    const height=Math.max(0,Math.floor((START_Y-runner.y)/10));
    ui.time.textContent=fmtTime(state.elapsed);ui.height.textContent=`${height}m`;
    window.atmPublishArcadeGameState?.('platform-panic',{x:runner.x,y:runner.y,face:runner.face,onGround:runner.onGround,vx:runner.vx,time:state.elapsed});
  }

  function worldX(x){return x-state.cameraX;}
  function worldY(y){return y-state.cameraY;}

  function drawBackground(){
    const viewW=state.viewW||BASE_VIEW_W;
    const g=ctx.createLinearGradient(0,0,0,VIEW_H);g.addColorStop(0,'#10102a');g.addColorStop(.55,'#32143d');g.addColorStop(1,'#5b1d35');ctx.fillStyle=g;ctx.fillRect(0,0,viewW,VIEW_H);
    ctx.fillStyle='rgba(255,255,255,.35)';
    for(let i=0;i<34;i++){
      const x=((i*173-state.cameraX*.08)%1100+1100)%1100;
      const y=((25+(i*61)-state.cameraY*.12)%620+620)%620;
      ctx.fillRect(x,y,2,2);
    }
  }

  function drawPlatform(p){
    const x=worldX(p.x),y=worldY(p.y);if(y>VIEW_H+30||y<-40)return;
    ctx.fillStyle='#202833';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#ff83c8';ctx.fillRect(x,y,p.w,5);
    ctx.fillStyle='rgba(142,101,255,.18)';for(let xx=x+14;xx<x+p.w;xx+=32)ctx.fillRect(xx,y+8,14,5);
  }

  function drawCoins(){
    for(const coin of coins){
      if(coin.collected)continue;const x=worldX(coin.x),y=worldY(coin.y);if(y<-30||y>VIEW_H+30)continue;
      ctx.fillStyle='#ffd166';ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5c3b00';ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillText('$',x,y+4);
    }
  }

  function drawLava(){
    const y=worldY(state.lavaY),viewW=state.viewW||BASE_VIEW_W;if(y>VIEW_H+12)return;
    const top=Math.max(-10,y),g=ctx.createLinearGradient(0,top,0,VIEW_H);g.addColorStop(0,'#ff4fa3');g.addColorStop(.18,'#ff6b35');g.addColorStop(1,'#8b1538');
    ctx.fillStyle=g;ctx.fillRect(0,top,viewW,VIEW_H-top);ctx.fillStyle='rgba(255,255,255,.7)';
    for(let x=0;x<viewW;x+=34){ctx.beginPath();ctx.arc(x+((state.elapsed*35)%34),top+Math.sin(x*.06+state.elapsed*4)*4,4,0,Math.PI*2);ctx.fill();}
  }

  function getSprite(){
    const characterId=typeof selectedCharacter!=='undefined'?selectedCharacter:'classic';
    let config=CHARACTER_SHEETS?.[characterId],image=characterSheetImgs?.[characterId];
    const bodyId=typeof lockerLoadout!=='undefined'?lockerLoadout?.body:null;
    if(characterId==='classic'&&bodyId&&ATM_EQUIPMENT_SHEETS?.[bodyId]&&equipmentSheetImgs?.[bodyId]?.complete&&equipmentSheetImgs[bodyId].naturalWidth){config=ATM_EQUIPMENT_SHEETS[bodyId];image=equipmentSheetImgs[bodyId];}
    return{characterId,config,image};
  }

  function drawLayer(image,config,x,footY,row,frame,scale){
    if(!image?.complete||!image.naturalWidth||!config)return;
    const cols=config.cols||3,rows=config.rows||4,fw=Math.floor(image.naturalWidth/cols),fh=Math.floor(image.naturalHeight/rows),ax=Number.isFinite(config.anchorX)?config.anchorX:fw/2,ay=Number.isFinite(config.anchorY)?config.anchorY:fh-1;
    ctx.drawImage(image,frame*fw,row*fh,fw,fh,Math.round(x-ax*scale),Math.round(footY-ay*scale),Math.round(fw*scale),Math.round(fh*scale));
  }

  function drawRunner(){
    const x=worldX(runner.x),y=worldY(runner.y),{characterId,config,image}=getSprite();
    if(!config||!image?.complete||!image.naturalWidth){ctx.fillStyle='#ff83c8';ctx.fillRect(x-16,y-48,32,48);return;}
    const dir=runner.face<0?'left':'right',row=Math.max(0,(config.rowOrder||['down','left','up','right']).indexOf(dir));
    const movingNow=Math.abs(runner.vx)>20&&runner.onGround,frame=!runner.onGround?2:(movingNow?Math.floor(state.elapsed*8)%3:1),scale=.185;
    drawLayer(image,config,x,y,row,frame,scale);
    const equip=slot=>{const id=lockerLoadout?.[slot],ec=ATM_EQUIPMENT_SHEETS?.[id],ei=equipmentSheetImgs?.[id];if(id)drawLayer(ei,ec,x,y,Math.max(0,(ec?.rowOrder||['down','left','up','right']).indexOf(dir)),frame,scale);};
    if(characterId==='classic'){equip('back');equip('katana');for(const slot of ['chest','face','feet','head'])equip(slot);equip('hands');}
  }

  function drawSpeedMeter(){
    const viewW=state.viewW||BASE_VIEW_W;
    ctx.fillStyle='rgba(16,8,24,.72)';ctx.fillRect(10,10,132,30);
    ctx.fillStyle='#b99ac3';ctx.font='800 10px system-ui';ctx.textAlign='left';ctx.fillText(`LAVA SPEED ${Math.round(state.lavaSpeed)} px/s`,18,29);
    ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(10,44,132,5);
    ctx.fillStyle='#ff4fa3';ctx.fillRect(10,44,Math.min(132,state.lavaSpeed/135*132),5);
    ctx.textAlign='start';
  }

  function drawRemoteRunners(){for(const remote of window.atmArcadeGameRemotes?.('platform-panic')||[]){const s=remote.miniState||{},sx=worldX(s.x||0),sy=worldY(s.y||START_Y);if(sy<-80||sy>VIEW_H+80)continue;const dir=(s.face||1)<0?'left':'right',frame=!s.onGround?2:(Math.abs(s.vx||0)>20?Math.floor((s.time||0)*8)%3:1);window.atmDrawArcadeMiniGhost?.(ctx,remote,sx,sy,dir,frame,.185);}}
  function render(){
    const viewW=state.viewW||BASE_VIEW_W;ctx.setTransform(canvas.width/viewW,0,0,canvas.height/VIEW_H,0,0);ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,viewW,VIEW_H);
    drawBackground();for(const p of platforms)drawPlatform(p);for(const p of moving)drawPlatform(p);drawCoins();drawLava();drawRemoteRunners();drawRunner();drawSpeedMeter();ctx.setTransform(1,0,0,1,0,0);
  }

  function loop(now){if(!state.open||!state.running)return;const dt=Math.min(.033,Math.max(.001,(now-state.last)/1000));state.last=now;update(dt);render();if(state.running)requestAnimationFrame(loop);}

  function setJoystick(clientX){
    if(!joystick||!joystickKnob)return;const rect=joystick.getBoundingClientRect(),radius=Math.max(1,rect.width*.29),axis=Math.max(-1,Math.min(1,(clientX-(rect.left+rect.width/2))/radius));
    input.axisX=Math.abs(axis)<.08?0:axis;joystickKnob.style.transform=`translateX(${Math.round(input.axisX*radius)}px)`;
  }
  function resetJoystick(){input.axisX=0;if(joystickKnob)joystickKnob.style.transform='translateX(0)';}
  if(joystick){
    let pointer=null;
    joystick.addEventListener('pointerdown',e=>{e.preventDefault();pointer=e.pointerId;joystick.setPointerCapture?.(e.pointerId);setJoystick(e.clientX);},{passive:false});
    joystick.addEventListener('pointermove',e=>{if(e.pointerId===pointer){e.preventDefault();setJoystick(e.clientX);}},{passive:false});
    const release=e=>{if(pointer===null||e.pointerId===pointer){pointer=null;resetJoystick();}};
    joystick.addEventListener('pointerup',release,{passive:false});joystick.addEventListener('pointercancel',release,{passive:false});joystick.addEventListener('lostpointercapture',()=>{pointer=null;resetJoystick();});
  }

  const keyMap={arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowup:'jump',w:'jump',' ':'jump'};
  window.addEventListener('keydown',e=>{if(!state.open)return;const key=keyMap[e.key.toLowerCase()];if(key){e.preventDefault();setControl(key,true);}});
  window.addEventListener('keyup',e=>{if(!state.open)return;const key=keyMap[e.key.toLowerCase()];if(key){e.preventDefault();setControl(key,false);}});
  stage.addEventListener('pointerdown',e=>{if(!state.open||!state.running)return;if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();input.jumpPressed=true;},{passive:false});
  ui.start.addEventListener('click',startRun);ui.close.addEventListener('click',close);panel.addEventListener('pointerdown',e=>{if(e.target===panel)close();});
})();
