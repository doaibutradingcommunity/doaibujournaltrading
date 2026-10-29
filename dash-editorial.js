/* v16.88 — Dashboard dengan komposisi editorial.
   Lapisan tampilan: tidak menulis data, tidak mengubah statistik. Angka dibaca dari V16Stats lewat unit yang sama dengan kartu
   "Fokus Hari Ini" lama (akun yang sedang dibuka; filter tanggal tidak berlaku, seperti sebelumnya).
   Dikunci ke html.ed-on. Membatalkan: hapus <link dash-editorial.css> dan <script dash-editorial.js> dari index.html;
   kait di todayHero() / secPanel() / drawEquity() hanya aktif bila window.DoaDashEditorial ada, jadi tampilan kembali persis v16.86. */
(function () {
  'use strict';
  var html = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function monthName(ds) {
    var m = /^(\d{4})-(\d{2})/.exec(ds || ''); if (!m) return '';
    try { return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(+m[1], +m[2] - 1, 1)); } catch (e) { return ds.slice(0, 7); }
  }
  function plus() { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'; }
  /* label tombol mengikuti bahasa yang sudah dipilih (editorial.js menulisnya ke tombol melayang) */
  function newLabel() { var f = $('btn-new-journal-fab'); return (f && f.getAttribute('data-label')) || 'Journal Baru'; }

  /* ctx dari todayHero(): ds, dateLabel, state (A|B|C), pill [tone,teks], todo, hasJ, t (hitungan hari ini), pl,
     units (unit akun aktif), V (V16Stats), money, sign, streak {n, kind} */
  function masthead(c) {
    var V = c.V, ds = c.ds, ym = String(ds).slice(0, 7);
    var mu = c.units.filter(function (x) { return String(x.date).slice(0, 7) === ym; });
    var has = mu.length > 0, ms = has ? V.calc(mu) : null, md = has ? V.dayTotals(mu).length : 0;
    var tPl = c.hasJ ? c.money(c.pl, true) : '—', tCls = c.hasJ ? c.sign(c.pl) : 'zero';
    var mPl = has ? c.money(ms.net, true) : '—', mCls = has ? c.sign(ms.net) : 'zero';
    var tMeta = c.hasJ ? '<span>' + c.t.trades + ' trade</span><span>' + c.t.wins + ' win</span><span>' + c.t.losses + ' loss</span>' : '<span>Belum ada trade hari ini</span>';
    var mMeta = has ? '<span>' + md + ' hari trading</span><span>' + ms.trades + ' trade</span>' + (ms.trades ? '<span>win rate ' + esc(V.fmt(ms.winRate, 0, '%')) + '</span>' : '') : '<span>Belum ada trade bulan ini</span>';
    var sk = c.streak && c.streak.n ? '<p class="de-streak"><b>' + c.streak.n + ' hari</b> ' + (c.streak.kind === 'pos' ? 'profit beruntun' : 'loss beruntun') + '</p>' : '';
    var steps = '<ol class="v5-steps" aria-label="Progres hari ini"><li class="' + (c.hasJ ? 'done' : 'now') + '"><i aria-hidden="true">' + (c.hasJ ? '✓' : '1') + '</i>Journal</li><li class="' +
      (c.state === 'C' ? 'done' : c.hasJ ? 'now' : '') + '"><i aria-hidden="true">' + (c.state === 'C' ? '✓' : '2') + '</i>Review</li></ol>';
    var rev = c.state === 'B' ? '<button type="button" class="de-link" data-act="review">' + (c.reviewStarted ? 'Lanjutkan review' : 'Selesaikan review') + '</button>' : '';
    return '<section class="de-mast" data-state="' + c.state + '" aria-label="Fokus hari ini dan bulan ini">' +
      '<div class="de-top"><span class="de-date">' + esc(c.dateLabel) + '</span><span class="v5-pill ' + c.pill[0] + '" role="status">' + esc(c.pill[1]) + '</span></div>' +
      '<div class="de-focus">' +
        '<div class="de-today"><p class="de-label">P/L hari ini</p><span class="de-fig de-lead ' + tCls + '" data-fit="30">' + esc(tPl) + '</span><p class="de-meta">' + tMeta + '</p></div>' +
        '<div class="de-month"><p class="de-label">P/L bulan ini <small>' + esc(monthName(ds)) + '</small></p><span class="de-fig de-second ' + mCls + '" data-fit="22">' + esc(mPl) + '</span><p class="de-meta">' + mMeta + '</p>' + sk + '</div>' +
      '</div>' +
      '<div class="de-foot"><div class="de-do"><p>' + esc(c.todo) + '</p>' + steps + '</div>' +
        '<div class="de-act">' + rev + '<button type="button" class="de-new" data-act="add">' + plus() + '<span>' + esc(newLabel()) + '</span></button></div></div>' +
      '</section>';
  }

  /* tinggi grafik equity: sebelumnya 132 / 168 px (v16.72), terlalu pendek untuk area yang jadi pusat kedua halaman */
  function eqHeight(w) { return w < 520 ? 188 : w > 600 ? 300 : 240; }

  /* ---------- satu aksi utama: tombol melayang menyingkir selama tombol di masthead terlihat ---------- */
  var io = null, watched = null, body = document.body;
  function setSeen(on) { if (body) body.classList.toggle('de-cta-on', !!on); }
  function watch() {
    var host = $('v165-dash'); if (!host) return;
    var el = host.querySelector('.de-new');
    if (el === watched) return;
    if (io && watched) io.unobserve(watched);
    watched = el;
    if (!el) { setSeen(false); return; }
    if (!('IntersectionObserver' in window)) return; // tanpa observer: tombol melayang tetap ada, tidak ada yang hilang
    if (!io) io = new IntersectionObserver(function (es) { es.forEach(function (e) { setSeen(e.isIntersecting && e.intersectionRatio >= 0.6); }); },
      { threshold: [0, 0.6, 1], rootMargin: '-64px 0px -96px 0px' }); // batas atas = header, bawah = dock + tombol melayang
    io.observe(el);
  }
  function init() {
    body = document.body;
    var host = $('v165-dash'); if (!host) return;
    new MutationObserver(watch).observe(host, { childList: true, subtree: true });
    window.addEventListener('viewchange', function () { setTimeout(watch, 0); });
    watch();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.DoaDashEditorial = { masthead: masthead, eqHeight: eqHeight };
})();
