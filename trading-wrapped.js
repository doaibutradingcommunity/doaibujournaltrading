/* Trading Wrapped (v16.27): mesin laporan + pembuat kartu SVG. Murni (tanpa DOM, tanpa Firebase), bisa dites di Node.
   Semua angka dihitung dari journal lewat V16Stats / AICoach. Tidak ada data dummy; bagian tanpa data jadi N/A atau state kosong.
   Deskriptif dan historis: bukan prediksi, bukan saran entry/exit. Hanya bobot font 400 dan 700 (San Francisco). */
(function (root) {
  'use strict';
  var V = root.V16Stats || (typeof require === 'function' ? require('./v16-stats.js') : null);
  var C = root.AICoach || (typeof require === 'function' ? require('./ai-coach.js') : null);
  var MIN = 10, MIN_SETUP = 3, MIN_COMP_DAYS = 5;

  function num(v) { var n = typeof v === 'string' ? parseFloat(v) : v; return (typeof n === 'number' && isFinite(n)) ? n : null; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function fixZ(v) { return (v === 0 || Math.abs(v) < 1e-9) ? 0 : v; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clip(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s; }
  function sum(a, f) { var s = 0; a.forEach(function (x) { s += f ? f(x) : x; }); return s; }

  /* ---------- Nama bulan ---------- */
  var MON = { id: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] };
  var MONS = { id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
  function lg(l) { return l === 'en' ? 'en' : 'id'; }
  function monthName(ym, l) { var m = /^(\d{4})-(\d{2})$/.exec(ym); return m ? MON[lg(l)][+m[2] - 1] : '—'; }
  function monthShort(ym, l) { var m = /^(\d{4})-(\d{2})$/.exec(ym); return m ? MONS[lg(l)][+m[2] - 1] : '—'; }
  function dayLabel(ds, l, withYear) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ds); if (!m) return '—'; return (+m[3]) + ' ' + MONS[lg(l)][+m[2] - 1] + (withYear ? ' ' + m[1] : ''); }

  /* ---------- Periode ---------- */
  function lastDay(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function keyOf(period, ds) {
    if (period === 'week') return C.weekStart(ds);
    if (period === 'month') return String(ds).slice(0, 7);
    return String(ds).slice(0, 4);
  }
  function rangeOf(period, key) {
    if (period === 'week') { var from = C.weekStart(key) || key; return { period: period, key: from, from: from, to: C.addDays(from, 6) }; }
    if (period === 'month') { var m = /^(\d{4})-(\d{2})$/.exec(key); if (!m) return null; return { period: period, key: key, from: key + '-01', to: key + '-' + pad(lastDay(+m[1], +m[2])) }; }
    if (!/^\d{4}$/.test(String(key))) return null;
    return { period: 'year', key: String(key), from: key + '-01-01', to: key + '-12-31' };
  }
  function shiftKey(period, key, d) {
    if (period === 'week') return C.addDays(key, 7 * d);
    if (period === 'month') return V.shiftMonth(key, d);
    return String(+key + d);
  }
  function keysWithData(period, units) { var s = {}; units.forEach(function (u) { s[keyOf(period, u.date)] = 1; }); return Object.keys(s).sort().reverse(); }
  function periodLabel(r, l) {
    if (r.period === 'year') return r.key;
    if (r.period === 'month') return monthName(r.key, l) + ' ' + r.key.slice(0, 4);
    return dayLabel(r.from, l) + ' – ' + dayLabel(r.to, l, true);
  }
  function inRange(units, from, to) { return units.filter(function (u) { return u.date >= from && u.date <= to; }); }
  function jIn(journals, from, to) { return journals.filter(function (j) { return j && /^\d{4}-\d{2}-\d{2}$/.test(String(j.date || '')) && j.date >= from && j.date <= to; }); }
  function weeksOf(from, to) { var out = [], ws = C.weekStart(from); while (ws <= to) { out.push(ws); ws = C.addDays(ws, 7); } return out; }

  /* ---------- Agregasi ---------- */
  function mistakesOf(u) { return u.kind !== 'trade' ? [] : ((u.multi && u.multi.mistake && u.multi.mistake.length) ? u.multi.mistake : (u.dims.mistake ? [u.dims.mistake] : [])); }

  function subPeriods(period, units, r, l) {
    var rows = [], i;
    if (period === 'year') {
      var by = {}; units.forEach(function (u) { var k = u.date.slice(0, 7); var b = by[k] || (by[k] = { key: k, pl: 0, trades: 0 }); b.pl += u.pl; b.trades += u.n; });
      for (i = 1; i <= 12; i++) { var k = r.key + '-' + pad(i), b = by[k]; rows.push({ key: k, label: monthName(k, l), short: monthShort(k, l), pl: b ? fixZ(b.pl) : null, trades: b ? b.trades : 0 }); }
    } else if (period === 'week') {
      var dt = {}; V.dayTotals(units).forEach(function (d) { dt[d.date] = d; });
      for (i = 0; i < 7; i++) { var ds = C.addDays(r.from, i), d = dt[ds]; rows.push({ key: ds, label: dayLabel(ds, l), short: dayLabel(ds, l).split(' ')[0], pl: d ? d.pl : null, trades: d ? d.trades : 0 }); }
    } else {
      V.dayTotals(units).forEach(function (d) { rows.push({ key: d.date, label: dayLabel(d.date, l), short: String(+d.date.slice(8)), pl: d.pl, trades: d.trades }); });
    }
    var have = rows.filter(function (x) { return x.pl !== null; });
    var best = null, worst = null;
    if (have.length) {
      var s = have.slice().sort(function (a, b) { return b.pl - a.pl || (a.key < b.key ? -1 : 1); });
      if (s[0].pl > 0) best = s[0];
      var w = s[s.length - 1]; if (s.length > 1 && w.pl < 0) worst = w;
    }
    return { kind: period === 'year' ? 'month' : 'day', rows: rows, count: have.length, best: best, worst: worst };
  }

  function setupsOf(units, allUpTo) {
    var g = V.groupBy(units, ['setup']).filter(function (x) { return x.stats.trades >= MIN_SETUP; });
    var hist = {}; V.groupBy(allUpTo, ['setup']).forEach(function (x) { hist[x.key] = x.stats; });
    g.sort(function (a, b) { return b.stats.net - a.stats.net || (a.key < b.key ? -1 : 1); });
    var top = g.filter(function (x) { return x.stats.net > 0; }).slice(0, 3).map(function (x) {
      var h = hist[x.key] || x.stats;
      return { key: x.key, trades: x.stats.trades, net: x.stats.net, winRate: x.stats.winRate, expectancy: x.stats.expectancy, tier: V.reliability(x.stats.trades),
        hist: { trades: h.trades, net: h.net, winRate: h.winRate, tier: V.reliability(h.trades) } };
    });
    return { top: top, groups: g.length, cov: V.coverage(units, 'setup') };
  }

  function psychOf(units) {
    var ed = V.emotionDays(units), covDays = {}; ed.forEach(function (x) { covDays[x.date] = 1; });
    var emo = V.mostCommon(ed.map(function (x) { return x.emotion; }));
    var mk = {}, cnt = 0;
    units.forEach(function (u) { mistakesOf(u).forEach(function (k) { var m = mk[k] || (mk[k] = { key: k, count: 0, net: 0 }); m.count++; m.net += u.pl; cnt++; }); });
    var mrows = Object.keys(mk).map(function (k) { mk[k].net = fixZ(mk[k].net); return mk[k]; }).sort(function (a, b) { return b.count - a.count || (a.key < b.key ? -1 : 1); });
    var dayPl = {}; V.dayTotals(units).forEach(function (d) { dayPl[d.date] = d.pl; });
    var neg = {}, negNames = {}; ed.forEach(function (x) { if (V.NEG_EMOTIONS.indexOf(x.emotion) >= 0) { neg[x.date] = 1; negNames[x.emotion] = 1; } });
    var nd = Object.keys(neg);
    return { emotions: emo ? emo.all.slice(0, 3) : [], emotionDays: Object.keys(covDays).length,
      mistakes: mrows.slice(0, 3), mistakeTotal: cnt,
      neg: { days: nd.length, net: fixZ(sum(nd, function (d) { return dayPl[d] || 0; })), names: Object.keys(negNames).sort() } };
  }

  function complianceOf(journals, from, to) {
    var cd = C.complianceDays(jIn(journals, from, to));
    if (!cd.length) return { n: 0, avg: null, full: null };
    return { n: cd.length, avg: sum(cd, function (d) { return d.ratio; }) / cd.length * 100, full: cd.filter(function (d) { return !d.missed; }).length / cd.length * 100 };
  }
  function rate(journalDays, from, to, today) {
    var end = to < today ? to : today; if (end < from) end = from;
    var days = Math.round((Date.parse(end + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86400000) + 1;
    var weeks = Math.max(1, Math.ceil(days / 7));
    return { perWeek: journalDays / weeks, weeks: weeks };
  }

  function strategyGoals(journals, strategies, from, to) {
    var by = {};
    jIn(journals, from, to).forEach(function (j) {
      (Array.isArray(j.strategyLog) ? j.strategyLog : []).forEach(function (e) {
        if (!e || !e.id || !num(e.total) || e.total <= 0) return;
        var s = by[e.id] || (by[e.id] = { id: e.id, name: e.name || '', days: {} });
        var d = s.days[j.date] || (s.days[j.date] = []); d.push(Math.min(1, Math.max(0, (num(e.checked) || 0) / e.total)));
        if (!s.name && e.name) s.name = e.name;
      });
    });
    var meta = {}; (strategies || []).forEach(function (s) { if (s && s.id) meta[s.id] = s; });
    return Object.keys(by).map(function (id) {
      var s = by[id], ds = Object.keys(s.days), m = meta[id] || {};
      var avg = sum(ds, function (d) { return sum(s.days[d]) / s.days[d].length; }) / ds.length * 100;
      var target = num(m.targetComp) || 80;
      var ok = ds.length >= MIN_COMP_DAYS;
      return { id: 'comp:' + id, type: 'compliance', name: m.name || s.name || 'Strategy', value: avg, target: target, days: ds.length, met: ok ? avg >= target : null, need: MIN_COMP_DAYS };
    }).sort(function (a, b) { return b.days - a.days || (a.name < b.name ? -1 : 1); }).slice(0, 3);
  }

  function focusGoals(picked, units, journals, from, to) {
    var out = [];
    (Array.isArray(picked) ? picked : []).forEach(function (f) {
      if (!f || !f.id) return;
      if (!f.metric) { out.push({ id: 'focus:' + f.id, type: 'focus', fid: f.id, params: f.params || {}, manual: true, met: null }); return; }
      var weeks = 0, met = 0;
      weeksOf(from, to).forEach(function (ws) {
        var we = C.addDays(ws, 6);
        if (f.since && we < f.since) return;
        if (!inRange(units, ws < from ? from : ws, we > to ? to : we).length) return;
        var p = C.progress(f, units, journals, ws);
        if (p && p.met !== null && p.met !== undefined) { weeks++; if (p.met) met++; }
      });
      out.push({ id: 'focus:' + f.id, type: 'focus', fid: f.id, params: f.params || {}, op: f.op, target: f.target, weeks: weeks, metWeeks: met, met: weeks ? met === weeks : null });
    });
    return out;
  }

  /* ---------- Laporan ---------- */
  function build(journals, opt) {
    opt = opt || {}; journals = Array.isArray(journals) ? journals : [];
    var l = lg(opt.lang), period = ['week', 'month', 'year'].indexOf(opt.period) >= 0 ? opt.period : 'month';
    var all = V.normalize(journals), today = C.today(opt.now);
    var keys = keysWithData(period, all), curKey = keyOf(period, today);
    var key = opt.key || (all.length ? (keys.indexOf(curKey) >= 0 ? curKey : keys[0]) : curKey);
    var r = rangeOf(period, key), res = { period: period, lang: l, today: today, keys: keys, curKey: curKey, empty: !all.length, journals: journals.length, invalid: all.invalid || 0 };
    if (!r) { res.empty = true; res.error = 'bad-key'; return res; }
    res.key = r.key; res.from = r.from; res.to = r.to; res.label = periodLabel(r, l); res.inProgress = today >= r.from && today <= r.to;
    var units = inRange(all, r.from, r.to); res.units = units.length; res.noData = !units.length;
    if (!units.length) return res;

    var s = V.calc(units), eq = V.equityByDay(units), days = V.dayTotals(units);
    res.stats = s; res.equity = eq.points; res.maxDrawdown = eq.maxDrawdown; res.days = days.length; res.tradeLevel = s.tradeLevel;
    res.small = s.trades < MIN; res.profitDays = days.filter(function (d) { return d.pl > 0; }).length; res.lossDays = days.filter(function (d) { return d.pl < 0; }).length;

    var pk = shiftKey(period, r.key, -1), pr = rangeOf(period, pk), pu = pr ? inRange(all, pr.from, pr.to) : [];
    res.prev = pu.length ? { key: pk, label: periodLabel(pr, l), stats: V.calc(pu), days: V.dayTotals(pu).length } : null;
    res.sub = subPeriods(period, units, r, l);
    res.setups = setupsOf(units, all.filter(function (u) { return u.date <= r.to; }));
    res.psych = psychOf(units);

    var cur = complianceOf(journals, r.from, r.to), prv = pr ? complianceOf(journals, pr.from, pr.to) : { n: 0, avg: null, full: null };
    var rt = rate(res.days, r.from, r.to, today), prt = res.prev ? rate(res.prev.days, pr.from, pr.to, '9999-12-31') : null;
    var aw = {}; days.forEach(function (d) { aw[C.weekStart(d.date)] = 1; });
    res.consistency = { journalDays: res.days, perWeek: rt.perWeek, weeks: rt.weeks, activeWeeks: Object.keys(aw).length, prevPerWeek: prt ? prt.perWeek : null,
      deltaPerWeek: prt ? rt.perWeek - prt.perWeek : null,
      compliance: { n: cur.n, avg: cur.avg, full: cur.full, prevAvg: prv.avg, prevN: prv.n, delta: (cur.avg !== null && prv.avg !== null) ? cur.avg - prv.avg : null } };

    var goals = strategyGoals(journals, opt.strategies, r.from, r.to).concat(focusGoals(opt.picked, all, journals, r.from, r.to));
    res.goals = { items: goals, assessed: goals.filter(function (g) { return g.met !== null && g.met !== undefined; }).length, achieved: goals.filter(function (g) { return g.met === true; }).length };

    var upTo = jIn(journals, '0000-01-01', r.to), a = C.analyze(upTo, { now: r.to, from: period === 'year' ? r.from : C.addDays(r.to, -90) });
    res.focus = { items: (a && a.focus) ? a.focus : [], manual: String(opt.manualFocus || '').trim() };
    return res;
  }

  /* ======================================================================
     Teks (ID / EN)
     ====================================================================== */
  var TX = {
    id: {
      brand: 'TRADING WRAPPED', app: 'Doa Ibu Journal', foot: 'Deskriptif dari journalmu · bukan saran trading', wk: 'Laporan Mingguan', mo: 'Laporan Bulanan', yr: 'Laporan Tahunan',
      wkS: 'PEKAN', moS: 'BULAN', yrS: 'TAHUN', running: 'Periode berjalan', trades: 'trade', jdays: 'hari journal', win: 'Win rate', pf: 'Profit factor', exp: 'Expectancy / trade', dd: 'Max drawdown', na: 'N/A',
      net: 'HASIL BERSIH', from: 'dari', vs: 'vs', small: 'Sampel kecil (di bawah 10 trade)', noEq: 'Kurva P/L butuh minimal 2 hari trading.', dayLvl: 'Dihitung per hari journal.',
      bwDay: 'Hari terbaik & terburuk', bwMonth: 'Bulan terbaik & terburuk', best: 'TERBAIK', worst: 'TERBURUK', noBest: 'Belum ada periode yang profit', noWorst: 'Belum ada periode yang rugi', tradesN: 'trade',
      stTitle: 'Setup dengan performa terbaik', stSub: 'Historis dari journalmu, bukan prediksi', stNone: 'Belum ada setup dengan minimal 3 trade dan net positif.', stNoneS: 'Pastikan tag setup terisi di journal.',
      tierR: 'Sampel cukup (30+ trade)', tierI: 'Sampel kecil (10-29 trade)', tierX: 'Sampel sangat kecil (di bawah 10 trade)', stHist: 'Sepanjang riwayat', cov: 'Setup tercatat di', covOf: 'dari', 
      psTitle: 'Emosi & kesalahan', psEmo: 'Emosi paling sering', psMis: 'Kesalahan paling sering', psDays: 'hari', psNoEmo: 'Belum ada tag emosi di periode ini.', psNoMis: 'Belum ada mistake tag.', psNeg: 'Hari beremosi negatif', psNegNet: 'net P/L hari tersebut',
      coTitle: 'Konsistensi & kepatuhan', coJ: 'Hari journal per pekan', coC: 'Kepatuhan rule', coFull: 'Hari dengan semua rule wajib tercentang', coWeeks: 'Pekan aktif', coPrev: 'Periode lalu', coNoPrev: 'Belum ada pembanding', coNoC: 'Belum ada checklist strategy di periode ini.', pp: 'poin', up: 'naik', dn: 'turun', same: 'tetap',
      gTitle: 'Target tercapai', gSub: 'Hanya target yang bisa dinilai dari datamu', gNone: 'Belum ada target yang bisa dinilai.', gNoneS: 'Atur target kepatuhan di Strategy Playbook atau pilih fokus di AI Coach.',
      gCoach: 'Fokus dari AI Coach', gOk: 'Tercapai', gNo: 'Belum', gMan: 'Dinilai manual', gLow: 'Data belum cukup', gComp: 'Kepatuhan', gTarget: 'target', gWeeks: 'pekan', gDays: 'hari', gAch: 'target tercapai',
      fTitle: 'Fokus perbaikan berikutnya', fSub: 'Saran kebiasaan (proses), bukan sinyal entry', fNote: 'Catatan fokusmu', fNone: 'Belum ada saran. Catat lebih banyak journal.',
      f_compliance: 'Centang semua rule wajib', f_overtrade: 'Batasi jumlah trade per hari', f_emotion: 'Beri jeda saat emosi negatif', f_review: 'Telaah ulang pola trade ini', f_journaling: 'Lengkapi tag setup dan emosi', f_consistency: 'Catat journal minimal 3 hari per pekan',
      fd_overtrade: 'Batas biasa kamu', fd_emotion: 'Emosi tercatat', fd_review: 'Net', 
      share: 'Dibuat dari journalmu'
    },
    en: {
      brand: 'TRADING WRAPPED', app: 'Doa Ibu Journal', foot: 'Descriptive of your journal · not trading advice', wk: 'Weekly Report', mo: 'Monthly Report', yr: 'Yearly Report',
      wkS: 'WEEK', moS: 'MONTH', yrS: 'YEAR', running: 'In progress', trades: 'trades', jdays: 'journal days', win: 'Win rate', pf: 'Profit factor', exp: 'Expectancy / trade', dd: 'Max drawdown', na: 'N/A',
      net: 'NET RESULT', from: 'from', vs: 'vs', small: 'Small sample (under 10 trades)', noEq: 'The P/L curve needs at least 2 trading days.', dayLvl: 'Counted per journal day.',
      bwDay: 'Best & worst day', bwMonth: 'Best & worst month', best: 'BEST', worst: 'WORST', noBest: 'No profitable period yet', noWorst: 'No losing period', tradesN: 'trades',
      stTitle: 'Best performing setups', stSub: 'Historical from your journal, not a prediction', stNone: 'No setup with at least 3 trades and positive net yet.', stNoneS: 'Make sure setup tags are filled in your journal.',
      tierR: 'Solid sample (30+ trades)', tierI: 'Small sample (10-29 trades)', tierX: 'Very small sample (under 10 trades)', stHist: 'All-time', cov: 'Setup tagged on', covOf: 'of',
      psTitle: 'Emotions & mistakes', psEmo: 'Most frequent emotions', psMis: 'Most frequent mistakes', psDays: 'days', psNoEmo: 'No emotion tags in this period.', psNoMis: 'No mistake tags yet.', psNeg: 'Negative-emotion days', psNegNet: 'net P/L on those days',
      coTitle: 'Consistency & compliance', coJ: 'Journal days per week', coC: 'Rule compliance', coFull: 'Days with every required rule checked', coWeeks: 'Active weeks', coPrev: 'Last period', coNoPrev: 'No comparison yet', coNoC: 'No strategy checklist in this period.', pp: 'pts', up: 'up', dn: 'down', same: 'flat',
      gTitle: 'Goals reached', gSub: 'Only goals your data can judge', gNone: 'No goal can be judged yet.', gNoneS: 'Set a compliance target in Strategy Playbook or pick a focus in AI Coach.',
      gCoach: 'Focus from AI Coach', gOk: 'Reached', gNo: 'Not yet', gMan: 'Judged manually', gLow: 'Not enough data', gComp: 'Compliance', gTarget: 'target', gWeeks: 'weeks', gDays: 'days', gAch: 'goals reached',
      fTitle: 'Next improvement focus', fSub: 'Habit (process) suggestions, not entry signals', fNote: 'Your focus note', fNone: 'No suggestions yet. Log more journals.',
      f_compliance: 'Check every required rule', f_overtrade: 'Limit the number of trades per day', f_emotion: 'Pause when emotions run negative', f_review: 'Review this trade pattern again', f_journaling: 'Complete setup and emotion tags', f_consistency: 'Log a journal at least 3 days a week',
      fd_overtrade: 'Your usual cap', fd_emotion: 'Emotions logged', fd_review: 'Net',
      share: 'Made from your journal'
    }
  };

  /* ======================================================================
     Kartu SVG 1080 x 1920
     ====================================================================== */
  var W = 1080, H = 1920, M = 72, CW = W - 2 * M;
  var FONT = '"Inter",-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,system-ui,sans-serif';
  var COL = { bg: '#0E0F11', raised: '#17181B', card: '#1B1C20', line: '#2A2B30', gold: '#C8A96A', goldSoft: '#3A3223', pos: '#2DD4BF', neg: '#FF7A68', t1: '#F4F2EC', t2: '#B9B8C0', t3: '#8E8D96' };

  function tx(x, y, s, size, fill, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '" font-weight="' + (o.b ? 700 : 400) + '"' + (o.a ? ' text-anchor="' + o.a + '"' : '') +
      (o.ls ? ' letter-spacing="' + o.ls + '"' : '') + (o.op ? ' opacity="' + o.op + '"' : '') + '>' + esc(s) + '</text>';
  }
  function fit(s, base, maxW, min, k) { var w = String(s).length * base * (k || 0.6); return Math.max(min || 40, w > maxW ? Math.floor(base * maxW / w) : base); }
  function rect(x, y, w, h, rx, fill, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + Math.max(0, w) + '" height="' + h + '" rx="' + rx + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function card(x, y, w, h) { return rect(x, y, w, h, 36, COL.card, ' stroke="' + COL.line + '" stroke-width="2"'); }
  function plColor(v) { return v > 0 ? COL.pos : v < 0 ? COL.neg : COL.t2; }
  function tri(x, y, up, fill) { return '<polygon points="' + (up ? (x - 18) + ',' + (y + 12) + ' ' + (x + 18) + ',' + (y + 12) + ' ' + x + ',' + (y - 18) : (x - 18) + ',' + (y - 12) + ' ' + (x + 18) + ',' + (y - 12) + ' ' + x + ',' + (y + 18)) + '" fill="' + fill + '"/>'; }
  function pct(v) { return v === null || v === undefined ? null : Math.round(v) + '%'; }

  function frame(inner, idx, total, rep, t) {
    var tag = rep.period === 'year' ? rep.key : rep.period === 'month' ? monthShort(rep.key, rep.lang) + ' ' + rep.key.slice(0, 4) : dayLabel(rep.from, rep.lang) + ' – ' + dayLabel(rep.to, rep.lang);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family=\'' + FONT + '\'>' +
      '<defs><radialGradient id="g' + idx + '" cx="85%" cy="0%" r="75%"><stop offset="0" stop-color="#C8A96A" stop-opacity="0.28"/><stop offset="1" stop-color="#C8A96A" stop-opacity="0"/></radialGradient></defs>' +
      rect(0, 0, W, H, 0, COL.bg) + rect(0, 0, W, H, 0, 'url(#g' + idx + ')') +
      tx(M, 118, t.brand, 32, COL.gold, { b: 1, ls: 7 }) + tx(W - M, 118, tag, 32, COL.t2, { a: 'end' }) +
      '<line x1="' + M + '" y1="150" x2="' + (W - M) + '" y2="150" stroke="' + COL.line + '" stroke-width="2"/>' +
      inner +
      '<line x1="' + M + '" y1="1790" x2="' + (W - M) + '" y2="1790" stroke="' + COL.line + '" stroke-width="2"/>' +
      tx(M, 1842, t.foot, 30, COL.t3) + tx(W - M, 1888, t.app + '  ·  ' + (idx + 1) + '/' + total, 30, COL.t3, { a: 'end' }) + '</svg>';
  }
  function title(s, sub, t) { return tx(M, 290, s, 64, COL.t1, { b: 1 }) + (sub ? tx(M, 346, sub, 36, COL.t2) : ''); }

  function sCover(rep, t, mm) {
    var s = rep.stats, kind = rep.period === 'year' ? t.yr : rep.period === 'month' ? t.mo : t.wk;
    var big = rep.period === 'year' ? rep.key : rep.period === 'month' ? monthName(rep.key, rep.lang).toUpperCase() : dayLabel(rep.from, rep.lang) + ' – ' + dayLabel(rep.to, rep.lang);
    var sz = rep.period === 'year' ? 330 : rep.period === 'month' ? fit(big, 230, CW, 90, 0.78) : fit(big, 150, CW, 70, 0.66);
    var small = rep.period === 'week' ? '' : (rep.period === 'month' ? rep.key.slice(0, 4) : '');
    var h = tx(M, 560, rep.period === 'year' ? t.yrS : rep.period === 'month' ? t.moS : t.wkS, 40, COL.gold, { b: 1, ls: 10 }) +
      tx(M, 560 + sz * 0.95, big, sz, COL.t1, { b: 1 }) + (small ? tx(M, 560 + sz * 0.95 + 110, small, 90, COL.gold, { b: 1 }) : '') +
      tx(M, 1130, kind, 56, COL.t2);
    if (rep.inProgress) h += rect(M, 1170, 360, 68, 34, COL.goldSoft, ' stroke="' + COL.gold + '" stroke-width="2"') + tx(M + 180, 1216, t.running, 34, COL.gold, { a: 'middle', b: 1 });
    var items = [[String(s.trades), t.trades], [String(rep.days), t.jdays], [s.winRate === null ? t.na : Math.round(s.winRate) + '%', t.win]];
    items.forEach(function (it, i) { var x = M + i * (CW / 3); h += tx(x, 1500, it[0], 84, COL.t1, { b: 1 }) + tx(x, 1556, it[1], 34, COL.t2); });
    h += '<line x1="' + M + '" y1="1420" x2="' + (W - M) + '" y2="1420" stroke="' + COL.gold + '" stroke-opacity="0.5" stroke-width="2"/>';
    return h;
  }

  function sResult(rep, t, mm) {
    var s = rep.stats, netTxt = mm(s.net), sz = fit(netTxt, 200, CW, 80), h = tx(M, 230, t.net, 36, COL.gold, { b: 1, ls: 6 });
    h += tx(M, 230 + sz * 0.95 + 40, netTxt, sz, plColor(s.net), { b: 1 });
    var y = 230 + sz * 0.95 + 40 + 62;
    h += tx(M, y, t.from + ' ' + s.trades + ' ' + t.trades + ' · ' + rep.days + ' ' + t.jdays, 40, COL.t2);
    if (rep.prev) { var d = s.net - rep.prev.stats.net; y += 70; h += tri(M + 18, y - 12, d >= 0, d === 0 ? COL.t2 : plColor(d)) + tx(M + 52, y, mm(d) + '  ' + t.vs + ' ' + rep.prev.label, 38, COL.t2); }
    var boxes = [[t.win, s.winRate === null ? t.na : r1(s.winRate) + '%', COL.t1], [t.pf, s.profitFactor === null ? t.na : (Math.round(s.profitFactor * 100) / 100).toFixed(2), COL.t1],
      [t.exp, s.expectancy === null ? t.na : mm(s.expectancy), plColor(s.expectancy || 0)], [t.dd, mm(rep.maxDrawdown > 0 ? -rep.maxDrawdown : 0), rep.maxDrawdown > 0 ? COL.neg : COL.t1]];
    var by = 620;
    boxes.forEach(function (b, i) { var x = M + (i % 2) * (CW / 2 + 12), yy = by + Math.floor(i / 2) * 200, w = CW / 2 - 12; h += card(x, yy, w, 176) + tx(x + 32, yy + 66, b[0], 32, COL.t2) + tx(x + 32, yy + 138, b[1], fit(b[1], 64, w - 64, 36), b[2], { b: 1 }); });
    var cx = M, cy = 1060, cw = CW, ch = 560, pts = rep.equity;
    h += card(cx, cy, cw, ch + 80);
    if (pts.length < 2) { h += tx(cx + cw / 2, cy + 300, t.noEq, 38, COL.t2, { a: 'middle' }); }
    else {
      var lo = 0, hi = 0; pts.forEach(function (p) { lo = Math.min(lo, p.cum); hi = Math.max(hi, p.cum); }); if (hi === lo) { hi += 1; lo -= 1; }
      var px = function (i) { return cx + 48 + i * (cw - 96) / (pts.length - 1); }, py = function (v) { return cy + 60 + (hi - v) * (ch - 40) / (hi - lo); };
      var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + r1(px(i)) + ' ' + r1(py(p.cum)); }).join(' ');
      h += '<line x1="' + (cx + 48) + '" y1="' + r1(py(0)) + '" x2="' + (cx + cw - 48) + '" y2="' + r1(py(0)) + '" stroke="' + COL.line + '" stroke-width="3" stroke-dasharray="10 10"/>' +
        '<path d="' + d + ' L' + r1(px(pts.length - 1)) + ' ' + r1(py(0)) + ' L' + r1(px(0)) + ' ' + r1(py(0)) + ' Z" fill="' + plColor(s.net) + '" fill-opacity="0.12"/>' +
        '<path d="' + d + '" fill="none" stroke="' + plColor(s.net) + '" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<circle cx="' + r1(px(pts.length - 1)) + '" cy="' + r1(py(pts[pts.length - 1].cum)) + '" r="14" fill="' + plColor(s.net) + '"/>';
    }
    h += tx(cx + 32, cy + ch + 50, 'P/L ' + (rep.tradeLevel ? '' : '· ' + t.dayLvl), 30, COL.t3);
    if (rep.small) h += tx(M, 1742, t.small, 32, COL.gold);
    return h;
  }

  function sBestWorst(rep, t, mm) {
    var sub = rep.sub, isY = sub.kind === 'month', h = title(isY ? t.bwMonth : t.bwDay, rep.label, t);
    var rows = sub.rows, n = rows.length, cx = M, cy = 420, cw = CW, ch = 640, mx = 0;
    rows.forEach(function (r) { if (r.pl !== null) mx = Math.max(mx, Math.abs(r.pl)); }); if (!mx) mx = 1;
    h += card(cx, cy, cw, ch);
    var mid = cy + ch / 2, bw = Math.min(64, (cw - 80) / n * 0.7), step = (cw - 80) / n;
    h += '<line x1="' + (cx + 24) + '" y1="' + mid + '" x2="' + (cx + cw - 24) + '" y2="' + mid + '" stroke="' + COL.line + '" stroke-width="3"/>';
    rows.forEach(function (r, i) {
      var x = cx + 40 + i * step + (step - bw) / 2;
      if (r.pl !== null && r.pl !== 0) { var bh = Math.max(8, Math.abs(r.pl) / mx * (ch / 2 - 70)), y = r.pl > 0 ? mid - bh : mid;
        h += rect(Math.round(x), Math.round(y), Math.round(bw), Math.round(bh), 10, plColor(r.pl), (sub.best && sub.best.key === r.key) || (sub.worst && sub.worst.key === r.key) ? ' stroke="' + COL.gold + '" stroke-width="4"' : ''); }
      else if (r.pl === 0) h += rect(Math.round(x), mid - 4, Math.round(bw), 8, 4, COL.t2);
      if (n <= 12 || i % 2 === 0) h += tx(Math.round(x + bw / 2), cy + ch - 24, r.short, n > 12 ? 26 : 30, COL.t3, { a: 'middle' });
    });
    var cards = [[t.best, sub.best, t.noBest, COL.pos], [t.worst, sub.worst, t.noWorst, COL.neg]];
    cards.forEach(function (c, i) {
      var y = 1100 + i * 320, b = c[1];
      h += card(M, y, CW, 280) + tx(M + 40, y + 70, c[0], 34, COL.gold, { b: 1, ls: 5 });
      if (b) { var amt = mm(b.pl); h += tx(M + 40, y + 160, b.label, fit(b.label, 72, CW - 80, 44), COL.t1, { b: 1 }) + tx(M + 40, y + 236, amt, fit(amt, 64, 520, 40), c[3], { b: 1 }) + tx(W - M - 40, y + 236, b.trades + ' ' + t.tradesN, 36, COL.t2, { a: 'end' }); }
      else h += tx(M + 40, y + 180, c[2], 42, COL.t2);
    });
    return h;
  }

  function sSetup(rep, t, mm) {
    var st = rep.setups, h = title(t.stTitle, t.stSub, t);
    if (!st.top.length) return h + card(M, 460, CW, 420) + tx(M + 48, 620, t.stNone, 44, COL.t1, { b: 1 }) + tx(M + 48, 700, t.stNoneS, 38, COL.t2) +
      (st.cov.total ? tx(M + 48, 800, t.cov + ' ' + st.cov.with + ' ' + t.covOf + ' ' + st.cov.total + ' ' + t.trades + ' (' + Math.round(st.cov.pct) + '%)', 34, COL.t3) : '');
    st.top.forEach(function (x, i) {
      var y = 430 + i * 410, tier = x.tier === 'reliable' ? t.tierR : x.tier === 'insight' ? t.tierI : t.tierX, nt = mm(x.net);
      h += card(M, y, CW, 380) + tx(M + 40, y + 90, String(i + 1), 80, COL.gold, { b: 1 }) + tx(M + 130, y + 88, clip(x.key, 22), fit(clip(x.key, 22), 60, CW - 520, 38), COL.t1, { b: 1 }) +
        tx(W - M - 40, y + 88, nt, fit(nt, 56, 380, 34), COL.pos, { b: 1, a: 'end' }) +
        tx(M + 130, y + 156, x.trades + ' ' + t.tradesN + ' · ' + t.win + ' ' + (x.winRate === null ? t.na : Math.round(x.winRate) + '%'), 38, COL.t2) +
        rect(M + 130, y + 190, CW - 170, 18, 9, COL.line) + rect(M + 130, y + 190, (CW - 170) * Math.max(0, Math.min(100, x.winRate || 0)) / 100, 18, 9, COL.gold) +
        tx(M + 130, y + 268, tier, 34, COL.gold, { b: 1 }) +
        tx(M + 130, y + 330, t.stHist + ': ' + x.hist.trades + ' ' + t.tradesN + ' · ' + mm(x.hist.net), 34, COL.t3);
    });
    return h;
  }

  function barList(items, x, y, w, maxCount, fill, label) {
    var h = '';
    items.forEach(function (it, i) { var yy = y + i * 118, bw = Math.max(16, (w - 0) * it.count / maxCount);
      h += tx(x, yy, clip(it.key, 20), 42, COL.t1, { b: 1 }) + tx(x + w, yy, label(it), 38, COL.t2, { a: 'end' }) + rect(x, yy + 22, w, 16, 8, COL.line) + rect(x, yy + 22, bw, 16, 8, fill); });
    return h;
  }
  function sPsych(rep, t, mm) {
    var p = rep.psych, h = title(t.psTitle, rep.label, t), ne = Math.max(1, p.emotions.length), nm = Math.max(1, p.mistakes.length);
    var h1 = 140 + ne * 118, y1 = 410, y2 = y1 + h1 + 30, h2 = 140 + nm * 118, y3 = y2 + h2 + 30;
    h += card(M, y1, CW, h1) + tx(M + 40, y1 + 70, t.psEmo, 34, COL.gold, { b: 1, ls: 4 });
    if (p.emotions.length) h += barList(p.emotions, M + 40, y1 + 150, CW - 80, p.emotions[0].count, COL.gold, function (it) { return it.count + ' ' + t.psDays; });
    else h += tx(M + 40, y1 + 150, t.psNoEmo, 40, COL.t2);
    h += card(M, y2, CW, h2) + tx(M + 40, y2 + 70, t.psMis, 34, COL.gold, { b: 1, ls: 4 });
    if (p.mistakes.length) h += barList(p.mistakes, M + 40, y2 + 150, CW - 80, p.mistakes[0].count, COL.neg, function (it) { return it.count + 'x · ' + mm(it.net); });
    else h += tx(M + 40, y2 + 150, t.psNoMis, 40, COL.t2);
    h += card(M, y3, CW, 240) + tx(M + 40, y3 + 70, t.psNeg, 34, COL.gold, { b: 1, ls: 4 });
    if (p.emotionDays) h += tx(M + 40, y3 + 160, String(p.neg.days) + ' / ' + p.emotionDays + ' ' + t.psDays, 60, COL.t1, { b: 1 }) + tx(W - M - 40, y3 + 160, mm(p.neg.net), fit(mm(p.neg.net), 54, 420, 34), plColor(p.neg.net), { b: 1, a: 'end' }) + tx(W - M - 40, y3 + 212, t.psNegNet, 30, COL.t3, { a: 'end' });
    else h += tx(M + 40, y3 + 160, t.na, 56, COL.t2, { b: 1 });
    return h;
  }

  function delta(v, unit, t, dec) { if (v === null || v === undefined) return null; var a = Math.abs(v), r = dec ? r1(a) : Math.round(a); return { dir: v > 0.0001 ? 1 : v < -0.0001 ? -1 : 0, text: (r === 0 ? t.same : (v > 0 ? '+' : '-') + r + ' ' + unit) }; }
  function sConsist(rep, t, mm) {
    var c = rep.consistency, h = title(t.coTitle, rep.label, t);
    var jd = delta(c.deltaPerWeek, '/ ' + (rep.lang === 'en' ? 'wk' : 'pkn'), t, true);
    h += card(M, 420, CW, 420) + tx(M + 40, 490, t.coJ, 34, COL.gold, { b: 1, ls: 4 }) + tx(M + 40, 640, String(r1(c.perWeek)), 150, COL.t1, { b: 1 }) +
      tx(M + 40, 720, t.coWeeks + ': ' + c.activeWeeks + ' / ' + c.weeks, 38, COL.t2);
    if (jd) h += tri(W - M - 300, 600, jd.dir >= 0, jd.dir === 0 ? COL.t2 : jd.dir > 0 ? COL.pos : COL.neg) + tx(W - M - 40, 616, jd.text, 46, jd.dir === 0 ? COL.t2 : jd.dir > 0 ? COL.pos : COL.neg, { b: 1, a: 'end' }) + tx(W - M - 40, 668, t.coPrev + ': ' + r1(c.prevPerWeek), 32, COL.t3, { a: 'end' });
    else h += tx(W - M - 40, 616, t.coNoPrev, 36, COL.t3, { a: 'end' });
    var cp = c.compliance, cd = delta(cp.delta, t.pp, t, false);
    h += card(M, 880, CW, 560) + tx(M + 40, 950, t.coC, 34, COL.gold, { b: 1, ls: 4 });
    if (cp.avg !== null) {
      h += tx(M + 40, 1100, pct(cp.avg), 150, COL.t1, { b: 1 });
      if (cd) h += tri(W - M - 300, 1060, cd.dir >= 0, cd.dir === 0 ? COL.t2 : cd.dir > 0 ? COL.pos : COL.neg) + tx(W - M - 40, 1076, cd.text, 46, cd.dir === 0 ? COL.t2 : cd.dir > 0 ? COL.pos : COL.neg, { b: 1, a: 'end' }) + tx(W - M - 40, 1128, t.coPrev + ': ' + pct(cp.prevAvg), 32, COL.t3, { a: 'end' });
      else h += tx(W - M - 40, 1076, t.coNoPrev, 36, COL.t3, { a: 'end' });
      h += rect(M + 40, 1190, CW - 80, 20, 10, COL.line) + rect(M + 40, 1190, (CW - 80) * Math.min(100, cp.avg) / 100, 20, 10, COL.gold) +
        tx(M + 40, 1290, t.coFull, 36, COL.t2) + tx(M + 40, 1380, pct(cp.full), 70, COL.t1, { b: 1 }) + tx(W - M - 40, 1380, cp.n + ' ' + t.gDays, 36, COL.t3, { a: 'end' });
    } else h += tx(M + 40, 1130, t.coNoC, 40, COL.t2);
    return h;
  }

  function goalText(g, t) {
    if (g.type === 'compliance') return { name: clip(g.name, 24), line: g.met === null ? t.gLow + ' (' + g.days + '/' + g.need + ' ' + t.gDays + ')' : t.gComp + ' ' + Math.round(g.value) + '% · ' + t.gTarget + ' ' + g.target + '%' };
    var nm = t['f_' + g.fid] || g.fid;
    if (g.manual) return { name: clip(nm, 34), line: t.gCoach };
    return { name: clip(nm, 34), line: g.met === null ? t.gLow : g.metWeeks + ' ' + t.covOf + ' ' + g.weeks + ' ' + t.gWeeks };
  }
  function sGoals(rep, t, mm) {
    var g = rep.goals, h = title(t.gTitle, t.gSub, t);
    if (!g.items.length) return h + card(M, 460, CW, 420) + tx(M + 48, 620, t.gNone, 46, COL.t1, { b: 1 }) + tx(M + 48, 700, t.gNoneS, 36, COL.t2);
    if (g.assessed) h += tx(M, 440, g.achieved + ' / ' + g.assessed + ' ' + t.gAch, 54, COL.gold, { b: 1 });
    g.items.slice(0, 5).forEach(function (it, i) {
      var y = 500 + i * 250, gt = goalText(it, t), st = it.met === true ? t.gOk : it.met === false ? t.gNo : it.manual ? t.gMan : t.gLow, col = it.met === true ? COL.pos : it.met === false ? COL.neg : COL.gold, cx = M + 78, cy = y + 110;
      h += card(M, y, CW, 220);
      if (it.met === true) h += '<circle cx="' + cx + '" cy="' + cy + '" r="40" fill="' + col + '"/><path d="M' + (cx - 18) + ' ' + cy + ' l12 14 l26 -30" fill="none" stroke="' + COL.bg + '" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>';
      else if (it.met === false) h += '<circle cx="' + cx + '" cy="' + cy + '" r="36" fill="none" stroke="' + col + '" stroke-width="8"/><path d="M' + (cx - 14) + ' ' + (cy - 14) + ' l28 28 M' + (cx + 14) + ' ' + (cy - 14) + ' l-28 28" stroke="' + col + '" stroke-width="8" stroke-linecap="round"/>';
      else h += '<circle cx="' + cx + '" cy="' + cy + '" r="36" fill="none" stroke="' + col + '" stroke-width="8" stroke-dasharray="14 10"/>';
      h += tx(M + 150, y + 96, gt.name, fit(gt.name, 48, CW - 200, 36), COL.t1, { b: 1 }) + tx(M + 150, y + 164, gt.line, 34, COL.t2) + tx(W - M - 40, y + 164, st, 34, col, { b: 1, a: 'end' });
    });
    return h;
  }

  function focusText(f, t) {
    var k = f.id, p = f.params || {}, s = t['f_' + k] || k, d = '';
    if (k === 'overtrade' && p.cap) d = t.fd_overtrade + ': ' + p.cap + ' ' + t.tradesN;
    else if (k === 'emotion' && p.names && p.names.length) d = t.fd_emotion + ': ' + p.names.slice(0, 3).join(', ');
    else if (k === 'review' && p.key) d = clip(p.key, 30) + (typeof p.net === 'number' ? ' · ' + t.fd_review + ' ' + (p.net > 0 ? '+' : '') + r1(p.net) : '');
    return { s: s, d: d };
  }
  function wrap(s, n, max) { var words = String(s).split(/\s+/), lines = [], cur = ''; words.forEach(function (w) { if ((cur + ' ' + w).trim().length > n) { if (cur) lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); if (cur) lines.push(cur); return lines.slice(0, max || 4); }
  function sFocus(rep, t, mm) {
    var h = title(t.fTitle, t.fSub, t), items = rep.focus.items.slice(0, 3);
    if (!items.length) h += card(M, 440, CW, 300) + tx(M + 48, 610, t.fNone, 44, COL.t2);
    items.forEach(function (f, i) {
      var y = 430 + i * 330, ft = focusText(f, t), lines = wrap(ft.s, 26, 2);
      h += card(M, y, CW, 300) + tx(M + 40, y + 120, String(i + 1), 100, COL.gold, { b: 1 });
      lines.forEach(function (ln, k) { h += tx(M + 160, y + 100 + k * 56, ln, 46, COL.t1, { b: 1 }); });
      if (ft.d) h += tx(M + 160, y + 100 + lines.length * 56 + 12, ft.d, 34, COL.t2);
    });
    if (rep.focus.manual) {
      var y2 = 430 + Math.max(1, items.length) * 330 + 10, ml = wrap(rep.focus.manual, 38, 4);
      h += card(M, y2, CW, 120 + ml.length * 52) + tx(M + 40, y2 + 72, t.fNote, 32, COL.gold, { b: 1, ls: 4 });
      ml.forEach(function (ln, k) { h += tx(M + 40, y2 + 140 + k * 52, ln, 40, COL.t1); });
    }
    return h;
  }

  function slides(rep, opt) {
    opt = opt || {}; if (!rep || rep.empty || rep.noData) return [];
    var l = lg(rep.lang), t = TX[l], mm = opt.mm || function (v) { return (Math.round(v * 100) / 100).toString(); };
    var defs = [['cover', sCover, t.brand + ' · ' + rep.label], ['result', sResult, t.net], ['bestworst', sBestWorst, rep.sub.kind === 'month' ? t.bwMonth : t.bwDay], ['setup', sSetup, t.stTitle],
      ['psych', sPsych, t.psTitle], ['consist', sConsist, t.coTitle], ['goals', sGoals, t.gTitle], ['focus', sFocus, t.fTitle]];
    return defs.map(function (d, i) { return { id: d[0], title: d[2], svg: frame(d[1](rep, t, mm), i, defs.length, rep, t) }; });
  }

  /* ringkasan teks (aksesibilitas + fallback): satu baris per bagian */
  function textSummary(rep, opt) {
    if (!rep || rep.empty || rep.noData) return [];
    var t = TX[lg(rep.lang)], mm = (opt && opt.mm) || function (v) { return String(Math.round(v * 100) / 100); }, s = rep.stats, o = [];
    o.push(t.brand + ' · ' + rep.label);
    o.push(t.net + ': ' + mm(s.net) + ' · ' + s.trades + ' ' + t.trades + ' · ' + t.win + ' ' + (s.winRate === null ? t.na : Math.round(s.winRate) + '%'));
    o.push((rep.sub.kind === 'month' ? t.bwMonth : t.bwDay) + ': ' + (rep.sub.best ? t.best + ' ' + rep.sub.best.label + ' ' + mm(rep.sub.best.pl) : t.noBest) + ' · ' + (rep.sub.worst ? t.worst + ' ' + rep.sub.worst.label + ' ' + mm(rep.sub.worst.pl) : t.noWorst));
    o.push(t.stTitle + ': ' + (rep.setups.top.length ? rep.setups.top.map(function (x) { return x.key + ' ' + mm(x.net); }).join(', ') : t.stNone));
    o.push(t.psEmo + ': ' + (rep.psych.emotions.length ? rep.psych.emotions.map(function (x) { return x.key + ' (' + x.count + ')'; }).join(', ') : t.psNoEmo));
    o.push(t.psMis + ': ' + (rep.psych.mistakes.length ? rep.psych.mistakes.map(function (x) { return x.key + ' (' + x.count + ')'; }).join(', ') : t.psNoMis));
    o.push(t.coJ + ': ' + r1(rep.consistency.perWeek) + ' · ' + t.coC + ': ' + (rep.consistency.compliance.avg === null ? t.na : Math.round(rep.consistency.compliance.avg) + '%'));
    o.push(t.gTitle + ': ' + (rep.goals.items.length ? rep.goals.achieved + ' / ' + rep.goals.assessed : t.gNone));
    o.push(t.fTitle + ': ' + (rep.focus.items.length ? rep.focus.items.slice(0, 3).map(function (f) { return focusText(f, t).s; }).join('; ') : t.fNone));
    return o;
  }

  var API = { MIN: MIN, build: build, slides: slides, textSummary: textSummary, rangeOf: rangeOf, keyOf: keyOf, shiftKey: shiftKey, keysWithData: keysWithData, periodLabel: periodLabel,
    TX: TX, W: W, H: H, FONT: FONT, monthName: monthName, dayLabel: dayLabel };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TradingWrapped = API;
})(typeof window !== 'undefined' ? window : globalThis);
