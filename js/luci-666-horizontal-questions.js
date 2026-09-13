/*
 * Luci $666 mobile dialogue carousel.
 * Keeps the world visible, moves the question chooser to a horizontal strip
 * near the bottom HUD, and gives touch/pen taps a reliable delegated path.
 */
(function installLuciHorizontalQuestions(global){
  'use strict';

  if(global.ATMLuci666HorizontalQuestions)return;

  function installStyles(){
    if(document.querySelector('style[data-luci-666-horizontal-questions]'))return;
    const style=document.createElement('style');
    style.dataset.luci666HorizontalQuestions='1';
    style.textContent=`
/* Bottom dialogue tray: game remains visible and the question list scrolls sideways. */
#luci666Panel{pointer-events:none!important}
#luci666Card{
  position:fixed!important;
  left:50%!important;
  right:auto!important;
  top:auto!important;
  bottom:max(92px,calc(env(safe-area-inset-bottom) + 78px))!important;
  transform:translateX(-50%)!important;
  width:min(760px,calc(100vw - 18px))!important;
  height:94px!important;
  max-height:94px!important;
  display:grid!important;
  grid-template-rows:31px minmax(0,1fr)!important;
  overflow:hidden!important;
  border-radius:14px!important;
  background:rgba(8,17,23,.91)!important;
  border:1px solid rgba(255,96,96,.44)!important;
  box-shadow:0 13px 38px rgba(0,0,0,.50)!important;
  backdrop-filter:blur(12px)!important;
  -webkit-backdrop-filter:blur(12px)!important;
  pointer-events:auto!important;
  z-index:9780!important;
}
#luci666Card .luci666Header{
  min-height:0!important;
  height:31px!important;
  padding:3px 6px 3px 8px!important;
  gap:5px!important;
  border-bottom:1px solid rgba(255,255,255,.08)!important;
  background:linear-gradient(90deg,rgba(60,13,22,.96),rgba(20,18,24,.94))!important;
}
#luci666Card .luci666Identity{gap:5px!important;min-width:0!important}
#luci666Card .luci666Avatar{width:23px!important;height:25px!important}
#luci666Card .luci666Eyebrow,#luci666Card .luci666Header small{display:none!important}
#luci666Card .luci666Header h2{margin:0!important;font-size:10px!important;line-height:1!important;white-space:nowrap!important}
#luci666Card .luci666Close{
  width:25px!important;height:25px!important;flex:0 0 25px!important;
  border-radius:7px!important;font-size:16px!important;line-height:1!important;
  touch-action:manipulation!important;
}
#luci666Card .luci666Body{
  min-height:0!important;
  height:63px!important;
  overflow:hidden!important;
  padding:6px!important;
  display:block!important;
}
#luci666Card .luci666Answer,#luci666Card .luci666Footer{display:none!important}
#luci666Card .luci666Questions{
  box-sizing:border-box!important;
  width:100%!important;
  height:51px!important;
  min-height:51px!important;
  display:flex!important;
  flex-flow:row nowrap!important;
  align-items:stretch!important;
  gap:7px!important;
  overflow-x:auto!important;
  overflow-y:hidden!important;
  padding:0 3px 2px!important;
  pointer-events:auto!important;
  touch-action:pan-x!important;
  overscroll-behavior-x:contain!important;
  overscroll-behavior-y:none!important;
  -webkit-overflow-scrolling:touch!important;
  scroll-snap-type:x proximity!important;
  scrollbar-width:none!important;
}
#luci666Card .luci666Questions::-webkit-scrollbar{display:none!important}
#luci666Card .luci666Question{
  box-sizing:border-box!important;
  flex:0 0 clamp(152px,36vw,210px)!important;
  width:auto!important;
  min-width:0!important;
  height:49px!important;
  min-height:49px!important;
  max-height:49px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:flex-start!important;
  padding:7px 10px!important;
  border-radius:10px!important;
  font-size:9px!important;
  line-height:1.18!important;
  white-space:normal!important;
  text-align:left!important;
  scroll-snap-align:start!important;
  pointer-events:auto!important;
  touch-action:manipulation!important;
  -webkit-user-select:none!important;
  user-select:none!important;
}
#luci666Card .luci666Question.reward{display:none!important;flex-basis:200px!important;color:#ffe08d!important}
#luci666Card .luci666Question.reward.luciGiftUnlocked{display:flex!important}

@media(max-width:600px){
  #luci666Card{
    bottom:max(154px,calc(env(safe-area-inset-bottom) + 138px))!important;
    width:calc(100vw - 12px)!important;
    height:88px!important;
    max-height:88px!important;
    border-radius:12px!important;
  }
  #luci666Card .luci666Header{height:29px!important;min-height:29px!important}
  #luci666Card .luci666Body{height:59px!important;padding:5px!important}
  #luci666Card .luci666Questions{height:49px!important;min-height:49px!important;gap:6px!important}
  #luci666Card .luci666Question{
    flex-basis:clamp(145px,44vw,190px)!important;
    height:47px!important;min-height:47px!important;max-height:47px!important;
    font-size:8.7px!important;padding:6px 9px!important;
  }
  #luci666WorldSpeech{z-index:9790!important}
}
`;
    document.head.appendChild(style);
  }

  function installReliableTouchSelection(){
    const host=document.getElementById('luci666Questions');
    if(!host||host.dataset.horizontalTouchFix==='1')return !!host;
    host.dataset.horizontalTouchFix='1';

    let pointer=null;
    let lastSyntheticAt=0;

    host.addEventListener('pointerdown',(event)=>{
      const button=event.target?.closest?.('.luci666Question');
      if(!button||button.disabled)return;
      pointer={id:event.pointerId,x:event.clientX,y:event.clientY,button};
      // Keep ATM Town's canvas/joystick handlers from interpreting a dialogue tap.
      event.stopPropagation();
    },{capture:true});

    host.addEventListener('pointermove',(event)=>{
      if(!pointer||pointer.id!==event.pointerId)return;
      // Do not preventDefault: horizontal swiping must remain native and smooth.
      event.stopPropagation();
    },{capture:true,passive:true});

    host.addEventListener('pointercancel',(event)=>{
      if(pointer&&pointer.id===event.pointerId)pointer=null;
      event.stopPropagation();
    },{capture:true});

    host.addEventListener('pointerup',(event)=>{
      if(!pointer||pointer.id!==event.pointerId)return;
      const current=pointer;pointer=null;
      event.stopPropagation();
      const moved=Math.hypot(event.clientX-current.x,event.clientY-current.y);
      if(moved>12)return;
      if(event.pointerType!=='touch'&&event.pointerType!=='pen')return;

      event.preventDefault();
      lastSyntheticAt=Date.now();
      current.button.dispatchEvent(new MouseEvent('click',{
        bubbles:false,
        cancelable:true,
        view:global
      }));
    },{capture:true});

    // Some Android WebViews still synthesize a trusted click after pointerup.
    // Suppress only that duplicate; our untrusted delegated click still reaches
    // the button's original Luci handler.
    host.addEventListener('click',(event)=>{
      if(event.isTrusted&&Date.now()-lastSyntheticAt<650){
        event.preventDefault();
        event.stopPropagation();
      }
    },{capture:true});

    return true;
  }

  function revealSelectedButton(){
    const host=document.getElementById('luci666Questions');
    if(!host)return;
    const selected=host.querySelector('.luci666Question.asked:last-of-type');
    if(selected){
      try{selected.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});}catch(_error){}
    }
  }

  function install(){
    installStyles();
    if(installReliableTouchSelection()){
      const host=document.getElementById('luci666Questions');
      const observer=new MutationObserver(()=>{
        installReliableTouchSelection();
        global.requestAnimationFrame(revealSelectedButton);
      });
      observer.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
      return;
    }

    const observer=new MutationObserver(()=>{
      installStyles();
      if(installReliableTouchSelection())observer.disconnect();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    global.setTimeout(()=>observer.disconnect(),20000);
  }

  global.ATMLuci666HorizontalQuestions=Object.freeze({install,apply:installStyles});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})(window);
