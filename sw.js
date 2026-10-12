const CACHE = 'mimica-v23';
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
  "js/compartilhar.js",
  "js/config.js",
  "js/dom.js",
  "js/efeitos.js",
  "js/frases.js",
  "js/jogo.js",
  "js/modal.js",
  "js/premios.js",
  "js/sons.js",
  "js/sorteio.js",
  "js/tempo.js",
  "js/voltar.js",
  "js/telas/comoJogar.js",
  "js/telas/conferencia.js",
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
  // `cache: 'reload'` pula o cache HTTP: não pré-cacheia arquivo velho do GitHub Pages.
  ev.waitUntil(caches.open(CACHE).then((cache) =>
    cache.addAll(ARQUIVOS.map((a) => new Request(a, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys().then((chaves) =>
    Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c)))));
  self.clients.claim();
});

// Responde do cache na hora e atualiza em segundo plano (a versão nova vale na próxima abertura).
// A chave do cache é a URL sem query string, para `?utm=...` não duplicar o index.
self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET' || new URL(ev.request.url).origin !== self.location.origin) return;
  const chave = new URL(ev.request.url);
  chave.search = '';
  const pronto = caches.open(CACHE).then(async (cache) => {
    const emCache = await cache.match(chave.href);
    let gravando = Promise.resolve();
    const daRede = fetch(ev.request)
      .then((resposta) => {
        if (resposta.ok) gravando = cache.put(chave.href, resposta.clone()).catch(() => {});
        return resposta;
      })
      .catch(() => emCache);
    return { emCache, daRede, atualizado: daRede.then(() => gravando) };
  });
  ev.respondWith(pronto.then(({ emCache, daRede }) => emCache || daRede));
  ev.waitUntil(pronto.then(({ atualizado }) => atualizado).catch(() => {}));
});
