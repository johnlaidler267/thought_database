const CACHE_NAME = 'axiom-v1'
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
  
  // Skip caching for:
  // 1. API requests (any path starting with /api/)
  // 2. Non-GET requests (POST, PUT, DELETE, etc.)
  // 3. External URLs (different origin, like backend API server)
  // 4. Requests to localhost:3001 (backend server)
  if (
    url.pathname.startsWith('/api/') ||
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.hostname === 'localhost' && url.port === '3001'
  ) {
    // For API requests, bypass cache and go directly to network
    event.respondWith(fetch(event.request))
    return
  }
  
  // For static assets, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
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

