export const VEHICLE_MODELS=Object.freeze({
 truck:{name:'ATM Armored Truck',speed:210,width:130,length:76,acceleration:160,brake:420,coast:260,turnSlow:3.4,turnFast:1.35,grip:14},
 buggy:{name:'ATM Buggy',speed:300,width:115,length:60,acceleration:420,brake:650,coast:340,turnSlow:6,turnFast:2.5,grip:10},
 hover:{name:'ATM Hover Car',speed:350,width:120,length:64,acceleration:330,brake:550,coast:300,turnSlow:4.7,turnFast:1.8,grip:7}
});
export const VEHICLE_FACING=Object.freeze(['east','southeast','south','southwest','west','northwest','north','northeast']);
const TAU=Math.PI*2;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const approach=(a,b,d)=>a+Math.max(-d,Math.min(d,b-a));
export function vehicleDirection(dx,dy,prior='south'){
 if(Math.hypot(dx,dy)<.001)return prior;
 const angle=Math.atan2(dy,dx),old=VEHICLE_FACING.indexOf(prior);
 // A small deadband keeps adjacent views from flickering around a sector edge.
 if(old>=0&&Math.abs(wrap(angle-old*Math.PI/4))<Math.PI/8+.06)return prior;
 return VEHICLE_FACING[Math.round((angle+TAU)/ (Math.PI/4))%8];
}
export function validateVehicle(value){if(!value||!VEHICLE_MODELS[value.model]||!VEHICLE_FACING.includes(value.facing))throw Error('Choose a supported vehicle and facing.');return{model:value.model,facing:value.facing};}
export function vehicleStep(p,input,dt,model,isBlocked,bounds){
 const m=VEHICLE_MODELS[model],duration=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
 const raw=Math.hypot(input.x,input.y),throttle=raw>.12?Math.min(1,raw):0;
 let heading=Number.isFinite(p.heading)?p.heading:Math.max(0,VEHICLE_FACING.indexOf(p.facing))*Math.PI/4;
 let speed=p.speed||0,vx=p.vx||0,vy=p.vy||0,x=p.x,y=p.y,facing=p.facing;
 const ticks=Math.max(1,Math.ceil(duration*120)),h=duration/ticks;
 for(let tick=0;tick<ticks;tick++){
  const previousHeading=heading,previousFacing=facing;let targetSpeed=0;
  if(throttle){
   const wanted=Math.atan2(input.y,input.x),opposite=Math.cos(wanted-heading)<-.65;
   // Pulling back brakes first. Once stopped, it reverses along the same heading.
   const reverse=opposite,braking=reverse&&speed>1||!reverse&&speed< -1;
   targetSpeed=reverse?-m.speed*.35*throttle:m.speed*throttle;
   if(!braking){const targetHeading=reverse?wanted+Math.PI:wanted,ratio=Math.min(1,Math.abs(speed)/m.speed),rate=m.turnSlow+(m.turnFast-m.turnSlow)*ratio;heading=wrap(heading+Math.max(-rate*h,Math.min(rate*h,wrap(targetHeading-heading))));}
   speed=approach(speed,braking?0:targetSpeed,(braking?m.brake:m.acceleration)*h);
  }else speed=approach(speed,0,m.coast*h);
  const cx=Math.cos(heading),cy=Math.sin(heading),grip=1-Math.exp(-m.grip*h);
  vx+=(cx*speed-vx)*grip;vy+=(cy*speed-vy)*grip;
  if(!throttle&&Math.abs(speed)<.5&&Math.hypot(vx,vy)<3){speed=0;vx=0;vy=0;}
  const nextFacing=vehicleDirection(cx,cy,facing),box=vehicleFootprint(model,nextFacing,p.scale||1);
  const clear=(nx,ny)=>nx-box.halfX>=bounds.minX&&nx+box.halfX<=bounds.maxX&&ny-box.halfY>=bounds.minY&&ny+box.halfY<=bounds.maxY&&[-box.halfX,0,box.halfX].every(ox=>[-box.halfY,0,box.halfY].every(oy=>!isBlocked(nx+ox,ny+oy)));
  // A turn cannot expand the body into an obstacle. Keep the previous safe view.
  if(!clear(x,y)){facing=previousFacing;heading=previousHeading;speed=0;vx=0;vy=0;continue;}
  facing=nextFacing;
  let collided=false;const steps=Math.max(1,Math.ceil(Math.hypot(vx,vy)*h/3));
  for(let i=0;i<steps;i++){
   const dx=vx*h/steps,dy=vy*h/steps;
   if(clear(x+dx,y))x+=dx;else {vx=0;collided=true;}
   if(clear(x,y+dy))y+=dy;else {vy=0;collided=true;}
  }
  // Remove blocked momentum so sustained input against a wall does not jitter.
  if(collided)speed=vx*cx+vy*cy;
 }
 return{x,y,heading,speed,vx,vy,facing,moving:Math.hypot(x-p.x,y-p.y)>.01};
}
export function vehicleExit(p,model,isBlocked,bounds){const m=VEHICLE_MODELS[model];for(const [dx,dy]of [[m.width*.65,0],[-m.width*.65,0],[0,m.width*.65],[0,-m.width*.65]]){const x=p.x+dx*(p.scale||1),y=p.y+dy*(p.scale||1);if(x>=bounds.minX+16&&x<=bounds.maxX-16&&y>=bounds.minY+16&&y<=bounds.maxY-16&&[-12,0,12].every(ox=>[-12,0,12].every(oy=>!isBlocked(x+ox,y+oy))))return{x,y};}return null;}
export function vehicleSpriteWidth(facing){return ['north','south'].includes(facing)?100:['east','west'].includes(facing)?160:145;}
export function vehiclePlacementScale(object){return object.width/vehicleSpriteWidth(object.collision?.vehicle?.facing);}
export function vehicleFootprint(model,facing,scale=1){const m=VEHICLE_MODELS[model],vertical=['north','south'].includes(facing),diagonal=!vertical&&!['east','west'].includes(facing);if(diagonal){const extent=(m.width+m.length)*Math.SQRT1_2;return{halfX:extent*.35*scale,halfY:extent*.28*scale};}return{halfX:(vertical?m.length:m.width)*.35*scale,halfY:(vertical?m.width:m.length)*.28*scale};}
