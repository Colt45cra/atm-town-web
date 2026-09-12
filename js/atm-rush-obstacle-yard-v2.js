(()=>{
'use strict';
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d',{alpha:false});
const ui={zone:document.getElementById('zone'),overlay:document.getElementById('overlay'),start:document.getElementById('start'),toast:document.getElementById('toast'),joy:document.getElementById('joy'),knob:document.getElementById('joyKnob')};
const WORLD={w:3600,h:4300},DPR=()=>Math.min(2,Math.max(1,devicePixelRatio||1));
let CW=1,CH=1,scale=1,viewW=1100,viewH=1700;
const state={running:false,last:0,time:0,cameraX:0,cameraY:3000,shake:0,toastT:0};
const input={x:0,y:0,keys:new Set(),jump:false};
const p={x:360,y:4070,z:0,vx:0,vy:0,vz:0,onGround:true,face:'up',anim:0,inv:0,fallT:0,lastX:360,lastY:4070};
const atm=new Image();atm.src='/assets/characters/playable/atm.webp';
const C={bg:'#0d2030',floor:'#17354a',bay:'#214d64',line:'rgba(255,255,255,.14)',red:'#ff315f',gold:'#ffd84d',cyan:'#48e6ff',purple:'#8b5cff',orange:'#ff8a45',green:'#6ee889',blue:'#416bff'};
function resize(){CW=innerWidth;CH=innerHeight;const d=DPR();canvas.width=Math.max(1,Math.round(CW*d));canvas.height=Math.max(1,Math.round(CH*d));canvas.style.width=CW+'px';canvas.style.height=CH+'px';viewW=1100;viewH=1100*(CH/CW);scale=CW/viewW}
addEventListener('resize',resize,{passive:true});resize();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=v=>Number.isFinite(v),dist=(x1,y1,x2,y2)=>Math.hypot(x1-x2,y1-y2);
const sx=x=>(x-state.cameraX)*scale,sy=y=>(y-state.cameraY)*scale;
function toast(t){ui.toast.textContent=t;ui.toast.classList.add('on');state.toastT=.9}
function circleRect(cx,cy,r,x,y,w,h){const qx=clamp(cx,x,x+w),qy=clamp(cy,y,y+h);return (cx-qx)**2+(cy-qy)**2<r*r}
const layout=[['ROTATING BAR',300,350],['DOUBLE SWEEPER',900,350],['SIDE PUSHER',1500,350],['CRUSHER GATE',2100,350],['SWINGING HAMMER',2700,350],['MUD PIT',300,1000],['ICE FLOOR',900,1000],['CONVEYOR BELT',1500,1000],['SPEED PAD',2100,1000],['STICKY FLOOR',2700,1000],['SEESAW PLATFORM',300,1650],['GRAVITY SWAY DECK',900,1650],['MOVING PLATFORM',1500,1650],['ROTATING DISC',2100,1650],['DISAPPEARING TILES',2700,1650],['BOUNCE PAD',300,2300],['LAUNCH RAMP',900,2300],['STEPPING STONES',1500,2300],['BREAKAWAY BRIDGE',2100,2300],['TRAP DOOR',2700,2300],['FAN PUSH',300,2950],['BUMPER FIELD',900,2950],['ROLLING BALLS',1500,2950],['AIR CANNON',2100,2950],['SPIN POLES',2700,2950],['OSCILLATING WALL',300,3600],['TIMED GATES',900,3600],['ELEVATOR PAD',1500,3600],['LOW GRAVITY ZONE',2100,3600],['PENDULUM ALLEY',2700,3600]];
const bays=layout.map(([name,x,y])=>({name,x,y,w:500,h:500}));
const obs=[];const add=(type,name,x,y,o={})=>obs.push({type,name,x,y,...o});
for(const b of bays){const x=b.x+250,y=b.y+240,n=b.name;
if(n==='ROTATING BAR')add('sweeper',n,x,y,{len:190,speed:1.8});
else if(n==='DOUBLE SWEEPER'){add('sweeper',n,x,y-55,{len:180,speed:2.4});add('sweeper',n,x,y+55,{len:180,speed:-1.7,phase:1.2})}
else if(n==='SIDE PUSHER')add('pusher',n,b.x+75,y,{w:125,h:100,reach:245});
else if(n==='CRUSHER GATE')add('crusher',n,x,y);
else if(n==='SWINGING HAMMER')add('hammer',n,x,y);
else if(n==='MUD PIT')add('zone',n,b.x+90,b.y+100,{w:320,h:220,effect:'mud'});
else if(n==='ICE FLOOR')add('zone',n,b.x+85,b.y+100,{w:330,h:220,effect:'ice'});
else if(n==='CONVEYOR BELT')add('zone',n,b.x+70,b.y+135,{w:360,h:160,effect:'conveyor'});
else if(n==='SPEED PAD')add('zone',n,b.x+100,b.y+140,{w:300,h:150,effect:'speed'});
else if(n==='STICKY FLOOR')add('zone',n,b.x+90,b.y+100,{w:320,h:220,effect:'sticky'});
else if(n==='SEESAW PLATFORM')add('seesaw',n,x,y,{w:330,h:120,tilt:0,vel:0});
else if(n==='GRAVITY SWAY DECK')add('sway',n,x,y,{w:310,h:150,tx:0,ty:0,vx:0,vy:0});
else if(n==='MOVING PLATFORM')add('moving',n,x,y,{w:180,h:110,range:150,speed:1,lastX:x});
else if(n==='ROTATING DISC')add('disc',n,x,y,{r:140,speed:.8});
else if(n==='DISAPPEARING TILES')add('tiles',n,b.x+85,b.y+100,{cols:4,rows:3,size:70,gap:8});
else if(n==='BOUNCE PAD')add('bounce',n,x,y,{r:95});
else if(n==='LAUNCH RAMP')add('ramp',n,b.x+90,b.y+120,{w:320,h:210});
else if(n==='STEPPING STONES')add('stones',n,b.x+80,b.y+115);
else if(n==='BREAKAWAY BRIDGE')add('breakaway',n,b.x+65,b.y+155,{count:6,hit:Array(6).fill(0)});
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
function reset(){Object.assign(p,{x:360,y:4070,z:0,vx:0,vy:0,vz:0,onGround:true,face:'up',anim:0,inv:0,fallT:0,lastX:360,lastY:4070});Object.assign(state,{running:true,last:performance.now(),time:0,cameraX:0,cameraY:Math.max(0,WORLD.h-viewH),shake:0,toastT:0});ui.overlay.style.display='none';requestAnimationFrame(loop)}
ui.start.addEventListener('click',reset);
function key(e,d){const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d'].includes(k))e.preventDefault();d?input.keys.add(k):input.keys.delete(k);if(d&&k===' ')input.jump=true}
addEventListener('keydown',e=>key(e,true));addEventListener('keyup',e=>key(e,false));
let joyId=null;function joyMove(e){if(e.pointerId!==joyId)return;const r=ui.joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.31,m=Math.hypot(dx,dy)||1,n=Math.min(max,m);input.x=dx/m*n/max;input.y=dy/m*n/max;ui.knob.style.transform=`translate(${dx/m*n}px,${dy/m*n}px)`}
ui.joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;ui.joy.setPointerCapture(e.pointerId);joyMove(e)});ui.joy.addEventListener('pointermove',joyMove);function joyEnd(e){if(e.pointerId!==joyId)return;joyId=null;input.x=input.y=0;ui.knob.style.transform='translate(0,0)'}ui.joy.addEventListener('pointerup',joyEnd);ui.joy.addEventListener('pointercancel',joyEnd);
addEventListener('pointerdown',e=>{if(!state.running||ui.overlay.style.display!=='none'||ui.joy.contains(e.target))return;if(e.pointerType==='touch'||e.pointerType==='pen'){input.jump=true;e.preventDefault()}},{passive:false});
function inZone(o){return p.x>o.x&&p.x<o.x+o.w&&p.y>o.y&&p.y<o.y+o.h}
function nearest(){let best=bays[0],d0=Infinity;for(const b of bays){const dx=p.x-(b.x+250),dy=p.y-(b.y+250),d=dx*dx+dy*dy;if(d<d0){d0=d;best=b}}ui.zone.textContent=best.name;return best}
function knock(dx,dy,pow=360){if(p.inv>0)return;const m=Math.hypot(dx,dy)||1;p.vx=dx/m*pow;p.vy=dy/m*pow;p.inv=.32;state.shake=8}
function localFall(name){if(p.fallT>0)return;const b=bays.find(q=>q.name===name)||nearest();p.fallT=.42;p.inv=.55;p.vx=p.vy=0;p.vz=-120;toast('FELL — '+name);setTimeout(()=>{if(!state.running)return;p.x=b.x+250;p.y=b.y+b.h-95;p.z=0;p.vz=0;p.onGround=true;p.fallT=0},420)}
function sanitize(){for(const k of ['x','y','z','vx','vy','vz','anim'])if(!finite(p[k]))p[k]=0;if(!finite(state.cameraX))state.cameraX=0;if(!finite(state.cameraY))state.cameraY=0;p.x=clamp(p.x||360,45,WORLD.w-45);p.y=clamp(p.y||4070,45,WORLD.h-45);for(const o of obs)for(const k of ['tx','ty','vx','vy','tilt','vel','lastX'])if(k in o&&!finite(o[k]))o[k]=0}
function update(dt){state.time+=dt;p.inv=Math.max(0,p.inv-dt);if(p.fallT>0)p.fallT=Math.max(0,p.fallT-dt);
let kx=(input.keys.has('arrowright')||input.keys.has('d')?1:0)-(input.keys.has('arrowleft')||input.keys.has('a')?1:0),ky=(input.keys.has('arrowdown')||input.keys.has('s')?1:0)-(input.keys.has('arrowup')||input.keys.has('w')?1:0),ix=Math.abs(input.x)>.08?input.x:kx,iy=Math.abs(input.y)>.08?input.y:ky,m=Math.hypot(ix,iy);if(m>1){ix/=m;iy/=m}
let speed=245,ice=false,conv=0,low=false;for(const o of obs)if(o.type==='zone'&&inZone(o)){if(o.effect==='mud')speed=105;if(o.effect==='sticky')speed=70;if(o.effect==='speed')speed=430;if(o.effect==='ice')ice=true;if(o.effect==='conveyor')conv=-155;if(o.effect==='lowgrav')low=true}
if(p.fallT<=0){if(p.inv<=0){if(ice){p.vx+=(ix*speed-p.vx)*Math.min(1,dt*2);p.vy+=(iy*speed-p.vy)*Math.min(1,dt*2)}else{p.vx=ix*speed;p.vy=iy*speed}}else{p.vx*=Math.max(0,1-dt*1.8);p.vy*=Math.max(0,1-dt*1.8)}p.vy+=conv}else{p.vx*=.94;p.vy*=.94}
if(Math.abs(ix)>Math.abs(iy)&&Math.abs(ix)>.1)p.face=ix<0?'left':'right';else if(Math.abs(iy)>.1)p.face=iy<0?'up':'down';
if(input.jump){input.jump=false;if(p.onGround&&p.fallT<=0){p.vz=low?430:360;p.onGround=false}}
p.vz-=(low?470:920)*dt;p.z+=p.vz*dt;if(p.z<=0){p.z=0;p.vz=0;p.onGround=true}else p.onGround=false;
p.x+=p.vx*dt;p.y+=p.vy*dt;interactions(dt);
p.x=clamp(p.x,45,WORLD.w-45);p.y=clamp(p.y,45,WORLD.h-45);p.anim+=Math.hypot(p.vx,p.vy)*dt*.025;sanitize();nearest();
const tx=p.x-viewW*.5,ty=p.y-viewH*.55;state.cameraX+=(tx-state.cameraX)*Math.min(1,dt*5);state.cameraY+=(ty-state.cameraY)*Math.min(1,dt*5);state.cameraX=clamp(state.cameraX,0,Math.max(0,WORLD.w-viewW));state.cameraY=clamp(state.cameraY,0,Math.max(0,WORLD.h-viewH));state.shake=Math.max(0,state.shake-dt*24);state.toastT=Math.max(0,state.toastT-dt);if(state.toastT<=0)ui.toast.classList.remove('on')}
function interactions(dt){for(const o of obs){
if(o.type==='seesaw'){const on=Math.abs(p.x-o.x)<o.w/2&&Math.abs(p.y-o.y)<o.h/2&&p.z<22,target=on?clamp((p.x-o.x)/(o.w/2),-1,1)*.46:0;o.vel+=(target-o.tilt)*10*dt;o.vel*=Math.pow(.12,dt);o.tilt=clamp(o.tilt+o.vel*dt,-.5,.5);if(on){p.vx+=Math.sin(o.tilt)*145*dt;p.vy+=Math.abs(o.tilt)*25*dt}}
else if(o.type==='sway'){const cx=o.x+o.tx,cy=o.y+o.ty,on=Math.abs(p.x-cx)<o.w/2&&Math.abs(p.y-cy)<o.h/2&&p.z<22;let ax=-o.tx*2.1,ay=-o.ty*2.1;if(on){ax+=(p.x-cx)*1.05;ay+=(p.y-cy)*1.05}o.vx=(o.vx+ax*dt)*Math.pow(.24,dt);o.vy=(o.vy+ay*dt)*Math.pow(.24,dt);o.tx=clamp(o.tx+o.vx*dt,-72,72);o.ty=clamp(o.ty+o.vy*dt,-72,72);if(on){p.x+=o.vx*dt;p.y+=o.vy*dt}}
else if(o.type==='moving'){const nx=o.x+Math.sin(state.time*o.speed)*o.range,dx=nx-o.lastX,on=Math.abs(p.x-nx)<o.w/2&&Math.abs(p.y-o.y)<o.h/2&&p.z<24;if(on)p.x+=dx;o.lastX=nx}
else if(o.type==='disc'&&dist(p.x,p.y,o.x,o.y)<o.r&&p.z<25){const dx=p.x-o.x,dy=p.y-o.y;p.x+=-dy*o.speed*.42*dt;p.y+=dx*o.speed*.42*dt}
else if(o.type==='bounce'&&dist(p.x,p.y,o.x,o.y)<o.r&&p.z<14){p.vz=560;p.onGround=false;toast('BOUNCE')}
else if(o.type==='ramp'&&p.x>o.x&&p.x<o.x+o.w&&p.y>o.y&&p.y<o.y+o.h&&p.z<16){p.vz=Math.max(p.vz,480);p.vy-=115;p.onGround=false}
else if(o.type==='fan'){const dx=p.x-o.x,dy=p.y-o.y,d=Math.hypot(dx,dy);if(d<230&&d>5){const f=(1-d/230)*520;p.vx+=dx/d*f*dt;p.vy+=dy/d*f*dt}}
else if(o.type==='sweeper'&&p.z<48){const a=state.time*o.speed+(o.phase||0),bx=o.x+Math.cos(a)*o.len,by=o.y+Math.sin(a)*o.len,vx=bx-o.x,vy=by-o.y,wx=p.x-o.x,wy=p.y-o.y,t=clamp((wx*vx+wy*vy)/(vx*vx+vy*vy),0,1),px=o.x+t*vx,py=o.y+t*vy,dx=p.x-px,dy=p.y-py;if(Math.hypot(dx,dy)<34)knock(dx,dy,420)}
else if(o.type==='pusher'&&p.z<45){const ph=(state.time%2.2)/2.2,ext=ph<.3?Math.sin(ph/.3*Math.PI):0,w=o.w+o.reach*ext;if(circleRect(p.x,p.y,25,o.x,o.y-o.h/2,w,o.h))knock(1,.08,520)}
else if(o.type==='crusher'&&p.z<45){const close=(Math.sin(state.time*2.3)+1)/2,gap=60+160*(1-close);if(Math.abs(p.y-o.y)<68&&Math.abs(p.x-o.x)>gap/2&&Math.abs(p.x-o.x)<215)knock(p.x<o.x?-1:1,0,430)}
else if(o.type==='hammer'&&p.z<55){const a=Math.sin(state.time*1.8)*1.05,ex=o.x+Math.sin(a)*170,ey=o.y+Math.cos(a)*90;if(dist(p.x,p.y,ex,ey)<70)knock(p.x-ex,p.y-ey,500)}
else if(o.type==='tiles'&&p.z<15){for(let r=0;r<o.rows;r++)for(let c=0;c<o.cols;c++){const idx=r*o.cols+c,x=o.x+c*(o.size+o.gap),y=o.y+r*(o.size+o.gap),visible=((Math.floor(state.time*1.2)+idx)%4)!==0;if(!visible&&p.x>x&&p.x<x+o.size&&p.y>y&&p.y<y+o.size)localFall(o.name)}}
else if(o.type==='stones'&&p.z<15){for(let i=0;i<6;i++){const x=o.x+(i%3)*120,y=o.y+Math.floor(i/3)*130;if(dist(p.x,p.y,x,y)<48){p.vz=Math.max(p.vz,90);p.onGround=false}}}
else if(o.type==='breakaway'&&p.z<16){for(let i=0;i<o.count;i++){o.hit[i]=Math.max(0,o.hit[i]-dt);const x=o.x+i*60,y=o.y;if(p.x>x&&p.x<x+54&&p.y>y&&p.y<y+150){if(o.hit[i]<=0)o.hit[i]=1.6;if(o.hit[i]<.75)localFall(o.name)}}}
else if(o.type==='trap'&&p.z<18&&Math.abs(p.x-o.x)<o.w/2&&Math.abs(p.y-o.y)<o.h/2){if(Math.sin(state.time*2)>.35)localFall(o.name)}
else if(o.type==='bumpers'&&p.z<48){for(let i=0;i<6;i++){const x=o.x+(i%3)*120,y=o.y+Math.floor(i/3)*130,dx=p.x-x,dy=p.y-y;if(Math.hypot(dx,dy)<68)knock(dx,dy,470)}}
else if(o.type==='rollers'&&p.z<50){for(let i=0;i<4;i++){const yy=o.y+((state.time*105+i*95)%260),xx=o.x+60+i*85,dx=p.x-xx,dy=p.y-yy;if(Math.hypot(dx,dy)<58)knock(dx,dy,450)}}
else if(o.type==='cannon'&&p.z<55){const bx=o.x+170+((state.time*180)%235);if(dist(p.x,p.y,bx,o.y)<52)knock(1,0,560)}
else if(o.type==='spinPoles'&&p.z<48){for(let i=0;i<3;i++){const cx=o.x-120+i*120,a=state.time*(1.3+i*.35),bx=cx+Math.cos(a)*85,by=o.y+Math.sin(a)*85,vx=bx-cx,vy=by-o.y,wx=p.x-cx,wy=p.y-o.y,t=clamp((wx*vx+wy*vy)/(vx*vx+vy*vy),0,1),px=cx+t*vx,py=o.y+t*vy,dx=p.x-px,dy=p.y-py;if(Math.hypot(dx,dy)<30)knock(dx,dy,400)}}
else if(o.type==='wall'&&p.z<50){const x=o.x+Math.sin(state.time*1.5)*125;if(Math.abs(p.x-x)<o.w/2&&Math.abs(p.y-o.y)<48)knock(p.x-x,.1,390)}
else if(o.type==='gates'&&p.z<55){for(let i=0;i<3;i++){const open=((state.time+i*.7)%2.4)<1.25,x=o.x+i*105;if(!open&&circleRect(p.x,p.y,24,x,o.y,70,230))knock(p.x-(x+35),-1,340)}}
else if(o.type==='elevator'){const d=dist(p.x,p.y,o.x,o.y);if(d<o.r&&p.z<145){const target=55+55*(Math.sin(state.time*1.5)*.5+.5);p.z=Math.max(p.z,target);p.vz=Math.max(0,p.vz);p.onGround=false}}
else if(o.type==='pendulum'&&p.z<58){for(let i=0;i<3;i++){const ax=o.x+i*120,ay=o.y-90,a=Math.sin(state.time*1.7+i)*.8,bx=ax+Math.sin(a)*110,by=ay+Math.cos(a)*145,dx=p.x-bx,dy=p.y-by;if(Math.hypot(dx,dy)<62)knock(dx,dy,500)}}
}}
function render(){const d=DPR();ctx.setTransform(d,0,0,d,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,CW,CH);ctx.fillStyle=C.bg;ctx.fillRect(0,0,CW,CH);ctx.save();ctx.translate((Math.random()-.5)*state.shake,(Math.random()-.5)*state.shake);ctx.fillStyle=C.floor;ctx.fillRect(sx(0),sy(0),WORLD.w*scale,WORLD.h*scale);ctx.strokeStyle='rgba(255,255,255,.03)';ctx.lineWidth=1;for(let x=0;x<WORLD.w;x+=100){ctx.beginPath();ctx.moveTo(sx(x),sy(0));ctx.lineTo(sx(x),sy(WORLD.h));ctx.stroke()}for(let y=0;y<WORLD.h;y+=100){ctx.beginPath();ctx.moveTo(sx(0),sy(y));ctx.lineTo(sx(WORLD.w),sy(y));ctx.stroke()}ctx.restore();
for(const b of bays){ctx.save();try{ctx.fillStyle=C.bay;roundRect(sx(b.x),sy(b.y),b.w*scale,b.h*scale,28*scale);ctx.fill();ctx.strokeStyle=C.line;ctx.lineWidth=Math.max(1,3*scale);ctx.strokeRect(sx(b.x),sy(b.y),b.w*scale,b.h*scale);ctx.fillStyle='rgba(2,8,16,.84)';roundRect(sx(b.x+35),sy(b.y+b.h-72),(b.w-70)*scale,48*scale,10*scale);ctx.fill();ctx.fillStyle='#fff';ctx.font=`900 ${Math.max(10,22*scale)}px system-ui`;ctx.textAlign='center';ctx.fillText(b.name,sx(b.x+b.w/2),sy(b.y+b.h-40))}catch(e){}ctx.restore()}
for(const o of obs){ctx.save();try{drawObstacle(o)}catch(e){}ctx.restore()}ctx.save();drawPlayer();ctx.restore()}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawObstacle(o){const X=sx,Y=sy,S=scale;
if(o.type==='zone'){ctx.fillStyle=o.effect==='mud'?'#60482f':o.effect==='ice'?'#a6e8ff':o.effect==='conveyor'?'#303746':o.effect==='speed'?C.cyan:o.effect==='sticky'?'#71512e':'rgba(151,112,255,.45)';roundRect(X(o.x),Y(o.y),o.w*S,o.h*S,20*S);ctx.fill();if(o.effect==='conveyor'){ctx.fillStyle='#fff';ctx.font=`900 ${34*S}px system-ui`;ctx.textAlign='center';ctx.fillText('↑ ↑ ↑',X(o.x+o.w/2),Y(o.y+o.h*.62))}}
else if(o.type==='sweeper'){const a=state.time*o.speed+(o.phase||0),bx=o.x+Math.cos(a)*o.len,by=o.y+Math.sin(a)*o.len;ctx.strokeStyle=C.red;ctx.lineWidth=28*S;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(X(o.x),Y(o.y));ctx.lineTo(X(bx),Y(by));ctx.stroke();ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(X(o.x),Y(o.y),28*S,0,Math.PI*2);ctx.fill()}
else if(o.type==='pusher'){const ph=(state.time%2.2)/2.2,ext=ph<.3?Math.sin(ph/.3*Math.PI):0;ctx.fillStyle=C.orange;roundRect(X(o.x),Y(o.y-o.h/2),(o.w+o.reach*ext)*S,o.h*S,14*S);ctx.fill()}
else if(o.type==='crusher'){const close=(Math.sin(state.time*2.3)+1)/2,gap=60+160*(1-close);ctx.fillStyle='#76253e';ctx.fillRect(X(o.x-215),Y(o.y-65),(215-gap/2)*S,130*S);ctx.fillRect(X(o.x+gap/2),Y(o.y-65),(215-gap/2)*S,130*S)}
else if(o.type==='hammer'){const a=Math.sin(state.time*1.8)*1.05,ex=o.x+Math.sin(a)*170,ey=o.y+Math.cos(a)*90;ctx.strokeStyle='#d7dfe8';ctx.lineWidth=10*S;ctx.beginPath();ctx.moveTo(X(o.x),Y(o.y-150));ctx.lineTo(X(ex),Y(ey));ctx.stroke();ctx.fillStyle=C.red;roundRect(X(ex-45),Y(ey-35),90*S,70*S,18*S);ctx.fill()}
else if(o.type==='seesaw'){ctx.translate(X(o.x),Y(o.y));ctx.rotate(o.tilt);ctx.fillStyle=C.gold;ctx.fillRect(-o.w*S/2,-o.h*S/2,o.w*S,o.h*S);ctx.fillStyle='#8898a8';ctx.beginPath();ctx.arc(0,0,22*S,0,Math.PI*2);ctx.fill()}
else if(o.type==='sway'){ctx.fillStyle=C.purple;roundRect(X(o.x+o.tx-o.w/2),Y(o.y+o.ty-o.h/2),o.w*S,o.h*S,18*S);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=4*S;ctx.beginPath();ctx.moveTo(X(o.x-120),Y(o.y-75));ctx.lineTo(X(o.x-120+o.tx),Y(o.y-75+o.ty));ctx.moveTo(X(o.x+120),Y(o.y-75));ctx.lineTo(X(o.x+120+o.tx),Y(o.y-75+o.ty));ctx.stroke()}
else if(o.type==='moving'){const x=o.x+Math.sin(state.time*o.speed)*o.range;ctx.fillStyle=C.blue;roundRect(X(x-o.w/2),Y(o.y-o.h/2),o.w*S,o.h*S,16*S);ctx.fill()}
else if(o.type==='disc'){ctx.translate(X(o.x),Y(o.y));ctx.rotate(state.time*o.speed);ctx.fillStyle='#3559a5';ctx.beginPath();ctx.arc(0,0,o.r*S,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=4*S;for(let i=0;i<6;i++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(o.r*S,0);ctx.stroke()}}
else if(o.type==='tiles'){for(let r=0;r<o.rows;r++)for(let c=0;c<o.cols;c++){const idx=r*o.cols+c,visible=((Math.floor(state.time*1.2)+idx)%4)!==0;if(visible){ctx.fillStyle=idx%2?C.cyan:'#277a99';roundRect(X(o.x+c*(o.size+o.gap)),Y(o.y+r*(o.size+o.gap)),o.size*S,o.size*S,8*S);ctx.fill()}}}
else if(o.type==='bounce'){ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(X(o.x),Y(o.y),o.r*S,0,Math.PI*2);ctx.fill()}
else if(o.type==='ramp'){ctx.fillStyle=C.orange;ctx.beginPath();ctx.moveTo(X(o.x),Y(o.y+o.h));ctx.lineTo(X(o.x+o.w),Y(o.y+o.h));ctx.lineTo(X(o.x+o.w*.78),Y(o.y));ctx.lineTo(X(o.x+o.w*.22),Y(o.y));ctx.closePath();ctx.fill()}
else if(o.type==='stones'){for(let i=0;i<6;i++){ctx.fillStyle=i%2?'#9fc6d8':'#6a9ab0';ctx.beginPath();ctx.arc(X(o.x+(i%3)*120),Y(o.y+Math.floor(i/3)*130),45*S,0,Math.PI*2);ctx.fill()}}
else if(o.type==='breakaway'){for(let i=0;i<o.count;i++){const visible=o.hit[i]===0||o.hit[i]>.75;if(visible){ctx.fillStyle='#b16a42';roundRect(X(o.x+i*60),Y(o.y),54*S,150*S,7*S);ctx.fill()}}}
else if(o.type==='trap'){const open=Math.sin(state.time*2)>.35;ctx.fillStyle=open?'#090e14':'#a14b54';ctx.fillRect(X(o.x-o.w/2),Y(o.y-o.h/2),o.w*S,o.h*S)}
else if(o.type==='fan'){ctx.translate(X(o.x),Y(o.y));ctx.rotate(state.time*3);ctx.fillStyle='#19232c';ctx.beginPath();ctx.arc(0,0,o.r*S,0,Math.PI*2);ctx.fill();ctx.fillStyle=C.cyan;for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.fillRect(0,-11*S,o.r*.75*S,22*S)}}
else if(o.type==='bumpers'){for(let i=0;i<6;i++){ctx.fillStyle=i%2?C.red:C.purple;ctx.beginPath();ctx.arc(X(o.x+(i%3)*120),Y(o.y+Math.floor(i/3)*130),38*S,0,Math.PI*2);ctx.fill()}}
else if(o.type==='rollers'){for(let i=0;i<4;i++){const yy=o.y+((state.time*105+i*95)%260),xx=o.x+60+i*85;ctx.fillStyle='#c76731';ctx.beginPath();ctx.arc(X(xx),Y(yy),30*S,0,Math.PI*2);ctx.fill()}}
else if(o.type==='cannon'){ctx.fillStyle='#263747';roundRect(X(o.x),Y(o.y-55),110*S,110*S,18*S);ctx.fill();ctx.fillStyle='#111';ctx.fillRect(X(o.x+85),Y(o.y-18),120*S,36*S);const bx=o.x+170+((state.time*180)%235);ctx.fillStyle=C.red;ctx.beginPath();ctx.arc(X(bx),Y(o.y),26*S,0,Math.PI*2);ctx.fill()}
else if(o.type==='spinPoles'){for(let i=0;i<3;i++){const cx=o.x-120+i*120,a=state.time*(1.3+i*.35);ctx.strokeStyle=i%2?C.gold:C.red;ctx.lineWidth=18*S;ctx.beginPath();ctx.moveTo(X(cx),Y(o.y));ctx.lineTo(X(cx+Math.cos(a)*85),Y(o.y+Math.sin(a)*85));ctx.stroke()}}
else if(o.type==='wall'){const x=o.x+Math.sin(state.time*1.5)*125;ctx.fillStyle='#c55273';roundRect(X(x-o.w/2),Y(o.y-28),o.w*S,56*S,10*S);ctx.fill()}
else if(o.type==='gates'){for(let i=0;i<3;i++){const open=((state.time+i*.7)%2.4)<1.25;ctx.fillStyle=open?'#4cbd76':'#b94357';ctx.fillRect(X(o.x+i*105),Y(o.y),70*S,(open?45:230)*S)}}
else if(o.type==='elevator'){const h=55+55*(Math.sin(state.time*1.5)*.5+.5);ctx.fillStyle='#52b1d1';ctx.beginPath();ctx.ellipse(X(o.x),Y(o.y-h*.25),o.r*S,o.r*.55*S,0,0,Math.PI*2);ctx.fill()}
else if(o.type==='pendulum'){for(let i=0;i<3;i++){const ax=o.x+i*120,ay=o.y-90,a=Math.sin(state.time*1.7+i)*.8,bx=ax+Math.sin(a)*110,by=ay+Math.cos(a)*145;ctx.strokeStyle='#d8e2eb';ctx.lineWidth=5*S;ctx.beginPath();ctx.moveTo(X(ax),Y(ay));ctx.lineTo(X(bx),Y(by));ctx.stroke();ctx.fillStyle=C.red;ctx.beginPath();ctx.arc(X(bx),Y(by),34*S,0,Math.PI*2);ctx.fill()}}}
function drawPlayer(){if(!finite(p.x)||!finite(p.y))return;const row={down:0,left:1,up:2,right:3}[p.face]??2,frame=Math.floor(p.anim)%3,px=sx(p.x),py=sy(p.y)-p.z*scale;ctx.globalAlpha=p.fallT>0?Math.max(.25,p.fallT/.42):1;ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(px,sy(p.y+13),25*scale,11*scale,0,0,Math.PI*2);ctx.fill();if(atm.complete&&atm.naturalWidth>0){const fw=atm.naturalWidth/3,fh=atm.naturalHeight/4;try{ctx.drawImage(atm,frame*fw,row*fh,fw,fh,px-34*scale,py-70*scale,68*scale,92*scale)}catch(e){fallback(px,py)}}else fallback(px,py);ctx.globalAlpha=1}
function fallback(px,py){ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(px,py-25*scale,24*scale,0,Math.PI*2);ctx.fill()}
function loop(now){if(!state.running)return;const dt=Math.min(.033,Math.max(.001,(now-state.last)/1000||.016));state.last=now;update(dt);render();requestAnimationFrame(loop)}
render();
})();