import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const horde=fs.readFileSync(new URL('../js/zombie-outbreak.js',import.meta.url),'utf8');
const core=fs.readFileSync(new URL('../js/runtime/game-core.js',import.meta.url),'utf8');
const section=(s,start,end)=>s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start)));
test('Horde viewport culling preserves crossing streaks and visible sprite edges',()=>{
 const context=vm.createContext({state:{phase:'active',zombies:[{id:1,x:110,y:50},{id:2,x:1000,y:1000},{id:3,x:50,y:50,dead:true}]},isZombieEvent:()=>true,spawned:()=>true,hordeSheet:()=>({cols:3,rows:4,displayScale:1,anchorX:30,anchorY:50}),hordeSheetImgs:{gutter:{naturalWidth:180,naturalHeight:240}},PLAYER_GROUND_FOOT_OFFSET:34});
 vm.runInContext(section(horde,'  function visibleBounds','  function drawGround')+section(horde,'  function getDepthActors','  function drawActor'),context);
 assert.equal(vm.runInContext('visibleRect(visibleBounds({cameraX:0,cameraY:0,viewportWidth:100,viewportHeight:100}),-100,50,200,50,4)',context),true);
 assert.equal(vm.runInContext('getDepthActors({map:"town",cameraX:0,cameraY:0,viewportWidth:100,viewportHeight:100}).length',context),1);
 assert.equal(vm.runInContext('state.zombies.length',context),3);
});
test('Gunfire bursts respect the 125ms snapshot cadence',()=>{
 let now=1000,sends=0;
 const context=vm.createContext({state:{networkOnline:true,phase:'active',lastSnapshotSendAt:0},performance:{now:()=>now},isAuthority:()=>true,isZombieEvent:()=>true,emitNetwork:()=>sends++,buildSnapshot:()=>({})});
 vm.runInContext(section(horde,'  function sendSnapshot','  function applySnapshot'),context);
 for(let i=0;i<30;i++){vm.runInContext('sendSnapshot(false)',context);now+=3;}
 assert.equal(sends,1);now=1125;vm.runInContext('sendSnapshot(false)',context);assert.equal(sends,2);
 assert.match(section(horde,'  function receiveNetwork','  function updateFx'),/if \(isAuthority\(\)\) sendSnapshot\(false\);\s*return true;/);
});
test('Darkness cache follows player movement and fades without rebuilding; resolution changes rebuild',()=>{
 let builds=0;const draws=[];
 const painter={scale(){},createRadialGradient(){return {addColorStop(){}}},fillRect(){}};
 const context=vm.createContext({hordeNightfallAlpha:1,currentMap:'town',W:300,H:200,zoom:1,DPR:3,player:{x:150,y:100},cam:{x:0,y:0},HORDE_NIGHTFALL:{visionInner:30,visionOuter:70,darkness:.9},document:{createElement(){builds++;return {getContext:()=>painter}}},ctx:{globalAlpha:1,save(){},restore(){this.globalAlpha=1},fillRect(){},drawImage(...args){draws.push(args)}}});
 vm.runInContext(section(core,'let hordeVisionCache','\nfunction getSourceRectForImage'),context);
 vm.runInContext('drawHordeVisionDarkness();player.x+=10;hordeNightfallAlpha=.5;drawHordeVisionDarkness()',context);
 assert.equal(builds,1);assert.equal(draws[1][1]-draws[0][1],10);assert.equal(draws[0][0].width,420);
 vm.runInContext('DPR=2;drawHordeVisionDarkness()',context);assert.equal(builds,2);
});
