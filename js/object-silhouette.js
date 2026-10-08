// Fully opaque pixels define the building. Translucent shadows stay on the ground.
export function opaqueBounds(data,width,height){
 let left=width,right=-1,top=height,bottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]===255){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 return right<left?null:{left,right:right+1,top,bottom:bottom+1};
}
export function defaultBuildingFootprint(data,imageWidth,imageHeight,worldWidth,padding=7){
 const b=opaqueBounds(data,imageWidth,imageHeight);if(!b)return null;
 const scale=worldWidth/imageWidth,band=Math.max(1,Math.ceil(22/scale));let left=imageWidth,right=-1;
 for(let y=Math.max(b.top,b.bottom-band);y<b.bottom;y++)for(let x=b.left;x<b.right;x++)if(data[(y*imageWidth+x)*4+3]===255){left=Math.min(left,x);right=Math.max(right,x+1);}
 const x1=(left-imageWidth/2)*scale-padding,x2=(right-imageWidth/2)*scale+padding;
 const y1=(Math.max(b.top,b.bottom-band)-imageHeight)*scale,y2=(b.bottom-imageHeight)*scale+padding;
 return {type:'rectangle',width:x2-x1,depth:y2-y1,offsetX:(x1+x2)/2,offsetY:(y1+y2)/2};
}
export function splitObjectPixels(data){const body=new Uint8ClampedArray(data),shade=new Uint8ClampedArray(data);for(let i=3;i<data.length;i+=4){if(data[i]===255)shade[i]=0;else body[i]=0;}return {body,shade};}
