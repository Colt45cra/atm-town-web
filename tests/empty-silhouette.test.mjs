import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateFootprint,footprintContains} from '../js/footprint-geometry.js';
test('empty silhouette remains empty while preserving stairs and cutouts',()=>{
 const c=validateFootprint({type:'raster',rects:[],cutouts:[[0,0,2,2]],masks:{stairs:{type:'rectangle',width:10,depth:10,offsetX:0,offsetY:0}},depthMode:'silhouette',depthLine:-4});
 assert.equal(c.rects.length,0);assert.equal(c.masks.stairs.width,10);assert.equal(c.cutouts.length,1);assert.equal(c.depthLine,-4);
 for(const [x,y] of [[0,0],[10,10],[-1,-1]])assert.equal(footprintContains({x:0,y:0,width:100,collision:c},x,y),false);
});
test('invalid and excessive raster rectangles remain rejected',()=>{
 for(const rects of [null,[[0,0,0,1]],[[NaN,0,1,1]],Array.from({length:50001},()=>[0,0,1,1])])assert.throws(()=>validateFootprint({type:'raster',rects}));
});
test('maximum allowed raster computes bounds without argument spreading',()=>{
 const c=validateFootprint({type:'raster',rects:Array.from({length:50000},()=>[-2,-3,4,6])});assert.equal(c.width,4);assert.equal(c.depth,6);
});
