/* آخرین افسونگر — offline cache.
 * The production build is a single HTML file with the fonts inlined, so the page
 * plus the manifest and icons are everything needed to start offline. */
const CACHE = "afsungar-v6";
/** Only caches created by this game may be removed on activation. */
const CACHE_PREFIX = "afsungar-";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  // addAll is atomic: if any core file is missing the install fails loudly instead of half-caching
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      // Never delete another application's caches: only this game's older versions.
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // Pages: network first so updates arrive; offline, serve the version installed
  // with this worker. Do not re-open CACHE on every navigation: an old in-flight
  // worker could re-create its cache after a newer worker deleted it on activate.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .catch(() => caches.match("./index.html", { ignoreSearch: true })),
    );
    return;
  }

  // CORE contains every asset required offline. Never reopen a cache in a fetch
  // handler: an in-flight old worker could resurrect a deleted cache on update.
  event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
