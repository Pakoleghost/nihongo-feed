const CACHE_NAME = "nihongo-v2";
const OFFLINE_URL = "/offline.html";

// On install: only cache the offline fallback page, nothing else.
// Caching app HTML is dangerous — stale HTML loads stale JS bundles
// with old auth code, breaking sessions in Safari PWA standalone mode.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  // Take control immediately, don't wait for old SW to be idle
  self.skipWaiting();
});

// On activate: delete the old nihongo-v1 cache so stale HTML is gone
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Claim existing clients so they immediately get the new SW
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Navigation requests (page loads): always go to network.
  // Fall back to offline.html only if the network is completely unreachable.
  // This ensures the PWA always runs the latest deployed JS bundles
  // and never serves stale auth code from cache.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }
  // All other requests (API calls, assets): pass through to network.
  // Vercel's CDN handles caching of _next/static assets via HTTP headers.
});

// Push notification handler
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Nihongo";
  const options = {
    body: data.body || "¡Tienes kana por repasar hoy! 🎌",
    icon: "/apple-touch-icon.png",
    badge: "/apple-touch-icon.png",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/kana"));
});
