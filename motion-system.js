/* DOA IBU v16.49 — Transisi yang konsisten (sisi JS)
   Tiga tugas kecil, semuanya hanya visual; tidak menyentuh data, statistik, atau navigasi:
   1) menandai perangkat hemat (html.mo-lite) agar gerak berat dimatikan;
   2) menandai saat halaman sedang digulir (html.mo-scrolling) untuk menjeda kilau tanpa akhir;
   3) mengatur animasi Chart.js: singkat, hanya saat grafik pertama kali muncul, tidak diulang
      saat render ulang (ganti tema/mata uang/snapshot data) dan mati di perangkat hemat. */
(function () {
  'use strict';
  if (window.__doaMotion1649) return;
  window.__doaMotion1649 = true;
  var root = document.documentElement;

  function mq(q) { try { return window.matchMedia(q).matches; } catch (_) { return false; } }

  /* 1) perangkat hemat: RAM <= 2 GB, CPU <= 3 inti, Data Saver, atau pengguna meminta gerak dikurangi */
  function isLite() {
    var nav = navigator || {};
    var conn = nav.connection || {};
    if (conn.saveData) return true;
    if (nav.deviceMemory && nav.deviceMemory <= 2) return true;
    if (nav.hardwareConcurrency && nav.hardwareConcurrency <= 3) return true;
    return false;
  }
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var lite = isLite();
  if (lite) root.classList.add('mo-lite');

  /* 2) jeda loop dekoratif selama menggulir (listener pasif, tanpa baca layout) */
  var scrollTimer = 0, scrolling = false;
  window.addEventListener('scroll', function () {
    if (!scrolling) { scrolling = true; root.classList.add('mo-scrolling'); }
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(function () {
      scrolling = false;
      root.classList.remove('mo-scrolling');
    }, 140);
  }, { passive: true });

  /* 3) Chart.js */
  var DRAW_MS = 360;     // masuk pertama kali
  var HOVER_MS = 120;    // sorotan titik saat hover/sentuh
  function configureCharts() {
    var C = window.Chart;
    if (!C || !C.defaults || C.__doaMotion1649) return false;
    C.__doaMotion1649 = true;
    try {
      var a = C.defaults.animation;
      if (a && typeof a === 'object') {
        a.easing = 'easeOutCubic';
        a.duration = function (ctx) {
          try {
            if (reduce || lite) return 0;
            var cv = ctx && ctx.chart && ctx.chart.canvas;
            // Canvas yang sudah pernah tergambar = render ulang -> langsung tampil, tanpa menggambar dari nol.
            if (cv && cv.__moDrawn) return 0;
            // Data sangat banyak: animasi per titik tidak sepadan.
            var n = 0;
            var ds = ctx && ctx.chart && ctx.chart.data && ctx.chart.data.datasets;
            if (ds && ds[0] && ds[0].data) n = ds[0].data.length;
            if (n > 400) return 0;
          } catch (_) {}
          return DRAW_MS;
        };
      }
      var t = C.defaults.transitions;
      if (t && t.active && t.active.animation) t.active.animation.duration = (reduce || lite) ? 0 : HOVER_MS;
      if (C.register) {
        C.register({
          id: 'doaMotionGate',
          // setelah render pertama, tandai canvas; render berikutnya tidak menganimasikan ulang
          afterRender: function (chart) { if (chart && chart.canvas) chart.canvas.__moDrawn = true; }
        });
      }
    } catch (e) { /* motion hanya hiasan: jangan pernah mengganggu grafik */ }
    return true;
  }
  if (!configureCharts()) {
    // Chart.js dimuat dari CDN; coba lagi sebentar bila belum siap
    var tries = 0;
    var iv = window.setInterval(function () {
      if (configureCharts() || ++tries > 40) window.clearInterval(iv);
    }, 250);
  }
  // Saat pengguna berpindah halaman, grafik di halaman tujuan boleh masuk sekali lagi.
  window.addEventListener('viewchange', function () {
    var list = document.querySelectorAll('canvas');
    for (var i = 0; i < list.length; i++) list[i].__moDrawn = false;
  });

  // Ikuti perubahan preferensi sistem tanpa muat ulang
  try {
    var m = window.matchMedia('(prefers-reduced-motion: reduce)');
    var onChange = function (e) { reduce = e.matches; };
    if (m.addEventListener) m.addEventListener('change', onChange);
    else if (m.addListener) m.addListener(onChange);
  } catch (_) {}
})();
