const CACHE_NAME = 'vellum-v1'
const urlsToCache = [
  '/',
  '/index.html',
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Try to cache resources, but don't fail if they're not available
        // This is especially important on first load or if assets aren't ready yet
        return Promise.allSettled(
          urlsToCache.map(url => {
            return fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response)
                }
                // If response is not ok, don't cache it
                return Promise.resolve()
              })
              .catch(err => {
                // Silently fail - we'll cache on first successful fetch instead
                return Promise.resolve()
              })
          })
        )
      })
      .then(() => {
        // Force activation of new service worker
        return self.skipWaiting()
      })
      .catch(() => {
        // Even if caching fails, activate the service worker
        return self.skipWaiting()
      })
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // Skip service worker entirely for:
  // 1. Vite dev server requests (@vite/client, @react-refresh, etc.)
  // 2. Requests with query params (Vite adds ?t=timestamp)
  // 3. API requests (any path starting with /api/)
  // 4. Non-GET requests (POST, PUT, DELETE, etc.)
  // 5. External URLs (different origin, like backend API server)
  // 6. Requests to localhost:3001 (backend server)
  // 7. Hashed asset files (Vite/Vercel generates these with hashes - let browser cache handle them)
  // 8. Manifest.json and other dev-only files
  // 9. Development mode (localhost with port 5174 or other Vite ports)
  const isDevMode = url.hostname === 'localhost' && (
    url.port === '5174' || 
    url.port === '5173' || 
    url.port === '3000' ||
    url.pathname.includes('/src/')
  )
  
  // Check if it's a hashed asset file (Vite/Vercel pattern: filename-hash.ext)
  const isHashedAsset = /\/assets\/[^/]+-[A-Za-z0-9]+\.(js|css|woff|woff2|ttf|eot|svg|png|jpg|jpeg|gif|ico)$/.test(url.pathname)
  
  if (
    url.pathname.includes('@vite') ||
    url.pathname.includes('@react-refresh') ||
    url.searchParams.has('t') || // Vite timestamp query params
    url.pathname.startsWith('/api/') ||
    url.pathname === '/manifest.json' ||
    url.pathname.startsWith('/assets/') || // Skip all assets - let browser handle caching
    isHashedAsset ||
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    (url.hostname === 'localhost' && url.port === '3001') ||
    isDevMode
  ) {
    // Don't intercept these requests - let browser handle them normally
    return
  }
  
  // Only intercept HTML pages for offline support
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If fetch succeeds, cache it for offline use
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone)
            })
          }
          return response
        })
        .catch((error) => {
          // If fetch fails, try to return cached version
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // If no cache, try index.html as fallback
            return caches.match('/index.html').then((indexHtml) => {
              if (indexHtml) {
                return indexHtml
              }
              // If everything fails, throw the original error
              throw error
            })
          })
        })
    )
  }
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
    .then(() => {
      // Take control of all clients immediately
      return self.clients.claim()
    })
  )
})

