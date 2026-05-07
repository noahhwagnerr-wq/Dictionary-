const CACHE = 'faez-v18';
const KEY = () => self.registration.scope;

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first: immer frisch laden, Cache nur als Offline-Fallback
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
    fetch(e.request, { cache: 'no-cache' })
      .then(r => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(KEY(), clone));
        }
        return r;
      })
      .catch(() => caches.open(CACHE).then(c => c.match(KEY())))
  );
});

// FORCE_UPDATE: Seite neu laden
self.addEventListener('message', e => {
  if (e.data !== 'FORCE_UPDATE') return;
  e.waitUntil(
    self.clients.matchAll({ type: 'window' })
      .then(clients => clients.forEach(c => c.postMessage('UPDATED')))
  );
});
