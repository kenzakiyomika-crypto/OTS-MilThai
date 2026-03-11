/* ═══════════════════════════════════════════
   TACTICAL FITNESS — SERVICE WORKER v1.0
   Offline-first cache strategy
═══════════════════════════════════════════ */

const CACHE_NAME = 'tactical-fitness-v9';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/base.css',
  '/css/responsive.css',
  '/js/schema.js',
  '/js/storage.js',
  '/js/phase1-training.js',
  '/js/phase1-notifications.js',
  '/js/phase2-engine.js',
  '/js/phase3-engine.js',
  '/js/phase4-engine.js',
  '/pages/onboarding.html',
  '/pages/dashboard.html',
  '/pages/training.html',
  '/pages/planner.html',
  '/pages/performance.html',
  '/pages/import-export.html',
  '/pages/rank.html',
  '/pages/missions.html',
  '/pages/settings.html',
  '/pages/science-planner.html',
  '/pages/ultimate-coach.html',
  '/pages/intel-center.html',
  '/pages/ops-hub.html',
  '/js/utils.js',
  '/js/engines/exercise-science-rules.js',
  '/js/engines/fatigue.js',
  '/js/engines/mission.js',
  '/js/engines/planner.js',
  '/js/engines/rank.js',
  '/js/engines/ultimate-engine.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  // Google Fonts
  'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Bebas+Neue&family=Rajdhani:wght@400;500;600;700&display=swap',
];

/* ── INSTALL: cache all static assets ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: clean old caches ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH: cache-first for static, network-first for API ── */
self.addEventListener('fetch', (event) => {
  // Skip non-GET and cross-origin non-font requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Always use cache for app assets (cache-first)
  if (
    url.origin === self.location.origin ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200) return response;

            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
          .catch(() => {
            // Offline fallback
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
    );
  }
});

/* ── BACKGROUND SYNC: update check ── */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();

  if (event.data === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.source.postMessage({ type: 'CACHE_CLEARED' });
    });
  }
});
