export const VEHICLE_MODELS=Object.freeze({truck:{name:'ATM Armored Truck',speed:210,width:130,length:76},buggy:{name:'ATM Buggy',speed:300,width:115,length:60},hover:{name:'ATM Hover Car',speed:350,width:120,length:64}});
export const VEHICLE_FACING=Object.freeze(['north','south','east','west']);
export function validateVehicle(value){if(!value||!VEHICLE_MODELS[value.model]||!VEHICLE_FACING.includes(value.facing))throw Error('Choose a supported vehicle and facing.');return{model:value.model,facing:value.facing};}
export function vehicleDirection(dx,dy,prior='south'){return Math.hypot(dx,dy)<.001?prior:Math.abs(dx)>Math.abs(dy)?dx>0?'east':'west':dy>0?'south':'north';}
export function vehicleStep(p,input,dt,model,isBlocked,bounds){
 const m=VEHICLE_MODELS[model],mag=Math.hypot(input.x,input.y),direction=vehicleDirection(input.x,input.y,p.facing),{halfX,halfY}=vehicleFootprint(model,direction,p.scale||1);
 const clear=(x,y)=>x-halfX>=bounds.minX&&x+halfX<=bounds.maxX&&y-halfY>=bounds.minY&&y+halfY<=bounds.maxY&&[-halfX,0,halfX].every(ox=>[-halfY,0,halfY].every(oy=>!isBlocked(x+ox,y+oy)));
 let x=p.x,y=p.y;const duration=Math.max(0,Math.min(.1,dt)),distance=mag?m.speed*duration:0,steps=Math.max(1,Math.ceil(distance/3));
 for(let i=0;i<steps;i++){const dx=mag?input.x/mag*distance/steps:0,dy=mag?input.y/mag*distance/steps:0;if(clear(x+dx,y))x+=dx;if(clear(x,y+dy))y+=dy;}
 return{x,y,facing:direction,moving:Math.hypot(x-p.x,y-p.y)>.01};
}
export function vehicleExit(p,model,isBlocked,bounds){const m=VEHICLE_MODELS[model];for(const [dx,dy]of [[m.width*.65,0],[-m.width*.65,0],[0,m.width*.65],[0,-m.width*.65]]){const x=p.x+dx*(p.scale||1),y=p.y+dy*(p.scale||1);if(x>=bounds.minX+16&&x<=bounds.maxX-16&&y>=bounds.minY+16&&y<=bounds.maxY-16&&[-12,0,12].every(ox=>[-12,0,12].every(oy=>!isBlocked(x+ox,y+oy))))return{x,y};}return null;}

export function vehiclePlacementScale(object){const facing=object.collision?.vehicle?.facing;return object.width/(['north','south'].includes(facing)?100:160);}
export function vehicleFootprint(model,facing,scale=1){const m=VEHICLE_MODELS[model],vertical=['north','south'].includes(facing);return{halfX:(vertical?m.length:m.width)*.35*scale,halfY:(vertical?m.width:m.length)*.28*scale};}
