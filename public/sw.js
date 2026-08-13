const CACHE_NAME = 'arsabil-cache-v1.0.2';
const SW_VERSION = '1.0.2'; // Update this to force SW update

// Static assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/apple-touch-icon.png',
];

// Install event: pre-cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing version', SW_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Kullanici "Guncelle" butonuna dokununca UpdateBanner bu mesaji gonderir
// (bkz. src/lib/pwa/usePwaUpdate.ts). skipWaiting() artik install'da
// OTOMATIK cagrilmiyor - yeni SW `waiting` durumunda kullanici onayini
// bekliyor.
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Activate event: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event: Network-first for navigations & API, Cache-first for static
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip external requests
    if (url.origin !== self.location.origin) return;

    // Identify Next.js RSC requests
    const isRSC = url.searchParams.has('_rsc') || request.headers.has('RSC');
    
    // Always Network-only or Network-first for RSC, API, and Navigations
    if (request.mode === 'navigate' || url.pathname.startsWith('/api/') || isRSC) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Only cache successful full-page navigations (HTML)
                    if (request.mode === 'navigate' && response.status === 200) {
                        const cloned = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cache ONLY for HTML navigations
                    if (request.mode === 'navigate') {
                        return caches.match('/') || new Response('Offline', { status: 503 });
                    }
                    return new Response('Offline', { status: 503 });
                })
        );
        return;
    }

    // Static assets (CSS, JS, Images, etc.): Cache-first
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;

            return fetch(request).then((response) => {
                // Cache successful responses for static assets
                if (response.status === 200) {
                    const cloned = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
                }
                return response;
            });
        })
    );
});
