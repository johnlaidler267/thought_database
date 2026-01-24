const CACHE_NAME = 'vellum-v1'
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
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
  if (
    url.pathname.includes('@vite') ||
    url.pathname.includes('@react-refresh') ||
    url.searchParams.has('t') || // Vite timestamp query params
    url.pathname.startsWith('/api/') ||
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    (url.hostname === 'localhost' && url.port === '3001')
  ) {
    // Don't intercept these requests - let browser handle them normally
    return
  }
  
  // For static assets, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response
        }
        return fetch(event.request).catch((error) => {
          // If fetch fails, don't throw - let browser handle it
          console.error('Service Worker fetch failed:', error)
          // Return a basic error response or let it fail gracefully
          return new Response('Network error', { 
            status: 408, 
            statusText: 'Request Timeout',
            headers: { 'Content-Type': 'text/plain' }
          })
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
  )
})

