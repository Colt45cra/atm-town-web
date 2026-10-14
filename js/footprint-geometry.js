import {validateBillboard} from './billboard-contract.js';
// Footprints use world pixels relative to the object's bottom-center anchor.
export function footprintPoints(object){
 const c=object.collision;if(c?.type==='polygon')return c.points;
 const w=['rectangle','raster'].includes(c?.type)?c.width:object.width*.8,d=['rectangle','raster'].includes(c?.type)?c.depth:22,x=c?.offsetX||0,y=['rectangle','raster'].includes(c?.type)?c.offsetY:-7;
 return [{x:x-w/2,y:y-d/2},{x:x+w/2,y:y-d/2},{x:x+w/2,y:y+d/2},{x:x-w/2,y:y+d/2}];
}
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function onSegment(a,b,p){return Math.abs(cross(a,b,p))<1e-7&&p.x>=Math.min(a.x,b.x)-1e-7&&p.x<=Math.max(a.x,b.x)+1e-7&&p.y>=Math.min(a.y,b.y)-1e-7&&p.y<=Math.max(a.y,b.y)+1e-7;}
function intersects(a,b,c,d){const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);return (abC*abD<0&&cdA*cdB<0)||onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b);}
function validateShape(c){
 if(c===null||c===undefined)return null;
 const coordinate=v=>Number.isFinite(v)&&Math.abs(v)<=16384;
 if(c.type==='raster'){
  if(!Array.isArray(c.rects)||!c.rects.length||c.rects.length>50000)throw Error('Silhouette mask is too complex.');
  const rects=c.rects.map(r=>{if(!Array.isArray(r)||r.length!==4||!r.every(Number.isFinite)||!r.every(v=>Math.abs(v)<=32768)||r[2]<=0||r[3]<=0)throw Error('Invalid silhouette mask.');return [...r];});
  const left=Math.min(...rects.map(r=>r[0])),top=Math.min(...rects.map(r=>r[1])),right=Math.max(...rects.map(r=>r[0]+r[2])),bottom=Math.max(...rects.map(r=>r[1]+r[3]));
  return {type:'raster',rects,width:right-left,depth:bottom-top,offsetX:(left+right)/2,offsetY:(top+bottom)/2};
 }
 if(c.type==='rectangle'){
  if(![c.width,c.depth].every(v=>Number.isFinite(v)&&v>=1&&v<=16384)||![c.offsetX,c.offsetY].every(coordinate))throw Error('Blocked width and length must be 1–16384 pixels; offsets must be within 16384 pixels.');
  return {type:'rectangle',width:c.width,depth:c.depth,offsetX:c.offsetX,offsetY:c.offsetY};
 }
 if(c.type!=='polygon'||!Array.isArray(c.points)||c.points.length<3||c.points.length>32)throw Error('A footprint needs 3–32 corners.');
 const p=c.points.map(v=>{if(!v||!coordinate(v.x)||!coordinate(v.y))throw Error('Each footprint corner must be within 16384 pixels of the object anchor.');return{x:v.x,y:v.y};});
 let area=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if(Math.hypot(a.x-b.x,a.y-b.y)<.1)throw Error('Footprint corners must be distinct.');area+=a.x*b.y-b.x*a.y;for(let j=i+1;j<p.length;j++){if(j===i+1||(i===0&&j===p.length-1))continue;if(intersects(a,b,p[j],p[(j+1)%p.length]))throw Error('Footprint edges cannot cross or touch.');}}
 if(Math.abs(area)<2)throw Error('The footprint must enclose an area.');return{type:'polygon',points:p};
}
const rasterIndexes=new WeakMap(),rasterBounds=new WeakMap();
function rasterContains(c,x,y){
 let bounds=rasterBounds.get(c);if(!bounds){if([c.width,c.depth,c.offsetX,c.offsetY].every(Number.isFinite))bounds=[c.offsetX-c.width/2,c.offsetY-c.depth/2,c.offsetX+c.width/2,c.offsetY+c.depth/2];else{bounds=[Infinity,Infinity,-Infinity,-Infinity];for(const r of c.rects){bounds[0]=Math.min(bounds[0],r[0]);bounds[1]=Math.min(bounds[1],r[1]);bounds[2]=Math.max(bounds[2],r[0]+r[2]);bounds[3]=Math.max(bounds[3],r[1]+r[3]);}}rasterBounds.set(c,bounds);}
 if(x<bounds[0]||y<bounds[1]||x>bounds[2]||y>bounds[3])return false;
 let index=rasterIndexes.get(c);if(!index){index=new Map();for(const r of c.rects){for(let gx=Math.floor(r[0]/32);gx<=Math.floor((r[0]+r[2])/32);gx++)for(let gy=Math.floor(r[1]/32);gy<=Math.floor((r[1]+r[3])/32);gy++){const key=gx+','+gy;if(!index.has(key))index.set(key,[]);index.get(key).push(r);}}rasterIndexes.set(c,index);}return (index.get(Math.floor(x/32)+','+Math.floor(y/32))||[]).some(r=>x>=r[0]&&x<=r[0]+r[2]&&y>=r[1]&&y<=r[1]+r[3]);}
export function footprintContains(object,x,y){
 const c=object.collision;x-=object.x;y-=object.y;const insideCut=(c?.cutouts||[]).some(r=>x>=r[0]&&x<=r[0]+r[2]&&y>=r[1]&&y<=r[1]+r[3]);if(insideCut)return false;if(c?.type==='raster')return rasterContains(c,x,y);const p=footprintPoints(object);let inside=false;
 for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[j],b=p[i];if(onSegment(a,b,{x,y}))return true;if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;}
 return inside;
}

// Additional zones share the existing collision JSON storage, preserving old objects.
export function validateFootprint(c){
 const base=validateShape(c);if(!base)return base;
 const masks={};for(const key of ['depth','stairs','action'])if(c.masks?.[key])masks[key]=validateShape(c.masks[key]);
 const result={...base};if(c.billboard)result.billboard=validateBillboard(c.billboard);if(c.cutouts){if(!Array.isArray(c.cutouts)||c.cutouts.length>32)throw Error('Use up to 32 cutouts.');result.cutouts=c.cutouts.map(r=>{if(!Array.isArray(r)||r.length!==4||!r.every(Number.isFinite)||r.some(v=>Math.abs(v)>32768)||r[2]<=0||r[3]<=0)throw Error('Invalid cutout.');return [...r];});}if(Object.keys(masks).length)result.masks=masks;
 if(masks.depth||c.depthMode==='silhouette'){if(!Number.isFinite(c.depthLine)||Math.abs(c.depthLine)>16384)throw Error('Set a depth line within 16384 pixels.');result.depthLine=c.depthLine;}
 if(c.depthMode==='silhouette')result.depthMode='silhouette';
 if(masks.action){const a=c.action;if(!a||!['message','enter','vending','events'].includes(a.type))throw Error('Choose an action.');if(a.type==='enter'&&!['hq','gallery','arcade','lounge'].includes(a.destination))throw Error('Choose an interior.');result.action={type:a.type,destination:a.destination||'hq',text:String(a.text||'').slice(0,500)};}
 return result;
}

