const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export const SOCIAL_ACTIONS=new Set(['social-state','friend-request','friend-accept','friend-remove','notification-preferences']);
export async function preferences(admin,id){
 const {data,error}=await admin.from('atm_notification_preferences').select('player_pings,world_events').eq('user_id',id).maybeSingle();
 if(error)throw error;return data||{player_pings:true,world_events:false};
}
async function socialState(admin,id){
 const {data,error}=await admin.from('atm_friendships').select('*').or(`requester_id.eq.${id},recipient_id.eq.${id}`).order('created_at',{ascending:false}).limit(500);
 if(error)throw error;
 const ids=(data||[]).map(r=>r.requester_id===id?r.recipient_id:r.requester_id);
 let players=[];if(ids.length){const result=await admin.from('player_accounts').select('user_id,display_name,selected_character').in('user_id',ids);if(result.error)throw result.error;players=result.data||[];}
 return {preferences:await preferences(admin,id),relationships:(data||[]).map(r=>{const other=r.requester_id===id?r.recipient_id:r.requester_id;const p=players.find(x=>x.user_id===other);return {user_id:other,display_name:p?.display_name||'ATM Player',character_id:p?.selected_character||'classic',status:r.status==='accepted'?'friends':r.recipient_id===id?'incoming':'outgoing'};})};
}
export async function handleSocialAction(req,res,{admin,user,action}){
 if(action==='social-state'){if(req.method!=='GET')return res.status(405).json({error:'Method not allowed.'});return res.status(200).json(await socialState(admin,user.id));}
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
 const body=req.body||{};
 if(action==='notification-preferences'){
  if(typeof body.player_pings!=='boolean'||typeof body.world_events!=='boolean')throw fail('Choose both notification preferences.');
  const {error}=await admin.from('atm_notification_preferences').upsert({user_id:user.id,player_pings:body.player_pings,world_events:body.world_events,updated_at:new Date().toISOString()});if(error)throw error;
 }else{
  const target=String(body.target_user_id||'');if(!uuid.test(target)||target===user.id)throw fail('Choose another signed-in player.');
  const pair=[user.id,target].sort().join(':');
  if(action==='friend-request'){
   const {data:player,error:pe}=await admin.from('player_accounts').select('user_id').eq('user_id',target).maybeSingle();if(pe)throw pe;if(!player)throw fail('Player not found.',404);
   const {count,error:ce}=await admin.from('atm_friendships').select('pair_key',{count:'exact',head:true}).eq('requester_id',user.id).gte('created_at',new Date(Date.now()-86400000).toISOString());if(ce)throw ce;if(count>=50)throw fail('Friend request limit reached. Try again tomorrow.',429);
   const {error}=await admin.from('atm_friendships').upsert({pair_key:pair,requester_id:user.id,recipient_id:target,status:'pending'},{onConflict:'pair_key',ignoreDuplicates:true});if(error)throw error;
  }else if(action==='friend-accept'){
   const {data,error}=await admin.from('atm_friendships').update({status:'accepted'}).eq('pair_key',pair).eq('recipient_id',user.id).eq('status','pending').select('pair_key');if(error)throw error;if(!data?.length)throw fail('Friend request no longer available.',409);
  }else if(action==='friend-remove'){
   const {error}=await admin.from('atm_friendships').delete().eq('pair_key',pair).or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);if(error)throw error;
  }else throw fail('Unknown social action.',404);
 }
 return res.status(200).json(await socialState(admin,user.id));
}
