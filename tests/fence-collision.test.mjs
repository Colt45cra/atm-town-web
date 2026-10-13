import test from 'node:test';
import assert from 'node:assert/strict';
import {verticalFenceColliders} from '../js/fence-collision.js';
import {createWorldObjectIndex} from '../js/world-object-index.js';
import {footprintContains} from '../js/footprint-geometry.js';

const side=(id,y,width=5.90625)=>({
 id,name:'Wood fence side',x:4913,y,width,image_width:6,image_height:96,solid:true,active:true,
 collision:{type:'raster',rects:[[-10,-29,20,36]],width:20,depth:36,offsetX:0,offsetY:-11}
});
const post=(id,y,x=5204)=>({
 id,name:'Picket fence post',x,y,width:16,image_width:16,image_height:28,solid:true,active:true,
 collision:{type:'raster',rects:[[-12,-14,24,18]],width:24,depth:18,offsetX:0,offsetY:-5}
});
const isBlocked=(index,x,y)=>index.point('blocked',x,y).some(o=>o.solid&&footprintContains(o,x,y));

test('published wood fence sides block across their whole visible vertical sprite',()=>{
 const o=side('side-one',517.5),index=createWorldObjectIndex([o]);
 assert.equal(footprintContains(o,4913,450),false,'old authored mask only covered the bottom');
 assert.equal(isBlocked(index,4913,450),true,'repaired mask covers the upper fence');
 assert.equal(isBlocked(index,4913,510),true,'authored mask still blocks the bottom');
 assert.equal(isBlocked(index,4940,450),false,'surrounding walkable space stays open');
 assert.equal(isBlocked(index,4913,415),false,'space above the visible fence stays open');
});

test('vertical picket posts connect along a normal run without sealing a missing-panel gap',()=>{
 const objects=[post('a',1385),post('b',1475.83),post('c',1566.66),post('d',1748.32)];
 const index=createWorldObjectIndex(objects);
 assert.equal(verticalFenceColliders(objects).length,2);
 assert.equal(isBlocked(index,5204,1425),true);
 assert.equal(isBlocked(index,5204,1520),true);
 assert.equal(isBlocked(index,5204,1650),false,'intentionally large opening remains walkable');
});

test('fences running horizontally or in separate columns gain no phantom walls',()=>{
 const row=[post('a',100,10),post('b',100,100),post('c',100,200)];
 const panel={...side('panel',100),name:'Wood fence panel',width:91,image_width:96,image_height:24};
 assert.equal(verticalFenceColliders([...row,panel]).length,0);
});

test('inactive or decorative fence artwork cannot create new collision barriers',()=>{
 const objects=[{...side('inactive',300),active:false},{...side('decoration',300),solid:false}];
 assert.equal(verticalFenceColliders(objects).length,0);
});

test('visual queries never include the supplemental fence geometry',()=>{
 const o=side('side-one',517.5),index=createWorldObjectIndex([o]);
 assert.deepEqual(index.rect('visual',{x:4900,y:420,w:30,h:120}),[o]);
});
