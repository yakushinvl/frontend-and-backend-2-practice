const SHELL_CACHE = "app-shell-v1";
const DYNAMIC_CACHE = "dynamic-content-v1";

const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-256.png",
  "/icons/icon-512.png",
  // Нужен как офлайн-фолбэк для динамического контента
  "/content/home.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== DYNAMIC_CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // App Shell (index) должен открываться мгновенно даже офлайн
  if (request.mode === "navigate") {
    event.respondWith(caches.match("/index.html").then((r) => r || fetch(request)));
    return;
  }

  // Динамический контент: Network First, fallback на кэш и затем на home
  if (url.pathname.startsWith("/content/")) {
    event.respondWith(
      fetch(request)
        .then((networkRes) => {
          const copy = networkRes.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, copy));
          return networkRes;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/content/home.html")),
        ),
    );
    return;
  }

  // Статика (каркас): Cache First
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});