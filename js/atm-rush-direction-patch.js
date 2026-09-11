(()=>{
'use strict';
let faceRow=2;
const keys=new Set();
function chooseDirection(x,y){
  if(Math.abs(x)<0.08&&Math.abs(y)<0.08)return;
  if(Math.abs(x)>Math.abs(y))faceRow=x<0?1:3;
  else faceRow=y<0?2:0;
}
function updateKeys(){
  const x=(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0);
  const y=(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0);
  chooseDirection(x,y);
}
addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());updateKeys();},{capture:true});
addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());updateKeys();},{capture:true});
const joy=document.getElementById('joy');
if(joy){
  let active=null;
  const move=e=>{
    if(active!==e.pointerId)return;
    const r=joy.getBoundingClientRect();
    const x=(e.clientX-(r.left+r.width/2))/(r.width*.31);
    const y=(e.clientY-(r.top+r.height/2))/(r.height*.31);
    chooseDirection(x,y);
  };
  joy.addEventListener('pointerdown',e=>{active=e.pointerId;move(e);},{capture:true});
  joy.addEventListener('pointermove',move,{capture:true});
  joy.addEventListener('pointerup',e=>{if(active===e.pointerId)active=null;},{capture:true});
  joy.addEventListener('pointercancel',()=>{active=null;},{capture:true});
}
const originalDrawImage=CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage=function(img,...args){
  try{
    if(img&&typeof img.src==='string'&&img.src.includes('/assets/characters/playable/atm.webp')&&args.length===8&&img.naturalHeight){
      const frameH=img.naturalHeight/4;
      args[1]=faceRow*frameH;
    }
  }catch(_){ }
  return originalDrawImage.call(this,img,...args);
};
})();
