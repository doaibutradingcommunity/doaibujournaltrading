/* v16.41 · Adaptive Header
   Menggulir turun  -> header mengecil (is-compact).
   Menggulir naik / dekat atas halaman / fokus keyboard ke header -> header membesar lagi.
   Tidak mengubah logika aplikasi; hanya menambah/menghapus satu kelas pada <header class="app-header">. */
(function () {
  'use strict';
  var W = window, D = document;
  var hdr = null;
  var compact = false, dirty = true, comp = 0;
  var lastY = 0, anchorY = 0, dir = 0, ticking = false;

  var TOP_AT = 24;      // di bawah ini selalu membesar
  var DOWN_AT = 72;     // harus melewati ini sebelum boleh mengecil
  var DOWN_DELTA = 10;  // jarak gulir turun berturut-turut untuk mengecil
  var UP_DELTA = 8;     // jarak gulir naik berturut-turut untuk membesar

  function getHdr() {
    if (!hdr || !hdr.isConnected) hdr = D.querySelector('#app > header.app-header');
    return hdr;
  }

  /* Ukur tinggi alami header di dua keadaan (tanpa transisi, dalam satu frame -> tidak terlihat),
     lalu kunci tinggi eksplisitnya lewat CSS (--ah-h0 / --ah-h1). */
  function measure() {
    var h = getHdr();
    if (!h) return false;
    var h0, h1;
    h.classList.add('is-measuring');
    h.classList.remove('ah-ready');
    h.classList.remove('is-compact');
    h0 = h.getBoundingClientRect().height;
    h.classList.add('is-compact');
    h1 = h.getBoundingClientRect().height;
    h.classList.remove('is-compact');
    compact = false;
    if (!(h0 > 0)) { h.classList.remove('is-measuring'); return false; } // #app masih tersembunyi (belum login)
    h0 = Math.round(h0 * 100) / 100; h1 = Math.round(h1 * 100) / 100;
    comp = Math.max(0, h0 - h1);
    var st = D.documentElement.style;
    st.setProperty('--ah-h0', h0 + 'px');
    st.setProperty('--ah-h1', h1 + 'px');
    h.classList.add('ah-ready');
    void h.offsetHeight;                 // terapkan keadaan akhir tanpa transisi
    h.classList.remove('is-measuring');
    dirty = false;
    return true;
  }

  function set(on) {
    var h = getHdr();
    if (!h || on === compact) return;
    if (on) {
      if (dirty && !measure()) return;
      if (comp < 2) return; // tidak ada yang bisa dikecilkan
    }
    compact = on;
    h.classList.toggle('is-compact', on);
  }

  function scrollable() {
    var de = D.documentElement;
    return (de.scrollHeight - W.innerHeight) > (DOWN_AT + comp + 80);
  }

  function update() {
    ticking = false;
    var de = D.documentElement;
    var maxY = Math.max(0, de.scrollHeight - W.innerHeight);
    var y = Math.min(Math.max(0, W.scrollY || W.pageYOffset || 0), maxY); // abaikan pantulan iOS
    if (y <= TOP_AT) { dir = 0; anchorY = y; lastY = y; set(false); return; }
    var dy = y - lastY;
    lastY = y;
    if (dy === 0) return;
    var d = dy > 0 ? 1 : -1;
    if (d !== dir) { dir = d; anchorY = y - dy; }
    if (!compact && d === 1 && y > DOWN_AT && (y - anchorY) > DOWN_DELTA) {
      if (scrollable()) set(true);
    } else if (compact && d === -1 && (anchorY - y) > UP_DELTA) {
      set(false);
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    W.requestAnimationFrame(update);
  }

  function invalidate() { // ukuran layar berubah -> kembali membesar, ukur ulang pada gulir berikutnya
    dirty = true;
    if (compact) set(false);
  }

  var rzTimer = 0;
  W.addEventListener('scroll', onScroll, { passive: true });
  W.addEventListener('resize', function () { clearTimeout(rzTimer); rzTimer = setTimeout(invalidate, 150); }, { passive: true });
  W.addEventListener('orientationchange', invalidate);

  // keyboard: Tab masuk ke header -> tampilkan semua kontrol
  D.addEventListener('focusin', function (e) {
    var h = getHdr();
    if (compact && h && h.contains(e.target)) set(false);
  });

  // tema terang/gelap, mode Pre-Trade (body.npv), dsb. mengubah tinggi header
  if (W.MutationObserver && D.body) {
    new MutationObserver(function () { dirty = true; }).observe(D.body, { attributes: true, attributeFilter: ['class'] });
  }
  // isi header berubah ukuran (nama panjang, tombol muncul/hilang) saat tidak mengecil -> ukur ulang
  if (W.ResizeObserver) {
    var roT = 0;
    var ro = new ResizeObserver(function () {
      dirty = true;
      if (compact) return;
      clearTimeout(roT);
      roT = setTimeout(function () { if (!compact && W.scrollY < TOP_AT + 1) measure(); }, 120);
    });
    var kick = function () {
      var h = getHdr();
      if (!h) return;
      Array.prototype.forEach.call(h.children, function (c) { ro.observe(c); });
    };
    kick();
  }
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(function () { dirty = true; });

  W.AdaptiveHeader = {
    expand: function () { set(false); },
    collapse: function () { set(true); },
    isCompact: function () { return compact; }
  };
})();
