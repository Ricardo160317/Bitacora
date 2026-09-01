// Service worker mínimo: guarda en caché los archivos de la app para que
// abra rápido. Las llamadas a /api/ (tus datos) NUNCA se cachean — siempre
// van directo al servidor, para que veas lo mismo en la tablet, el celular
// y la PC.

var CACHE_NAME = "bitacora-cache-v10";
var FILES_TO_CACHE = [
  "/",
  "/app-shell.html",
  "/visual-fidelity.css",
  "/responsive-alignment.css",
  "/agenda-v10.css",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(FILES_TO_CACHE); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.pathname.indexOf("/api/") === 0) return;
  event.respondWith(caches.match(event.request).then(function (cached) {
    var network = fetch(event.request).then(function (response) {
      if (response && response.status === 200 && response.type === "basic") {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
      }
      return response;
    }).catch(function () { return cached; });
    return cached || network;
  }));
});
