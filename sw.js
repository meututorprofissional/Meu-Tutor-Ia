
/* Atualização versionada: mude CACHE_VERSION ao publicar uma versão. */
const CACHE_VERSION = 'meu-tutor-ia-v34-checkbox-right';

const APP_FILES = [
  './',
  './index.html',
  './app.js',
  './updates.js',
  './manifest.json',
  './icon.svg',
  './ai-config.js',
  './ai-client.js',
  './auth-config.js',
  './profile.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_FILES))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(
              key =>
                key.startsWith('meu-tutor-ia-') &&
                key !== CACHE_VERSION
            )
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;

  if (
    req.method !== 'GET' ||
    new URL(req.url).origin !== self.location.origin
  ) {
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION)
              .then(cache => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION)
              .then(cache => cache.put(req, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
