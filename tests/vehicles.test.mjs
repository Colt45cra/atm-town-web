import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {VEHICLE_MODELS,VEHICLE_FACING,vehicleSpriteWidth,vehicleStep,vehicleExit,vehicleDirection,validateVehicle,vehiclePlacementScale,vehicleFootprint} from '../js/vehicle-contract.js';
import {VEHICLE_ARTWORK,VEHICLE_PLACEMENT_REFERENCE,vehicleFrame} from '../js/vehicle-artwork.js';
import {publicVehicleState,vehicleArt} from '../lib/vehicles.js';
const bounds={minX:0,minY:0,maxX:1000,maxY:1000};
test('driving uses directional sprites, normalized speed, and small swept collision steps',()=>{
 assert.equal(vehicleDirection(0,-1),'north');assert.equal(vehicleDirection(-1,0),'west');
 const start={x:200,y:300,facing:'east'},a=vehicleStep(start,{x:1,y:0},.1,'hover',()=>false,bounds),b=vehicleStep({...start,facing:'southeast'},{x:1,y:1},.1,'hover',()=>false,bounds);
 assert.ok(Math.abs(Math.hypot(a.x-200,a.y-300)-Math.hypot(b.x-200,b.y-300))<.01);
 let p=start;for(let i=0;i<100;i++)p=vehicleStep(p,{x:1,y:0},.1,'hover',(x)=>x>=400&&x<=402,bounds);assert.ok(p.x<400);assert.ok(p.x>300);
 assert.throws(()=>validateVehicle({model:'evil',facing:'south'}));
});
const openBounds={minX:-10000,minY:-10000,maxX:10000,maxY:10000};
function drive(p,input,seconds,model='buggy',fps=60,blocked=()=>false){for(let i=0;i<Math.round(seconds*fps);i++)p={...p,...vehicleStep(p,input,1/fps,model,blocked,openBounds)};return p;}
test('acceleration builds speed, releasing coasts and stops, reverse brakes before backing up',()=>{
 const p={x:0,y:0,facing:'east'},early=drive(p,{x:1,y:0},.1),fast=drive(p,{x:1,y:0},2);
 assert.ok(early.speed<fast.speed);assert.ok(fast.speed>280);const coast=drive(fast,{x:0,y:0},.1);assert.ok(coast.x>fast.x);assert.ok(coast.speed<fast.speed);const stopped=drive(coast,{x:0,y:0},2);assert.equal(stopped.speed,0);assert.equal(stopped.vx,0);
 const braking=drive(fast,{x:-1,y:0},.1);assert.ok(braking.speed>0);assert.equal(braking.facing,'east');const reverse=drive(braking,{x:-1,y:0},2);assert.ok(reverse.speed<0);assert.equal(reverse.facing,'east');assert.ok(reverse.x<braking.x);
});
test('slow steering is tighter, diagonal views are stable and frame rates produce equivalent motion',()=>{
 const p={x:0,y:0,facing:'east'},slow=drive(p,{x:0,y:1},.1),fast=drive({...p,speed:300,vx:300},{x:0,y:1},.1);assert.ok(slow.heading>fast.heading);assert.equal(vehicleDirection(1,1),'southeast');assert.equal(vehicleDirection(1,.44,'east'),'east');
 const a=drive(p,{x:1,y:0},2,'hover',30),b=drive(p,{x:1,y:0},2,'hover',60);assert.ok(Math.abs(a.x-b.x)<.01);assert.equal(a.speed,b.speed);
});
test('a thin wall stops momentum and diagonal movement slides along it',()=>{
 const wall=x=>x>=200&&x<=202;const p=drive({x:0,y:0,facing:'southeast'},{x:1,y:1},4,'buggy',60,wall);assert.ok(p.x<200);assert.ok(p.y>200);assert.ok(Math.abs(p.vx)<1);
});
test('exit searches for a clear place and never dumps the player inside a wall or outside the map',()=>{
 const p={x:200,y:300};const exit=vehicleExit(p,'truck',(x)=>x>200,bounds);assert.ok(exit.x<200);assert.equal(vehicleExit(p,'truck',()=>true,bounds),null);
});
test('public synchronization never includes lease tokens and expired drivers appear idle',()=>{
 const row={vehicle_id:'id',x:1,y:2,facing:'north',driver_session:'driver',lease_token:'secret',lease_expires:new Date(Date.now()-1).toISOString()};const p=publicVehicleState(row);assert.equal(p.driver_session,null);assert.equal(p.lease_token,undefined);
});
test('enter, movement, safe exit and parked position use shared API state without broadcasting the lock',async()=>{
 const object={id:'car',width:100,x:200,y:322,active:true,collision:{vehicle:{model:'buggy',facing:'south'}}},pose={x:190,y:300,map:'town'};let state={vehicle_id:'car',width:100,x:200,y:300,facing:'south',driver_session:null},broadcast=0;
 const context=vm.createContext({window:{},Image:class{complete=false;},document:{addEventListener(){}},Date,console,VEHICLE_MODELS,VEHICLE_FACING,vehicleFrame,vehicleSpriteWidth,vehicleStep,vehicleExit,vehiclePlacementScale,vehicleFootprint,validateVehicle,fetch:async(url,options)=>{const action=new URL(url,'https://atmtown.fun').searchParams.get('action'),body=options?.body?JSON.parse(options.body):null;let data;
 if(action==='vehicle-state')data={vehicles:[state]};else if(action==='vehicle-claim'){state={...state,driver_session:'me'};data={...state,lease_token:'secret'};}else if(action==='vehicle-release'){state={...state,x:body.x,y:body.y,facing:body.facing,driver_session:null};data=state;}else data=state;
 return{ok:true,json:async()=>data};}});
 vm.runInContext(readFileSync(new URL('../js/vehicles.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,''),context);
 const runtime=context.window.ATMVehicles;runtime.init({ready:()=>true,pose:()=>pose,objects:()=>[object],session:()=> 'me',remotes:()=>[],canEnter:()=>true,canDrive:()=>true,blocked:()=>false,bounds:()=>bounds,place:(x,y)=>Object.assign(pose,{x,y}),broadcast:()=>broadcast++,toast:()=>{}});
 await new Promise(r=>setImmediate(r));assert.equal(runtime.nearest().label,'DRIVE');await runtime.interact();assert.equal(runtime.isDriving(),true);assert.equal(runtime.publicState().lease_token,undefined);
 runtime.update(.1,{x:1,y:0});assert.ok(pose.x>200);await runtime.interact();assert.equal(runtime.isDriving(),false);assert.ok(state.x>200);assert.ok(pose.x>state.x);assert.equal(runtime.actors({x:0,y:0,w:1000,h:1000}).length,1);assert.equal(broadcast,2);
});
test('ordinary map objects are scanned once without exceptions or remote-player allocations during collision checks',()=>{
 let clock=1000,filters=0,validations=0,remoteReads=0;const list=new Proxy(Array.from({length:757},(_,id)=>({id,active:true,collision:{type:'rectangle'}})),{get(target,key){if(key==='filter')filters++;return Reflect.get(target,key);}});
 const context=vm.createContext({window:{},document:{addEventListener(){}},Image:class{},Date:{now:()=>clock},VEHICLE_MODELS,VEHICLE_FACING,vehicleFrame,vehicleSpriteWidth,vehicleStep,vehicleExit,validateVehicle:value=>{validations++;return validateVehicle(value);},fetch:async()=>({ok:true,json:async()=>({vehicles:[]})})});
 vm.runInContext(readFileSync(new URL('../js/vehicles.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,''),context);const r=context.window.ATMVehicles;
 r.init({objects:()=>list,remotes:()=>{remoteReads++;return[];},ready:()=>true,pose:()=>({map:'town',x:100,y:100}),canEnter:()=>true});
 for(let frame=0;frame<120;frame++){clock+=17;for(let sample=0;sample<60;sample++)assert.equal(r.blocked(100,100),false);r.actors({x:0,y:0,w:1000,h:1000});r.nearest();}
 assert.equal(filters,1);assert.equal(validations,0);assert.equal(remoteReads,0);
});
test('multiple footstep samples share one vehicle position calculation per frame',()=>{
 let clock=1000,remoteReads=0;const list=[{id:'car',width:100,active:true,x:200,y:300,collision:{vehicle:{model:'truck',facing:'south'}}}];
 const context=vm.createContext({window:{},document:{addEventListener(){}},Image:class{},Date:{now:()=>clock},VEHICLE_MODELS,VEHICLE_FACING,vehicleFrame,vehicleSpriteWidth,vehicleStep,vehicleExit,vehiclePlacementScale,vehicleFootprint,validateVehicle,fetch:async()=>({ok:true,json:async()=>({vehicles:[]})})});
 vm.runInContext(readFileSync(new URL('../js/vehicles.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,''),context);const r=context.window.ATMVehicles;r.init({objects:()=>list,remotes:()=>{remoteReads++;return[];},ready:()=>true,pose:()=>({map:'town'})});
 for(let sample=0;sample<1000;sample++)r.blocked(100,100);assert.equal(remoteReads,1);clock+=17;r.blocked(100,100);assert.equal(remoteReads,2);
});
test('vehicle artwork uses the saved editor width, bottom anchor and proportional scale when turning',()=>{
 const object={id:'car',width:400,x:300,y:600,active:true,collision:{vehicle:{model:'truck',facing:'south'}}};
 class Image{complete=true;set src(url){const facing=new URL(url,'https://atmtown.fun').searchParams.get('facing'),f=VEHICLE_ARTWORK.truck[facing];this.naturalWidth=f.fullWidth;this.naturalHeight=f.fullHeight;}}
 const context=vm.createContext({window:{},document:{addEventListener(){}},Image,Date,VEHICLE_MODELS,VEHICLE_FACING,vehicleFrame,vehicleSpriteWidth,vehicleStep,vehicleExit,validateVehicle,vehiclePlacementScale,vehicleFootprint,fetch:async()=>({ok:true,json:async()=>({vehicles:[]})})});
 vm.runInContext(readFileSync(new URL('../js/vehicles.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,''),context);const runtime=context.window.ATMVehicles;runtime.init({objects:()=>[object],remotes:()=>[],ready:()=>true,pose:()=>({map:'town'})});
 const v=runtime.actors({x:0,y:0,w:1000,h:1000})[0].vehicle,draws=[],ctx={save(){},restore(){},beginPath(){},ellipse(){},fill(){},drawImage(...args){draws.push(args);}};
 runtime.draw(ctx,v);const original=VEHICLE_PLACEMENT_REFERENCE.truck.south;assert.equal(draws[0][7],object.width*original.w/original.fullWidth);assert.equal(draws[0][6]+vehicleFrame('truck','south','south').anchorY*4,object.y);
 v.facing='east';runtime.draw(ctx,v);const side=vehicleFrame('truck','east','south');assert.equal(draws[1][7],side.width*4);assert.equal(draws[1][8],side.height*4);assert.equal(vehicleFootprint('truck','south',v.scale).halfX,vehicleFootprint('truck','south',1).halfX*4);
});

test('every turning view preserves the native aspect ratio and one pixel scale across the atlas',()=>{
 for(const model of ['truck','buggy','hover'])for(const authored of VEHICLE_FACING){
  const first=vehicleFrame(model,'south',authored),pixelScale=first.width/first.w;
  for(const facing of VEHICLE_FACING){const f=vehicleFrame(model,facing,authored);assert.ok(Math.abs(f.width/f.w-pixelScale)<1e-9);assert.ok(Math.abs(f.height/f.h-pixelScale)<1e-9);assert.ok(f.x+f.w<=f.fullWidth);assert.ok(f.y+f.h<=f.fullHeight);assert.ok(Math.abs(f.anchorX/f.width-.5)<1e-9);assert.ok(Math.abs(f.anchorY/f.height-.6)<1e-9);}
  const saved=vehicleFrame(model,authored,authored),source=VEHICLE_PLACEMENT_REFERENCE[model][authored];assert.ok(Math.abs(saved.width-vehicleSpriteWidth(authored)*source.w/source.fullWidth)<1e-9);
 }
 // The buggy must no longer grow to twice its size between the straight and diagonal views.
 const views=VEHICLE_FACING.map(f=>vehicleFrame('buggy',f));assert.ok(Math.max(...views.map(f=>f.width))/Math.min(...views.map(f=>f.width))<1.25);assert.ok(Math.max(...views.map(f=>f.height))/Math.min(...views.map(f=>f.height))<1.2);
});
test('art proxy supports the matched sheet and preserves old single-frame requests',async()=>{
 const originalFetch=globalThis.fetch,urls=[];globalThis.fetch=async url=>{urls.push(url);return{ok:true,headers:{get:()=> 'image/png'},arrayBuffer:async()=>new ArrayBuffer(8)}};
 try{await vehicleArt({model:'buggy',facing:'south',sheet:'1'});assert.ok(urls[0].endsWith('/vehicle-buggy-sheet-v5.png'));await vehicleArt({model:'buggy',facing:'north'});assert.ok(urls[1].endsWith('/vehicle-buggy-north.png'));await assert.rejects(()=>vehicleArt({model:'../secret',facing:'south',sheet:'1'}));}finally{globalThis.fetch=originalFetch;}
});
