import { payloadIntegrationRequest } from './payload-integration.js';
export const NPC_REWARDS=Object.freeze([
 {id:'classic',name:'ATM',slug:'atm-town-npc-atm'},
 {id:'fuzzy',name:'Fuzzy',slug:'atm-town-npc-fuzzy'},
 {id:'miracle',name:'Miracle',slug:'atm-town-npc-miracle'},
 {id:'luci',name:'Luci',slug:'luci-666-welcome'},
 {id:'triskeleton',name:'Triskeleton',slug:'atm-town-npc-triskeleton'}
]);
export const SHARED_ARCADE_SLUG='atm-town-rewards';
export function npcProgram(id){
 const npc=NPC_REWARDS.find(npc=>npc.id===id);
 if(!npc)throw Object.assign(new Error('Unknown reward NPC.'),{status:400});
 return npc;
}
export function npcPath(npc,suffix){return `/api/integrations/v1/reward-programs/${npc.slug}/${suffix}`;}
export async function npcSettings(){
 return Promise.all(NPC_REWARDS.map(async npc=>{
  try{return {...npc,...await payloadIntegrationRequest(npcPath(npc,'settings'),null,{method:'GET'})};}
  catch(error){return {...npc,error:error.message};}
 }));
}
export function npcReceipt(result,wallet){
 const success=result.status==='success'&&/^[A-F0-9]{64}$/i.test(String(result.txHash||''));
 if(result.wallet!==wallet||result.network!=='mainnet')throw new Error('NPC reward response does not match the verified wallet.');
 return {ok:!!success,status:result.status,pending:result.status==='pending',wallet,wallet_source:'xaman_linked',wallet_label:'Xaman linked wallet',
  amount:result.amount,currency:result.currency,issuer:result.issuer,interval:result.interval,period:result.period,
  already_claimed:result.alreadyClaimed===true&&result.newClaim!==true,tx_hash:result.txHash||null,
  message:success?(result.newClaim===true?`${result.amount} ${result.currency} sent and confirmed on XRPL.`:'This reward has already been claimed for the current period.'):
   result.error||'Your reward is pending XRPL confirmation.'};
}
