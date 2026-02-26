const CACHE = "todo-cache-v1";
const ASSETS = {
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./ara_apple_ios.png"
};

self.addeventListener("install", (e) => {
   e.waitUntil(caches.open(CACHE).the(c =>  c.addAll(ASSETS)));
});

self.addEventListener("fetch" , (e) => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match("./index.html")))
    );
});



