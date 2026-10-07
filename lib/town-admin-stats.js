import { adminClient, requireUser } from './auth.js';
import { payloadIntegrationRequest } from './payload-integration.js';
const check=({data,error})=>{if(error)throw error;return data;};
export function decimalUnits(value){
 const text=String(value);if(!/^\d+(?:\.\d{1,12})?$/.test(text))throw new Error('Invalid confirmed reward amount.');
 const [whole,fraction='']=text.split('.');return BigInt(whole)*10n**12n+BigInt(fraction.padEnd(12,'0'));
}
export function decimalText(units){const whole=units/10n**12n,fraction=(units%10n**12n).toString().padStart(12,'0').replace(/0+$/,'');return String(whole)+(fraction?'.'+fraction:'');}
export function rankRewards(rows){
 const tokens=new Map();
 for(const row of rows){
  const key=JSON.stringify([row.currency,row.issuer||'']);
  if(!tokens.has(key))tokens.set(key,{currency:row.currency,issuer:row.issuer||'',wallets:new Map()});
  const wallets=tokens.get(key).wallets,old=wallets.get(row.wallet_address)||{wallet_address:row.wallet_address,units:0n,payouts:0};
  old.units+=decimalUnits(row.amount);old.payouts+=Number(row.payouts);wallets.set(row.wallet_address,old);
 }
 return [...tokens.values()].map(token=>({currency:token.currency,issuer:token.issuer,earners:[...token.wallets.values()].sort((a,b)=>a.units===b.units?a.wallet_address.localeCompare(b.wallet_address):a.units>b.units?-1:1).slice(0,20).map(({units,...row},i)=>({...row,rank:i+1,amount:decimalText(units)}))}));
}
export async function recordTownVisit(req){
 let admin,visitor,guest;
 if(req.headers.authorization){const identity=await requireUser(req);admin=identity.admin;visitor='user:'+identity.user.id;guest=false;}
 else{admin=adminClient();const id=String(req.body?.guest_id||'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw Object.assign(new Error('Invalid visitor ID.'),{status:400});visitor='guest:'+id;guest=true;}
 check(await admin.rpc('town_record_visit',{p_visitor:visitor,p_guest:guest}));return {recorded:true};
}
export async function townAdminStats(admin,period='all'){
 if(!['all','today'].includes(period))throw Object.assign(new Error('Invalid period.'),{status:400});
 let local=check(await admin.rpc('town_admin_stats',{p_since:null}));
 const since=period==='today'?local.day_start:null;
 if(since)local=check(await admin.rpc('town_admin_stats',{p_since:since}));
 let npc=[],warning=null;
 try{npc=(await payloadIntegrationRequest('/api/integrations/v1/town-reward-stats',{since})).rewards||[];}catch(error){warning='NPC payouts unavailable: '+error.message;}
 const tokens=rankRewards([...local.rewards,...npc]);
 const wallets=[...new Set(tokens.flatMap(t=>t.earners.map(e=>e.wallet_address)))];
 const names=new Map();
 for(let i=0;i<wallets.length;i+=100){const accounts=check(await admin.from('player_accounts').select('wallet_address,display_name').in('wallet_address',wallets.slice(i,i+100)).order('updated_at',{ascending:false}));for(const a of accounts){if(!names.has(a.wallet_address))names.set(a.wallet_address,new Set());if(a.display_name)names.get(a.wallet_address).add(a.display_name);}}
 for(const token of tokens)for(const row of token.earners)row.names=[...(names.get(row.wallet_address)||[])];
 return {day:local.day,visitors:local.visitors,tracking_started_at:local.tracking_started_at,period,tokens,warning};
}
