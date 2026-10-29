importScripts('./reminder-core.js');
const R = self.DoaIbuReminder;

const VERSION = 'v17-03-4-tahap4-final';
const SHELL = `doaibu-shell-${VERSION}`;
const RUNTIME = `doaibu-runtime-${VERSION}`;
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './pretrade.html', './pretrade.webmanifest', './reminder-core.js', './v16-stats.js', './trade-stack.js', './journal-entries.js', './smart-cards.js', './smart-cards.css', './trade-summary.js', './strategy-library.js', './strategy-execution.js', './ai-coach.js', './ai-coach-ui.js', './trading-wrapped.js', './trading-wrapped-ui.js', './ds.css', './premium.css', './liquid-glass-v1634.css', './interaction-motion-v1636.css', './interaction-motion-v1636.js', './adaptive-header.css', './adaptive-header.js', './adaptive-nav.css', './adaptive-nav.js', './ambient-glass.css', './ambient-glass.js', './journal-form-ux.css', './review-in-form.css', './journal-form-ux.js', './review-in-form.js', './calm-nav.css', './calm-nav.js', './living.css', './living.js', './signature.css', './signature.js', './sheet-system.css', './sheet-system.js', './editorial.css', './editorial.js', './type-system.css', './optical-glass.css', './glass-nav.css', './smart-glass.css', './glass-depth.css', './prismatic-edge.css', './morph-nav.css', './morph-nav.js', './depth-parallax.css', './depth-parallax.js', './contextual-ambient.css', './contextual-ambient.js', './liquid-modal.css', './signature-glass.css', './native-tabbar.css', './native-sheet.css', './native-sheet.js', './dash-editorial.css', './glass-tiers.css', './dash-editorial.js', './login-card.css', './login-card.js', './undo-recovery.css', './undo-recovery.js', './journal-ux.css', './journal-ux.js', './journal-cinematic.css', './journal-cinematic.js', './mobile-float.css', './mobile-float.js', './menu-settings.css', './spatial-layers.css', './menu-settings.js', './spatial-layers.js', './gesture-ui.css', './journal-gestures.css', './performance-hero.css', './gesture-ui.js', './journal-gestures.js', './status-capsule.css', './status-capsule.js', './trading-rhythm.css', './trading-rhythm.js', './glassy-v4.css', './visual-comfort-v16.95.css', './navigation-refinement-v16.97.css', './identity.css', './identity.js', './action-surface.css', './action-surface.js', './touch-chart.css', './touch-chart.js', './ios-native-suite.css', './ios-native-suite.js', './accounts-manager.css', './accounts-manager.js', './tradingview-import.css', './tradingview-import.js', './ea/DoaIbu_Sync_MT4.mq4', './ea/DoaIbu_Sync_MT5.mq5', './CHANGELOG-v17.03.md', './icons/mark.svg', './motion-system.css', './liquid-depth.css', './motion-system.js', './trade-360.css', './trade-360.js', './touch-smooth-v1653.css', './touch-smooth-v1653.js', './elegant-surface-v1654.css', './elegant-motion-v1654.js', './calm-polish-v1655.css', './calm-polish-v1655.js', './CHANGELOG-v16.55.md', './CHANGELOG-v16.62.md', './CHANGELOG-v16.63.md', './CHANGELOG-v16.64.md', './CHANGELOG-v16.65.md', './CHANGELOG-v16.66.md', './CHANGELOG-v16.67.md', './CHANGELOG-v16.68.md', './CHANGELOG-v16.69.md', './CHANGELOG-v16.70.md', './CHANGELOG-v16.73.md', './CHANGELOG-v16.74.md', './CHANGELOG-v16.75.md', './CHANGELOG-v16.76.md', './CHANGELOG-v16.99.md', './CHANGELOG-v16.39.md', './CHANGELOG-v16.39.1.md', './CHANGELOG-v16.39.2.md', './CHANGELOG-v16.39.6.md', './CHANGELOG-v16.40.md', './CHANGELOG-v16.41.md', './CHANGELOG-v16.42.md', './CHANGELOG-v16.43.md', './CHANGELOG-v16.44.md', './CHANGELOG-v16.45.md', './premium.js', './icons/icon-192.png', './icons/icon-512.png', './icons/logo-512.png'];

// Hanya library statis (CDN) yang boleh di-cache. Firebase Auth/Firestore/imgbb TIDAK disentuh.
const CACHEABLE_HOSTS = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => ![SHELL, RUNTIME].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Halaman utama: network-first supaya update langsung muncul, fallback ke cache saat offline
  if (req.mode === 'navigate') {
    // Halaman aksi email Firebase (reset password dll.): selalu dari jaringan, jangan menimpa cache index.html.
    if (url.origin === self.location.origin && url.pathname.endsWith('/auth-action.html')) return;
    // Halaman Pre-Trade punya cache sendiri; jangan menimpa index.html.
    const isPre = url.origin === self.location.origin && url.pathname.endsWith('/pretrade.html');
    const key = isPre ? './pretrade.html' : './index.html';
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put(key, copy));
        return res;
      }).catch(() => caches.match(key))
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const cdn = CACHEABLE_HOSTS.includes(url.hostname) && !url.pathname.includes('/firebasejs/__/');
  if (!sameOrigin && !cdn) return; // biarkan Firebase, imgbb, dll lewat jaringan langsung

  // Stale-while-revalidate
  e.respondWith(
    caches.open(RUNTIME).then(async cache => {
      const cached = await cache.match(req);
      const network = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

// ============ PENGINGAT JOURNAL ============
// Dipicu oleh Periodic Background Sync (Chrome Android, PWA terpasang). Browser yang menentukan
// seberapa sering event ini jalan, jadi ini pelengkap — bukan jaminan tepat waktu.
async function checkReminder() {
  const s = await R.idbGet('settings');
  if (!s || !s.enabled) return;
  const dates = (await R.idbGet('journalDates')) || [];
  const log = await R.idbGet('log');
  const now = new Date();
  if (!R.shouldNotify(s, dates, log, now)) return;
  // Kalau aplikasi sedang terbuka, banner di dalam aplikasi yang menangani.
  const wins = await self.clients.matchAll({ type: 'window' });
  if (wins.some(w => w.visibilityState === 'visible')) return;
  const lang = (await R.idbGet('lang')) || 'id';
  const n = R.notificationOptions(s, lang);
  await self.registration.showNotification(n.title, n.options);
  await R.idbSet('log', R.nextLog(log, now));
}

self.addEventListener('periodicsync', e => {
  if (e.tag === 'journal-reminder') e.waitUntil(checkReminder());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './?action=new-journal';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) { c.postMessage({ type: 'reminder-open' }); return c.focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});
