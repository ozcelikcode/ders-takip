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
