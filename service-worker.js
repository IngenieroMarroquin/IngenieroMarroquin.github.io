// service-worker.js
const CACHE_NAME = 'signalcheck-pro-shell-v1';
const SW_VERSION = '1.1'; // Versión actualizada para la lógica de caché

// Lista de archivos que componen el "App Shell"
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-512x512.png',
  '/libs/chart.umd.js',
  '/libs/chartjs-plugin-datalabels.min.js',
  '/libs/jspdf.umd.min.js',
  '/libs/jspdf.plugin.autotable.min.js'
];

console.log(`Service Worker v${SW_VERSION} iniciando...`);

// Evento 'install': Se dispara cuando el SW se instala por primera vez.
self.addEventListener('install', (event) => {
  console.log(`[SW v${SW_VERSION}] Evento: install`);
  // Esperamos a que la promesa de cacheo se complete
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto. Cacheando el App Shell...');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => {
        console.log('Todos los recursos del App Shell han sido cacheados exitosamente.');
        return self.skipWaiting();
      })
  );
});

// Evento 'activate': Se dispara después de la instalación. Es donde se limpian cachés antiguos.
self.addEventListener('activate', (event) => {
  console.log(`[SW v${SW_VERSION}] Evento: activate`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Si el nombre del caché no es el actual, lo borramos
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Evento 'fetch': Se dispara cada vez que la aplicación solicita un recurso (imagen, script, etc.)
self.addEventListener('fetch', (event) => {
  // Estrategia: Cache First, falling back to Network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si encontramos una respuesta en el caché, la retornamos
        if (response) {
          // console.log('Sirviendo desde caché:', event.request.url);
          return response;
        }
        // Si no, vamos a la red a buscarlo
        // console.log('Buscando en la red:', event.request.url);
        return fetch(event.request);
      })
  );
});
