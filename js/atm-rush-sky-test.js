(()=>{
'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d',{alpha:false});
const ui={progress:document.getElementById('progress'),timer:document.getElementById('timer'),cp:document.getElementById('cp'),overlay:document.getElementById('overlay'),start:document.getElementById('start'),toast:document.getElementById('toast'),joy:document.getElementById('joy'),knob:document.getElementById('joyKnob')};
const DPR=()=>Math.min(2,Math.max(1,devicePixelRatio||1));
let CW=0,CH=0,scale=1,viewW=1120,viewH=1900;
const WORLD={w:1800,h:14400,startY:14120,finishY:230};
const input={x:0,y:0,jumpPressed:false,keys:new Set()};
const player={x:900,y:14070,z:0,vx:0,vy:0,vz:0,r:26,onGround:true,knock:0,boost:0,inv:0,cpX:900,cpY:14070,cp:0,falling:false,finished:false,anim:0,face:'up'};
const state={running:false,time:0,last:0,cameraX:340,cameraY:12500,shake:0,flash:0,toastT:0};
const atm=new Image();atm.src='assets/characters/playable/atm.webp';
const rowFor={down:0,left:1,up:2,right:3};
const checkpoints=[{x:900,y:12650,label:'CP 1'},{x:900,y:10150,label:'CP 2'},{x:900,y:7600,label:'CP 3'},{x:900,y:5000,label:'CP 4'},{x:900,y:2500,label:'CP 5'}];
const platforms=[];
function addPlatform(x,y,w,h,kind='solid',extra={}){platforms.push({x,y,w,h,kind,...extra})}
// Start deck + early jump tutorial
addPlatform(650,13850,500,500,'start');
addPlatform(700,13520,400,190);addPlatform(770,13220,260,170);addPlatform(620,12900,360,180);addPlatform(940,12630,300,180);
// First split: left safer / right faster
addPlatform(340,12280,470,220,'routeL');addPlatform(200,11940,420,210,'routeL');addPlatform(340,11600,400,190,'routeL');addPlatform(560,11270,360,210,'routeL');
addPlatform(1080,12270,320,180,'routeR');addPlatform(1240,11920,250,170,'routeR');addPlatform(1090,11580,300,170,'routeR');addPlatform(960,11260,300,190,'routeR');
addPlatform(700,10920,400,250,'merge');
// Moving platform canyon
addPlatform(690,10580,220,150);addPlatform(850,10050,240,170);addPlatform(640,9600,250,180);addPlatform(930,9150,240,170);
// Wide choice sector with center precision path
addPlatform(210,8700,430,240,'routeL');addPlatform(190,8300,360,200,'routeL');addPlatform(300,7900,420,220,'routeL');
addPlatform(1280,8700,330,210,'routeR');addPlatform(1240,8280,300,190,'routeR');addPlatform(1120,7880,420,220,'routeR');
addPlatform(800,8650,200,145,'shortcut');addPlatform(800,8300,200,145,'shortcut');addPlatform(800,7950,200,145,'shortcut');
addPlatform(650,7480,500,260,'merge');
// Narrow sky bridges + cross paths
addPlatform(470,7050,300,180);addPlatform(1030,7050,300,180);addPlatform(720,6670,360,170);addPlatform(410,6280,300,180);addPlatform(1090,6280,300,180);addPlatform(740,5880,320,180);addPlatform(640,5480,520,220);
// Route maze near top
addPlatform(230,5050,420,220,'routeL');addPlatform(250,4650,330,200,'routeL');addPlatform(360,4250,330,190,'routeL');addPlatform(510,3890,300,180,'routeL');
addPlatform(1160,5050,410,220,'routeR');addPlatform(1220,4640,320,200,'routeR');addPlatform(1110,4240,320,190,'routeR');addPlatform(990,3880,300,180,'routeR');
addPlatform(735,3500,330,170,'shortcut');addPlatform(730,3160,340,170,'shortcut');
addPlatform(640,2800,520,250,'merge');
// Final ascent
addPlatform(520,2380,300,170);addPlatform(980,2350,300,170);addPlatform(710,1980,380,180);addPlatform(450,1600,300,180);addPlatform(1050,1570,300,180);addPlatform(720,1180,360,190);addPlatform(590,780,620,260);addPlatform(500,260,800,300,'finish');
const moving=[
 {baseX:520,x:520,y:10300,w:260,h:150,range:520,speed:.72,phase:0},
 {baseX:1060,x:1060,y:9850,w:240,h:150,range:500,speed:.88,phase:1.3},
 {baseX:500,x:500,y:9400,w:250,h:150,range:600,speed:1.0,phase:2.1},
 {baseX:300,x:300,y:6830,w:240,h:150,range:1040,speed:.65,phase:.7},
 {baseX:1080,x:1080,y:6080,w:240,h:150,range:980,speed:.8,phase:2.5},
 {baseX:420,x:420,y:2190,w:250,h:150,range:760,speed:.95,phase:1.1},
 {baseX:1120,x:1120,y:1790,w:250,h:150,range:760,speed:1.05,phase:2.7}
];
const disappearing=[
 {x:690,y:8890,w:180,h:135,period:2.4,phase:0},
 {x:930,y:8890,w:180,h:135,period:2.4,phase:.8},
 {x:685,y:7290,w:190,h:140,period:2.1,phase:.3},
 {x:925,y:7290,w:190,h:140,period:2.1,phase:1.1},
 {x:690,y:3320,w:185,h:135,period:1.9,phase:.4},
 {x:925,y:3320,w:185,h:135,period:1.9,phase:1.0}
];
const sweepers=[
 {x:440,y:12020,len:260,ang:0,speed:2.0,width:34},{x:1360,y:11730,len:220,ang:1.2,speed:-2.5,width:34},
 {x:420,y:8430,len:260,ang:.4,speed:2.7,width:38},{x:1380,y:8420,len:250,ang:2.0,speed:-2.8,width:38},
 {x:900,y:5650,len:280,ang:1.1,speed:3.1,width:40},{x:460,y:4460,len:240,ang:.2,speed:2.9,width:38},{x:1340,y:4440,len:230,ang:2.1,speed:-3.2,width:38},
 {x:900,y:980,len:300,ang:.6,speed:3.5,width:42}
];
const fans=[{x:350,y:11750,r:82,dir:1},{x:1450,y:11670,r:82,dir:-1},{x:310,y:8170,r:78,dir:1},{x:1490,y:8150,r:78,dir:-1},{x:330,y:4500,r:80,dir:1},{x:1470,y:4480,r:80,dir:-1}];
const boosts=[{x:760,y:13880,w:280,h:110,power:1.45},{x:270,y:11970,w:210,h:100,power:1.35},{x:1240,y:11930,w:190,h:95,power:1.55},{x:770,y:7510,w:260,h:105,power:1.55},{x:760,y:2830,w:280,h:105,power:1.65},{x:750,y:810,w:300,h:110,power:1.7}];
function resize(){CW=innerWidth;CH=innerHeight;const d=DPR();canvas.width=Math.round(CW*d);canvas.height=Math.round(CH*d);canvas.style.width=CW+'px';canvas.style.height=CH+'px';viewW=1120;viewH=viewW*(CH/CW);scale=CW/viewW;ctx.setTransform(d,0,0,d,0,0)}
addEventListener('resize',resize,{passive:true});resize();
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function fmt(s){const m=Math.floor(s/60),ss=(s%60).toFixed(1).padStart(4,'0');return `${m}:${ss}`}
function toast(t){ui.toast.textContent=t;ui.toast.classList.add('on');state.toastT=1.2}
function pointInRect(x,y,o,pad=0){return x>o.x-pad&&x<o.x+o.w+pad&&y>o.y-pad&&y<o.y+o.h+pad}
function activeDisappearing(d){const p=(state.time+d.phase)%d.period/d.period;return p<.66}
function platformUnder(x,y){for(const m of moving)if(pointInRect(x,y,m,10))return m;for(const d of disappearing)if(activeDisappearing(d)&&pointInRect(x,y,d,8))return d;for(const p of platforms)if(pointInRect(x,y,p,8))return p;return null}
function reset(){Object.assign(player,{x:900,y:14070,z:0,vx:0,vy:0,vz:0,onGround:true,knock:0,boost:0,inv:0,cpX:900,cpY:14070,cp:0,falling:false,finished:false,anim:0,face:'up'});Object.assign(state,{running:true,time:0,last:performance.now(),cameraX:340,cameraY:WORLD.startY-viewH*.72,shake:0,flash:0,toastT:0});ui.cp.textContent='START';ui.overlay.style.display='none';requestAnimationFrame(loop)}
ui.start.addEventListener('click',reset);
function key(e,d){const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d'].includes(k))e.preventDefault();d?input.keys.add(k):input.keys.delete(k);if(d&&k===' ')input.jumpPressed=true}
addEventListener('keydown',e=>key(e,true));addEventListener('keyup',e=>key(e,false));
let joyId=null;
function joyMove(e){if(joyId!==e.pointerId)return;const r=ui.joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.31,mag=Math.hypot(dx,dy)||1,n=Math.min(max,mag),nx=dx/mag*n,ny=dy/mag*n;input.x=nx/max;input.y=ny/max;ui.knob.style.transform=`translate(${nx}px,${ny}px)`}
ui.joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;ui.joy.setPointerCapture(e.pointerId);joyMove(e)});ui.joy.addEventListener('pointermove',joyMove);ui.joy.addEventListener('pointerup',e=>{if(e.pointerId!==joyId)return;joyId=null;input.x=input.y=0;ui.knob.style.transform='translate(0,0)'});ui.joy.addEventListener('pointercancel',()=>{joyId=null;input.x=input.y=0;ui.knob.style.transform='translate(0,0)'});
canvas.addEventListener('pointerdown',e=>{if(!state.running||player.falling||player.finished)return;if(joyId!==null&&e.pointerId===joyId)return;input.jumpPressed=true;e.preventDefault()});
function knock(dx,dy,power=360){if(player.inv>0)return;const m=Math.hypot(dx,dy)||1;player.vx=dx/m*power;player.vy=dy/m*power;player.knock=.34;player.inv=.5;state.shake=11;state.flash=.12}
function respawn(){player.x=player.cpX;player.y=player.cpY;player.z=0;player.vx=player.vy=player.vz=0;player.onGround=true;player.falling=false;player.inv=1;toast('CHECKPOINT');state.shake=13}
function fall(){if(player.falling||player.finished)return;player.falling=true;player.onGround=false;player.inv=2;toast('FELL!');setTimeout(()=>{if(state.running&&!player.finished)respawn()},650)}
function updateObstacles(dt){for(const s of sweepers)s.ang+=s.speed*dt;for(const m of moving)m.x=m.baseX+Math.sin(state.time*m.speed+m.phase)*m.range*.5}
function updatePlayer(dt){if(player.finished||player.falling)return;player.inv=Math.max(0,player.inv-dt);player.knock=Math.max(0,player.knock-dt);player.boost=Math.max(0,player.boost-dt);
 const kx=(input.keys.has('arrowright')||input.keys.has('d')?1:0)-(input.keys.has('arrowleft')||input.keys.has('a')?1:0),ky=(input.keys.has('arrowdown')||input.keys.has('s')?1:0)-(input.keys.has('arrowup')||input.keys.has('w')?1:0);
 let ix=Math.abs(input.x)>.08?input.x:kx,iy=Math.abs(input.y)>.08?input.y:ky,mag=Math.hypot(ix,iy);if(mag>1){ix/=mag;iy/=mag}
 if(Math.abs(ix)>.08||Math.abs(iy)>.08){if(Math.abs(ix)>Math.abs(iy))player.face=ix>0?'right':'left';else player.face=iy>0?'down':'up'}
 let max=player.boost>0?430:285;
 if(player.knock>0){player.knock=Math.max(0,player.knock-dt);player.vx*=Math.max(0,1-dt*3.2);player.vy*=Math.max(0,1-dt*3.2)}else if(player.onGround){player.vx=ix*max;player.vy=iy*max}else{const air=.58;player.vx+=(ix*max*air-player.vx)*Math.min(1,dt*4.2);player.vy+=(iy*max*air-player.vy)*Math.min(1,dt*4.2)}
 for(const b of boosts)if(pointInRect(player.x,player.y,b)){player.boost=.7;player.vy-=120*b.power*dt}
 if(input.jumpPressed){input.jumpPressed=false;if(player.onGround){player.vz=430;player.onGround=false}}
 player.vz-=980*dt;player.z+=player.vz*dt;
 player.x+=player.vx*dt;player.y+=player.vy*dt;player.x=clamp(player.x,40,WORLD.w-40);player.y=clamp(player.y,120,WORLD.h-80);
 if(player.z<=0){player.z=0;player.vz=0;const ground=platformUnder(player.x,player.y);if(ground){player.onGround=true}else{fall();return}}else player.onGround=false;
 player.anim+=Math.hypot(player.vx,player.vy)*dt*.03;
 for(const s of sweepers){if(player.z>60)continue;const bx=s.x+Math.cos(s.ang)*s.len,by=s.y+Math.sin(s.ang)*s.len,vx=bx-s.x,vy=by-s.y,wx=player.x-s.x,wy=player.y-s.y,t=clamp((wx*vx+wy*vy)/(vx*vx+vy*vy),0,1),px=s.x+t*vx,py=s.y+t*vy,dx=player.x-px,dy=player.y-py;if(Math.hypot(dx,dy)<player.r+s.width*.5)knock(dx,dy,450)}
 for(const f of fans){const dx=player.x-f.x,dy=player.y-f.y,d=Math.hypot(dx,dy);if(d<f.r+150&&d>10){const force=(1-d/(f.r+150))*420*f.dir;player.vx+=force*dt}}
 for(let i=checkpoints.length-1;i>=0;i--){const c=checkpoints[i];if(player.y<c.y&&player.cp<i+1){player.cp=i+1;player.cpX=c.x;player.cpY=c.y;ui.cp.textContent=c.label;toast(c.label+' SAVED')}}
 if(player.y<WORLD.finishY+120)finish()
}
function finish(){if(player.finished)return;player.finished=true;state.running=false;toast('FINISH!');setTimeout(()=>{ui.overlay.style.display='grid';ui.overlay.querySelector('h1').textContent='SKYWAY COMPLETE!';ui.overlay.querySelector('p').textContent=`Time ${fmt(state.time)}. Try another route and compare your line through the sky.`;ui.start.textContent='RUN AGAIN'},650)}
function update(dt){state.time+=dt;updateObstacles(dt);updatePlayer(dt);state.shake=Math.max(0,state.shake-dt*28);state.flash=Math.max(0,state.flash-dt);state.toastT=Math.max(0,state.toastT-dt);if(state.toastT<=0)ui.toast.classList.remove('on');
 const tx=player.x-viewW*.5,ty=player.y-viewH*.68;state.cameraX+=(tx-state.cameraX)*Math.min(1,dt*5);state.cameraY+=(ty-state.cameraY)*Math.min(1,dt*4.5);state.cameraX=clamp(state.cameraX,0,WORLD.w-viewW);state.cameraY=clamp(state.cameraY,0,WORLD.h-viewH);
 ui.progress.textContent=Math.floor(clamp((WORLD.startY-player.y)/(WORLD.startY-WORLD.finishY),0,1)*100)+'%';ui.timer.textContent=fmt(state.time)}
function sx(x){return (x-state.cameraX)*scale}function sy(y){return (y-state.cameraY)*scale}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(sx(x),sy(y),w*scale,h*scale,r*scale);ctx.fill()}
function drawCloud(x,y,r){ctx.fillStyle='rgba(255,255,255,.78)';ctx.beginPath();ctx.arc(sx(x-r*.7),sy(y),r*.55*scale,0,Math.PI*2);ctx.arc(sx(x),sy(y-r*.15),r*.72*scale,0,Math.PI*2);ctx.arc(sx(x+r*.75),sy(y),r*.5*scale,0,Math.PI*2);ctx.fill()}
function drawPlatform(p){let fill='#dbe7ef',edge='#7d95a7';if(p.kind==='routeL'){fill='#bce6ff';edge='#4ba8d8'}else if(p.kind==='routeR'){fill='#ffd1df';edge='#df6b91'}else if(p.kind==='shortcut'){fill='#ffe39a';edge='#d39a2c'}else if(p.kind==='merge'){fill='#c9f1d3';edge='#4aa365'}else if(p.kind==='finish'){fill='#fff4b8';edge='#e0b22f'};ctx.fillStyle='rgba(0,0,0,.18)';rr(p.x+12,p.y+18,p.w,p.h,24);ctx.fillStyle=fill;rr(p.x,p.y,p.w,p.h,24);ctx.strokeStyle=edge;ctx.lineWidth=4*scale;ctx.strokeRect(sx(p.x+4),sy(p.y+4),(p.w-8)*scale,(p.h-8)*scale)}
function draw(){const sky=ctx.createLinearGradient(0,0,0,CH);sky.addColorStop(0,'#55b9ed');sky.addColorStop(.55,'#78cef3');sky.addColorStop(1,'#d8f1ff');ctx.fillStyle=sky;ctx.fillRect(0,0,CW,CH);
 ctx.save();ctx.translate((Math.random()-.5)*state.shake,(Math.random()-.5)*state.shake);
 for(let y=0;y<WORLD.h;y+=950){drawCloud(160+(y*17)%1500,y+420,125);drawCloud(1450-(y*11)%1200,y+760,90)}
 for(const p of platforms)drawPlatform(p);
 for(const d of disappearing){const on=activeDisappearing(d);ctx.globalAlpha=on?1:.18;drawPlatform({...d,kind:'shortcut'});ctx.globalAlpha=1}
 for(const m of moving){drawPlatform({...m,kind:'merge'});ctx.fillStyle='#1e6c86';ctx.font=`900 ${20*scale}px system-ui`;ctx.textAlign='center';ctx.fillText('MOVING',sx(m.x+m.w/2),sy(m.y+m.h*.62))}
 for(const b of boosts){ctx.fillStyle='#1db3d6';rr(b.x,b.y,b.w,b.h,18);ctx.fillStyle='#fff';ctx.font=`900 ${42*scale}px system-ui`;ctx.textAlign='center';ctx.fillText('↑',sx(b.x+b.w/2),sy(b.y+b.h*.68))}
 for(const f of fans){ctx.save();ctx.translate(sx(f.x),sy(f.y));ctx.rotate(state.time*3*f.dir);ctx.fillStyle='#263d4a';ctx.beginPath();ctx.arc(0,0,f.r*scale,0,Math.PI*2);ctx.fill();ctx.fillStyle='#9bf0ff';for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.fillRect(0,-12*scale,f.r*.75*scale,24*scale)}ctx.restore()}
 for(const s of sweepers){const bx=s.x+Math.cos(s.ang)*s.len,by=s.y+Math.sin(s.ang)*s.len;ctx.strokeStyle='#ff5d78';ctx.lineWidth=s.width*scale;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(sx(s.x),sy(s.y));ctx.lineTo(sx(bx),sy(by));ctx.stroke();ctx.fillStyle='#ffe15b';ctx.beginPath();ctx.arc(sx(s.x),sy(s.y),30*scale,0,Math.PI*2);ctx.fill()}
 ctx.fillStyle='#fff';ctx.fillRect(sx(520),sy(300),760*scale,22*scale);for(let i=0;i<16;i++){ctx.fillStyle=i%2?'#17202b':'#fff';ctx.fillRect(sx(520+i*47.5),sy(300),47.5*scale,22*scale)}ctx.fillStyle='#17354c';ctx.font=`900 ${34*scale}px system-ui`;ctx.textAlign='center';ctx.fillText('FINISH',sx(900),sy(270));
 drawPlayer();ctx.restore();if(state.flash>0){ctx.fillStyle=`rgba(255,255,255,${state.flash*2.5})`;ctx.fillRect(0,0,CW,CH)}}
function drawPlayer(){if(player.falling&&Math.floor(performance.now()/70)%2)return;const px=sx(player.x),py=sy(player.y)-player.z*scale,shadowY=sy(player.y+12),moving=Math.hypot(player.vx,player.vy)>20,frame=moving?Math.floor(player.anim)%3:1,row=rowFor[player.face]??2;ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(px,shadowY,(24+player.z*.02)*scale,11*scale,0,0,Math.PI*2);ctx.fill();if(atm.complete&&atm.naturalWidth){const fw=atm.naturalWidth/3,fh=atm.naturalHeight/4;ctx.drawImage(atm,frame*fw,row*fh,fw,fh,px-34*scale,py-70*scale,68*scale,92*scale)}else{ctx.fillStyle='#ffd84d';ctx.beginPath();ctx.arc(px,py-30*scale,24*scale,0,Math.PI*2);ctx.fill()}}
function loop(now){if(!state.running)return;const dt=Math.min(.033,Math.max(.001,(now-state.last)/1000||.016));state.last=now;update(dt);draw();if(state.running)requestAnimationFrame(loop)}
draw();
})();