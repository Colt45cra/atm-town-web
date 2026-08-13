/* ===== v184: ATM Sky Run cabinet + tap zone refinements ===== */
(()=>{
  const panel=document.getElementById('skyRunPanel');
  const canvas=document.getElementById('skyRunCanvas');
  const stage=canvas?.closest('.skyRunStage');
  const ctx=canvas?.getContext('2d');
  if(!panel||!canvas||!stage||!ctx)return;

  const ui={
    time:document.getElementById('skyRunTime'),cash:document.getElementById('skyRunCash'),checkpoint:document.getElementById('skyRunCheckpoint'),
    message:document.getElementById('skyRunMessage'),messageDetail:document.getElementById('skyRunMessageDetail'),start:document.getElementById('skyRunStart'),
    close:document.getElementById('skyRunClose'),ability:document.getElementById('skyRunAbility')
  };
  const joystick=document.getElementById('skyRunJoystick');
  const joystickKnob=document.getElementById('skyRunJoystickKnob');
  const jumpZone=document.getElementById('skyRunJumpZone');
  const WORLD_W=4320,WORLD_H=620,BASE_VIEW_W=960,VIEW_H=540,PLAYER_W=32,PLAYER_H=52;
  const input={left:false,right:false,axisX:0,jump:false,jumpPressed:false};
  const state={open:false,running:false,finished:false,last:0,time:0,cameraX:0,viewW:BASE_VIEW_W,best:null,astronaut:false};
  const runner={x:110,y:500,vx:0,vy:0,onGround:false,face:1,checkpointX:110,checkpointY:500,checkpointIndex:0,cash:0,bounceReady:false,jetpack:0,jetpackActive:false,invuln:0};

  const basePlatforms=[
    {x:0,y:500,w:720,h:120},{x:850,y:470,w:520,h:150},{x:1425,y:425,w:180,h:195},{x:1685,y:365,w:185,h:255},
    {x:1940,y:430,w:245,h:190},{x:2240,y:500,w:360,h:120},{x:2960,y:340,w:270,h:280},{x:3290,y:430,w:330,h:190},
    {x:3700,y:390,w:140,h:230},{x:3870,y:330,w:140,h:290},{x:4040,y:280,w:280,h:340}
  ];
  const movingPlatforms=[
    {x:2660,y:420,w:170,h:24,baseX:2660,range:250,speed:.9,phase:0},
    {x:2815,y:365,w:150,h:22,baseX:2815,range:100,speed:1.25,phase:1.6}
  ];
  const barriers=[
    {x:520,y:445,w:46,h:55},{x:1120,y:405,w:55,h:65},{x:2040,y:370,w:42,h:60},{x:3430,y:365,w:50,h:65},{x:4110,y:210,w:40,h:70}
  ];
  const hazards=[
    {x:735,y:500,w:105,h:120,type:'gap'},{x:1375,y:500,w:45,h:120,type:'gap'},{x:1608,y:500,w:72,h:120,type:'gap'},
    {x:1875,y:500,w:60,h:120,type:'gap'},{x:2190,y:500,w:45,h:120,type:'gap'},{x:2610,y:500,w:340,h:120,type:'gap'},
    {x:3625,y:500,w:70,h:120,type:'gap'},{x:3842,y:500,w:24,h:120,type:'gap'},
    {x:1260,y:365,w:12,h:105,type:'laser'},{x:3510,y:330,w:14,h:100,type:'laser'}
  ];
  const checkpoints=[
    {x:970,y:470,label:'CP 1'},{x:2290,y:500,label:'CP 2'},{x:3335,y:430,label:'CP 3'}
  ];
  const pickups=[
    {x:260,y:452,type:'cash'},{x:430,y:452,type:'cash'},{x:650,y:452,type:'cash'},{x:930,y:422,type:'cash'},{x:1080,y:422,type:'cash'},
    {x:1310,y:422,type:'bounce'},{x:1490,y:377,type:'cash'},{x:1745,y:317,type:'cash'},{x:2010,y:382,type:'cash'},
    {x:2350,y:452,type:'cash'},{x:2500,y:452,type:'jetpack'},{x:2735,y:372,type:'cash'},{x:2900,y:315,type:'cash'},
    {x:3035,y:292,type:'cash'},{x:3380,y:382,type:'cash'},{x:3560,y:382,type:'cash'},{x:3750,y:342,type:'cash'},
    {x:3920,y:282,type:'cash'},{x:4150,y:232,type:'cash'}
  ];
  const finish={x:4235,y:200,w:62,h:80};

  function isAstronaut(){return typeof lockerLoadout!=='undefined'&&lockerLoadout?.body==='body:astronaut';}
  function fmtTime(seconds){const m=Math.floor(seconds/60),s=Math.floor(seconds%60),cs=Math.floor((seconds%1)*100);return `${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;}
  function saveBest(){try{const old=Number(localStorage.getItem('atm_sky_run_best_v1')||0);if(!old||state.time<old)localStorage.setItem('atm_sky_run_best_v1',String(state.time));state.best=Number(localStorage.getItem('atm_sky_run_best_v1')||0)||null;}catch(_e){state.best=null;}}
  function resetPickups(){for(const p of pickups)p.collected=false;}
  function resetRun(){
    state.running=false;state.finished=false;state.time=0;state.cameraX=0;state.astronaut=isAstronaut();
    Object.assign(runner,{x:110,y:500,vx:0,vy:0,onGround:true,face:1,checkpointX:110,checkpointY:500,checkpointIndex:0,cash:0,bounceReady:false,jetpack:0,jetpackActive:false,invuln:0});
    resetPickups();
    ui.time.textContent='0:00.00';ui.cash.textContent='0/17';ui.checkpoint.textContent='START';
    ui.ability.textContent=state.astronaut?'ASTRONAUT LOW GRAVITY':'STANDARD PHYSICS';
  }
  function startRun(){resetRun();state.running=true;state.last=performance.now();ui.message.classList.add('hidden');window.atmLeaderboardStart?.('sky-run',{mode:'time-trial'});requestAnimationFrame(loop);}
  function showIntro(){resetRun();ui.message.classList.remove('hidden');ui.message.querySelector('h3').textContent='Rooftop Vault Run';ui.messageDetail.textContent='Desktop: A/D or arrows to move, Space to jump. Mobile: drag the joystick and tap the play area to jump.';ui.start.textContent='START RUN';}
  function showFinish(){
    state.running=false;state.finished=true;saveBest();window.atmLeaderboardSubmit?.('sky-run',{score_value:Math.round(state.time*1000),secondary_value:runner.cash,details:{cash:runner.cash}});ui.message.classList.remove('hidden');ui.message.querySelector('h3').textContent='VAULT REACHED!';
    ui.messageDetail.textContent=`Time ${fmtTime(state.time)} · Cash ${runner.cash}/17${state.best?` · Best ${fmtTime(state.best)}`:''}`;ui.start.textContent='RUN AGAIN';
  }
  function openSkyRun(){
    if(state.open)return;state.open=true;dialogOpen=true;joy.x=joy.y=0;knob.style.transform='translate(0,0)';
    if(jumpState?.active)jumpState.active=false;if(jetpackState?.active)endJetpack();
    window.atmVoiceEnterGameZone?.('sky-run','SKY RUN VOICE','arcade','shared');document.body.classList.add('sky-run-open');panel.classList.add('open');panel.setAttribute('aria-hidden','false');showIntro();resizeCanvas();
  }
  function closeSkyRun(){
    window.atmVoiceExitGameZone?.('sky-run');state.open=false;state.running=false;dialogOpen=false;document.body.classList.remove('sky-run-open');panel.classList.remove('open');panel.setAttribute('aria-hidden','true');
    input.left=input.right=input.jump=input.jumpPressed=false;skyJumpPointer=null;input.axisX=0;resetSkyJoystick();
  }
  window.openATMSkyRun=openSkyRun;

  function resizeCanvas(){
    if(!stage?.isConnected)return;
    const stageRect=stage.getBoundingClientRect();
    if(stageRect.width<2||stageRect.height<2){requestAnimationFrame(resizeCanvas);return;}
    const cssW=Math.max(1,Math.floor(stageRect.width));
    const cssH=Math.max(1,Math.floor(stageRect.height));
    canvas.style.width='100%';
    canvas.style.height='100%';
    const dpr=Math.min(2,Math.max(1,window.devicePixelRatio||1));
    const w=Math.max(1,Math.round(cssW*dpr));
    const h=Math.max(1,Math.round(cssH*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    state.viewW=Math.min(BASE_VIEW_W,Math.max(260,VIEW_H*(cssW/cssH)));
    state.cameraX=Math.max(0,Math.min(WORLD_W-state.viewW,state.cameraX));
  }
  window.addEventListener('resize',()=>{if(state.open)resizeCanvas();},{passive:true});

  function playerRect(x=runner.x,y=runner.y){return{x:x-PLAYER_W/2,y:y-PLAYER_H,w:PLAYER_W,h:PLAYER_H};}
  function rectsOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
  function allPlatforms(){return basePlatforms.concat(movingPlatforms);}

  function moveHorizontal(dt){
    const accel=runner.onGround?1850:state.astronaut?780:1050,maxSpeed=state.astronaut?300:335,friction=runner.onGround?1900:state.astronaut?180:260;
    const keyDir=(input.right?1:0)-(input.left?1:0);let dir=Math.abs(input.axisX)>.04?input.axisX:keyDir;if(Math.abs(dir)>.04){runner.vx+=dir*accel*dt;runner.face=dir<0?-1:1;}else{const dec=Math.min(Math.abs(runner.vx),friction*dt);runner.vx-=Math.sign(runner.vx)*dec;}
    runner.vx=Math.max(-maxSpeed,Math.min(maxSpeed,runner.vx));
    let nx=runner.x+runner.vx*dt;let r=playerRect(nx,runner.y);
    for(const b of barriers){if(rectsOverlap(r,b)){if(runner.vx>0)nx=b.x-PLAYER_W/2;else if(runner.vx<0)nx=b.x+b.w+PLAYER_W/2;runner.vx=0;r=playerRect(nx,runner.y);}}
    runner.x=Math.max(PLAYER_W/2,Math.min(WORLD_W-PLAYER_W/2,nx));
  }

  function jumpIfNeeded(){
    if(!input.jumpPressed)return;input.jumpPressed=false;
    if(runner.onGround){
      const bounce=runner.bounceReady?1.55:1;runner.bounceReady=false;runner.onGround=false;
      runner.vy=-(state.astronaut?720:625)*bounce;
    }
  }

  function moveVertical(dt){
    const prevY=runner.y;
    runner.jetpackActive=false;
    if(runner.jetpack>0&&input.jump&&!runner.onGround){runner.jetpackActive=true;runner.vy-=1050*dt;runner.vy=Math.max(runner.vy,-520);runner.jetpack=Math.max(0,runner.jetpack-dt);}
    else if(runner.jetpack>0)runner.jetpack=Math.max(0,runner.jetpack-dt*.25);
    const gravity=state.astronaut?470:1550;runner.vy+=gravity*dt;runner.vy=Math.min(runner.vy,state.astronaut?520:900);
    let ny=runner.y+runner.vy*dt;runner.onGround=false;
    if(runner.vy>=0){
      let landing=null;
      for(const p of allPlatforms()){
        const within=runner.x+PLAYER_W*.36>p.x&&runner.x-PLAYER_W*.36<p.x+p.w;
        if(within&&prevY<=p.y+2&&ny>=p.y){if(!landing||p.y<landing.y)landing=p;}
      }
      for(const b of barriers){const within=runner.x+PLAYER_W*.36>b.x&&runner.x-PLAYER_W*.36<b.x+b.w;if(within&&prevY<=b.y+2&&ny>=b.y){if(!landing||b.y<landing.y)landing=b;}}
      if(landing){ny=landing.y;runner.vy=0;runner.onGround=true;}
    }else{
      for(const b of barriers){const r=playerRect(runner.x,ny);if(rectsOverlap(r,b)&&prevY-PLAYER_H>=b.y+b.h-4){ny=b.y+b.h+PLAYER_H;runner.vy=0;}}
    }
    runner.y=ny;
  }

  function respawn(){runner.x=runner.checkpointX;runner.y=runner.checkpointY;runner.vx=runner.vy=0;runner.onGround=true;runner.jetpackActive=false;runner.invuln=1;}
  function updateMovingPlatforms(t){for(const p of movingPlatforms)p.x=p.baseX+Math.sin(t*p.speed+p.phase)*p.range;}
  function updatePickups(){
    const r=playerRect();
    for(const p of pickups){if(p.collected)continue;const box={x:p.x-16,y:p.y-20,w:32,h:32};if(rectsOverlap(r,box)){p.collected=true;if(p.type==='cash')runner.cash++;else if(p.type==='bounce')runner.bounceReady=true;else if(p.type==='jetpack')runner.jetpack=5;}}
    for(let i=0;i<checkpoints.length;i++){const c=checkpoints[i];if(i+1>runner.checkpointIndex&&Math.abs(runner.x-c.x)<44&&Math.abs(runner.y-c.y)<90){runner.checkpointIndex=i+1;runner.checkpointX=c.x;runner.checkpointY=c.y;ui.checkpoint.textContent=c.label;}}
    if(rectsOverlap(runnerRectForFinish(),finish))showFinish();
  }
  function runnerRectForFinish(){return playerRect();}
  function updateHazards(){
    if(runner.y>WORLD_H+80){respawn();return;}
    if(runner.invuln>0)return;const r=playerRect();for(const h of hazards){if(h.type==='laser'&&rectsOverlap(r,h)){respawn();return;}}
  }

  function update(dt){
    state.time+=dt;runner.invuln=Math.max(0,runner.invuln-dt);updateMovingPlatforms(state.time);jumpIfNeeded();moveHorizontal(dt);moveVertical(dt);updatePickups();updateHazards();
    const viewW=state.viewW||BASE_VIEW_W;const target=Math.max(0,Math.min(WORLD_W-viewW,runner.x-viewW*.34));state.cameraX+=(target-state.cameraX)*Math.min(1,dt*6);
    ui.time.textContent=fmtTime(state.time);ui.cash.textContent=`${runner.cash}/17`;
    const extras=[];if(runner.bounceReady)extras.push('BOUNCE READY');if(runner.jetpack>0)extras.push(`JETPACK ${runner.jetpack.toFixed(1)}s`);
    ui.ability.textContent=(state.astronaut?'ASTRONAUT LOW GRAVITY':'STANDARD PHYSICS')+(extras.length?' · '+extras.join(' · '):'');
    window.atmPublishArcadeGameState?.('sky-run',{x:runner.x,y:runner.y,face:runner.face,onGround:runner.onGround,vx:runner.vx,time:state.time,jetpack:runner.jetpackActive});
  }

  function drawSky(){
    const g=ctx.createLinearGradient(0,0,0,VIEW_H);g.addColorStop(0,'#061728');g.addColorStop(.62,'#153752');g.addColorStop(1,'#f07178');ctx.fillStyle=g;ctx.fillRect(0,0,state.viewW||BASE_VIEW_W,VIEW_H);
    ctx.fillStyle='rgba(255,255,255,.45)';for(let i=0;i<36;i++){const x=((i*173-state.cameraX*.08)%1100+1100)%1100,y=35+(i*47)%230;ctx.fillRect(x,y,2,2);}
    ctx.fillStyle='rgba(2,9,17,.62)';for(let i=0;i<18;i++){const x=i*250-(state.cameraX*.18%250),h=80+(i*53)%170;ctx.fillRect(x,VIEW_H-h,190,h);}
    ctx.fillStyle='rgba(88,241,230,.12)';for(let i=0;i<18;i++){const x=i*250-(state.cameraX*.18%250);for(let wy=VIEW_H-30;wy>VIEW_H-(80+(i*53)%170)+20;wy-=22)for(let wx=x+18;wx<x+175;wx+=25)ctx.fillRect(wx,wy,5,8);}
  }
  function worldX(x){return x-state.cameraX;}
  function drawPlatform(p){const x=worldX(p.x);if(x+p.w<0||x>(state.viewW||BASE_VIEW_W))return;ctx.fillStyle='#172a33';ctx.fillRect(x,p.y,p.w,p.h);ctx.fillStyle='#314b55';ctx.fillRect(x,p.y,p.w,8);ctx.fillStyle='rgba(88,241,230,.12)';for(let xx=x+18;xx<x+p.w;xx+=42)ctx.fillRect(xx,p.y+18,18,6);}
  function drawBarrier(b){const x=worldX(b.x);ctx.fillStyle='#384a54';ctx.fillRect(x,b.y,b.w,b.h);ctx.fillStyle='#ffd166';ctx.fillRect(x+5,b.y+7,b.w-10,7);ctx.fillStyle='#111c22';ctx.fillRect(x+7,b.y+20,b.w-14,b.h-27);}
  function drawHazard(h){if(h.type!=='laser')return;const x=worldX(h.x);ctx.fillStyle='rgba(255,79,163,.18)';ctx.fillRect(x-7,h.y,h.w+14,h.h);ctx.fillStyle='#ff4fa3';ctx.fillRect(x,h.y,h.w,h.h);ctx.fillStyle='#fff';ctx.fillRect(x+3,h.y,h.w-6,h.h);}
  function drawCheckpoint(c,i){const x=worldX(c.x);ctx.fillStyle=i<runner.checkpointIndex?'#7cf7bd':'#ffd166';ctx.fillRect(x-3,c.y-92,6,92);ctx.beginPath();ctx.moveTo(x,c.y-90);ctx.lineTo(x+38,c.y-76);ctx.lineTo(x,c.y-60);ctx.closePath();ctx.fill();}
  function drawPickups(){for(const p of pickups){if(p.collected)continue;const x=worldX(p.x);if(x<-30||x>(state.viewW||BASE_VIEW_W)+30)continue;if(p.type==='cash'){ctx.fillStyle='#ffd166';ctx.beginPath();ctx.arc(x,p.y,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5c3b00';ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.fillText('$',x,p.y+4);}else if(p.type==='bounce'){ctx.fillStyle='#ff4fa3';ctx.fillRect(x-12,p.y-17,24,30);ctx.fillStyle='#fff';ctx.font='900 18px system-ui';ctx.textAlign='center';ctx.fillText('↟',x,p.y+6);}else{ctx.fillStyle='#ff8b36';ctx.fillRect(x-14,p.y-19,28,34);ctx.fillStyle='#fff';ctx.font='900 16px system-ui';ctx.textAlign='center';ctx.fillText('🚀',x,p.y+6);}}}
  function drawFinish(){const x=worldX(finish.x);ctx.fillStyle='#172a33';ctx.fillRect(x,finish.y,finish.w,finish.h);ctx.strokeStyle='#ffd166';ctx.lineWidth=5;ctx.strokeRect(x+4,finish.y+4,finish.w-8,finish.h-8);ctx.fillStyle='#ffd166';ctx.font='900 13px system-ui';ctx.textAlign='center';ctx.fillText('VAULT',x+finish.w/2,finish.y+finish.h/2+5);}

  function getRunnerSprite(){
    let characterId=typeof selectedCharacter!=='undefined'?selectedCharacter:'classic';let config=CHARACTER_SHEETS?.[characterId],image=characterSheetImgs?.[characterId];
    const bodyId=typeof lockerLoadout!=='undefined'?lockerLoadout?.body:null;
    if(characterId==='classic'&&bodyId&&ATM_EQUIPMENT_SHEETS?.[bodyId]&&equipmentSheetImgs?.[bodyId]?.complete&&equipmentSheetImgs[bodyId].naturalWidth){config=ATM_EQUIPMENT_SHEETS[bodyId];image=equipmentSheetImgs[bodyId];}
    return{characterId,config,image};
  }
  function drawRunnerLayer(image,config,screenX,screenFootY,row,frame,scale){if(!image?.complete||!image.naturalWidth||!config)return;const cols=config.cols||3,rows=config.rows||4,fw=Math.floor(image.naturalWidth/cols),fh=Math.floor(image.naturalHeight/rows),ax=Number.isFinite(config.anchorX)?config.anchorX:fw/2,ay=Number.isFinite(config.anchorY)?config.anchorY:fh-1;ctx.drawImage(image,frame*fw,row*fh,fw,fh,Math.round(screenX-ax*scale),Math.round(screenFootY-ay*scale),Math.round(fw*scale),Math.round(fh*scale));}
  function drawRunner(){
    const screenX=worldX(runner.x),screenY=runner.y;
    const {characterId,config,image}=getRunnerSprite();if(!config||!image?.complete||!image.naturalWidth){ctx.fillStyle='#58f1e6';ctx.fillRect(screenX-16,screenY-48,32,48);return;}
    const dir=runner.face<0?'left':'right',row=Math.max(0,(config.rowOrder||['down','left','up','right']).indexOf(dir));
    const jetpackEquipped=runner.jetpack>0||runner.jetpackActive;
    const moving=Math.abs(runner.vx)>20&&runner.onGround,frame=jetpackEquipped?1:(!runner.onGround?2:(moving?Math.floor(state.time*8)%3:1));
    const scale=.185;drawRunnerLayer(image,config,screenX,screenY,row,frame,scale);
    const drawEquip=(slotId)=>{const itemId=lockerLoadout?.[slotId];if(!itemId)return;const ec=ATM_EQUIPMENT_SHEETS?.[itemId],ei=equipmentSheetImgs?.[itemId];drawRunnerLayer(ei,ec,screenX,screenY,Math.max(0,(ec?.rowOrder||['down','left','up','right']).indexOf(dir)),frame,scale);};
    if(characterId==='classic'){if(!jetpackEquipped)drawEquip('back');drawEquip('katana');for(const s of ['chest','face','feet','head'])drawEquip(s);}
    let overlayMetrics=null;
    if(jetpackEquipped&&typeof jetpackOverlayImg!=='undefined'&&jetpackOverlayImg.complete&&jetpackOverlayImg.naturalWidth){
      const oc=jetpackOverlaySheet.cols||3,orows=jetpackOverlaySheet.rows||4,ofw=Math.floor(jetpackOverlayImg.naturalWidth/oc),ofh=Math.floor(jetpackOverlayImg.naturalHeight/orows);
      const orow=Math.max(0,(jetpackOverlaySheet.rowOrder||['down','left','up','right']).indexOf(dir)),oframe=1;
      const oax=Number.isFinite(jetpackOverlaySheet.anchorX)?jetpackOverlaySheet.anchorX:ofw/2,oay=Number.isFinite(jetpackOverlaySheet.anchorY)?jetpackOverlaySheet.anchorY:ofh-1;
      const odx=Math.round(screenX-oax*scale),ody=Math.round(screenY-oay*scale),odw=Math.round(ofw*scale),odh=Math.round(ofh*scale);
      ctx.drawImage(jetpackOverlayImg,oframe*ofw,orow*ofh,ofw,ofh,odx,ody,odw,odh);
      overlayMetrics={x:odx,y:ody,w:odw,h:odh,fw:ofw,fh:ofh};
    }
    if(characterId==='classic')drawEquip('hands');
    if(runner.jetpackActive&&overlayMetrics){
      const nozzle=dir==='left'?{x:178,y:249}:{x:76,y:251};
      const nozzleX=overlayMetrics.x+(nozzle.x/overlayMetrics.fw)*overlayMetrics.w;
      const nozzleY=overlayMetrics.y+(nozzle.y/overlayMetrics.fh)*overlayMetrics.h;
      const flamePulse=3+Math.abs(Math.sin(performance.now()*.025))*6;
      ctx.save();ctx.globalCompositeOperation='lighter';
      ctx.fillStyle='rgba(88,241,230,.78)';ctx.beginPath();ctx.moveTo(nozzleX-2.5,nozzleY);ctx.lineTo(nozzleX+2.5,nozzleY);ctx.lineTo(nozzleX,nozzleY+12+flamePulse);ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(255,139,36,.98)';ctx.beginPath();ctx.moveTo(nozzleX-1.6,nozzleY+.5);ctx.lineTo(nozzleX+1.6,nozzleY+.5);ctx.lineTo(nozzleX,nozzleY+6+flamePulse*.55);ctx.closePath();ctx.fill();ctx.restore();
    }
    if(runner.invuln>0){ctx.strokeStyle='rgba(124,247,189,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(screenX,screenY-28,35,0,Math.PI*2);ctx.stroke();}
  }

  function drawRemoteRunners(){for(const remote of window.atmArcadeGameRemotes?.('sky-run')||[]){const s=remote.miniState||{},sx=worldX(s.x||0),sy=s.y||500;if(sx<-60||sx>(state.viewW||BASE_VIEW_W)+60)continue;const dir=(s.face||1)<0?'left':'right',frame=!s.onGround?2:(Math.abs(s.vx||0)>20?Math.floor((s.time||0)*8)%3:1);window.atmDrawArcadeMiniGhost?.(ctx,remote,sx,sy,dir,frame,.185);}}
  function render(){
    const viewW=state.viewW||BASE_VIEW_W;ctx.setTransform(canvas.width/viewW,0,0,canvas.height/VIEW_H,0,0);ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,viewW,VIEW_H);
    drawSky();for(const p of basePlatforms)drawPlatform(p);for(const p of movingPlatforms)drawPlatform(p);for(const b of barriers)drawBarrier(b);for(const h of hazards)drawHazard(h);checkpoints.forEach(drawCheckpoint);drawPickups();drawFinish();drawRemoteRunners();drawRunner();
    ctx.setTransform(1,0,0,1,0,0);
  }

  function loop(now){if(!state.open||!state.running)return;const dt=Math.min(.033,Math.max(.001,(now-state.last)/1000));state.last=now;update(dt);render();if(state.running)requestAnimationFrame(loop);}

  function setControl(name,value){if(name==='jump'&&value&&!input.jump)input.jumpPressed=true;input[name]=value;}
  function setSkyJoystick(clientX){
    if(!joystick||!joystickKnob)return;
    const rect=joystick.getBoundingClientRect();
    const radius=Math.max(1,rect.width*.29);
    const axis=Math.max(-1,Math.min(1,(clientX-(rect.left+rect.width/2))/radius));
    input.axisX=Math.abs(axis)<.08?0:axis;
    joystickKnob.style.transform=`translateX(${Math.round(input.axisX*radius)}px)`;
  }
  function resetSkyJoystick(){
    input.axisX=0;
    if(joystickKnob)joystickKnob.style.transform='translateX(0)';
  }
  if(joystick){
    let joystickPointer=null;
    joystick.addEventListener('pointerdown',event=>{
      event.preventDefault();joystickPointer=event.pointerId;joystick.setPointerCapture?.(event.pointerId);setSkyJoystick(event.clientX);
    },{passive:false});
    joystick.addEventListener('pointermove',event=>{if(event.pointerId===joystickPointer){event.preventDefault();setSkyJoystick(event.clientX);}},{passive:false});
    const releaseJoystick=event=>{if(joystickPointer===null||event.pointerId===joystickPointer){joystickPointer=null;resetSkyJoystick();}};
    joystick.addEventListener('pointerup',releaseJoystick,{passive:false});
    joystick.addEventListener('pointercancel',releaseJoystick,{passive:false});
    joystick.addEventListener('lostpointercapture',()=>{joystickPointer=null;resetSkyJoystick();});
  }
  const keyMap={arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowup:'jump',w:'jump',' ':'jump'};
  window.addEventListener('keydown',e=>{if(!state.open)return;const k=keyMap[e.key.toLowerCase()];if(k){e.preventDefault();setControl(k,true);}});
  window.addEventListener('keyup',e=>{if(!state.open)return;const k=keyMap[e.key.toLowerCase()];if(k){e.preventDefault();setControl(k,false);}});
  let skyJumpPointer=null;
  const releaseSkyJump=event=>{
    if(skyJumpPointer===null||event.pointerId===skyJumpPointer){
      skyJumpPointer=null;
      jumpZone?.classList.remove('active');
      setControl('jump',false);
    }
  };
  const bindSkyJumpSurface=surface=>{
    if(!surface)return;
    surface.addEventListener('pointerdown',event=>{
      if(!state.open||!state.running)return;
      if(event.pointerType==='mouse'&&event.button!==0)return;
      event.preventDefault();
      skyJumpPointer=event.pointerId;
      surface.setPointerCapture?.(event.pointerId);
      jumpZone?.classList.add('active');
      setControl('jump',true);
    },{passive:false});
    surface.addEventListener('pointerup',releaseSkyJump,{passive:false});
    surface.addEventListener('pointercancel',releaseSkyJump,{passive:false});
    surface.addEventListener('lostpointercapture',event=>releaseSkyJump(event));
  };
  bindSkyJumpSurface(canvas);
  bindSkyJumpSurface(jumpZone);
  ui.start.addEventListener('click',startRun);ui.close.addEventListener('click',closeSkyRun);panel.addEventListener('pointerdown',e=>{if(e.target===panel)closeSkyRun();});

  function nearestArcadeGameSpot(){
    const thing=arcadeInteractionThing();
    return thing&&['ring-rumble','sky-run','platform-panic','flappy-jetpack'].includes(thing.type)?thing:null;
  }
  window.atmNearestArcadeGameSpot=nearestArcadeGameSpot;
  const originalNearestThing=nearestThing;
  nearestThing=function(){
    if(currentMap==='arcade'){
      const tradeTarget=nearestTradeBeaconRemote();if(tradeTarget)return tradeTarget;
      const payTarget=nearestAtmPayRemote();if(payTarget)return payTarget;
      const exit=interiorExitThing();if(exit)return exit;
      return arcadeInteractionThing();
    }
    return originalNearestThing();
  };
  const originalInteract=interact;
  interact=function(){
    if(currentMap==='arcade'&&!dialogOpen){
      const game=nearestArcadeGameSpot();
      if(game?.id==='atmRingRumble'){window.openATMRingRumble?.();return;}
      if(game?.id==='atmSkyRun'){openSkyRun();return;}
      if(game?.id==='atmPlatformPanic'){window.openATMPlatformPanic?.();return;}
      if(game?.id==='atmFlappyJetpack'){window.openATMFlappyJetpack?.();return;}
    }
    return originalInteract();
  };
})();
