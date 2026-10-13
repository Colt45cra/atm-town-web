import {randomInt,randomUUID} from 'node:crypto';
import {setCors,adminClient,requireUser,sendError} from '../lib/auth.js';
import {requireTownAdmin} from '../lib/town-economy.js';
import {adminAttributeAccess} from '../lib/attribute-catalog.js';
import {payloadIntegrationRequest} from '../lib/payload-integration.js';
import {createXamanTransaction,cancelXamanTransaction,findOwnedNft,OFFER_ID,XRPL_ADDRESS} from '../lib/xrpl-nft-trading.js';
import {resolveMetadata} from '../api/xrpl-nft-metadata.js';
import {verifyDropSignature} from './nft-drops.js';
import {REWARDS_NFT_WALLET} from '../lib/nft-drops.js';
const check=({data,error})=>{if(error)throw error;return data;};
const fail=(message,status=409)=>Object.assign(new Error(message),{status});
const pool=body=>payloadIntegrationRequest('/api/integrations/v1/nft-pool',body,{timeoutMs:45000});
export function fishingPosition(p){if(p.map!=='town'||p.airborne||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<1440||p.x>1690||p.y<3650||p.y>4110)throw fail('Stand at the southern fishing pier to cast.');return p;}
const view=r=>({id:r.id,status:r.status,has_bite:r.has_bite,bite_delay_ms:Math.max(0,new Date(r.bite_at).getTime()-Date.now()),token_id:r.token_id,name:r.name,image_url:r.image_url,...(r.payload_uuid?{deeplink:`https://xumm.app/sign/${r.payload_uuid}`}:{})});
async function walletFor(admin,user){const r=check(await admin.from('player_accounts').select('wallet_address,wallet_verified_at').eq('user_id',user.id).maybeSingle());if(!r?.wallet_verified_at||!XRPL_ADDRESS.test(r.wallet_address||''))throw fail('Link your Xaman wallet to fish for NFTs.');return r.wallet_address;}
async function requirePole(admin,user){if(await adminAttributeAccess(admin,user))return;const r=check(await admin.from('attribute_entitlements').select('item_id').eq('user_id',user.id).eq('item_id','equipment:fishing-pole').maybeSingle());if(!r)throw fail('Buy and equip a fishing pole first.');}
async function settings(admin){return check(await admin.from('town_fishing_settings').select('*').eq('id',true).single());}
async function award(admin,row){
 if(row.status!=='reward_pending')return row;
 const r=await pool({action:'fish',claim_id:row.id,recipient_address:row.wallet_address});
 if(r.status==='empty')return check(await admin.from('town_fishing_casts').update({status:'empty'}).eq('id',row.id).eq('status','reward_pending').select('*').single());
 if(r.status!=='offer_ready')return row;
 if(r.claim_key!==row.id||r.recipient_address!==row.wallet_address||r.allocation!=='fishing'||!OFFER_ID.test(r.offer_index||''))throw fail('The fishing reward does not match your wallet.');
 let art={};try{const nft=await findOwnedNft(REWARDS_NFT_WALLET,r.token_id);if(nft)art=await resolveMetadata(nft.URI,r.token_id);}catch{}
 return check(await admin.from('town_fishing_casts').update({status:'reward_ready',token_id:r.token_id,offer_index:r.offer_index,name:art.name||'NFT',image_url:art.image_url||null}).eq('id',row.id).eq('status','reward_pending').select('*').maybeSingle())||row;
}
async function claimStatus(admin,row,create=false){
 row=await award(admin,row);
 if(row.status!=='reward_ready'||(!row.payload_uuid&&!create))return view(row);
 if(row.payload_uuid){
  const signed=await verifyDropSignature(row.payload_uuid,row.wallet_address);
  if(signed.status==='validated'){
   if(signed.tx.TransactionType!=='NFTokenAcceptOffer'||signed.tx.Account!==row.wallet_address||signed.tx.NFTokenSellOffer!==row.offer_index)throw fail('The NFT transaction did not match your fishing catch.');
   await pool({action:'fish-confirm',claim_id:row.id,recipient_address:row.wallet_address,tx_hash:signed.hash});
   check(await admin.from('town_fishing_casts').update({status:'claimed',tx_hash:signed.hash}).eq('id',row.id));return {...view(row),status:'claimed'};
  }
  if(['rejected','expired','failed'].includes(signed.status)){
   if(!create)return {...view(row),status:signed.status,message:signed.error||'Claim stopped. Tap Claim NFT to try again.'};
   await cancelXamanTransaction(row.payload_uuid);check(await admin.from('town_fishing_casts').update({payload_uuid:null}).eq('id',row.id).eq('payload_uuid',row.payload_uuid));row.payload_uuid=null;
  }else return {...view(row),status:'pending'};
 }
 const leased=check(await admin.from('town_fishing_casts').update({signing_lease_until:new Date(Date.now()+120000).toISOString()}).eq('id',row.id).is('payload_uuid',null).or('signing_lease_until.is.null,signing_lease_until.lt.'+new Date().toISOString()).select('id').maybeSingle());
 if(!leased)return {...view(row),status:'preparing'};
 let p;
 try{
  p=await createXamanTransaction({TransactionType:'NFTokenAcceptOffer',Account:row.wallet_address,NFTokenSellOffer:row.offer_index},{identifier:row.id,instruction:'Claim the NFT you caught fishing in ATM Town for 0 XRP. This offer is restricted to your wallet. Normal network fees apply.'});
  const saved=check(await admin.from('town_fishing_casts').update({payload_uuid:p.uuid,signing_lease_until:null}).eq('id',row.id).is('payload_uuid',null).select('*').maybeSingle());
  if(!saved){await cancelXamanTransaction(p.uuid);return {...view(row),status:'preparing'};}return {...view(saved),status:'pending',deeplink:p.next.always};
 }catch(e){await cancelXamanTransaction(p?.uuid);check(await admin.from('town_fishing_casts').update({signing_lease_until:null}).eq('id',row.id).is('payload_uuid',null));throw e;}
}
export default async function handler(req,res){
 if(setCors(req,res))return;res.setHeader('Cache-Control','no-store');
 const action=String(req.query?.action||''),body=req.body||{};
 try{
  if(req.method==='GET'&&action==='fish-config'){const admin=adminClient();return res.json({settings:await settings(admin),reset_timezone:'UTC'});}
  const {admin,user}=await requireUser(req);
  if(action==='fish-admin'){
   await requireTownAdmin(admin,user);
   if(req.method==='POST'){
    const catch_percent=Number(body.catch_percent),daily_nft_limit=Number(body.daily_nft_limit);
    if(typeof body.enabled!=='boolean'||!Number.isInteger(catch_percent)||catch_percent<0||catch_percent>100||!Number.isInteger(daily_nft_limit)||daily_nft_limit<0||daily_nft_limit>10000)throw fail('Use a catch percentage from 0 to 100 and a whole-number daily NFT limit.',400);
    check(await admin.from('town_fishing_settings').update({enabled:body.enabled,catch_percent,daily_nft_limit,updated_at:new Date().toISOString()}).eq('id',true));
    check(await admin.from('town_admin_audit').insert({actor:user.id,action:'fishing-settings',details:{enabled:body.enabled,catch_percent,daily_nft_limit}}));
   }else if(req.method!=='GET')throw fail('GET or POST required.',405);
   const today=new Date().toISOString().slice(0,10),r=await admin.from('town_fishing_casts').select('id',{head:true,count:'exact'}).eq('award_day',today).in('status',['reward_pending','reward_ready','claimed']);if(r.error)throw r.error;
   return res.json({settings:await settings(admin),nfts_today:r.count||0,reset_timezone:'UTC'});
  }
  if(req.method==='GET'&&action==='fish-mine'){const row=check(await admin.from('town_fishing_casts').select('*').eq('user_id',user.id).in('status',['reward_pending','reward_ready']).order('created_at',{ascending:false}).limit(1).maybeSingle());return res.json(row?view(row):{status:'idle'});}
  const wallet=await walletFor(admin,user);
  if(req.method==='POST'&&action==='fish-cast'){
   await requirePole(admin,user);const p=fishingPosition(body);
   const row=check(await admin.rpc('begin_town_fishing_cast',{p_id:randomUUID(),p_user:user.id,p_wallet:wallet,p_x:p.x,p_y:p.y,p_roll:randomInt(100),p_delay:randomInt(1800,4301)}));return res.status(201).json(view(row));
  }
  const id=body.id||req.query?.id;if(!/^[0-9a-f-]{36}$/i.test(id||''))throw fail('Invalid fishing cast.',400);
  let row=check(await admin.from('town_fishing_casts').select('*').eq('id',id).eq('user_id',user.id).single());if(row.wallet_address!==wallet)throw fail('Use the wallet that caught this NFT.');
  if(req.method==='GET'&&action==='fish-art'){
   if(!row.token_id||!['reward_ready','claimed'].includes(row.status))throw fail('The NFT catch is still being prepared.');
   const nft=await findOwnedNft(row.status==='claimed'?wallet:REWARDS_NFT_WALLET,row.token_id);
   if(!nft)throw fail('The NFT catch artwork could not be verified.');
   const art=await resolveMetadata(nft.URI,row.token_id,{refresh:true});
   if(art.image_url)check(await admin.from('town_fishing_casts').update({image_url:art.image_url,name:art.name||row.name}).eq('id',row.id).eq('status',row.status));
   return res.json({token_id:row.token_id,name:art.name||row.name,image_url:art.image_url||row.image_url,image_candidates:art.image_candidates||[]});
  }
  if(req.method==='POST'&&action==='fish-reel'){
   if(row.status==='casting'){await requirePole(admin,user);const p=fishingPosition(body);if(Math.hypot(p.x-Number(row.x),p.y-Number(row.y))>9)throw fail('Stay at your casting spot to reel in.');row=check(await admin.rpc('reel_town_fishing_cast',{p_id:id,p_user:user.id}));}
   try{return res.json(view(await award(admin,row)));}catch(e){if(row.status==='reward_pending')return res.json({...view(row),message:'Preparing your NFT catch. Please wait.'});throw e;}
  }
  if(req.method==='GET'&&action==='fish-status')return res.json(await claimStatus(admin,row));
  if(req.method==='POST'&&action==='fish-claim')return res.json(await claimStatus(admin,row,true));
  throw fail('Unknown fishing action.',400);
 }catch(e){sendError(res,e);}
}
