/*
 * Luci $666 beckon readability patch.
 * Keeps the proximity greeting a stable screen-space size while the camera/player moves.
 */
(function stabilizeLuciBeckon(global){
  'use strict';

  if(global.ATMLuci666BeckonUx)return;

  function desiredWidth(){
    const viewport=Math.max(0,global.innerWidth||document.documentElement.clientWidth||0);
    if(viewport&&viewport<420)return Math.max(210,Math.min(238,viewport-28));
    return 250;
  }

  function apply(){
    const node=document.getElementById('luci666Beckon');
    if(!node)return false;

    const width=desiredWidth();
    node.style.boxSizing='border-box';
    node.style.width=`${width}px`;
    node.style.minWidth=`${width}px`;
    node.style.maxWidth=`${width}px`;
    node.style.minHeight='56px';
    node.style.padding='9px 12px';
    node.style.fontFamily='system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    node.style.fontSize='13px';
    node.style.fontWeight='900';
    node.style.lineHeight='1.32';
    node.style.display=node.style.display;
    node.style.transition='none';
    node.style.scale='1';
    node.style.transform='translate(-50%,-100%)';
    node.style.transformOrigin='50% 100%';
    node.style.textWrap='balance';
    node.style.contain='layout style paint';
    return true;
  }

  function install(){
    if(apply())return;
    const observer=new MutationObserver(()=>{
      if(apply())observer.disconnect();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    global.setTimeout(()=>observer.disconnect(),15000);
  }

  let resizeTimer=0;
  global.addEventListener('resize',()=>{
    global.clearTimeout(resizeTimer);
    resizeTimer=global.setTimeout(apply,120);
  },{passive:true});

  global.ATMLuci666BeckonUx=Object.freeze({apply});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})(window);
