/* AI Trading Coach: mesin analisis lokal (v16.25)
   Membaca riwayat journal dan menghasilkan:
     1) pola kerugian berulang        -> lossPatterns()
     2) setup dengan performa terbaik -> bestSetups()
     3) ringkasan evaluasi mingguan    -> weekly()
     4) fokus latihan berikutnya       -> focus() + progress()
   Prinsip yang sama dengan V16.x:
   - Semua angka dihitung dari journal milikmu lewat V16Stats. Tidak ada data dummy, tidak ada panggilan jaringan.
   - Deskriptif, bukan sebab-akibat, dan bukan rekomendasi entry/exit. Fokus latihan hanya soal kebiasaan (proses).
   - Kurang dari 10 trade (atau 5 hari untuk pola harian) = tidak dianggap pola.
   - Modul ini hanya mengembalikan DATA terstruktur; teks bahasa ada di ai-coach-ui.js.
   Dipakai di browser (window.AICoach) dan di Node untuk tes (module.exports). */
(function (root) {
  'use strict';
  var V = root.V16Stats || (typeof require === 'function' ? require('./v16-stats.js') : null);
  var MIN = 10, STRONG = 30, MIN_DAYS = 5;

  /* ---------- util ---------- */
  function num(v) { var n = typeof v === 'string' ? parseFloat(v) : v; return (typeof n === 'number' && isFinite(n)) ? n : null; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function sum(a, f) { var s = 0; a.forEach(function (x) { s += f ? f(x) : x; }); return s; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function parse(ds) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ds || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null; }
  function fmtD(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(ds, n) { var d = parse(ds); if (!d) return null; d.setDate(d.getDate() + n); return fmtD(d); }
  function weekStart(ds) { var d = parse(ds); if (!d) return null; d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return fmtD(d); } // Senin = awal pekan
  function today(now) { return fmtD(now ? new Date(now) : new Date()); }
  function inRange(units, from, to) { return units.filter(function (u) { return (!from || u.date >= from) && (!to || u.date <= to); }); }
  function median(a) { if (!a.length) return 0; var s = a.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function tier(n) { return n >= STRONG ? 'reliable' : n >= MIN ? 'insight' : 'insufficient'; }
  function isNeg(e) { return V.NEG_EMOTIONS.indexOf(e) >= 0; }
  function emotionsOf(u) { return (u.multi && u.multi.emotion && u.multi.emotion.length) ? u.multi.emotion : (u.dims.emotion ? [u.dims.emotion] : []); }
  function mistakesOf(u) { return u.kind !== 'trade' ? [] : ((u.multi && u.multi.mistake && u.multi.mistake.length) ? u.multi.mistake : (u.dims.mistake ? [u.dims.mistake] : [])); }
  function hasSetup(u) { return !!u.dims.setup || !!(u.multi && u.multi.setup && u.multi.setup.length); }
  function journalsIn(journals, from, to) {
    return (Array.isArray(journals) ? journals : []).filter(function (j) { return j && /^\d{4}-\d{2}-\d{2}$/.test(String(j.date || '')) && (!from || j.date >= from) && (!to || j.date <= to); });
  }
  /* kepatuhan strategy per tanggal: {date, ratio, missed}  (hanya entri yang punya checklist) */
  function complianceDays(journals) {
    var by = {};
    journals.forEach(function (j) {
      (Array.isArray(j.strategyLog) ? j.strategyLog : []).forEach(function (e) {
        if (!e || !num(e.total) || e.total <= 0) return;
        var d = by[j.date] || (by[j.date] = { date: j.date, sum: 0, n: 0, missed: false });
        d.sum += Math.min(1, Math.max(0, (num(e.checked) || 0) / e.total)); d.n++; if ((num(e.reqMissed) || 0) > 0) d.missed = true;
      });
    });
    return Object.keys(by).sort().map(function (k) { var d = by[k]; return { date: d.date, ratio: d.sum / d.n, missed: d.missed }; });
  }

  /* ==========================================================
     1) Pola kerugian berulang
     ========================================================== */
  function lossPatterns(units, journals, opt) {
    opt = opt || {};
    var overall = V.calc(units), out = [], limit = opt.limit || 5;
    function add(kind, dims, g) {
      var st = g.stats;
      if (st.trades < MIN || !(st.net < 0) || !(st.expectancy < 0) || st.losses < 3) return;
      out.push({ id: dims.join('+') + ':' + g.key, kind: kind, dims: dims, parts: g.parts, key: g.key, trades: st.trades, losses: st.losses, winRate: st.winRate,
        net: st.net, expectancy: st.expectancy, profitFactor: st.profitFactor, avgR: st.avgR, tier: tier(st.trades), tradeLevel: st.tradeLevel,
        vsWin: overall.winRate !== null && st.winRate !== null ? overall.winRate - st.winRate : null,
        sig: g.units.map(function (u) { return u.id; }).sort().join(',') });
    }
    ['setup', 'pair', 'session', 'emotion', 'mistake', 'dow', 'direction'].forEach(function (d) {
      V.groupBy(units, [d]).forEach(function (g) { add('dim', [d], g); });
    });
    var singles = out.slice();
    [['setup', 'session'], ['setup', 'pair'], ['pair', 'session']].forEach(function (dims) {
      V.groupBy(units, dims).forEach(function (g) {
        var redundant = singles.some(function (s) { var i = dims.indexOf(s.dims[0]); return i >= 0 && s.key === g.parts[i] && g.stats.trades >= 0.7 * s.trades; });
        if (!redundant) add('combo', dims, g);
      });
    });

    var days = V.dayTotals(units);
    /* hari dengan tag emosi negatif */
    var negSet = {}, names = {};
    V.emotionDays(units).forEach(function (e) { if (isNeg(e.emotion)) { negSet[e.date] = 1; names[e.emotion] = 1; } });
    var negD = days.filter(function (d) { return negSet[d.date]; }), othD = days.filter(function (d) { return !negSet[d.date]; });
    if (negD.length >= MIN_DAYS) {
      var nNet = sum(negD, function (d) { return d.pl; }), nAvg = nNet / negD.length, oAvg = othD.length ? sum(othD, function (d) { return d.pl; }) / othD.length : null;
      if (nNet < 0 && (oAvg === null || nAvg < oAvg)) out.push({ id: 'neg-emotion', kind: 'neg-emotion', days: negD.length, net: r2(nNet), avgDay: r2(nAvg), avgOther: oAvg === null ? null : r2(oAvg), names: Object.keys(names).sort(), tier: negD.length >= MIN ? 'insight' : 'insufficient' });
    }
    /* hari dengan jumlah trade jauh di atas biasanya */
    if (days.length >= 2 * MIN_DAYS) {
      var med = median(days.map(function (d) { return d.trades; })), cap = Math.max(Math.ceil(med * 1.5), med + 1);
      var heavy = days.filter(function (d) { return d.trades > cap; }), light = days.filter(function (d) { return d.trades <= cap; });
      if (heavy.length >= MIN_DAYS && light.length) {
        var hNet = sum(heavy, function (d) { return d.pl; }), hAvg = hNet / heavy.length, lAvg = sum(light, function (d) { return d.pl; }) / light.length;
        if (hNet < 0 && hAvg < lAvg) out.push({ id: 'overtrade', kind: 'overtrade', days: heavy.length, cap: cap, median: med, net: r2(hNet), avgDay: r2(hAvg), avgOther: r2(lAvg), tier: heavy.length >= MIN ? 'insight' : 'insufficient' });
      }
    }
    /* rule wajib strategy yang terlewat */
    var dayPl = {}; days.forEach(function (d) { dayPl[d.date] = d.pl; });
    var cd = complianceDays(journalsIn(journals, opt.from, opt.to)).filter(function (d) { return dayPl[d.date] !== undefined; });
    var miss = cd.filter(function (d) { return d.missed; }), full = cd.filter(function (d) { return !d.missed; });
    if (miss.length >= MIN_DAYS) {
      var mNet = sum(miss, function (d) { return dayPl[d.date]; }), mAvg = mNet / miss.length, fAvg = full.length ? sum(full, function (d) { return dayPl[d.date]; }) / full.length : null;
      if (mNet < 0 && (fAvg === null || mAvg < fAvg)) out.push({ id: 'compliance', kind: 'compliance', days: miss.length, fullDays: full.length, net: r2(mNet), avgDay: r2(mAvg), avgOther: fAvg === null ? null : r2(fAvg), tier: miss.length >= MIN ? 'insight' : 'insufficient' });
    }
    out.sort(function (a, b) { return a.net - b.net; });
    /* satu himpunan trade yang sama bisa cocok dengan beberapa label (mis. setup FOMO = sesi New York = emosi FOMO):
       tampilkan sekali, sebutkan label kembarannya di `also` (urutan label mengikuti urutan dimensi di atas). */
    var keep = {}, merged = [];
    out.forEach(function (p) {
      if (!p.sig) { merged.push(p); return; }
      var k = keep[p.sig];
      if (k) { k.also.push({ kind: p.kind, dims: p.dims, parts: p.parts }); return; }
      p.also = []; keep[p.sig] = p; merged.push(p);
    });
    out = merged;
    return { items: out.slice(0, limit), total: out.length, overall: overall, enough: overall.trades >= MIN, tradeLevel: overall.tradeLevel };
  }

  /* ==========================================================
     2) Setup terbaik
     ========================================================== */
  function bestSetups(units, opt) {
    opt = opt || {}; var limit = opt.limit || 3, overall = V.calc(units);
    var items = V.groupBy(units, ['setup']).filter(function (g) { return g.stats.trades >= MIN && g.stats.net > 0 && g.stats.expectancy > 0; })
      .map(function (g) { var s = g.stats; return { key: g.key, trades: s.trades, wins: s.wins, winRate: s.winRate, net: s.net, expectancy: s.expectancy, profitFactor: s.profitFactor, avgR: s.avgR, tier: tier(s.trades), tradeLevel: s.tradeLevel }; });
    items.sort(function (a, b) { return (b.tier === 'reliable') - (a.tier === 'reliable') || b.expectancy - a.expectancy; });
    var combos = V.findEdges(units).filter(function (e) { return e.dims.length === 2 && e.dims.indexOf('setup') >= 0 && e.stats.net > 0 && e.stats.expectancy > 0; })
      .slice(0, 2).map(function (e) { return { label: e.label, dims: e.dims, trades: e.stats.trades, winRate: e.stats.winRate, net: e.stats.net, expectancy: e.stats.expectancy, tier: e.tier }; });
    return { items: items.slice(0, limit), combos: combos, coverage: V.coverage(units, 'setup'), overall: overall, enough: overall.trades >= MIN };
  }

  /* ==========================================================
     3) Evaluasi mingguan
     ========================================================== */
  function weeksWithData(units) { var s = {}; units.forEach(function (u) { s[weekStart(u.date)] = 1; }); return Object.keys(s).sort().reverse(); }

  /* metrik pekan: dipakai evaluasi dan pelacakan fokus */
  function weekMetrics(units, journals, ws, opt) {
    opt = opt || {};
    var we = addDays(ws, 6), cur = inRange(units, ws, we), days = V.dayTotals(cur);
    var negSet = {}; V.emotionDays(cur).forEach(function (e) { if (isNeg(e.emotion)) negSet[e.date] = 1; });
    var tagged = {}, hasEmo = {}, hasSet = {};
    cur.forEach(function (u) { if (hasSetup(u)) hasSet[u.date] = 1; if (emotionsOf(u).length) hasEmo[u.date] = 1; });
    days.forEach(function (d) { tagged[d.date] = !!(hasSet[d.date] && hasEmo[d.date]); });
    var cd = complianceDays(journalsIn(journals, ws, we));
    return { cur: cur, days: days, journalDays: days.length, negEmoDays: Object.keys(negSet).length,
      untaggedDays: days.filter(function (d) { return !tagged[d.date]; }).length,
      missedDays: cd.length ? cd.filter(function (d) { return d.missed; }).length : null,
      compliance: cd.length ? sum(cd, function (d) { return d.ratio; }) / cd.length : null,
      overDays: num(opt.cap) !== null ? days.filter(function (d) { return d.trades > opt.cap; }).length : null };
  }

  function weekly(units, journals, ws, opt) {
    opt = opt || {};
    var we = addDays(ws, 6), weeks = weeksWithData(units);
    var older = weeks.filter(function (w) { return w < ws; })[0] || null, newer = weeks.filter(function (w) { return w > ws; }).slice(-1)[0] || null;
    var res = { weekStart: ws, weekEnd: we, empty: true, prevWeek: older, nextWeek: newer, wins: [], improve: [] };
    var m = weekMetrics(units, journals, ws, opt), cur = m.cur;
    if (!cur.length) return res;
    var st = V.calc(cur), days = m.days, byPl = days.slice().sort(function (a, b) { return b.pl - a.pl || (a.date < b.date ? -1 : 1); });
    var prevUnits = inRange(units, addDays(ws, -7), addDays(ws, -1)), prev = prevUnits.length ? V.calc(prevUnits) : null;
    var wj = journalsIn(journals, ws, we), ratings = wj.map(function (j) { return num(j.rating); }).filter(function (v) { return v !== null && v >= 1 && v <= 5; });
    var mk = V.mostCommon([].concat.apply([], cur.map(mistakesOf))), emo = V.mostCommon(V.emotionDays(cur).map(function (e) { return e.emotion; }));
    var best = V.bestWorst(cur, 'setup');
    res.empty = false; res.stats = st; res.days = days.length; res.journalDays = m.journalDays; res.prev = prev;
    res.bestDay = byPl[0]; res.worstDay = byPl.length > 1 ? byPl[byPl.length - 1] : null;
    res.profitDays = days.filter(function (d) { return d.pl > 0; }).length; res.lossDays = days.filter(function (d) { return d.pl < 0; }).length;
    res.negEmoDays = m.negEmoDays; res.untaggedDays = m.untaggedDays; res.missedDays = m.missedDays; res.compliance = m.compliance; res.overDays = m.overDays;
    res.avgRating = ratings.length ? sum(ratings) / ratings.length : null; res.ratingN = ratings.length;
    res.topMistake = mk ? { key: mk.top[0].key, count: mk.top[0].count, tie: mk.tie } : null;
    res.topEmotion = emo ? { key: emo.top[0].key, count: emo.top[0].count, tie: emo.tie } : null;
    res.setup = best;
    res.small = st.trades < MIN; // pekan hampir selalu sampel kecil: UI memberi label jujur

    var w = res.wins, im = res.improve;
    if (st.net > 0) w.push({ k: 'netPos', net: st.net, trades: st.trades });
    if (st.winRate !== null && st.winRate >= 50) w.push({ k: 'wrHigh', wr: st.winRate, wins: st.wins, trades: st.trades });
    if (res.bestDay && res.bestDay.pl > 0) w.push({ k: 'bestDay', date: res.bestDay.date, pl: res.bestDay.pl });
    if (best.best) w.push({ k: 'bestSetup', key: best.best.key, net: best.best.stats.net, trades: best.best.stats.trades });
    if (m.compliance !== null && m.missedDays === 0) w.push({ k: 'allRules' });
    if (res.avgRating !== null && res.avgRating >= 4) w.push({ k: 'ratingHigh', avg: res.avgRating, n: ratings.length });
    if (days.length >= 2 && res.negEmoDays === 0 && V.emotionDays(cur).length) w.push({ k: 'calm', days: days.length });
    if (prev && st.net > prev.net) w.push({ k: 'better', from: prev.net, to: st.net });
    if (st.net < 0) im.push({ k: 'netNeg', net: st.net, trades: st.trades });
    if (st.winRate !== null && st.winRate < 50) im.push({ k: 'wrLow', wr: st.winRate, wins: st.wins, trades: st.trades });
    if (res.worstDay && res.worstDay.pl < 0) im.push({ k: 'worstDay', date: res.worstDay.date, pl: res.worstDay.pl });
    if (best.worst) im.push({ k: 'worstSetup', key: best.worst.key, net: best.worst.stats.net, trades: best.worst.stats.trades });
    if (res.negEmoDays > 0) im.push({ k: 'negEmo', days: res.negEmoDays });
    if (res.topMistake) im.push({ k: 'mistake', key: res.topMistake.key, count: res.topMistake.count });
    if (m.missedDays > 0) im.push({ k: 'missedRules', days: m.missedDays });
    if (res.overDays > 0) im.push({ k: 'overCap', days: res.overDays, cap: opt.cap });
    if (st.maxLossStreak >= 3) im.push({ k: 'lossStreak', n: st.maxLossStreak, unit: st.tradeLevel ? 'trade' : 'day' });
    if (m.untaggedDays > 0) im.push({ k: 'untagged', days: m.untaggedDays });
    if (prev && st.net < prev.net) im.push({ k: 'worse', from: prev.net, to: st.net });
    return res;
  }

  /* ==========================================================
     4) Fokus latihan berikutnya (kebiasaan, bukan sinyal trading)
     ========================================================== */
  function focus(pat, best, opt) {
    opt = opt || {}; var items = [], seen = {};
    function push(f) { if (items.length < 3 && !seen[f.id]) { seen[f.id] = 1; items.push(f); } }
    var P = (pat && pat.items) || [];
    function first(kind) { return P.filter(function (p) { return p.kind === kind; })[0]; }
    var c = first('compliance'), o = first('overtrade'), e = first('neg-emotion');
    if (c) push({ id: 'compliance', metric: 'missedDays', op: '<=', target: 0, params: { days: c.days, avgDay: c.avgDay, avgOther: c.avgOther }, why: 'compliance' });
    if (o) push({ id: 'overtrade', metric: 'overDays', op: '<=', target: 0, params: { cap: o.cap, days: o.days, median: o.median }, why: 'overtrade' });
    if (e) push({ id: 'emotion', metric: 'negEmoDays', op: '<=', target: 1, params: { days: e.days, names: e.names }, why: 'neg-emotion' });
    var d = P.filter(function (p) { return p.kind !== 'neg-emotion' && p.kind !== 'overtrade' && p.kind !== 'compliance'; })[0];
    if (d) push({ id: 'review', metric: null, op: null, target: null, params: { dims: d.dims, key: d.key, trades: d.trades, net: d.net, winRate: d.winRate, dim: d.dims[0] }, why: 'pattern' });
    var cov = best && best.coverage;
    if (items.length < 3 && cov && cov.total >= MIN && cov.pct < 60) push({ id: 'journaling', metric: 'untaggedDays', op: '<=', target: 0, params: { pct: cov.pct }, why: 'coverage' });
    if (!items.length) push({ id: 'consistency', metric: 'journalDays', op: '>=', target: 3, params: {}, why: 'baseline' });
    return items;
  }
  /* kemajuan fokus yang tersimpan pada pekan tertentu; value=null bila datanya tidak ada */
  function progress(f, units, journals, ws) {
    if (!f || !f.metric) return { value: null, target: null, met: null, manual: true };
    var m = weekMetrics(units, journals, ws, { cap: f.params && f.params.cap }), v = m[f.metric];
    if (v === undefined || v === null) return { value: null, target: f.target, op: f.op, met: null };
    return { value: v, target: f.target, op: f.op, met: f.op === '>=' ? v >= f.target : v <= f.target };
  }

  /* ==========================================================
     Analisis penuh
     ========================================================== */
  /* opt: { now, from (YYYY-MM-DD, awal rentang pola), week (YYYY-MM-DD di pekan yang dipilih), limit } */
  function analyze(journals, opt) {
    opt = opt || {};
    if (!V) return { error: 'no-stats' };
    var all = V.normalize(journals), units = inRange(all, opt.from, null), t = today(opt.now);
    var res = { empty: !all.length, journals: Array.isArray(journals) ? journals.length : 0, invalid: all.invalid || 0, today: t, units: units.length, from: opt.from || null };
    if (!all.length) return res;
    var pat = lossPatterns(units, journals, { from: opt.from, limit: opt.limit }), best = bestSetups(units);
    var cap = (pat.items.filter(function (p) { return p.kind === 'overtrade'; })[0] || {}).cap;
    var latest = all[all.length - 1].date, ws = weekStart(opt.week || (inRange(all, weekStart(t), null).length ? t : latest));
    res.patterns = pat; res.best = best; res.overall = pat.overall; res.cap = cap === undefined ? null : cap;
    res.week = weekly(all, journals, ws, { cap: cap }); res.focus = focus(pat, best);
    res.weeks = weeksWithData(all); res.currentWeek = weekStart(t);
    return res;
  }

  var API = { MIN: MIN, STRONG: STRONG, MIN_DAYS: MIN_DAYS, analyze: analyze, lossPatterns: lossPatterns, bestSetups: bestSetups, weekly: weekly, weekMetrics: weekMetrics, focus: focus, progress: progress,
    weekStart: weekStart, addDays: addDays, today: today, weeksWithData: weeksWithData, complianceDays: complianceDays };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.AICoach = API;
})(typeof window !== 'undefined' ? window : globalThis);
