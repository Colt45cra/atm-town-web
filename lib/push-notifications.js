import webpush from 'web-push';

const PUSH_ACTIONS = new Set(['push-config','push-subscribe','push-unsubscribe','player-ping']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_CUSTOM_MESSAGE = 120;
const PAIR_COOLDOWN_MS = 30_000;
const GLOBAL_WINDOW_MS = 10 * 60_000;
const GLOBAL_MAX_PINGS = 20;
const ALLOWED_KINDS = new Set(['hello','join','find_me','money_rain','custom']);
const PRESET_MESSAGES = Object.freeze({
  hello: 'Hey! 👋',
  join: 'Get on ATM Town 🎮',
  find_me: 'Come find me in ATM Town 📍',
  money_rain: 'Money Rain is starting! 💸'
});

function badRequest(message){return Object.assign(new Error(message),{status:400});}
function tooMany(message){return Object.assign(new Error(message),{status:429});}
function conflict(message){return Object.assign(new Error(message),{status:409});}

function pushEnv(){
  const publicKey=String(process.env.WEB_PUSH_VAPID_PUBLIC_KEY||'').trim();
  const privateKey=String(process.env.WEB_PUSH_VAPID_PRIVATE_KEY||'').trim();
  const subject=String(process.env.WEB_PUSH_VAPID_SUBJECT||'https://atm-town-web.vercel.app').trim();
  return {publicKey,privateKey,subject,available:Boolean(publicKey&&privateKey&&subject)};
}

function configureWebPush(){
  const env=pushEnv();
  if(!env.available)throw conflict('ATM Town push notifications are not configured on the server yet.');
  webpush.setVapidDetails(env.subject,env.publicKey,env.privateKey);
  return env;
}

function cleanText(value,max=MAX_CUSTOM_MESSAGE){
  return String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
}

function assertSubscription(body){
  const subscription=body?.subscription;
  if(!subscription||typeof subscription!=='object'||Array.isArray(subscription))throw badRequest('Push subscription is missing.');
  const endpoint=String(subscription.endpoint||'').trim();
  const p256dh=String(subscription.keys?.p256dh||'').trim();
  const auth=String(subscription.keys?.auth||'').trim();
  if(!/^https:\/\//i.test(endpoint)||endpoint.length>4096)throw badRequest('Push subscription endpoint is invalid.');
  if(!/^[A-Za-z0-9_-]{20,512}$/.test(p256dh))throw badRequest('Push subscription p256dh key is invalid.');
  if(!/^[A-Za-z0-9_-]{8,256}$/.test(auth))throw badRequest('Push subscription auth key is invalid.');
  return {endpoint,p256dh,auth};
}

async function readIdentity(admin,userId){
  const [{data:profile,error:profileError},{data:player,error:playerError}]=await Promise.all([
    admin.from('atm_pay_profiles').select('handle').eq('user_id',userId).maybeSingle(),
    admin.from('player_accounts').select('display_name,selected_character').eq('user_id',userId).maybeSingle()
  ]);
  if(profileError)throw profileError;if(playerError)throw playerError;
  return {
    user_id:userId,
    handle:String(profile?.handle||''),
    display_name:cleanText(player?.display_name||'ATM Player',30)||'ATM Player',
    character_id:cleanText(player?.selected_character||'classic',40)||'classic'
  };
}

async function subscribe(admin,userId,body,req){
  configureWebPush();
  const {endpoint,p256dh,auth}=assertSubscription(body);
  const now=new Date().toISOString();
  const userAgent=cleanText(req.headers['user-agent']||'',500);
  const {data,error}=await admin.from('atm_push_subscriptions').upsert({
    user_id:userId,endpoint,p256dh,auth,user_agent:userAgent,updated_at:now
  },{onConflict:'endpoint'}).select('id,endpoint,created_at,updated_at').single();
  if(error)throw error;
  return {subscribed:true,subscription:{id:data.id,endpoint:data.endpoint,created_at:data.created_at,updated_at:data.updated_at}};
}

async function unsubscribe(admin,userId,body){
  const endpoint=String(body?.endpoint||'').trim();
  if(!/^https:\/\//i.test(endpoint))throw badRequest('Push endpoint is invalid.');
  const {error}=await admin.from('atm_push_subscriptions').delete().eq('user_id',userId).eq('endpoint',endpoint);
  if(error)throw error;
  return {subscribed:false};
}

async function enforceRateLimit(admin,senderUserId,targetUserId){
  const pairSince=new Date(Date.now()-PAIR_COOLDOWN_MS).toISOString();
  const {data:pairRows,error:pairError}=await admin.from('atm_player_pings').select('id').eq('sender_user_id',senderUserId).eq('target_user_id',targetUserId).gte('created_at',pairSince).limit(1);
  if(pairError)throw pairError;
  if(pairRows?.length)throw tooMany('Wait a few seconds before pinging that player again.');

  const globalSince=new Date(Date.now()-GLOBAL_WINDOW_MS).toISOString();
  const {count,error:globalError}=await admin.from('atm_player_pings').select('id',{count:'exact',head:true}).eq('sender_user_id',senderUserId).gte('created_at',globalSince);
  if(globalError)throw globalError;
  if(Number(count||0)>=GLOBAL_MAX_PINGS)throw tooMany('Ping limit reached. Try again in a few minutes.');
}

async function sendPushToTarget(admin,targetUserId,payload){
  configureWebPush();
  const {data:rows,error}=await admin.from('atm_push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id',targetUserId);
  if(error)throw error;
  const subscriptions=Array.isArray(rows)?rows:[];
  let delivered=0;
  const staleIds=[];
  await Promise.all(subscriptions.map(async(row)=>{
    const subscription={endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}};
    try{
      await webpush.sendNotification(subscription,JSON.stringify(payload),{TTL:90,urgency:'high'});
      delivered+=1;
    }catch(error){
      const status=Number(error?.statusCode||error?.status||0);
      if(status===404||status===410)staleIds.push(row.id);
      else console.error('ATM Town push delivery failed',status,error?.body||error?.message||error);
    }
  }));
  if(staleIds.length){
    const {error:deleteError}=await admin.from('atm_push_subscriptions').delete().in('id',staleIds);
    if(deleteError)console.error('ATM Town stale push subscription cleanup failed',deleteError);
  }
  return {attempted:subscriptions.length,delivered};
}

async function sendPlayerPing(admin,user,body){
  const targetUserId=String(body?.target_user_id||'').trim();
  if(!UUID_RE.test(targetUserId))throw badRequest('Ping target is invalid.');
  if(targetUserId===user.id)throw badRequest('You cannot ping yourself.');
  const kind=String(body?.kind||'hello').trim().toLowerCase();
  if(!ALLOWED_KINDS.has(kind))throw badRequest('Ping type is invalid.');
  const custom=cleanText(body?.message||'',MAX_CUSTOM_MESSAGE);
  const message=kind==='custom'?custom:PRESET_MESSAGES[kind];
  if(!message)throw badRequest('Enter a ping message.');

  await enforceRateLimit(admin,user.id,targetUserId);
  const [sender,target]=await Promise.all([readIdentity(admin,user.id),readIdentity(admin,targetUserId)]);
  if(!target?.user_id)throw Object.assign(new Error('That ATM Town player could not be found.'),{status:404});

  const senderLabel=sender.handle?`@${sender.handle}`:sender.display_name;
  const notificationMessage=kind==='custom'?`${senderLabel}: ${message}`:`${senderLabel} · ${message}`;
  const {data:row,error:insertError}=await admin.from('atm_player_pings').insert({
    sender_user_id:user.id,target_user_id:targetUserId,kind,message:notificationMessage
  }).select('id,created_at').single();
  if(insertError)throw insertError;

  const payload={
    type:'player_ping',
    ping_id:row.id,
    created_at:row.created_at,
    sender_user_id:user.id,
    sender_handle:sender.handle||null,
    sender_name:sender.display_name,
    sender_character_id:sender.character_id,
    target_user_id:targetUserId,
    kind,
    message:notificationMessage,
    url:'/?source=push'
  };
  let delivery={attempted:0,delivered:0};
  try{delivery=await sendPushToTarget(admin,targetUserId,payload);}catch(error){
    console.error('ATM Town push delivery unavailable',error?.message||error);
  }
  const {error:updateError}=await admin.from('atm_player_pings').update({push_attempted:delivery.attempted,push_delivered:delivery.delivered}).eq('id',row.id);
  if(updateError)console.error('ATM Town ping delivery counters could not be updated',updateError);
  return {sent:true,ping:payload,push:delivery,target:{user_id:targetUserId,handle:target.handle||null,display_name:target.display_name}};
}

export function isPushAction(action){return PUSH_ACTIONS.has(String(action||'').toLowerCase());}

export async function handlePushAction(req,res,{admin,user,action}){
  const normalized=String(action||'').toLowerCase();
  if(normalized==='push-config'){
    if(req.method!=='GET')return res.status(405).json({error:'Method not allowed.'});
    const env=pushEnv();
    return res.status(200).json({available:env.available,public_key:env.available?env.publicKey:null,pair_cooldown_seconds:PAIR_COOLDOWN_MS/1000,max_custom_message:MAX_CUSTOM_MESSAGE});
  }
  if(normalized==='push-subscribe'){
    if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
    return res.status(200).json(await subscribe(admin,user.id,req.body||{},req));
  }
  if(normalized==='push-unsubscribe'){
    if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
    return res.status(200).json(await unsubscribe(admin,user.id,req.body||{}));
  }
  if(normalized==='player-ping'){
    if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
    return res.status(200).json(await sendPlayerPing(admin,user,req.body||{}));
  }
  return res.status(404).json({error:'Push action not found.'});
}
