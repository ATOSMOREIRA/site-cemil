// CEMIL Service Worker
// _SW_BASE_URL and _SW_VERSION are injected by PwaController::serviceWorker()

var CACHE_NAME = 'cemil-v' + _SW_VERSION;

// ─── Install ──────────────────────────────────────────────────────────────────
// Lazy-caches assets on first fetch — no pre-cache list needed (versioned URLs).
self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

// ─── Activate ─────────────────────────────────────────────────────────────────
// Delete any old cache versions.
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', function (event) {
  var req = event.request;

  // Only handle GET requests from the same origin.
  if (req.method !== 'GET') { return; }

  var url;
  try {
    url = new URL(req.url);
  } catch (_e) {
    return;
  }

  if (url.origin !== self.location.origin) { return; }

  // Skip API calls and the SW file itself.
  var relPath = url.pathname;
  if (_SW_BASE_URL !== '') {
    relPath = relPath.indexOf(_SW_BASE_URL) === 0
      ? relPath.slice(_SW_BASE_URL.length)
      : relPath;
  }
  if (/^\/api\/|\/sw\.js/.test(relPath)) { return; }

  // Static assets → cache-first, then update cache in the background.
  var isAsset = /\.(css|js|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot|ico)(\?|$)/i.test(url.pathname);
  if (isAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(req).then(function (cached) {
          var networkFetch = fetch(req).then(function (response) {
            if (response && response.status === 200) {
              cache.put(req, response.clone());
            }
            return response;
          });
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // Navigation requests → network-first with offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(function () {
        return new Response(
          '<!DOCTYPE html><html lang="pt-BR"><head>'
          + '<meta charset="UTF-8">'
          + '<meta name="viewport" content="width=device-width,initial-scale=1">'
          + '<title>Sem conexão \u2014 CEMIL</title>'
          + '<style>'
          + 'body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;'
          + 'align-items:center;justify-content:center;min-height:100vh;margin:0;'
          + 'background:#f4f7fb;color:#17212b;text-align:center;padding:2rem}'
          + 'h1{font-size:1.4rem;font-weight:800;margin-bottom:.5rem;color:#1d4e89}'
          + 'p{color:#5b6875;font-size:.93rem;max-width:26rem;line-height:1.6}'
          + 'a{display:inline-block;margin-top:1.25rem;padding:.5rem 1.25rem;'
          + 'border-radius:.6rem;background:#1d4e89;color:#fff;text-decoration:none;'
          + 'font-weight:700;font-size:.9rem}'
          + '</style>'
          + '</head><body>'
          + '<h1>Sem conex\u00e3o</h1>'
          + '<p>Voc\u00ea est\u00e1 offline. Conecte-se \u00e0 internet para acessar o CEMIL.</p>'
          + '<a href="javascript:location.reload()">Tentar novamente</a>'
          + '</body></html>',
          { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
        );
      })
    );
  }
});
