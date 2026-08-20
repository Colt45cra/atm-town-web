/* ATM Town v235.9.2 PWA service worker
 * - App shell is precached for fast relaunch.
 * - Same-origin game assets use stale-while-revalidate so repeat loads are fast
 *   without permanently pinning old art/chunks after a deploy.
 * - API/auth traffic is never cached.
 * - Web Push shows OS notifications when ATM Town is not visible and hands the
 *   ping directly to an open game window when it is visible.
 */
const BUILD_CACHE = 'atm-town-shell-v235.9.2';
const ASSET_CACHE = 'atm-town-assets-v1';
const WORLD_CACHE = ASSET_CACHE;
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
  '/js/world-events.js',
  '/js/zombie-outbreak.js',
  '/js/hud-layout.js',
  '/js/live-chat.js',
  '/js/runtime/game-core.js',
  '/js/runtime/sky-run.js',
  '/js/runtime/platform-panic.js',
  '/js/runtime/ring-rumble.js',
  '/js/runtime/flappy-jetpack.js',
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
    const response = await fetch(request);
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
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    return;
  }

  if (url.pathname.endsWith('.js') || url.pathname === '/index.html' || url.pathname.endsWith('.webmanifest')) {
    // Build/runtime files must stay version-consistent after a deploy. Network
    // first avoids mixing a new HTML shell with stale JavaScript from the prior
    // PWA cache while still falling back offline.
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.endsWith('.json')) {
    event.respondWith(staleWhileRevalidate(request, BUILD_CACHE));
  }
});

function worldUrlsFromManifest(manifest) {
  const urls = new Set(['/assets/world/manifest.json']);
  const overview = manifest?.overview || {};
  if (overview.day) urls.add('/' + String(overview.day).replace(/^\/+/, ''));
  if (overview.night) urls.add('/' + String(overview.night).replace(/^\/+/, ''));
  for (const layer of Object.values(manifest?.layers || {})) {
    const base = String(layer?.path || '').replace(/^\/+|\/+$/g, '');
    const format = String(layer?.format || '').replace(/^\./, '');
    if (!base || !format) continue;
    for (const key of Array.isArray(layer?.chunks) ? layer.chunks : []) {
      urls.add(`/${base}/${key}.${format}`);
    }
  }
  return [...urls];
}

async function postToClient(client, payload) {
  try { client?.postMessage?.(payload); } catch (_) {}
}

async function downloadWorld(client) {
  const cache = await caches.open(WORLD_CACHE);
  await postToClient(client, { type: 'ATM_PWA_DOWNLOAD_PROGRESS', phase: 'manifest', completed: 0, total: 0 });
  const response = await fetch('/assets/world/manifest.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('World manifest could not be downloaded.');
  const manifest = await response.clone().json();
  await cache.put('/assets/world/manifest.json', response);
  const urls = worldUrlsFromManifest(manifest);
  let completed = 0;
  const total = urls.length;
  for (const url of urls) {
    try {
      const existing = await cache.match(url);
      if (!existing) {
        const assetResponse = await fetch(url);
        if (!assetResponse.ok) throw new Error(`HTTP ${assetResponse.status}`);
        await cache.put(url, assetResponse);
      }
    } catch (error) {
      await postToClient(client, { type: 'ATM_PWA_DOWNLOAD_ERROR', url, message: String(error?.message || error) });
      throw error;
    }
    completed += 1;
    if (completed === total || completed % 5 === 0) {
      await postToClient(client, { type: 'ATM_PWA_DOWNLOAD_PROGRESS', phase: 'world', completed, total });
    }
  }
  await postToClient(client, { type: 'ATM_PWA_DOWNLOAD_COMPLETE', completed, total });
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'ATM_PWA_SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'ATM_PWA_DOWNLOAD_WORLD') {
    event.waitUntil(downloadWorld(event.source).catch((error) => postToClient(event.source, {
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
