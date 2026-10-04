import { sendAdminSignInLink } from './auth.js';
const client=window.supabase.createClient('https://xnyjurertwohlqczaeux.supabase.co','sb_publishable_MspBOZia1KQFBItNYn6Z-Q_0xASDJzD',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,experimental:{passkey:true}}});
const $=id=>document.getElementById(id);let state=null;
const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const status=message=>{$('status').textContent=message;};
async function api(action,body){const {data}=await client.auth.getSession();if(!data.session)throw new Error('Sign in required.');const response=await fetch(`/api/leaderboards${body?'':`?action=${action}`}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${data.session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify({action,...body})}:{})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Request failed.');return result;}
function field(form,label,name,value,type='number'){const host=node('label',label),input=node('input');input.name=name;input.type=type;if(type==='checkbox')input.checked=!!value;else input.value=value??'';if(type==='number'){input.min='0';input.step='0.000001';}host.append(input);form.append(host);return input;}
function formRow(title){const row=node('article');row.className='row';row.append(node('h3',title));const form=node('form');form.className='fields';form.style.maxWidth='none';row.append(form);return {row,form};}
async function saveForm(event,action,body){event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{await api(action,body);status('Changes saved.');await load();}catch(error){status(error.message);}finally{button.disabled=false;}}
function renderPrices(){const host=$('priceRows');host.replaceChildren();const query=$('search').value.toLowerCase();for(const id of state.item_ids.filter(id=>id.includes(query))){const price=state.prices.find(p=>p.item_id===id)||{active:true,xrp_amount:'3'};const {row,form}=formRow(id.replaceAll(':',' · ').replaceAll('-',' '));for(const [key,label] of [['usd_amount','USD'],['atm_amount','ATM'],['rlusd_amount','RLUSD'],['xrp_amount','XRP']])field(form,label,key,price[key]);field(form,'For sale','active',price.active,'checkbox');const button=node('button','Save price');button.className='save';form.append(button);form.addEventListener('submit',event=>{const data=new FormData(form);saveForm(event,'admin-price',{item_id:id,active:form.elements.active.checked,...Object.fromEntries(['usd_amount','atm_amount','rlusd_amount','xrp_amount'].map(key=>[key,data.get(key)]))});});host.append(row);}}
function renderGames(){const host=$('gameRows');host.replaceChildren();for(const rule of state.rules){const {row,form}=formRow(rule.game_id.replaceAll('-',' ').toUpperCase());field(form,'ATM per coin','atm_per_coin',rule.atm_per_coin);field(form,'Daily ATM per player','daily_atm_limit',rule.daily_atm_limit);const cap=field(form,'Maximum coins per run','max_coins',rule.max_coins);cap.step='1';cap.min='1';cap.max='10000';field(form,'Payload arcade vault slug','payload_program_slug',rule.payload_program_slug,'text');field(form,'Rewards enabled','enabled',rule.enabled,'checkbox');const connect=node('button','Connect vault to Payload');connect.type='button';connect.addEventListener('click',async()=>{connect.disabled=true;try{const result=await api('admin-connect-vault',{slug:form.elements.payload_program_slug.value.trim()});status(`Vault connected. Session cap: ${result.maxAmountPerSession} ATM. Save the game settings to enable rewards.`);}catch(error){status(error.message);}finally{connect.disabled=false;}});form.append(connect);const button=node('button','Save rewards');button.className='save';form.append(button);form.addEventListener('submit',event=>saveForm(event,'admin-rule',{game_id:rule.game_id,enabled:form.elements.enabled.checked,atm_per_coin:form.elements.atm_per_coin.value,daily_atm_limit:form.elements.daily_atm_limit.value,max_coins:Number(form.elements.max_coins.value),payload_program_slug:form.elements.payload_program_slug.value.trim()}));host.append(row);}}
function actionButton(host,label,action,id){const button=node('button',label);button.type='button';button.addEventListener('click',async()=>{button.disabled=true;try{const result=await api(action,{id});status(result.status==='paid'?'Payment confirmed on the XRPL.':result.failure_reason||'Payment queued for automatic processing.');await load();}catch(error){status(error.message);}finally{button.disabled=false;}});host.append(button);}
function renderPayouts(){const host=$('payoutRows');host.replaceChildren();for(const reward of state.rewards){const row=node('article');row.className='row';row.append(node('h3',`${reward.amount||'0'} ATM · ${reward.status.toUpperCase()}`),node('p',`${reward.game_id} · ${reward.coins} coins · ${new Date(reward.started_at).toLocaleString()}`));const wallet=node('p',reward.wallet_address);wallet.className='wallet';row.append(wallet);if(reward.failure_reason)row.append(node('p',reward.failure_reason));if(reward.tx_hash){const link=node('a','View confirmed payment');link.href=`https://livenet.xrpl.org/transactions/${reward.tx_hash}`;link.target='_blank';link.rel='noopener';row.append(link);}const actions=node('div');actions.className='actions';if(['queued','pending'].includes(reward.status))actionButton(actions,'Retry automatic payment','admin-retry-payout',reward.id);row.append(actions);host.append(row);}if(!state.rewards.length)host.append(node('p','No reward claims yet.'));}
async function load(){state=await api('admin-state');$('login').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;$('pending').textContent=state.rewards.filter(r=>['queued','pending'].includes(r.status)).length;$('treasury').textContent='Payload · automatic';renderPrices();renderGames();renderPayouts();$('auditRows').replaceChildren(...state.audit.map(entry=>{const row=node('article');row.className='row';row.append(node('strong',entry.action),node('p',new Date(entry.created_at).toLocaleString()),node('p',JSON.stringify(entry.details)));return row;}));}
function showAuthState(session){
 const signedIn=!!session?.user;
 $('logout').hidden=!signedIn;
 $('loginForm').hidden=signedIn;
 $('passkey').hidden=signedIn||typeof client.auth.signInWithPasskey!=='function';
 $('signedIn').hidden=!signedIn;
 $('signedInMessage').textContent=signedIn?`Signed in as ${session.user.email||'your ATM Town account'}. Checking administrator access…`:'';
 if(!signedIn){state=null;$('dashboard').hidden=true;$('login').hidden=false;}
}
let authLoad=null;
async function refreshAccess(){
 if(authLoad)return authLoad;
 authLoad=(async()=>{
 const {data,error}=await client.auth.getSession();if(error)throw error;
 showAuthState(data.session);if(!data.session)return;
 try{await load();status('');}
 catch(error){
 $('dashboard').hidden=true;$('login').hidden=false;
 $('signedInMessage').textContent='Your ATM Town sign-in worked. Administrator access is not ready yet.';
 status(error.message);
 }
 })();
 try{return await authLoad;}finally{authLoad=null;}
}
$('loginForm').addEventListener('submit',async event=>{
 event.preventDefault();const form=event.target,button=form.querySelector('button');button.disabled=true;button.textContent='Sending…';
 try{await sendAdminSignInLink(client,form.elements.email.value,location.origin);status('Check your email and open the ATM Town sign-in link. It will return you to the control room.');}
 catch(error){status(error.message);}
 finally{button.disabled=false;button.textContent='Email me a sign-in link';}
});
$('passkey').addEventListener('click',async()=>{
 const button=$('passkey');button.disabled=true;status('Opening your ATM Town passkey…');
 try{const {error}=await client.auth.signInWithPasskey();if(error)throw error;await refreshAccess();}
 catch(error){status(`${error.message||'Passkey sign-in failed.'} You can also request an email sign-in link.`);}
 finally{button.disabled=false;}
});
$('logout').addEventListener('click',async()=>{
 const {error}=await client.auth.signOut({scope:'local'});if(error){status(error.message);return;}
 showAuthState(null);status('Signed out on this device.');
});
$('checkAccess').addEventListener('click',()=>refreshAccess().catch(error=>status(error.message)));
// Auth callbacks stay synchronous; defer requests until Supabase releases its auth lock.
client.auth.onAuthStateChange(()=>setTimeout(()=>refreshAccess().catch(error=>status(error.message)),0));
$('refresh').addEventListener('click',()=>load().catch(error=>status(error.message)));$('search').addEventListener('input',renderPrices);
for(const button of document.querySelectorAll('[data-tab]'))button.addEventListener('click',()=>{for(const other of document.querySelectorAll('[data-tab]')){const active=other===button;other.setAttribute('aria-pressed',String(active));$(other.dataset.tab).hidden=!active;}});
refreshAccess().catch(error=>status(error.message));
