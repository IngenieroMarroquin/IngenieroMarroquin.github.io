// service-worker.js — SignalCheck Pro
//
// Cambios respecto de la version 8.0.0:
//   1. cache.match usa {ignoreSearch:true}. index.html pide "script.js?v=..."
//      pero el precache guarda "script.js": sin esto NUNCA hay coincidencia
//      y el modo offline falla justo en el archivo principal. (F-01)
//   2. Se anade el listener 'message' para SKIP_WAITING. La pagina ya lo
//      enviaba desde el boton "Actualizar", pero nadie lo escuchaba.
//   3. Se quita skipWaiting() de 'install'. Actualizar sin permiso recarga
//      la pagina y destruye una calibracion en curso, que solo vive en
//      memoria. Ahora actualiza cuando el usuario pulsa el boton.
//   4. Solo se cachean respuestas GET, del mismo origen y con estado OK.
//   5. Navegaciones sin red caen a index.html.

// OJO: el nombre del cache DEBE ser distinto en cada publicacion. El
// service worker que hoy esta en produccion ya usa 'signalcheck-pro-v9.0.0'
// (se etiqueto asi hace 11 meses), asi que reutilizar ese nombre haria que
// el SW nuevo escribiera dentro del cache que el SW viejo esta sirviendo, y
// el resultado seria impredecible. Por eso lleva la fecha de compilacion.
const CACHE_NAME = 'signalcheck-pro-2026-08-27';

const PRECACHE_URLS = [
    './',
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
        caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names.filter(name => name !== CACHE_NAME)
                     .map(name => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', event => {
    const request = event.request;

    if (request.method !== 'GET') return;
    if (new URL(request.url).origin !== self.location.origin) return;

    event.respondWith(
        caches.open(CACHE_NAME).then(async cache => {
            const cached = await cache.match(request, { ignoreSearch: true });
            if (cached) return cached;

            try {
                const response = await fetch(request);
                if (response && response.ok && response.type === 'basic') {
                    cache.put(request, response.clone());
                }
                return response;
            } catch (networkError) {
                if (request.mode === 'navigate') {
                    const shell = await cache.match('index.html', { ignoreSearch: true });
                    if (shell) return shell;
                }
                throw networkError;
            }
        })
    );
});
