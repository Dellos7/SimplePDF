
const CACHE_NAME = 'privacypdf-v3';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Intentamos cachear los assets críticos uno a uno para evitar que un fallo bloquee todo
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(asset => cache.add(asset))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Manejo de navegación (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Si falla la red, servimos el index.html desde el caché (App Shell)
        return caches.match('index.html') || caches.match('./');
      })
    );
    return;
  }

  // Estrategia: Cache First con fallback a red para recursos externos y assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((fetchResponse) => {
        // No cacheamos peticiones que no sean GET o que no sean exitosas
        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic' && !event.request.url.includes('esm.sh')) {
          return fetchResponse;
        }

        // Cacheamos dinámicamente scripts de esm.sh y otros recursos útiles
        const url = event.request.url;
        if (url.includes('esm.sh') || url.includes('pdfjs-dist') || url.includes('googleapis') || url.includes('gstatic')) {
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return fetchResponse;
      }).catch(() => {
        // Si la red falla y no hay caché, simplemente fallamos (o podríamos devolver una imagen placeholder)
        return null;
      });
    })
  );
});
