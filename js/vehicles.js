import {VEHICLE_MODELS,validateVehicle,vehicleStep,vehicleExit,vehiclePlacementScale,vehiclePlacementPose,vehicleFootprint} from './vehicle-contract.js?v=terrain-suspension-1';
import {vehicleFrame} from './vehicle-artwork.js?v=matched-camera-6';
const states=new Map(),images=new Map(),suspensions=new Map();let game=null,active=null,busy=false,lastPoll=0,polling=false,lastHeartbeat=0,heartbeatBusy=false,lastLeaseAck=0;
let objectSource=null,vehicleObjects=[],poseStamp=-1,poseCache=[];const specs=new WeakMap();
const invalidatePoses=()=>{poseStamp=-1;};
const toast=message=>game?.toast?.(message);
async function api(action,body){const response=await fetch('/api/leaderboards?action='+action,{method:body?'POST':'GET',cache:'no-store',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok)throw Error(data.error||'Vehicle request failed.');return data;}
function image(model){const key=model;if(!images.has(key)){const im=new Image();im.crossOrigin='anonymous';im.src='/api/leaderboards?action=vehicle-art&model='+model+'&facing=south&sheet=1&v=matched-camera-6';images.set(key,im);}return images.get(key);}
function spec(o){if(!o.collision?.vehicle)return null;if(specs.has(o))return specs.get(o);let value=null;try{value=validateVehicle(o.collision.vehicle);}catch{}specs.set(o,value);return value;}
function objects(){const source=game?.objects?.();if(!source)return vehicleObjects;if(source!==objectSource){objectSource=source;vehicleObjects=source.filter(o=>o.active!==false&&spec(o));invalidatePoses();}return vehicleObjects;}
function poses(){const list=objects();if(!list.length)return list;const now=Date.now(),stamp=Math.floor(now/16);if(poseStamp===stamp)return poseCache;const remotes=game?.remotes?.()||[];poseStamp=stamp;return poseCache=list.map(o=>{const s=spec(o),scale=vehiclePlacementScale(o),saved=states.get(o.id),driver=remotes.find(p=>p.map==='town'&&now-p.lastSeen<7000&&p.vehicle?.vehicle_id===o.id);if(active?.vehicle_id===o.id)return{...active,scale,object:o};if(driver)return{vehicle_id:o.id,model:s.model,scale,x:driver.drawX??driver.x,y:driver.drawY??driver.y,facing:driver.vehicle.facing,driver_session:driver.id,object:o};return{vehicle_id:o.id,model:s.model,scale,x:saved?.x??vehiclePlacementPose(o).x,y:saved?.y??vehiclePlacementPose(o).y,facing:saved?.facing||s.facing,driver_session:saved?.driver_session||null,object:o};});}
function init(hooks){game=hooks;poll(true);}
async function poll(force=false){if(polling||!objects().length||!game?.ready?.()||game.pose().map!=='town'||(!force&&Date.now()-lastPoll<15000))return;polling=true;lastPoll=Date.now();try{const data=await api('vehicle-state');states.clear();for(const row of data.vehicles)states.set(row.vehicle_id,row);invalidatePoses();}catch{}finally{polling=false;}}
function nearest(){if(!game?.ready?.()||game.pose().map!=='town')return null;if(active)return{type:'vehicle',label:'EXIT',name:'Exit '+VEHICLE_MODELS[active.model].name,vehicle_id:active.vehicle_id};if(busy||!game.canEnter())return null;const p=game.pose();let best=null,distance=120;for(const v of poses()){if(v.driver_session)continue;const box=vehicleFootprint(v.model,v.facing,v.scale),d=Math.hypot(Math.max(0,Math.abs(v.x-p.x)-box.halfX),Math.max(0,Math.abs(v.y-p.y)-box.halfY));if(d<distance){best={type:'vehicle',label:'DRIVE',name:VEHICLE_MODELS[v.model].name,vehicle_id:v.vehicle_id};distance=d;}}return best;}
async function interact(){if(busy)return;if(active)return leave();const target=nearest();if(!target)return;const o=poses().find(v=>v.vehicle_id===target.vehicle_id);busy=true;try{toast('Loading vehicle…');await (image(o.model).decode?.()||Promise.resolve());const p=game.pose(),data=await api('vehicle-claim',{vehicle_id:o.vehicle_id,session_id:game.session(),x:p.x,y:p.y,facing:o.facing});active={...data,model:o.model,scale:o.scale,entry:{x:p.x,y:p.y}};lastLeaseAck=Date.now();lastHeartbeat=0;invalidatePoses();game.place(active.x,active.y,active.facing);game.broadcast();toast('Driving '+VEHICLE_MODELS[o.model].name+' · Release to slow · Pull back to reverse · ACTION to exit');}catch(e){toast(e.message);poll(true);}finally{busy=false;}}
async function leave(force=false){if(!active||busy)return;const old=active;let exit=vehicleExit(old,old.model,(x,y)=>game.blocked(x,y),game.bounds());if(!exit&&force&&old.entry&&!game.blocked(old.entry.x,old.entry.y))exit=old.entry;if(!exit&&!force){toast('Find open space beside the vehicle to get out.');return;}busy=true;try{const row=await api('vehicle-release',{vehicle_id:old.vehicle_id,session_id:game.session(),lease_token:old.lease_token,x:old.x,y:old.y,facing:old.facing});states.set(old.vehicle_id,row);active=null;invalidatePoses();if(exit)game.place(exit.x,exit.y,old.facing);game.broadcast();}catch(e){toast(e.message);}finally{busy=false;}}
function update(dt,input){poll();if(!active)return false;const currentObject=objects().find(o=>o.id===active.vehicle_id);if(!currentObject){active=null;invalidatePoses();game.broadcast();return false;}if(game.pose().map!=='town'){leave(true);return false;}if(!game.canDrive()){leave(true);return true;}
 if(Date.now()-lastLeaseAck>15000){toast('Connection lost · driving paused');if(Date.now()-lastLeaseAck>21000){const exit=vehicleExit(active,active.model,(x,y)=>game.blocked(x,y),game.bounds());active=null;invalidatePoses();if(exit)game.place(exit.x,exit.y);game.broadcast();}return true;}
 const step=vehicleStep(active,input,dt,active.model,(x,y)=>game.blocked(x,y),game.bounds(),spec(currentObject));Object.assign(active,step);invalidatePoses();game.place(step.x,step.y,step.facing);heartbeat();return true;
}
async function heartbeat(){if(!active||heartbeatBusy||busy||Date.now()-lastHeartbeat<4000)return;heartbeatBusy=true;lastHeartbeat=Date.now();const old=active;try{await api('vehicle-heartbeat',{vehicle_id:old.vehicle_id,session_id:game.session(),lease_token:old.lease_token,x:old.x,y:old.y,facing:old.facing});if(active===old)lastLeaseAck=Date.now();}catch(e){if(active===old&&Date.now()-lastLeaseAck>15000)toast(e.message);}finally{heartbeatBusy=false;}}
function publicState(){return active?{vehicle_id:active.vehicle_id,model:active.model,facing:active.facing}:null;}
function blocked(x,y){return poses().some(v=>{if(v.vehicle_id===active?.vehicle_id)return false;const b=vehicleFootprint(v.model,v.facing,v.scale);return Math.abs(x-v.x)<b.halfX&&Math.abs(y-(v.y+22))<b.halfY;});}
function actors(view){return poses().filter(v=>{const extent=200*Math.max(1,v.scale||1);return v.x>view.x-extent&&v.x<view.x+view.w+extent&&v.y>view.y-extent&&v.y<view.y+view.h+extent;}).map(v=>({type:'vehicle',vehicle:v,depth:v.y+22}));}
// A small critically damped response follows distance travelled, never wall-clock
// wobble. Sprite angle, size, shadow and collision anchors stay fixed.
function suspensionFor(v){
 const now=Date.now(),id=v.vehicle_id,scale=v.scale||1;
 let state=suspensions.get(id);
 if(!state){state={x:v.x,y:v.y,time:now,phase:0,bounce:0,velocity:0,rough:0,roughAt:0};suspensions.set(id,state);return 0;}
 const elapsed=(now-state.time)/1000,distance=Math.hypot(v.x-state.x,v.y-state.y);
 if(elapsed<=0)return state.bounce;
 const dt=Math.min(.1,elapsed);
 if(elapsed>.5||distance>100){Object.assign(state,{x:v.x,y:v.y,time:now,bounce:0,velocity:0});return 0;}
 const moving=distance>.01,speed=moving?distance/elapsed:0;
 if(moving&&now-state.roughAt>=200){state.roughAt=now;const sample=Number(game?.roughness?.(v.x,v.y));state.rough=Number.isFinite(sample)?Math.max(0,Math.min(1,sample)):0;}
 const strength=Math.max(0,Math.min(2,Number(v.object?.collision?.vehicle?.suspension??1)));
 // Paved and unknown surfaces stay steady. Hover cars do not have wheel suspension.
 const rough=Math.max(0,(state.rough-.35)/.65);
 state.phase+=distance/42;
 const amplitude=v.model==='hover'?0:Math.min(.75,.35*strength)*rough*Math.min(1,speed/180)*Math.min(1.5,scale);
 const target=moving?amplitude*(.72*Math.sin(state.phase)+.28*Math.sin(state.phase*1.61)):0;
 const steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps;
 for(let i=0;i<steps;i++){state.velocity+=(100*(target-state.bounce)-22*state.velocity)*h;state.bounce+=state.velocity*h;}
 if(!moving&&Math.abs(state.bounce)<.001&&Math.abs(state.velocity)<.01){state.bounce=0;state.velocity=0;}
 state.x=v.x;state.y=v.y;state.time=now;
 return state.bounce;
}
function draw(ctx,v){
 const im=image(v.model);if(!im.complete||!im.naturalWidth)return;
 const frame=vehicleFrame(v.model,v.facing,v.object?.collision?.vehicle?.facing||'south');if(!frame)return;
 const scale=v.scale||1,width=frame.width*scale,height=frame.height*scale,bounce=suspensionFor(v);
 ctx.save();ctx.fillStyle='rgba(0,0,0,.23)';ctx.beginPath();
 ctx.ellipse(v.x,v.y+18,width*.35,12*scale,0,0,Math.PI*2);ctx.fill();
 ctx.drawImage(im,frame.x,frame.y,frame.w,frame.h,v.x-frame.anchorX*scale,v.y+22-frame.anchorY*scale+bounce,width,height);
 ctx.restore();
}
window.ATMVehicles={init,nearest,interact,update,actors,draw,blocked,publicState,isDriving:()=>!!active};window.ATMInitVehicles?.();
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)leave(true);});

