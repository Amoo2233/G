/* Cleanup service worker.
   A previous deployment at this scope registered a caching service worker.
   This replacement clears those caches and unregisters itself so visitors
   always get the live site. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => clients.forEach((c) => c.navigate(c.url)))
  );
});
