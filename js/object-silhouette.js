// Pixels above 90% opacity define the object silhouette. Lower-opacity shading stays separate.
export function opaqueBounds(data,width,height){
 let left=width,right=-1,top=height,bottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>=230){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 return right<left?null:{left,right:right+1,top,bottom:bottom+1};
}
export function defaultBuildingFootprint(data,imageWidth,imageHeight,worldWidth,padding=7,depthLine=null){
 const b=opaqueBounds(data,imageWidth,imageHeight);if(!b)return null;
 const scale=worldWidth/imageWidth;const start=depthLine===null?Math.max(b.top,b.bottom-Math.ceil(22/scale)):Math.max(b.top,Math.min(b.bottom-1,Math.floor(imageHeight+depthLine/scale)));let left=imageWidth,right=-1,top=imageHeight,bottom=-1;
 for(let y=start;y<b.bottom;y++)for(let x=b.left;x<b.right;x++)if(data[(y*imageWidth+x)*4+3]>=230){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
 if(right<left)return null;
 const x1=(left-imageWidth/2)*scale-padding,x2=(right-imageWidth/2)*scale+padding;
 const y1=(top-imageHeight)*scale-padding,y2=(bottom-imageHeight)*scale+padding;
 return {type:'rectangle',width:x2-x1,depth:y2-y1,offsetX:(x1+x2)/2,offsetY:(y1+y2)/2};
}
export function splitObjectPixels(data){const body=new Uint8ClampedArray(data),shade=new Uint8ClampedArray(data);for(let i=3;i<data.length;i+=4){if(data[i]>=230)shade[i]=0;else body[i]=0;}return {body,shade};}
// Preserve the lower silhouette as horizontal pixel runs, rather than its bounding box.
export function silhouetteFootprint(data,imageWidth,imageHeight,worldWidth,padding=7,depthLine=0){
 const scale=worldWidth/imageWidth,rects=[];let previous=new Map();
 for(let y=Math.max(0,Math.floor(imageHeight+depthLine/scale));y<imageHeight;y++){
  const next=new Map();for(let x=0;x<imageWidth;){if(data[(y*imageWidth+x)*4+3]<230){x++;continue;}const left=x;while(x<imageWidth&&data[(y*imageWidth+x)*4+3]>=230)x++;const key=left+':'+x;let rect=previous.get(key);if(rect)rect[3]+=scale;else{const top=Math.max((y-imageHeight)*scale,depthLine);rect=[(left-imageWidth/2)*scale-padding,top-padding,(x-left)*scale+2*padding,(y+1-imageHeight)*scale-top+2*padding];rects.push(rect);}next.set(key,rect);}previous=next;
 }
 if(!rects.length)return null;const minX=Math.min(...rects.map(r=>r[0])),minY=Math.min(...rects.map(r=>r[1])),maxX=Math.max(...rects.map(r=>r[0]+r[2])),maxY=Math.max(...rects.map(r=>r[1]+r[3]));
 return {type:'raster',rects,width:maxX-minX,depth:maxY-minY,offsetX:(minX+maxX)/2,offsetY:(minY+maxY)/2};
}
