// Service Worker pour améliorer le cache et les performances
const CACHE_VERSION = 'portfolio-v2.1';
const CACHE_ASSETS = [
  './',
  './index.html',
  './main.js',
  './assets/grass.jpg',
  './assets/cloud.jpg',
  './assets/logo(180).png',
  './assets/Logo_32_.ico',
  './manifest.json'
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

  // Ne mettre en cache que les requêtes GET sans Range (évite 206 Partial Content)
  if (request.method !== 'GET' || request.headers.has('range')) {
    return; // laisser passer au réseau par défaut
  }

  // Stratégie Network First pour HTML (toujours à jour)
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          try {
            const isPartial = response && (response.status === 206 || response.headers.has('Content-Range') || response.headers.has('content-range'));
            if (response && response.status === 200 && response.type === 'basic' && !isPartial) {
              const responseClone = response.clone();
              caches.open(CACHE_VERSION).then((cache) => {
                cache.put(request, responseClone);
              });
            }
          } catch (_) { /* ignore cache update errors */ }
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
            try {
              // Éviter de mettre en cache les réponses partielles (206) et opaques
              const isPartial = response.status === 206 || response.headers.has('Content-Range') || response.headers.has('content-range');
              const isVideo = request.destination === 'video' || /\.mp4($|\?)/i.test(url.pathname);
              if (response && response.status === 200 && response.type === 'basic' && !isPartial && !isVideo) {
                caches.open(CACHE_VERSION).then((cache) => {
                  cache.put(request, response.clone());
                });
              }
            } catch (_) { /* ignore cache update errors */ }
          }).catch(() => {});
          return cachedResponse;
        }

        // Si pas en cache, fetch et mettre en cache
        return fetch(request).then((response) => {
          // Ne pas cacher les erreurs, réponses partielles ou vidéos
          const isPartial = response && (response.status === 206 || response.headers.has('Content-Range') || response.headers.has('content-range'));
          const isVideo = request.destination === 'video' || /\.mp4($|\?)/i.test(url.pathname);
          if (!response || response.status !== 200 || response.type === 'error' || isPartial || isVideo) {
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
