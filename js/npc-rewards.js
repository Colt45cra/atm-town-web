/* NPC reward buttons use server-owned Payload amounts and wallet/period locks. */
(function(global){
 'use strict';
 const profiles=[
  {id:'classic',panel:'atmGuidePanel',speech:'atmGuideWorldSpeech'},
  {id:'fuzzy',panel:'fuzzyXrpPanel',speech:'fuzzyXrpWorldSpeech'},
  {id:'miracle',panel:'miracle111Panel',speech:'miracle111WorldSpeech'},
  {id:'triskeleton',panel:'triskXrpPanel',speech:'triskXrpWorldSpeech'}
 ];
 const style=document.createElement('style');style.textContent='.townNpcReward{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px}.townNpcReward button,.townNpcReward a{min-height:32px;padding:6px 9px;border:1px solid rgba(255,209,102,.6);border-radius:9px;background:#332910;color:#ffe6a1;font:900 9px system-ui;touch-action:manipulation}.townNpcReward button:disabled{opacity:.65}.townNpcReward small{font:750 9px/1.35 system-ui;color:#ffe6a1}';document.head.append(style);
 async function api(action,id){
  if(typeof global.atmApiWithAuth!=='function')throw new Error('Sign into ATM Town and link your Xaman wallet to claim NPC rewards.');
  return global.atmApiWithAuth('/api/leaderboards'+(action==='rewards-npc-status'?`?action=${action}&npc_id=${id}`:''),
   action==='rewards-npc-status'?{method:'GET'}:{method:'POST',body:JSON.stringify({action,npc_id:id})});
 }
 for(const profile of profiles){profile.checkedAt=0;profile.loading=false;profile.open=false;}
 async function refresh(profile){
  if(profile.loading)return;profile.loading=true;profile.checkedAt=Date.now();
  try{
   const result=await api('rewards-npc-status',profile.id);profile.result=result;
   profile.host.hidden=result.enabled===false;
   const paid=result.already_claimed===true&&result.claim_status==='success';
   profile.button.disabled=result.enabled===false||paid;
   profile.button.textContent=paid?'Reward already claimed':result.already_claimed?'Check pending payment':`Claim ${result.amount} ${result.currency}`;
   profile.message.textContent=paid?(result.interval==='once'?'You already received this reward.':`Next reward period starts ${new Date(result.period?.endsAt).toLocaleString()}.`):result.already_claimed?'Your reward is processing. Check again to confirm payment.':'';
  }catch(error){profile.host.hidden=false;profile.button.disabled=false;profile.button.textContent='Check NPC reward';profile.message.textContent=error.message;}
  finally{profile.loading=false;}
 }
 function mount(profile){
  const speech=document.getElementById(profile.speech);if(!speech)return false;
  if(profile.host?.isConnected)return true;
  const host=document.createElement('div');host.className='townNpcReward';
  const button=document.createElement('button');button.type='button';button.textContent='Check NPC reward';
  const message=document.createElement('small');message.setAttribute('role','status');host.append(button,message);speech.append(host);
  profile.host=host;profile.button=button;profile.message=message;
  button.addEventListener('click',async event=>{
   event.stopPropagation();if(profile.loading)return;button.disabled=true;message.textContent='Checking your reward…';
   try{
    if(!profile.result){await refresh(profile);return;}
    const trust=await global.atmApiWithAuth('/api/xaman-vending-start?commerce=npc-atm-trustline',{method:'GET'});
    if(!trust.has_trustline){
     const request=await global.atmApiWithAuth('/api/xaman-vending-start?commerce=npc-atm-trustline',{method:'POST',body:'{}'});
     if(request.deeplink){const link=document.createElement('a');link.textContent='Approve ATM trustline in Xaman';link.href=request.deeplink;link.target='_blank';link.rel='noopener';host.append(link);message.textContent='Approve the trustline, then click Claim again.';button.disabled=false;return;}
    }
    const result=await api('rewards-npc-claim',profile.id);message.textContent=result.message;
    if(result.ok){button.textContent='Reward received';button.disabled=true;profile.result.already_claimed=true;
     if(result.tx_hash){const link=document.createElement('a');link.textContent='View payment';link.href=`https://livenet.xrpl.org/transactions/${result.tx_hash}`;link.target='_blank';link.rel='noopener';host.append(link);}}
    else button.disabled=false;
   }catch(error){message.textContent=error.message;button.disabled=false;}
  });return true;
 }
 global.setInterval(()=>{
  for(const profile of profiles){
   const open=document.getElementById(profile.panel)?.classList.contains('open')===true;
   if(open&&mount(profile)&&(!profile.open||Date.now()-profile.checkedAt>30000))refresh(profile);
   profile.open=open;
  }
 },500);
})(window);
