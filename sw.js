// Simple offline-first SW for WeatherNow (Vercel + /api/*)
// Bump this when you change cached assets:
const CACHE_NAME = 'weathernow-v3';

const APP_SHELL = [
  '/',            // vercel.json routes "/" -> /index.html
  '/index.html',
  '/styles.css',
  '/script.js'
  // We could try caching Font Awesome CDN, but it's cross-origin (opaque).
  // It's fine to let the browser handle it via HTTP cache.
];

// Utility: cache-first for static files
async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req, { ignoreSearch: true });
  if (cached) return cached;

  const res = await fetch(req);
  // Only cache basic/same-origin GET 200s
  if (req.method === 'GET' && res.ok && res.type !== 'opaque') {
    cache.put(req, res.clone());
  }
  return res;
}

// Utility: network-first for API with fallback to cache
async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const res = await fetch(req);
    if (req.method === 'GET' && res.ok) {
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    // Last resort — basic offline JSON
    return new Response(JSON.stringify({ error: 'offline', data: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // remove old caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('weathernow-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GETs
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // API calls -> network first
  if (request.url.includes('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else (HTML/CSS/JS) -> cache first
  event.respondWith(cacheFirst(request));
});
