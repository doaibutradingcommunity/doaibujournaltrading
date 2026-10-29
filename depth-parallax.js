/* v16.80 · Depth Parallax — skrip (kecil, tanpa dependensi)
   Satu tugas: saat halaman digulir, isi --dp-y (px) pada #sg-light. Tampilan ada di depth-parallax.css.
   Tidak menyentuh data, statistik, atau navigasi. Tanpa skrip ini cahaya ambient statis seperti v16.79.

   Gerak = 0,05 × gulir (cahaya bergerak 20× lebih lambat daripada konten), dilunakkan dengan tanh
   sehingga mendekati batas (36px desktop / 24px HP, maks 10% tinggi layar) tanpa berhenti mendadak. */
(function () {
  'use strict';
  var W = window, D = document, root = D.documentElement;
  if (W.DoaDepthParallax) return;

  var RATE = .05;
  var mqReduce = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var light = null, last = null, tick = false;

  function off() {
    return !!(mqReduce && mqReduce.matches) ||
      root.classList.contains('mo-lite') ||
      root.getAttribute('data-ui-effects') === 'low' ||
      !(W.CSS && CSS.supports && CSS.supports('translate', '0 0'));
  }
  function maxShift() {
    var base = W.innerWidth <= 640 ? 24 : 36;
    return Math.min(base, (W.innerHeight || 600) * .1);   // wadah #sg-light punya margin 14vh; sisakan ruang
  }
  function apply() {
    tick = false;
    if (!light) light = D.getElementById('sg-light');
    if (!light) return;
    var v = 0;
    if (!off()) {
      var y = W.pageYOffset || root.scrollTop || 0, m = maxShift();
      v = -m * Math.tanh(y * RATE / m);
    }
    v = Math.round(v * 2) / 2;                              // langkah .5px: lewati perubahan sangat kecil
    if (v === last) return;
    last = v;
    if (v === 0) light.style.removeProperty('--dp-y'); else light.style.setProperty('--dp-y', v);
  }
  function req() { if (!tick) { tick = true; W.requestAnimationFrame(apply); } }

  W.addEventListener('scroll', req, { passive: true });
  W.addEventListener('resize', req, { passive: true });
  if (mqReduce && mqReduce.addEventListener) mqReduce.addEventListener('change', req);
  W.addEventListener('viewchange', req);
  W.DoaDepthParallax = { update: apply };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', apply); else apply();
})();
