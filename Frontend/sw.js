const CACHE_NAME = "tayan-pwa-v4";
const PRECACHE = ["/manifest.webmanifest", "/icon-512.png", "/apple-touch-icon.png", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => Promise.resolve()));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
  self.clients.claim();
});

function isHtmlRequest(req) {
  const url = new URL(req.url);
  const accept = req.headers.get("accept") || "";
  return req.mode === "navigate" || accept.includes("text/html") || url.pathname.endsWith(".html");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  if (isHtmlRequest(req)) {
    event.respondWith(fetch(req).catch(() => caches.match(req).then((cached) => cached || caches.match("/index.html"))));
    return;
  }

  event.respondWith(caches.match(req).then((cached) => {
    if (cached) return cached;
    return fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === "basic") {
        const cloned = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, cloned));
      }
      return res;
    });
  }));
});