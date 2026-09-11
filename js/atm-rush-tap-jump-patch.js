(()=>{
'use strict';
const jump=document.getElementById('jump');
const joy=document.getElementById('joy');
const overlay=document.getElementById('overlay');
if(!jump||!joy)return;
function gameActive(){return !overlay||getComputedStyle(overlay).display==='none';}
function trigger(type,source){
  try{jump.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:source?.pointerId||1,pointerType:source?.pointerType||'touch'}));}
  catch(_){jump.dispatchEvent(new Event(type,{bubbles:true,cancelable:true}));}
}
document.addEventListener('pointerdown',e=>{
  if(!gameActive())return;
  if(joy.contains(e.target))return;
  if(e.target===jump)return;
  trigger('pointerdown',e);
},{passive:true});
document.addEventListener('pointerup',e=>{
  if(!gameActive())return;
  if(joy.contains(e.target))return;
  trigger('pointerup',e);
},{passive:true});
document.addEventListener('pointercancel',e=>{
  if(joy.contains(e.target))return;
  trigger('pointercancel',e);
},{passive:true});
})();