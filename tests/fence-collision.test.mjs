import test from 'node:test';import assert from 'node:assert/strict';import {repairVerticalFence} from '../js/fence-collision.js';import {footprintContains} from '../js/footprint-geometry.js';
test('legacy vertical fence blocks along its entire segment, with a narrow crosswise footprint',()=>{
 const o=repairVerticalFence({name:'Picket fence side',solid:true,x:100,y:200,width:3,image_width:3,image_height:96,collision:{type:'raster',rects:[[0,-20,3,20]]}});
 for(const y of [104,130,160,199])assert.equal(footprintContains(o,100,y),true);
 assert.equal(footprintContains(o,125,160),false);assert.equal(footprintContains(o,100,90),false);
});
test('non-fences and deliberately non-solid fences preserve their authored collision',()=>{for(const o of [{name:'Tree',solid:true,width:3,image_width:3,image_height:96},{name:'Picket fence side',solid:false,width:3,image_width:3,image_height:96}])assert.equal(repairVerticalFence(o),o);});
