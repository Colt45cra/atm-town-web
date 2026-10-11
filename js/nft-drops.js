(function(global){
 'use strict';
 let game=null,panel=null,list=null,note=null,button=null,carry=null,visible=[],mine=[],lastRefresh=0,refreshing=false,poll=null,busy=false,pending=null,mode='mine',boxMode=false;
 const images=new Map(),storageKey='atm_nft_drop_pending_v1';
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 function status(text){if(note){note.textContent=text;note.scrollIntoView?.({block:'nearest'});}}
 function setBusy(value){busy=value;if(panel){panel.setAttribute('aria-busy',String(value));for(const b of panel.querySelectorAll('button:not([data-close])'))b.disabled=value;}}
 function persist(value){pending=value;try{if(value)localStorage.setItem(storageKey,JSON.stringify(value));else localStorage.removeItem(storageKey);}catch{}}
 function user(){return game?.userId?.()||null;}
 function signing(data,claim=false){
   persist({id:data.id,claim,user:user(),deeplink:data.deeplink});
   status(data.kind==='drop'?'Approve the transfer to the game’s holding wallet in Xaman. Your drop appears after receipt is confirmed. Return here to check progress.':'Open Xaman below to approve. Return here and wait for confirmation.');
   if(!data.deeplink){status('The holding wallet is preparing your personal NFT offer…');startPoll();return;}
   const link=el('a','Open Xaman to sign');link.href=data.deeplink;link.target='_blank';link.rel='noopener noreferrer';link.className='nftDropSign';list.append(link);
   if(data.qr_png){const qr=el('img');qr.src=data.qr_png;qr.alt='Scan in Xaman';qr.width=180;qr.height=180;list.append(qr);}
   startPoll();
 }
 async function api(action,body){return game.api('/api/xrpl-nft-trade?action='+action,body?{method:'POST',body:JSON.stringify(body)}:undefined);}
 async function run(task){if(busy)return;setBusy(true);try{await task();}catch(e){status(e.message||'Could not update this NFT.');}finally{setBusy(false);}}
 async function beginOffer(nft,donate=false){
   mode=donate?'donate':'create';list.replaceChildren(el('p',nft.name||'Selected NFT'));
   status(donate?'Preparing your donation… Please wait.':'Preparing your NFT to carry… Please wait.');
   try{const data=await api(donate?'drop-donate':'drop-start',{token_id:nft.token_id});list.replaceChildren();if(data.status==='carried'){await refresh(true);carry=mine.find(r=>r.id===data.id)||data;game.broadcast();mode='mine';render();status('Ready to carry. Close this window, choose your spot, then tap Place NFT here. You sign in Xaman when placing.');}else signing(data);}
   catch(e){list.replaceChildren(el('p','Could not prepare the signing link. Check My NFT drops for a pending request before retrying.'));const retry=el('button','Try again');retry.onclick=()=>run(()=>beginOffer(nft,donate));list.append(retry);throw e;}
 }
 async function refresh(force=false){
   if(refreshing||(!force&&Date.now()-lastRefresh<15000)||!game?.ready())return;
   refreshing=true;lastRefresh=Date.now();
   try{
     const r=await fetch('/api/xrpl-nft-trade?action=drop-list',{cache:'no-store'});if(!r.ok)throw Error('NFT drops unavailable.');
     visible=(await r.json()).drops||[];
     if(force&&user()){
       const data=await api('drop-mine');mine=data.drops||[];
       if(carry)carry=mine.find(r=>r.id===carry.id&&r.status==='carried')||null;
       if(!carry)carry=mine.find(r=>r.kind==='drop'&&r.status==='carried')||null;
       game.broadcast();
     }
     const needed=new Set([...visible,...mine].map(r=>r.image_url).filter(Boolean));for(const url of images.keys())if(!needed.has(url))images.delete(url);
   }catch(e){if(force)status(e.message);}finally{refreshing=false;}
 }
 function startPoll(){
   clearTimeout(poll);let attempts=0;const check=async()=>{
     if(!pending||pending.user!==user())return;
     try{
       const data=await api((pending.claim?'drop-claim-status':'drop-status')+'&id='+encodeURIComponent(pending.id));
       if(data.phase==='receiving'){list.replaceChildren(el('p','Transfer approved. The holding wallet is receiving your NFT…'));status('Waiting for confirmed receipt. Your NFT will appear at your chosen spot automatically.');}
       if(['pending','preparing'].includes(data.status)&&data.deeplink&&!pending.deeplink){const isClaim=pending.claim;list.replaceChildren();signing(data,isClaim);return;}
       if(!['pending','preparing'].includes(data.status)){
         const wasClaim=pending.claim;persist(null);await refresh(true);
         if(boxMode)await showBox();else{mode='mine';render();}
         status(data.status==='carried'?'NFT confirmed. You are carrying it—walk somewhere and tap Place here.':data.status==='placed'?'NFT placed at your chosen spot. Players can now discover it.':data.status==='offered'?'Donation approved. Waiting for the rewards wallet to receive it.':data.status==='received'?'Donation received by the rewards wallet.':data.status==='claimed'&&wasClaim?'NFT received and confirmed in your wallet.':data.failure_reason||('NFT offer '+data.status+'.'));
         if(wasClaim&&data.status==='claimed')game.refreshWallet();return;
       }
     }catch(e){status(e.message);}
     if(++attempts<100)poll=setTimeout(check,3000);else status('Still waiting for Xaman or XRPL. Reopen NFT drops to resume checking.');
   };check();
 }
 function rowCard(row){
   const card=el('article');card.className='nftDropCard';
   card.append(thumbnail(row));
   card.append(el('strong',row.name||'XRPL NFT'),el('small',({carried:row.offer_index?'Ready to place':'Ready to carry · sign when placing',pending:'Waiting for Xaman / confirmation',placed:'Placed in town',offered:'Donation awaiting receipt',received:'In the donation box',checking:'Checking ownership / pickup',claimed:row.claim_verified?'Picked up · confirmed on XRPL':'Ownership changed · pickup unverified',failed:'Failed',rejected:'Declined',expired:'Signing request expired',unavailable:'No longer available'}[row.status]||row.status)+' · '+row.token_id.slice(0,12)+'…'));
   if(row.kind==='drop'&&['carried','placed'].includes(row.status)){
     const pick=el('button',row.status==='placed'?'Carry again':carry?.id===row.id?'Carrying':'Carry this NFT');pick.type='button';pick.onclick=()=>run(async()=>{if(row.status==='placed')await api('drop-carry',{id:row.id});await refresh(true);carry=mine.find(r=>r.id===row.id&&r.status==='carried')||null;game.broadcast();panel.hidden=true;});card.append(pick);
   }
   if(['pending','preparing'].includes(row.status)){const resume=el('button','Resume signing / check status');resume.onclick=()=>{list.replaceChildren();const deeplink=row.deeplink||(pending?.id===row.id?pending.deeplink:null);if(deeplink)signing({...row,deeplink});else{persist({id:row.id,claim:false,user:user()});status('Waiting for the signing request to be prepared. Checking status…');startPoll();}};card.append(resume);}
   if(['failed','rejected','expired'].includes(row.status)){const retry=el('button','Try again');retry.onclick=()=>run(()=>beginOffer(row,row.kind==='donation'));card.append(retry);}
   if(row.failure_reason)card.append(el('small',row.failure_reason));
   return card;
 }
 async function selectNfts(donate=false){
   if(busy)return;
   if(!user()){list.replaceChildren();status('Sign in and link Xaman to create or claim NFT drops.');return;}
   mode=donate?'donate':'create';list.replaceChildren(el('p','Loading NFTs from your linked wallet…'));
   status(donate?'Donate to the existing game rewards wallet. The NFT enters the pool only after acceptance.':'Choose an NFT to carry. Walk to your spot, tap Place NFT here, then sign in Xaman. Signing transfers the NFT into the game’s holding wallet. It becomes available at your spot after receipt is confirmed.');
   try{
     const nfts=await game.nfts();list.replaceChildren();
     if(!nfts.length)list.append(el('p','No transferable NFTs found. Link Xaman and refresh your Locker.'));
     for(const nft of nfts){const card=el('article');card.className='nftDropCard';card.append(el('strong',nft.name||'XRPL NFT'),el('small',nft.token_id.slice(0,16)+'…'));card.prepend(thumbnail(nft));const choose=el('button',donate?'Donate this NFT':'Carry this NFT');choose.type='button';choose.onclick=()=>run(()=>beginOffer(nft,donate));card.append(choose);list.append(card);}
   }catch(e){list.replaceChildren();status(e.message);}
 }
 function render(){
   if(!panel||panel.hidden||mode!=='mine')return;list.replaceChildren();
   if(!user()){status('Sign in and link Xaman to create or claim NFT drops.');return;}
   for(const row of mine)list.append(rowCard(row));if(!mine.length)list.append(el('p','Choose Create drop, carry an NFT, then sign in Xaman when placing it.'));
   if(pending&&pending.user===user()&&pending.deeplink){const link=el('a','Resume in Xaman');link.href=pending.deeplink;link.target='_blank';link.rel='noopener noreferrer';link.className='nftDropSign';list.prepend(link);}
 }
 function thumbnail(nft){
   const holder=el('span');holder.className='nftDropThumb';holder.append(el('span','◈'));
   if(nft.image_url){const img=el('img');img.alt=nft.name||'NFT';img.width=84;img.height=84;img.loading='lazy';
     const sources=[nft.image_url];try{const u=new URL(nft.image_url),path=u.pathname.match(/^\/ipfs\/(.+)$/);if(path)for(const gateway of ['https://ipfs.io/ipfs/','https://dweb.link/ipfs/','https://gateway.pinata.cloud/ipfs/'])sources.push(gateway+path[1]);}catch{}
     let next=0;img.onerror=()=>{if(++next<sources.length)img.src=sources[next];else img.hidden=true;};img.src=sources[0];holder.append(img);
   }return holder;
 }
 function boxControls(){panel.querySelector('h2').textContent=boxMode?'NFT Donation Box':'NFT drops';panel.querySelector('[data-create]').textContent=boxMode?'Donate an NFT':'Create drop';panel.querySelector('[data-mine]').textContent=boxMode?'NFTs in the box':'My NFT drops';}
 async function showBox(marker=null){
   mode='box';if(!marker)list.replaceChildren(el('p','Loading NFTs in the box…'));status('These NFTs are held in the game rewards wallet. Donations appear here after receipt.');
   try{const r=await fetch('/api/xrpl-nft-trade?action=drop-box'+(marker?'&marker='+encodeURIComponent(marker):''),{cache:'no-store'});if(!r.ok)throw Error('Could not load the donation box. Tap NFTs in the box to retry.');const data=await r.json();if(mode!=='box')return;if(!marker)list.replaceChildren();
     if(!data.nfts?.length&&!marker)list.append(el('p','The box is empty. Be the first to donate an NFT.'));
     const grid=el('div');grid.className='nftDropGrid';for(const nft of data.nfts||[]){const card=el('article');card.className='nftDropTile';card.append(thumbnail(nft),el('strong',nft.name||'XRPL NFT'));grid.append(card);}list.append(grid);
     if(data.marker){const more=el('button','Show more NFTs');more.onclick=()=>run(async()=>{more.hidden=true;try{await showBox(data.marker);}catch(e){more.hidden=false;throw e;}});list.append(more);}
   }catch(e){list.replaceChildren(el('p','Box contents unavailable.'));status(e.message);}
 }
 async function open(donate=false){
   if(!game?.ready()||busy)return;panel.hidden=false;boxMode=donate;boxControls();
   if(donate)await showBox();else{mode='mine';status('Loading NFT drops…');await refresh(true);render();if(user())status('Carry an NFT to your spot, then sign when placing.');}
   if(pending&&pending.user===user())startPoll();panel.querySelector('[data-close]').focus();
 }
 async function claim(row){
   panel.hidden=false;boxMode=false;boxControls();mode='claim';list.replaceChildren();list.append(el('h3',row.name||'Discovered NFT'),el('p','Accept this NFT free through your own Xaman wallet. XRPL network fees apply.'));
   if(row.image_url){const img=el('img');img.src=row.image_url;img.alt='Discovered NFT';img.width=160;img.height=160;list.append(img);}
   const sign=el('button','Claim NFT · 0 XRP');sign.onclick=()=>run(async()=>{status('Preparing your NFT claim… Please wait.');const data=await api('drop-claim',{id:row.id,...game.pose()});list.replaceChildren();signing(data,true);});list.append(sign);status('The NFT is held by the game. Your claim offer is restricted to your linked wallet.');
 }
 function nearest(){
   if(!game?.ready())return null;const p=game.pose();if(p.map!=='town')return null;
   let best=null,d=85;for(const row of visible){const dist=Math.hypot(row.x-p.x,row.y-p.y);if(dist<d){best={...row,type:'nft-drop',name:row.name+' · FREE NFT'};d=dist;}}
   const box=game.donationBox?.();if(box&&Math.hypot(p.x-box.x,p.y-box.y)<95&&(!best||Math.hypot(p.x-box.x,p.y-box.y)<d))return {type:'nft-donation-box',name:'NFT Donation Box'};
   return best;
 }
 function publicState(){return carry?{id:carry.id,token_id:carry.token_id,name:carry.name,image_url:carry.image_url}:null;}
 function draw(ctx,row,x=row.x,y=row.y,carried=false){
   if(!Number.isFinite(x)||!Number.isFinite(y))return;
   ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(0,0,20,7,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=carried?'#183e46':'#19352e';ctx.strokeStyle=carried?'#59dec6':'#ffd166';ctx.lineWidth=2;ctx.fillRect(-18,-40,36,36);ctx.strokeRect(-18,-40,36,36);
   let img=images.get(row.image_url);if(row.image_url&&!img){try{const u=new URL(row.image_url);if(u.protocol==='https:'){img=new Image();img.src=u.href;images.set(row.image_url,img);}}catch{}}
   if(img?.complete&&img.naturalWidth)ctx.drawImage(img,-15,-37,30,30);else{ctx.fillStyle='#ffd166';ctx.font='bold 22px system-ui';ctx.textAlign='center';ctx.fillText('◈',0,-13);}
   if(!carried){ctx.fillStyle='#ffd166';ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.fillText('FREE NFT',0,-47);}ctx.restore();
 }
 function actors(view,remotes=[]){
   refresh();const rows=visible.filter(r=>r.x+40>=view.x&&r.x-40<=view.x+view.w&&r.y+15>=view.y&&r.y-60<=view.y+view.h).map(row=>({type:'nftdrop',depth:row.y+5,row}));
   const p=game.pose();if(carry&&p.map==='town')rows.push({type:'nftdrop',depth:p.y+24,row:{...carry,x:p.x+25,y:p.y+8},carried:true});
   for(const remote of remotes)if(remote.map==='town'&&!remote.afk&&!remote.powers?.invisibility&&remote.nftDrop)rows.push({type:'nftdrop',depth:(remote.drawY??remote.y)+24,row:{...remote.nftDrop,x:(remote.drawX??remote.x)+25,y:(remote.drawY??remote.y)+8},carried:true});
   return rows;
 }
 function init(adapter){
   game=adapter;const style=el('style');style.textContent='#nftDropButton{position:fixed;right:12px;top:340px;z-index:32;min-height:44px;border:1px solid #deb85a;border-radius:12px;background:#142c36;color:#ffdc7a;padding:6px 10px}#nftDropPanel{position:fixed;right:12px;top:max(70px,10vh);width:min(330px,calc(100vw - 24px));max-height:75dvh;overflow:auto;z-index:85;padding:14px;background:#0b2634;color:#eaffff;border:1px solid #ffd166;border-radius:16px;font:14px system-ui}#nftDropPanel[hidden]{display:none}#nftDropPanel button,.nftDropSign{display:inline-block;min-height:44px;padding:10px;margin:4px;border:1px solid #63c5ad;border-radius:8px;background:#183e46;color:#eaffff;text-decoration:none;cursor:pointer}#nftDropPanel p{line-height:1.45}#nftDropPanel [data-status]{position:sticky;top:0;background:#0b2634;padding:10px 0;z-index:1}#nftDropPanel button:disabled{opacity:.55;cursor:wait}#nftDropPanel small{display:block;overflow-wrap:anywhere;color:#a9c7ce}.nftDropCard{padding:10px 0;border-bottom:1px solid #3a535b}.nftDropCard{display:flow-root}.nftDropThumb{position:relative;display:inline-grid;place-items:center;width:84px;height:84px;background:#173e46;color:#ffd166;border-radius:10px;overflow:hidden;flex:none;font-size:30px;margin:0 10px 8px 0}.nftDropThumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#173e46}.nftDropThumb img[hidden]{display:none}.nftDropCard>.nftDropThumb{float:left}.nftDropGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.nftDropTile{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;padding:12px;background:#143541;border-radius:10px}.nftDropTile .nftDropThumb{margin:0}.nftDropTile strong{font-size:13px;overflow-wrap:anywhere}#nftDropCarry{position:fixed;right:12px;bottom:max(155px,22vh);z-index:33;padding:12px;background:#173c33;color:#ffe39e;border:1px solid #ffd166;border-radius:12px;max-width:170px;min-height:44px}';document.head.append(style);
   button=el('button','◈ NFT drops');button.id='nftDropButton';button.type='button';button.hidden=!game.ready();button.onclick=()=>open();document.body.append(button);
   const place=el('button','◈ Place NFT here');place.id='nftDropCarry';place.type='button';place.hidden=true;place.onclick=()=>run(async()=>{const p=game.pose();if(!carry||p.map!=='town'||p.airborne||game.blocked(p.x,p.y))throw Error('Stand on walkable outdoor land to place this NFT.');panel.hidden=false;boxMode=false;boxControls();mode='placing';list.replaceChildren();status('Preparing placement at this spot…');const placed=await api('drop-place',{id:carry.id,map:p.map,x:p.x,y:p.y});if(placed.deeplink)signing(placed);else{status('NFT placed at this spot.');panel.hidden=true;}carry=null;game.broadcast();await refresh(true);});document.body.append(place);
   panel=el('section');panel.id='nftDropPanel';panel.hidden=true;panel.setAttribute('aria-label','NFT drops');panel.innerHTML='<button data-close type="button" aria-label="Close NFT drops">×</button><h2>NFT drops</h2><button data-create type="button">Create drop</button><button data-mine type="button">My NFT drops</button><p data-status role="status" aria-live="polite"></p><div data-list></div>';document.body.append(panel);note=panel.querySelector('[data-status]');list=panel.querySelector('[data-list]');panel.querySelector('[data-close]').onclick=()=>{panel.hidden=true;button.focus();};panel.querySelector('[data-create]').onclick=()=>selectNfts(boxMode);panel.querySelector('[data-mine]').onclick=()=>run(async()=>{if(boxMode)await showBox();else{mode='mine';await refresh(true);render();}});
   try{pending=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{}
   let activeUser=null,wasReady=false;setInterval(()=>{button.hidden=!game.ready();place.hidden=!carry||!game.ready()||game.pose().map!=='town';if(activeUser!==user()||(!wasReady&&game.ready())){activeUser=user();carry=null;mine=[];clearTimeout(poll);if(game.ready()&&user())refresh(true).then(()=>{if(pending?.user===user())startPoll();});}wasReady=game.ready();},1000);
   document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh(true);if(pending?.user===user())startPoll();}});
 }
 global.ATMNftDrops=Object.freeze({init,open,claim,nearest,actors,draw,publicState,refresh});
})(window);
