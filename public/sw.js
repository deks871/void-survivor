/**
 * Void Survivor — Service Worker (sw.js)
 * Implements install, activate, and cache-first fetch strategy for static assets
 * so the game works 100% offline and meets Google Chrome Android PWA criteria.
 */

const CACHE_NAME = 'void-survivor-cache-v2';
const FONT_CACHE_NAME = 'void-survivor-fonts-v2';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const allowedCaches = new Set([CACHE_NAME, FONT_CACHE_NAME]);
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (!allowedCaches.has(name)) {
              return caches.delete(name);
            }
            return undefined;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Warm cache with resources loaded during initial page boot
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_LOADED_RESOURCES' && Array.isArray(event.data.urls)) {
    const urls = event.data.urls;
    event.waitUntil(
      (async () => {
        const appCache = await caches.open(CACHE_NAME);
        const fontCache = await caches.open(FONT_CACHE_NAME);
        await Promise.all(
          urls.map(async (rawUrl) => {
            try {
              const parsed = new URL(rawUrl, self.location.origin);
              if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
              const isFont =
                parsed.hostname === 'fonts.googleapis.com' ||
                parsed.hostname === 'fonts.gstatic.com';
              const targetCache = isFont ? fontCache : appCache;
              const existing = await targetCache.match(parsed.href);
              if (!existing) {
                const res = await fetch(parsed.href);
                if (res && (res.status === 200 || res.type === 'opaque')) {
                  await targetCache.put(parsed.href, res);
                }
              }
            } catch {
              // Ignore individual fetch errors
            }
          })
        );
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ cached: true });
        }
      })()
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // 1. Google Fonts (stylesheets & font files): Cache-First
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }
        try {
          const response = await fetch(request);
          if (response && (response.status === 200 || response.type === 'opaque')) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return new Response('', { status: 408, statusText: 'Offline' });
        }
      })
    );
    return;
  }

  // 2. HTML Navigation requests: Cache-First fallback when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put('/', networkResponse.clone());
          return networkResponse;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex =
            (await cache.match(request)) ||
            (await cache.match('/')) ||
            (await cache.match('/index.html'));
          if (cachedIndex) {
            return cachedIndex;
          }
          return new Response('Offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
      })()
    );
    return;
  }

  // 3. Static Assets (JS, CSS, images, icons, audio, manifest): Cache-First strategy
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          // Update cache in background while returning cached asset immediately
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return new Response('', { status: 408, statusText: 'Offline' });
        }
      })
    );
  }
});
