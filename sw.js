/* La Grotte de Valombre — Service Worker
   IMPORTANT : augmenter APP_VERSION à chaque nouvelle mise en ligne. */
const APP_VERSION = 'reference-68.345-book02-ui-parity-sw';
const CACHE_PREFIX = 'chroniques-ages-test-';
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;

self.addEventListener('install', () => {
  // La nouvelle version prend la main sans attendre la fermeture de l'ancienne.
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Supprime uniquement les anciens caches de cette version de Valombre.
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
        .map(name => caches.delete(name))
    );

    // Prend le contrôle des pages ouvertes, mais ne les recharge surtout pas :
    // une navigation forcée pendant le chargement des scripts pouvait interrompre
    // le bootstrap puis le relancer, surtout sur mobile.
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ne gère que les fichiers hébergés sur le même GitHub Pages.
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      // Réseau d'abord. Les URLs versionnées (?v=...) restent naturellement
      // distinctes entre deux versions, donc pas besoin de forcer no-store.
      const response = await fetch(request);

      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone()).catch(() => {});
      }

      return response;
    } catch (error) {
      // Hors ligne : utilise la dernière copie disponible.
      const cached = await caches.match(request);
      if (cached) return cached;

      if (request.mode === 'navigate') {
        const fallback =
          await caches.match('./index.html') ||
          await caches.match('./');
        if (fallback) return fallback;
      }

      throw error;
    }
  })());
});
