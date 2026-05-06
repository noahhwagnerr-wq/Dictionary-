const CACHE = 'faez-v7';
const KEY = () => self.registration.scope;

self.addEventListener('install', e => {
  e.waitUntil(
    fetch(KEY(), { cache: 'no-cache' })
      .then(r => { if (r.ok) return caches.open(CACHE).then(c => c.put(KEY(), r)); })
      .catch(() => {})
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

// Cache-first for the app HTML.
// Match by URL path instead of e.request.mode — more reliable on iOS PWA.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const scope = new URL(self.registration.scope);
  const isAppShell =
    url.origin === scope.origin &&
    (url.pathname === scope.pathname ||
     url.pathname === scope.pathname + 'index.html' ||
     url.pathname === scope.pathname.replace(/\/$/, ''));
  if (!isAppShell) return;

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

// FORCE_UPDATE: fetch latest HTML → update cache → tell page to reload
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
