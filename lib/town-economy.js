import { tokenUsdPrice } from './token-usd-price.js';
import { loadAttributeDefinitions, mergedAttributeCatalog, createAttributeUpload, attributePatch } from './attribute-catalog.js';
import { requireUser, sendError, adminClient } from './auth.js';
import { payArcadeReward, retryArcadeRewards, rewardProgramPath, validateRewardProgram } from './arcade-payouts.js';
import { payloadIntegrationRequest } from './payload-integration.js';
import { ATTRIBUTE_STORE_ITEM_IDS, normalizeDecimal } from './attribute-store.js';
import { timingSafeEqual } from 'node:crypto';
import { NPC_REWARDS, SHARED_ARCADE_SLUG, npcSettings, npcProgram, npcPath, npcReceipt } from './npc-rewards.js';
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
 const result=await admin.from('town_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(['42P01','PGRST205'].includes(String(result.error?.code||'')))throw fail('Your ATM Town sign-in worked. Admin setup is pending the database connection.',503);
 const row=check(result);
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
 if(!rule.payload_program_slug)throw fail('Arcade rewards need a connected Payload vault.',503);
 const wallet=await verifiedWallet(admin,user);
 // Close and queue an interrupted session before opening another.
 const old=check(await admin.from('arcade_reward_sessions').select('id').eq('user_id',user.id).eq('status','active').maybeSingle());
 if(old){check(await admin.rpc('town_arcade_exit',{p_user:user.id,p_session:old.id}));await payArcadeReward(admin,old.id);}
 const row=check(await admin.from('arcade_reward_sessions').insert({user_id:user.id,game_id:body.game_id,wallet_address:wallet,atm_per_coin:rule.atm_per_coin,max_coins:rule.max_coins,daily_atm_limit:rule.daily_atm_limit,payload_program_slug:rule.payload_program_slug,reward_currency:rule.reward_currency,reward_issuer:rule.reward_issuer}).select('id,game_id,atm_per_coin,max_coins').single());
 return {enabled:true,...row};
}
export async function handleEconomy(req,res){
 try{
 const requestedAction=String(req.body?.action||req.query?.action||'');
 if(requestedAction==='rewards-cron'){
 const expected=Buffer.from(`Bearer ${process.env.CRON_SECRET}`),received=Buffer.from(String(req.headers.authorization||''));
 if(req.method!=='GET'||!process.env.CRON_SECRET||received.length!==expected.length||!timingSafeEqual(received,expected))throw fail('Unauthorized.',401);
 const results=await retryArcadeRewards(adminClient());return res.json({processed:results.length});
 }
 const {admin,user}=await requireUser(req),action=String(req.body?.action||req.query?.action||''),body=req.body||{};
 if((req.method==='GET'&&action==='rewards-npc-status')||(req.method==='POST'&&action==='rewards-npc-claim')){
  const npc=npcProgram(String(body.npc_id||req.query?.npc_id||''));
  const wallet=await verifiedWallet(admin,user);
  const path=npcPath(npc,'claim');
  if(req.method==='GET'){
   const result=await payloadIntegrationRequest(`${path}?walletAddress=${encodeURIComponent(wallet)}`,null,{method:'GET'});
   return res.json({...result,already_claimed:result.alreadyClaimed===true,claim_status:result.claimStatus||null,tx_hash:result.txHash||null,wallet});
  }
  const result=await payloadIntegrationRequest(path,{walletAddress:wallet,externalUserId:user.id},{timeoutMs:30000});
  const receipt=npcReceipt(result,wallet);return res.status(receipt.pending?202:200).json(receipt);
 }
 if(req.method==='POST'&&action==='rewards-start')return res.json(await startReward(admin,user,body));
 if(req.method==='POST'&&action==='rewards-coin'){
 if(!Number.isSafeInteger(body.sequence)||body.sequence<1)throw fail('Invalid coin sequence.');
 return res.json(check(await admin.rpc('town_arcade_coin',{p_user:user.id,p_session:body.session_id,p_sequence:body.sequence})));
 }
 if(req.method==='POST'&&action==='rewards-exit'){
 check(await admin.rpc('town_arcade_exit',{p_user:user.id,p_session:body.session_id}));
 const row=await payArcadeReward(admin,body.session_id);return res.json({id:row.id,status:row.status,coins:row.coins,amount:row.amount,currency:row.reward_currency,issuer:row.reward_issuer,tx_hash:row.tx_hash,error:row.failure_reason});
 }
 if(req.method==='GET'&&action==='rewards-history')return res.json({rewards:check(await admin.from('arcade_reward_sessions').select('id,game_id,coins,amount,status,tx_hash,started_at,reward_currency,reward_issuer').eq('user_id',user.id).order('started_at',{ascending:false}).limit(50))});
 await requireTownAdmin(admin,user);
 if(req.method==='GET'&&action==='admin-npcs')return res.json({npcs:await npcSettings()});
 if(req.method==='POST'&&action==='admin-npc-token'){
  const npc=npcProgram(body.npc_id);const result=await payloadIntegrationRequest(npcPath(npc,'settings'),{currency:body.currency,issuer:body.issuer},{method:'PUT'});
  await audit(admin,user,'npc-token-setup',{npc_id:npc.id,currency:result.currency,issuer:result.issuer});return res.json(result);
 }
 if(req.method==='GET'&&action==='admin-sponsor-tokens')return res.json(await payloadIntegrationRequest(`${rewardProgramPath(SHARED_ARCADE_SLUG)}?catalog=1`,null,{method:'GET'}));
 if(req.method==='POST'&&action==='admin-sponsor-token'){
  const slug=String(body.slug||'');if(!/^atm-town-arcade-[a-z0-9-]{1,40}$/.test(slug))throw fail('Enter a unique sponsor name using lowercase letters, numbers and hyphens.');
  const result=await payloadIntegrationRequest(rewardProgramPath(slug),{currency:body.currency,issuer:body.issuer,name:body.name},{method:'PUT'});
  await audit(admin,user,'arcade-sponsor-token',{slug,currency:body.currency,issuer:body.issuer});return res.json(result);
 }
 if(req.method==='POST'&&action==='admin-npc-rule'){
  const npc=npcProgram(body.npc_id);
  if(typeof body.enabled!=='boolean'||!['once','daily','weekly','monthly'].includes(body.interval))throw fail('Invalid NPC reward settings.');
  const amount=economyDecimal(body.amount);if(Number(amount)<=0)throw fail('Set a positive NPC reward amount.');
  const result=await payloadIntegrationRequest(npcPath(npc,'settings'),{enabled:body.enabled,amount,interval:body.interval},{method:'PUT'});
  await audit(admin,user,'npc-reward-settings',{npc_id:npc.id,enabled:body.enabled,amount,interval:body.interval});
  return res.json({saved:true,npc:result});
 }
 if(req.method==='GET'&&action==='admin-state'){
 const [prices,rules,rewards,events,definitions]=await Promise.all([
 admin.from('attribute_store_prices').select('*'),admin.from('arcade_reward_rules').select('*'),
 admin.from('arcade_reward_sessions').select('id,game_id,wallet_address,coins,amount,status,started_at,tx_hash,failure_reason,reward_currency,reward_issuer').neq('status','active').order('started_at',{ascending:false}).limit(100),
 admin.from('town_admin_audit').select('*').order('created_at',{ascending:false}).limit(30),loadAttributeDefinitions(admin)
 ]);
 return res.json({prices:check(prices),rules:check(rules),rewards:check(rewards),audit:check(events),item_ids:ATTRIBUTE_STORE_ITEM_IDS,catalog:mergedAttributeCatalog(definitions),automatic_payouts:true});
 }
 if((req.method==='GET'&&action==='admin-wallets')||(req.method==='POST'&&['admin-wallet-topup','admin-token-price'].includes(action))){
 const rules=check(await admin.from('arcade_reward_rules').select('payload_program_slug'));
 const catalog=await payloadIntegrationRequest(`${rewardProgramPath(SHARED_ARCADE_SLUG)}?catalog=1`,null,{method:'GET'});
 const slugs=[...new Set([...(catalog.programs||[]).map(program=>program.slug),...rules.map(rule=>rule.payload_program_slug).filter(Boolean),SHARED_ARCADE_SLUG,...NPC_REWARDS.map(npc=>npc.slug)])];
 const fundingPath=slug=>NPC_REWARDS.some(npc=>npc.slug===slug)?`/api/integrations/v1/reward-programs/${slug}/funding`:`${rewardProgramPath(slug)}/funding`;
 if(action==='admin-wallets')return res.json({wallets:await Promise.all(slugs.map(async slug=>{try{return await payloadIntegrationRequest(fundingPath(slug),null,{method:'GET',timeoutMs:20000});}catch(error){return {slug,error:error.message};}}))});
 const slug=String(body.slug||'').trim();if(!slugs.includes(slug))throw fail('Save this connected vault in the game settings first.');
 if(action==='admin-token-price'){const wallet=await payloadIntegrationRequest(fundingPath(slug),null,{method:'GET',timeoutMs:20000});return res.json(await tokenUsdPrice({currency:wallet.currency,issuer:wallet.issuer}));}
 const amount=economyDecimal(body.amount);if(Number(amount)<=0)throw fail('Enter a positive reward top-up amount.');
 const result=await payloadIntegrationRequest(fundingPath(slug),{amount},{timeoutMs:40000});
 await audit(admin,user,'reward-wallet-topup-request',{slug,amount,cycle_id:result.cycle?.id});return res.json(result);
 }
 if(req.method!=='POST')throw fail('POST required.',405);
 if(action==='admin-attribute-upload')return res.json(await createAttributeUpload(admin,user));
 if(action==='admin-attribute-save'){
 const patch=await attributePatch(admin,user,body);const price={active:body.active===true};
 for(const key of ['usd_amount','atm_amount','rlusd_amount','xrp_amount']){price[key]=economyDecimal(body[key],{nullable:true});if(price[key]!==null&&Number(price[key])<=0)throw fail('Prices must be positive; leave blank to disable a currency.');}
 check(await admin.rpc('town_attribute_save',{p_actor:user.id,p_definition:patch,p_price:price}));return res.json({saved:true,item_id:patch.item_id});
 }

 if(action==='admin-price'){
 if(!ATTRIBUTE_STORE_ITEM_IDS.includes(body.item_id)&&!(await loadAttributeDefinitions(admin)).some(item=>item.item_id===body.item_id))throw fail('Unknown attribute.');
 const patch={item_id:body.item_id,active:body.active===true};
 for(const key of ['usd_amount','atm_amount','rlusd_amount','xrp_amount']){patch[key]=economyDecimal(body[key],{nullable:true});if(patch[key]!==null&&Number(patch[key])<=0)throw fail('Prices must be positive; leave blank to disable a currency.');}
 check(await admin.rpc('town_economy_save',{p_actor:user.id,p_kind:'price',p_value:patch}));return res.json({saved:true});
 }
 if(action==='admin-rule'){
 if(!REWARD_GAMES.includes(body.game_id)||!Number.isSafeInteger(body.max_coins)||body.max_coins<1||body.max_coins>10000)throw fail('Invalid reward rule.');
 const patch={game_id:body.game_id,enabled:body.enabled===true,atm_per_coin:economyDecimal(body.atm_per_coin),daily_atm_limit:economyDecimal(body.daily_atm_limit),max_coins:body.max_coins,payload_program_slug:String(body.payload_program_slug||'').trim()};
 if(patch.enabled&&(Number(patch.atm_per_coin)<=0||Number(patch.daily_atm_limit)<=0))throw fail('Set a positive reward rate and daily limit before enabling rewards.');
 if(patch.payload_program_slug)rewardProgramPath(patch.payload_program_slug);
 if(patch.payload_program_slug){
 const program=patch.enabled?await validateRewardProgram(patch.payload_program_slug,patch):await payloadIntegrationRequest(rewardProgramPath(patch.payload_program_slug),null,{method:'GET'});
 patch.reward_currency=program.currency;patch.reward_issuer=program.issuer;
 }
 check(await admin.rpc('town_economy_save',{p_actor:user.id,p_kind:'rule',p_value:patch}));return res.json({saved:true});
 }
 if(action==='admin-connect-vault'){
 const slug=String(body.slug||'').trim();const result=await payloadIntegrationRequest(rewardProgramPath(slug),{},{method:'PUT'});
 await audit(admin,user,'connect-payload-vault',{slug});return res.json(result);
 }
 if(action==='admin-retry-payout')return res.json(await payArcadeReward(admin,body.id));
 if(action==='admin-approve'||action==='admin-reject'){
 check(await admin.rpc('town_economy_save',{p_actor:user.id,p_kind:action==='admin-approve'?'approve':'reject',p_value:{id:body.id}}));return res.json({saved:true});
 }
 throw fail('Unknown economy action.');
 }catch(error){sendError(res,error);}
}
