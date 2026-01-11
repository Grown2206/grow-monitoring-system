const CACHE_NAME = 'grow-system-v1.2.0';
const RUNTIME_CACHE = 'grow-runtime-v1.2.0';

// Assets die beim Install gecacht werden
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install Event - Precaching
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching App Shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Cleanup alter Caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network First mit Fallback zu Cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - Network First Strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone response für Cache
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback zu gecachter Version
          return caches.match(request);
        })
    );
    return;
  }

  // Static Assets - Cache First Strategy
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Update cache in background
          fetch(request).then(response => {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, response);
            });
          });
          return cachedResponse;
        }

        // Nicht im Cache - vom Netzwerk holen
        return fetch(request)
          .then(response => {
            // Nur erfolgreiche Antworten cachen
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseClone);
            });

            return response;
          })
          .catch(() => {
            // Offline Fallback Seite könnte hier zurückgegeben werden
            return new Response(
              JSON.stringify({
                error: 'Offline',
                message: 'Keine Netzwerkverbindung verfügbar'
              }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503
              }
            );
          });
      })
  );
});

// Background Sync für Offline-Aktionen
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync:', event.tag);

  if (event.tag === 'sync-sensor-data') {
    event.waitUntil(syncSensorData());
  }
});

async function syncSensorData() {
  // Hier könnten offline gesammelte Daten synchronisiert werden
  console.log('[SW] Syncing sensor data...');
}

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = { title: 'Grow System', body: 'Neue Benachrichtigung' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'default',
    requireInteraction: data.priority === 'high',
    timestamp: Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Prüfe ob App bereits offen ist
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Öffne neues Fenster
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Periodic Background Sync (experimentell)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-sensor-data') {
    event.waitUntil(updateSensorDataInBackground());
  }
});

async function updateSensorDataInBackground() {
  try {
    const response = await fetch('/api/data/current');
    const data = await response.json();

    // Prüfe auf kritische Werte
    if (data.temp > 35 || data.humidity < 30) {
      await self.registration.showNotification('Grow System Warnung', {
        body: `Temperatur: ${data.temp}°C, Luftfeuchtigkeit: ${data.humidity}%`,
        icon: '/icons/icon-192x192.png',
        tag: 'sensor-warning',
        requireInteraction: true
      });
    }
  } catch (error) {
    console.error('[SW] Background update failed:', error);
  }
}
