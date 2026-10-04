/* Rewards are claimed on exit. Browser pickups require admin review; they are not proof of play. */
(function(global){
 const sessions=new Map(),key='atm-town-arcade-exits-v1';
 const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'[]');}catch{return [];}};
 const save=list=>localStorage.setItem(key,JSON.stringify(list.slice(-50)));
 async function api(action,body={}){
 const client=await getSupabaseClient(),{data}=await client.auth.getSession();
 if(!data.session?.access_token)throw new Error('Sign in to earn arcade rewards.');
 const response=await fetch('/api/leaderboards',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({action,...body})});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Reward request failed.');return result;
 }
 function notice(message){let node=document.getElementById('arcadeRewardNotice');if(!node){node=document.createElement('div');node.id='arcadeRewardNotice';node.setAttribute('role','status');node.style.cssText='position:fixed;z-index:20000;bottom:80px;left:50%;transform:translateX(-50%);width:min(90vw,420px);padding:14px;border:1px solid #ffd166;border-radius:14px;background:#101728;color:#fff;text-align:center;font:700 14px system-ui';document.body.appendChild(node);}node.textContent=message;clearTimeout(node.timer);node.timer=setTimeout(()=>node.remove(),7000);}
 let flushing=false;
 async function flush(){if(flushing)return;flushing=true;try{
 const client=await getSupabaseClient(),{data}=await client.auth.getSession();if(!data.session)return;
 for(const entry of read().filter(e=>e.user_id===data.session.user.id)){
 try{const result=await api('rewards-exit',{session_id:entry.id});save(read().filter(e=>e.id!==entry.id));if(Number(result.amount)>0)notice(`${result.amount} ATM reward submitted for review. Payment appears after ledger confirmation.`);}
 catch(error){console.warn('Arcade reward exit retained for retry:',error.message);break;}
 }
 }finally{flushing=false;}}
 global.atmRewardsStart=function(game){
 const prior=sessions.get(game);if(prior)global.atmRewardsExit(game);
 const entry={sequence:0,id:null,chain:Promise.resolve(),closed:false};sessions.set(game,entry);
 entry.ready=api('rewards-start',{game_id:game}).then(async result=>{
 if(!result.enabled)return null;entry.id=result.id;entry.cap=result.max_coins;
 const client=await getSupabaseClient(),{data}=await client.auth.getSession();entry.user_id=data.session?.user.id;
 return result;
 }).catch(error=>{notice(error.message);return null;});
 };
 global.atmRewardsCoin=function(game){
 const entry=sessions.get(game);if(!entry||entry.closed)return;
 const sequence=++entry.sequence;
 entry.chain=entry.chain.then(async()=>{
 const enabled=await entry.ready;if(!enabled||sequence>entry.cap)return;
 // Preserve sequence: never skip a failed pickup and claim later ones as verified.
 for(let attempt=0;attempt<3;attempt++){
 try{await api('rewards-coin',{session_id:entry.id,sequence});return;}
 catch(error){if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,600));}
 }
 }).catch(error=>{entry.closed=true;notice(`Reward recording stopped: ${error.message}`);});
 };
 global.atmRewardsExit=async function(game){
 const entry=sessions.get(game);if(!entry)return;sessions.delete(game);entry.closed=true;
 await entry.ready;await entry.chain;if(!entry.id)return;
 save([...read().filter(e=>e.id!==entry.id),{id:entry.id,user_id:entry.user_id}]);await flush();
 };
 global.addEventListener('online',flush);
 global.addEventListener('pagehide',()=>{for(const entry of sessions.values())if(entry.id)save([...read().filter(e=>e.id!==entry.id),{id:entry.id,user_id:entry.user_id}]);});
 setInterval(flush,30000);setTimeout(flush,3000);
})(window);
