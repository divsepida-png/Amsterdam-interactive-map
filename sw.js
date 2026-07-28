'use strict';

const CACHE_NAME = 'ams-frontage-shell-v4';
const SHELL = [
  './index.html?v=4',
  './app.css?v=4',
  './maplibre-compat.js?v=4',
  './geometry-guard.js?v=4',
  './data.js?v=4',
  './app.js?v=4',
  './manifest.webmanifest?v=4'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.hostname === 'tile.openstreetmap.org') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, {cache: 'no-store'})
        .then(response => {
          if (response?.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put('./index.html?v=4', response.clone()));
          }
          return response;
        })
        .catch(() => caches.match('./index.html?v=4'))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        const network = fetch(request).then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
