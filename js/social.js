(function(global){
 'use strict';
 let state={relationships:[],preferences:{player_pings:true,world_events:false}};
 const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function api(action,body){if(typeof global.atmApiWithAuth!=='function')throw Error('Sign in to use friends and notifications.');return global.atmApiWithAuth('/api/embedded-wallet?action='+action,body?{method:'POST',body:JSON.stringify(body)}:{});}
 function publish(data){state=data;global.dispatchEvent(new CustomEvent('atm:social-changed'));return state;}
 async function refresh(){try{return publish(await api('social-state'));}catch(error){state={relationships:[],preferences:{player_pings:true,world_events:false}};throw error;}}
 function button(id){const r=state.relationships.find(x=>x.user_id===id),status=r?.status;return `<button type="button" class="peopleHubPingBtn" data-friend="${esc(id)}" data-friend-action="${status==='incoming'?'friend-accept':status?'friend-remove':'friend-request'}">${status==='incoming'?'Accept friend':status==='outgoing'?'Cancel request':status==='friends'?'Remove friend':'Add friend'}</button>`;}
 function bind(host){host?.querySelectorAll('[data-friend]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{publish(await api(b.dataset.friendAction,{target_user_id:b.dataset.friend}));}catch(e){b.disabled=false;global.alert(e.message||'Friend action failed.');}});}
 function section(){const rows=state.relationships;return `<div class="peopleHubSection"><div class="peopleHubSectionTitle"><b>Friends</b><span>${rows.filter(r=>r.status==='friends').length}</span></div><p class="peopleHubCopy">Add players from Online. Requests become friends after they accept.</p>${rows.length?rows.map(r=>`<div class="peopleHubPerson"><span class="peopleHubPersonMain"><b>${esc(r.display_name)}</b><span>${r.status==='incoming'?'Friend request':r.status==='outgoing'?'Request sent':'Friend'}</span></span><span class="peopleHubPersonActions">${r.status==='friends'?`<button class="peopleHubPingBtn" data-people-ping="${esc(r.user_id)}">Ping</button>`:''}${button(r.user_id)}${r.status==='incoming'?`<button class="peopleHubPingBtn" data-friend="${esc(r.user_id)}" data-friend-action="friend-remove">Decline</button>`:''}</span></div>`).join(''):'<p class="peopleHubEmpty">No friends yet.</p>'}</div>`;}
 async function refreshSettings(){
  const main=document.querySelector('.townSettingsBody');if(!main)return;
  let host=document.getElementById('townNotificationSettings');if(!host){host=document.createElement('section');host.id='townNotificationSettings';host.className='atmThemeCard';main.insertBefore(host,main.querySelector('.atmAppearanceDetails'));}
  host.innerHTML='<h3>Notifications</h3><p role="status">Loading notification settings…</p>';
  try{await refresh();}catch(e){host.querySelector('p').textContent=e.message;return;}
  host.innerHTML='<h3>Notifications</h3><label style="display:flex;gap:12px;padding:12px 0"><input type="checkbox" id="townNotifyEvents"> World events starting</label><label style="display:flex;gap:12px;padding:12px 0"><input type="checkbox" id="townNotifyPings"> Players pinging me</label><button type="button" class="atmPrimaryButton" id="townEnableNotifications">Enable notifications on this device</button><p id="townNotifyStatus" role="status" aria-live="polite"></p>';
  const events=host.querySelector('#townNotifyEvents'),pings=host.querySelector('#townNotifyPings'),status=host.querySelector('#townNotifyStatus');events.checked=state.preferences.world_events;pings.checked=state.preferences.player_pings;
  async function save(){events.disabled=pings.disabled=true;try{publish(await api('notification-preferences',{world_events:events.checked,player_pings:pings.checked}));status.textContent='Notification choices saved.';}catch(e){events.checked=state.preferences.world_events;pings.checked=state.preferences.player_pings;status.textContent=e.message;}finally{events.disabled=pings.disabled=false;}}
  events.onchange=pings.onchange=save;
  host.querySelector('button').onclick=async function(){this.disabled=true;try{await global.ATMPWA.enableNotifications();status.textContent='Notifications enabled on this device.';}catch(e){status.textContent=e.message;}finally{this.disabled=false;}};
  const device=global.ATMPWA?.getState?.();status.textContent=device?.subscribed?'Notifications enabled on this device.':'Choose alerts above, then enable notifications on this device.';
 }
 global.ATMSocial={refresh,refreshSettings,button,bind,section,getState:()=>state};
})(window);
