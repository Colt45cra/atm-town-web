import { saveArcadeSettings } from './arcade-settings.js?v=saved-rewards-1';
import { fundingStep } from './funding-step.js?v=cancel-topup-1';
import { startFundingFlow, cancelFundingDraft } from './topup-flow.js?v=cancel-topup-1';
import { attachUsdEstimate } from './usd-estimate.js?v=usd-estimate-1';
import { mountAttributeEditor } from './attribute-editor.js?v=attribute-editor-1';
import { sendAdminSignInLink } from './auth.js';
const client=window.supabase.createClient('https://xnyjurertwohlqczaeux.supabase.co','sb_publishable_MspBOZia1KQFBItNYn6Z-Q_0xASDJzD',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,experimental:{passkey:true}}});
const $=id=>document.getElementById(id);let state=null;let stateRequest=0;let walletLoading=false;let walletRequest=0;let sponsorPrograms=[];let rewardWallets=[];
const topupDrafts=new Map();
const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const status=message=>{$('status').textContent=message;};
async function api(action,body){const {data}=await client.auth.getSession();if(!data.session)throw new Error('Sign in required.');const response=await fetch(`/api/leaderboards${body?'':`?action=${action}`}`,{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:`Bearer ${data.session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify({action,...body})}:{})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Request failed.');return result;}
function field(form,label,name,value,type='number'){const host=node('label',label),input=node('input');input.name=name;input.type=type;if(type==='checkbox')input.checked=!!value;else input.value=value??'';if(type==='number'){input.min='0';input.step='0.000001';}host.append(input);form.append(host);return input;}
function formRow(title){const row=node('article');row.className='row';row.append(node('h3',title));const form=node('form');form.className='fields';form.style.maxWidth='none';row.append(form);return {row,form};}
async function saveForm(event,action,body){event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{await api(action,body);status('Changes saved.');await load();}catch(error){status(error.message);}finally{button.disabled=false;}}

function tokenName(code='ATM'){if(!/^[A-F0-9]{40}$/i.test(code))return code;return code.match(/../g).map(byte=>String.fromCharCode(parseInt(byte,16))).join('').replace(/\0/g,'')||code;}
function balanceText(value){if(value==null)return 'Unavailable';const match=String(value).match(/^(-?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);if(!match)return 'Unavailable';const exponent=Number(match[4]||0);if(Math.abs(exponent)>100)return 'Unavailable';const decimals=(match[3]||'').length-exponent;let units=BigInt(match[2]+(match[3]||''));units=decimals>6?units/10n**BigInt(decimals-6):units*10n**BigInt(6-decimals);return `${match[1]}${units/1000000n}.${String(units%1000000n).padStart(6,'0')}`;}
const npcTokenNames={classic:'ATM',fuzzy:'FUZZY',luci:'666',miracle:'MIRACLES',triskeleton:'TRISK'};
function programName(slug){return sponsorPrograms.find(p=>p.slug===slug)?.name||({'atm-town-rewards':'Arcade games','luci-666-welcome':'Luci','atm-town-npc-atm':'ATM NPC','atm-town-npc-fuzzy':'Fuzzy','atm-town-npc-miracle':'Miracle','atm-town-npc-triskeleton':'Triskeleton'}[slug])||slug;}
async function loadSponsors(){const result=await api('admin-sponsor-tokens');sponsorPrograms=result.programs||[];}
function gameBalance(slug){const wallet=rewardWallets.find(w=>w.slug===slug);return wallet?balanceText(wallet.payoutBalance):'Loading…';}
async function beginTopup(slug,amount,button,host){return startFundingFlow({slug,amount,symbol:tokenName(rewardWallets.find(wallet=>wallet.slug===slug)?.currency||''),button,host,api,node,status,loadWallets});}

function renderPrices(){const host=$('priceRows');host.replaceChildren();const query=$('search').value.toLowerCase(),character=$('character').value;const items=state.catalog.items.filter(item=>item.characterIds.includes(character)&&`${item.name} ${item.id}`.toLowerCase().includes(query));$('priceCount').textContent=`${items.length} attributes`;for(const item of items){const id=item.id,price=state.prices.find(p=>p.item_id===id)||{active:true,xrp_amount:'3'};const {row,form}=formRow(item.name);row.classList.add('price-card');for(const [key,label] of [['usd_amount','USD'],['atm_amount','ATM'],['rlusd_amount','RLUSD'],['xrp_amount','XRP']])field(form,label,key,price[key]);field(form,'For sale','active',price.active,'checkbox');const button=node('button','Save');button.className='save';form.append(button);form.addEventListener('submit',event=>{const data=new FormData(form);saveForm(event,'admin-price',{item_id:id,active:form.elements.active.checked,...Object.fromEntries(['usd_amount','atm_amount','rlusd_amount','xrp_amount'].map(key=>[key,data.get(key)]))});});const edit=node('button','Sprite & movement');edit.type='button';edit.className='edit-attribute';edit.addEventListener('click',()=>attributeEditor.open(item,price));row.append(edit);host.append(row);}if(!items.length)host.append(node('p',query?'No matching attributes for this character.':'No attributes are available for this playable character yet.'));}
function renderCharacters(){const selected=$('character').value||'classic';$('character').replaceChildren(...state.catalog.characters.map(character=>{const option=node('option',character.name);option.value=character.id;return option;}));$('character').value=state.catalog.characters.some(c=>c.id===selected)?selected:'classic';}
async function loadWallets(){
 if(walletLoading||!state)return;walletLoading=true;const request=++walletRequest;$('walletRefresh').disabled=true;
 try{const result=await api('admin-wallets');if(!state||request!==walletRequest)return;rewardWallets=result.wallets||[];
 const host=$('walletRows');host.replaceChildren();const groups=new Map();
 for(const wallet of rewardWallets){if(wallet.slug==='atm-town-npc-miracle'&&wallet.currency==='ATM')continue;if(wallet.error){host.append(node('p',`${programName(wallet.slug)}: ${wallet.error}`));continue;}const address=wallet.walletAddress;let group=groups.get(address);if(!group){group={address,tokens:new Map()};groups.set(address,group);}const key=`${wallet.currency}:${wallet.issuer||''}`;if(!group.tokens.has(key))group.tokens.set(key,[]);group.tokens.get(key).push(wallet);}
 for(const group of groups.values()){const row=node('article');row.className='row reward-wallet';row.append(node('h3','ATM Town rewards wallet'));const address=node('a',group.address);address.className='wallet';address.href=`https://livenet.xrpl.org/accounts/${group.address}`;address.target='_blank';address.rel='noopener';row.append(address);const list=node('div');list.className='token-list';
 for(const wallets of group.tokens.values()){const wallet=wallets[0],draftKey=`${group.address}:${wallet.currency}:${wallet.issuer||''}`,line=node('div');line.className='token-line';const symbol=tokenName(wallet.currency);line.append(node('strong',`${symbol} balance`),node('span',balanceText(wallet.payoutBalance)));const add=node('button','Add more');add.type='button';line.append(add);list.append(line);const details=node('details');details.className='token-topup';details.hidden=topupDrafts.get(draftKey)?.open!==true;details.open=!details.hidden;const summary=node('summary',`Add ${symbol}`);details.append(summary);const form=node('form');form.className='topup-form';const amount=field(form,`Amount (${symbol})`,'amount','');amount.required=true;amount.min='0.000001';const label=node('label','Use for'),select=node('select');for(const item of wallets){const option=node('option',programName(item.slug));option.value=item.slug;select.append(option);}label.append(select);form.append(label);const draft=topupDrafts.get(draftKey);if(draft&&wallets.some(w=>w.slug===draft.slug))select.value=draft.slug;const button=node('button','Review top-up');form.append(button);const fundingNote=node('p');fundingNote.className='funding-note';form.append(fundingNote);const cancel=node('button','Cancel top-up');cancel.type='button';cancel.className='cancel-topup';form.append(cancel);const requestHost=node('div');details.append(form,requestHost);cancel.addEventListener('click',async()=>{const selected=wallets.find(w=>w.slug===select.value);if(selected?.cycle?.status!=='pending')return;button.disabled=true;try{await cancelFundingDraft({slug:select.value,cycleId:selected.cycle.id,button:cancel,host:requestHost,api,status,onCancelled:async()=>{topupDrafts.set(draftKey,{slug:select.value,amount:'',open:true});await loadWallets();}});}finally{button.disabled=false;}});list.append(details);const estimate=attachUsdEstimate({form,input:amount,details,token:wallet,getPrice:()=>api('admin-token-price',{slug:select.value})});const saveDraft=()=>topupDrafts.set(draftKey,{slug:select.value,amount:amount.disabled?(topupDrafts.get(draftKey)?.amount||''):amount.value,open:!details.hidden});amount.addEventListener('input',saveDraft);add.addEventListener('click',()=>{details.hidden=!details.hidden;details.open=!details.hidden;saveDraft();estimate.refresh();});const update=()=>{const selected=wallets.find(w=>w.slug===select.value);amount.value=selected.cycle?.status==='pending'?selected.cycle.payoutBudget:(topupDrafts.get(draftKey)?.amount||'');amount.disabled=selected.cycle?.status==='pending';const step=fundingStep(selected.cycle?.status==='pending'?selected.cycle:null,symbol);button.textContent=step.label;fundingNote.textContent=step.message;cancel.hidden=selected.cycle?.status!=='pending'||selected.cycle?.kind==='initial';};select.addEventListener('change',()=>{update();saveDraft();estimate.render();estimate.refresh();});update();estimate.render();if(!details.hidden)estimate.refresh();form.addEventListener('submit',event=>{event.preventDefault();beginTopup(select.value,amount.value,button,requestHost);});if(wallet.balanceError)list.append(node('p',wallet.balanceError));}
 if(!rewardWallets.some(w=>w.slug==='atm-town-npc-miracle'&&!w.error&&w.currency!=='ATM')){const line=node('div');line.className='token-line';line.append(node('strong','MIRACLES balance'),node('span','Token setup needed'));const setup=node('button','Set up token');setup.addEventListener('click',()=>document.querySelector('[data-tab="npcs"]').click());line.append(setup);list.append(line);}
 const fees=rewardWallets.find(w=>w.walletAddress===group.address&&w.xrpFeeBalance!=null);if(fees)row.append(node('p',`XRP available for fees: ${balanceText(fees.xrpFeeBalance)}`));row.append(list);host.append(row);}
 if(!groups.size)host.append(node('p','Reward wallet balances are unavailable. Refresh to try again.'));
 for(const element of document.querySelectorAll('[data-game-balance]'))element.textContent=gameBalance(element.dataset.gameBalance);
 }catch(error){$('walletRows').replaceChildren(node('p',error.message));}finally{walletLoading=false;$('walletRefresh').disabled=false;}}
function renderGames(){const host=$('gameRows');host.replaceChildren();for(const rule of state.rules){const {row,form}=formRow(rule.game_id.replaceAll('-',' ').toUpperCase());const label=node('label','Payout token'),select=node('select');select.name='payload_program_slug';for(const program of sponsorPrograms){const option=node('option',`${tokenName(program.currency)} · ${program.name||'Sponsor'}`);option.value=program.slug;select.append(option);}select.value=rule.payload_program_slug||'atm-town-rewards';label.append(select);form.append(label);const metric=node('p');metric.className='game-token-balance';const caption=node('span'),balance=node('strong');metric.append(caption,balance);row.insertBefore(metric,form);const sync=()=>{const program=sponsorPrograms.find(p=>p.slug===select.value),symbol=tokenName(program?.currency||rule.reward_currency);caption.textContent=`${symbol} in rewards wallet: `;balance.dataset.gameBalance=select.value;balance.textContent=gameBalance(select.value);rateLabel.firstChild.textContent=`${symbol} per coin`;limitLabel.firstChild.textContent=`Daily ${symbol} per player`;};const rate=field(form,'Tokens per coin','atm_per_coin',rule.atm_per_coin),rateLabel=rate.parentElement;const limit=field(form,'Daily tokens per player','daily_atm_limit',rule.daily_atm_limit),limitLabel=limit.parentElement;const cap=field(form,'Maximum coins per run','max_coins',rule.max_coins);cap.step='1';cap.min='1';cap.max='10000';field(form,'Rewards enabled','enabled',rule.enabled,'checkbox');select.addEventListener('change',sync);sync();const button=node('button','Save rewards');button.className='save';form.append(button);form.addEventListener('submit',event=>{event.preventDefault();stateRequest++;saveArcadeSettings({form,body:{game_id:rule.game_id,enabled:form.elements.enabled.checked,atm_per_coin:rate.value,daily_atm_limit:limit.value,max_coins:Number(cap.value),payload_program_slug:select.value},api,status,onSaved:saved=>{stateRequest++;if(state)state.rules=state.rules.map(current=>current.game_id===saved.game_id?saved:current);sync();}});});host.append(row);}}
function actionButton(host,label,action,id){const button=node('button',label);button.type='button';button.addEventListener('click',async()=>{button.disabled=true;try{const result=await api(action,{id});status(result.status==='paid'?'Payment confirmed on the XRPL.':result.failure_reason||'Payment queued for automatic processing.');await load();}catch(error){status(error.message);}finally{button.disabled=false;}});host.append(button);}
function renderPayouts(){const host=$('payoutRows');host.replaceChildren();for(const reward of state.rewards){const row=node('article');row.className='row';row.append(node('h3',`${reward.amount||'0'} ${tokenName(reward.reward_currency)} · ${reward.status.toUpperCase()}`),node('p',`${reward.game_id} · ${reward.coins} coins · ${new Date(reward.started_at).toLocaleString()}`));const wallet=node('p',reward.wallet_address);wallet.className='wallet';row.append(wallet);if(reward.failure_reason)row.append(node('p',reward.failure_reason));if(reward.tx_hash){const link=node('a','View confirmed payment');link.href=`https://livenet.xrpl.org/transactions/${reward.tx_hash}`;link.target='_blank';link.rel='noopener';row.append(link);}const actions=node('div');actions.className='actions';if(['queued','pending'].includes(reward.status))actionButton(actions,'Retry automatic payment','admin-retry-payout',reward.id);row.append(actions);host.append(row);}if(!state.rewards.length)host.append(node('p','No reward claims yet.'));}
async function load(){const request=++stateRequest;const next=await api('admin-state');if(request!==stateRequest)return;await loadSponsors();if(request!==stateRequest)return;state=next;$('login').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;$('pending').textContent=state.rewards.filter(r=>['queued','pending'].includes(r.status)).length;$('treasury').textContent='Payload · automatic';renderCharacters();attributeEditor.refresh();renderPrices();renderGames();renderPayouts();loadWallets();loadNpcs();$('auditRows').replaceChildren(...state.audit.map(entry=>{const row=node('article');row.className='row';row.append(node('strong',entry.action),node('p',new Date(entry.created_at).toLocaleString()),node('p',JSON.stringify(entry.details)));return row;}));}
function showAuthState(session){
 const signedIn=!!session?.user;
 $('logout').hidden=!signedIn;
 $('loginForm').hidden=signedIn;
 $('passkey').hidden=signedIn||typeof client.auth.signInWithPasskey!=='function';
 $('signedIn').hidden=!signedIn;
 $('signedInMessage').textContent=signedIn?`Signed in as ${session.user.email||'your ATM Town account'}. Checking administrator access…`:'';
 if(!signedIn){stateRequest++;state=null;walletRequest++;$('walletRows').replaceChildren();$('dashboard').hidden=true;$('login').hidden=false;}
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

$('character').addEventListener('change',renderPrices);$('walletRefresh').addEventListener('click',loadWallets);setInterval(()=>{if(state&&!document.hidden)loadWallets();},60000);

let npcLoading=false;
async function loadNpcs(){
 if(npcLoading||!state)return; npcLoading=true;
 try{
  const result=await api('admin-npcs');if(!state)return;
  const host=$('npcRows');host.replaceChildren();
  for(const npc of result.npcs){
   const {row,form}=formRow(`${npc.name} · ${npcTokenNames[npc.id]||tokenName(npc.currency)}`);row.classList.add('price-card');
   if(npc.error){row.append(node('p',npc.error));host.append(row);continue;}
   const needsSetup=npc.id!=='classic'&&npc.id!=='luci'&&npc.currency==='ATM';
   if(npc.status==='awaiting_funding'){
    const setup=node('details'),heading=node('summary',needsSetup?'Set up project token':'Project token settings');setup.append(heading);setup.open=needsSetup;
    const tokenForm=node('form');tokenForm.className='fields';const code=field(tokenForm,'Token code','currency',needsSetup?npcTokenNames[npc.id]:tokenName(npc.currency),'text'),issuer=field(tokenForm,'XRPL issuer address','issuer',needsSetup?'':npc.issuer,'text');code.required=true;issuer.required=true;const save=node('button','Save project token');tokenForm.append(save);setup.append(tokenForm);row.append(setup);
    tokenForm.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;try{await api('admin-npc-token',{npc_id:npc.id,currency:code.value,issuer:issuer.value});status('Project token saved. Add tokens to the reward wallet, then enable rewards.');await loadNpcsAfterSave();await loadWallets();}catch(error){status(error.message);}finally{save.disabled=false;}});
   }
   field(form,`Reward per claim (${needsSetup?npcTokenNames[npc.id]:tokenName(npc.currency)})`,'amount',npc.amount);
   const label=node('label','How often per wallet'),select=node('select');select.name='interval';
   for(const [value,text] of [['once','Once ever'],['daily','Once per day'],['weekly','Once per week'],['monthly','Once per month']]){const option=node('option',text);option.value=value;select.append(option);}
   select.value=npc.interval;label.append(select);form.append(label);
   field(form,'Rewards enabled','enabled',npc.enabled,'checkbox');
   const button=node('button','Save NPC rewards');button.disabled=needsSetup;form.append(button);
   row.append(node('p',npc.status==='awaiting_funding'?'Top up this allowance under Reward wallets to enable it.':`Pays ${tokenName(npc.currency)} from the shared rewards wallet.`));
   form.addEventListener('submit',async event=>{
    event.preventDefault();button.disabled=true;
    try{await api('admin-npc-rule',{npc_id:npc.id,amount:form.elements.amount.value,interval:select.value,enabled:form.elements.enabled.checked});status('NPC reward settings saved.');await loadNpcsAfterSave();}
    catch(error){status(error.message);}finally{button.disabled=false;}
   });host.append(row);
  }
 }catch(error){$('npcRows').replaceChildren(node('p',error.message));}finally{npcLoading=false;}
}
async function loadNpcsAfterSave(){npcLoading=false;await loadNpcs();}

const sponsorHost=$('sponsorSetup');if(sponsorHost){const form=node('form');form.className='fields';const name=field(form,'Sponsor name','name','','text'),code=field(form,'Token code','currency','','text'),issuer=field(form,'XRPL issuer address','issuer','','text'),slug=field(form,'Unique sponsor name','slug','','text');slug.placeholder='fuzzy';for(const input of [name,code,issuer,slug])input.required=true;const button=node('button','Add sponsor token');form.append(button);sponsorHost.append(form);form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;try{await api('admin-sponsor-token',{name:name.value,currency:code.value,issuer:issuer.value,slug:`atm-town-arcade-${slug.value.trim().toLowerCase()}`});status('Sponsor token added. Add its tokens to the rewards wallet, then select it for a game.');await loadSponsors();renderGames();await loadWallets();form.reset();}catch(error){status(error.message);}finally{button.disabled=false;}});}

const attributeEditor=mountAttributeEditor({host:$('attributeEditor'),client,api,getCatalog:()=>state?.catalog||{characters:[],items:[]},onSaved:load,status});

