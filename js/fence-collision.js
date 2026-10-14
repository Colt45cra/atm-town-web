// Legacy Map Studio side panels were exported with only their bottom masked.
export function repairVerticalFence(object){
 const height=object.width*object.image_height/object.image_width;
 if(!object.solid||!/\bfence side\b/i.test(object.name||'')||!Number.isFinite(height)||height<=object.width*2)return object;
 return {...object,collision:{...object.collision,type:'rectangle',width:Math.max(14,object.width+14),depth:height+14,offsetX:0,offsetY:-height/2}};
}
