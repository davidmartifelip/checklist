const CACHE_NAME = 'checklist-pwa-v1';
const ASSETS = [
    './',
    './index.html',
    './manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching assets');
                return cache.addAll(ASSETS);
            })
    );
});

// Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request to ensure it's safe to read
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then((response) => {
                    // Check if we assume a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        // If response is a redirect (opaque or explicit), Safari might block it if served by SW
                        // We return it directly which is usually fine for non-navigation, but for navigation it might be an issue.
                        // However, the main fix for "Response served by service worker has redirections" is often to NOT wrap it in a new Response if it's already working, 
                        // OR to ensure we don't cache redirects if they are problematic.
                        return response;
                    }

                    // IMPORTANT: Clone the response. A response is a stream and because we want the browser to consume the response
                    // as well as the cache consuming the response, we need to clone it so we have two streams.
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                }).catch(() => {
                    // Fallback for when offline and not in cache
                    // If it's a navigation request, return index.html
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
