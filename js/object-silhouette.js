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
