// SW v2026-05-08 — Cache-Reset
const CACHE = 'faez-2026-05-08-final';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(c => c.postMessage('UPDATED')))
  );
});

self.addEventListener('fetch', e => {
  // Kein Caching — immer frisch vom Netzwerk
  e.respondWith(fetch(e.request));
});

self.addEventListener('message', e => {
  if (e.data === 'FORCE_UPDATE') {
    e.waitUntil(
      caches.keys()
        .then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => self.clients.matchAll({ type: 'window' }))
        .then(clients => clients.forEach(c => c.postMessage('UPDATED')))
    );
  }
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
