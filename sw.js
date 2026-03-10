const CACHE = "todo-cache-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./ara_apple_ios.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request).catch(() => caches.match("./index.html"));
    })
  );
});


