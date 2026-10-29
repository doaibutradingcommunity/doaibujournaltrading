/* Doa Ibu Journal V16 — statistics engine (pure, no DOM, no Firebase).
 * Input : V15 daily journal docs {date,pl,trades,wins,pair,session,tags,emotions,...}
 *         + OPTIONAL per-trade array j.tradeLog = [{pl,r,risk,setup,direction,hour,pair,session,market,emotion,mistake,tags,time}]
 * Rule  : never invent data. A dimension is only used by units that really have it.
 */
(function (root) {
  'use strict';
  var NEG = null;
  var num = function (v) { var n = typeof v === 'string' ? parseFloat(v) : v; return (typeof n === 'number' && isFinite(n)) ? n : null; };
  var fix0 = function (v) { return (v === 0 || (typeof v === 'number' && Math.abs(v) < 1e-9)) ? 0 : v; }; // no "-0"
  var list = function (s) { return Array.isArray(s) ? s.map(String).map(function (x) { return x.trim(); }).filter(Boolean) : String(s == null ? '' : s).split(',').map(function (x) { return x.trim(); }).filter(Boolean); };
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /* ---- Jenis akun (v16.40): satu-satunya tempat yang menerjemahkan teks akun di journal menjadi kunci baku.
   *  Nilai tersimpan di journal TIDAK diubah. '' = belum diisi, 'Lainnya' = teks bebas yang tidak dikenali (tidak ditebak). */
  var ACCOUNTS = [
    { key: 'Live', label: 'Live' }, { key: 'Demo', label: 'Demo' }, { key: 'Funded CFD', label: 'Funded CFD' },
    { key: 'Funded Futures', label: 'Futures' }, { key: 'Saham', label: 'Saham' }
  ];
  function acctKey(raw) {
    var t = String(raw == null ? '' : raw).trim().toLowerCase();
    if (!t) return '';
    if (/demo|paper|simulasi|latihan/.test(t)) return 'Demo';
    if (/futures?|\bfut\b/.test(t)) return 'Funded Futures';
    if (/saham|stocks?\b/.test(t)) return 'Saham';
    if (/cfd/.test(t)) return 'Funded CFD';
    if (/\blive\b|real/.test(t)) return 'Live';
    return 'Lainnya';
  }
  function acctLabel(key) { for (var i = 0; i < ACCOUNTS.length; i++) if (ACCOUNTS[i].key === key) return ACCOUNTS[i].label; return key === 'Lainnya' ? 'Lainnya' : (key || 'Tanpa akun'); }

  /* ---- normalize: V15 docs -> analysis units ----
   * unit = {kind:'trade'|'day', date, n, wins, pl, gp, gl, r, rN, dims:{pair,session,setup,direction,hour,dow,market,emotion,mistake}, tags:[]}
   * Multi-valued dims on legacy day units are ambiguous -> dim left undefined (never guessed). */
  function normalize(journals) {
    var out = [], bad = 0;
    (Array.isArray(journals) ? journals : []).forEach(function (j) {
      if (!j || typeof j !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(String(j.date || ''))) { bad++; return; }
      var d = new Date(j.date + 'T00:00:00'), dow = isNaN(d) ? undefined : DOW[d.getDay()];
      var dayTags = list(j.tags), dayEmo = list(j.emotions);
      var one = function (a) { return a.length === 1 ? a[0] : undefined; };
      var base = { date: j.date, dow: dow, pair: one(list(j.pair)), session: one(list(j.session)), emotion: one(dayEmo), acct: acctKey(j.accountType) };
      var log = Array.isArray(j.tradeLog) ? j.tradeLog.filter(function (t) { return t && num(t.pl) !== null; }) : [];
      if (log.length) {
        log.forEach(function (t, i) {
          var pl = num(t.pl), r = num(t.r);
          var tEmo = list(t.emotion), emoL = tEmo.length ? tEmo : dayEmo, mkL = list(t.mistake);
          var tu = { kind: 'trade', id: j.date + '#' + i, jid: j.id, date: j.date, acct: base.acct, accountId: j.accountId || 'acc_default_main', source: j.source || 'manual', externalId: j.externalId || null, syncedAt: j.syncedAt || null, needsReflection: !!(t.needsReflection || j.needsReflection), n: 1, wins: pl > 0 ? 1 : 0, pl: pl, gp: pl > 0 ? pl : 0, gl: pl < 0 ? -pl : 0, fee: num(t.fee),
            r: r, rN: r === null ? 0 : 1, risk: num(t.risk),
            dims: { pair: t.pair || base.pair, session: t.session || base.session, setup: t.setup || undefined, direction: t.direction || undefined,
              hour: num(t.hour) !== null ? num(t.hour) : undefined, dow: dow, market: t.market || undefined,
              emotion: one(emoL), mistake: one(mkL) }, tags: list(t.tags).concat(dayTags) };
          // V16.4: multi-valued emotion / mistake on one trade stays ambiguous in exact mode; inclusive mode may expand it.
          if (emoL.length > 1 || mkL.length > 1) tu.multi = { emotion: emoL, mistake: mkL };
          out.push(tu);
        });
      } else {
        var pl = num(j.pl) || 0, n = Math.max(1, Math.floor(num(j.trades) || 1));
        var w = typeof j.wins === 'number' ? Math.min(Math.max(j.wins, 0), n) : (pl > 0 ? n : 0);
        var beN = typeof j.be === 'number' ? Math.min(Math.max(j.be, 0), n - w) : 0;
        // V16.2: setup = journal tag (only when exactly one tag), direction = bias Long/Short (Neutral/mixed is NOT a direction).
        // `multi` keeps the raw multi-valued lists so the optional "inclusive" mode can expand them; default stays exact.
        var bias = String(j.bias == null ? '' : j.bias).trim();
        var multi = { pair: list(j.pair), session: list(j.session), setup: dayTags, emotion: dayEmo };
        out.push({ kind: 'day', id: j.date, jid: j.id, date: j.date, acct: base.acct, accountId: j.accountId || 'acc_default_main', source: j.source || 'manual', externalId: j.externalId || null, syncedAt: j.syncedAt || null, needsReflection: !!j.needsReflection, n: n, wins: w, be: beN, pl: pl, gp: pl > 0 ? pl : 0, gl: pl < 0 ? -pl : 0, fee: num(j.fees), r: null, rN: 0,
          dims: { pair: base.pair, session: base.session, setup: one(dayTags), direction: (bias === 'Long' || bias === 'Short') ? bias : undefined, dow: dow, emotion: base.emotion },
          multi: multi, tags: dayTags });
      }
    });
    out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    out.invalid = bad;
    return out;
  }

  /* ---- filters (global filter system) ----
   * Default (exact): a unit matches pair/session/setup/emotion only when it has exactly that single value.
   * opt.inclusive (V16.5 Global Filter): journal harian yang mencantumkan beberapa nilai ikut cocok bila salah satunya sama
   *   (sama seperti filter Journal V15). Unit seperti itu dihitung di result.ambiguous agar UI bisa memberi catatan jujur. */
  var MULTI_DIMS = ['pair', 'session', 'setup', 'emotion'];
  function applyFilters(units, f, opt) {
    f = f || {}; var inclusive = !!(opt && opt.inclusive), ambiguous = 0;
    var out = units.filter(function (u) {
      if (f.acct && u.acct !== f.acct) return false;
      if (f.from && u.date < f.from) return false;
      if (f.to && u.date > f.to) return false;
      var d = u.dims, viaMulti = false;
      for (var i = 0; i < MULTI_DIMS.length; i++) {
        var k = MULTI_DIMS[i], want = f[k]; if (!want) continue;
        if (d[k] === want) continue;
        if (inclusive && u.multi && u.multi[k] && u.multi[k].length > 1 && u.multi[k].indexOf(want) >= 0) { viaMulti = true; continue; }
        return false;
      }
      if (f.direction && d.direction !== f.direction) return false;
      if (f.tag && u.tags.indexOf(f.tag) < 0) return false;
      if (f.result === 'win' && !(u.pl > 0)) return false;
      if (f.result === 'loss' && !(u.pl < 0)) return false;
      if (viaMulti) ambiguous++;
      return true;
    });
    out.ambiguous = ambiguous;
    return out;
  }

  /* ---- filter options: nilai yang benar-benar ada di data (tidak ada daftar karangan) ---- */
  function filterOptions(units) {
    var sets = { pair: {}, session: {}, setup: {}, emotion: {}, tag: {} };
    var add = function (k, v) { if (v !== undefined && v !== null && String(v).trim()) sets[k][String(v).trim()] = 1; };
    (units || []).forEach(function (u) {
      MULTI_DIMS.forEach(function (k) { add(k, u.dims[k]); if (u.multi && Array.isArray(u.multi[k])) u.multi[k].forEach(function (v) { add(k, v); }); });
      (u.tags || []).forEach(function (t) { add('tag', t); });
    });
    var res = {}; Object.keys(sets).forEach(function (k) { res[k] = Object.keys(sets[k]).sort(function (a, b) { return a.localeCompare(b); }); });
    return res;
  }

  /* ---- core stats. Null = "not computable" (UI shows "—"/Insufficient data, never NaN) ---- */
  function calc(units) {
    var s = { units: units.length, trades: 0, wins: 0, be: 0, losses: 0, net: 0, gp: 0, gl: 0, fees: 0, feeN: 0, rSum: 0, rN: 0, tradeLevel: true };
    units.forEach(function (u) {
      s.trades += u.n; s.wins += u.wins; s.be += (u.be || 0); s.net += u.pl; s.gp += u.gp; s.gl += u.gl; s.rSum += (u.r || 0); s.rN += u.rN;
      if (u.fee !== null && u.fee !== undefined) { s.fees += u.fee; s.feeN++; }
      if (u.kind === 'day') s.tradeLevel = false;
    });
    s.losses = s.trades - s.wins - s.be;
    s.net = fix0(s.net); s.fees = Math.round(s.fees * 100) / 100;
    s.winRate = s.trades ? s.wins / s.trades * 100 : null;
    s.profitFactor = s.gl > 0 ? s.gp / s.gl : null;               // null when no loss (undefined, not Infinity)
    s.avgWin = s.tradeLevel && s.wins ? s.gp / s.wins : null;      // exact only when every unit is a single trade
    s.avgLoss = s.tradeLevel && s.losses ? s.gl / s.losses : null;
    s.expectancy = s.trades ? s.net / s.trades : null;            // currency per trade
    s.avgR = s.rN ? s.rSum / s.rN : null;
    s.expectancyR = s.avgR;                                       // R-expectancy = mean R of trades that have R
    var streak = streaks(units); s.maxWinStreak = streak.w; s.maxLossStreak = streak.l;
    return s;
  }
  function streaks(units) {
    var w = 0, l = 0, cw = 0, cl = 0;
    units.forEach(function (u) {
      if (u.kind === 'trade') { if (u.pl > 0) { cw++; cl = 0; } else if (u.pl < 0) { cl++; cw = 0; } else { cw = 0; cl = 0; } }
      else { if (u.pl > 0) { cw++; cl = 0; } else if (u.pl < 0) { cl++; cw = 0; } else { cw = 0; cl = 0; } } // day-level streak
      w = Math.max(w, cw); l = Math.max(l, cl);
    });
    return { w: w, l: l };
  }

  /* ---- equity & drawdown (units already sorted by date) ---- */
  function equity(units, mode) { // mode: 'pl' | 'r'
    var cum = 0, peak = 0, maxDD = 0, ddStart = null, longest = 0, curStart = null, pts = [];
    units.forEach(function (u) {
      var v = mode === 'r' ? u.r : u.pl; if (v === null || v === undefined) return;
      cum += v; if (cum >= peak) { peak = cum; curStart = null; } else { if (!curStart) curStart = u.date; }
      var dd = peak - cum; if (dd > maxDD) maxDD = dd;
      pts.push({ date: u.date, cum: fix0(cum), dd: fix0(-dd) });
    });
    return { points: pts, maxDrawdown: fix0(maxDD), final: pts.length ? pts[pts.length - 1].cum : null };
  }

  /* ---- grouping & combination mining ---- */
  var RELIABLE_DEFAULT = 30, INSIGHT_DEFAULT = 10;
  function reliability(n, minInsight, minReliable) {
    minInsight = minInsight || INSIGHT_DEFAULT; minReliable = minReliable || RELIABLE_DEFAULT;
    return n >= minReliable ? 'reliable' : n >= minInsight ? 'insight' : 'insufficient';
  }
  function groupBy(units, dimNames) { // dimNames: ['setup','session'] ; units missing any dim are excluded (and counted)
    var map = {}, skipped = 0;
    units.forEach(function (u) {
      var keys = dimNames.map(function (d) { return u.dims[d]; });
      if (keys.some(function (k) { return k === undefined || k === null || k === ''; })) { skipped += u.n; return; }
      var k = keys.join(' | '); (map[k] = map[k] || { key: k, parts: keys, units: [] }).units.push(u);
    });
    var rows = Object.keys(map).map(function (k) { var g = map[k]; g.stats = calc(g.units); return g; });
    rows.skippedTrades = skipped;
    return rows;
  }
  var COMBOS = [['pair', 'session'], ['pair', 'setup'], ['setup', 'session'], ['setup', 'direction'], ['session', 'dow'],
    ['setup', 'market'], ['setup', 'emotion'], ['pair', 'direction']];
  function findEdges(units, opt) {
    opt = opt || {}; var minI = opt.minInsight || INSIGHT_DEFAULT, minR = opt.minReliable || RELIABLE_DEFAULT, res = [];
    COMBOS.forEach(function (dims) {
      groupBy(units, dims).forEach(function (g) {
        var st = g.stats, tier = reliability(st.trades, minI, minR);
        if (tier === 'insufficient' || st.expectancy === null) return;
        res.push({ dims: dims, label: g.parts.join(' · '), tier: tier, stats: st, units: g.units });
      });
    });
    res.sort(function (a, b) { return (b.tier === 'reliable') - (a.tier === 'reliable') || b.stats.expectancy - a.stats.expectancy; });
    return res;
  }

  /* ---- V16.2 inclusive mode: a legacy day with several values for a dimension (e.g. 2 setups) is counted once per value.
   * The same P/L then appears under each value, so clones are flagged `shared`. Only the requested dims are expanded. ---- */
  function expand(units, dimNames) {
    var out = [];
    units.forEach(function (u) {
      if (!u.multi) { out.push(u); return; }
      var combos = [[]];
      dimNames.forEach(function (d) {
        var cur = u.dims[d], vals = (cur !== undefined && cur !== null && cur !== '') ? [cur] : ((u.multi[d] && u.multi[d].length > 1) ? u.multi[d] : [undefined]);
        var next = []; combos.forEach(function (c) { vals.forEach(function (v) { next.push(c.concat([v])); }); }); combos = next;
      });
      combos.forEach(function (c) {
        var dims = {}; Object.keys(u.dims).forEach(function (k) { dims[k] = u.dims[k]; });
        dimNames.forEach(function (d, i) { dims[d] = c[i]; });
        var cl = {}; Object.keys(u).forEach(function (k) { cl[k] = u[k]; });
        cl.dims = dims; cl.shared = !!u.shared || combos.length > 1;
        out.push(cl);
      });
    });
    return out;
  }

  /* ---- coverage: how much of the data supports a dimension (shown in UI so users know limits) ---- */
  function coverage(units, dim) {
    var tot = 0, has = 0; units.forEach(function (u) { tot += u.n; if (u.dims[dim] !== undefined && u.dims[dim] !== '') has += u.n; });
    return { total: tot, with: has, pct: tot ? has / tot * 100 : 0 };
  }

  /* ---- safe formatters: never "NaN"/"Infinity"/"undefined"/"-0" ---- */
  function fmt(v, d, suffix) { v = num(v); if (v === null) return '—'; d = d == null ? 2 : d; var s = fix0(+v.toFixed(d)); return (Object.is(s, -0) ? 0 : s).toFixed(d) + (suffix || ''); }


  /* =====================================================================
   * V16.4 — Psychology Analytics (descriptive only) + Trading Score (execution quality, never profit)
   * ===================================================================== */
  var NEG_EMOTIONS = ['Fearful', 'FOMO', 'Anxious', 'Revenge', 'Greedy', 'Frustrated'];

  /* Emotion x (nothing | setup | session | mistake). mode 'inclusive' counts a multi-tag day once per tag (flagged `shared`);
   * mode 'exact' only uses units with exactly one tag. Units lacking a needed dimension are excluded and counted. */
  function emotionTable(units, other, mode) {
    var dims = other ? ['emotion', other] : ['emotion'];
    var u = mode === 'exact' ? units : expand(units, dims);
    var rows = groupBy(u, dims);
    rows.forEach(function (g) { g.shared = g.units.some(function (x) { return !!x.shared; }); g.tier = reliability(g.stats.trades); });
    return rows;
  }

  /* Descriptive sentence. Never causal ("menyebabkan"), never advice. `mm` = money formatter. */
  var CTX = { setup: ' pada setup ', session: ' pada session ', mistake: ' dengan mistake tag ' };
  function describeEmotion(parts, stats, other, mm) {
    mm = mm || function (v) { return fmt(v, 2); };
    var who = 'Trade yang diberi tag ' + parts[0] + (other && parts[1] !== undefined ? (CTX[other] || ' × ') + parts[1] : '');
    var t = reliability(stats.trades);
    if (t === 'insufficient') return who + ': Insufficient data (' + stats.trades + ' trade).';
    var s = who + ' memiliki win rate ' + fmt(stats.winRate, 0, '%') + ', net P/L ' + mm(stats.net) + ' dan expectancy ' + mm(stats.expectancy) + ' per trade (n = ' + stats.trades + ' trade).';
    return t === 'insight' ? s + ' Sampel masih kecil.' : s;
  }

  var SCORE_WEIGHTS = { risk: 25, plan: 20, entry: 15, exit: 15, emotion: 15, checklist: 10 };
  var SCORE_KEYS = ['risk', 'plan', 'entry', 'exit', 'emotion', 'checklist'];
  var clamp100 = function (v) { return Math.max(0, Math.min(100, v)); };
  var ratio = function (o) { return (o && num(o.total) > 0 && num(o.done) !== null) ? clamp100(num(o.done) / num(o.total) * 100) : null; };

  /* rec: { risk:true|false|null, plan:{done,total}|number|null, entry:number|null, exit:number|null,
   *        emotions:[..], checklist:{done,total}|null }   (P/L is deliberately NOT an input)
   * -> { parts:{key:0-100|null}, used:n, total:0-100|null }. total needs >= 2 components with real data. */
  function scoreDay(rec) {
    rec = rec || {};
    var parts = {};
    parts.risk = rec.risk === true ? 100 : rec.risk === false ? 0 : null;
    parts.plan = typeof rec.plan === 'number' ? (num(rec.plan) === null ? null : clamp100(rec.plan)) : ratio(rec.plan);
    parts.entry = num(rec.entry) === null ? null : clamp100(num(rec.entry));
    parts.exit = num(rec.exit) === null ? null : clamp100(num(rec.exit));
    var em = list(rec.emotions);
    parts.emotion = em.length ? em.filter(function (e) { return NEG_EMOTIONS.indexOf(e) < 0; }).length / em.length * 100 : null;
    parts.checklist = ratio(rec.checklist);
    var used = 0, wsum = 0, acc = 0;
    SCORE_KEYS.forEach(function (k) { if (parts[k] !== null) { used++; wsum += SCORE_WEIGHTS[k]; acc += parts[k] * SCORE_WEIGHTS[k]; } });
    var total = used >= 2 ? Math.round(acc / wsum) : null;
    SCORE_KEYS.forEach(function (k) { if (parts[k] !== null) parts[k] = Math.round(parts[k]); });
    return { parts: parts, used: used, total: total };
  }

  /* Build per-day score records from journals + external day maps (checklist/risk/plans come from the device / diary, not the journal doc).
   * ext = { checklist:{date:{done,total}}, risk:{date:bool}, plans:{date:{done,total}} }.  Optional tradeLog fields:
   * followedPlan(bool) entryScore(0-100) exitScore(0-100). Dates with no usable data at all are dropped. */
  function buildScoreRecords(journals, ext, range) {
    ext = ext || {}; range = range || {};
    var byDate = {};
    var get = function (d) { return byDate[d] || (byDate[d] = { date: d, emotions: [], hasJournal: false, pl: null, trades: 0, tl: { fp: [], en: [], ex: [] } }); };
    (Array.isArray(journals) ? journals : []).forEach(function (j) {
      if (!j || !/^\d{4}-\d{2}-\d{2}$/.test(String(j.date || ''))) return;
      var r = get(j.date); r.hasJournal = true; r.pl = (r.pl || 0) + (num(j.pl) || 0); r.trades += Math.max(1, Math.floor(num(j.trades) || 1));
      list(j.emotions).forEach(function (e) { if (r.emotions.indexOf(e) < 0) r.emotions.push(e); });
      (Array.isArray(j.tradeLog) ? j.tradeLog : []).forEach(function (t) {
        if (!t) return;
        if (typeof t.followedPlan === 'boolean') r.tl.fp.push(t.followedPlan ? 100 : 0);
        if (num(t.entryScore) !== null) r.tl.en.push(clamp100(num(t.entryScore)));
        if (num(t.exitScore) !== null) r.tl.ex.push(clamp100(num(t.exitScore)));
        list(t.emotion).forEach(function (e) { if (r.emotions.indexOf(e) < 0) r.emotions.push(e); });
      });
    });
    ['checklist', 'risk', 'plans'].forEach(function (k) { Object.keys(ext[k] || {}).forEach(function (d) { if (/^\d{4}-\d{2}-\d{2}$/.test(d)) get(d); }); });
    var avg = function (a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; };
    var out = [];
    Object.keys(byDate).sort().forEach(function (d) {
      if (range.from && d < range.from) return; if (range.to && d > range.to) return;
      var r = byDate[d], plan = r.tl.fp.length ? avg(r.tl.fp) : (ext.plans && ext.plans[d]) || null;
      var sc = scoreDay({ risk: ext.risk && typeof ext.risk[d] === 'boolean' ? ext.risk[d] : null, plan: plan, entry: avg(r.tl.en), exit: avg(r.tl.ex),
        emotions: r.emotions, checklist: (ext.checklist && ext.checklist[d]) || null });
      if (sc.used === 0) return;
      out.push({ date: d, hasJournal: r.hasJournal, pl: r.hasJournal ? fix0(r.pl) : null, trades: r.trades, parts: sc.parts, used: sc.used, total: sc.total });
    });
    return out;
  }

  /* Summary over days: each component = mean over days that HAVE it (+ day count); overall = mean of day totals (days with total != null). */
  function scoreSummary(recs) {
    var comp = {}, tot = [], used = 0;
    SCORE_KEYS.forEach(function (k) {
      var v = recs.map(function (r) { return r.parts[k]; }).filter(function (x) { return x !== null && x !== undefined; });
      comp[k] = { score: v.length ? Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length) : null, days: v.length };
      if (v.length) used++;
    });
    recs.forEach(function (r) { if (r.total !== null) tot.push(r.total); });
    return { components: comp, componentsWithData: used, scoredDays: tot.length, days: recs.length,
      overall: tot.length ? Math.round(tot.reduce(function (a, b) { return a + b; }, 0) / tot.length) : null };
  }

  /* =====================================================================
   * V16.5 — Dashboard + Monthly Review (pure, descriptive only; never advice, never a trading recommendation)
   * ===================================================================== */
  var MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  function monthLabel(ym) { var m = /^(\d{4})-(\d{2})$/.exec(String(ym || '')); return m && +m[2] >= 1 && +m[2] <= 12 ? MONTHS_ID[+m[2] - 1] + ' ' + m[1] : '—'; }
  var SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function dateLabel(ds) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ds || '')); return m && +m[2] >= 1 && +m[2] <= 12 ? (+m[3]) + ' ' + SHORT_ID[+m[2] - 1] + ' ' + m[1] : '—'; }
  function shiftMonth(ym, delta) { var m = /^(\d{4})-(\d{2})$/.exec(String(ym || '')); if (!m) return null; var t = +m[1] * 12 + (+m[2] - 1) + delta; return Math.floor(t / 12) + '-' + String(t % 12 + 1).padStart(2, '0'); }
  function monthsOf(units) { var s = {}; units.forEach(function (u) { s[u.date.slice(0, 7)] = 1; }); return Object.keys(s).sort().reverse(); }

  /* one row per calendar day (several trades / journals on the same date are merged) */
  function dayTotals(units) {
    var map = {}, order = [];
    units.forEach(function (u) {
      var d = map[u.date]; if (!d) { d = map[u.date] = { date: u.date, pl: 0, trades: 0, wins: 0, jid: u.jid || '' }; order.push(u.date); }
      d.pl += u.pl; d.trades += u.n; d.wins += u.wins; if (!d.jid && u.jid) d.jid = u.jid;
    });
    return order.sort().map(function (k) { var d = map[k]; d.pl = fix0(d.pl); return d; });
  }

  /* equity curve with ONE point per date (the last cumulative value of that date) */
  function equityByDay(units) {
    var cum = 0, peak = 0, maxDD = 0, pts = [];
    dayTotals(units).forEach(function (d) {
      cum += d.pl; if (cum > peak) peak = cum; var dd = peak - cum; if (dd > maxDD) maxDD = dd;
      pts.push({ date: d.date, cum: fix0(cum), pl: d.pl, dd: fix0(-dd) });
    });
    return { points: pts, maxDrawdown: fix0(maxDD), final: pts.length ? pts[pts.length - 1].cum : null };
  }

  /* Monday-first month grid. cells[i] = null (padding) or {date, day, pl|null, trades, jid} */
  function calendarMonth(units, ym) {
    var m = /^(\d{4})-(\d{2})$/.exec(String(ym || '')); if (!m) return null;
    var y = +m[1], mo = +m[2] - 1, first = new Date(Date.UTC(y, mo, 1)), n = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    var lead = (first.getUTCDay() + 6) % 7, byDate = {}, maxAbs = 0, tradedDays = 0, cells = [], i;
    dayTotals(units.filter(function (u) { return u.date.slice(0, 7) === ym; })).forEach(function (d) { byDate[d.date] = d; maxAbs = Math.max(maxAbs, Math.abs(d.pl)); tradedDays++; });
    for (i = 0; i < lead; i++) cells.push(null);
    for (i = 1; i <= n; i++) {
      var ds = ym + '-' + String(i).padStart(2, '0'), d = byDate[ds];
      cells.push({ date: ds, day: i, pl: d ? d.pl : null, trades: d ? d.trades : 0, jid: d ? d.jid : '' });
    }
    return { ym: ym, cells: cells, maxAbs: maxAbs, tradedDays: tradedDays };
  }

  /* most frequent labels. Returns {top:[{key,count}], tie:bool} or null when there is nothing to count */
  function mostCommon(items) {
    var c = {}, any = false; items.forEach(function (k) { if (k === undefined || k === null || k === '') return; c[k] = (c[k] || 0) + 1; any = true; });
    if (!any) return null;
    var rows = Object.keys(c).map(function (k) { return { key: k, count: c[k] }; }).sort(function (a, b) { return b.count - a.count || (a.key < b.key ? -1 : 1); });
    var top = rows.filter(function (r) { return r.count === rows[0].count; });
    return { top: top, all: rows, tie: top.length > 1 };
  }
  /* emotions are counted once per (date, emotion); mistakes once per trade, and only trade-level units can carry them */
  function unitEmotions(u) { return (u.multi && u.multi.emotion && u.multi.emotion.length) ? u.multi.emotion : (u.dims.emotion ? [u.dims.emotion] : []); }
  function unitMistakes(u) { return u.kind !== 'trade' ? [] : ((u.multi && u.multi.mistake && u.multi.mistake.length) ? u.multi.mistake : (u.dims.mistake ? [u.dims.mistake] : [])); }
  function emotionDays(units) {
    var seen = {}, out = [];
    units.forEach(function (u) { unitEmotions(u).forEach(function (e) { var k = u.date + '|' + e; if (!seen[k]) { seen[k] = 1; out.push({ date: u.date, emotion: e }); } }); });
    return out;
  }

  /* best / worst group of a dimension (exact mode: only units with exactly one value). best needs net > 0, worst needs net < 0. */
  function bestWorst(units, dim) {
    var g = groupBy(units, [dim]).filter(function (x) { return x.stats.trades > 0; });
    g.sort(function (a, b) { return b.stats.net - a.stats.net || (a.key < b.key ? -1 : 1); });
    var pack = function (x) { return x ? { key: x.key, stats: x.stats, tier: reliability(x.stats.trades) } : null; };
    var best = g.length && g[0].stats.net > 0 ? g[0] : null, worst = g.length && g[g.length - 1].stats.net < 0 ? g[g.length - 1] : null;
    return { best: pack(best), worst: pack(worst), groups: g.length, cov: coverage(units, dim) };
  }

  var POS_FILTER = function (e) { return NEG_EMOTIONS.indexOf(e) < 0; };

  /* Full monthly review for 'YYYY-MM'. opt.mm = money formatter. Returns null when the month has no data. */
  function monthReview(units, ym, opt) {
    opt = opt || {}; var mm = opt.mm || function (v) { return fmt(v, 2); };
    var mu = units.filter(function (u) { return u.date.slice(0, 7) === ym; });
    if (!mu.length) return null;
    var s = calc(mu), eq = equityByDay(mu), days = dayTotals(mu), r = { month: ym, label: monthLabel(ym), units: mu, stats: s, tradeLevel: s.tradeLevel, days: days.length };
    r.maxDrawdown = eq.maxDrawdown; r.equity = eq.points;
    var sorted = days.slice().sort(function (a, b) { return b.pl - a.pl || (a.date < b.date ? -1 : 1); });
    r.bestDay = sorted[0]; r.worstDay = sorted.length > 1 ? sorted[sorted.length - 1] : null;
    r.profitDays = days.filter(function (d) { return d.pl > 0; }).length; r.lossDays = days.filter(function (d) { return d.pl < 0; }).length;
    r.pair = bestWorst(mu, 'pair'); r.setup = bestWorst(mu, 'setup'); r.session = bestWorst(mu, 'session');
    var ed = emotionDays(mu); r.emotionCoverageDays = (function () { var s2 = {}; ed.forEach(function (x) { s2[x.date] = 1; }); return Object.keys(s2).length; })();
    r.topEmotion = mostCommon(ed.map(function (x) { return x.emotion; }));
    var mk = []; mu.forEach(function (u) { unitMistakes(u).forEach(function (k) { mk.push(k); }); }); r.topMistake = mostCommon(mk);
    var negDays = {}, posDays = {}; ed.forEach(function (x) { if (POS_FILTER(x.emotion)) posDays[x.date] = 1; else negDays[x.date] = 1; });
    var negList = Object.keys(negDays), dayMap = {}; days.forEach(function (d) { dayMap[d.date] = d; });
    r.negEmotion = { days: negList.length, net: fix0(negList.reduce(function (a, d) { return a + (dayMap[d] ? dayMap[d].pl : 0); }, 0)),
      names: (function () { var n = {}; ed.forEach(function (x) { if (!POS_FILTER(x.emotion)) n[x.emotion] = 1; }); return Object.keys(n).sort(); })() };
    var prevYm = shiftMonth(ym, -1), pu = units.filter(function (u) { return u.date.slice(0, 7) === prevYm; });
    r.prev = pu.length ? { month: prevYm, label: monthLabel(prevYm), stats: calc(pu) } : null;

    var well = [], imp = [], small = function (n) { return n < INSIGHT_DEFAULT ? ' (sampel kecil)' : ''; }, pfTxt = s.profitFactor !== null ? fmt(s.profitFactor, 2) : null;
    if (s.net > 0) well.push('Net P/L bulan ini positif: ' + mm(s.net) + ' dari ' + s.trades + ' trade.');
    if (s.winRate !== null && s.winRate >= 50) well.push('Win rate ' + fmt(s.winRate, 1, '%') + ': ' + s.wins + ' win dari ' + s.trades + ' trade' + small(s.trades) + '.');
    if (pfTxt !== null && s.profitFactor > 1) well.push('Profit factor ' + pfTxt + ': total profit lebih besar dari total loss' + (s.tradeLevel ? '' : ' (dihitung per hari)') + '.');
    if (s.profitFactor === null && s.gp > 0 && s.gl === 0) well.push('Tidak ada hari/trade rugi pada bulan ini; profit factor tidak dapat dihitung.');
    if (r.bestDay && r.bestDay.pl > 0) well.push('Hari terbaik ' + dateLabel(r.bestDay.date) + ': ' + mm(r.bestDay.pl) + '.');
    if (days.length >= 2 && r.profitDays / days.length >= 0.5) well.push(r.profitDays + ' dari ' + days.length + ' hari trading ditutup profit.');
    [['setup', 'Setup'], ['pair', 'Pair'], ['session', 'Session']].forEach(function (d) { var b = r[d[0]].best; if (b) well.push(d[1] + ' ' + b.key + ' mencatat net ' + mm(b.stats.net) + ' dari ' + b.stats.trades + ' trade' + small(b.stats.trades) + '.'); });
    if (r.emotionCoverageDays >= 2) { var posOnly = Object.keys(posDays).filter(function (d) { return !negDays[d]; }).length; if (posOnly / r.emotionCoverageDays >= 0.5) well.push(posOnly + ' dari ' + r.emotionCoverageDays + ' hari yang diberi tag emosi hanya memakai tag emosi non-negatif.'); }
    if (r.prev && s.net > r.prev.stats.net) well.push('Net P/L lebih tinggi dari ' + r.prev.label + ' (' + mm(r.prev.stats.net) + ' → ' + mm(s.net) + ').');

    if (s.net < 0) imp.push('Net P/L bulan ini negatif: ' + mm(s.net) + ' dari ' + s.trades + ' trade.');
    if (s.winRate !== null && s.winRate < 50) imp.push('Win rate ' + fmt(s.winRate, 1, '%') + ': ' + s.wins + ' win dari ' + s.trades + ' trade' + small(s.trades) + '.');
    if (pfTxt !== null && s.profitFactor < 1) imp.push('Profit factor ' + pfTxt + ': total loss lebih besar dari total profit' + (s.tradeLevel ? '' : ' (dihitung per hari)') + '.');
    if (r.maxDrawdown > 0 && (s.net <= 0 || r.maxDrawdown >= 0.5 * s.gp)) imp.push('Max drawdown pada kurva P/L bulan ini ' + mm(r.maxDrawdown) + '.');
    if (r.worstDay && r.worstDay.pl < 0) imp.push('Hari terburuk ' + dateLabel(r.worstDay.date) + ': ' + mm(r.worstDay.pl) + '.');
    [['setup', 'Setup'], ['pair', 'Pair'], ['session', 'Session']].forEach(function (d) { var w = r[d[0]].worst; if (w) imp.push(d[1] + ' ' + w.key + ' mencatat net ' + mm(w.stats.net) + ' dari ' + w.stats.trades + ' trade' + small(w.stats.trades) + '.'); });
    if (r.negEmotion.days > 0) imp.push(r.negEmotion.days + ' hari diberi tag emosi negatif (' + r.negEmotion.names.join(', ') + '); net P/L hari-hari tersebut ' + mm(r.negEmotion.net) + '.');
    if (r.topMistake) imp.push('Mistake tag paling sering: ' + r.topMistake.top.map(function (t) { return t.key; }).join(', ') + ' (' + r.topMistake.top[0].count + ' trade).');
    if (s.maxLossStreak >= 3) imp.push('Streak loss terpanjang: ' + s.maxLossStreak + (s.tradeLevel ? ' trade' : ' hari') + ' berturut-turut.');
    if (r.prev && s.net < r.prev.stats.net) imp.push('Net P/L lebih rendah dari ' + r.prev.label + ' (' + mm(r.prev.stats.net) + ' → ' + mm(s.net) + ').');
    r.well = well; r.improve = imp;
    return r;
  }

  /* ---- v16.40 Command Center: drawdown & perbandingan periode (murni, tanpa DOM) ---- */
  var ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function addDays(ds, n) { var m = ISO.exec(String(ds || '')); if (!m) return null; return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + n * 864e5).toISOString().slice(0, 10); }

  /* Kurva drawdown dari titik equity {date,cum}. Puncak awal = 0 (sama seperti equity()/equityByDay()). */
  function drawdownInfo(points) {
    var peak = 0, peakDate = null, maxDD = 0, maxDate = null, series = [];
    (points || []).forEach(function (p) {
      if (p.cum >= peak) { if (p.cum > peak || peakDate === null) peakDate = p.date; peak = p.cum; }
      var dd = peak - p.cum; if (dd > maxDD) { maxDD = dd; maxDate = p.date; }
      series.push({ date: p.date, dd: fix0(-dd), cum: p.cum, peak: peak });
    });
    var cur = series.length ? -series[series.length - 1].dd : 0;
    return { series: series, maxDD: fix0(maxDD), maxDate: maxDate, curDD: fix0(cur), peak: peak, peakDate: peakDate, under: cur > 0 };
  }

  /* Jendela periode berjalan vs periode sebelumnya dengan rentang hari yang SAMA (adil untuk periode yang belum selesai).
   * kind: 'week' (Senin–hari ini), 'month' (tgl 1–hari ini), atau 7 / 30 / 90 hari bergulir. */
  function periodWindows(today, kind) {
    var m = ISO.exec(String(today || '')); if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3], cf, pf, pt, el;
    if (kind === 'week') {
      var back = (new Date(Date.UTC(y, mo - 1, d)).getUTCDay() + 6) % 7; // Senin = 0
      cf = addDays(today, -back); el = back + 1; pf = addDays(cf, -7); pt = addDays(pf, el - 1);
      return { kind: kind, elapsed: el, clipped: false, cur: { from: cf, to: today }, prev: { from: pf, to: pt } };
    }
    if (kind === 'month') {
      var py = mo === 1 ? y - 1 : y, pm = mo === 1 ? 12 : mo - 1, plen = new Date(Date.UTC(py, pm, 0)).getUTCDate();
      cf = y + '-' + pad2(mo) + '-01'; pf = py + '-' + pad2(pm) + '-01'; el = d; pt = addDays(pf, Math.min(el, plen) - 1);
      return { kind: kind, elapsed: el, clipped: el > plen, cur: { from: cf, to: today }, prev: { from: pf, to: pt } };
    }
    var n = +kind; if (n !== 7 && n !== 30 && n !== 90) return null;
    return { kind: String(n), elapsed: n, clipped: false, cur: { from: addDays(today, -(n - 1)), to: today }, prev: { from: addDays(today, -(2 * n - 1)), to: addDays(today, -n) } };
  }
  function periodSide(units, r) {
    var us = units.filter(function (u) { return u.date >= r.from && u.date <= r.to; }), s = calc(us), eq = equityByDay(us);
    return { from: r.from, to: r.to, has: us.length > 0, trades: s.trades, days: dayTotals(us).length, net: s.net, winRate: s.winRate, pf: s.profitFactor, exp: s.expectancy, dd: eq.maxDrawdown, tradeLevel: s.tradeLevel };
  }
  var CMP_ROWS = [ // good: arah mana yang "lebih baik" (none = netral, tidak diberi warna baik/buruk)
    { id: 'net', label: 'Net P/L', f: 'net', kind: 'money', good: 'up' },
    { id: 'wr', label: 'Win Rate', f: 'winRate', kind: 'rate', good: 'up' },
    { id: 'pf', label: 'Profit Factor', f: 'pf', kind: 'ratio', good: 'up' },
    { id: 'exp', label: 'Expectancy', f: 'exp', kind: 'money', good: 'up' },
    { id: 'dd', label: 'Max Drawdown', f: 'dd', kind: 'money0', good: 'down' },
    { id: 'tr', label: 'Total Trade', f: 'trades', kind: 'int', good: 'none' },
    { id: 'dy', label: 'Hari Trading', f: 'days', kind: 'int', good: 'none' }
  ];
  function comparePeriods(units, today, kind) {
    var w = periodWindows(today, kind); if (!w) return null;
    var cur = periodSide(units, w.cur), prev = periodSide(units, w.prev);
    var rows = CMP_ROWS.map(function (r) {
      var c = num(cur[r.f]), p = num(prev[r.f]), delta = (c !== null && p !== null) ? fix0(c - p) : null;
      var pct = (delta !== null && p !== 0) ? delta / Math.abs(p) * 100 : null;
      var dir = delta === null || delta === 0 ? 0 : delta > 0 ? 1 : -1, tone = 'zero';
      if (dir !== 0 && r.good !== 'none') tone = (dir > 0) === (r.good === 'up') ? 'pos' : 'neg';
      return { id: r.id, label: r.label, kind: r.kind, cur: c, prev: p, delta: delta, pct: pct === null ? null : fix0(pct), tone: tone, good: r.good };
    });
    return { kind: w.kind, elapsed: w.elapsed, clipped: w.clipped, cur: cur, prev: prev, rows: rows };
  }

  /* Dashboard summary over any unit list (already filtered by the caller) */
  function dashboardSummary(units) {
    var s = calc(units), eq = equityByDay(units);
    return { stats: s, equity: eq.points, maxDrawdown: eq.maxDrawdown, days: dayTotals(units).length, empty: !units.length };
  }

  var API = { normalize: normalize, applyFilters: applyFilters, filterOptions: filterOptions, calc: calc, equity: equity, groupBy: groupBy, expand: expand, findEdges: findEdges,
    reliability: reliability, coverage: coverage, fmt: fmt, num: num, list: list, DOW: DOW,
    NEG_EMOTIONS: NEG_EMOTIONS, emotionTable: emotionTable, describeEmotion: describeEmotion, SCORE_WEIGHTS: SCORE_WEIGHTS, SCORE_KEYS: SCORE_KEYS,
    scoreDay: scoreDay, buildScoreRecords: buildScoreRecords, scoreSummary: scoreSummary,
    monthLabel: monthLabel, dateLabel: dateLabel, shiftMonth: shiftMonth, monthsOf: monthsOf, dayTotals: dayTotals, equityByDay: equityByDay, calendarMonth: calendarMonth,
    mostCommon: mostCommon, emotionDays: emotionDays, bestWorst: bestWorst, monthReview: monthReview, dashboardSummary: dashboardSummary,
    ACCOUNTS: ACCOUNTS, acctKey: acctKey, acctLabel: acctLabel, addDays: addDays, drawdownInfo: drawdownInfo, periodWindows: periodWindows, comparePeriods: comparePeriods };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.V16Stats = API;
})(typeof window !== 'undefined' ? window : globalThis);
