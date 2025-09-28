// service-worker.js

const CACHE_NAME = 'signalcheck-pro-v7.0.0';

// Lista de archivos finales que estarán en la carpeta 'dist'.
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

// Evento 'install': Cachea los archivos fundamentales de la app.
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

// Evento 'activate': Limpia los cachés antiguos.
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

// Evento 'fetch': Estrategia "Cache First".
// Sirve desde el caché. Si no está en caché, va a la red.
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});