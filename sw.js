const CACHE = "dunker-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./game.js",
  "./som.js",
  "./emblema.png",
  "./icon-192.png",
  "./icon-512.png",
  "./maskable-512.png",
  "./manifest.webmanifest",
  "https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&display=swap",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// stale-while-revalidate: responde do cache na hora e atualiza em segundo plano
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request);
    const net = fetch(e.request)
      .then((res) => {
        if (res && res.status === 200) cache.put(e.request, res.clone());
        return res;
      })
      .catch(() => null);
    return cached || (await net) || cache.match("./index.html");
  })());
});
