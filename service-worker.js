/* ATM Town v235.12.11 PWA service worker
 * - App shell is precached for fast relaunch.
 * - Same-origin game assets use stale-while-revalidate so repeat loads are fast
 *   without permanently pinning old art/chunks after a deploy.
 * - Runtime JS is fetched network-first with HTTP cache bypass so a deploy never
 *   mixes an old bootstrap with a new Luci conversation module.
 * - API/auth traffic is never cached.
 * - Web Push shows OS notifications when ATM Town is not visible and hands the
 *   ping directly to an open game window when it is visible.
 */
const BUILD_CACHE = 'atm-town-shell-v281-assisted-driving-3';
const ASSET_CACHE = 'atm-town-assets-v1';
const WORLD_CACHE = 'atm-town-world-v2';
const WORLD_SNAPSHOT='/__atm_world__/manifest.json';
const WORLD_INDEX='/__atm_world__/index.json';
const CACHE_PREFIX = 'atm-town-';

const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/js/config.js',
  '/js/maps.js',
  '/js/interactions.js',
  '/js/world-streaming.js',
  '/js/bootstrap.js',
  '/js/wallet/embedded-wallet.js',
  '/js/pwa.js',
  '/js/people-hub.js',
  '/js/fishing.js',
  '/js/nft-drops.js',
  '/js/world-objects.js',
  '/js/vehicles.js','/js/vehicle-contract.js','/js/fence-collision.js',
  '/js/world-object-index.js',
  '/js/object-render-sprite.js',
  '/js/footprint-geometry.js',
  '/js/object-silhouette.js',
  '/js/player-presence.js',
  '/js/world-events.js',
  '/js/zombie-outbreak.js',
  '/js/prop-hunt.js',
  '/js/luci-666.js',
  '/js/luci-666-beckon-ux.js',
  '/js/luci-666-horizontal-questions.js',
  '/js/luci-666-trustline.js',
  '/js/npc-dialogue-standard.js',
  '/js/atm-ecosystem-guide.js',
  '/assets/maps/town/foreground/day/assets_05_00.webp',
  '/assets/maps/town/foreground/day/assets_06_00.webp',
  '/assets/maps/town/foreground/day/assets_08_00.webp',
  '/assets/maps/town/foreground/day/assets_09_00.webp',
  '/assets/maps/town/foreground/day/assets_11_00.webp',
  '/assets/maps/town/foreground/day/assets_18_00.webp',
  '/js/hud-layout.js',
  '/js/live-chat.js',
  '/js/arcade-rewards.js',
  '/js/runtime/game-core.js',
  '/js/nft-issuer-setup.js',
  '/js/runtime/sky-run.js',
  '/js/runtime/platform-panic.js',
  '/js/runtime/ring-rumble.js',
  '/js/runtime/flappy-jetpack.js',
  '/js/runtime/neon-racer.js',
  '/js/runtime/darts.js',
  '/assets/ui/atm-town-logo.webp',
  '/assets/pwa/icon-192.png',
  '/assets/pwa/icon-512.png',
  '/assets/pwa/maskable-512.png',
  '/assets/pwa/apple-touch-icon.png',
  '/assets/world-events/horde/gutter.png',
  '/assets/world-events/horde/handy-man.png',
  '/assets/world-events/horde/beast-man.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(BUILD_CACHE);
    await cache.addAll(SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((name) => {
      if (!name.startsWith(CACHE_PREFIX)) return null;
      if (name === BUILD_CACHE || name === ASSET_CACHE || name === WORLD_CACHE) return null;
      return caches.delete(name);
    }));
    await self.clients.claim();
  })());
});

function isCacheableResponse(response) {
  return response && (response.ok || response.type === 'opaque');
}

async function networkFirst(request) {
  try {
    const url = new URL(request.url);
    const bypassHttpCache = url.pathname.endsWith('.js') || url.pathname === '/index.html';
    const response = await fetch(request, bypassHttpCache ? { cache: 'no-store' } : undefined);
    if (isCacheableResponse(response)) {
      const cache = await caches.open(BUILD_CACHE);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request, { ignoreSearch: false });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await caches.match('/index.html');
      if (shell) return shell;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await caches.match(request);
  const network = fetch(request).then((response) => {
    if (isCacheableResponse(response)) cache.put(request, response.clone()).catch(() => {});
    return response;
  }).catch(() => null);
  if (cached) {
    network.catch(() => {});
    return cached;
  }
  const response = await network;
  if (response) return response;
  throw new Error('Network unavailable and asset not cached.');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.headers.has('range')) return;

  const url = new URL(request.url);
  if(url.origin!==self.location.origin){
    if(request.destination==='image')event.respondWith(caches.open(WORLD_CACHE).then(async cache=>(await cache.match(request))||fetch(request)));
    return;
  }
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(caches.open(WORLD_CACHE).then(async cache=>(await cache.match(request))||staleWhileRevalidate(request, ASSET_CACHE)));
    return;
  }

  if (url.pathname.endsWith('.js') || url.pathname === '/index.html' || url.pathname.endsWith('.webmanifest')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.endsWith('.json')) {
    event.respondWith(staleWhileRevalidate(request, BUILD_CACHE));
  }
});

function worldAssets(manifest,objects=[]){
  const files=new Map();
  const add=(raw,hash='')=>{if(!raw)return;const url=new URL(raw,self.location.origin);if(!['https:','http:'].includes(url.protocol)||url.pathname.startsWith('/api/'))return;files.set(url.href,{url:url.href,hash:hash||''});};
  add(manifest.overview?.day,manifest.overview?.fileMeta?.sha256);add(manifest.overview?.night);
  for(const layer of Object.values(manifest.layers||{}))for(const key of layer.chunks||[])add(layer.sources?.[key]||`${layer.path}/${key}.${layer.format}`,layer.fileMeta?.[key]?.sha256);
  for(const object of objects)if(object.active!==false)add(object.sprite_url,object.image_file?.sha256);
  return [...files.values()];
}
async function postToClient(client,payload){try{client?.postMessage?.(payload);}catch{}}
async function readSaved(cache,key,fallback=null){try{return await(await cache.match(key))?.json()||fallback;}catch{return fallback;}}
async function downloadWorld(client,suppliedManifest){
  const cache=await caches.open(WORLD_CACHE),oldAssets=await caches.open(ASSET_CACHE);
  await postToClient(client,{type:'ATM_PWA_DOWNLOAD_PROGRESS',phase:'manifest',completed:0,total:0});
  let manifest=suppliedManifest;
  if(!manifest){const r=await fetch('/api/leaderboards?action=rewards-map-manifest',{cache:'no-store',signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('The live map could not be checked. Retry when connected.');manifest=await r.json();}
  if(!manifest?.layers||!manifest.cells||!manifest.bounds)throw Error('The live map is incomplete. Please retry.');
  const version=manifest.mapVersion||'original',objectKey='/__atm_world__/objects-'+encodeURIComponent(version);
  let objects;
  try{const r=await fetch('/api/leaderboards?action=rewards-world-objects&map_version='+encodeURIComponent(version),{cache:'no-store',signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Map objects unavailable');objects=(await r.json()).objects;}
  catch(e){const saved=await readSaved(cache,objectKey);if(!saved)throw Error('The map buildings could not be checked. Retry when connected.');objects=saved.objects;}
  if(!Array.isArray(objects))throw Error('Map buildings are incomplete. Please retry.');
  const files=worldAssets(manifest,objects),index=await readSaved(cache,WORLD_INDEX,{assets:{}});index.assets??={};
  let completed=0,cursor=0,stopped=false;const total=files.length;
  const saveIndex=()=>cache.put(WORLD_INDEX,new Response(JSON.stringify(index),{headers:{'Content-Type':'application/json'}}));
  await postToClient(client,{type:'ATM_PWA_DOWNLOAD_PROGRESS',phase:'world',completed,total});
  const results=await Promise.allSettled(Array.from({length:Math.min(4,total)},async()=>{
    while(cursor<total&&!stopped){
      const file=files[cursor++];
      try{
        let existing=await cache.match(file.url),known=index.assets[file.url];
        if(!existing&&!file.hash){existing=await oldAssets.match(file.url);if(existing)await cache.put(file.url,existing.clone());}
        const unchanged=existing&&(file.hash?known?.hash===file.hash:known?.build===BUILD_CACHE);
        if(!unchanged){
          const headers={};if(existing&&!file.hash&&existing.headers.get('etag'))headers['If-None-Match']=existing.headers.get('etag');
          const response=await fetch(file.url,{cache:'no-cache',credentials:new URL(file.url).origin===self.location.origin?'same-origin':'omit',headers,signal:AbortSignal.timeout(120000)});
          if(response.status!==304){
            if(!response.ok||response.type==='opaque')throw Error('Could not save a map asset ('+response.status+').');
            if(file.hash){const bytes=await response.clone().arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');if(hash!==file.hash.toLowerCase())throw Error('A map asset changed during download. Retry to get the current map.');}
            await cache.put(file.url,response);
          }else if(!existing)throw Error('The map asset is not saved yet.');
        }
        index.assets[file.url]={hash:file.hash,build:BUILD_CACHE};completed++;
        if(completed%5===0||completed===total){await saveIndex();await postToClient(client,{type:'ATM_PWA_DOWNLOAD_PROGRESS',phase:'world',completed,total});}
      }catch(error){stopped=true;throw error;}
    }
  }));
  await saveIndex();const failure=results.find(r=>r.status==='rejected');if(failure)throw failure.reason;
  index.build=BUILD_CACHE;await saveIndex();
  // Publish a complete snapshot only after all of its assets are stored.
  await cache.put(objectKey,new Response(JSON.stringify({objects}),{headers:{'Content-Type':'application/json'}}));
  await cache.put(WORLD_SNAPSHOT,new Response(JSON.stringify(manifest),{headers:{'Content-Type':'application/json'}}));
  const keep=new Set([...files.map(file=>file.url),... [WORLD_INDEX,WORLD_SNAPSHOT,objectKey].map(key=>new URL(key,self.location.origin).href)]);
  for(const request of await cache.keys())if(!keep.has(request.url))await cache.delete(request);
  await postToClient(client,{type:'ATM_PWA_DOWNLOAD_COMPLETE',completed,total,mapVersion:version});
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'ATM_PWA_SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'ATM_PWA_DOWNLOAD_WORLD') {
    event.waitUntil(downloadWorld(event.ports?.[0]||event.source,data.manifest).catch((error) => postToClient(event.ports?.[0]||event.source, {
      type: 'ATM_PWA_DOWNLOAD_ERROR',
      message: String(error?.message || 'Game data download failed.')
    })));
  }
});

async function visibleWindowClient() {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return windows.find((client) => client.visibilityState === 'visible' && client.focused)
    || windows.find((client) => client.visibilityState === 'visible')
    || null;
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload = {};
    try { payload = event.data ? event.data.json() : {}; } catch (_) {
      payload = { message: event.data?.text?.() || 'You have a new ATM Town notification.' };
    }
    if (payload.type !== 'player_ping') return;

    const visibleClient = await visibleWindowClient();
    if (visibleClient) {
      visibleClient.postMessage({ type: 'ATM_PLAYER_PING', payload });
      return;
    }

    const sender = payload.sender_handle ? `@${payload.sender_handle}` : (payload.sender_name || 'An ATM Town player');
    const body = String(payload.message || `${sender} pinged you in ATM Town.`).slice(0, 180);
    await self.registration.showNotification('ATM Town · Player Ping', {
      body,
      icon: '/assets/pwa/icon-192.png',
      badge: '/assets/pwa/icon-192.png',
      tag: payload.ping_id ? `atm-ping-${payload.ping_id}` : 'atm-player-ping',
      renotify: true,
      data: {
        url: '/?source=push',
        ping_id: payload.ping_id || null,
        sender_user_id: payload.sender_user_id || null
      }
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = new URL(event.notification?.data?.url || '/', self.location.origin).href;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        try {
          await client.focus();
          if ('navigate' in client && client.url !== url) await client.navigate(url);
          return;
        } catch (_) {}
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});


