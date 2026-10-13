import {footprintPoints} from './footprint-geometry.js?v=town-reentry-1';
import {verticalFenceColliders} from './fence-collision.js?v=vertical-fence-1';
const CELL=256;
function shapeBounds(o,shape){const proxy={...o,collision:shape};let points=footprintPoints(proxy);if(shape?.type==='raster'&&!points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))points=shape.rects.flatMap(r=>[{x:r[0],y:r[1]},{x:r[0]+r[2],y:r[1]+r[3]}]);return{left:o.x+Math.min(...points.map(p=>p.x)),right:o.x+Math.max(...points.map(p=>p.x)),top:o.y+Math.min(...points.map(p=>p.y)),bottom:o.y+Math.max(...points.map(p=>p.y))};}
export function createWorldObjectIndex(objects){
 const buckets={visual:new Map(),blocked:new Map(),stairs:new Map(),action:new Map()},order=new Map(objects.map((o,i)=>[o,i]));
 function add(kind,o,b){if(!Object.values(b).every(Number.isFinite))return;for(let x=Math.floor(b.left/CELL);x<=Math.floor(b.right/CELL);x++)for(let y=Math.floor(b.top/CELL);y<=Math.floor(b.bottom/CELL);y++){const key=x+','+y,list=buckets[kind].get(key)||[];if(!list.includes(o))list.push(o);buckets[kind].set(key,list);}}
 for(const o of objects){if(o.active===false)continue;const h=o.width*o.image_height/o.image_width;add('visual',o,{left:o.x-o.width/2,right:o.x+o.width/2,top:o.y-h,bottom:o.y});if(o.solid)add('blocked',o,shapeBounds(o,o.collision));for(const kind of ['stairs','action'])if(o.collision?.masks?.[kind])add(kind,o,shapeBounds(o,o.collision.masks[kind]));for(const r of o.collision?.cutouts||[])add('stairs',o,{left:o.x+r[0],right:o.x+r[0]+r[2],top:o.y+r[1],bottom:o.y+r[1]+r[3]});}
 // Include supplemental fence spans in the same spatial broad-phase as authored masks.
 // Keep them out of the visual index, so no existing artwork or object rendering changes.
 for(const fence of verticalFenceColliders(objects)){order.set(fence,order.size);add('blocked',fence,shapeBounds(fence,fence.collision));}
 return Object.freeze({point:(kind,x,y)=>buckets[kind]?.get(Math.floor(x/CELL)+','+Math.floor(y/CELL))||[],rect(kind,b){const found=new Set();for(let x=Math.floor(b.x/CELL);x<=Math.floor((b.x+b.w)/CELL);x++)for(let y=Math.floor(b.y/CELL);y<=Math.floor((b.y+b.h)/CELL);y++)for(const o of buckets[kind]?.get(x+','+y)||[])found.add(o);return [...found].sort((a,b)=>order.get(a)-order.get(b));}});
}
