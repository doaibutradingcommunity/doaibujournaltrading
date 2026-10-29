/* v16.66 · Ambient Adaptive UI — skrip konteks (kecil, tanpa dependensi)
   Memasang SATU atribut pada <body>: data-amb = auth | glow | calm | analytic.
   Seluruh tampilannya ada di ambient-glass.css; skrip ini tidak mengubah logika aplikasi.

     auth       belum login (landing / login)            → tidak disentuh CSS
     calm       form journal terbuka, Diary, Pengaturan
     analytic   Kalender, Statistik, Review Bulanan, Strategy, AI Coach
     glow       Beranda, Journal, Wrapped, Galeri, Tentang (dan halaman tak dikenal)

   Sumber kebenaran: event 'viewchange' (detail.view) dari switchView, tombol nav aktif sebagai cadangan
   saat muat awal, class body.authed, dan class #form-section (modal form journal, bisa dibuka dari halaman mana pun). */
(function () {
  'use strict';
  var W = window, D = document;

  var MAP = {
    home: 'glow', dashboard: 'glow', wrapped: 'glow', gallery: 'glow', web: 'glow',
    calendar: 'analytic', statistik: 'analytic', monthly: 'analytic', strategy: 'analytic', coach: 'analytic',
    diary: 'calm', settings: 'calm'
  };
  var view = '';

  function currentView() {
    if (view) return view;
    var a = D.querySelector('.nav-pill-btn.active[data-view]');
    return a ? a.getAttribute('data-view') : 'home';
  }
  function formOpen() {
    var f = D.getElementById('form-section');
    return !!f && !f.classList.contains('hidden');
  }
  function context() {
    var b = D.body;
    if (!b || !b.classList.contains('authed')) return 'auth';
    if (formOpen()) return 'calm';
    return MAP[currentView()] || 'glow';
  }
  function apply() {
    var b = D.body; if (!b) return;
    var c = context();
    if (b.getAttribute('data-amb') !== c) b.setAttribute('data-amb', c);
  }

  W.addEventListener('viewchange', function (ev) {
    view = (ev && ev.detail && ev.detail.view) || view;
    apply();
  });

  function start() {
    apply();
    if (!W.MutationObserver || !D.body) return;
    // login / logout (login baru selalu mulai dari Beranda; nav aktif jadi acuan saat view belum diketahui)
    var was = D.body.classList.contains('authed');
    new MutationObserver(function () {
      var now = D.body.classList.contains('authed');
      if (now && !was) view = '';
      was = now;
      apply();
    }).observe(D.body, { attributes: true, attributeFilter: ['class'] });
    // modal form journal membuka / menutup
    var f = D.getElementById('form-section');
    if (f) new MutationObserver(apply).observe(f, { attributes: true, attributeFilter: ['class'] });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
