const CACHE_NAME = "rot-n-read-1.2.3";
const PRECACHE_URLS = [
  "./",
  "./home.html",
  "./about.html",
  "./settings.html",
  "./reader.html",
  "./unsupported.html",
  "./book_options.html",
  "./css/style.css",
  "./js/app.js",
  "./js/home.js",
  "./js/settings.js",
  "./js/reader.js",
  "./js/storage.js",
  "./js/pdf_handler.js",
  "./js/book_options.js",
  "./js/video.js",
  "./js/tts.js",
  "./lib/pdfjs/pdf.min.js",
  "./lib/pdfjs/pdf.worker.min.js",
  "./manifest.json",
  "./images/logo/watermark.svg",
  "./images/logo/logo.svg",
  "./images/alt-logo/logo.alt.svg",
  "./images/icons/home.svg",
  "./images/icons/add.svg",
  "./images/icons/info.svg",
  "./images/icons/settings.svg",
  "./images/icons/back.svg",
  "./images/icons/play.svg",
  "./images/icons/pause.svg",
  "./images/icons/rewind.svg",
  "./images/icons/forward.svg",
  "./videos/mmm_fingers/1.mp4",
  "./videos/subway_surfers/1.mp4",
  "./videos/subway_surfers/2.mp4",
  "./videos/subway_surfers/3.mp4"
];

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request).then(function (response) {
        return caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    }).catch(function () {
      if (event.request.mode === "navigate") {
        return caches.match("./home.html");
      }
    })
  );
});
