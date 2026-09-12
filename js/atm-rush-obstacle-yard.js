(()=>{
'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d',{alpha:false});
const ui={zone:document.getElementById('zone'),overlay:document.getElementById('overlay'),start:document.getElementById('start'),toast:document.getElementById('toast'),joy:document.getElementById('joy'),knob:document.getElementById('joyKnob')};
const DPR=()=>Math.min(2,Math.max(1,devicePixelRatio||1));
const WORLD={w:3600,h:4300};let CW=0,CH=0,scale=1,viewW=1100,viewH=1500;
const input={x:0,y:0,keys:new Set(),jumpPressed:false};
const player={x:360,y:4070,z:0,vx:0,vy:0,vz:0,onGround:true,anim:0,face:'up',inv:0};
const state={running:false,last:0,time:0,cameraX:0,cameraY:3200,toastT:0,shake:0};
const atm=new Image();atm.decoding='async';atm.src='assets/characters/playable/atm.webp';
const C={floor:'#17354a',bay:'#214d64',cyan:'#48e6ff',gold:'#ffd84d',red:'#ff315f',purple:'#8b5cff',green:'#6ee889',orange:'#ff8a45'};
function resize(){CW=innerWidth;CH=innerHeight;const d=DPR();canvas.width=Math.round(CW*d);canvas.height=Math.round(CH*d);canvas.style.width=CW+'px';canvas.style.height=CH+'px';viewW=1100;viewH=1100*(CH/CW);scale=CW/viewW}
addEventListener('resize',resize,{passive:true});resize();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sx=x=>(x-state.cameraX)*scale,sy=y=>(y-state.cameraY)*scale;
function rr(x,y,w,h,r=18){ctx.beginPath();ctx.roundRect(sx(x),sy(y),sx(w),sx(h),sx(r));ctx.fill()}
function toast(t){ui.toast.textContent=t;ui.toast.classList.add('on');state.toastT=1.1}
const layout=[['ROTATING BAR',300,350],['DOUBLE SWEEPER',900,350],['SIDE PUSHER',1500,350],['CRUSHER GATE',2100,350],['SWINGING HAMMER',2700,350],['MUD PIT',300,1000],['ICE FLOOR',900,1000],['CONVEYOR BELT',1500,1000],['SPEED PAD',2100,1000],['STICKY FLOOR',2700,1000],['SEESAW PLATFORM',300,1650],['GRAVITY SWAY DECK',900,1650],['MOVING PLATFORM',1500,1650],['ROTATING DISC',2100,1650],['DISAPPEARING TILES',2700,1650],['BOUNCE PAD',300,2300],['LAUNCH RAMP',900,2300],['STEPPING STONES',1500,2300],['BREAKAWAY BRIDGE',2100,2300],['TRAP DOOR',2700,2300],['FAN PUSH',300,2950],['BUMPER FIELD',900,2950],['ROLLING BALLS',1500,2950],['AIR CANNON',2100,2950],['SPIN POLES',2700,2950],['OSCILLATING WALL',300,3600],['TIMED GATES',900,3600],['ELEVATOR PAD',1500,3600],['LOW GRAVITY ZONE',2100,3600],['PENDULUM ALLEY',2700,3600]];
const bays=layout.map(([name,x,y])=>({name,x,y,w:500,h:500}));
const obstacles=[];const add=(type,name,x,y,extra={})=>obstacles.push({type,name,x,y,...extra});
for(const b of bays){const cx=b.x+250,cy=b.y+250;
 if(b.name==='ROTATING BAR')add('sweeper',b.name,cx,cy,{len:190,speed:1.8});
 else if(b.name==='DOUBLE SWEEPER'){add('sweeper',b.name,cx,cy-55,{len:175,speed:2.4});add('sweeper',b.name,cx,cy+55,{len:175,speed:-1.7,phase:1.2})}
 else if(b.name==='SIDE PUSHER')add('pusher',b.name,b.x+80,cy,{side:'l'});
 else if(b.name==='CRUSHER GATE')add('crusher',b.name,cx,cy);
 else if(b.name==='SWINGING HAMMER')add('hammer',b.name,cx,cy);
 else if(b.name==='MUD PIT')add('zone',b.name,b.x+90,b.y+110,{w:320,h:220,effect:'mud'});
 else if(b.name==='ICE FLOOR')add('zone',b.name,b.x+85,b.y+105,{w:330,h:230,effect:'ice'});
 else if(b.name==='CONVEYOR BELT')add('zone',b.name,b.x+70,b.y+140,{w:360,h:160,effect:'conveyor'});
 else if(b.name==='SPEED PAD')add('zone',b.name,b.x+100,b.y+145,{w:300,h:150,effect:'speed'});
 else if(b.name==='STICKY FLOOR')add('zone',b.name,b.x+90,b.y+110,{w:320,h:220,effect:'sticky'});
 else if(b.name==='SEESAW PLATFORM')add('seesaw',b.name,cx,cy,{w:330,h:120,tilt:0,vel:0});
 else if(b.name==='GRAVITY SWAY DECK')add('sway',b.name,cx,cy,{w:310,h:150,tx:0,ty:0,vx:0,vy:0});
 else if(b.name==='MOVING PLATFORM')add('moving',b.name,cx,cy,{w:180,h:110,range:150,speed:1});
 else if(b.name==='ROTATING DISC')add('disc',b.name,cx,cy,{r:140,speed:.8});
 else if(b.name==='DISAPPEARING TILES')add('tiles',b.name,b.x+85,b.y+105,{cols:4,rows:3,size:70,gap:8});
 else if(b.name==='BOUNCE PAD')add('bounce',b.name,cx,cy,{r:95});
 else if(b.name==='LAUNCH RAMP')add('ramp',b.name,b.x+90,b.y+125,{w:320,h:210});
 else if(b.name==='STEPPING STONES')add('stones',b.name,b.x+80,b.y+120);
 else if(b.name==='BREAKAWAY BRIDGE')add('breakaway',b.name,b.x+65,b.y+160,{count:6});
 else if(b.name==='TRAP DOOR')add('trap',b.name,cx,cy,{w:220,h:180});
 else if(b.name==='FAN PUSH')add('fan',b.name,cx,cy,{r:95});
 else if(b.name==='BUMPER FIELD')add('bumpers',b.name,b.x+100,b.y+110);
 else if(b.name==='ROLLING BALLS')add('rollers',b.name,b.x+70,b.y+100);
 else if(b.name==='AIR CANNON')add('cannon',b.name,b.x+90,cy);
 else if(b.name==='SPIN POLES')add('spinPoles',b.name,cx,cy);
 else if(b.name==='OSCILLATING WALL')add('wall',b.name,cx,cy,{w:280});
 else if(b.name==='TIMED GATES')add('gates',b.name,b.x+90,b.y+95);
 else if(b.name==='ELEVATOR PAD')add('elevator',b.name,cx,cy,{r:100});
 else if(b.name==='LOW GRAVITY ZONE')add('zone',b.name,b.x+80,b.y+100,{w:340,h:240,effect:'lowgrav'});
 else if(b.name==='PENDULUM ALLEY')add('pendulum',b.name,b.x+90,b.y+120);
}
function reset(){Object.assign(player,{x:360,y:4070,z:0,vx:0,vy:0,vz:0,onGround:true,anim:0,face:'up',inv:0});Object.assign(state,{running:true,last:performance.now(),time:0,cameraX:0,cameraY:3200,toastT:0,shake:0});ui.overlay.style.display='none';requestAnimationFrame(loop)}
ui.start.addEventListener('click',reset);
function key(e,d){const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d'].includes(k))e.preventDefault();d?input.keys.add(k):input.keys.delete(k);if(d&&k===' ')input.jumpPressed=true}
addEventListener('keydown',e=>key(e,true));addEventListener('keyup',e=>key(e,false));
let joyId=null;function joyMove(e){if(e.pointerId!==joyId)return;const r=ui.joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.31,m=Math.hypot(dx,dy)||1,n=Math.min(max,m);input.x=dx/m*n/max;input.y=dy/m*n/max;ui.knob.style.transform=`translate(${dx/m*n}px,${dy/m*n}px)`}
ui.joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;ui.joy.setPointerCapture(e.pointerId);joyMove(e)});ui.joy.addEventListener('pointermove',joyMove);function joyEnd(e){if(e.pointerId!==joyId)return;joyId=null;input.x=input.y=0;ui.knob.style.transform='translate(0,0)'}ui.joy.addEventListener('pointerup',joyEnd);ui.joy.addEventListener('pointercancel',joyEnd);
addEventListener('pointerdown',e=>{if(!state.running||ui.overlay.style.display!=='none'||ui.joy.contains(e.target))return;if(e.pointerType==='touch'||e.pointerType==='pen'){input.jumpPressed=true;e.preventDefault()}},{passive:false});
function inRect(o){return player.x>o.x&&player.x<o.x+o.w&&player.y>o.y&&player.y<o.y+o.h}
function nearestBay(){let best=null,bd=Infinity;for(const b of bays){const dx=player.x-(b.x+250),dy=player.y-(b.y+250),d=dx*dx+dy*dy;if(d<bd){bd=d;best=b}}ui.zone.textContent=best?best.name:'YARD'}
function knock(dx,dy,p=340){if(player.inv>0)return;const m=Math.hypot(dx,dy)||1;player.vx=dx/m*p;player.vy=dy/m*p;player.inv=.35;state.shake=9}
function update(dt){state.time+=dt;player.inv=Math.max(0,player.inv-dt);let kx=(input.keys.has('arrowright')||input.keys.has('d')?1:0)-(input.keys.has('arrowleft')||input.keys.has('a')?1:0),ky=(input.keys.has('arrowdown')||input.keys.has('s')?1:0)-(input.keys.has('arrowup')||input.keys.has('w')?1:0),ix=Math.abs(input.x)>.08?input.x:kx,iy=Math.abs(input.y)>.08?input.y:ky,m=Math.hypot(ix,iy);if(m>1){ix/=m;iy/=m}
 let speed=245,ice=false,conveyor=0,lowgrav=false;for(const o of obstacles)if(o.type==='zone'&&inRect(o)){if(o.effect==='mud')speed=105;if(o.effect==='sticky')speed=75;if(o.effect==='speed')speed=430;if(o.effect==='ice')ice=true;if(o.effect==='conveyor')conveyor=-150;if(o.effect==='lowgrav')lowgrav=true}
 if(player.inv<=0){if(ice){player.vx+=(ix*speed-player.vx)*Math.min(1,dt*2.2);player.vy+=(iy*speed-player.vy)*Math.min(1,dt*2.2)}else{player.vx=ix*speed;player.vy=iy*speed}}else{player.vx*=Math.max(0,1-dt*2);player.vy*=Math.max(0,1-dt*2)}player.vy+=conveyor;
 if(Math.abs(ix)>Math.abs(iy)&&Math.abs(ix)>.1)player.face=ix<0?'left':'right';else if(Math.abs(iy)>.1)player.face=iy<0?'up':'down';
 if(input.jumpPressed){input.jumpPressed=false;if(player.onGround){player.vz=lowgrav?430:360;player.onGround=false}}
 player.vz-=(lowgrav?470:920)*dt;player.z+=player.vz*dt;if(player.z<=0){player.z=0;player.vz=0;player.onGround=true}else player.onGround=false;
 player.x=clamp(player.x+player.vx*dt,45,WORLD.w-45);player.y=clamp(player.y+player.vy*dt,45,WORLD.h-45);player.anim+=Math.hypot(player.vx,player.vy)*dt*.025;updatePhysics(dt);nearestBay();const tx=player.x-viewW*.5,ty=player.y-viewH*.55;state.cameraX+=(tx-state.cameraX)*Math.min(1,dt*5);state.cameraY+=(ty-state.cameraY)*Math.min(1,dt*5);state.cameraX=clamp(state.cameraX,0,Math.max(0,WORLD.w-viewW));state.cameraY=clamp(state.cameraY,0,Math.max(0,WORLD.h-viewH));state.toastT=Math.max(0,state.toastT-dt);if(state.toastT<=0)ui.toast.classList.remove('on');state.shake=Math.max(0,state.shake-dt*25)}
function updatePhysics(dt){for(const o of obstacles){if(o.type==='seesaw'){const on=Math.abs(player.x-o.x)<o.w/2&&Math.abs(player.y-o.y)<o.h/2&&player.z<20,target=on?clamp((player.x-o.x)/(o.w/2),-1,1)*.34:0;o.vel+=(target-o.tilt)*8*dt;o.vel*=Math.pow(.2,dt);o.tilt+=o.vel*dt}
 else if(o.type==='sway'){const on=Math.abs(player.x-(o.x+o.tx))<o.w/2&&Math.abs(player.y-(o.y+o.ty))<o.h/2&&player.z<20;let ax=-o.tx*1.6,ay=-o.ty*1.6;if(on){ax+=(player.x-(o.x+o.tx))*.55;ay+=(player.y-(o.y+o.ty))*.55}o.vx=(o.vx+ax*dt)*Math.pow(.35,dt);o.vy=(o.vy+ay*dt)*Math.pow(.35,dt);o.tx=clamp(o.tx+o.vx*dt,-55,55);o.ty=clamp(o.ty+o.vy*dt,-55,55);if(on){player.x+=o.vx*dt;player.y+=o.vy*dt}}
 else if(o.type==='bounce'&&Math.hypot(player.x-o.x,player.y-o.y)<o.r&&player.z<12){player.vz=540;player.onGround=false}
 else if(o.type==='fan'){const dx=player.x-o.x,dy=player.y-o.y,d=Math.hypot(dx,dy);if(d<190&&d>5){player.vx+=dx/d*100*dt;player.vy+=dy/d*100*dt}}
 else if(o.type==='sweeper'&&player.z<45){const a=state.time*o.speed+(o.phase||0),bx=o.x+Math.cos(a)*o.len,by=o.y+Math.sin(a)*o.len,vx=bx-o.x,vy=by-o.y,wx=player.x-o.x,wy=player.y-o.y,t=clamp((wx*vx+wy*vy)/(vx*vx+vy*vy),0,1),px=o.x+t*vx,py=o.y+t*vy,dx=player.x-px,dy=player.y-py;if(Math.hypot(dx,dy)<30)knock(dx,dy,390)}
 else if(o.type==='crusher'&&player.z<40){const close=(Math.sin(state.time*2.3)+1)/2,gap=60+160*(1-close);if(Math.abs(player.y-o.y)<65&&Math.abs(player.x-o.x)>gap/2&&Math.abs(player.x-o.x)<210)knock(player.x<o.x?-1:1,0,360)}
 else if(o.type==='wall'&&player.z<45){const x=o.x+Math.sin(state.time*1.5)*125;if(Math.abs(player.x-x)<o.w/2&&Math.abs(player.y-o.y)<45)knock(player.x-x,.1,330)}
 else if(o.type==='bumpers'&&player.z<45){for(let i=0;i<6;i++){const x=o.x+(i%3)*120,y=o.y+Math.floor(i/3)*130,dx=player.x-x,dy=player.y-y;if(Math.hypot(dx,dy)<62)knock(dx,dy,420)}}
 else if(o.type==='ramp'&&inRect(o)&&player.vy<0&&player.z<18){player.vz=Math.max(player.vz,470);player.onGround=false}
 }}
function drawBay(b){ctx.fillStyle=C.bay;rr(b.x,b.y,b.w,b.h,28);ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=sx(3);ctx.strokeRect(sx(b.x),sy(b.y),sx(b.w),sx(b.h));ctx.fillStyle='rgba(2,8,16,.84)';rr(b.x+35,b.y+b.h-72,b.w-70,48,10);ctx.fillStyle='#fff';ctx.font=`900 ${Math.max(8,sx(22))}px system-ui`;ctx.textAlign='center';ctx.fillText(b.name,sx(b.x+b.w/2),sy(b.y+b.h-40))}
function drawOne(o){ctx.save();try{
 if(o.type==='zone'){ctx.fillStyle=o.effect==='mud'?'#60482f':o.effect==='ice'?'#a6e8ff':o.effect==='conveyor'?'#303746':o.effect==='speed'?C.cyan:o.effect==='sticky'?'#71512e':'rgba(151,112,255,.45)';rr(o.x,o.y,o.w,o.h,20);if(o.effect==='conveyor'){ctx.fillStyle='#fff';ctx.font=`900 ${sx(34)}px system-ui`;ctx.textAlign='center';ctx.fillText('↑ ↑ ↑',sx(o.x+o.w/2),sy(o.y+o.h*.62))}}
 else if(o.type==='sweeper'){const a=state.time*o.speed+(o.phase||0),bx=o.x+Math.cos(a)*o.len,by=o.y+Math.sin(a)*o.len;ctx.strokeStyle=C.red;ctx.lineWidth=sx(28);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(sx(o.x),sy(o.y));ctx.lineTo(sx(bx),sy(by));ctx.stroke();ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(sx(o.x),sy(o.y),sx(28),0,Math.PI*2);ctx.fill()}
 else if(o.type==='pusher'){const ph=(state.time%2.2)/2.2,ext=ph<.28?Math.sin(ph/.28*Math.PI):0;ctx.fillStyle=C.orange;rr(o.x,o.y-50,120+230*ext,100,14)}
 else if(o.type==='crusher'){const close=(Math.sin(state.time*2.3)+1)/2,gap=60+160*(1-close);ctx.fillStyle='#76253e';ctx.fillRect(sx(o.x-215),sy(o.y-65),sx(215-gap/2),sx(130));ctx.fillRect(sx(o.x+gap/2),sy(o.y-65),sx(215-gap/2),sx(130))}
 else if(o.type==='hammer'){const a=Math.sin(state.time*1.8)*1.05,ex=o.x+Math.sin(a)*170,ey=o.y+Math.cos(a)*90;ctx.strokeStyle='#d7dfe8';ctx.lineWidth=sx(10);ctx.beginPath();ctx.moveTo(sx(o.x),sy(o.y-150));ctx.lineTo(sx(ex),sy(ey));ctx.stroke();ctx.fillStyle=C.red;rr(ex-45,ey-35,90,70,18)}
 else if(o.type==='seesaw'){ctx.translate(sx(o.x),sy(o.y));ctx.rotate(o.tilt);ctx.fillStyle=C.gold;ctx.fillRect(-sx(o.w/2),-sx(o.h/2),sx(o.w),sx(o.h));ctx.fillStyle='#8898a8';ctx.beginPath();ctx.arc(0,0,sx(22),0,Math.PI*2);ctx.fill()}
 else if(o.type==='sway'){ctx.fillStyle=C.purple;rr(o.x+o.tx-o.w/2,o.y+o.ty-o.h/2,o.w,o.h,18);ctx.strokeStyle='rgba(255,255,255,.6)';ctx.beginPath();ctx.moveTo(sx(o.x-120),sy(o.y-75));ctx.lineTo(sx(o.x-120+o.tx),sy(o.y-75+o.ty));ctx.moveTo(sx(o.x+120),sy(o.y-75));ctx.lineTo(sx(o.x+120+o.tx),sy(o.y-75+o.ty));ctx.stroke()}
 else if(o.type==='moving'){const x=o.x+Math.sin(state.time*o.speed)*o.range;ctx.fillStyle='#416bff';rr(x-o.w/2,o.y-o.h/2,o.w,o.h,16)}
 else if(o.type==='disc'){ctx.translate(sx(o.x),sy(o.y));ctx.rotate(state.time*o.speed);ctx.fillStyle='#3559a5';ctx.beginPath();ctx.arc(0,0,sx(o.r),0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=sx(4);for(let i=0;i<6;i++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(sx(o.r),0);ctx.stroke()}}
 else if(o.type==='tiles'){for(let r=0;r<o.rows;r++)for(let c=0;c<o.cols;c++){const idx=r*o.cols+c,visible=((Math.floor(state.time*1.2)+idx)%4)!==0;if(visible){ctx.fillStyle=idx%2?C.cyan:'#277a99';rr(o.x+c*(o.size+o.gap),o.y+r*(o.size+o.gap),o.size,o.size,8)}}}
 else if(o.type==='bounce'){ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(sx(o.x),sy(o.y),sx(o.r),0,Math.PI*2);ctx.fill();ctx.fillStyle='#5a4300';ctx.font=`900 ${sx(22)}px system-ui`;ctx.textAlign='center';ctx.fillText('BOUNCE',sx(o.x),sy(o.y+7))}
 else if(o.type==='ramp'){ctx.fillStyle=C.orange;ctx.beginPath();ctx.moveTo(sx(o.x),sy(o.y+o.h));ctx.lineTo(sx(o.x+o.w),sy(o.y+o.h));ctx.lineTo(sx(o.x+o.w*.78),sy(o.y));ctx.lineTo(sx(o.x+o.w*.22),sy(o.y));ctx.closePath();ctx.fill()}
 else if(o.type==='stones'){for(let i=0;i<6;i++){ctx.fillStyle=i%2?'#9fc6d8':'#6a9ab0';ctx.beginPath();ctx.arc(sx(o.x+(i%3)*120),sy(o.y+Math.floor(i/3)*130),sx(45),0,Math.PI*2);ctx.fill()}}
 else if(o.type==='breakaway'){for(let i=0;i<o.count;i++){const visible=((Math.floor(state.time*.9)+i)%7)!==0;if(visible){ctx.fillStyle='#b16a42';rr(o.x+i*60,o.y,54,150,7)}}}
 else if(o.type==='trap'){const open=Math.sin(state.time*2)>0.45;ctx.fillStyle=open?'#090e14':'#a14b54';ctx.fillRect(sx(o.x-o.w/2),sy(o.y-o.h/2),sx(o.w),sx(o.h));ctx.strokeStyle='#f5bdc3';ctx.strokeRect(sx(o.x-o.w/2),sy(o.y-o.h/2),sx(o.w),sx(o.h))}
 else if(o.type==='fan'){ctx.translate(sx(o.x),sy(o.y));ctx.rotate(state.time*3);ctx.fillStyle='#19232c';ctx.beginPath();ctx.arc(0,0,sx(o.r),0,Math.PI*2);ctx.fill();ctx.fillStyle=C.cyan;for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.fillRect(0,-sx(11),sx(o.r*.75),sx(22))}}
 else if(o.type==='bumpers'){for(let i=0;i<6;i++){const x=o.x+(i%3)*120,y=o.y+Math.floor(i/3)*130;ctx.fillStyle=i%2?C.red:C.purple;ctx.beginPath();ctx.arc(sx(x),sy(y),sx(38),0,Math.PI*2);ctx.fill()}}
 else if(o.type==='rollers'){for(let i=0;i<4;i++){const yy=o.y+((state.time*100+i*95)%260),xx=o.x+60+i*85;ctx.fillStyle='#c76731';ctx.beginPath();ctx.arc(sx(xx),sy(yy),sx(30),0,Math.PI*2);ctx.fill()}}
 else if(o.type==='cannon'){ctx.fillStyle='#263747';rr(o.x,o.y-55,110,110,18);ctx.fillStyle='#111';ctx.fillRect(sx(o.x+85),sy(o.y-18),sx(120),sx(36));const bx=o.x+170+((state.time*170)%210);ctx.fillStyle=C.red;ctx.beginPath();ctx.arc(sx(bx),sy(o.y),sx(26),0,Math.PI*2);ctx.fill()}
 else if(o.type==='spinPoles'){for(let i=0;i<3;i++){const cx=o.x-120+i*120,a=state.time*(1.3+i*.35);ctx.strokeStyle=i%2?C.gold:C.red;ctx.lineWidth=sx(18);ctx.beginPath();ctx.moveTo(sx(cx),sy(o.y));ctx.lineTo(sx(cx+Math.cos(a)*85),sy(o.y+Math.sin(a)*85));ctx.stroke()}}
 else if(o.type==='wall'){const x=o.x+Math.sin(state.time*1.5)*125;ctx.fillStyle='#c55273';rr(x-o.w/2,o.y-28,o.w,56,10)}
 else if(o.type==='gates'){for(let i=0;i<3;i++){const open=((state.time+i*.7)%2.4)<1.25;ctx.fillStyle=open?'#4cbd76':'#b94357';ctx.fillRect(sx(o.x+i*105),sy(o.y),sx(70),sx(open?45:230))}}
 else if(o.type==='elevator'){const h=35+35*Math.sin(state.time*1.5);ctx.fillStyle='#52b1d1';ctx.beginPath();ctx.ellipse(sx(o.x),sy(o.y-h*.25),sx(o.r),sx(o.r*.55),0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.45)';ctx.beginPath();ctx.arc(sx(o.x),sy(o.y),sx(o.r+20),0,Math.PI*2);ctx.stroke()}
 else if(o.type==='pendulum'){for(let i=0;i<3;i++){const ax=o.x+i*120,ay=o.y-90,a=Math.sin(state.time*1.7+i)*.8,bx=ax+Math.sin(a)*110,by=ay+Math.cos(a)*145;ctx.strokeStyle='#d8e2eb';ctx.lineWidth=sx(5);ctx.beginPath();ctx.moveTo(sx(ax),sy(ay));ctx.lineTo(sx(bx),sy(by));ctx.stroke();ctx.fillStyle=C.red;ctx.beginPath();ctx.arc(sx(bx),sy(by),sx(34),0,Math.PI*2);ctx.fill()}}
 }catch(e){console.warn('ATM Rush obstacle draw skipped',o.name,o.type,e)}finally{ctx.restore()}}
function drawPlayer(){ctx.save();try{const rowMap={down:0,left:1,up:2,right:3},row=rowMap[player.face]??2,frame=((Math.floor(player.anim)%3)+3)%3,px=sx(player.x),py=sy(player.y)-sx(player.z);ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(px,sy(player.y+13),sx(25),sx(11),0,0,Math.PI*2);ctx.fill();if(atm.complete&&atm.naturalWidth>0&&Number.isFinite(frame)){const fw=atm.naturalWidth/3,fh=atm.naturalHeight/4;ctx.drawImage(atm,frame*fw,row*fh,fw,fh,px-sx(34),py-sx(70),sx(68),sx(92))}else{ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(px,py-sx(25),sx(24),0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(px-sx(18),py-sx(18),sx(36),sx(44))}}catch(e){console.warn('ATM Rush player draw fallback',e);ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(sx(player.x),sy(player.y)-sx(25),sx(24),0,Math.PI*2);ctx.fill()}finally{ctx.restore()}}
function render(){const d=DPR();ctx.setTransform(d,0,0,d,0,0);ctx.fillStyle='#0d2030';ctx.fillRect(0,0,CW,CH);ctx.save();ctx.translate((Math.random()-.5)*state.shake,(Math.random()-.5)*state.shake);ctx.fillStyle=C.floor;ctx.fillRect(sx(0),sy(0),sx(WORLD.w),sx(WORLD.h));ctx.strokeStyle='rgba(255,255,255,.025)';ctx.lineWidth=1;for(let x=0;x<WORLD.w;x+=100){ctx.beginPath();ctx.moveTo(sx(x),sy(0));ctx.lineTo(sx(x),sy(WORLD.h));ctx.stroke()}for(let y=0;y<WORLD.h;y+=100){ctx.beginPath();ctx.moveTo(sx(0),sy(y));ctx.lineTo(sx(WORLD.w),sy(y));ctx.stroke()}for(const b of bays)drawBay(b);for(const o of obstacles)drawOne(o);drawPlayer();ctx.restore()}
function loop(now){if(!state.running)return;const dt=Math.min(.033,Math.max(.001,(now-state.last)/1000||.016));state.last=now;try{update(dt)}catch(e){console.warn('ATM Rush yard update recovered',e)}render();requestAnimationFrame(loop)}
render();
})();