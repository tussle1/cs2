/* ============================================================
   sw.js — offline support so the "installed" desktop keeps
   working with no network (Chromebook / PWA / airplane mode).
   Bump VERSION when you ship changes.
   ============================================================ */

const VERSION = 'winxp-v3';

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/xp.css',
  './css/apps.css',
  './assets/bliss.jpg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
  './vendor/v86/libv86.mjs',
  './vendor/bios/seabios.bin',
  './vendor/bios/vgabios.bin',
  './vendor/os/kolibrios.img',
  './js/main.js',
  './js/apps/index.js',
  './js/apps/calc.js',
  './js/apps/cmd.js',
  './js/apps/control.js',
  './js/apps/display.js',
  './js/apps/explorer.js',
  './js/apps/filedialog.js',
  './js/apps/help.js',
  './js/apps/ie.js',
  './js/apps/media.js',
  './js/apps/minesweeper.js',
  './js/apps/notepad.js',
  './js/apps/paint.js',
  './js/apps/recycle.js',
  './js/apps/solitaire.js',
  './js/apps/taskmgr.js',
  './js/core/boot.js',
  './js/core/desktop.js',
  './js/core/fs.js',
  './js/core/icons.js',
  './js/core/menu.js',
  './js/core/screensaver.js',
  './js/core/settings.js',
  './js/core/shell.js',
  './js/core/sound.js',
  './js/core/startmenu.js',
  './js/core/util.js',
  './js/core/wallpapers.js',
  './js/core/wm.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // add one by one so a single 404 cannot fail the whole install
    await Promise.all(PRECACHE.map(async (url) => {
      try { await cache.add(new Request(url, { cache: 'reload' })); } catch (e) { /* optional file */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const putInCache = async (request, response) => {
  if (!response || !response.ok || response.type === 'opaque') return;
  const cache = await caches.open(VERSION);
  await cache.put(request, response.clone());
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // proxy responses are never cached

  // Page loads: network first (fresh code), cache as the offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        await putInCache('./index.html', response.clone());
        return response;
      } catch (e) {
        const cache = await caches.open(VERSION);
        return (await cache.match(request)) || (await cache.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Everything else: serve from cache instantly, refresh in the background.
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(request);
    const network = fetch(request)
      .then((response) => { putInCache(request, response); return response; })
      .catch(() => null);
    return cached || (await network) || Response.error();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});
