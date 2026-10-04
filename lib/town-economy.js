import { requireUser, sendError } from './auth.js';
import { ATTRIBUTE_STORE_ITEM_IDS, normalizeDecimal } from './attribute-store.js';
import { XAMAN_API_BASE, ATM_ISSUER, xamanHeaders, fetchXamanPayload } from './xaman-vending.js';
import { createHash } from 'node:crypto';
const ADDRESS=/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
export const REWARD_GAMES=['sky-run','platform-panic','flappy-jetpack','neon-racer'];
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const check=({data,error})=>{if(error)throw error;return data;};
export function economyDecimal(value,{nullable=false}={}){
 if(nullable&&(value===null||value===''))return null;
 const normalized=normalizeDecimal(value);
 if(!normalized||!/^\d{1,18}(?:\.\d{1,6})?$/.test(normalized))throw fail('Amounts must be nonnegative with at most 6 decimal places.');
 return normalized;
}
export async function requireTownAdmin(admin,user){
 const row=check(await admin.from('town_admins').select('user_id').eq('user_id',user.id).maybeSingle());
 if(!row)throw fail('ATM Town administrator access required.',403);
}
async function verifiedWallet(admin,user){
 const row=check(await admin.from('player_accounts').select('wallet_address,wallet_verified_at').eq('user_id',user.id).maybeSingle());
 if(!row?.wallet_verified_at||!ADDRESS.test(String(row.wallet_address||'')))throw fail('Link and verify your Xaman wallet to earn arcade rewards.',409);
 return row.wallet_address;
}
async function audit(admin,user,action,details){check(await admin.from('town_admin_audit').insert({actor:user.id,action,details}));}
async function startReward(admin,user,body){
 if(!REWARD_GAMES.includes(body.game_id))throw fail('Unknown reward game.');
 const rule=check(await admin.from('arcade_reward_rules').select('*').eq('game_id',body.game_id).single());
 if(!rule.enabled||Number(rule.atm_per_coin)<=0||Number(rule.daily_atm_limit)<=0)return {enabled:false};
 const wallet=await verifiedWallet(admin,user);
 // Close an interrupted session before opening another; both remain reviewable.
 const old=check(await admin.from('arcade_reward_sessions').select('id').eq('user_id',user.id).eq('status','active').maybeSingle());
 if(old)check(await admin.rpc('town_arcade_exit',{p_user:user.id,p_session:old.id}));
 const row=check(await admin.from('arcade_reward_sessions').insert({user_id:user.id,game_id:body.game_id,wallet_address:wallet,atm_per_coin:rule.atm_per_coin,max_coins:rule.max_coins,daily_atm_limit:rule.daily_atm_limit}).select('id,game_id,atm_per_coin,max_coins').single());
 return {enabled:true,...row};
}
function invoice(id){return createHash('sha256').update(`atm-town-arcade:${id}`).digest('hex').toUpperCase();}
async function beginPayout(admin,user,id){
 const treasury=String(process.env.ATM_TOWN_REWARDS_WALLET||'').trim();
 if(!ADDRESS.test(treasury))throw fail('Configure a funded ATM Town rewards wallet first.',503);
 const row=check(await admin.from('arcade_reward_sessions').select('*').eq('id',id).single());
 if(row.status==='paid')return {status:'paid',tx_hash:row.tx_hash};
 if(row.status==='signing')return {status:'signing',payload_uuid:row.payload_uuid};
 if(row.status!=='approved'||Number(row.amount)<=0)throw fail('Approve this reward before signing a payment.',409);
 const lock=check(await admin.from('arcade_reward_sessions').update({status:'signing',failure_reason:null}).eq('id',id).eq('status','approved').select('id').maybeSingle());
 if(!lock)throw fail('This payout is already being processed.',409);
 try{
 const response=await fetch(`${XAMAN_API_BASE}/payload`,{method:'POST',headers:xamanHeaders(),signal:AbortSignal.timeout(15000),body:JSON.stringify({txjson:{TransactionType:'Payment',Account:treasury,Destination:row.wallet_address,Amount:{currency:'ATM',issuer:ATM_ISSUER,value:String(row.amount)},InvoiceID:invoice(id)},options:{submit:true,expire:10,force_network:'MAINNET',signer:treasury},custom_meta:{identifier:`arcade:${id}`,instruction:`ATM Town arcade reward: ${row.amount} ATM. Verify destination and amount.`}})});
 const data=await response.json();
 if(!response.ok||!data.uuid)throw fail('Could not create the Xaman reward payment.',502);
 check(await admin.from('arcade_reward_sessions').update({payload_uuid:data.uuid}).eq('id',id).eq('status','signing'));
 await audit(admin,user,'payout-start',{id,payload_uuid:data.uuid});
 return {status:'signing',payload_uuid:data.uuid,deeplink:data.next?.always,qr_png:data.refs?.qr_png};
 }catch(error){
 // Unknown creation outcome must never generate a second payable request automatically.
 await admin.from('arcade_reward_sessions').update({failure_reason:'Payment request outcome is uncertain. Reconcile in Xaman before retrying.'}).eq('id',id);
 throw error;
 }
}
async function payoutStatus(admin,user,id){
 const row=check(await admin.from('arcade_reward_sessions').select('*').eq('id',id).single());
 if(row.status==='paid')return {status:'paid',tx_hash:row.tx_hash};
 if(!row.payload_uuid)return {status:row.status,error:row.failure_reason};
 const result=await fetchXamanPayload(row.payload_uuid),payload=result.payload;
 if(!result.found)throw fail('Payout request could not be found. Reconcile in Xaman.',409);
 if(payload?.meta?.signed!==true)return {status:'signing',resolved:payload?.meta?.resolved===true};
 const hash=String(payload?.response?.txid||'').toUpperCase();
 if(!/^[A-F0-9]{64}$/.test(hash))return {status:'signing'};
 const rpc=await fetch('https://xrplcluster.com/',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({method:'tx',params:[{transaction:hash,binary:false,api_version:2}]})});
 const txResult=(await rpc.json()).result||{},tx=txResult.tx_json||txResult,meta=txResult.meta||{};
 if(!txResult.validated)return {status:'signing'};
 const delivered=meta.delivered_amount||meta.DeliveredAmount;
 if(meta.TransactionResult!=='tesSUCCESS'||tx.TransactionType!=='Payment'||tx.Account!==process.env.ATM_TOWN_REWARDS_WALLET||tx.Destination!==row.wallet_address||tx.InvoiceID!==invoice(id)||Number(tx.Flags||0)&0x20000||delivered?.currency!=='ATM'||delivered?.issuer!==ATM_ISSUER||normalizeDecimal(delivered?.value)!==normalizeDecimal(row.amount))throw fail('Ledger payment does not match this reward. Reconcile before retrying.',409);
 check(await admin.from('arcade_reward_sessions').update({status:'paid',tx_hash:hash,failure_reason:null}).eq('id',id).eq('status','signing'));
 await audit(admin,user,'payout-paid',{id,tx_hash:hash});
 return {status:'paid',tx_hash:hash};
}
export async function handleEconomy(req,res){
 try{
 const {admin,user}=await requireUser(req),action=String(req.body?.action||req.query?.action||''),body=req.body||{};
 if(req.method==='POST'&&action==='rewards-start')return res.json(await startReward(admin,user,body));
 if(req.method==='POST'&&action==='rewards-coin'){
 if(!Number.isSafeInteger(body.sequence)||body.sequence<1)throw fail('Invalid coin sequence.');
 return res.json(check(await admin.rpc('town_arcade_coin',{p_user:user.id,p_session:body.session_id,p_sequence:body.sequence})));
 }
 if(req.method==='POST'&&action==='rewards-exit')return res.json(check(await admin.rpc('town_arcade_exit',{p_user:user.id,p_session:body.session_id})));
 if(req.method==='GET'&&action==='rewards-history')return res.json({rewards:check(await admin.from('arcade_reward_sessions').select('id,game_id,coins,amount,status,tx_hash,started_at').eq('user_id',user.id).order('started_at',{ascending:false}).limit(50))});
 await requireTownAdmin(admin,user);
 if(req.method==='GET'&&action==='admin-state'){
 const [prices,rules,rewards,events]=await Promise.all([
 admin.from('attribute_store_prices').select('*'),admin.from('arcade_reward_rules').select('*'),
 admin.from('arcade_reward_sessions').select('id,game_id,wallet_address,coins,amount,status,started_at,tx_hash,failure_reason').neq('status','active').order('started_at',{ascending:false}).limit(100),
 admin.from('town_admin_audit').select('*').order('created_at',{ascending:false}).limit(30)
 ]);
 return res.json({prices:check(prices),rules:check(rules),rewards:check(rewards),audit:check(events),item_ids:ATTRIBUTE_STORE_ITEM_IDS,treasury:process.env.ATM_TOWN_REWARDS_WALLET||null,automatic_payouts:false});
 }
 if(req.method!=='POST')throw fail('POST required.',405);
 if(action==='admin-price'){
 if(!ATTRIBUTE_STORE_ITEM_IDS.includes(body.item_id))throw fail('Unknown attribute.');
 const patch={item_id:body.item_id,active:body.active===true};
 for(const key of ['usd_amount','atm_amount','rlusd_amount','xrp_amount']){patch[key]=economyDecimal(body[key],{nullable:true});if(patch[key]!==null&&Number(patch[key])<=0)throw fail('Prices must be positive; leave blank to disable a currency.');}
 check(await admin.rpc('town_economy_save',{p_actor:user.id,p_kind:'price',p_value:patch}));return res.json({saved:true});
 }
 if(action==='admin-rule'){
 if(!REWARD_GAMES.includes(body.game_id)||!Number.isSafeInteger(body.max_coins)||body.max_coins<1||body.max_coins>10000)throw fail('Invalid reward rule.');
 const patch={game_id:body.game_id,enabled:body.enabled===true,atm_per_coin:economyDecimal(body.atm_per_coin),daily_atm_limit:economyDecimal(body.daily_atm_limit),max_coins:body.max_coins};
 if(patch.enabled&&(Number(patch.atm_per_coin)<=0||Number(patch.daily_atm_limit)<=0))throw fail('Set a positive reward rate and daily limit before enabling rewards.');
 check(await admin.rpc('town_economy_save',{p_actor:user.id,p_kind:'rule',p_value:patch}));return res.json({saved:true});
 }
 if(action==='admin-approve'||action==='admin-reject'){
 check(await admin.rpc('town_economy_save',{p_actor:user.id,p_kind:action==='admin-approve'?'approve':'reject',p_value:{id:body.id}}));return res.json({saved:true});
 }
 if(action==='admin-payout')return res.json(await beginPayout(admin,user,body.id));
 if(action==='admin-payout-status')return res.json(await payoutStatus(admin,user,body.id));
 throw fail('Unknown economy action.');
 }catch(error){sendError(res,error);}
}
