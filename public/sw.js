const CACHE_NAME = 'skypopper-v2';
const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Google Fonts APIs and dependencies can be cached dynamically on request
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache primary documents
      return cache.addAll(OFFLINE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-while-revalidate strategy for maximum fluid offline experience
self.addEventListener('fetch', (event) => {
  // Only handle GET requests or same-origin / specific cross-origin static dependencies
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Exclude third party analytics, hot reloads, or development socket routes
  if (url.pathname.includes('/vite') || url.hostname.includes('localhost') || url.hostname.includes('hmr')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // If valid response, cache it dynamically for future offline loading
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Silent catch for offline fetch errors (since we serve cached content)
        });

      // Returns the cached resources immediately (low latency/offline), falling back to network if not cached yet.
      return cachedResponse || fetchPromise;
    })
  );
});
