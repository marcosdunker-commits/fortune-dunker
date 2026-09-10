const CACHE = "dunker-v5";
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

// rede primeiro: sempre busca a versão mais nova quando tem internet;
// só usa o cache se estiver offline. cache:"no-store" é essencial aqui --
// sem isso o fetch() ainda podia ser respondido pelo cache HTTP comum do
// navegador (Cache-Control do GitHub Pages), fazendo o app instalado
// mostrar uma versão velha por minutos mesmo com "rede primeiro".
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(e.request, { cache: "no-store" });
      if (res && res.status === 200) cache.put(e.request, res.clone());
      return res;
    } catch (err) {
      return (await cache.match(e.request)) || cache.match("./index.html");
    }
  })());
});
