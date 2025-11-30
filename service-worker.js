// service-worker.js
// A minimal service worker for caching static assets

const CACHE_NAME = "tank-locator-cache-v1";
const URLS_TO_CACHE = [
  "/",                // root
  "/index.html",
  "/manifest.json",
  "/app.js",
  "/assets/heart.png" // add any icons/images you use
];

// Install event: cache files
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

// Fetch event: serve cached files if available
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
