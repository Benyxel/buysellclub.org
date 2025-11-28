// Service Worker: runtime caching for API and static assets
const RUNTIME_CACHE = 'runtime-cache-v1';
const API_CACHE = 'api-cache-sw-v1';
const ASSET_CACHE = 'asset-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Claim clients immediately so SW starts controlling pages
    await self.clients.claim();
  })());
});

// Simple utility to limit cache size (not perfect LRU)
async function trimCache(cacheName, maxEntries = 100) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    for (let i = 0; i < keys.length - maxEntries; i++) {
      await cache.delete(keys[i]);
    }
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Stale-while-revalidate for API calls (contains /buysellapi/ or /api/)
  if (req.url.includes('/buysellapi/') || req.url.includes('/api/')) {
    event.respondWith((async () => {
      const cache = await caches.open(API_CACHE);
      const cachedResponse = await cache.match(req);

      const networkFetch = fetch(req).then(async (networkResponse) => {
        try {
          if (networkResponse && networkResponse.status === 200) {
            await cache.put(req, networkResponse.clone());
            // Trim cache to reasonable size
            trimCache(API_CACHE, 200);
          }
        } catch (e) {
          // ignore storage errors
        }
        return networkResponse;
      }).catch(() => null);

      // If we have cached response return it immediately and kick off network refresh
      if (cachedResponse) {
        // update in background
        event.waitUntil(networkFetch);
        return cachedResponse;
      }

      // Otherwise wait for network
      const fres = await networkFetch;
      if (fres) return fres;
      // fallback to cache if network fails
      return cachedResponse || new Response(null, { status: 503, statusText: 'Service Unavailable' });
    })());
    return;
  }

  // Cache-first for same-origin static assets (css/js/images)
  if (url.origin === location.origin && (req.destination === 'script' || req.destination === 'style' || req.destination === 'image' || req.destination === 'font')) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const net = await fetch(req);
        if (net && net.status === 200) {
          cache.put(req, net.clone());
          trimCache(ASSET_CACHE, 300);
        }
        return net;
      } catch (e) {
        return cached || new Response(null, { status: 504, statusText: 'Gateway Timeout' });
      }
    })());
  }
});

// Listen for skipWaiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
