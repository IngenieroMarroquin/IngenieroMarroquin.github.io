// service-worker.js

// 1. Nombramos el caché con una versión. 
// ¡CAMBIE ESTE NÚMERO CADA VEZ QUE DESPLIEGUE UNA ACTUALIZACIÓN CRÍTICA!
const CACHE_NAME = 'signalcheck-pro-v5.0.0'; // Siguiente versión

// 2. Listamos los archivos FINALES que estarán en la carpeta 'dist'.
const urlsToCache = [
    '/',
    'index.html',
    'style.css',
    'script.js', // Este es el script combinado y ofuscado
    'manifest.json',
    'libs/chart.umd.js',
    'libs/chartjs-plugin-datalabels.min.js',
    'libs/jspdf.umd.min.js',
    'libs/jspdf.plugin.autotable.min.js',
    'images/icons/icon-192x192.png',
    'images/icons/icon-512x512.png'
    // Nota: dbManager.js ya no es necesario aquí
];

// 3. Evento 'install': Cachea los archivos fundamentales de la app.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Precargando archivos en caché v5.0.0...');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting()) // Activa el nuevo SW inmediatamente
    );
});

// 4. Evento 'activate': Limpia los cachés antiguos para liberar espacio.
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
        }).then(() => self.clients.claim()) // Toma control inmediato de la página
    );
});

// 5. Evento 'fetch': Estrategia "Stale-While-Revalidate"
// Sirve la app desde el caché para máxima velocidad y actualiza en segundo plano.
self.addEventListener('fetch', event => {
    if (!event.request.url.startsWith('http')) {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(response => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
                return response || fetchPromise; // Devuelve del caché si existe, si no, de la red.
            });
        })
    );
});