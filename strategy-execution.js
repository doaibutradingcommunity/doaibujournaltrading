/* Strategy vs Execution (v16.38)
   Membandingkan ATURAN strategi (checklist Playbook) dengan PELAKSANAAN di journal.
   Memisahkan kualitas keputusan (patuh / melanggar rule) dari hasil (R).

   Definisi (sama persis dengan scripts/strategy_vs_execution.py):
   - Sampel memenuhi syarat = journal dengan TEPAT SATU strategy, checklist terisi (total > 0), dan rMultiple tercatat.
     Dikeluarkan: tanpa strategy, campuran >1 strategy, tanpa checklist, tanpa R. Jumlah tiap alasan dilaporkan.
   - rMultiple di journal = total R untuk hari itu (journal gabungan menjumlahkan R). Expectancy per trade = total R / jumlah trade.
   - PATUH = semua rule WAJIB tercentang. Bila strategy tidak punya rule wajib, PATUH = kepatuhan >= target strategy (default 80%).
   - Menang = R > 0. R <= 0 dihitung "tidak menang" (break-even ikut di sini).
   - Angka ditampilkan hanya bila sampel cukup (>= 5 hari per kelompok, >= 10 trade untuk expectancy); selain itu "Data belum cukup".
   Murni statistik deskriptif atas journal sendiri: bukan sinyal entry/exit dan bukan bukti sebab-akibat. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StrategyExec = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var MIN_DAYS = 5, MIN_TRADES = 10, DEF_TARGET = 80;

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function dateOf(j) { return String(j.date || j.id || ''); }
  function entriesOf(j) {
    if (!j) return [];
    if (Array.isArray(j.strategyLog) && j.strategyLog.length) return j.strategyLog.filter(function (e) { return e && e.id; });
    if (j.strategyId) return [{ id: j.strategyId, name: j.strategyName || '', checked: 0, total: 0, reqMissed: 0, items: [] }];
    return [];
  }
  function blank() { return { days: 0, trades: 0, sumR: 0, wins: 0 }; }
  function fin(g) {
    g.avgR = g.days ? g.sumR / g.days : null;
    g.expR = g.trades ? g.sumR / g.trades : null;
    g.wr = g.days ? g.wins / g.days : null;
    g.okDays = g.days >= MIN_DAYS; g.okTrades = g.trades >= MIN_TRADES;
    return g;
  }

  /* journals: array of journal docs; strategies: [{id,name,targetComp}]; opts: {from:'YYYY-MM-DD'|null} */
  function compute(journals, strategies, opts) {
    opts = opts || {};
    var from = opts.from || null, tgt = {}, nm = {};
    (strategies || []).forEach(function (s) { tgt[s.id] = isNum(s.targetComp) ? s.targetComp : DEF_TARGET; nm[s.id] = s.name; });
    var out = { total: 0, eligible: 0, trades: 0, excl: { noStrategy: 0, mixed: 0, noChecklist: 0, noR: 0 }, rows: [], adh: blank(), br: blank(),
      quad: { adhWin: { d: 0, r: 0 }, adhLoss: { d: 0, r: 0 }, brWin: { d: 0, r: 0 }, brLoss: { d: 0, r: 0 } }, rules: [], per: [] };
    var ruleMap = {}, perMap = {};
    (journals || []).forEach(function (j) {
      var d = dateOf(j); if (from && d < from) return;
      out.total++;
      var ent = entriesOf(j);
      if (!ent.length) { out.excl.noStrategy++; return; }
      var ids = {}; ent.forEach(function (e) { ids[e.id] = 1; });
      if (Object.keys(ids).length > 1) { out.excl.mixed++; return; }
      var withData = ent.filter(function (e) { return e.total > 0; });
      if (!withData.length) { out.excl.noChecklist++; return; }
      if (!isNum(j.rMultiple)) { out.excl.noR++; return; }
      var sid = ent[0].id, n = (isNum(j.trades) && j.trades > 0) ? j.trades : 1, r = j.rMultiple;
      var comp = withData.reduce(function (a, e) { return a + e.checked / e.total; }, 0) / withData.length;
      var missed = [];
      var patuh = withData.every(function (e) {
        var items = Array.isArray(e.items) ? e.items : [], req = items.filter(function (it) { return it && it.required; });
        req.forEach(function (it) { if (!it.checked) missed.push(it.text || ''); });
        if (req.length) return req.every(function (it) { return !!it.checked; });
        if (!items.length) return !(e.reqMissed > 0); /* data lama tanpa rincian item */
        return e.checked / e.total * 100 >= tgt[sid];   /* tidak ada rule wajib: pakai target kepatuhan */
      });
      var win = r > 0, g = patuh ? out.adh : out.br;
      g.days++; g.trades += n; g.sumR += r; if (win) g.wins++;
      var q = out.quad[(patuh ? 'adh' : 'br') + (win ? 'Win' : 'Loss')]; q.d++; q.r += r;
      out.eligible++; out.trades += n;
      out.rows.push({ date: d, sid: sid, trades: n, r: r, comp: comp, patuh: patuh });
      var p = perMap[sid] || (perMap[sid] = { sid: sid, name: nm[sid] || (ent[0].name || ''), adh: blank(), br: blank(), compSum: 0 });
      var pg = patuh ? p.adh : p.br; pg.days++; pg.trades += n; pg.sumR += r; if (win) pg.wins++; p.compSum += comp;
      withData.forEach(function (e) {
        (Array.isArray(e.items) ? e.items : []).forEach(function (it) {
          if (!it || !it.id || !it.required) return;
          var k = sid + '|' + it.id, x = ruleMap[k] || (ruleMap[k] = { sid: sid, id: it.id, text: it.text || '', seen: 0, missed: 0, rMissed: 0 });
          x.seen++; if (!it.checked) { x.missed++; x.rMissed += r; }
        });
      });
    });
    fin(out.adh); fin(out.br);
    out.adhRate = out.eligible ? out.adh.days / out.eligible : null;
    out.sumR = out.adh.sumR + out.br.sumR;
    out.expR = out.trades ? out.sumR / out.trades : null;
    out.gapDay = (out.adh.okDays && out.br.okDays) ? out.adh.avgR - out.br.avgR : null;
    out.gapTrade = (out.adh.okTrades && out.br.okTrades) ? out.adh.expR - out.br.expR : null;
    var lossTot = out.quad.adhLoss.r + out.quad.brLoss.r;
    out.avoidableShare = (out.quad.brLoss.r < 0 && lossTot < 0) ? out.quad.brLoss.r / lossTot : null;
    out.rules = Object.keys(ruleMap).map(function (k) { return ruleMap[k]; }).filter(function (x) { return x.missed > 0 && x.seen >= 3; })
      .sort(function (a, b) { return (b.missed / b.seen) - (a.missed / a.seen) || b.missed - a.missed; }).slice(0, 5);
    out.per = Object.keys(perMap).map(function (k) { var p = perMap[k]; fin(p.adh); fin(p.br); p.days = p.adh.days + p.br.days; p.adhRate = p.adh.days / p.days; p.avgComp = p.compSum / p.days; p.sumR = p.adh.sumR + p.br.sumR; return p; })
      .sort(function (a, b) { return b.days - a.days; });
    out.enough = out.eligible >= MIN_DAYS;
    return out;
  }

  /* ---------- Export ---------- */
  function plain(v) {
    if (v && typeof v.toDate === 'function') { try { return v.toDate().toISOString(); } catch (e) { return null; } }
    if (Array.isArray(v)) return v.map(plain);
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function (k) { o[k] = plain(v[k]); }); return o; }
    return v;
  }
  function buildExport(journals, strategies) {
    return { app: 'doa-ibu-journal', schema: 1, exportedAt: new Date().toISOString(),
      strategies: (strategies || []).map(function (s) { return { id: s.id, name: s.name, targetComp: s.targetComp, maxRisk: s.maxRisk || null, minRR: s.minRR || null,
        checklist: (s.checklist || []).map(function (r) { return { id: r.id, text: r.text, required: !!r.required, group: r.group }; }) }; }),
      journals: (journals || []).map(function (j) { var o = plain(j); delete o.charts; return o; }) };
  }
  function cell(v) {
    if (v === null || v === undefined) return '';
    var s = Array.isArray(v) ? v.join('; ') : String(v);
    if (/^[=+\-@\t\r]/.test(s) && isNaN(Number(s))) s = "'" + s; /* cegah formula injection di Excel/Sheets */
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  var CSV_COLS = ['date', 'pair', 'session', 'trades', 'wins', 'be', 'pl', 'rMultiple', 'riskPct', 'rating', 'strategy', 'checked', 'total', 'reqMissed', 'missedRequired', 'emotions', 'tags'];
  function buildCsv(journals) {
    var rows = [CSV_COLS.join(',')];
    (journals || []).forEach(function (j) {
      var ent = entriesOf(j), e = ent[ent.length - 1] || {}, items = Array.isArray(e.items) ? e.items : [];
      var miss = items.filter(function (it) { return it && it.required && !it.checked; }).map(function (it) { return it.text; });
      var rec = { date: dateOf(j), pair: j.pair, session: j.session, trades: j.trades, wins: j.wins, be: j.be, pl: j.pl, rMultiple: j.rMultiple, riskPct: j.riskPct, rating: j.rating,
        strategy: e.name || '', checked: e.checked, total: e.total, reqMissed: e.reqMissed, missedRequired: miss, emotions: j.emotions, tags: j.tags };
      rows.push(CSV_COLS.map(function (c) { return cell(rec[c]); }).join(','));
    });
    return '﻿' + rows.join('\r\n');
  }

  /* ---------- UI ---------- */
  var T = {
    id: { title: 'Strategy vs Execution', sub: 'Aturan strategimu vs yang benar-benar dijalankan. Kualitas keputusan dipisah dari hasil satu trade.',
      all: 'Semua', d90: '90 hari', d30: '30 hari', sample: 'Sampel layak', adh: 'Hari patuh', rtot: 'Total R', exp: 'Expectancy/trade',
      cmp: 'Patuh vs melanggar rule', patuh: 'Patuh', br: 'Melanggar', days: 'hari', trades: 'trade', avgR: 'rata-rata R/hari', wr: 'hari menang', noEnough: 'Data belum cukup',
      quad: 'Keputusan x hasil', qAW: 'Patuh · menang', qAL: 'Patuh · rugi', qBW: 'Melanggar · menang', qBL: 'Melanggar · rugi',
      qAWd: 'Proses benar, hasil bagus', qALd: 'Varians normal, bukan kesalahan', qBWd: 'Beruntung, jangan ditiru', qBLd: 'Kesalahan eksekusi yang bisa dihindari',
      read: 'Cara membaca', miss: 'Rule wajib yang paling sering terlewat', missNone: 'Belum ada rule wajib yang terlewat (minimal 3 kali dicek).',
      per: 'Per strategy', excl: 'Tidak dihitung', exNo: 'tanpa strategy', exMix: 'campuran strategy', exCl: 'tanpa checklist', exR: 'tanpa R',
      of: 'dari', journals: 'journal', needMore: 'Butuh minimal 5 journal dengan strategy, checklist, dan R terisi agar perbandingan muncul.',
      expJson: 'Ekspor JSON', expCsv: 'Ekspor CSV', note: 'Statistik deskriptif atas journalmu sendiri, bukan sinyal trading dan bukan bukti sebab-akibat. Patuh = semua rule wajib tercentang. Menang = R > 0.',
      vAW: function (n, r) { return n + ' hari menang saat patuh (' + r + 'R): ini hasil dari proses yang benar.'; },
      vAL: function (n, r) { return n + ' hari rugi saat patuh (' + r + 'R): ini bagian dari varians strategi. Jangan ubah aturan hanya karena ini.'; },
      vBW: function (n, r) { return n + ' hari menang saat melanggar rule (+' + r + 'R): hasil bagus, keputusan tidak. Jangan dijadikan contoh.'; },
      vBL: function (n, r, sh) { return n + ' hari rugi saat melanggar rule (' + r + 'R)' + (sh !== null ? ', ' + sh + '% dari seluruh kerugian R' : '') + ': ini yang bisa dihindari.'; },
      gap: function (g) { return 'Selisih rata-rata R/hari: patuh ' + (g >= 0 ? 'lebih tinggi ' : 'lebih rendah ') + Math.abs(g) + 'R dibanding melanggar (asosiasi, belum tentu sebab).'; } },
    en: { title: 'Strategy vs Execution', sub: 'Your strategy rules vs what you actually executed. Decision quality is separated from one trade’s outcome.',
      all: 'All', d90: '90 days', d30: '30 days', sample: 'Eligible sample', adh: 'Compliant days', rtot: 'Total R', exp: 'Expectancy/trade',
      cmp: 'Compliant vs rule-breaking', patuh: 'Compliant', br: 'Rule-breaking', days: 'days', trades: 'trades', avgR: 'avg R/day', wr: 'winning days', noEnough: 'Not enough data',
      quad: 'Decision x outcome', qAW: 'Compliant · win', qAL: 'Compliant · loss', qBW: 'Breach · win', qBL: 'Breach · loss',
      qAWd: 'Right process, good result', qALd: 'Normal variance, not a mistake', qBWd: 'Lucky, do not copy', qBLd: 'Avoidable execution error',
      read: 'How to read', miss: 'Most-missed required rules', missNone: 'No required rule missed yet (min. 3 checks).',
      per: 'Per strategy', excl: 'Not counted', exNo: 'no strategy', exMix: 'mixed strategies', exCl: 'no checklist', exR: 'no R',
      of: 'of', journals: 'journals', needMore: 'Needs at least 5 journals with strategy, checklist and R filled in to show the comparison.',
      expJson: 'Export JSON', expCsv: 'Export CSV', note: 'Descriptive statistics on your own journals, not trading signals and not proof of causation. Compliant = all required rules checked. Win = R > 0.',
      vAW: function (n, r) { return n + ' winning days while compliant (' + r + 'R): the result of a sound process.'; },
      vAL: function (n, r) { return n + ' losing days while compliant (' + r + 'R): part of the strategy’s variance. Do not change the rules because of these.'; },
      vBW: function (n, r) { return n + ' winning days while breaking rules (+' + r + 'R): good result, bad decision. Do not use as a template.'; },
      vBL: function (n, r, sh) { return n + ' losing days while breaking rules (' + r + 'R)' + (sh !== null ? ', ' + sh + '% of all R lost' : '') + ': avoidable.'; },
      gap: function (g) { return 'Avg R/day gap: compliant is ' + Math.abs(g) + 'R ' + (g >= 0 ? 'higher' : 'lower') + ' than rule-breaking (association, not necessarily cause).'; } }
  };
  var ST = { period: 'all', strategies: [] };
  function lang() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return (l === 'en' || l === 'es') ? 'en' : 'id'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sg(v) { return (v > 0 ? '+' : '') + r2(v); }
  function pc(v) { return v === null ? '–' : Math.round(v * 100) + '%'; }
  function journalsNow() { try { return Array.isArray(allJournals) ? allJournals : []; } catch (e) { return []; } }
  function fromDate() {
    if (ST.period === 'all') return null;
    var d = new Date(); d.setDate(d.getDate() - (ST.period === '30' ? 30 : 90));
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function html(strategies, journals) {
    if (strategies) ST.strategies = strategies;
    var t = T[lang()], c = compute(journals || journalsNow(), ST.strategies, { from: fromDate() });
    function seg(k, l) { return '<button type="button" data-se="period" data-p="' + k + '" aria-pressed="' + (ST.period === k) + '">' + esc(l) + '</button>'; }
    function kpi(v, l, cls) { return '<div class="sl-k"><b class="' + (cls || '') + '">' + esc(v) + '</b><span>' + esc(l) + '</span></div>'; }
    var h = '<section class="glass sl-adh se-p" id="se-panel" aria-labelledby="se-t"><div class="se-hd"><div><h3 id="se-t">' + esc(t.title) + '</h3><p>' + esc(t.sub) + '</p></div>' +
      '<div class="sl-seg" role="group" aria-label="Periode">' + seg('all', t.all) + seg('90', t.d90) + seg('30', t.d30) + '</div></div>';
    h += '<div class="sl-kpis">' + kpi(c.eligible + '/' + c.total, t.sample) + kpi(c.enough ? pc(c.adhRate) : '–', t.adh) +
      kpi(c.enough ? sg(r2(c.sumR)) + 'R' : '–', t.rtot, c.enough ? (c.sumR > 0 ? 'sl-pos' : c.sumR < 0 ? 'sl-neg' : '') : '') + kpi(c.trades >= MIN_TRADES ? sg(r2(c.expR)) + 'R' : '–', t.exp) + '</div>';
    if (!c.enough) h += '<p class="se-need">' + esc(t.needMore) + '</p>';
    else {
      function grp(g, label) {
        return '<div><b>' + (g.okDays ? esc(sg(r2(g.avgR)) + 'R') : esc(t.noEnough)) + '</b><span>' + esc(label) + ' · ' + g.days + ' ' + esc(t.days) + ' · ' + g.trades + ' ' + esc(t.trades) +
          (g.okDays ? ' · ' + pc(g.wr) + ' ' + esc(t.wr) : '') + '</span></div>';
      }
      h += '<div class="sl-dh">' + esc(t.cmp) + ' <small class="se-u">(' + esc(t.avgR) + ')</small></div><div class="sl-cmp">' + grp(c.adh, t.patuh) + grp(c.br, t.br) + '</div>';
      var Q = c.quad;
      function qd(k, l, d, cls) { return '<div class="se-q ' + cls + '"><i>' + esc(l) + '</i><b>' + Q[k].d + ' ' + esc(t.days) + '</b><em>' + (Q[k].d ? esc(sg(r2(Q[k].r)) + 'R') : '–') + '</em><span>' + esc(d) + '</span></div>'; }
      h += '<div class="sl-dh">' + esc(t.quad) + '</div><div class="se-grid">' + qd('adhWin', t.qAW, t.qAWd, 'g') + qd('adhLoss', t.qAL, t.qALd, 'n') + qd('brWin', t.qBW, t.qBWd, 'w') + qd('brLoss', t.qBL, t.qBLd, 'b') + '</div>';
      var v = [];
      if (Q.adhWin.d) v.push(t.vAW(Q.adhWin.d, sg(r2(Q.adhWin.r))));
      if (Q.adhLoss.d) v.push(t.vAL(Q.adhLoss.d, sg(r2(Q.adhLoss.r))));
      if (Q.brWin.d) v.push(t.vBW(Q.brWin.d, r2(Q.brWin.r)));
      if (Q.brLoss.d) v.push(t.vBL(Q.brLoss.d, sg(r2(Q.brLoss.r)), c.avoidableShare === null ? null : Math.round(c.avoidableShare * 100)));
      if (c.gapDay !== null) v.push(t.gap(r2(c.gapDay)));
      if (v.length) h += '<div class="sl-dh">' + esc(t.read) + '</div><ul class="se-v">' + v.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      h += '<div class="sl-dh">' + esc(t.miss) + '</div>';
      h += c.rules.length ? c.rules.map(function (x) { return '<div class="sl-rb"><span>' + esc(x.text) + '</span><em>' + x.missed + '/' + x.seen + ' · ' + Math.round(x.missed / x.seen * 100) + '%</em></div>'; }).join('') : '<p class="sl-note">' + esc(t.missNone) + '</p>';
      if (c.per.length > 1) {
        h += '<div class="sl-dh">' + esc(t.per) + '</div>' + c.per.map(function (p) {
          return '<div class="sl-rb"><span>' + esc(p.name) + ' <small class="se-u">' + p.days + ' ' + esc(t.days) + '</small></span><em>' + pc(p.adhRate) + ' ' + esc(t.patuh.toLowerCase()) + ' · ' + esc(sg(r2(p.sumR)) + 'R') + '</em></div>';
        }).join('');
      }
    }
    var ex = c.excl, exn = ex.noStrategy + ex.mixed + ex.noChecklist + ex.noR;
    if (exn) h += '<p class="sl-note">' + esc(t.excl) + ': ' + exn + ' ' + esc(t.of) + ' ' + c.total + ' ' + esc(t.journals) + ' (' + [ex.noStrategy && ex.noStrategy + ' ' + t.exNo, ex.mixed && ex.mixed + ' ' + t.exMix, ex.noChecklist && ex.noChecklist + ' ' + t.exCl, ex.noR && ex.noR + ' ' + t.exR].filter(Boolean).join(', ') + ').</p>';
    h += '<p class="sl-note">' + esc(t.note) + '</p>';
    h += '<div class="se-ft"><button type="button" class="sl-btn sm" data-se="json">' + esc(t.expJson) + '</button><button type="button" class="sl-btn sm" data-se="csv">' + esc(t.expCsv) + '</button></div></section>';
    return h;
  }

  var CSS = '.se-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}.se-hd p{margin:4px 0 12px!important}' +
    '.se-p .sl-kpis{margin-top:4px}.se-need,.se-u{font-size:12px;color:var(--sl-mut)}.se-need{margin:12px 0 0;line-height:1.4}.se-u{font-weight:500;text-transform:none;letter-spacing:0}' +
    '.se-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.se-q{padding:12px 12px;border-radius:16px;background:var(--sl-in);border:1px solid var(--sl-bd);min-width:0}' +
    '.se-q i{display:block;font-style:normal;font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--sl-sub)}.se-q b{display:block;font-size:17px;margin-top:4px;font-variant-numeric:tabular-nums}' +
    '.se-q em{font-style:normal;font-weight:700;font-size:15px;font-variant-numeric:tabular-nums}.se-q span{display:block;font-size:12px;color:var(--sl-sub);margin-top:4px;line-height:1.3}' +
    '.se-q.g{border-color:var(--sl-pos)}.se-q.g em{color:var(--sl-pos)}.se-q.b{border-color:var(--sl-neg)}.se-q.b em{color:var(--sl-neg)}.se-q.w{border-color:var(--sl-gold-b)}.se-q.w em{color:var(--sl-gold)}' +
    '.se-v{margin:0;padding-left:20px;font-size:13px;line-height:1.5;color:var(--sl-tx)}.se-v li{margin:4px 0}.se-ft{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}' +
    '@media(max-width:520px){.se-grid{grid-template-columns:1fr}}';

  function download(name, mime, text) {
    try {
      var a = document.createElement('a'), u = URL.createObjectURL(new Blob([text], { type: mime }));
      a.href = u; a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 500);
    } catch (e) {}
  }
  function stamp() { var d = new Date(); return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2); }
  function onClick(e) {
    var b = e.target.closest && e.target.closest('[data-se]'); if (!b) return;
    var a = b.getAttribute('data-se');
    if (a === 'period') { ST.period = b.getAttribute('data-p'); var p = document.getElementById('se-panel'); if (p) { p.outerHTML = html(); var nb = document.querySelector('#se-panel [data-p="' + ST.period + '"]'); if (nb) nb.focus({ preventScroll: true }); } return; }
    if (a === 'json') download('journal-export-' + stamp() + '.json', 'application/json', JSON.stringify(buildExport(journalsNow(), ST.strategies), null, 2));
    if (a === 'csv') download('journal-export-' + stamp() + '.csv', 'text/csv;charset=utf-8', buildCsv(journalsNow()));
  }
  function init() {
    if (typeof document === 'undefined') return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var r = document.getElementById('strategy-section'); if (r) r.addEventListener('click', onClick);
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init(); }

  return { compute: compute, html: html, buildExport: buildExport, buildCsv: buildCsv, MIN_DAYS: MIN_DAYS, MIN_TRADES: MIN_TRADES, DEF_TARGET: DEF_TARGET };
});
