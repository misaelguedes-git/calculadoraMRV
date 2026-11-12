const CACHE = 'mrv-calc-cf-v1.1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/LogoMRV.png',
  '/assets/LogoMRV-header.png',
  '/libs/pdf.min.js',
  '/libs/pdf.worker.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
