import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {VEHICLE_MODELS,vehicleStep,vehicleExit,vehicleDirection,validateVehicle} from '../js/vehicle-contract.js';
import {publicVehicleState} from '../lib/vehicles.js';
const bounds={minX:0,minY:0,maxX:1000,maxY:1000};
test('driving uses directional sprites, normalized speed, and small swept collision steps',()=>{
 assert.equal(vehicleDirection(0,-1),'north');assert.equal(vehicleDirection(-1,0),'west');
 const start={x:200,y:300,facing:'south'},a=vehicleStep(start,{x:1,y:0},.1,'hover',()=>false,bounds),b=vehicleStep(start,{x:1,y:1},.1,'hover',()=>false,bounds);
 assert.ok(Math.abs(Math.hypot(a.x-200,a.y-300)-Math.hypot(b.x-200,b.y-300))<.01);
 let p=start;for(let i=0;i<100;i++)p=vehicleStep(p,{x:1,y:0},.1,'hover',(x)=>x>=400&&x<=402,bounds);assert.ok(p.x<400);assert.ok(p.x>300);
 assert.throws(()=>validateVehicle({model:'evil',facing:'south'}));
});
test('exit searches for a clear place and never dumps the player inside a wall or outside the map',()=>{
 const p={x:200,y:300};const exit=vehicleExit(p,'truck',(x)=>x>200,bounds);assert.ok(exit.x<200);assert.equal(vehicleExit(p,'truck',()=>true,bounds),null);
});
test('public synchronization never includes lease tokens and expired drivers appear idle',()=>{
 const row={vehicle_id:'id',x:1,y:2,facing:'north',driver_session:'driver',lease_token:'secret',lease_expires:new Date(Date.now()-1).toISOString()};const p=publicVehicleState(row);assert.equal(p.driver_session,null);assert.equal(p.lease_token,undefined);
});
test('enter, movement, safe exit and parked position use shared API state without broadcasting the lock',async()=>{
 const object={id:'car',x:200,y:322,active:true,collision:{vehicle:{model:'buggy',facing:'south'}}},pose={x:190,y:300,map:'town'};let state={vehicle_id:'car',x:200,y:300,facing:'south',driver_session:null},broadcast=0;
 const context=vm.createContext({window:{},Image:class{complete=false;},document:{addEventListener(){}},Date,console,VEHICLE_MODELS,vehicleStep,vehicleExit,validateVehicle,fetch:async(url,options)=>{const action=new URL(url,'https://atmtown.fun').searchParams.get('action'),body=options?.body?JSON.parse(options.body):null;let data;
 if(action==='vehicle-state')data={vehicles:[state]};else if(action==='vehicle-claim'){state={...state,driver_session:'me'};data={...state,lease_token:'secret'};}else if(action==='vehicle-release'){state={...state,x:body.x,y:body.y,facing:body.facing,driver_session:null};data=state;}else data=state;
 return{ok:true,json:async()=>data};}});
 vm.runInContext(readFileSync(new URL('../js/vehicles.js',import.meta.url),'utf8').replace(/^import .*;\n/,''),context);
 const runtime=context.window.ATMVehicles;runtime.init({ready:()=>true,pose:()=>pose,objects:()=>[object],session:()=> 'me',remotes:()=>[],canEnter:()=>true,canDrive:()=>true,blocked:()=>false,bounds:()=>bounds,place:(x,y)=>Object.assign(pose,{x,y}),broadcast:()=>broadcast++,toast:()=>{}});
 await new Promise(r=>setImmediate(r));assert.equal(runtime.nearest().label,'DRIVE');await runtime.interact();assert.equal(runtime.isDriving(),true);assert.equal(runtime.publicState().lease_token,undefined);
 runtime.update(.1,{x:1,y:0});assert.ok(pose.x>200);await runtime.interact();assert.equal(runtime.isDriving(),false);assert.ok(state.x>200);assert.ok(pose.x>state.x);assert.equal(runtime.actors({x:0,y:0,w:1000,h:1000}).length,1);assert.equal(broadcast,2);
});
test('ordinary map objects are scanned once without exceptions or remote-player allocations during collision checks',()=>{
 let clock=1000,filters=0,validations=0,remoteReads=0;const list=new Proxy(Array.from({length:757},(_,id)=>({id,active:true,collision:{type:'rectangle'}})),{get(target,key){if(key==='filter')filters++;return Reflect.get(target,key);}});
 const context=vm.createContext({window:{},document:{addEventListener(){}},Image:class{},Date:{now:()=>clock},VEHICLE_MODELS,vehicleStep,vehicleExit,validateVehicle:value=>{validations++;return validateVehicle(value);},fetch:async()=>({ok:true,json:async()=>({vehicles:[]})})});
 vm.runInContext(readFileSync(new URL('../js/vehicles.js',import.meta.url),'utf8').replace(/^import .*;\n/,''),context);const r=context.window.ATMVehicles;
 r.init({objects:()=>list,remotes:()=>{remoteReads++;return[];},ready:()=>true,pose:()=>({map:'town',x:100,y:100}),canEnter:()=>true});
 for(let frame=0;frame<120;frame++){clock+=17;for(let sample=0;sample<60;sample++)assert.equal(r.blocked(100,100),false);r.actors({x:0,y:0,w:1000,h:1000});r.nearest();}
 assert.equal(filters,1);assert.equal(validations,0);assert.equal(remoteReads,0);
});
test('multiple footstep samples share one vehicle position calculation per frame',()=>{
 let clock=1000,remoteReads=0;const list=[{id:'car',active:true,x:200,y:300,collision:{vehicle:{model:'truck',facing:'south'}}}];
 const context=vm.createContext({window:{},document:{addEventListener(){}},Image:class{},Date:{now:()=>clock},VEHICLE_MODELS,vehicleStep,vehicleExit,validateVehicle,fetch:async()=>({ok:true,json:async()=>({vehicles:[]})})});
 vm.runInContext(readFileSync(new URL('../js/vehicles.js',import.meta.url),'utf8').replace(/^import .*;\n/,''),context);const r=context.window.ATMVehicles;r.init({objects:()=>list,remotes:()=>{remoteReads++;return[];},ready:()=>true,pose:()=>({map:'town'})});
 for(let sample=0;sample<1000;sample++)r.blocked(100,100);assert.equal(remoteReads,1);clock+=17;r.blocked(100,100);assert.equal(remoteReads,2);
});
