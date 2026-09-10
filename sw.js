// Suba este número (v2, v3, ...) a cada mudança relevante no app. É o que
// faz o navegador perceber que o service worker mudou e disparar a
// reinstalação — sem isso, o cache antigo fica preso para sempre.
const CACHE_NOME = "carrinho-pwa-v2";

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
      .then((cache) =>
        // { cache: "reload" } força buscar da rede, ignorando o cache HTTP
        // do navegador — sem isso, o "cache do cache" também pode prender
        // uma versão antiga mesmo neste passo.
        cache.addAll(
          ARQUIVOS_ESTATICOS.map((url) => new Request(url, { cache: "reload" }))
        )
      )
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

// Rede primeiro: com internet, sempre pega a versão mais recente do
// Vercel. Só cai para o cache se a rede falhar (uso offline). A conexão
// Bluetooth em si nunca passa pelo service worker.
self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;

  evento.respondWith(
    fetch(evento.request)
      .then((respostaRede) => {
        const copia = respostaRede.clone();
        caches
          .open(CACHE_NOME)
          .then((cache) => cache.put(evento.request, copia))
          .catch(() => {});
        return respostaRede;
      })
      .catch(() =>
        caches
          .match(evento.request)
          .then((respostaCache) => respostaCache || caches.match("./index.html"))
      )
  );
});
