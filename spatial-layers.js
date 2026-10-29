/* v16.46 · Spatial Layered Interface
   Satu tugas: menandai body.sl-scrolled saat halaman digulir, supaya kontrol atas
   (header/nav) terangkat lebih tinggi dari konten yang lewat di bawahnya.
   Murni kelas CSS; tidak menyentuh data atau logika aplikasi. */
(function () {
  'use strict';
  var on = false, tick = false;
  function apply() {
    tick = false;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    var next = y > 8;
    if (next !== on) { on = next; document.body.classList.toggle('sl-scrolled', on); }
  }
  function onScroll() { if (!tick) { tick = true; requestAnimationFrame(apply); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  apply();
})();
