(()=>{
'use strict';
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d',{alpha:false});
const ui={zone:document.getElementById('zone'),overlay:document.getElementById('overlay'),start:document.getElementById('start'),toast:document.getElementById('toast'),joy:document.getElementById('joy'),knob:document.getElementById('joyKnob')};
const WORLD={w:3600,h:4300}, DPR=()=>Math.min(2,Math.max(1,window.devicePixelRatio||1));
let CW=1,CH=1,scale=1,viewW=1100,viewH=1700;
const state={running:false,last:0,time:0,cameraX:0,cameraY:3000,shake:0};
const input={x:0,y:0,keys:new Set(),jump:false};
const p={x:360,y:4070,z:0,vx:0,vy:0,vz:0,onGround:true,face:'up',anim:0,inv:0};
const atm=new Image(); atm.src='/assets/characters/playable/atm.webp';
const C={bg:'#0d2030',floor:'#17354a',bay:'#214d64',line:'rgba(255,255,255,.14)',red:'#ff315f',gold:'#ffd84d',cyan:'#48e6ff',purple:'#8b5cff',orange:'#ff8a45',green:'#6ee889'};
function resize(){CW=innerWidth;CH=innerHeight;const d=DPR();canvas.width=Math.max(1,Math.round(CW*d));canvas.height=Math.max(1,Math.round(CH*d));canvas.style.width=CW+'px';canvas.style.height=CH+'px';viewW=1100;viewH=1100*(CH/CW);scale=CW/viewW}
addEventListener('resize',resize,{passive:true});resize();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=v=>Number.isFinite(v);
function sx(x){return (x-state.cameraX)*scale} function sy(y){return (y-state.cameraY)*scale}
function safeRect(x,y,w,h,color){if(![x,y,w,h].every(finite))return;ctx.fillStyle=color;ctx.fillRect(sx(x),sy(y),w*scale,h*scale)}
const layout=[
['ROTATING BAR',300,350],['DOUBLE SWEEPER',900,350],['SIDE PUSHER',1500,350],['CRUSHER GATE',2100,350],['SWINGING HAMMER',2700,350],
['MUD PIT',300,1000],['ICE FLOOR',900,1000],['CONVEYOR BELT',1500,1000],['SPEED PAD',2100,1000],['STICKY FLOOR',2700,1000],
['SEESAW PLATFORM',300,1650],['GRAVITY SWAY DECK',900,1650],['MOVING PLATFORM',1500,1650],['ROTATING DISC',2100,1650],['DISAPPEARING TILES',2700,1650],
['BOUNCE PAD',300,2300],['LAUNCH RAMP',900,2300],['STEPPING STONES',1500,2300],['BREAKAWAY BRIDGE',2100,2300],['TRAP DOOR',2700,2300],
['FAN PUSH',300,2950],['BUMPER FIELD',900,2950],['ROLLING BALLS',1500,2950],['AIR CANNON',2100,2950],['SPIN POLES',2700,2950],
['OSCILLATING WALL',300,3600],['TIMED GATES',900,3600],['ELEVATOR PAD',1500,3600],['LOW GRAVITY ZONE',2100,3600],['PENDULUM ALLEY',2700,3600]
];
const bays=layout.map(([name,x,y])=>({name,x,y,w:500,h:500}));
const obs=[];
const add=(type,name,x,y,o={})=>obs.push({type,name,x,y,...o});
for(const b of bays){const x=b.x+250,y=b.y+240,n=b.name;
if(n==='ROTATING BAR')add('sweeper',n,x,y,{len:190,speed:1.8});
else if(n==='DOUBLE SWEEPER'){add('sweeper',n,x,y-55,{len:180,speed:2.4});add('sweeper',n,x,y+55,{len:180,speed:-1.7,phase:1.2})}
else if(n==='SIDE PUSHER')add('pusher',n,b.x+80,y);
else if(n==='CRUSHER GATE')add('crusher',n,x,y);
else if(n==='SWINGING HAMMER')add('hammer',n,x,y);
else if(n==='MUD PIT')add('zone',n,b.x+90,b.y+100,{w:320,h:220,effect:'mud'});
else if(n==='ICE FLOOR')add('zone',n,b.x+85,b.y+100,{w:330,h:220,effect:'ice'});
else if(n==='CONVEYOR BELT')add('zone',n,b.x+70,b.y+135,{w:360,h:160,effect:'conveyor'});
else if(n==='SPEED PAD')add('zone',n,b.x+100,b.y+140,{w:300,h:150,effect:'speed'});
else if(n==='STICKY FLOOR')add('zone',n,b.x+90,b.y+100,{w:320,h:220,effect:'sticky'});
else if(n==='SEESAW PLATFORM')add('seesaw',n,x,y,{w:330,h:120,tilt:0,vel:0});
else if(n==='GRAVITY SWAY DECK')add('sway',n,x,y,{w:310,h:150,tx:0,ty:0,vx:0,vy:0});
else if(n==='MOVING PLATFORM')add('moving',n,x,y,{w:180,h:110,range:150,speed:1});
else if(n==='ROTATING DISC')add('disc',n,x,y,{r:140,speed:.8});
else if(n==='DISAPPEARING TILES')add('tiles',n,b.x+85,b.y+100,{cols:4,rows:3,size:70,gap:8});
else if(n==='BOUNCE PAD')add('bounce',n,x,y,{r:95});
else if(n==='LAUNCH RAMP')add('ramp',n,b.x+90,b.y+120,{w:320,h:210});
else if(n==='STEPPING STONES')add('stones',n,b.x+80,b.y+115);
else if(n==='BREAKAWAY BRIDGE')add('breakaway',n,b.x+65,b.y+155,{count:6});
else if(n==='TRAP DOOR')add('trap',n,x,y,{w:220,h:180});
else if(n==='FAN PUSH')add('fan',n,x,y,{r:95});
else if(n==='BUMPER FIELD')add('bumpers',n,b.x+100,b.y+105);
else if(n==='ROLLING BALLS')add('rollers',n,b.x+70,b.y+95);
else if(n==='AIR CANNON')add('cannon',n,b.x+90,y);
else if(n==='SPIN POLES')add('spinPoles',n,x,y);
else if(n==='OSCILLATING WALL')add('wall',n,x,y,{w:280});
else if(n==='TIMED GATES')add('gates',n,b.x+90,b.y+90);
else if(n==='ELEVATOR PAD')add('elevator',n,x,y,{r:100});
else if(n==='LOW GRAVITY ZONE')add('zone',n,b.x+80,b.y+95,{w:340,h:240,effect:'lowgrav'});
else if(n==='PENDULUM ALLEY')add('pendulum',n,b.x+90,b.y+115);
}
function reset(){Object.assign(p,{x:360,y:4070,z:0,vx:0,vy:0,vz:0,onGround:true,face:'up',anim:0,inv:0});Object.assign(state,{running:true,last:performance.now(),time:0,cameraX:0,cameraY:Math.max(0,WORLD.h-viewH),shake:0});ui.overlay.style.display='none';requestAnimationFrame(loop)}
ui.start.addEventListener('click',reset);
function key(e,d){const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d'].includes(k))e.preventDefault();d?input.keys.add(k):input.keys.delete(k);if(d&&k===' ')input.jump=true}
addEventListener('keydown',e=>key(e,true));addEventListener('keyup',e=>key(e,false));
let joyId=null;
function joyMove(e){if(e.pointerId!==joyId)return;const r=ui.joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.31,m=Math.hypot(dx,dy)||1,n=Math.min(max,m);input.x=dx/m*n/max;input.y=dy/m*n/max;ui.knob.style.transform=`translate(${dx/m*n}px,${dy/m*n}px)`}
ui.joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;ui.joy.setPointerCapture(e.pointerId);joyMove(e)});
ui.joy.addEventListener('pointermove',joyMove);
function joyEnd(e){if(e.pointerId!==joyId)return;joyId=null;input.x=input.y=0;ui.knob.style.transform='translate(0,0)'}
ui.joy.addEventListener('pointerup',joyEnd);ui.joy.addEventListener('pointercancel',joyEnd);
addEventListener('pointerdown',e=>{if(!state.running||ui.overlay.style.display!=='none'||ui.joy.contains(e.target))return;if(e.pointerType==='touch'||e.pointerType==='pen'){input.jump=true;e.preventDefault()}},{passive:false});
function inZone(o){return p.x>o.x&&p.x<o.x+o.w&&p.y>o.y&&p.y<o.y+o.h}
function nearest(){let best=bays[0],d0=Infinity;for(const b of bays){const dx=p.x-(b.x+250),dy=p.y-(b.y+250),d=dx*dx+dy*dy;if(d<d0){d0=d;best=b}}ui.zone.textContent=best.name}
function knock(dx,dy,pow=360){if(p.inv>0)return;const m=Math.hypot(dx,dy)||1;p.vx=dx/m*pow;p.vy=dy/m*pow;p.inv=.35;state.shake=8}
function sanitize(){for(const k of ['x','y','z','vx','vy','vz','anim'])if(!finite(p[k]))p[k]=0;if(!finite(state.cameraX))state.cameraX=0;if(!finite(state.cameraY))state.cameraY=0;p.x=clamp(p.x||360,45,WORLD.w-45);p.y=clamp(p.y||4070,45,WORLD.h-45);for(const o of obs){for(const k of ['tx','ty','vx','vy','tilt','vel'])if(k in o&&!finite(o[k]))o[k]=0}}
function update(dt){state.time+=dt;p.inv=Math.max(0,p.inv-dt);let kx=(input.keys.has('arrowright')||input.keys.has('d')?1:0)-(input.keys.has('arrowleft')||input.keys.has('a')?1:0),ky=(input.keys.has('arrowdown')||input.keys.has('s')?1:0)-(input.keys.has('arrowup')||input.keys.has('w')?1:0),ix=Math.abs(input.x)>.08?input.x:kx,iy=Math.abs(input.y)>.08?input.y:ky,m=Math.hypot(ix,iy);if(m>1){ix/=m;iy/=m}
let speed=245,ice=false,conv=0,low=false;for(const o of obs)if(o.type==='zone'&&inZone(o)){if(o.effect==='mud')speed=105;if(o.effect==='sticky')speed=75;if(o.effect==='speed')speed=430;if(o.effect==='ice')ice=true;if(o.effect==='conveyor')conv=-150;if(o.effect==='lowgrav')low=true}
if(p.inv<=0){if(ice){p.vx+=(ix*speed-p.vx)*Math.min(1,dt*2.2);p.vy+=(iy*speed-p.vy)*Math.min(1,dt*2.2)}else{p.vx=ix*speed;p.vy=iy*speed}}else{p.vx*=Math.max(0,1-dt*2);p.vy*=Math.max(0,1-dt*2)}
p.vy+=conv;if(Math.abs(ix)>Math.abs(iy)&&Math.abs(ix)>.1)p.face=ix<0?'left':'right';else if(Math.abs(iy)>.1)p.face=iy<0?'up':'down';
if(input.jump){input.jump=false;if(p.onGround){p.vz=low?430:360;p.onGround=false}}
p.vz-=(low?470:920)*dt;p.z+=p.vz*dt;if(p.z<=0){p.z=0;p.vz=0;p.onGround=true}else p.onGround=false;
p.x+=p.vx*dt;p.y+=p.vy*dt;
for(const o of obs){if(o.type==='seesaw'){const on=Math.abs(p.x-o.x)<o.w/2&&Math.abs(p.y-o.y)<o.h/2&&p.z<20,target=on?clamp((p.x-o.x)/(o.w/2),-1,1)*.34:0;o.vel+=(target-o.tilt)*8*dt;o.vel*=Math.pow(.2,dt);o.tilt+=o.vel*dt}
else if(o.type==='sway'){const on=Math.abs(p.x-(o.x+o.tx))<o.w/2&&Math.abs(p.y-(o.y+o.ty))<o.h/2&&p.z<20;let ax=-o.tx*1.6,ay=-o.ty*1.6;if(on){ax+=(p.x-(o.x+o.tx))*.55;ay+=(p.y-(o.y+o.ty))*.55}o.vx=(o.vx+ax*dt)*Math.pow(.35,dt);o.vy=(o.vy+ay*dt)*Math.pow(.35,dt);o.tx=clamp(o.tx+o.vx*dt,-55,55);o.ty=clamp(o.ty+o.vy*dt,-55,55);if(on){p.x+=o.vx*dt;p.y+=o.vy*dt}}
else if(o.type==='bounce'&&Math.hypot(p.x-o.x,p.y-o.y)<o.r&&p.z<12){p.vz=540;p.onGround=false}
else if(o.type==='fan'){const dx=p.x-o.x,dy=p.y-o.y,d=Math.hypot(dx,dy);if(d<190&&d>5){p.vx+=dx/d*100*dt;p.vy+=dy/d*100*dt}}
else if(o.type==='sweeper'&&p.z<45){const a=state.time*o.speed+(o.phase||0),bx=o.x+Math.cos(a)*o.len,by=o.y+Math.sin(a)*o.len,vx=bx-o.x,vy=by-o.y,wx=p.x-o.x,wy=p.y-o.y,t=clamp((wx*vx+wy*vy)/(vx*vx+vy*vy),0,1),px=o.x+t*vx,py=o.y+t*vy,dx=p.x-px,dy=p.y-py;if(Math.hypot(dx,dy)<30)knock(dx,dy,390)}
else if(o.type==='crusher'&&p.z<40){const close=(Math.sin(state.time*2.3)+1)/2,gap=60+160*(1-close);if(Math.abs(p.y-o.y)<65&&Math.abs(p.x-o.x)>gap/2&&Math.abs(p.x-o.x)<210)knock(p.x<o.x?-1:1,0)}
else if(o.type==='wall'&&p.z<45){const x=o.x+Math.sin(state.time*1.5)*125;if(Math.abs(p.x-x)<o.w/2&&Math.abs(p.y-o.y)<45)knock(p.x-x,.1,330)}}
p.x=clamp(p.x,45,WORLD.w-45);p.y=clamp(p.y,45,WORLD.h-45);p.anim+=Math.hypot(p.vx,p.vy)*dt*.025;sanitize();nearest();
const tx=p.x-viewW*.5,ty=p.y-viewH*.55;state.cameraX+=(tx-state.cameraX)*Math.min(1,dt*5);state.cameraY+=(ty-state.cameraY)*Math.min(1,dt*5);state.cameraX=clamp(state.cameraX,0,Math.max(0,WORLD.w-viewW));state.cameraY=clamp(state.cameraY,0,Math.max(0,WORLD.h-viewH));state.shake=Math.max(0,state.shake-dt*24)}
function drawBay(b){safeRect(b.x,b.y,b.w,b.h,C.bay);ctx.strokeStyle=C.line;ctx.lineWidth=Math.max(1,3*scale);ctx.strokeRect(sx(b.x),sy(b.y),b.w*scale,b.h*scale);safeRect(b.x+35,b.y+b.h-72,b.w-70,48,'rgba(2,8,16,.86)');ctx.fillStyle='#fff';ctx.font=`900 ${Math.max(10,22*scale)}px system-ui`;ctx.textAlign='center';ctx.fillText(b.name,sx(b.x+b.w/2),sy(b.y+b.h-40))}
function drawObstacle(o){ctx.save();try{
if(o.type==='zone'){let col=o.effect==='mud'?'#60482f':o.effect==='ice'?'#a6e8ff':o.effect==='conveyor'?'#303746':o.effect==='speed'?C.cyan:o.effect==='sticky'?'#71512e':'rgba(151,112,255,.5)';safeRect(o.x,o.y,o.w,o.h,col)}
else if(o.type==='sweeper'){const a=state.time*o.speed+(o.phase||0),bx=o.x+Math.cos(a)*o.len,by=o.y+Math.sin(a)*o.len;ctx.strokeStyle=C.red;ctx.lineWidth=28*scale;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(sx(o.x),sy(o.y));ctx.lineTo(sx(bx),sy(by));ctx.stroke();ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(sx(o.x),sy(o.y),28*scale,0,Math.PI*2);ctx.fill()}
else if(o.type==='pusher'){const ph=(state.time%2.2)/2.2,ext=ph<.28?Math.sin(ph/.28*Math.PI):0;safeRect(o.x,o.y-50,120+230*ext,100,C.orange)}
else if(o.type==='crusher'){const c=(Math.sin(state.time*2.3)+1)/2,g=60+160*(1-c);safeRect(o.x-215,o.y-65,215-g/2,130,'#76253e');safeRect(o.x+g/2,o.y-65,215-g/2,130,'#76253e')}
else if(o.type==='hammer'){const a=Math.sin(state.time*1.8)*1.05,ex=o.x+Math.sin(a)*170,ey=o.y+Math.cos(a)*90;ctx.strokeStyle='#d7dfe8';ctx.lineWidth=10*scale;ctx.beginPath();ctx.moveTo(sx(o.x),sy(o.y-150));ctx.lineTo(sx(ex),sy(ey));ctx.stroke();safeRect(ex-45,ey-35,90,70,C.red)}
else if(o.type==='seesaw'){ctx.translate(sx(o.x),sy(o.y));ctx.rotate(o.tilt);ctx.fillStyle=C.gold;ctx.fillRect(-o.w*scale/2,-o.h*scale/2,o.w*scale,o.h*scale)}
else if(o.type==='sway')safeRect(o.x+o.tx-o.w/2,o.y+o.ty-o.h/2,o.w,o.h,C.purple)
else if(o.type==='moving'){const x=o.x+Math.sin(state.time*o.speed)*o.range;safeRect(x-o.w/2,o.y-o.h/2,o.w,o.h,'#416bff')}
else if(o.type==='disc'){ctx.translate(sx(o.x),sy(o.y));ctx.rotate(state.time*o.speed);ctx.fillStyle='#3559a5';ctx.beginPath();ctx.arc(0,0,o.r*scale,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=4*scale;for(let i=0;i<6;i++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(o.r*scale,0);ctx.stroke()}}
else if(o.type==='tiles'){for(let r=0;r<o.rows;r++)for(let c=0;c<o.cols;c++){const i=r*o.cols+c;if(((Math.floor(state.time*1.2)+i)%4)!==0)safeRect(o.x+c*(o.size+o.gap),o.y+r*(o.size+o.gap),o.size,o.size,i%2?C.cyan:'#277a99')}}
else if(o.type==='bounce'){ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(sx(o.x),sy(o.y),o.r*scale,0,Math.PI*2);ctx.fill()}
else if(o.type==='ramp'){ctx.fillStyle=C.orange;ctx.beginPath();ctx.moveTo(sx(o.x),sy(o.y+o.h));ctx.lineTo(sx(o.x+o.w),sy(o.y+o.h));ctx.lineTo(sx(o.x+o.w*.78),sy(o.y));ctx.lineTo(sx(o.x+o.w*.22),sy(o.y));ctx.closePath();ctx.fill()}
else if(o.type==='stones'){for(let i=0;i<6;i++){ctx.fillStyle=i%2?'#9fc6d8':'#6a9ab0';ctx.beginPath();ctx.arc(sx(o.x+(i%3)*120),sy(o.y+Math.floor(i/3)*130),45*scale,0,Math.PI*2);ctx.fill()}}
else if(o.type==='breakaway'){for(let i=0;i<o.count;i++)if(((Math.floor(state.time*.9)+i)%7)!==0)safeRect(o.x+i*60,o.y,54,150,'#b16a42')}
else if(o.type==='trap'){const open=Math.sin(state.time*2)>0.45;safeRect(o.x-o.w/2,o.y-o.h/2,o.w,o.h,open?'#090e14':'#a14b54')}
else if(o.type==='fan'){ctx.translate(sx(o.x),sy(o.y));ctx.rotate(state.time*3);ctx.fillStyle='#19232c';ctx.beginPath();ctx.arc(0,0,o.r*scale,0,Math.PI*2);ctx.fill();ctx.fillStyle=C.cyan;for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.fillRect(0,-11*scale,o.r*.75*scale,22*scale)}}
else if(o.type==='bumpers'){for(let i=0;i<6;i++){ctx.fillStyle=i%2?C.red:C.purple;ctx.beginPath();ctx.arc(sx(o.x+(i%3)*120),sy(o.y+Math.floor(i/3)*130),38*scale,0,Math.PI*2);ctx.fill()}}
else if(o.type==='rollers'){for(let i=0;i<4;i++){const yy=o.y+((state.time*100+i*95)%260),xx=o.x+60+i*85;ctx.fillStyle='#c76731';ctx.beginPath();ctx.arc(sx(xx),sy(yy),30*scale,0,Math.PI*2);ctx.fill()}}
else if(o.type==='cannon'){safeRect(o.x,o.y-55,110,110,'#263747');safeRect(o.x+85,o.y-18,120,36,'#111');const bx=o.x+170+((state.time*170)%210);ctx.fillStyle=C.red;ctx.beginPath();ctx.arc(sx(bx),sy(o.y),26*scale,0,Math.PI*2);ctx.fill()}
else if(o.type==='spinPoles'){for(let i=0;i<3;i++){const cx=o.x-120+i*120,a=state.time*(1.3+i*.35);ctx.strokeStyle=i%2?C.gold:C.red;ctx.lineWidth=18*scale;ctx.beginPath();ctx.moveTo(sx(cx),sy(o.y));ctx.lineTo(sx(cx+Math.cos(a)*85),sy(o.y+Math.sin(a)*85));ctx.stroke()}}
else if(o.type==='wall'){const x=o.x+Math.sin(state.time*1.5)*125;safeRect(x-o.w/2,o.y-28,o.w,56,'#c55273')}
else if(o.type==='gates'){for(let i=0;i<3;i++){const open=((state.time+i*.7)%2.4)<1.25;safeRect(o.x+i*105,o.y,70,open?45:230,open?'#4cbd76':'#b94357')}}
else if(o.type==='elevator'){const h=35+35*Math.sin(state.time*1.5);ctx.fillStyle='#52b1d1';ctx.beginPath();ctx.ellipse(sx(o.x),sy(o.y-h*.25),o.r*scale,o.r*.55*scale,0,0,Math.PI*2);ctx.fill()}
else if(o.type==='pendulum'){for(let i=0;i<3;i++){const ax=o.x+i*120,ay=o.y-90,a=Math.sin(state.time*1.7+i)*.8,bx=ax+Math.sin(a)*110,by=ay+Math.cos(a)*145;ctx.strokeStyle='#d8e2eb';ctx.lineWidth=5*scale;ctx.beginPath();ctx.moveTo(sx(ax),sy(ay));ctx.lineTo(sx(bx),sy(by));ctx.stroke();ctx.fillStyle=C.red;ctx.beginPath();ctx.arc(sx(bx),sy(by),34*scale,0,Math.PI*2);ctx.fill()}}
}catch(e){}finally{ctx.restore()}}
function drawPlayer(){ctx.save();try{const rows={down:0,left:1,up:2,right:3},row=rows[p.face]??2,frame=Math.floor(p.anim)%3,px=sx(p.x),py=sy(p.y)-p.z*scale;ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(px,sy(p.y+13),25*scale,11*scale,0,0,Math.PI*2);ctx.fill();if(atm.complete&&atm.naturalWidth){const fw=atm.naturalWidth/3,fh=atm.naturalHeight/4;ctx.drawImage(atm,frame*fw,row*fh,fw,fh,px-34*scale,py-70*scale,68*scale,92*scale)}else{ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(px,py-25*scale,24*scale,0,Math.PI*2);ctx.fill()}}catch(e){}finally{ctx.restore()}}
function render(){const d=DPR();ctx.setTransform(d,0,0,d,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.lineCap='butt';ctx.textAlign='start';ctx.fillStyle=C.bg;ctx.fillRect(0,0,CW,CH);
const shakeX=(Math.random()-.5)*state.shake,shakeY=(Math.random()-.5)*state.shake;ctx.save();ctx.translate(shakeX,shakeY);
safeRect(0,0,WORLD.w,WORLD.h,C.floor);ctx.strokeStyle='rgba(255,255,255,.028)';ctx.lineWidth=1;for(let x=0;x<=WORLD.w;x+=100){ctx.beginPath();ctx.moveTo(sx(x),sy(0));ctx.lineTo(sx(x),sy(WORLD.h));ctx.stroke()}for(let y=0;y<=WORLD.h;y+=100){ctx.beginPath();ctx.moveTo(sx(0),sy(y));ctx.lineTo(sx(WORLD.w),sy(y));ctx.stroke()}
for(const b of bays){ctx.save();try{drawBay(b)}catch(e){}finally{ctx.restore()}}
for(const o of obs)drawObstacle(o);
drawPlayer();ctx.restore()}
function loop(now){if(!state.running)return;const dt=Math.min(.033,Math.max(.001,(now-state.last)/1000||.016));state.last=now;try{update(dt)}catch(e){sanitize()}try{render()}catch(e){}requestAnimationFrame(loop)}
render();
})();