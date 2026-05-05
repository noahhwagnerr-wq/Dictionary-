const CACHE = 'faez-v1';
const APP   = './';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.add(APP))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve app from cache — never from network unless cache is empty
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(
    caches.match(APP).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        caches.open(CACHE).then(c => c.put(APP, res.clone()));
        return res;
      });
    })
  );
});

// FORCE_UPDATE: fetch fresh copy, update cache, notify all tabs to reload
self.addEventListener('message', e => {
  if (e.data !== 'FORCE_UPDATE') return;
  e.waitUntil(
    fetch(APP, { cache: 'reload' })
      .then(res => caches.open(CACHE).then(c => c.put(APP, res)))
      .then(() => self.clients.matchAll({ includeUncontrolled: true, type: 'window' }))
      .then(clients => clients.forEach(cl => cl.postMessage('RELOAD')))
  );
});
