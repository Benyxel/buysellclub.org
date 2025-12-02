// Service Worker: Only cache static assets, NOT API calls
const ASSET_CACHE = "asset-cache-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Claim clients immediately so SW starts controlling pages
      await self.clients.claim();
      // Clear old API caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.includes("api-cache") || name.includes("runtime-cache"))
          .map((name) => caches.delete(name))
      );
    })()
  );
});

// Simple utility to limit cache size
async function trimCache(cacheName, maxEntries = 100) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    for (let i = 0; i < keys.length - maxEntries; i++) {
      await cache.delete(keys[i]);
    }
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // DO NOT CACHE API CALLS - Always fetch fresh from network
  if (req.url.includes("/buysellapi/") || req.url.includes("/api/")) {
    // Just pass through to network, no caching
    event.respondWith(fetch(req));
    return;
  }

  // Cache-first for same-origin static assets (css/js/images) only
  if (
    url.origin === location.origin &&
    (req.destination === "script" ||
      req.destination === "style" ||
      req.destination === "image" ||
      req.destination === "font")
  ) {
    event.respondWith(
      (async () => {
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
          return (
            cached ||
            new Response(null, { status: 504, statusText: "Gateway Timeout" })
          );
        }
      })()
    );
  }
});

// Listen for messages
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
