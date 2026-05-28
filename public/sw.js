// Service worker for offline support + sane caching.
//
// Previously this used cache-first for HTML pages, which meant deploys never
// reached users until they happened to do an action that forced a navigation
// off the cached shell (e.g. re-selecting a user). That made every release
// look like a "stale UI bug".
//
// Strategy now:
//   /api/*                  → network only, no cache (always fresh data)
//   /_next/static/*         → cache-first (hashed filenames are immutable)
//   everything else (HTML)  → network-first with cache fallback (offline)
//
// CACHE_NAME is bumped on every deploy that changes runtime behaviour so the
// activate handler can clear stale precaches.
const CACHE_NAME = 'reading-quest-v4'
const SHELL = ['/', '/diary', '/diary/plan', '/books', '/manifest.json']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // API: always go to network, no caching.
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(
        () =>
          new Response(JSON.stringify({ error: 'Offline' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503,
          }),
      ),
    )
    return
  }

  // Hashed build assets: cache-first, populate on first miss.
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached
        return fetch(e.request).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put(e.request, copy))
          }
          return res
        })
      }),
    )
    return
  }

  // Everything else (HTML, manifest, public assets): network-first.
  // This means a deploy lands instantly on a refresh; offline still works
  // because we fall back to the cached shell.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && e.request.method === 'GET') {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(e.request, copy))
        }
        return res
      })
      .catch(() => caches.match(e.request)),
  )
})
