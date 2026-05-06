const CACHE = 'faez-v3';
const KEY = () => self.registration.scope;

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  // Delete all old caches
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first: always fetch fresh HTML, fall back to cache only when offline.
// This guarantees users always get the latest version as soon as it's deployed.
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(KEY(), clone));
        }
        return r;
      })
      .catch(() =>
        caches.open(CACHE).then(c => c.match(KEY()))
      )
  );
});
