// service-worker.js

const CACHE_NAME = 'signalcheck-pro-v7.0.1'; // Incrementamos la versión

const urlsToCache = [
    '/',
    'index.html',
    'style.css',
    'script.js',
    'manifest.json',
    'libs/chart.umd.js',
    'libs/chartjs-plugin-datalabels.min.js',
    'libs/jspdf.umd.min.js',
    'libs/jspdf.plugin.autotable.min.js',
    'images/icons/icon-192x192.png',
    'images/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log(`Service Worker: Precargando archivos en caché ${CACHE_NAME}...`);
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

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
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // --- INICIO DE LA CORRECCIÓN ---
    // Si la petición no es GET, el SW no la gestiona.
    // Esto evita el error con las peticiones POST de la API.
    if (event.request.method !== 'GET') {
        return; 
    }
    // --- FIN DE LA CORRECCIÓN ---

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(response => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
                return response || fetchPromise;
            });
        })
    );
});