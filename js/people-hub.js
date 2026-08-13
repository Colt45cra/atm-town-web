(function ATMPeopleHubModule(){
  'use strict';

  const CHARACTER_THUMBS=Object.freeze({
    classic:'assets/characters/thumbnails/character-atm.webp',fuzzy:'assets/characters/thumbnails/character-fuzzy.webp',miracle:'assets/characters/thumbnails/character-miracle.webp',luci:'assets/characters/thumbnails/character-luci.webp',triskeleton:'assets/characters/thumbnails/character-triskeleton.webp',phnix:'assets/characters/thumbnails/character-phnix.webp',bear:'assets/characters/thumbnails/character-bear.webp',xoge:'assets/characters/thumbnails/character-xoge.webp',flippy:'assets/characters/thumbnails/character-flippy.webp'
  });
  const PAGES=['online','people','pay'];
  let state={open:false,page:0,onlineCount:1,game:{online:[],encounters:[]},pay:{ready:false,pendingRequestCount:0,recentPeople:[],incomingRequests:[],recentActivity:[]},searchQuery:'',searchResults:[]};
  let refreshTimer=null,searchTimer=null,swipeStart=null;

  function esc(value){return String(value??'').replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));}
  function normalizePerson(value){
    if(!value||typeof value!=='object')return null;
    const pay=value.atmPay||value;
    const userId=String(pay?.user_id||'');const handle=String(pay?.handle||'').toLowerCase();
    return {session_id:String(value.session_id||''),user_id:userId,handle:/^[a-z0-9_]{3,20}$/.test(handle)?handle:'',display_name:String(pay?.display_name||value.name||'ATM Player').slice(0,30),character_id:String(pay?.character_id||value.character_id||'classic').slice(0,40),map:String(value.map||''),nearby:!!value.nearby,distance:Number.isFinite(value.distance)?Number(value.distance):null,is_self:!!value.is_self,atm_pay_ready:!!userId&&/^[a-z0-9_]{3,20}$/.test(handle)};
  }
  function thumb(person){return CHARACTER_THUMBS[String(person?.character_id||'classic')]||CHARACTER_THUMBS.classic;}
  function avatar(person){return `<span class="peopleHubAvatar"><img src="${esc(thumb(person))}" alt=""></span>`;}
  function requestCount(){return Number(state.pay?.pendingRequestCount||0);}
  function nearbyCount(){return (state.game?.online||[]).filter(item=>!item.is_self&&item.nearby).length;}
  function ensureTrigger(){
    const el=document.getElementById('onlineBadge');if(!el)return null;
    el.classList.add('peopleHubTrigger');el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label','Open people, online players, and ATM Pay');
    if(el.dataset.peopleHubBound!=='1'){
      el.dataset.peopleHubBound='1';el.addEventListener('click',()=>open('online'));el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open('online');}});
    }
    return el;
  }
  function refreshTrigger(){
    const el=ensureTrigger();if(!el)return;
    const near=nearbyCount(),requests=requestCount();
    el.innerHTML=`<span class="peopleHubTriggerText">${Math.max(1,Number(state.onlineCount||1))} online</span>${near?'<span class="peopleHubNearbyDot" title="Players nearby"></span>':''}${requests?`<span class="peopleHubRequestBadge">${Math.min(99,requests)}</span>`:''}`;
  }
  function ensureUi(){
    if(document.getElementById('atmPeopleHubModal')){ensureTrigger();return;}
    const style=document.createElement('style');style.textContent=`
#onlineBadge.peopleHubTrigger{cursor:pointer;display:flex;align-items:center;gap:5px;user-select:none;pointer-events:auto}.peopleHubTrigger:focus-visible{outline:2px solid #70f9c8;outline-offset:2px}.peopleHubNearbyDot{width:7px;height:7px;border-radius:50%;background:#70f9c8;box-shadow:0 0 9px rgba(112,249,200,.9)}.peopleHubRequestBadge{display:grid;place-items:center;min-width:15px;height:15px;padding:0 3px;border-radius:999px;background:#ffd166;color:#201500;font-size:8px;font-weight:1000}
#atmPeopleHubModal{position:fixed;inset:0;z-index:10070;display:none;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom));background:rgba(0,7,12,.82);backdrop-filter:blur(10px)}#atmPeopleHubModal.open{display:flex}.peopleHubCard{width:min(590px,100%);max-height:min(790px,92dvh);display:flex;flex-direction:column;overflow:hidden;background:linear-gradient(180deg,#0c1d29,#07131c);border:1px solid rgba(88,241,230,.25);border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.55);color:#eafcff}.peopleHubHead{display:flex;align-items:flex-start;gap:10px;padding:16px 16px 10px}.peopleHubHeadText{min-width:0;flex:1}.peopleHubHead h3{margin:0;font-size:22px}.peopleHubHead small{display:block;color:#8fb1bf;margin-top:4px;font-size:11px;line-height:1.35}.peopleHubClose{width:38px;height:38px;border:0;border-radius:11px;background:#182b37;color:#eafcff;font-size:21px}.peopleHubTabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:0 16px 11px}.peopleHubTab{position:relative;border:1px solid rgba(88,241,230,.12);background:#102431;color:#a8c4ce;border-radius:11px;padding:10px 6px;font-size:9px;font-weight:1000;letter-spacing:.04em;text-transform:uppercase}.peopleHubTab.active{background:rgba(88,241,230,.12);color:#70f9c8;border-color:rgba(88,241,230,.3)}.peopleHubTabBadge{display:inline-grid;place-items:center;min-width:15px;height:15px;padding:0 3px;margin-left:4px;border-radius:999px;background:#ffd166;color:#251900;font-size:8px}.peopleHubViewport{overflow:hidden;flex:1;min-height:0;touch-action:pan-y}.peopleHubTrack{height:100%;display:flex;transition:transform .28s cubic-bezier(.2,.8,.2,1);will-change:transform}.peopleHubPage{flex:0 0 100%;height:100%;overflow:auto;padding:0 16px 18px;box-sizing:border-box}.peopleHubSection{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);border-radius:15px;padding:12px;margin-bottom:10px}.peopleHubSectionTitle{display:flex;align-items:center;justify-content:space-between;gap:8px}.peopleHubSectionTitle b{font-size:12px}.peopleHubSectionTitle span{font-size:9px;color:#70f9c8;font-weight:900}.peopleHubCopy{margin:5px 0 0;color:#8fb1bf;font-size:10px;line-height:1.45}.peopleHubPerson{display:flex;align-items:center;gap:10px;width:100%;padding:9px 0;border:0;border-bottom:1px solid rgba(255,255,255,.06);background:transparent;color:#eafcff;text-align:left}.peopleHubPerson:last-child{border-bottom:0}.peopleHubAvatar{width:40px;height:40px;flex:0 0 40px;border-radius:13px;overflow:hidden;border:1px solid rgba(88,241,230,.22);background:#102631}.peopleHubAvatar img{width:100%;height:100%;object-fit:cover}.peopleHubPersonMain{min-width:0;flex:1}.peopleHubPersonMain b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.peopleHubPersonMain span{display:block;margin-top:2px;color:#8fb1bf;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.peopleHubHandle{color:#70f9c8!important}.peopleHubBadges{display:flex;gap:5px;flex-wrap:wrap;margin-top:4px}.peopleHubPill{display:inline-flex;padding:3px 6px;border-radius:999px;background:rgba(255,255,255,.06);font-size:7px!important;font-weight:1000;text-transform:uppercase;color:#9db9c5!important}.peopleHubPill.near{background:rgba(112,249,200,.09);color:#70f9c8!important}.peopleHubPayBtn{border:1px solid rgba(112,249,200,.24);background:rgba(112,249,200,.09);color:#70f9c8;border-radius:10px;padding:8px 10px;font-size:8px;font-weight:1000;text-transform:uppercase}.peopleHubEmpty{padding:22px 10px;text-align:center;color:#7f9aa6;font-size:10px}.peopleHubSearch{width:100%;box-sizing:border-box;border-radius:11px;border:1px solid rgba(88,241,230,.18);background:#041018;color:#fff;padding:11px 12px;font-size:12px;outline:none;margin-top:9px}.peopleHubRequest{border-color:rgba(255,209,102,.22);background:rgba(255,209,102,.035)}.peopleHubRequestActions{display:flex;gap:7px;margin-top:8px}.peopleHubPrimary{width:100%;border:0;border-radius:11px;padding:11px 12px;background:linear-gradient(90deg,#58f1e6,#70f9c8);color:#052029;font-size:9px;font-weight:1000;text-transform:uppercase}.peopleHubSecondary{width:100%;border:1px solid rgba(88,241,230,.14);border-radius:11px;padding:10px 12px;background:#102431;color:#dffcff;font-size:9px;font-weight:1000;text-transform:uppercase}.peopleHubActivityLine{display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)}.peopleHubActivityLine:last-child{border-bottom:0}.peopleHubActivityLine .peopleHubAvatar{width:32px;height:32px;flex-basis:32px;border-radius:10px}.peopleHubAmount{margin-left:auto;font-weight:1000;font-size:11px}.peopleHubDots{display:flex;justify-content:center;gap:5px;padding:0 0 10px}.peopleHubDot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.2)}.peopleHubDot.active{background:#70f9c8;box-shadow:0 0 7px rgba(112,249,200,.7)}
@media(max-width:560px){.peopleHubCard{border-radius:17px}.peopleHubHead{padding:14px 14px 9px}.peopleHubTabs{padding:0 14px 9px}.peopleHubPage{padding:0 14px 14px}}
`;
    document.head.appendChild(style);
    const modal=document.createElement('div');modal.id='atmPeopleHubModal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','atmPeopleHubTitle');
    modal.innerHTML=`<div class="peopleHubCard"><div class="peopleHubHead"><div class="peopleHubHeadText"><h3 id="atmPeopleHubTitle">People</h3><small>See who’s online, find people you know, and pay without wallet addresses.</small></div><button class="peopleHubClose" id="atmPeopleHubClose" type="button" aria-label="Close">×</button></div><div class="peopleHubTabs"><button class="peopleHubTab active" data-people-page="0" type="button">Online</button><button class="peopleHubTab" data-people-page="1" type="button">People</button><button class="peopleHubTab" data-people-page="2" type="button">Pay <span class="peopleHubTabBadge" id="atmPeopleHubPayBadge" hidden></span></button></div><div class="peopleHubViewport" id="atmPeopleHubViewport"><div class="peopleHubTrack" id="atmPeopleHubTrack"><section class="peopleHubPage" id="atmPeopleHubOnline"></section><section class="peopleHubPage" id="atmPeopleHubPeople"></section><section class="peopleHubPage" id="atmPeopleHubPay"></section></div></div><div class="peopleHubDots">${PAGES.map((_,i)=>`<span class="peopleHubDot${i===0?' active':''}" data-people-dot="${i}"></span>`).join('')}</div></div>`;
    document.body.appendChild(modal);
    document.getElementById('atmPeopleHubClose')?.addEventListener('click',close);
    modal.addEventListener('click',event=>{if(event.target===modal)close();});
    modal.querySelectorAll('[data-people-page]').forEach(button=>button.addEventListener('click',()=>setPage(Number(button.dataset.peoplePage||0))));
    const viewport=document.getElementById('atmPeopleHubViewport');
    viewport?.addEventListener('pointerdown',event=>{if(event.target.closest('button,input,a'))return;swipeStart={x:event.clientX,y:event.clientY,id:event.pointerId};},{passive:true});
    viewport?.addEventListener('pointerup',event=>{if(!swipeStart||event.pointerId!==swipeStart.id)return;const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;swipeStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.25)setPage(state.page+(dx<0?1:-1));},{passive:true});
    ensureTrigger();
  }
  function setPage(index){
    state.page=Math.max(0,Math.min(PAGES.length-1,Number(index)||0));
    const track=document.getElementById('atmPeopleHubTrack');if(track)track.style.transform=`translateX(-${state.page*100}%)`;
    document.querySelectorAll('#atmPeopleHubModal [data-people-page]').forEach((el,i)=>el.classList.toggle('active',i===state.page));
    document.querySelectorAll('#atmPeopleHubModal [data-people-dot]').forEach((el,i)=>el.classList.toggle('active',i===state.page));
    if(state.page===2)renderPay();
  }
  function mapLabel(map){return ({town:'ATM Town',hq:'ATM HQ',gallery:'NFT Gallery',arcade:'Arcade',lounge:'Lounge'})[String(map||'')]||String(map||'Online');}
  function statusText(person){if(person.is_self)return 'This is you';if(person.nearby)return 'Right near you';if(person.map)return `In ${mapLabel(person.map)}`;return 'Online';}
  function resolvePersonById(id){
    const all=[...(state.game.online||[]),...(state.game.encounters||[]),...(state.pay.recentPeople||[]),...(state.searchResults||[])].map(normalizePerson).filter(Boolean);
    return all.find(p=>p.user_id===id)||null;
  }
  function payPerson(person){if(!person?.atm_pay_ready)return;close();window.ATMPay?.openToRecipient?.({user_id:person.user_id,handle:person.handle,display_name:person.display_name,character_id:person.character_id,atm_pay_ready:true});}
  function personRow(person,{showStatus=true,pay=true}={}){
    const p=normalizePerson(person);if(!p)return '';
    const payReady=pay&&p.atm_pay_ready&&!p.is_self;
    return `<div class="peopleHubPerson">${avatar(p)}<span class="peopleHubPersonMain"><b>${esc(p.display_name)}${p.is_self?' · You':''}</b>${p.handle?`<span class="peopleHubHandle">@${esc(p.handle)}</span>`:''}${showStatus?`<span>${esc(statusText(p))}</span>`:''}<span class="peopleHubBadges">${p.nearby&&!p.is_self?'<span class="peopleHubPill near">Nearby</span>':''}${p.atm_pay_ready?'<span class="peopleHubPill">ATM Pay</span>':''}</span></span>${payReady?`<button class="peopleHubPayBtn" type="button" data-people-pay="${esc(p.user_id)}">Pay</button>`:''}</div>`;
  }
  function bindPayButtons(host){host?.querySelectorAll('[data-people-pay]').forEach(button=>button.addEventListener('click',()=>{const person=resolvePersonById(String(button.dataset.peoplePay||''));if(person)payPerson(person);}));}
  function renderOnline(){
    const host=document.getElementById('atmPeopleHubOnline');if(!host)return;
    const online=(state.game.online||[]).map(normalizePerson).filter(Boolean);
    const near=online.filter(p=>p.nearby&&!p.is_self).length;
    host.innerHTML=`<div class="peopleHubSection"><div class="peopleHubSectionTitle"><b>Online now</b><span>${online.length||state.onlineCount} PLAYER${(online.length||state.onlineCount)===1?'':'S'}</span></div><p class="peopleHubCopy">Nearby players are pinned first. Tap Pay only when you actually want to send money.</p>${online.length?online.map(p=>personRow(p)).join(''):'<div class="peopleHubEmpty">No other players are visible in this room yet.</div>'}</div>${near?`<div class="peopleHubSection"><div class="peopleHubSectionTitle"><b>Nearby</b><span>${near}</span></div><p class="peopleHubCopy">The green dot on the player-count icon appears whenever someone is close enough for quick social actions.</p></div>`:''}`;
    bindPayButtons(host);
  }
  function dedupePeople(list){const out=[],seen=new Set();for(const raw of list){const p=normalizePerson(raw);const key=p?.user_id||p?.session_id;if(!p||!key||seen.has(key))continue;seen.add(key);out.push(p);}return out;}
  function renderPeople(){
    const host=document.getElementById('atmPeopleHubPeople');if(!host)return;
    const paymentPeople=dedupePeople(state.pay.recentPeople||[]);
    const encounters=dedupePeople(state.game.encounters||[]).filter(p=>!paymentPeople.some(x=>x.user_id&&x.user_id===p.user_id));
    host.innerHTML=`<div class="peopleHubSection"><div class="peopleHubSectionTitle"><b>Recent payments</b><span>${paymentPeople.length}</span></div><p class="peopleHubCopy">People you’ve paid or requested stay easy to find, even when they’re offline.</p>${paymentPeople.length?paymentPeople.map(p=>personRow(p,{showStatus:false})).join(''):'<div class="peopleHubEmpty">Your payment contacts will appear here.</div>'}</div><div class="peopleHubSection"><div class="peopleHubSectionTitle"><b>Met this session</b><span>${encounters.length}</span></div><p class="peopleHubCopy">Only ATM Pay-enabled players you got close to are remembered for this browser session. This is not a permanent location history.</p>${encounters.length?encounters.map(p=>personRow(p,{showStatus:false})).join(''):'<div class="peopleHubEmpty">Walk near another ATM Pay player and they’ll appear here for this session.</div>'}</div>`;
    bindPayButtons(host);
  }
  function requestRow(item){
    const p=normalizePerson(item?.other);if(!p)return '';
    return `<div class="peopleHubSection peopleHubRequest"><div class="peopleHubPerson">${avatar(p)}<span class="peopleHubPersonMain"><b>${esc(p.display_name)} requested ${esc(item.amount_xrp)} XRP</b><span class="peopleHubHandle">@${esc(p.handle)}</span>${item.note?`<span>${esc(item.note)}</span>`:''}</span></div><div class="peopleHubRequestActions"><button class="peopleHubPrimary" type="button" data-people-request-pay="${esc(item.id)}">Review & Pay</button></div></div>`;
  }
  function activityLine(item){
    const p=normalizePerson(item?.other);if(!p)return '';
    let text=item.kind==='payment'?(item.direction==='sent'?`Paid ${p.display_name}`:`${p.display_name} paid you`):(item.direction==='requested'?`Requested from ${p.display_name}`:`${p.display_name} requested`);
    return `<div class="peopleHubActivityLine">${avatar(p)}<span class="peopleHubPersonMain"><b>${esc(text)}</b><span class="peopleHubHandle">@${esc(p.handle)}</span></span><span class="peopleHubAmount">${esc(item.amount_xrp)} XRP</span></div>`;
  }
  function renderPay(){
    const host=document.getElementById('atmPeopleHubPay');if(!host)return;
    const requests=state.pay.incomingRequests||[],activity=state.pay.recentActivity||[];
    host.innerHTML=`${requests.length?`<div class="peopleHubSection"><div class="peopleHubSectionTitle"><b>Requests for you</b><span>${requests.length}</span></div></div>${requests.map(requestRow).join('')}`:''}<div class="peopleHubSection"><div class="peopleHubSectionTitle"><b>Find someone to pay</b><span>ATM PAY</span></div><p class="peopleHubCopy">Search by player name or @handle. Wallet addresses stay out of the flow.</p><input class="peopleHubSearch" id="atmPeopleHubSearch" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="@handle or player name" value="${esc(state.searchQuery)}"><div id="atmPeopleHubSearchResults">${state.searchResults.length?state.searchResults.map(p=>personRow(p,{showStatus:false})).join(''):''}</div></div><div class="peopleHubSection"><div class="peopleHubSectionTitle"><b>Recent activity</b><span>${activity.length}</span></div>${activity.length?activity.slice(0,6).map(activityLine).join(''):'<div class="peopleHubEmpty">No ATM Pay activity yet.</div>'}<button class="peopleHubSecondary" id="atmPeopleHubOpenPay" type="button">Open full ATM Pay</button></div>`;
    bindPayButtons(host);
    host.querySelectorAll('[data-people-request-pay]').forEach(button=>button.addEventListener('click',()=>{const id=String(button.dataset.peopleRequestPay||'');close();window.ATMPay?.openRequest?.(id);}));
    document.getElementById('atmPeopleHubOpenPay')?.addEventListener('click',()=>{close();window.ATMPay?.open?.();});
    const input=document.getElementById('atmPeopleHubSearch');input?.addEventListener('input',()=>{state.searchQuery=input.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>runSearch(state.searchQuery),250);});
  }
  async function runSearch(query){
    const q=String(query||'').trim();if(q.length<2){state.searchResults=[];renderPay();return;}
    try{state.searchResults=(await window.ATMPay?.searchPeople?.(q)||[]).map(normalizePerson).filter(Boolean);}catch(_error){state.searchResults=[];}renderPay();
  }
  function render(){
    ensureUi();renderOnline();renderPeople();renderPay();refreshTrigger();
    const badge=document.getElementById('atmPeopleHubPayBadge');if(badge){const count=requestCount();badge.hidden=!count;badge.textContent=count?String(Math.min(99,count)):'';}
    setPage(state.page);
  }
  async function refresh({network=true}={}){
    state.game=window.ATMGamePeople?.snapshot?.()||state.game||{online:[],encounters:[]};
    state.onlineCount=Math.max(1,Number(state.game.onlineCount||state.onlineCount||1));
    if(network&&window.ATMPay?.refreshConsumerSnapshot){try{state.pay=await window.ATMPay.refreshConsumerSnapshot();}catch(_error){state.pay=window.ATMPay?.getConsumerSnapshot?.()||state.pay;}}
    else state.pay=window.ATMPay?.getConsumerSnapshot?.()||state.pay;
    render();
  }
  function open(page='online'){
    ensureUi();state.page=Math.max(0,PAGES.indexOf(String(page)));document.getElementById('atmPeopleHubModal')?.classList.add('open');state.open=true;refresh({network:true});
    clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(state.open)refresh({network:false});},1000);
  }
  function close(){document.getElementById('atmPeopleHubModal')?.classList.remove('open');state.open=false;clearInterval(refreshTimer);refreshTimer=null;}
  function setOnlineCount(count){state.onlineCount=Math.max(1,Number(count)||1);if(state.open)refresh({network:false});else{state.game=window.ATMGamePeople?.snapshot?.()||state.game;refreshTrigger();}}

  window.ATMPeopleHub={open,close,setOnlineCount,refresh:()=>refresh({network:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureUi();refresh({network:false});});else{ensureUi();refresh({network:false});}
  window.addEventListener('atm:online-players-changed',()=>{state.game=window.ATMGamePeople?.snapshot?.()||state.game;if(state.open)render();else refreshTrigger();});
  window.addEventListener('atm:pay-state-changed',event=>{state.pay=event.detail||window.ATMPay?.getConsumerSnapshot?.()||state.pay;if(state.open)render();else refreshTrigger();});
})();
