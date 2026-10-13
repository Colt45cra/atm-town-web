(function(global){
 'use strict';
 let game=null,panel=null,list=null,note=null,button=null,carry=null,visible=[],mine=[],lastRefresh=0,refreshing=false,poll=null,busy=false,pending=null,mode='mine',boxMode=false;
 const images=new Map(),storageKey='atm_nft_drop_pending_v1';let artRecoveries=0;
 const artworkKey='atm_nft_box_art_v1';
 function rememberedArt(tokenId){
   try{const r=JSON.parse(localStorage.getItem(artworkKey)||'{}')[tokenId];return r&&Date.now()-r.at<30*86400000&&/^https:\/\//i.test(r.url)?r.url:'';}catch{return '';}
 }
 function rememberArt(tokenId,url){
   if(!/^[a-f0-9]{64}$/i.test(tokenId||'')||!/^https:\/\//i.test(url||''))return;
   try{const saved=JSON.parse(localStorage.getItem(artworkKey)||'{}');saved[tokenId]={url,at:Date.now()};
     const keys=Object.keys(saved);if(keys.length>120){keys.sort((a,b)=>(saved[a].at||0)-(saved[b].at||0));for(const key of keys.slice(0,keys.length-120))delete saved[key];}
     localStorage.setItem(artworkKey,JSON.stringify(saved));}catch{}
 }
 function artworkCandidates(nft){
   const provided=[rememberedArt(nft.token_id),nft.image_url,...(Array.isArray(nft.image_candidates)?nft.image_candidates:[])].filter(Boolean);
   const gateways=['https://w3s.link/ipfs/','https://dweb.link/ipfs/','https://nftstorage.link/ipfs/','https://gateway.pinata.cloud/ipfs/','https://ipfs.io/ipfs/'];
   const urls=[];
   for(const raw of provided){
     const url=String(raw||'').trim();
     if(!url||!(url.startsWith('https://')||url.startsWith('http://')||/^data:image\//i.test(url)))continue;
     if(!urls.includes(url))urls.push(url);
     try{
       const path=new URL(url).pathname.match(/^\/ipfs\/(.+)$/i);
       if(path)for(const gateway of gateways){const mirror=gateway+path[1];if(!urls.includes(mirror))urls.push(mirror);}
     }catch{}
   }
   return urls.slice(0,35);
 }

 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 function status(text){if(note){note.textContent=text;note.scrollIntoView?.({block:'nearest'});}}
 function setBusy(value){busy=value;if(panel){panel.setAttribute('aria-busy',String(value));for(const b of panel.querySelectorAll('button:not([data-close])'))b.disabled=value;}}
 function persist(value){pending=value;try{if(value)localStorage.setItem(storageKey,JSON.stringify(value));else localStorage.removeItem(storageKey);}catch{}}
 function user(){return game?.userId?.()||null;}
 function signing(data,claim=false){
   persist({id:data.id,claim,donation:Boolean(data.donation_request),user:user(),deeplink:data.deeplink});
   if(data.donation_request){
     list.replaceChildren();status(data.status==='signing'?'Review your selected NFTs in '+(data.provider==='atm_pay'?'ATM Pay':'Xaman')+'.':'Donation approved. Received '+data.received+' of '+data.total+' NFTs.');
     if(data.deeplink){const link=el('a','Open '+(data.provider==='atm_pay'?'ATM Pay':'Xaman')+' to approve');link.href=data.deeplink;link.target='_blank';link.rel='noopener noreferrer';link.className='nftDropSign';list.append(link);}
     startPoll();return;
   }
   status(claim?'Sign in Xaman to claim your NFT.':data.kind==='drop'?'Approve the transfer to the game’s holding wallet in Xaman. Your drop appears after receipt is confirmed. Return here to check progress.':'Open Xaman below to approve. Return here and wait for confirmation.');
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
     // Image entries are bounded by recent use, including remote carried NFTs.
     for(const [key,entry] of images)if(Date.now()-entry.usedAt>120000){clearTimeout(entry.timer);images.delete(key);}
   }catch(e){if(force)status(e.message);}finally{refreshing=false;}
 }
 function startPoll(){
   clearTimeout(poll);let attempts=0;const check=async()=>{
     if(!pending||pending.user!==user())return;
     try{
       const data=pending.donation?await api('donation-status',{id:pending.id}):await api((pending.claim?'drop-claim-status':'drop-status')+'&id='+encodeURIComponent(pending.id));
       if(pending.donation){
         status(data.status==='signing'?'Waiting for your wallet approval…':data.status==='submitting'?'Checking your donation on XRPL…':'Received '+data.received+' of '+data.total+' NFTs.');
         if(['signing','submitting','receiving'].includes(data.status)){poll=setTimeout(check,3500);return;}
         persist(null);await refresh(true);if(boxMode)await showBox();else{mode='mine';render();}status(data.status==='received'?'Donation complete! All '+data.total+' NFTs are in the box.':data.error||'Donation '+data.status+'.');return;
       }
       if(data.phase==='receiving'){list.replaceChildren(el('p','Transfer approved. The holding wallet is receiving your NFT…'));status('Waiting for confirmed receipt. Your NFT will appear at your chosen spot automatically.');}
       if(['pending','preparing'].includes(data.status)&&data.deeplink&&!pending.deeplink){const isClaim=pending.claim;list.replaceChildren();signing(data,isClaim);return;}
       if(!['pending','preparing'].includes(data.status)){
         const wasClaim=pending.claim;persist(null);await refresh(true);
         if(wasClaim&&panel.hasAttribute('data-discovery')){list.replaceChildren();panel.querySelector('h2').textContent=data.status==='claimed'?'NFT claimed!':'NFT claim';}else if(boxMode)await showBox();else{mode='mine';render();}
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
   if(row.donation_request_id&&['pending','preparing'].includes(row.status)){const resume=el('button','Check donation / resume approval');resume.onclick=()=>run(async()=>signing(await api('donation-status',{id:row.donation_request_id})));card.append(resume);}
   else if(['pending','preparing'].includes(row.status)){const resume=el('button','Resume signing / check status');resume.onclick=()=>{list.replaceChildren();const deeplink=row.deeplink||(pending?.id===row.id?pending.deeplink:null);if(deeplink)signing({...row,deeplink});else{persist({id:row.id,claim:false,user:user()});status('Waiting for the signing request to be prepared. Checking status…');startPoll();}};card.append(resume);}
   if(['failed','rejected','expired'].includes(row.status)){const retry=el('button','Try again');retry.onclick=()=>run(()=>beginOffer(row,row.kind==='donation'));card.append(retry);}
   if(row.can_cancel){const cancel=el('button','Cancel');cancel.type='button';cancel.onclick=()=>run(async()=>{
     await api('drop-cancel',{id:row.id});
     if(pending?.id===row.id){clearTimeout(poll);persist(null);}
     if(carry?.id===row.id)carry=null;
     mine=mine.filter(r=>r.id!==row.id);game.broadcast();render();
     await refresh(true);render();status('Cancelled. You can now donate this NFT from your wallet.');
   });card.append(cancel);}
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
     let donationConfig=null;
     if(donate){try{donationConfig=await api('donation-config',{});}catch(e){status('Batch status unavailable. Single-NFT donations are still available.');}}
     const batchReady=donate&&donationConfig?.batch_enabled&&(donationConfig.provider==='atm_pay'||donationConfig.xaman_batch_ready);
     const selected=new Set();let donateSelected;
     if(batchReady){donateSelected=el('button','Donate selected (0 / 8)');donateSelected.type='button';donateSelected.disabled=true;donateSelected.onclick=()=>run(async()=>{list.replaceChildren();status('Preparing your donation…');const data=await api('donation-start',{token_ids:[...selected]});signing(data);});list.append(donateSelected);status('Select up to 8 NFTs. Review once in ATM Pay. Each NFT enters the box after confirmed receipt.');}
     else if(donate&&donationConfig?.provider==='xaman'){list.append(el('p','Donate one NFT through Xaman, or connect ATM Pay to donate up to 8 with one approval.'));}
     const tools=el('div');tools.className='nftPickerTools';const search=el('input');search.type='search';search.placeholder='Find an NFT by name or token ID';search.setAttribute('aria-label','Search your NFTs');
     const retryArt=el('button','Reload missing artwork');retryArt.type='button';const progress=el('small');tools.append(search,retryArt,progress);list.append(tools);
     const cards=[];const filter=()=>{const q=search.value?.trim().toLowerCase()||'';for(const item of cards)item.card.hidden=!((item.nft.name||'')+' '+item.nft.token_id).toLowerCase().includes(q);};search.oninput=filter;

     if(!nfts.length)list.append(el('p','No transferable NFTs found. Link Xaman and refresh your Locker.'));
     for(const nft of nfts){const card=el('article');card.className='nftDropCard';card.append(el('strong',nft.name||'XRPL NFT'),el('small',nft.token_id.slice(0,8)+'…'+nft.token_id.slice(-8)));card.prepend(thumbnail(nft));const choose=el('button',donate?'Donate this NFT':'Carry this NFT');choose.type='button';choose.onclick=()=>run(async()=>{if(donate&&donationConfig?.provider==='atm_pay'){list.replaceChildren();status('Preparing your donation…');signing(await api('donation-start',{token_ids:[nft.token_id]}));}else await beginOffer(nft,donate);});card.append(choose);if(batchReady){const label=el('label','Select for donation '),checkbox=el('input');checkbox.type='checkbox';checkbox.setAttribute('aria-label','Select '+(nft.name||nft.token_id));checkbox.onchange=()=>{if(checkbox.checked&&selected.size>=8){checkbox.checked=false;status('You can select up to 8 NFTs.');return;}if(checkbox.checked)selected.add(nft.token_id);else selected.delete(nft.token_id);donateSelected.textContent='Donate selected ('+selected.size+' / 8)';donateSelected.disabled=selected.size===0;};label.append(checkbox);card.append(label);}list.append(card);cards.push({nft,card});}
     const hydrate=async(force=false)=>{retryArt.disabled=true;let cursor=0,done=0;const pending=cards.filter(({nft,card})=>{const img=card.querySelector('.nftDropThumb img');return nft.uri&&!(img?.complete&&img.naturalWidth>0)&&(force||!nft.image_url);});progress.textContent=pending.length?'Loading artwork…':'';await Promise.all(Array.from({length:Math.min(4,pending.length)},async()=>{while(cursor<pending.length){const item=pending[cursor++];if(!item.card.isConnected)break;try{const meta=await game.api('/api/xrpl-nft-metadata',{method:'POST',body:JSON.stringify({nftoken_id:item.nft.token_id,uri:item.nft.uri,refresh:force})});if(item.card.isConnected){Object.assign(item.nft,{name:meta.name||item.nft.name,image_url:meta.image_url||item.nft.image_url,image_candidates:meta.image_candidates||item.nft.image_candidates});item.card.querySelector('strong').textContent=item.nft.name||'XRPL NFT';const current=item.card.querySelector('.nftDropThumb img');if(!(current?.complete&&current.naturalWidth>0))item.card.querySelector('.nftDropThumb').replaceWith(thumbnail(item.nft));filter();}}catch{}finally{done++;progress.textContent='Artwork checked: '+done+' / '+pending.length;}  }}));retryArt.disabled=false;};
     retryArt.onclick=()=>hydrate(true);hydrate();
   }catch(e){list.replaceChildren();status(e.message);}
 }
 function render(){
   if(!panel||panel.hidden||mode!=='mine')return;list.replaceChildren();
   if(!user()){status('Sign in and link Xaman to create or claim NFT drops.');return;}
   for(const row of mine)list.append(rowCard(row));if(!mine.length)list.append(el('p','Choose Create drop, carry an NFT, then sign in Xaman when placing it.'));
   if(pending&&pending.user===user()&&pending.deeplink){const link=el('a','Resume in Xaman');link.href=pending.deeplink;link.target='_blank';link.rel='noopener noreferrer';link.className='nftDropSign';list.prepend(link);}
 }
 function thumbnail(nft,{eager=false,onUnavailable}={}){
   const holder=el('span');holder.className='nftDropThumb';holder.append(el('span','◈'));
   const sources=artworkCandidates(nft);
   if(!sources.length)return holder;
   const img=el('img');img.alt=nft.name||'NFT';img.width=84;img.height=84;img.loading=eager?'eager':'lazy';img.decoding='async';img.referrerPolicy='no-referrer';
   let next=0,timer,settled=false,started=false;
   const advance=()=>{
     clearTimeout(timer);
     if(settled||!img.isConnected||(img.complete&&img.naturalWidth>0))return;
     if(++next<sources.length){img.src=sources[next];timer=setTimeout(advance,4500);}
     else{img.hidden=true;onUnavailable?.();}
   };
   img.onerror=advance;
   img.onload=()=>{if(img.naturalWidth>0){settled=true;img.hidden=false;clearTimeout(timer);rememberArt(nft.token_id,img.src);}};
   img.src=sources[0];holder.append(img);
   // Lazy images don't actually start downloading before becoming visible.
   // Only begin the slow-gateway timeout after entering the viewport.
   if(eager){timer=setTimeout(advance,4500);}
   else if(typeof IntersectionObserver==='function'){
     const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();started=true;if(!settled)timer=setTimeout(advance,4500);}},{root:panel,rootMargin:'120px'});
     observer.observe(img);
   }else{img.loading='eager';timer=setTimeout(advance,4500);}
   return holder;
 }
 function boxControls(){panel.removeAttribute('data-discovery');panel.querySelector('h2').textContent=boxMode?'NFT Donation Box':'NFT drops';panel.querySelector('[data-create]').textContent=boxMode?'Donate an NFT':'Create drop';panel.querySelector('[data-mine]').textContent=boxMode?'NFTs in the box':'My NFT drops';}
 async function showBox(marker=null){
   mode='box';if(!marker)list.replaceChildren(el('p','Loading NFTs in the box…'));status('These NFTs are held in the game rewards wallet. Donations appear here after receipt.');
   try{const r=await fetch('/api/xrpl-nft-trade?action=drop-box'+(marker?'&marker='+encodeURIComponent(marker):''),{cache:'no-store'});if(!r.ok)throw Error('Could not load the donation box. Tap NFTs in the box to retry.');const data=await r.json();if(mode!=='box')return;if(!marker)list.replaceChildren();
     if(!data.nfts?.length&&!marker)list.append(el('p','The box is empty. Be the first to donate an NFT.'));
     const grid=el('div');grid.className='nftDropGrid';const tiles=[];
     const recover=async(item,manual=false)=>{
       if(item.loading||mode!=='box'||!item.card.isConnected)return;
       if(!manual&&item.automaticRetry)return;
       if(!manual)item.automaticRetry=true;
       item.loading=true;item.retry.disabled=true;
       try{
         const response=await fetch('/api/xrpl-nft-trade?action=drop-box-art&token_id='+encodeURIComponent(item.nft.token_id),{cache:'no-store'});
         if(!response.ok)throw Error('Artwork lookup failed');
         const art=await response.json();
         if(mode!=='box'||!item.card.isConnected)return;
         // Artwork can load while the metadata retry is running. Preserve it.
         const current=item.card.querySelector('.nftDropThumb img');
         if(current?.complete&&current.naturalWidth>0){item.retry.hidden=true;return;}
         Object.assign(item.nft,{name:art.name&&art.name!=='XRPL NFT'?art.name:item.nft.name,
           image_url:art.image_url||item.nft.image_url,image_candidates:[...new Set([...(art.image_candidates||[]),...(item.nft.image_candidates||[])])]});
         const next=artworkCandidates(item.nft);
         if(!next.length)throw Error('No accessible artwork source');
         item.card.querySelector('.nftDropThumb').replaceWith(thumbnail(item.nft,{eager:true,onUnavailable:()=>{item.retry.hidden=false;}}));
         item.card.querySelector('strong').textContent=item.nft.name||'XRPL NFT';
         item.retry.hidden=true;
       }catch{item.retry.hidden=false;}
       finally{item.loading=false;item.retry.disabled=false;}
     };
     for(const nft of data.nfts||[]){
       const card=el('article');card.className='nftDropTile';
       const item={nft,card,automaticRetry:false,loading:false};
       const retry=el('button','Retry artwork');retry.type='button';retry.className='nftDropArtRetry';retry.hidden=true;item.retry=retry;
       retry.onclick=()=>recover(item,true);
       card.append(thumbnail(nft,{eager:tiles.length<6,onUnavailable:()=>recover(item)}),el('strong',nft.name||'XRPL NFT'),retry);
       grid.append(card);tiles.push(item);
     }
     list.append(grid);
     // Show the donation inventory immediately, then recover missing metadata
     // in the background with a small bounded concurrency on mobile.
     const missing=tiles.filter(item=>!artworkCandidates(item.nft).length);
     let cursor=0;
     Promise.all(Array.from({length:Math.min(2,missing.length)},async()=>{
       while(cursor<missing.length&&mode==='box')await recover(missing[cursor++]);
     })).catch(()=>{});
     if(!marker&&user()){try{const history=await api('donation-mine',{});for(const request of history.requests||[]){const card=el('article');card.className='nftDropCard';card.append(el('strong','Your donation · '+request.received+' / '+request.total+' received'));if(['signing','submitting','receiving'].includes(request.status)){const resume=el('button',request.status==='signing'?'Resume approval':'Check donation');resume.onclick=()=>run(async()=>signing(await api('donation-status',{id:request.id})));card.append(resume);}else card.append(el('small',request.status==='received'?'Donation complete':request.error||request.status));list.append(card);}}catch{}}
     if(data.marker){const more=el('button','Show more NFTs');more.onclick=()=>run(async()=>{more.hidden=true;try{await showBox(data.marker);}catch(e){more.hidden=false;throw e;}});list.append(more);}
   }catch(e){list.replaceChildren(el('p','Box contents unavailable.'));status(e.message);}
 }
 async function open(donate=false){
   if(!game?.ready()||busy)return;panel.hidden=false;boxMode=donate;boxControls();
   if(donate)await showBox();else{mode='mine';status('Loading NFT drops…');await refresh(true);render();if(user())status('Carry an NFT to your spot, then sign when placing.');}
   if(pending&&pending.user===user())startPoll();panel.querySelector('[data-close]').focus();
 }
 async function claim(row){
   panel.hidden=false;boxMode=false;mode='claim';panel.setAttribute('data-discovery','true');panel.querySelector('h2').textContent='You just found an NFT!';list.replaceChildren();status('');
   const preview=thumbnail(row);list.append(preview);
   if(!row.image_url){
     preview.textContent='Loading artwork…';
     fetch('/api/xrpl-nft-trade?action=drop-art&id='+encodeURIComponent(row.id),{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Artwork unavailable');return r.json();}).then(art=>{
       if(!preview.isConnected)return;
       if(art.image_url){Object.assign(row,art);for(const saved of visible)if(saved.id===row.id)Object.assign(saved,art);preview.replaceChildren(...thumbnail(row).childNodes);}
       else preview.textContent='Artwork unavailable';
     }).catch(()=>{if(preview.isConnected)preview.textContent='Artwork unavailable';});
   }
   const sign=el('button','Click to claim');sign.type='button';sign.onclick=()=>run(async()=>{status('Preparing your claim…');const data=await api('drop-claim',{id:row.id,...game.pose()});list.replaceChildren();signing(data,true);});list.append(sign);
 }

 function nearest(){
   if(!game?.ready())return null;const p=game.pose();if(p.map!=='town')return null;
   let best=null,d=85;for(const row of visible){const dist=Math.hypot(row.x-p.x,row.y-p.y);if(dist<d){best={...row,type:'nft-drop',name:row.name+' · FREE NFT'};d=dist;}}
   const box=game.donationBox?.();if(box&&Math.hypot(p.x-box.x,p.y-box.y)<95&&(!best||Math.hypot(p.x-box.x,p.y-box.y)<d))return {type:'nft-donation-box',name:'NFT Donation Box'};
   return best;
 }
 function publicState(){return carry?{id:carry.id,token_id:carry.token_id,name:carry.name,image_url:carry.image_url}:null;}
 function publishArt(row,url){
   const changed=carry?.token_id===row.token_id&&carry.image_url!==url;
   rememberArt(row.token_id,url);row.image_url=url;
   for(const saved of [...visible,...mine])if(saved.token_id===row.token_id)saved.image_url=url;
   if(changed){carry.image_url=url;game.broadcast();}
 }
 function loadWorldArt(entry,row){
   if(entry.loading||entry.image?.naturalWidth)return;
   const url=entry.urls.find(u=>!entry.tried.has(u));if(!url)return;
   entry.tried.add(url);entry.loading=true;
   const img=new Image();entry.image=img;img.referrerPolicy='no-referrer';img.decoding='async';
   const failed=()=>{if(entry.image!==img||!entry.loading)return;clearTimeout(entry.timer);entry.loading=false;loadWorldArt(entry,row);};
   img.onerror=failed;img.onload=()=>{if(entry.image!==img)return;if(!img.naturalWidth){failed();return;}clearTimeout(entry.timer);entry.loading=false;publishArt(row,url);};
   img.src=url;entry.timer=setTimeout(failed,4500);
 }
 function recoverWorldArt(entry,row,carried){
   if(entry.recovering||artRecoveries>=3||Date.now()-entry.recoveredAt<60000||!row.id)return;
   // Keep metadata/ledger lookups out of the frame loop and cap concurrency.
   entry.recovering=true;entry.recoveredAt=Date.now();artRecoveries++;
   const action='drop-art&id='+encodeURIComponent(row.id)+'&refresh=1';
   const request=carried?api(action):fetch('/api/xrpl-nft-trade?action='+action,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Artwork unavailable');return r.json();});
   request.then(art=>{entry.urls=[...new Set([...entry.urls,...artworkCandidates({...row,...art})])];loadWorldArt(entry,row);})
     .catch(()=>{}).finally(()=>{entry.recovering=false;artRecoveries--;});
 }
 function worldImage(row,carried){
   const key=row.token_id||row.id;if(!key)return null;
   let entry=images.get(key);
   if(!entry){entry={urls:[],tried:new Set(),loading:false,recovering:false,recoveredAt:0,usedAt:Date.now()};images.set(key,entry);}
   entry.usedAt=Date.now();entry.urls=[...new Set([...entry.urls,...artworkCandidates(row)])];
   loadWorldArt(entry,row);
   if(!entry.loading&&!entry.image?.naturalWidth){
     // Retry exhausted URLs after a cooldown as gateways can recover.
     if(entry.recoveredAt&&Date.now()-entry.recoveredAt>=60000)entry.tried.clear();
     recoverWorldArt(entry,row,carried);
   }
   return entry.image;
 }
 function draw(ctx,row,x=row.x,y=row.y,carried=false){
   if(!Number.isFinite(x)||!Number.isFinite(y))return;
   ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(0,0,20,7,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=carried?'#183e46':'#19352e';ctx.strokeStyle=carried?'#59dec6':'#ffd166';ctx.lineWidth=2;ctx.fillRect(-18,-40,36,36);ctx.strokeRect(-18,-40,36,36);
   const img=worldImage(row,carried);
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
   game=adapter;const style=el('style');style.textContent='#nftDropButton{position:fixed;right:12px;top:340px;z-index:32;min-height:44px;border:1px solid #deb85a;border-radius:12px;background:#142c36;color:#ffdc7a;padding:6px 10px}#nftDropPanel{position:fixed;right:12px;top:max(70px,10vh);width:min(330px,calc(100vw - 24px));max-height:75dvh;overflow:auto;z-index:85;padding:14px;background:#0b2634;color:#eaffff;border:1px solid #ffd166;border-radius:16px;font:14px system-ui}#nftDropPanel[hidden]{display:none}#nftDropPanel button,.nftDropSign{display:inline-block;min-height:44px;padding:10px;margin:4px;border:1px solid #63c5ad;border-radius:8px;background:#183e46;color:#eaffff;text-decoration:none;cursor:pointer}.nftPickerTools{display:grid;gap:8px;margin:10px 0}.nftPickerTools input{width:100%;min-height:44px;padding:10px;background:#173e46;border:1px solid #63c5ad;border-radius:8px;color:#eaffff;font:16px system-ui}#nftDropPanel p{line-height:1.45}#nftDropPanel [data-status]{position:sticky;top:0;background:#0b2634;padding:10px 0;z-index:1}#nftDropPanel button:disabled{opacity:.55;cursor:wait}#nftDropPanel small{display:block;overflow-wrap:anywhere;color:#a9c7ce}.nftDropCard{padding:10px 0;border-bottom:1px solid #3a535b}.nftDropCard{display:flow-root}.nftDropThumb{position:relative;display:inline-grid;place-items:center;width:84px;height:84px;background:#173e46;color:#ffd166;border-radius:10px;overflow:hidden;flex:none;font-size:30px;margin:0 10px 8px 0}.nftDropThumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#173e46}.nftDropThumb img[hidden]{display:none}.nftDropCard>.nftDropThumb{float:left}.nftDropGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.nftDropTile{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;padding:12px;background:#143541;border-radius:10px}.nftDropTile .nftDropThumb{margin:0}.nftDropTile strong{font-size:13px;overflow-wrap:anywhere}.nftDropArtRetry{font-size:11px;padding:6px 9px;border:1px solid #4ab8ac;border-radius:8px;background:#0b2937;color:#b6fff4}.nftDropArtRetry[hidden]{display:none}#nftDropCarry{position:fixed;right:12px;bottom:max(155px,22vh);z-index:33;padding:12px;background:#173c33;color:#ffe39e;border:1px solid #ffd166;border-radius:12px;max-width:170px;min-height:44px}#nftDropPanel[data-discovery]{top:50%;right:auto;left:50%;transform:translate(-50%,-50%);text-align:center;padding:22px;width:min(330px,calc(100vw - 44px))}#nftDropPanel[data-discovery] [data-create],#nftDropPanel[data-discovery] [data-mine]{display:none}#nftDropPanel[data-discovery] [data-close]{display:block;margin:0 0 0 auto}#nftDropPanel[data-discovery] h2{font-size:24px;line-height:1.2;margin:12px 0 20px}#nftDropPanel[data-discovery] [data-status]:empty{display:none}#nftDropPanel[data-discovery] [data-list]{display:flex;flex-direction:column;align-items:center;gap:12px}#nftDropPanel[data-discovery] .nftDropThumb{width:160px;height:160px;margin:0;font-size:14px}#nftDropPanel[data-discovery] [data-list]>button{width:100%;font-size:18px;background:#58e6cc;color:#062d36;font-weight:700}';document.head.append(style);
   button=el('button','◈ NFT drops');button.id='nftDropButton';button.type='button';button.hidden=!game.ready();button.onclick=()=>open();document.body.append(button);
   const place=el('button','◈ Place NFT here');place.id='nftDropCarry';place.type='button';place.hidden=true;place.onclick=()=>run(async()=>{const p=game.pose();if(!carry||p.map!=='town'||p.airborne||game.blocked(p.x,p.y))throw Error('Stand on walkable outdoor land to place this NFT.');panel.hidden=false;boxMode=false;boxControls();mode='placing';list.replaceChildren();status('Preparing placement at this spot…');const placed=await api('drop-place',{id:carry.id,map:p.map,x:p.x,y:p.y});if(placed.deeplink)signing(placed);else{status('NFT placed at this spot.');panel.hidden=true;}carry=null;game.broadcast();await refresh(true);});document.body.append(place);
   panel=el('section');panel.id='nftDropPanel';panel.hidden=true;panel.setAttribute('aria-label','NFT drops');panel.innerHTML='<button data-close type="button" aria-label="Close NFT drops">×</button><h2>NFT drops</h2><button data-create type="button">Create drop</button><button data-mine type="button">My NFT drops</button><p data-status role="status" aria-live="polite"></p><div data-list></div>';document.body.append(panel);note=panel.querySelector('[data-status]');list=panel.querySelector('[data-list]');panel.querySelector('[data-close]').onclick=()=>{panel.hidden=true;button.focus();};panel.querySelector('[data-create]').onclick=()=>selectNfts(boxMode);panel.querySelector('[data-mine]').onclick=()=>run(async()=>{if(boxMode)await showBox();else{mode='mine';await refresh(true);render();}});
   try{pending=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{}
   let activeUser=null,wasReady=false;setInterval(()=>{button.hidden=!game.ready();place.hidden=!carry||!game.ready()||game.pose().map!=='town';if(activeUser!==user()||(!wasReady&&game.ready())){activeUser=user();carry=null;mine=[];clearTimeout(poll);if(game.ready()&&user())refresh(true).then(()=>{if(pending?.user===user())startPoll();});}wasReady=game.ready();},1000);
   document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh(true);if(pending?.user===user())startPoll();}});
 }
 global.ATMNftDrops=Object.freeze({init,open,claim,nearest,actors,draw,publicState,refresh});
})(window);
