/* v16.63 · Navigasi Adaptive Glass — bagian skrip (kecil, tanpa dependensi)
   Tombol Back HP (Android) menutup sheet "Menu", bukan keluar dari halaman.
   Tidak mengubah logika navigasi; hanya menambah satu entri riwayat selama sheet terbuka.
   v16.65: dock memadat saat gulir turun (HP), label tombol tambah journal (desktop), pintasan N.
   (Mode hemat/lite memakai html.mo-lite dari motion-system.js; gayanya ada di adaptive-nav.css.) */
(function () {
  'use strict';
  var W = window, D = document;

  /* ---------- Back HP menutup sheet Menu ---------- */
  var pushed = false, skipPop = false;

  function sheetOpen() { return !!D.body && D.body.classList.contains('npv-open'); }

  function sync() {
    var open = sheetOpen();
    if (open && !pushed) {
      try { W.history.pushState({ anSheet: 1 }, ''); pushed = true; } catch (e) {}
    } else if (!open && pushed) {
      pushed = false;
      // ditutup lewat UI (scrim, geser, pilih item): buang entri yang kita tambahkan, hanya jika masih di puncak riwayat
      if (W.history.state && W.history.state.anSheet) { skipPop = true; try { W.history.back(); } catch (e) { skipPop = false; } }
    }
  }

  W.addEventListener('popstate', function () {
    if (skipPop) { skipPop = false; return; }
    if (pushed && sheetOpen()) {            // Back ditekan saat sheet terbuka -> tutup sheet
      pushed = false;
      var scrim = D.querySelector('.npv-scrim');
      if (scrim) scrim.click();
    } else {
      pushed = false;
    }
  });

  function start() {
    if (!D.body || !W.MutationObserver) return;
    new MutationObserver(sync).observe(D.body, { attributes: true, attributeFilter: ['class'] });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();

  /* ---------- v16.65 · Dock memadat saat menggulir turun (HP) ---------- */
  var mq = W.matchMedia ? W.matchMedia('(max-width: 640px)') : { matches: false };
  var lastY = 0, tick = false;
  function setCompact(on) {
    if (!D.body) return;
    if (D.body.classList.contains('an-compact') !== on) D.body.classList.toggle('an-compact', on);
  }
  function onScroll() {
    tick = false;
    var y = W.pageYOffset || D.documentElement.scrollTop || 0, d = y - lastY;
    var max = (D.documentElement.scrollHeight || 0) - W.innerHeight;
    if (!mq.matches || y < 120 || (max > 0 && y >= max - 24)) setCompact(false);   // di atas / di dasar halaman: dock penuh
    else if (d > 10) setCompact(true);
    else if (d < -10) setCompact(false);
    if (Math.abs(d) > 3) lastY = y;
  }
  W.addEventListener('scroll', function () { if (!tick) { tick = true; W.requestAnimationFrame(onScroll); } }, { passive: true });
  W.addEventListener('viewchange', function () { setCompact(false); lastY = 0; });
  W.addEventListener('resize', function () { if (!mq.matches) setCompact(false); });
  D.addEventListener('touchstart', function (e) { if (e.target.closest && e.target.closest('.npv-dock')) setCompact(false); }, { passive: true });

  /* ---------- v16.65 · Tombol tambah journal: label (4 bahasa) + pintasan N di desktop ---------- */
  var LABEL = { id: 'Journal Baru', en: 'New Journal', ms: 'Jurnal Baru', es: 'Nuevo Diario' };
  function lang() { var l; try { l = W.localStorage.getItem('journalLanguage'); } catch (e) {} return LABEL[l] ? l : 'id'; }
  function fabEl() { return D.getElementById('btn-new-journal-fab'); }
  function labelFab() {
    var f = fabEl(); if (!f) return;
    var txt = LABEL[lang()];
    if (f.getAttribute('data-label') !== txt) f.setAttribute('data-label', txt);
    if (f.getAttribute('aria-label') !== txt) f.setAttribute('aria-label', txt);
    if (!f.getAttribute('aria-keyshortcuts')) f.setAttribute('aria-keyshortcuts', 'N');
  }
  function initFab() {
    labelFab();
    var sel = D.getElementById('app-language');
    if (sel) sel.addEventListener('change', function () { setTimeout(labelFab, 60); });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', initFab); else initFab();

  D.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat) return;
    if (e.key !== 'n' && e.key !== 'N') return;
    if (mq.matches || !D.body.classList.contains('authed')) return;           // hanya desktop/tablet dan setelah login
    var t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    var form = D.getElementById('form-section'), f = fabEl();
    if (!f || !form || !form.classList.contains('hidden')) return;             // form sudah terbuka
    if (D.querySelector('.modal-overlay:not(.hidden)')) return;                // modal lain terbuka
    e.preventDefault(); f.click();
  });

})();
