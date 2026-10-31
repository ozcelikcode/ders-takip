// Offline shell: the last loaded page and the hashed build files stay available without a network. API calls are
// never cached; they always go to the server, so data is never stale.
const shellCache = 'shell-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== shellCache).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    // Network first, so a new release is picked up at once; the last good page is the fallback offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(shellCache).then((cache) => cache.put('/', copy));
          }
          return response;
        })
        .catch(() => caches.match('/').then((cached) => cached || Response.error())),
    );
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    // Build files carry a content hash in their name, so a cached copy is never outdated.
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(shellCache).then((cache) => cache.put(request, copy));
        }
        return response;
      })),
    );
  }
});

// Web Push service worker: shows reminders sent by the server, also when no tab is open.
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Bildirim', {
      body: data.body || '',
      tag: data.tag,
      icon: '/brand-mark.svg',
      data: { url: data.url || '/' },
    }),
  );
});

// A click focuses an open tab of the app (moving it to the target page) or opens a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.location.origin));
      if (open) return open.navigate(target).then((client) => (client ?? open).focus());
      return clients.openWindow(target);
    }),
  );
});
