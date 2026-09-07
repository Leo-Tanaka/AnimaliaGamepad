const CACHE_NOME = "carrinho-pwa-v1";

const ARQUIVOS_ESTATICOS = [
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/ble.js",
  "./js/dpad.js",
  "./js/blocks.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE_NOME)
      .then((cache) => cache.addAll(ARQUIVOS_ESTATICOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(
          chaves
            .filter((chave) => chave !== CACHE_NOME)
            .map((chave) => caches.delete(chave))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Cache-first para os arquivos da interface; a conexão Bluetooth em si
// nunca passa pelo service worker (é feita diretamente pelo navegador).
self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;

  evento.respondWith(
    caches.match(evento.request).then((respostaCache) => {
      if (respostaCache) return respostaCache;

      return fetch(evento.request)
        .then((respostaRede) => {
          const copia = respostaRede.clone();
          caches
            .open(CACHE_NOME)
            .then((cache) => cache.put(evento.request, copia))
            .catch(() => {});
          return respostaRede;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
