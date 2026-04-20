self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('nihongo-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/kana',
        '/practicar',
        '/comunidad',
        '/offline.html',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      });
    })
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Nihongo';
  const options = {
    body: data.body || '¡Tienes kana por repasar hoy! 🎌',
    icon: '/apple-touch-icon.png',
    badge: '/apple-touch-icon.png',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/kana'));
});
