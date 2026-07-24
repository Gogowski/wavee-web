const SHELL_CACHE = 'wavee-shell-v2'

function isWaveeAsset(requestUrl) {
  const scopeUrl = new URL(self.registration.scope)
  return requestUrl.origin === self.location.origin && requestUrl.pathname.startsWith(scopeUrl.pathname)
}

async function cacheResponse(request, response) {
  if (!response || !response.ok) {
    return
  }

  const cache = await caches.open(SHELL_CACHE)
  await cache.put(request, response.clone())
}

async function fetchWithOfflineFallback(request, event) {
  try {
    const response = await fetch(request)
    event.waitUntil(cacheResponse(request, response).catch(() => {}))
    return response
  } catch {
    const cache = await caches.open(SHELL_CACHE)
    return (await cache.match(request, { ignoreSearch: true })) || (await cache.match(self.registration.scope)) || Response.error()
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.add(self.registration.scope)),
  )
})

self.addEventListener('activate', (event) => {
  // Do not call skipWaiting: an update waits for the current app session to close.
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('wavee-shell-') && key !== SHELL_CACHE)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const requestUrl = new URL(request.url)

  if (request.method !== 'GET' || !isWaveeAsset(requestUrl) || requestUrl.pathname.endsWith('/sw.js')) {
    return
  }

  event.respondWith(fetchWithOfflineFallback(request, event))
})
