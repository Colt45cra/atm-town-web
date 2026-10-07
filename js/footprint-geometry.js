// Footprints use world pixels relative to the object's bottom-center anchor.
export function footprintPoints(object){
 const c=object.collision;if(c?.type==='polygon')return c.points;
 const w=c?.type==='rectangle'?c.width:object.width*.8,d=c?.type==='rectangle'?c.depth:22,x=c?.offsetX||0,y=c?.type==='rectangle'?c.offsetY:-7;
 return [{x:x-w/2,y:y-d/2},{x:x+w/2,y:y-d/2},{x:x+w/2,y:y+d/2},{x:x-w/2,y:y+d/2}];
}
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function onSegment(a,b,p){return Math.abs(cross(a,b,p))<1e-7&&p.x>=Math.min(a.x,b.x)-1e-7&&p.x<=Math.max(a.x,b.x)+1e-7&&p.y>=Math.min(a.y,b.y)-1e-7&&p.y<=Math.max(a.y,b.y)+1e-7;}
function intersects(a,b,c,d){const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);return (abC*abD<0&&cdA*cdB<0)||onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b);}
export function validateFootprint(c){
 if(c===null||c===undefined)return null;
 const coordinate=v=>Number.isFinite(v)&&Math.abs(v)<=2048;
 if(c.type==='rectangle'){
  if(![c.width,c.depth].every(v=>Number.isFinite(v)&&v>=1&&v<=2048)||![c.offsetX,c.offsetY].every(coordinate))throw Error('Blocked width and length must be 1–2048 pixels; offsets must be within 2048 pixels.');
  return {type:'rectangle',width:c.width,depth:c.depth,offsetX:c.offsetX,offsetY:c.offsetY};
 }
 if(c.type!=='polygon'||!Array.isArray(c.points)||c.points.length<3||c.points.length>32)throw Error('A footprint needs 3–32 corners.');
 const p=c.points.map(v=>{if(!v||!coordinate(v.x)||!coordinate(v.y))throw Error('Each footprint corner must be within 2048 pixels of the object anchor.');return{x:v.x,y:v.y};});
 let area=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if(Math.hypot(a.x-b.x,a.y-b.y)<.1)throw Error('Footprint corners must be distinct.');area+=a.x*b.y-b.x*a.y;for(let j=i+1;j<p.length;j++){if(j===i+1||(i===0&&j===p.length-1))continue;if(intersects(a,b,p[j],p[(j+1)%p.length]))throw Error('Footprint edges cannot cross or touch.');}}
 if(Math.abs(area)<2)throw Error('The footprint must enclose an area.');return{type:'polygon',points:p};
}
export function footprintContains(object,x,y){
 const p=footprintPoints(object);x-=object.x;y-=object.y;let inside=false;
 for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[j],b=p[i];if(onSegment(a,b,{x,y}))return true;if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;}
 return inside;
}
