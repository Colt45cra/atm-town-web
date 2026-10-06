import { fundingStep } from './funding-step.js?v=funding-steps-1';

export async function startFundingFlow({slug,amount,symbol,button,host,api,node,status,loadWallets}) {
 let timer=null,busy=false,stopped=false,cycle=null;
 host._stopFunding?.();
 const stop=()=>{stopped=true;if(timer)clearTimeout(timer);};host._stopFunding=stop;
 const later=()=>{if(!stopped&&host.isConnected)timer=setTimeout(check,10000);};
 const deadline=Date.now()+5*60*1000;
 function showStep(result,request=false){
  cycle=result.cycle;const step=fundingStep(cycle,symbol);host.replaceChildren();button.textContent=step.label;
  host.append(node('p',step.message));
  if(step.ready){stop();status('Top-up confirmed.');loadWallets();return;}
  if(!cycle){stop();status('Funding status refreshed. Refresh balances to review it.');return;}
  if(request){
   const payload=result.xamanRequest;if(!payload?.deeplink)throw new Error('Xaman funding request is missing. Try again.');
   if(payload.stage!==step.stage)throw new Error('Funding step changed. Review it and try again.');
   const url=new URL(payload.deeplink);if(url.protocol!=='https:'||!['xumm.app','xaman.app'].includes(url.hostname))throw new Error('Unexpected Xaman link');
   const link=node('a',`Open Xaman: send ${step.amount} ${step.asset}`);link.href=url.href;link.target='_blank';link.rel='noopener';host.append(link,node('p','After signing, return here. Confirmation is checked automatically; you can also check below.'));
  }else{
   const next=node('button',step.label);next.type='button';next.addEventListener('click',()=>startFundingFlow({slug,amount,symbol,button,host,api,node,status,loadWallets}));host.append(next);
  }
  const refresh=node('button','Check funding status');refresh.type='button';refresh.addEventListener('click',check);host.append(refresh);
 }
 async function check(){
  if(stopped||busy||!host.isConnected)return;if(timer){clearTimeout(timer);timer=null;}busy=true;
  try{const result=await api('admin-wallet-topup-status',{slug});if(stopped)return;
   if(result.cycle?.id!==cycle?.id||result.cycle?.fundingStage!==cycle?.fundingStage||result.cycle?.status!==cycle?.status||result.cycle?.payoutReceived!==cycle?.payoutReceived||result.cycle?.xrpReceived!==cycle?.xrpReceived){showStep(result);}
   if(!stopped&&Date.now()<deadline)later();
  }catch(error){status(`Funding confirmation: ${error.message}`);if(Date.now()<deadline)later();}finally{busy=false;}
 }
 button.disabled=true;
 try{const result=await api('admin-wallet-topup',{slug,amount});if(stopped)return;showStep(result,true);if(!stopped)later();}
 catch(error){stop();host.replaceChildren(node('p',error.message));status(error.message);}
 finally{button.disabled=false;}
}

export async function cancelFundingDraft({slug,cycleId,button,host,api,onCancelled,status}) {
 host._stopFunding?.();button.disabled=true;
 try{const result=await api('admin-wallet-topup-cancel',{slug,cycle_id:cycleId});if(result.cancelled!==true)throw new Error('Top-up cancellation was not confirmed.');host.replaceChildren();await onCancelled();status(result.message||'Top-up cancelled. Enter a new amount.');return true;}
 catch(error){status(error.message);return false;}finally{button.disabled=false;}
}
