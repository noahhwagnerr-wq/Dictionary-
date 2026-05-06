const CACHE = 'faez-v1';
// Single canonical key for the app shell — avoids URL-mismatch issues
// (iOS may request /Dictionary-/ or /Dictionary-/index.html interchangeably)
const KEY = () => self.registration.scope;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c =>
        fetch(KEY(), { cache: 'no-cache' })
          .then(r => { if (r.ok) return c.put(KEY(), r); })
          .catch(() => {})          // don't block install if offline
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Always look up by canonical key — never by request URL
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(
    caches.open(CACHE).then(c =>
      c.match(KEY()).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(r => {
          if (r.ok) c.put(KEY(), r.clone());
          return r;
        });
      })
    )
  );
});

// FORCE_UPDATE: fresh fetch → update cache → notify (no reload triggered from here)
self.addEventListener('message', e => {
  if (e.data !== 'FORCE_UPDATE') return;
  e.waitUntil(
    fetch(KEY(), { cache: 'reload' })
      .then(r => {
        if (!r.ok) throw new Error('network error');
        return caches.open(CACHE).then(c => c.put(KEY(), r));
      })
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(c => c.postMessage('UPDATED')))
      .catch(() =>
        self.clients.matchAll({ type: 'window' })
          .then(clients => clients.forEach(c => c.postMessage('UPDATE_FAILED')))
      )
  );
});
