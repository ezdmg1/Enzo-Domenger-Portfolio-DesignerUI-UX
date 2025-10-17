// Service Worker pour améliorer le cache et les performances
const CACHE_VERSION = 'portfolio-v2.0';
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/main.js',
  '/assets/grass.jpg',
  '/assets/grass.webp',
  '/assets/cloud.jpg',
  '/assets/cloud.webp',
  '/assets/logo(180).png',
  '/assets/Logo_32_.ico',
  '/manifest.json'
];

// Install event - cache les assets critiques
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => {
        console.log('[SW] Cache ouvert');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - nettoie les anciens caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_VERSION) {
              console.log('[SW] Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - stratégie Cache First pour les assets, Network First pour HTML
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes externes (CDN, etc.)
  if (url.origin !== location.origin) {
    return;
  }

  // Stratégie Network First pour HTML (toujours à jour)
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Stratégie Cache First pour les assets (images, JS, CSS)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Retourner depuis le cache et mettre à jour en arrière-plan
          fetch(request).then((response) => {
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, response);
            });
          }).catch(() => {});
          return cachedResponse;
        }

        // Si pas en cache, fetch et mettre en cache
        return fetch(request).then((response) => {
          // Ne pas cacher les erreurs
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        });
      })
  );
});

// Message event - permet de forcer le refresh du cache
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});
