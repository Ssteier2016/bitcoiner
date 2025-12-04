// Nombre de la versión del caché. CÁMBIALO para forzar una actualización completa.
const CACHE_NAME = 'crypto-tracker-cache-v1.0.1'; 

// Lista de archivos que deben ser precacheados (almacenados al instalar el SW)
const urlsToCache = [
  '/', 
  '/index.html',
  // Si tienes CSS o JS externos a index.html y al CDN, inclúyelos aquí:
  // '/styles.css', 
  // '/app.js',     
  '/manifest.json',
  
  // Iconos: Asegúrate de que todos los iconos de /icons están listados
  '/icons/favicon.png', 
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
];

// 1. Evento 'install': Instala el SW y precarga los archivos esenciales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching files...');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('[SW] Error during installation/caching:', err);
      })
  );
  self.skipWaiting(); 
});

// 2. Evento 'activate': Limpia los cachés antiguos para ahorrar espacio
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. Evento 'fetch': Estrategia Cache-First (Primero Caché, Luego Red)
self.addEventListener('fetch', event => {
  
  // 1. Ignora peticiones a APIs y CDN externos para obtener datos actualizados
  if (event.request.url.includes('coingecko.com') || 
      event.request.url.includes('alphavantage.co') ||
      event.request.url.includes('cdn.tailwindcss.com') ||
      event.request.url.includes('cdn.jsdelivr.net')) {
    return;
  }

  // 2. Para todos los recursos locales: Usar Cache-First
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en caché, lo devuelve
        if (response) {
          return response;
        }
        
        // Si no está, va a la red y lo cachea
        return fetch(event.request).then(
          networkResponse => {
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(() => {
            console.warn('[SW] Fetch failed for local resource:', event.request.url);
        });
      })
  );
});
