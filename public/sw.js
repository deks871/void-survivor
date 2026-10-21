/**
 * Void Survivor — Service Worker (sw.js)
 * Caches core app shell, JS/CSS bundles, Google Fonts, icons, and audio assets
 * for 100% offline playability and Chrome PWA installability.
 */

const CACHE_NAME = 'void-survivor-cache-v1';
const FONT_CACHE_NAME = 'void-survivor-fonts-v1';

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

// Warm cache with resources loaded during the initial page boot before SW took control
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

  // 1. Google Fonts (stylesheets & font binaries): Cache-First with network fallback
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

  // 2. HTML Navigation requests: Network-First falling back to cached app shell
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

  // 3. Same-origin static assets (JS, TS/Vite modules, CSS, images, fonts, audio, manifest):
  // Stale-While-Revalidate so offline reload serves cached bundles immediately.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => null);

        if (cachedResponse) {
          return cachedResponse;
        }

        const networkResponse = await networkFetch;
        if (networkResponse) {
          return networkResponse;
        }

        return new Response('', { status: 408, statusText: 'Offline' });
      })
    );
  }
});
