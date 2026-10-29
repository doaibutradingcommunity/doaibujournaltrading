/* v16.70 · Signature Ambient Experience — skrip (kecil, tanpa dependensi)
   Seluruh tampilan ada di signature.css. Skrip ini hanya:
     1. membuat satu elemen dekoratif #sg-light (tiga lampu cahaya, aria-hidden) di belakang halaman;
     2. memilih nada cahaya menurut jam (dawn / day / dusk / night) — bergeser pelan, tanpa loncat;
     3. menggeser titik cahaya saat pindah halaman (event 'viewchange' dari switchView);
     4. mengisi --sg-p (0…1) pada header menurut gulir, agar header mengeras halus, bukan sakelar.
   Tidak menyentuh data, statistik, atau logika navigasi. Menambah class html.sg-on saat siap. */
(function () {
  'use strict';
  var W = window, D = document, html = D.documentElement;

  /* ---------- 1. Elemen cahaya ---------- */
  var light = null;
  function build() {
    if (D.getElementById('sg-light')) { light = D.getElementById('sg-light'); return true; }
    if (!D.body) return false;
    light = D.createElement('div');
    light.id = 'sg-light';
    light.setAttribute('aria-hidden', 'true');
    light.innerHTML = '<b class="a"></b><b class="b"></b><b class="c"></b>';
    var vibe = D.getElementById('vibe-ambient');
    if (vibe && vibe.parentNode) vibe.parentNode.insertBefore(light, vibe.nextSibling);
    else D.body.insertBefore(light, D.body.firstChild);
    return true;
  }

  /* ---------- 2. Nada cahaya menurut jam ---------- */
  function tone() {
    var d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    return h >= 5 && h < 9 ? 'dawn' : h >= 9 && h < 16 ? 'day' : h >= 16 && h < 19.5 ? 'dusk' : 'night';
  }
  function applyTone() {
    var t = tone();
    if (html.getAttribute('data-sg-tone') !== t) html.setAttribute('data-sg-tone', t);
  }

  /* ---------- 3. Titik cahaya per halaman (vw, vh) ---------- */
  var SPOT = {
    home: [0, 0], dashboard: [6, -3], calendar: [-5, 4], statistik: [4, 6], monthly: [-6, -2], strategy: [5, -5],
    coach: [-3, 6], wrapped: [7, 3], gallery: [-7, 5], diary: [0, -6], settings: [-4, -4], web: [3, 7]
  };
  function spot(v) {
    var p = SPOT[v] || SPOT.home;
    if (!light) return;
    light.style.setProperty('--sg-x', p[0]);
    light.style.setProperty('--sg-y', p[1]);
  }
  function currentView() {
    var a = D.querySelector('.nav-pill-btn.active[data-view]');
    return a ? a.getAttribute('data-view') : 'home';
  }

  /* ---------- 4. Header: progres gulir 0…1 (0–140 px) ---------- */
  var header = null, last = -1, tick = false, RANGE = 140;
  function onScroll() {
    tick = false;
    if (!header) header = D.querySelector('#app > header.app-header');
    if (!header) return;
    var y = W.pageYOffset || html.scrollTop || 0;
    var p = Math.max(0, Math.min(1, y / RANGE));
    if (Math.abs(p - last) < .004 && p !== 0 && p !== 1) return;   // lewati perubahan sangat kecil
    last = p;
    header.style.setProperty('--sg-p', p.toFixed(3));
  }

  function start() {
    if (!build()) return;
    applyTone();
    spot(currentView());
    onScroll();
    html.classList.add('sg-on');

    W.addEventListener('viewchange', function (ev) {
      var v = ev && ev.detail && ev.detail.view;
      if (v) spot(v);
      last = -1; onScroll();
    });
    W.addEventListener('scroll', function () { if (!tick) { tick = true; W.requestAnimationFrame(onScroll); } }, { passive: true });
    // nada diperbarui tiap 10 menit dan saat tab kembali aktif (cukup untuk pergeseran sepanjang hari)
    setInterval(applyTone, 600000);
    D.addEventListener('visibilitychange', function () { if (!D.hidden) applyTone(); });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
