/* ==========================================================================
   DOA IBU Journal v16.27 — PREMIUM EXPERIENCE (skrip)
   Lapisan perilaku ADITIF. Tidak membaca/menulis data journal, tidak menyentuh
   Firebase. Setiap bagian dibungkus try/catch: bila gagal, aplikasi tetap jalan
   persis seperti v16.26.

   Isi
     1. Util & kamus bahasa
     2. PX.state / PX.skeleton / PX.toast / PX.error  (state kit konsisten)
     3. showToast bervarian (info / berhasil / gagal)
     4. Perpindahan halaman yang lembut
     5. Skeleton loading, error, dan offline per halaman
     6. FAB menyingkir saat menggulir turun
     7. Animasi grafik saat rentang waktu berubah
     8. Pengaturan ukuran teks
   ========================================================================== */
(function () {
  'use strict';
  var D = document, W = window;
  function $(s, r) { return (r || D).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function reduced() { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function safe(fn) { try { return fn(); } catch (e) { try { console.error('[premium v16.27]', e); } catch (x) {} } }

  /* ---------- 1. kamus ---------- */
  var DICT = {
    id: { retry: 'Coba lagi', loadErrT: 'Data belum bisa dimuat', loadErrB: 'Periksa koneksi internetmu, lalu coba lagi.', offT: 'Kamu sedang offline', offB: 'Sambungkan ke internet. Data akan dimuat setelah tersambung.',
      slowB: 'Memuat lebih lama dari biasanya. Periksa koneksi, lalu coba lagi.', textT: 'Ukuran teks', textD: 'Memperbesar teks di seluruh aplikasi. Tersimpan di perangkat ini.', textStd: 'Standar', textLg: 'Nyaman', textSample: 'Contoh: Journal sudah masuk. Tulis review singkat untuk menutup hari ini.' },
    en: { retry: 'Try again', loadErrT: 'Data could not be loaded', loadErrB: 'Check your internet connection, then try again.', offT: 'You are offline', offB: 'Connect to the internet. Your data will load once you are back online.',
      slowB: 'Loading is taking longer than usual. Check your connection, then try again.', textT: 'Text size', textD: 'Makes text larger across the app. Saved on this device.', textStd: 'Standard', textLg: 'Comfortable', textSample: 'Example: Journal saved. Write a short review to close the day.' },
    ms: { retry: 'Cuba lagi', loadErrT: 'Data belum dapat dimuatkan', loadErrB: 'Semak sambungan internet anda, kemudian cuba lagi.', offT: 'Anda sedang luar talian', offB: 'Sambung ke internet. Data akan dimuatkan selepas bersambung.',
      slowB: 'Pemuatan lebih lama daripada biasa. Semak sambungan, kemudian cuba lagi.', textT: 'Saiz teks', textD: 'Membesarkan teks di seluruh aplikasi. Disimpan pada peranti ini.', textStd: 'Standard', textLg: 'Selesa', textSample: 'Contoh: Jurnal sudah masuk. Tulis ulasan ringkas untuk menutup hari ini.' },
    es: { retry: 'Reintentar', loadErrT: 'No se pudieron cargar los datos', loadErrB: 'Revisa tu conexión a internet y vuelve a intentarlo.', offT: 'Sin conexión', offB: 'Conéctate a internet. Los datos se cargarán al volver a conectarte.',
      slowB: 'La carga tarda más de lo normal. Revisa tu conexión y vuelve a intentarlo.', textT: 'Tamaño del texto', textD: 'Agranda el texto en toda la aplicación. Se guarda en este dispositivo.', textStd: 'Estándar', textLg: 'Cómodo', textSample: 'Ejemplo: Journal guardado. Escribe una reseña breve para cerrar el día.' }
  };
  function lang() { try { return localStorage.getItem('journalLanguage') || 'id'; } catch (e) { return 'id'; } }
  function T(k) { return (DICT[lang()] || DICT.id)[k] || DICT.id[k] || k; }

  var ICON = {
    empty: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5 6.2 4h11.6L20 7.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5Z"/><path d="M4 7.5h4.5l1 2.5h5l1-2.5H20"/></svg>',
    error: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.4h.01"/></svg>',
    offline: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 3-2"/><path d="M19 12.9a10 10 0 0 0-5.3-2.8"/><path d="M12 20h.01"/></svg>',
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11v5.5"/><path d="M12 7.6h.01"/></svg>'
  };

  /* ---------- 2. state kit ---------- */
  var PX = W.PX = W.PX || {};
  PX.version = '16.27';
  var handlers = {};
  PX.on = function (name, fn) { handlers[name] = fn; };
  // kind: 'empty' | 'error' | 'offline'. action: { label, act } -> tombol dengan data-px-act.
  PX.state = function (o) {
    o = o || {}; var kind = o.kind === 'error' || o.kind === 'offline' ? o.kind : 'empty';
    var act = o.action && o.action.label ? '<button type="button" class="px-state-act' + (o.action.quiet ? ' quiet' : '') + '" data-px-act="' + esc(o.action.act || 'retry') + '">' + esc(o.action.label) + '</button>' : '';
    return '<div class="px-state px-state--' + kind + '" role="' + (kind === 'empty' ? 'status' : 'alert') + '"><span class="px-state-ico">' + ICON[kind] + '</span>' +
      '<b class="px-state-t">' + esc(o.title || '') + '</b>' + (o.body ? '<p class="px-state-b">' + esc(o.body) + '</p>' : '') + act + '</div>';
  };
  PX.skeleton = function (kind) {
    var s = function (c, st) { return '<div class="px-skel ' + c + '"' + (st ? ' style="' + st + '"' : '') + '></div>'; };
    var n = function (k, f) { var a = ''; for (var i = 0; i < k; i++) a += f(i); return a; };
    if (kind === 'calendar') return s('card', 'height:132px;border-radius:24px') + '<div class="px-sk-cal">' + n(35, function () { return s('cell'); }) + '</div>';
    if (kind === 'stats') return '<div class="px-sk-kpis">' + n(8, function () { return s('card', 'height:92px'); }) + '</div>' + s('chart');
    if (kind === 'gallery') return '<div class="px-sk-kpis">' + n(6, function () { return s('card', 'height:150px'); }) + '</div>';
    if (kind === 'list') return n(5, function () { return s('row'); });
    return s('title') + s('card') + s('chart');
  };
  PX.toast = function (msg, kind, ms) { toast(msg, kind || 'info', ms); };
  PX.error = function (msg, ms) { toast(msg, 'error', ms || 5200); };

  D.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('[data-px-act]'); if (!b) return;
    var a = b.getAttribute('data-px-act');
    if (handlers[a]) return handlers[a](b);
    if (a === 'retry') retryLoad();
  });

  /* ---------- 3. toast bervarian ---------- */
  var ERR_RE = /gagal|error|failed|tidak (bisa|dapat|ada)|belum (bisa|lengkap)|tak dapat|salah|invalid|^isi |^pilih |please|choose|fill in|^sila|^elige|completa|no se pudo|fallo/i;
  var OK_RE = /tersimpan|berhasil|terkirim|dihapus|diperbarui|selesai|disalin|saved|success|deleted|copied|updated|disimpan|dipadam|guardado|eliminado|copiado/i;
  function kindOf(m) { return OK_RE.test(m) ? 'ok' : ERR_RE.test(m) ? 'error' : 'info'; }
  function toast(message, kind, duration) {
    var el = $('#toast'); if (!el) return;
    var msg = String(message == null ? '' : message), k = kind || kindOf(msg);
    el.className = 'toast' + (k === 'ok' ? ' px-ok' : k === 'error' ? ' px-err' : '');
    el.setAttribute('aria-live', k === 'error' ? 'assertive' : 'polite'); el.setAttribute('role', 'status'); el.setAttribute('aria-atomic', 'true');
    el.innerHTML = '<span class="px-t-ico">' + (k === 'ok' ? ICON.ok : k === 'error' ? ICON.error : ICON.info) + '</span><span class="px-t-msg">' + esc(msg) + '</span>';
    el.classList.add('show');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(function () { el.classList.remove('show'); }, duration || (k === 'error' ? 5200 : 3200));
  }
  safe(function () { W.showToast = function (message, duration) { toast(message, null, duration); }; });

  /* ---------- 4. perpindahan halaman ---------- */
  var VIEW_ID = { dashboard: 'view-dashboard', calendar: 'calendar-section', statistik: 'statistik-section', monthly: 'monthly-section', strategy: 'strategy-section', coach: 'coach-section', wrapped: 'wrapped-section', gallery: 'gallery-section', diary: 'diary-section', web: 'web-section', settings: 'settings-section' };
  var ORDER = ['dashboard', 'calendar', 'statistik', 'monthly', 'strategy', 'coach', 'wrapped', 'gallery', 'diary', 'web', 'settings'];
  var lastView = null;
  W.addEventListener('viewchange', function (ev) {
    safe(function () {
      var v = ev && ev.detail && ev.detail.view; if (!v) return;
      var prev = lastView; lastView = v;
      if (prev === null) { // tampilan pertama: tidak dianimasikan
        return;
      }
      if (prev === v) return;
      var el = D.getElementById(VIEW_ID[v]); if (!el || el.classList.contains('hidden')) return;
      if (W.scrollY > 0) W.scrollTo(0, 0);
      if (reduced() || !el.animate) return;
      var dir = ORDER.indexOf(v) >= ORDER.indexOf(prev) ? 1 : -1;
      try { el.getAnimations().forEach(function (a) { a.cancel(); }); } catch (e) {}
      el.animate([
        { opacity: 0, transform: 'translate3d(' + (dir * 14) + 'px, 8px, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' }
      ], { duration: 320, easing: 'cubic-bezier(.22,.61,.36,1)' });
    });
  });

  /* ---------- 5. skeleton, error, offline ---------- */
  var HOSTS = [['calendar-section', 'calendar'], ['statistik-section', 'stats'], ['gallery-section', 'gallery']];
  var loaded = !!W.__pxLoaded, failTimer = 0, bodyEl = D.body;
  function hostEls() { return Array.prototype.slice.call(D.querySelectorAll('.px-sk-view')); }
  function ensureHosts() {
    HOSTS.forEach(function (h) {
      var sec = D.getElementById(h[0]); if (!sec || sec.querySelector(':scope > .px-sk-view')) return;
      var box = D.createElement('div'); box.className = 'px-sk-view'; box.setAttribute('data-px-sk', h[1]); box.setAttribute('aria-busy', 'true'); box.setAttribute('aria-label', 'Memuat');
      box.innerHTML = PX.skeleton(h[1]); sec.insertBefore(box, sec.firstChild);
    });
  }
  function paintSkeleton() { hostEls().forEach(function (b) { b.setAttribute('aria-busy', 'true'); b.innerHTML = PX.skeleton(b.getAttribute('data-px-sk')); }); }
  function paintFailure(slow) {
    var off = W.navigator && W.navigator.onLine === false;
    var html = PX.state({ kind: off ? 'offline' : 'error', title: off ? T('offT') : T('loadErrT'), body: off ? T('offB') : (slow ? T('slowB') : T('loadErrB')), action: { label: T('retry'), act: 'retry' } });
    hostEls().forEach(function (b) { b.setAttribute('aria-busy', 'false'); b.innerHTML = html; });
  }
  function startLoading() {
    if (loaded) return;
    ensureHosts(); paintSkeleton(); bodyEl.classList.add('px-loading');
    clearTimeout(failTimer); failTimer = setTimeout(function () { if (!loaded) paintFailure(true); }, 15000);
  }
  function endLoading() {
    loaded = true; clearTimeout(failTimer); bodyEl.classList.remove('px-loading');
  }
  function retryLoad() {
    safe(function () {
      loaded = false; startLoading();
      if (typeof loadJournals === 'function') loadJournals();
    });
  }
  W.addEventListener('journals-loaded', function () { safe(endLoading); });
  W.addEventListener('journals-error', function () { safe(function () { clearTimeout(failTimer); ensureHosts(); bodyEl.classList.add('px-loading'); paintFailure(false); }); });
  W.addEventListener('online', function () { safe(function () { if (bodyEl.classList.contains('px-loading') && !loaded) retryLoad(); }); });
  safe(function () {
    var wasAuthed = bodyEl.classList.contains('authed');
    if (wasAuthed) startLoading();
    new MutationObserver(function () {
      var now = bodyEl.classList.contains('authed');
      if (now && !wasAuthed) { loaded = !!W.__pxLoaded; startLoading(); }
      if (!now && wasAuthed) { loaded = false; W.__pxLoaded = false; clearTimeout(failTimer); bodyEl.classList.remove('px-loading'); }
      wasAuthed = now;
    }).observe(bodyEl, { attributes: true, attributeFilter: ['class'] });
  });

  /* ---------- 6. FAB menyingkir saat menggulir turun ---------- */
  safe(function () {
    var lastY = W.scrollY || 0, ticking = false;
    W.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      W.requestAnimationFrame(function () {
        ticking = false;
        var fab = $('#btn-new-journal-fab'); if (!fab) return;
        var y = W.scrollY || 0, d = y - lastY;
        if (d > 10 && y > 160) fab.classList.add('px-hide'); else if (d < -6 || y <= 160) fab.classList.remove('px-hide');
        if (Math.abs(d) > 6) lastY = y;
      });
    }, { passive: true });
  });

  /* ---------- 7. animasi grafik ---------- */
  function drawIn() {
    var s = $('#v5-eq svg'); if (!s || reduced()) return;
    s.classList.remove('px-draw'); void s.getBoundingClientRect(); s.classList.add('px-draw');
  }
  D.addEventListener('click', function (e) { if (e.target && e.target.closest && e.target.closest('[data-eqr]')) setTimeout(drawIn, 0); }, true);
  var firstDraw = true;
  W.addEventListener('journals-loaded', function () { if (!firstDraw) return; firstDraw = false; setTimeout(function () { safe(drawIn); }, 80); });

  /* ---------- 8. ukuran teks ---------- */
  function getText() { try { return localStorage.getItem('pxText') === 'lg' ? 'lg' : 'std'; } catch (e) { return 'std'; } }
  function setText(v) {
    try { localStorage.setItem('pxText', v); } catch (e) {}
    if (v === 'lg') D.documentElement.setAttribute('data-px-text', 'lg'); else D.documentElement.removeAttribute('data-px-text');
    try { W.dispatchEvent(new Event('resize')); } catch (e) {} // grafik & layout menghitung ulang
  }
  function mountTextSize() {
    if ($('#px-textsize')) return true;
    var slider = $('#glass-slider'), anchor = slider && slider.closest('.glass'); if (!anchor || !anchor.parentNode) return false;
    var cur = getText(), card = D.createElement('div');
    card.id = 'px-textsize'; card.className = anchor.className;
    card.innerHTML = '<div class="px-set-h"><span class="px-set-t" id="px-text-t">' + esc(T('textT')) + '</span>' +
      '<div class="px-seg" role="group" aria-labelledby="px-text-t">' +
      '<button type="button" data-px-text="std" aria-pressed="' + (cur === 'std') + '">' + esc(T('textStd')) + '</button>' +
      '<button type="button" data-px-text="lg" aria-pressed="' + (cur === 'lg') + '">' + esc(T('textLg')) + '</button></div></div>' +
      '<p class="px-set-d">' + esc(T('textD')) + '</p><div class="px-set-sample">' + esc(T('textSample')) + '</div>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    card.addEventListener('click', function (e) {
      var b = e.target.closest('[data-px-text]'); if (!b) return;
      var v = b.getAttribute('data-px-text'); setText(v);
      Array.prototype.forEach.call(card.querySelectorAll('[data-px-text]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    });
    return true;
  }
  safe(function () {
    if (getText() === 'lg') D.documentElement.setAttribute('data-px-text', 'lg');
    if (!mountTextSize()) { var tries = 0, iv = setInterval(function () { if (mountTextSize() || ++tries > 20) clearInterval(iv); }, 400); }
  });
})();
