const CACHE = 'mimica-v1';
const ARQUIVOS = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "data/temas.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "js/app.js",
  "js/armazenamento.js",
  "js/config.js",
  "js/dom.js",
  "js/efeitos.js",
  "js/jogo.js",
  "js/sorteio.js",
  "js/tempo.js",
  "js/telas/comoJogar.js",
  "js/telas/configuracao.js",
  "js/telas/erro.js",
  "js/telas/final.js",
  "js/telas/inicio.js",
  "js/telas/leitura.js",
  "js/telas/mimica.js",
  "js/telas/resultado.js",
  "js/telas/vez.js"
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys().then((chaves) =>
    Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c)))));
  self.clients.claim();
});

// Responde do cache na hora e atualiza em segundo plano (a versão nova vale na próxima abertura).
self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET' || new URL(ev.request.url).origin !== self.location.origin) return;
  ev.respondWith(caches.open(CACHE).then(async (cache) => {
    const emCache = await cache.match(ev.request, { ignoreSearch: true });
    const daRede = fetch(ev.request)
      .then((resposta) => {
        if (resposta.ok) cache.put(ev.request, resposta.clone());
        return resposta;
      })
      .catch(() => emCache);
    return emCache || daRede;
  }));
});
