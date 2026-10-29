/* v16.68 · Navigasi yang lebih tenang (bagian skrip, kecil, tanpa dependensi)
   Tidak mengubah logika navigasi (switchView, dock, sheet Menu). Hanya mendengarkan event 'viewchange' dan:
   - menampilkan judul halaman aktif (header HP, di bawah merek di desktop), memperbarui document.title, mengumumkannya ke pembaca layar
   - memberi satu transisi pendek saat pindah halaman dan menaruh scroll di atas seketika (bukan merayap lewat konten baru)
   - menandai tombol Pengaturan saat halamannya terbuka, memberi label pada dock, menandai header saat halaman digulir
   Semua gaya dikunci ke body.cn-on; hapus <script src="calm-nav.js"> dan tampilan kembali seperti v16.67. */
(function () {
  'use strict';
  var W = window, D = document;

  var VIEW_ID = {
    home: 'view-home', dashboard: 'view-dashboard', calendar: 'calendar-section', statistik: 'statistik-section',
    monthly: 'monthly-section', strategy: 'strategy-section', coach: 'coach-section', wrapped: 'wrapped-section',
    gallery: 'gallery-section', diary: 'diary-section', settings: 'settings-section', web: 'web-section'
  };
  var TXT = {
    id: { settings: 'Pengaturan', nav: 'Navigasi utama', edit: 'Edit profil' },
    en: { settings: 'Settings', nav: 'Main navigation', edit: 'Edit profile' },
    ms: { settings: 'Tetapan', nav: 'Navigasi utama', edit: 'Edit profil' },
    es: { settings: 'Ajustes', nav: 'Navegación principal', edit: 'Editar perfil' }
  };

  var $ = function (id) { return D.getElementById(id); };
  var lang = function () { var l; try { l = W.localStorage.getItem('journalLanguage'); } catch (e) {} return TXT[l] ? l : 'id'; };
  var t = function (k) { return TXT[lang()][k]; };

  var row, left, navRoot, nameEl, subEl, bar, h1, sub, brandT, live, gear, dock;
  var view = null, lastView = null, appName = 'Doa Ibu Journal', baseTitle = D.title, scrolled = false, tick = false;

  function labelOf(v) {
    if (v === 'settings') return t('settings');
    var b = $('nav-' + v);
    return b ? b.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function currentView() {
    var a = navRoot && navRoot.querySelector('.nav-pill-btn.active[data-view]');
    if (a) return a.getAttribute('data-view');
    var st = $('settings-section');
    return st && !st.classList.contains('hidden') ? 'settings' : null;
  }

  /* ---------- Bangun: satu blok judul di header, satu region pengumuman ---------- */
  function build() {
    row = $('header-row'); left = $('header-left-block'); navRoot = $('nav-scroll');
    if (!row || !left || !navRoot || $('cn-bar')) return false;
    nameEl = $('profile-name-header'); subEl = $('profile-sub-header'); gear = $('btn-settings');

    var meta = D.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (meta && meta.getAttribute('content')) appName = meta.getAttribute('content');

    bar = D.createElement('div'); bar.id = 'cn-bar'; bar.className = 'cn-bar';
    h1 = D.createElement('h1'); h1.id = 'cn-title'; h1.className = 'cn-title';
    sub = D.createElement('span'); sub.className = 'cn-sub'; sub.setAttribute('aria-hidden', 'true');
    bar.appendChild(h1); bar.appendChild(sub);
    left.parentNode.insertBefore(bar, left.nextSibling);

    var brand = D.querySelector('.app-brand');
    if (brand) { brandT = D.createElement('span'); brandT.className = 'cn-brand-title'; brandT.setAttribute('aria-hidden', 'true'); brand.appendChild(brandT); }

    live = D.createElement('div'); live.id = 'cn-live'; live.className = 'cn-sr';
    live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
    D.body.appendChild(live);

    // satu h1 per halaman: judul halaman. Nama profil tetap tampil, tapi bukan heading lagi.
    if (nameEl) nameEl.setAttribute('role', 'presentation');
    // nama di header HP disembunyikan secara visual; tombol profil tetap punya nama yang jelas
    syncName();
    if (W.MutationObserver) {
      var mo = new MutationObserver(syncName), opt = { childList: true, characterData: true, subtree: true };
      if (nameEl) mo.observe(nameEl, opt);
      if (subEl) mo.observe(subEl, opt);
      // bahasa diganti -> teks tab berubah -> judul ikut
      new MutationObserver(function () { render(false); }).observe(navRoot, { childList: true, characterData: true, subtree: true });
    }
    if (W.MutationObserver) new MutationObserver(syncDocTitle).observe(D.body, { attributes: true, attributeFilter: ['class'] });
    var sel = $('app-language');
    if (sel) sel.addEventListener('change', function () { setTimeout(function () { render(false); syncName(); labelDock(); }, 80); });

    bar.addEventListener('click', function () { W.scrollTo({ top: 0, behavior: 'smooth' }); });  // ketuk judul = kembali ke atas
    return true;
  }

  function syncName() {
    var n = nameEl ? (nameEl.textContent || '').trim() : '';
    if (sub && sub.textContent !== n) sub.textContent = n;
    var e = (subEl && (subEl.textContent || '').trim()) || t('edit');
    if (left) left.setAttribute('aria-label', n ? n + ' · ' + e : e);
  }

  function labelDock() {
    dock = dock && dock.isConnected ? dock : D.querySelector('.npv-dock');
    if (dock && dock.getAttribute('aria-label') !== t('nav')) dock.setAttribute('aria-label', t('nav'));
  }

  /* ---------- Judul ---------- */
  // judul dokumen = halaman aktif saat sudah login; judul awal saat di landing/login (mis. setelah logout)
  function syncDocTitle() {
    var t = D.body.classList.contains('authed') && view ? labelOf(view) : '';
    var want = t ? t + ' · ' + appName : baseTitle;
    if (D.title !== want) D.title = want;
  }
  function swap(el) {
    if (!el) return;
    el.classList.remove('cn-swap'); void el.offsetWidth; el.classList.add('cn-swap');
    clearTimeout(el.__cnT); el.__cnT = setTimeout(function () { el.classList.remove('cn-swap'); }, 260);
  }

  function render(announce) {
    if (!h1 || !view) return;
    var title = labelOf(view);
    if (!title) return;
    if (h1.textContent !== title) {
      h1.textContent = title;
      if (brandT) brandT.textContent = title;
      if (announce) { swap(h1); swap(brandT); live.textContent = title; }
    }
    if (gear) {
      if (view === 'settings') { if (gear.getAttribute('aria-current') !== 'page') gear.setAttribute('aria-current', 'page'); }
      else if (gear.hasAttribute('aria-current')) gear.removeAttribute('aria-current');
    }
    syncDocTitle();
    labelDock();
  }

  /* ---------- Pindah halaman: satu transisi, scroll di atas ---------- */
  function settle(el) {
    // 1. batalkan animasi slide (WAAPI) dari premium.js; animasi CSS sudah dinetralkan oleh calm-nav.css
    try {
      el.getAnimations().forEach(function (a) { if (!('animationName' in a) && !('transitionProperty' in a)) a.cancel(); });
    } catch (e) {}
    // 2. scroll ke atas seketika. Sebelumnya dua scrollTo halus berebut dan halaman baru terlihat "terseret" naik.
    //    Handler dock/sheet memanggil scrollTo halus sesudah ini; di posisi 0 itu tidak berbuat apa-apa.
    if ((W.pageYOffset || D.documentElement.scrollTop || 0) > 0) W.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // 3. satu transisi pendek
    el.classList.remove('cn-enter'); void el.offsetWidth; el.classList.add('cn-enter');
    clearTimeout(el.__cnT); el.__cnT = setTimeout(function () { el.classList.remove('cn-enter'); }, 280);
  }

  W.addEventListener('viewchange', function (ev) {
    var v = ev && ev.detail && ev.detail.view;
    if (!v || !VIEW_ID[v] || !h1) return;
    var changed = v !== lastView;
    lastView = view = v;
    render(changed);
    if (!changed) return;            // switchView dipanggil ulang untuk halaman yang sama (mis. setelah simpan): jangan ganggu
    var el = $(VIEW_ID[v]);
    if (el) settle(el);
  });

  /* ---------- Header: tanda "digulir" (kaca + garis tipis baru muncul setelah konten lewat di bawahnya) ---------- */
  function onScroll() {
    tick = false;
    var s = (W.pageYOffset || D.documentElement.scrollTop || 0) > 6;
    if (s !== scrolled) { scrolled = s; D.body.classList.toggle('cn-scrolled', s); }
  }
  W.addEventListener('scroll', function () { if (!tick) { tick = true; W.requestAnimationFrame(onScroll); } }, { passive: true });

  function start() {
    if (!D.body || !build()) return;
    view = lastView = currentView() || 'home';
    D.body.classList.add('cn-on');
    render(false);
    onScroll();
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
