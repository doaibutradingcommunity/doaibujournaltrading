/* v16.72 — Hierarki editorial.
   Lapisan tampilan: tidak menulis data, tidak mengubah statistik. Angka dibaca dari V16Stats (sumber yang sama dengan Dashboard).
   Dikunci ke html.ed-on. Membatalkan: hapus <link editorial.css> dan <script editorial.js> dari index.html. */
(function () {
  'use strict';
  var html = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };

  var S = {
    id: {
      today: 'Hari ini', month: 'Bulan ini', noToday: 'Belum ada journal hari ini', todayMeta: '{j} journal, {t} trade',
      noMonth: 'Belum ada trade bulan ini', monthMeta: 'Dari {d} hari trading', thatDay: 'Hari itu {v}',
      win: 'Win rate', pf: 'Profit factor', trades: 'Trade', retry: 'Muat ulang',
      spark: 'Grafik P/L kumulatif bulan ini. Sentuh atau geser untuk melihat nilai tiap hari.'
    },
    en: {
      today: 'Today', month: 'This month', noToday: 'No journal logged today', todayMeta: '{j} journal(s), {t} trade(s)',
      noMonth: 'No trades this month', monthMeta: 'Across {d} trading day(s)', thatDay: 'That day {v}',
      win: 'Win rate', pf: 'Profit factor', trades: 'Trades', retry: 'Reload',
      spark: 'Cumulative P/L this month. Touch or drag to see each day.'
    },
    fab: { id: 'Journal Baru', en: 'New Journal', ms: 'Journal Baru', es: 'Nuevo Journal' }
  };
  function tx(L, k, o) { var s = (S[L] || S.id)[k]; if (s == null) s = S.id[k] || k; if (o) for (var p in o) s = s.split('{' + p + '}').join(o[p]); return s; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function money(v) { try { if (window.Money) return Money.format(v, { plus: true }); } catch (e) {} return (v < 0 ? '-' : '+') + '$' + Math.abs(v).toFixed(2); }
  function tone(v) { return v > 0 ? 'hm-pos' : v < 0 ? 'hm-neg' : ''; }
  function shortDate(d, L) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); if (!m) return d || '';
    try { return new Intl.DateTimeFormat(L === 'en' ? 'en-US' : 'id-ID', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(+m[1], +m[2] - 1, +m[3])); } catch (e) { return d; }
  }

  /* ---------- data: V16Stats lebih dulu (sama dengan Dashboard), hitungan sederhana bila tidak tersedia ---------- */
  function figures(s, H) {
    var out = { todayJ: s.journals.filter(function (j) { return j.date === s.today; }).length, today: null, month: null, pts: [] };
    var V = window.V16Stats;
    try {
      var u = V.normalize(s.journals), mu = u.filter(function (x) { return String(x.date).slice(0, 7) === s.ym; });
      var tu = mu.filter(function (x) { return x.date === s.today; });
      var ms = V.calc(mu), ts = V.calc(tu);
      out.today = { net: ts.net, trades: ts.trades };
      out.month = { net: ms.net, winRate: ms.winRate, pf: ms.profitFactor, trades: ms.trades, days: V.dayTotals(mu).length, has: mu.length > 0, fmt: V.fmt };
      out.pts = V.equityByDay(mu).points || [];
      return out;
    } catch (e) { /* jatuh ke hitungan sederhana */ }
    var m = H.month(s), pl = 0;
    s.journals.forEach(function (j) { if (j.date === s.today) pl += (j.pl || 0); });
    out.today = { net: pl, trades: 0 };
    out.month = { net: m.pl, winRate: m.winRate, pf: null, trades: m.count, days: m.count, has: m.count > 0, fmt: null };
    return out;
  }

  /* ---------- sparkline P/L kumulatif bulan ini ---------- */
  function spark(pts, L) {
    if (!pts || pts.length < 2) return '';
    var W = 320, Hh = 72, pad = 6, n = pts.length;
    var vals = pts.map(function (p) { return p.cum; }).concat([0]), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (hi === lo) { hi += 1; lo -= 1; }
    var X = function (i) { return pad + i / (n - 1) * (W - 2 * pad); }, Y = function (v) { return pad + (hi - v) / (hi - lo) * (Hh - 2 * pad); };
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.cum).toFixed(1); }).join(' ');
    var y0 = Y(0).toFixed(1), area = line + ' L' + X(n - 1).toFixed(1) + ' ' + y0 + ' L' + X(0).toFixed(1) + ' ' + y0 + ' Z';
    var up = pts[n - 1].cum >= 0;
    var data = pts.map(function (p, i) { return [p.date, p.pl, p.cum, +(X(i) / W * 100).toFixed(2), +(Y(p.cum) / Hh * 100).toFixed(2)]; });
    var last = data[n - 1];
    return '<div class="ed-spark ' + (up ? 'up' : 'down') + '" tabindex="0" role="group" aria-label="' + esc(tx(L, 'spark')) + '" data-pts="' + esc(JSON.stringify(data)) + '">' +
      '<svg viewBox="0 0 ' + W + ' ' + Hh + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      '<line class="ed-sp-zero" x1="0" x2="' + W + '" y1="' + y0 + '" y2="' + y0 + '"/><path class="ed-sp-area" d="' + area + '"/><path class="ed-sp-path" d="' + line + '"/></svg>' +
      '<i class="ed-sp-line" style="left:' + last[3] + '%"></i><i class="ed-sp-dot" style="left:' + last[3] + '%;top:' + last[4] + '%"></i>' +
      '<span class="ed-sr" aria-live="polite"></span></div>';
  }

  /* ---------- hero Beranda ---------- */
  function hero(s, H) {
    var L = s.lang === 'en' ? 'en' : 'id', name = s.name || H.T('trader', 0, L), dt = '';
    try { dt = new Intl.DateTimeFormat(L === 'en' ? 'en-US' : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(s.now); } catch (e) { dt = s.today; }
    var h = '<header class="hm-card hm-hero ed-hero"><div class="ed-top"><span class="ed-date">' + esc(dt) + '</span>' +
      '<h2 id="hm-title" class="ed-greet">' + esc(H.greet(s.hour, L) + ', ' + name) + '</h2></div>';
    if (s.loaded === false) {
      return h + '<p class="ed-meta">' + esc(H.T('subErr', 0, L)) + '</p><div class="ed-next"><span></span><button type="button" class="ed-next-b" data-hm-act="reload">' + esc(tx(L, 'retry')) + '</button></div></header>';
    }
    if (!s.loaded) {
      return h + '<div class="ed-skel" aria-hidden="true"><span class="hm-sk" style="width:34%;height:14px"></span><span class="hm-sk" style="width:62%;height:56px;margin-top:12px;border-radius:12px"></span><span class="hm-sk" style="width:46%;height:30px;margin-top:28px;border-radius:12px"></span></div></header>';
    }
    var f = figures(s, H), m = f.month, hasToday = f.todayJ > 0;
    var todayFig = hasToday ? '<p class="ed-fig ed-lead ' + tone(f.today.net) + '" data-money>' + esc(money(f.today.net)) + '</p>' : '<p class="ed-fig ed-lead ed-nil">—</p>';
    var todayMeta = hasToday ? tx(L, 'todayMeta', { j: f.todayJ, t: Math.max(f.today.trades, f.todayJ) }) : tx(L, 'noToday');
    var monthFig = m.has ? '<p class="ed-fig ed-second ' + tone(m.net) + '" data-money id="ed-mfig">' + esc(money(m.net)) + '</p>' : '<p class="ed-fig ed-second ed-nil" id="ed-mfig">—</p>';
    var monthSub = m.has ? tx(L, 'monthMeta', { d: m.days }) : tx(L, 'noMonth');
    var wr = m.winRate == null ? '—' : Math.round(m.winRate) + '%';
    var pf = m.pf == null ? '—' : (m.fmt ? m.fmt(m.pf, 2) : m.pf.toFixed(2));
    var nx = H.next(s);

    h += '<div class="ed-focus">' +
      '<section class="ed-today" aria-labelledby="ed-tl"><p class="ed-label" id="ed-tl">' + esc(tx(L, 'today')) + '</p>' + todayFig + '<p class="ed-meta">' + esc(todayMeta) + '</p></section>' +
      '<section class="ed-month" aria-labelledby="ed-ml"><p class="ed-label" id="ed-ml" data-orig="' + esc(tx(L, 'month')) + '">' + esc(tx(L, 'month')) + '</p>' + monthFig +
      '<p class="ed-meta" id="ed-msub" data-orig="' + esc(monthSub) + '">' + esc(monthSub) + '</p>' + spark(f.pts, L) +
      '<dl class="ed-sec"><div><dt>' + esc(tx(L, 'win')) + '</dt><dd>' + esc(wr) + '</dd></div><div><dt>' + esc(tx(L, 'pf')) + '</dt><dd>' + esc(pf) + '</dd></div>' +
      '<div><dt>' + esc(tx(L, 'trades')) + '</dt><dd>' + (m.has ? m.trades : '—') + '</dd></div></dl></section></div>' +
      '<div class="ed-next" role="group" aria-label="' + esc(H.T('nextEyebrow', 0, L)) + '"><span class="ed-next-t">' + esc(nx.t) + '</span>' +
      '<button type="button" class="ed-next-b" data-hm-act="' + esc(nx.act) + '">' + esc(nx.c) + '</button></div></header>';
    return h;
  }

  /* ---------- sentuh / geser sparkline: angka bulan ini berganti sementara menjadi nilai hari yang disentuh ---------- */
  function bind() {
    var home = $('view-home'); if (!home || home.__ed) return; home.__ed = 1;
    var active = null, timer = null;
    function parts(sp) { var m = sp.closest('.ed-month'); return m ? { lab: m.querySelector('#ed-ml'), fig: m.querySelector('#ed-mfig'), sub: m.querySelector('#ed-msub'), line: sp.querySelector('.ed-sp-line'), dot: sp.querySelector('.ed-sp-dot'), sr: sp.querySelector('.ed-sr') } : null; }
    function data(sp) { if (!sp.__d) { try { sp.__d = JSON.parse(sp.getAttribute('data-pts')); } catch (e) { sp.__d = []; } } return sp.__d; }
    function lang() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return (l === 'en' || l === 'es') ? 'en' : 'id'; }
    function show(sp, k, announce) {
      var d = data(sp), p = d[Math.max(0, Math.min(d.length - 1, k))], q = parts(sp); if (!p || !q) return;
      sp.__k = d.indexOf(p); sp.classList.add('scrub'); var L = lang();
      q.line.style.left = p[3] + '%'; q.dot.style.left = p[3] + '%'; q.dot.style.top = p[4] + '%';
      q.lab.textContent = shortDate(p[0], L); q.fig.textContent = money(p[2]); q.fig.className = 'ed-fig ed-second ' + tone(p[2]);
      q.sub.textContent = tx(L, 'thatDay', { v: money(p[1]) });
      try { if (window.Money && Money.fit) Money.fit(q.fig); } catch (e) {}
      if (announce && q.sr) q.sr.textContent = shortDate(p[0], L) + ', ' + money(p[2]) + ', ' + tx(L, 'thatDay', { v: money(p[1]) });
    }
    function reset(sp) {
      var q = parts(sp), d = data(sp); sp.classList.remove('scrub'); sp.__k = d.length - 1; if (!q || !d.length) return;
      var last = d[d.length - 1];
      q.line.style.left = last[3] + '%'; q.dot.style.left = last[3] + '%'; q.dot.style.top = last[4] + '%';
      q.lab.textContent = q.lab.getAttribute('data-orig'); q.sub.textContent = q.sub.getAttribute('data-orig');
      q.fig.textContent = money(last[2]); q.fig.className = 'ed-fig ed-second ' + tone(last[2]);
      try { if (window.Money && Money.fit) Money.fit(q.fig); } catch (e) {}
    }
    function at(sp, ev) { var r = sp.getBoundingClientRect(), d = data(sp); if (!r.width || !d.length) return; show(sp, Math.round((ev.clientX - r.left) / r.width * (d.length - 1))); }
    home.addEventListener('pointerdown', function (e) { var sp = e.target.closest && e.target.closest('.ed-spark'); if (!sp) return; clearTimeout(timer); active = sp; at(sp, e); });
    home.addEventListener('pointermove', function (e) { if (active && (e.pointerType !== 'mouse' || e.buttons)) at(active, e); else { var sp = e.pointerType === 'mouse' && e.target.closest && e.target.closest('.ed-spark'); if (sp) { clearTimeout(timer); at(sp, e); } } });
    function end(e) { var sp = active || (e.target.closest && e.target.closest('.ed-spark')); active = null; if (!sp) return; clearTimeout(timer); timer = setTimeout(function () { reset(sp); }, e.pointerType === 'mouse' ? 0 : 1400); }
    home.addEventListener('pointerup', end); home.addEventListener('pointercancel', end);
    home.addEventListener('pointerout', function (e) { if (e.pointerType === 'mouse' && e.target.closest && e.target.closest('.ed-spark') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.ed-spark'))) end(e); });
    home.addEventListener('keydown', function (e) {
      var sp = e.target.closest && e.target.closest('.ed-spark'); if (!sp) return; var d = data(sp), k = sp.__k == null ? d.length - 1 : sp.__k;
      var n = e.key === 'ArrowLeft' ? k - 1 : e.key === 'ArrowRight' ? k + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? d.length - 1 : null;
      if (n === null) { if (e.key === 'Escape') reset(sp); return; } e.preventDefault(); show(sp, n, true);
    });
    home.addEventListener('focusout', function (e) { var sp = e.target.closest && e.target.closest('.ed-spark'); if (sp) reset(sp); });
  }

  /* ---------- tombol tambah journal: label mengikuti bahasa ---------- */
  function fabLabel() {
    var b = $('btn-new-journal-fab'); if (!b) return;
    var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {}
    var t = S.fab[l] || S.fab.id;
    try { if (typeof I18N !== 'undefined' && I18N[l] && I18N[l].newJournal) t = I18N[l].newJournal; } catch (e) {}
    b.setAttribute('data-label', t); b.setAttribute('aria-label', t); b.setAttribute('title', t);
  }

  window.DoaEditorial = { hero: hero, spark: spark, _figures: figures };
  html.classList.add('ed-on');
  fabLabel(); bind();
  var sel = $('app-language'); if (sel) sel.addEventListener('change', function () { setTimeout(fabLabel, 120); });
  window.addEventListener('viewchange', fabLabel);
  try { if (window.DoaHome && DoaHome.render) DoaHome.render(); } catch (e) { console.warn('editorial', e); }
})();
