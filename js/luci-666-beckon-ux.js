/*
 * Luci $666 conversation readability patch.
 * Keeps the proximity greeting a stable screen-space size and keeps Luci's
 * current answer visible while only the question list scrolls.
 */
(function stabilizeLuciConversationUx(global){
  'use strict';

  if(global.ATMLuci666BeckonUx)return;

  function desiredWidth(){
    const viewport=Math.max(0,global.innerWidth||document.documentElement.clientWidth||0);
    if(viewport&&viewport<420)return Math.max(210,Math.min(238,viewport-28));
    return 250;
  }

  function installDialogueLayout(){
    if(document.querySelector('style[data-luci-666-dialogue-layout]'))return;
    const style=document.createElement('style');
    style.dataset.luci666DialogueLayout='1';
    style.textContent=`
#luci666Card{
  height:min(640px,84dvh)!important;
  max-height:min(640px,84dvh)!important;
}
#luci666Card .luci666Body{
  min-height:0!important;
  overflow:hidden!important;
  display:grid!important;
  grid-template-rows:auto minmax(0,1fr)!important;
  align-content:stretch!important;
}
#luci666Card .luci666Answer{
  min-height:0!important;
  max-height:min(230px,32dvh)!important;
  overflow-y:auto!important;
  overscroll-behavior:contain;
  -webkit-overflow-scrolling:touch;
  scrollbar-gutter:stable;
}
#luci666Card .luci666Questions{
  min-height:0!important;
  overflow-x:hidden!important;
  overflow-y:auto!important;
  align-content:start!important;
  overscroll-behavior:contain;
  -webkit-overflow-scrolling:touch;
  scrollbar-gutter:stable;
  padding-right:2px;
}
@media(max-width:600px){
  #luci666Card{
    height:calc(var(--vv-height,100dvh) - 12px)!important;
    max-height:calc(var(--vv-height,100dvh) - 12px)!important;
  }
  #luci666Card .luci666Answer{
    max-height:min(210px,29dvh)!important;
  }
}
`;
    document.head.appendChild(style);
  }

  function installQuestionScrollPersistence(){
    const host=document.getElementById('luci666Questions');
    if(!host||host.dataset.scrollPersistence==='1')return !!host;
    host.dataset.scrollPersistence='1';
    let savedScrollTop=0;
    let restorePending=false;

    host.addEventListener('pointerdown',()=>{
      savedScrollTop=host.scrollTop;
      restorePending=true;
    },{passive:true,capture:true});

    host.addEventListener('keydown',(event)=>{
      if(event.key==='Enter'||event.key===' '){
        savedScrollTop=host.scrollTop;
        restorePending=true;
      }
    },{capture:true});

    const observer=new MutationObserver(()=>{
      if(!restorePending)return;
      global.requestAnimationFrame(()=>{
        host.scrollTop=savedScrollTop;
        restorePending=false;
      });
    });
    observer.observe(host,{childList:true});
    return true;
  }

  function apply(){
    installDialogueLayout();
    installQuestionScrollPersistence();

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
    node.style.transition='none';
    node.style.scale='1';
    node.style.transform='translate(-50%,-100%)';
    node.style.transformOrigin='50% 100%';
    node.style.textWrap='balance';
    node.style.contain='layout style paint';
    return true;
  }

  function install(){
    installDialogueLayout();
    if(apply()&&installQuestionScrollPersistence())return;
    const observer=new MutationObserver(()=>{
      const beckonReady=apply();
      const questionsReady=installQuestionScrollPersistence();
      if(beckonReady&&questionsReady)observer.disconnect();
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
