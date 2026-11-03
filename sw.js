// La version est injectée automatiquement par Vite au moment du build.
// Elle change à chaque déploiement, ce qui force la mise à jour du cache.
const CACHE_VERSION = '1793723654920';
const CACHE_NAME = `loto-tracker-${CACHE_VERSION}`;
const ASSETS = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  // Force le nouveau SW à prendre le contrôle immédiatement
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  // Supprime tous les anciens caches qui ne correspondent pas à la version actuelle
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Prend le contrôle des pages ouvertes sans attendre un rechargement
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Stratégie Network-First pour le HTML et le SW lui-même :
  // on essaie toujours le réseau d'abord, le cache sert de secours hors-ligne.
  if (
    event.request.mode === 'navigate' ||
    event.request.url.endsWith('/sw.js') ||
    event.request.url.endsWith('/index.html')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Stratégie Cache-First pour les assets hashés (JS, CSS, images) :
  // ils ne changent jamais, on peut les servir depuis le cache sans risque.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
