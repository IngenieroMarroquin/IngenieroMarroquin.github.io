// service-worker.js
const SW_VERSION = '1.0';
console.log(`Service Worker v${SW_VERSION} iniciando...`);

self.addEventListener('install', (event) => {
  console.log(`[SW v${SW_VERSION}] Evento: install`);
  // En la siguiente fase, aquí pondremos la lógica de caché.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log(`[SW v${SW_VERSION}] Evento: activate`);
  // Aquí es donde gestionaremos los cachés antiguos.
});

self.addEventListener('fetch', (event) => {
  // Por ahora, no estamos interceptando las peticiones.
  // Este será el núcleo de nuestra estrategia offline.
});
