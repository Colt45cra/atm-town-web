import { payloadIntegrationRequest } from './payload-integration.js';
import { ATM_ISSUER } from './xaman-vending.js';

const check=({data,error})=>{if(error)throw error;return data;};
export function rewardUnits(value){
 const text=String(value);
 if(!/^\d{1,18}(?:\.\d{1,6})?$/.test(text))throw new Error('Invalid reward amount.');
 const [whole,fraction='']=text.split('.');return BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'));
}
export function rewardProgramPath(slug){
 if(!/^[a-z0-9][a-z0-9-]{1,79}$/.test(String(slug||'')))throw Object.assign(new Error('Enter a valid Payload reward vault slug.'),{status:400});
 return `/api/integrations/v1/arcade-programs/${slug}`;
}
export async function validateRewardProgram(slug,rule,request=payloadIntegrationRequest){
 const result=await request(rewardProgramPath(slug),null,{method:'GET'});
 if(result.network!=='mainnet'||result.currency!=='ATM'||result.issuer!==ATM_ISSUER||result.status!=='active')throw Object.assign(new Error('Connect and fund an active mainnet ATM arcade vault in Payload first.'),{status:409});
 const maximum=rewardUnits(rule.atm_per_coin)*BigInt(rule.max_coins);
 const actualMaximum=maximum<rewardUnits(rule.daily_atm_limit)?maximum:rewardUnits(rule.daily_atm_limit);
 if(actualMaximum>rewardUnits(result.maxAmountPerSession))throw Object.assign(new Error('The game reward exceeds the session cap in Payload. Lower the rate or coin limit, or increase the vault cap.'),{status:409});
 return result;
}
// All payment inputs come from the immutable, server-calculated session row.
// Repeating the same session ID reconciles the same Payload claim and tx blob.
export async function payArcadeReward(admin,id,{request=payloadIntegrationRequest}={}){
 const row=check(await admin.from('arcade_reward_sessions').select('*').eq('id',id).single());
 if(!['queued','pending'].includes(row.status))return row;
 check(await admin.from('arcade_reward_sessions').update({payout_attempted_at:new Date().toISOString()}).eq('id',id).in('status',['queued','pending']));
 try{
 const result=await request(rewardProgramPath(row.payload_program_slug),{sessionId:row.id,walletAddress:row.wallet_address,amount:String(row.amount)},{timeoutMs:20000});
 if(result.network!=='mainnet'||result.currency!=='ATM'||result.issuer!==ATM_ISSUER||result.wallet!==row.wallet_address||rewardUnits(result.amount)!==rewardUnits(row.amount))throw new Error('Payload reward response does not match the session.');
 if(!['success','pending','failed'].includes(result.status))throw new Error('Unknown Payload payment status.');
 if(result.txHash&&!/^[A-F0-9]{64}$/i.test(result.txHash))throw new Error('Invalid Payload transaction hash.');
 if(result.status==='success'&&!/^[A-F0-9]{64}$/i.test(result.txHash||''))throw new Error('Payload confirmation is missing its ledger transaction hash.');
 const patch={status:result.status==='success'?'paid':result.status==='pending'?'pending':'queued',failure_reason:result.error||null,...(result.txHash?{tx_hash:result.txHash}: {})};
 const updated=check(await admin.from('arcade_reward_sessions').update(patch).eq('id',id).in('status',['queued','pending']).select('*').maybeSingle());
 return updated||check(await admin.from('arcade_reward_sessions').select('*').eq('id',id).single());
 }catch(error){
 // A timeout may hide a successful payment. Keep the same claim ID and amount.
 check(await admin.from('arcade_reward_sessions').update({failure_reason:String(error.message||'Payment pending.').slice(0,500)}).eq('id',id).in('status',['queued','pending']));
 return check(await admin.from('arcade_reward_sessions').select('*').eq('id',id).single());
 }
}
export async function retryArcadeRewards(admin,limit=3){
 const abandoned=check(await admin.from('arcade_reward_sessions').select('id,user_id').eq('status','active').lt('started_at',new Date(Date.now()-3600000).toISOString()).limit(limit));
 for(const row of abandoned)check(await admin.rpc('town_arcade_exit',{p_user:row.user_id,p_session:row.id}));
 const queue=check(await admin.from('arcade_reward_sessions').select('id').in('status',['queued','pending']).order('payout_attempted_at',{nullsFirst:true}).limit(limit));
 const results=[];for(const row of queue)results.push(await payArcadeReward(admin,row.id));return results;
}
