const CACHE_NAME = 'rgdbet-v9.7-cache';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './social.js',
  './simulator.js',
  './themes.js',
  './manifest.json',
  './notifications.js',
  './gamification.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

/* ── PUSH EVENT LISTENER ── */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'rGdbet Elite', body: 'Activitate nouă în comunitate!' };

  const options = {
    body: data.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/5971/5971593.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/5971/5971593.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || './index.html' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/* ── NOTIFICATION CLICK ── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
