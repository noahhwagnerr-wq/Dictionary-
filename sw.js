const CACHE = 'faez-v1';

// Canonical app URL = scope root (e.g. /Dictionary-/)
function appUrl() { return self.registration.scope; }

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // Cache both scope root and index.html to cover all URL variants
      Promise.allSettled([
        c.add(appUrl()),
        c.add(appUrl() + 'index.html')
      ])
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(
    caches.open(CACHE).then(cache =>
      // Try exact URL first, then scope root as fallback
      cache.match(e.request)
        .then(r => r || cache.match(appUrl()))
        .then(cached => {
          if (cached) return cached;
          // Nothing in cache yet — fetch and store
          return fetch(e.request).then(res => {
            if (res.ok) cache.put(appUrl(), res.clone());
            return res;
          });
        })
    )
  );
});

// FORCE_UPDATE: fetch fresh copy → update cache → notify client (no reload from SW side)
self.addEventListener('message', e => {
  if (e.data !== 'FORCE_UPDATE') return;
  e.waitUntil(
    fetch(appUrl(), { cache: 'reload' })
      .then(res => {
        if (!res.ok) throw new Error('fetch failed');
        return caches.open(CACHE).then(c =>
          Promise.all([c.put(appUrl(), res.clone()), c.put(appUrl() + 'index.html', res)])
        );
      })
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(cl => cl.postMessage('UPDATED')))
      .catch(() => self.clients.matchAll({ type: 'window' })
        .then(clients => clients.forEach(cl => cl.postMessage('UPDATE_FAILED'))))
  );
});
