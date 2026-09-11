/* ATM Town XRPL NFT performance hotfix.
 * Keeps ledger ownership authoritative while caching presentation metadata locally,
 * hydrating more efficiently, and preventing stalled IPFS artwork from leaving
 * Trade Beacons stuck forever.
 */
(function installAtmNftPerformance(global){
  'use strict';

  const CACHE_KEY='atm_nft_metadata_cache_v2';
  const SUCCESS_TTL_MS=7*24*60*60*1000;
  const FAILURE_TTL_MS=10*60*1000;
  const CACHE_LIMIT=180;
  const BEACON_IMAGE_TIMEOUT_MS=2400;
  const GATEWAY_PRIORITY=['w3s.link','nftstorage.link','dweb.link','gateway.pinata.cloud','ipfs.io'];

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

  // Batch visual updates instead of rebuilding the entire NFT grid after every
  // individual metadata request completes.
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
    if(cached){
      lockerState.nftMetadata.set(tokenId,cached);
      refreshActiveBeacon(nft);
      return;
    }

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
    if(generation===lockerState.nftHydrationGeneration){
      lockerEnforceEquipmentOwnership();
      if(lockerState.open)lockerRender();
    }
  };

  // A gateway can leave an <img> pending without ever firing error. Use a fresh
  // image element for each attempt so a late event from a timed-out request can
  // never interfere with the next gateway candidate.
  tradeBeaconSetImage=function tradeBeaconSetImageWithTimeout(host,candidates,alt='XRPL NFT'){
    const list=prioritizedCandidates(candidates).slice(0,4);
    let index=0,timer=0,settled=false;
    const clearTimer=()=>{if(timer){clearTimeout(timer);timer=0;}};
    const fallback=()=>{
      if(settled)return;
      settled=true;clearTimer();host.textContent='';
      const f=document.createElement('div');f.className='tradeBeaconFallback';f.textContent='◈';host.appendChild(f);
    };
    const tryNext=()=>{
      if(settled)return;
      clearTimer();
      if(index>=list.length){fallback();return;}
      const src=list[index++];
      const img=document.createElement('img');
      img.alt=alt;img.referrerPolicy='no-referrer';img.loading='eager';img.decoding='async';
      host.textContent='';host.appendChild(img);
      const stillCurrent=()=>host.firstChild===img;
      img.addEventListener('load',()=>{if(!stillCurrent()||settled)return;settled=true;clearTimer();},{once:true});
      img.addEventListener('error',()=>{if(stillCurrent()&&!settled)tryNext();},{once:true});
      timer=setTimeout(()=>{if(stillCurrent()&&!settled)tryNext();},BEACON_IMAGE_TIMEOUT_MS);
      img.src=src;
    };
    if(!list.length){fallback();return;}
    tryNext();
  };

  global.ATMNftPerformance=Object.freeze({
    version:'1.0.1',
    clearMetadataCache(){try{global.localStorage.removeItem(CACHE_KEY);}catch(_error){}},
    cachedEntries(){return Object.keys(readCache()).length;}
  });
})(window);
