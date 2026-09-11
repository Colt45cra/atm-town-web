/* ATM Town XRPL NFT performance hotfix.
 * Keeps ledger ownership authoritative while caching presentation metadata and
 * artwork locally, hydrating more efficiently, and preventing stalled IPFS
 * artwork from leaving Trade Beacons stuck forever.
 */
(function installAtmNftPerformance(global){
  'use strict';

  const CACHE_KEY='atm_nft_metadata_cache_v2';
  const SUCCESS_TTL_MS=7*24*60*60*1000;
  const FAILURE_TTL_MS=2*60*1000;
  const CACHE_LIMIT=180;
  const ART_CACHE='atm-nft-art-v1';
  const ART_CACHE_LIMIT=220;
  const BEACON_IMAGE_TIMEOUT_MS=2600;
  const GATEWAY_PRIORITY=['w3s.link','nftstorage.link','dweb.link','gateway.pinata.cloud','ipfs.io'];
  const memoryArtUrls=new Map();
  const artFetches=new Map();

  function readCache(){
    try{
      const parsed=JSON.parse(global.localStorage.getItem(CACHE_KEY)||'{}');
      return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
    }catch(_error){return {};}
  }
  function writeCache(cache){
    try{global.localStorage.setItem(CACHE_KEY,JSON.stringify(cache));return true;}catch(_error){return false;}
  }
  function prioritizedCandidates(values){
    const list=[...new Set((Array.isArray(values)?values:[values]).map(v=>String(v||'').trim()).filter(Boolean))];
    return list.sort((a,b)=>{
      let ah=GATEWAY_PRIORITY.length,bh=GATEWAY_PRIORITY.length;
      try{ah=GATEWAY_PRIORITY.indexOf(new URL(a,location.origin).hostname.toLowerCase());if(ah<0)ah=GATEWAY_PRIORITY.length;}catch(_e){}
      try{bh=GATEWAY_PRIORITY.indexOf(new URL(b,location.origin).hostname.toLowerCase());if(bh<0)bh=GATEWAY_PRIORITY.length;}catch(_e){}
      return ah-bh;
    });
  }
  function normalizeMeta(meta){
    if(!meta||typeof meta!=='object')return meta;
    const candidates=prioritizedCandidates([meta.image_url,...(Array.isArray(meta.image_candidates)?meta.image_candidates:[])]);
    return {...meta,image_url:candidates[0]||String(meta.image_url||''),image_candidates:candidates};
  }
  function cacheTtl(meta){return meta?.status==='unavailable'?FAILURE_TTL_MS:SUCCESS_TTL_MS;}
  function getCached(tokenId,uri){
    const cache=readCache(),entry=cache[tokenId];
    if(!entry||entry.uri!==uri||!entry.meta||Date.now()-Number(entry.savedAt||0)>cacheTtl(entry.meta))return null;
    return normalizeMeta(entry.meta);
  }
  function putCached(tokenId,uri,meta){
    if(!tokenId||!meta)return;
    const cache=readCache();cache[tokenId]={uri,savedAt:Date.now(),meta:normalizeMeta(meta)};
    const keys=Object.keys(cache);
    if(keys.length>CACHE_LIMIT){
      keys.sort((a,b)=>Number(cache[a]?.savedAt||0)-Number(cache[b]?.savedAt||0));
      for(const key of keys.slice(0,keys.length-CACHE_LIMIT))delete cache[key];
    }
    writeCache(cache);
  }

  function artKey(tokenId,src){
    const safeId=String(tokenId||'').toUpperCase().replace(/[^A-F0-9]/g,'').slice(0,64)||'UNKNOWN';
    let tail='';
    try{tail=btoa(unescape(encodeURIComponent(String(src||'')))).replace(/[^A-Za-z0-9]/g,'').slice(-48);}catch(_e){}
    return new URL(`/__atm_nft_art__/${safeId}/${tail||'image'}`,location.origin).toString();
  }
  async function getArtCache(){
    if(!('caches' in global))return null;
    try{return await caches.open(ART_CACHE);}catch(_e){return null;}
  }
  async function trimArtCache(cache){
    if(!cache)return;
    try{
      const keys=await cache.keys();
      if(keys.length>ART_CACHE_LIMIT)await Promise.all(keys.slice(0,keys.length-ART_CACHE_LIMIT).map(req=>cache.delete(req)));
    }catch(_e){}
  }
  async function blobUrlFromCachedArt(tokenId,src){
    const key=artKey(tokenId,src);
    if(memoryArtUrls.has(key))return memoryArtUrls.get(key);
    const cache=await getArtCache();
    if(!cache)return '';
    try{
      const hit=await cache.match(key);if(!hit)return '';
      const blob=await hit.blob();if(!blob||!blob.size)return '';
      const url=URL.createObjectURL(blob);memoryArtUrls.set(key,url);return url;
    }catch(_e){return '';}
  }
  async function fetchAndCacheArt(tokenId,candidates){
    const list=prioritizedCandidates(candidates).slice(0,5);
    for(const src of list){
      const key=artKey(tokenId,src);
      if(memoryArtUrls.has(key))return memoryArtUrls.get(key);
      const pending=artFetches.get(key);
      if(pending){const url=await pending;if(url)return url;continue;}
      const task=(async()=>{
        const cache=await getArtCache();
        if(cache){
          try{
            const hit=await cache.match(key);
            if(hit){const blob=await hit.blob();if(blob?.size){const url=URL.createObjectURL(blob);memoryArtUrls.set(key,url);return url;}}
          }catch(_e){}
        }
        try{
          const controller=new AbortController();
          const timer=setTimeout(()=>controller.abort(),6500);
          let response;
          try{response=await fetch(src,{mode:'cors',credentials:'omit',cache:'force-cache',signal:controller.signal});}
          finally{clearTimeout(timer);}
          if(!response?.ok)return '';
          const contentType=String(response.headers.get('content-type')||'').toLowerCase();
          if(contentType&&!contentType.startsWith('image/')&&!contentType.includes('octet-stream'))return '';
          const blob=await response.blob();if(!blob?.size)return '';
          if(cache){
            try{
              await cache.put(key,new Response(blob,{headers:{'Content-Type':blob.type||'image/*','Cache-Control':'public, max-age=31536000, immutable'}}));
              trimArtCache(cache);
            }catch(_e){}
          }
          const url=URL.createObjectURL(blob);memoryArtUrls.set(key,url);return url;
        }catch(_e){return '';}
      })();
      artFetches.set(key,task);
      const url=await task.finally(()=>artFetches.delete(key));
      if(url)return url;
    }
    return '';
  }
  async function resolveArtUrl(tokenId,candidates){
    const list=prioritizedCandidates(candidates);
    for(const src of list){const cached=await blobUrlFromCachedArt(tokenId,src);if(cached)return cached;}
    return fetchAndCacheArt(tokenId,list);
  }

  function refreshActiveBeacon(nft){
    try{
      const tokenId=lockerNftTokenId(nft);
      if(!tradeBeaconState?.active||String(tradeBeaconState.tokenId||'').toUpperCase()!==tokenId)return;
      const rebuilt=tradeBeaconBuildFromNft(nft,tradeBeaconState.mode);
      if(!rebuilt.imageUrl&&!rebuilt.imageCandidates?.length)return;
      tradeBeaconState=rebuilt;
      tradeBeaconSave();
      if(typeof broadcastState==='function')broadcastState(true);
    }catch(_error){}
  }

  lockerNftScheduleRender=function lockerNftScheduleRenderFast(){
    clearTimeout(lockerNftRenderTimer);
    lockerNftRenderTimer=setTimeout(()=>{
      lockerNftRenderTimer=0;
      if(lockerState.open)lockerRender();
      global.atmAttributeStoreRender?.();
    },220);
  };

  lockerLoadNftMetadata=async function lockerLoadNftMetadataCached(nft){
    const tokenId=lockerNftTokenId(nft);
    if(!tokenId||lockerState.nftMetadata.has(tokenId)||lockerState.nftMetadataLoading.has(tokenId))return;
    const uri=String(nft?.URI||'');
    if(!uri){
      const missing={status:'missing',name:'',description:'',image_url:'',image_candidates:[],attributes:[]};
      lockerState.nftMetadata.set(tokenId,missing);putCached(tokenId,uri,missing);lockerNftScheduleRender();return;
    }
    const cached=getCached(tokenId,uri);
    if(cached){lockerState.nftMetadata.set(tokenId,cached);refreshActiveBeacon(nft);return;}
    lockerState.nftMetadataLoading.add(tokenId);lockerNftScheduleRender();
    try{
      const data=await apiWithAuth('/api/xrpl-nft-metadata',{method:'POST',body:JSON.stringify({nftoken_id:tokenId,uri})});
      const meta=normalizeMeta(data||{status:'unavailable'});
      lockerState.nftMetadata.set(tokenId,meta);putCached(tokenId,uri,meta);refreshActiveBeacon(nft);
    }catch(error){
      const meta={status:'unavailable',error:error?.message||'Metadata unavailable.',name:'',description:'',image_url:'',image_candidates:[],attributes:[]};
      lockerState.nftMetadata.set(tokenId,meta);putCached(tokenId,uri,meta);
    }finally{
      lockerState.nftMetadataLoading.delete(tokenId);lockerNftScheduleRender();
    }
  };

  lockerHydrateNftMetadata=async function lockerHydrateNftMetadataFast(){
    const generation=++lockerState.nftHydrationGeneration;
    const queue=lockerState.nfts
      .filter(nft=>!lockerState.nftMetadata.has(lockerNftTokenId(nft))&&!lockerState.nftMetadataLoading.has(lockerNftTokenId(nft)))
      .sort((a,b)=>Number(lockerIsYouAreAtmNft(b))-Number(lockerIsYouAreAtmNft(a)));
    let cursor=0;
    const workers=Math.min(8,queue.length);
    await Promise.all(Array.from({length:workers},async()=>{
      while(generation===lockerState.nftHydrationGeneration&&cursor<queue.length){
        const nft=queue[cursor++];
        await lockerLoadNftMetadata(nft);
      }
    }));
    if(generation===lockerState.nftHydrationGeneration){lockerEnforceEquipmentOwnership();if(lockerState.open)lockerRender();}
  };

  // Showcase must never depend on CORS fetch succeeding. Prefer an already-cached
  // blob, then fall back to normal <img> gateway loading while caching in background.
  tradeBeaconSetImage=function tradeBeaconSetImageStable(host,candidates,alt='XRPL NFT'){
    const tokenId=String(tradeBeaconState?.tokenId||alt||'').toUpperCase();
    const list=prioritizedCandidates(candidates).slice(0,5);
    let cancelled=false,index=0,timer=0,settled=false;
    host.textContent='';
    const loading=document.createElement('div');loading.className='tradeBeaconFallback';loading.textContent='◈';host.appendChild(loading);
    const clearTimer=()=>{if(timer){clearTimeout(timer);timer=0;}};
    const showFallback=()=>{if(cancelled||settled)return;settled=true;clearTimer();host.textContent='';const f=document.createElement('div');f.className='tradeBeaconFallback';f.textContent='◈';host.appendChild(f);};
    const tryRemote=()=>{
      if(cancelled||settled)return;
      clearTimer();
      if(index>=list.length){showFallback();return;}
      const src=list[index++];
      const img=document.createElement('img');
      img.alt=alt;img.referrerPolicy='no-referrer';img.loading='eager';img.decoding='async';
      const stillCurrent=()=>!cancelled&&!settled;
      img.addEventListener('load',()=>{
        if(!stillCurrent())return;
        settled=true;clearTimer();host.textContent='';host.appendChild(img);
        fetchAndCacheArt(tokenId,[src]).catch(()=>{});
      },{once:true});
      img.addEventListener('error',()=>{if(stillCurrent())tryRemote();},{once:true});
      timer=setTimeout(()=>{if(stillCurrent())tryRemote();},BEACON_IMAGE_TIMEOUT_MS);
      img.src=src;
    };
    (async()=>{
      for(const src of list){
        const local=await blobUrlFromCachedArt(tokenId,src);
        if(cancelled||settled)return;
        if(local){
          const img=document.createElement('img');img.alt=alt;img.loading='eager';img.decoding='async';
          img.addEventListener('load',()=>{if(cancelled||settled)return;settled=true;clearTimer();host.textContent='';host.appendChild(img);},{once:true});
          img.addEventListener('error',()=>{if(!cancelled&&!settled)tryRemote();},{once:true});
          img.src=local;return;
        }
      }
      tryRemote();
    })();
    return ()=>{cancelled=true;clearTimer();};
  };

  // Locker artwork: never swap the src of an image that has already rendered.
  // That source swapping caused the visible flash/glitch while scrolling. Use a
  // cached blob only when it is available immediately; otherwise leave the normal
  // browser image alone and warm the persistent cache after a successful load.
  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(!(node instanceof Element))continue;
        const images=node.matches?.('img')?[node]:[...(node.querySelectorAll?.('img')||[])];
        for(const img of images){
          if(img.dataset.atmNftCacheBound==='1')continue;
          const raw=String(img.getAttribute('src')||img.currentSrc||img.src||'');
          if(!raw||raw.startsWith('blob:')||raw.startsWith('data:'))continue;
          if(!/(ipfs|w3s\.link|nftstorage\.link|dweb\.link|pinata|gateway)/i.test(raw))continue;
          img.dataset.atmNftCacheBound='1';
          const card=img.closest?.('[data-nftoken-id],[data-token-id],.lockerNftCard,.nftCard');
          const tokenId=String(card?.dataset?.nftokenId||card?.dataset?.tokenId||img.alt||raw).toUpperCase();
          blobUrlFromCachedArt(tokenId,raw).then(local=>{
            if(!local||!img.isConnected)return;
            // Replace only if the remote artwork has not painted yet.
            if(!(img.complete&&img.naturalWidth>0))img.src=local;
          });
          const warm=()=>{fetchAndCacheArt(tokenId,[raw]).catch(()=>{});};
          if(img.complete&&img.naturalWidth>0)warm();
          else img.addEventListener('load',warm,{once:true});
        }
      }
    }
  });
  try{observer.observe(document.documentElement,{childList:true,subtree:true});}catch(_e){}

  global.ATMNftPerformance=Object.freeze({
    version:'1.1.1',
    clearMetadataCache(){try{global.localStorage.removeItem(CACHE_KEY);}catch(_error){}},
    async clearArtworkCache(){
      for(const url of memoryArtUrls.values()){try{URL.revokeObjectURL(url);}catch(_e){}}
      memoryArtUrls.clear();
      try{if('caches' in global)await caches.delete(ART_CACHE);}catch(_e){}
    },
    cachedEntries(){return Object.keys(readCache()).length;},
    async cachedArtworkEntries(){try{const cache=await getArtCache();return cache?(await cache.keys()).length:0;}catch(_e){return 0;}},
    resolveArtwork:resolveArtUrl
  });
})(window);
