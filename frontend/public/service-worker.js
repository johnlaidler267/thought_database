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
        // Use Promise.allSettled to handle failures gracefully
        return Promise.allSettled(
          urlsToCache.map(url => cache.add(url).catch(err => {
            console.warn(`Failed to cache ${url}:`, err)
            return null
          }))
        )
      })
      .then(() => {
        // Force activation of new service worker
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
  // 7. Manifest.json and other dev-only files
  // 8. Development mode (localhost with port 5174 or other Vite ports)
  const isDevMode = url.hostname === 'localhost' && (
    url.port === '5174' || 
    url.port === '5173' || 
    url.port === '3000' ||
    url.pathname.includes('/src/') ||
    url.pathname === '/manifest.json'
  )
  
  if (
    url.pathname.includes('@vite') ||
    url.pathname.includes('@react-refresh') ||
    url.searchParams.has('t') || // Vite timestamp query params
    url.pathname.startsWith('/api/') ||
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    (url.hostname === 'localhost' && url.port === '3001') ||
    isDevMode
  ) {
    // Don't intercept these requests - let browser handle them normally
    return
  }
  
  // For static assets, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse
        }
        // Otherwise fetch from network
        return fetch(event.request)
      })
      .catch((error) => {
        // If fetch fails, try to return cached version as last resort
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          // If everything fails, the request will fail naturally
          // Don't create fake error responses
          throw error
        })
      })
  )
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

