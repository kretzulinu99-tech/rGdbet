self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('rgdbet-store').then((cache) => cache.addAll([
      '/rGdbet/',
      '/rGdbet/index.html'
    ]))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
