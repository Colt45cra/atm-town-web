// Keep uploaded artwork intact; cache display-sized bitmaps for heavily reduced sprites.
// Four source pixels per world pixel cover the normal zoom/DPR range with smooth detail.
export function createRenderSpriteCache(makeCanvas=()=>document.createElement('canvas')){
 const cache=new WeakMap();
 return function renderSprite(object,source,density=4){
  const width=source?.naturalWidth||source?.width,height=source?.naturalHeight||source?.height;
  if(!width||!height)return source;
  const ratio=Math.min(1,Math.max(1,object.width*density)/width);
  if(ratio>=1)return source;
  const w=Math.max(1,Math.ceil(width*ratio)),h=Math.max(1,Math.ceil(height*ratio)),key=w+'x'+h;
  let variants=cache.get(source);if(!variants){variants=new Map();cache.set(source,variants);}if(variants.has(key))return variants.get(key);
  const canvas=makeCanvas();canvas.width=w;canvas.height=h;const g=canvas.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(source,0,0,w,h);
  Object.assign(canvas,{complete:true,naturalWidth:w,naturalHeight:h});variants.set(key,canvas);return canvas;
 };
}
