const CACHE_NAME = 'signalcheck-pro-v4'; 
const urlsToCache = [
  '/',
  'index.html',
  'style.css',
  'script.js',
  'dbManager.js',
  'manifest.json',
  'libs/chart.umd.js',
  'libs/chartjs-plugin-datalabels.min.js',
  'libs/jspdf.umd.min.js',
  'libs/jspdf.plugin.autotable.min.js',
  'images/icons/icon-192x192.png',
  'images/icons/icon-512x512.png'
];

// Durante la instalación, se cachean los archivos fundamentales de la app
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Precargando archivos en caché...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Forza al nuevo Service Worker a activarse inmediatamente
        return self.skipWaiting();
      })
  );
});

// Durante la activación, se limpian los cachés antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        // Toma el control de todos los clientes abiertos inmediatamente
        return self.clients.claim();
    })
  );
});

// Estrategia "Stale-While-Revalidate" con filtro de seguridad
self.addEventListener('fetch', event => {
  // CORRECCIÓN: Si la petición no es para un recurso web estándar (http/https),
  // no la procesamos y dejamos que el navegador la maneje normalmente.
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        // Sirve desde caché primero (stale)
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Mientras tanto, actualiza la caché con la nueva versión (revalidate)
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
        // Retorna la respuesta de la caché si existe, o espera a la red si no.
        return response || fetchPromise;
      });
    })
  );
});

// Escucha mensajes de la aplicación, como el de "skipWaiting"
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
