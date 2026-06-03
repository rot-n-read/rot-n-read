# Skills — PWA on GitHub Pages

## The Problem

GitHub Pages serves projects at a **subpath**: `https://<user>.github.io/<repo>/`. If a PWA uses absolute paths (starting with `/`), they resolve to the domain root (`https://<user>.github.io/`) instead of the project directory. This causes:

- PWA fails to open on Android (opens wrong URL from `start_url`)
- Service worker registers at wrong scope
- Cached assets don't match actual file locations
- Reopening the installed app shows a blank page or 404

## The Fix

### 1. Use Relative Paths Everywhere

All paths must start with `./` (relative to the file's location), never `/` (domain root).

**manifest.json:**
```json
{
  "id": "./",
  "start_url": "./home.html",
  "scope": "./"
}
```

**Service worker registration (in JS):**
```javascript
navigator.serviceWorker.register("./sw.js");
```

**Service worker precache URLs:**
```javascript
const PRECACHE_URLS = [
  "./",
  "./home.html",
  "./css/style.css",
  "./js/app.js"
];
```

**HTML files** — use relative paths without leading slash:
```html
<link rel="stylesheet" href="css/style.css">
<script src="js/app.js"></script>
<link rel="manifest" href="manifest.json">
```

### 2. Force Service Worker Update on Deploy

Old service workers persist on user devices and serve stale cached files (including the old broken manifest). Add these to ensure immediate takeover:

```javascript
self.addEventListener("install", function (event) {
  self.skipWaiting(); // Don't wait for old tabs to close
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
      return self.clients.claim(); // Take control immediately
    })
  );
});
```

### 3. Navigation Fallback

If both cache and network fail for a page request, serve the home page instead of a blank screen:

```javascript
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
```

### 4. Version Bumping

Every code change must bump the cache version string in the service worker. This triggers the browser to fetch the new SW, which then purges old caches and re-downloads everything.

```javascript
const CACHE_NAME = "my-app-0.1.3"; // bump this on every change
```

## Checklist for Configuring a PWA on GitHub Pages

- [ ] `manifest.json` — `start_url`, `scope`, `id` all use `./` (relative)
- [ ] `manifest.json` — icon `src` paths are relative (no leading `/`)
- [ ] Service worker — `PRECACHE_URLS` all use `./` prefix
- [ ] Service worker — has `self.skipWaiting()` in install handler
- [ ] Service worker — has `self.clients.claim()` in activate handler
- [ ] Service worker — has navigation fallback in fetch handler `.catch()`
- [ ] Service worker — cache name contains a version number that gets bumped
- [ ] JS registration — `register("./sw.js")` not `register("/sw.js")`
- [ ] HTML files — all `href`/`src` attributes use relative paths (no leading `/`)
- [ ] After deploying fix — users must revisit the site online once for the new SW to activate (or re-add to home screen)

## Key Insight

`./` means "relative to the current file's directory." On GitHub Pages at `https://user.github.io/repo/`, a file `./home.html` correctly resolves to `https://user.github.io/repo/home.html`. An absolute `/home.html` would wrongly resolve to `https://user.github.io/home.html`.
