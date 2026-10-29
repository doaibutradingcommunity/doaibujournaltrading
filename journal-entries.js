/* v16.58 · Journal seperti buku: 1 tanggal = 1 halaman, isinya susunan trade.
   Dokumen Firestore tetap 1 per tanggal (id = tanggal) supaya Kalender, Statistik, AI Coach, dll tetap jalan.
   Di dalamnya ada `entries`: daftar trade. Field level-hari (pl, trades, wins, be, pair, tags, ...) selalu
   DIHITUNG ULANG dari entries setiap kali ada yang disimpan/diedit/dihapus, jadi tidak pernah melenceng.
   Dokumen lama (tanpa entries) dibaca sebagai 1 entri "legacy" dan baru dipecah saat kamu menambah trade. */
(function () {
  'use strict';

  var ENTRY_KEYS = ['pl', 'trades', 'wins', 'be', 'pair', 'tags', 'accountType', 'bias', 'session', 'emotions', 'notes',
    'charts', 'riskPct', 'rMultiple', 'rating', 'strategyId', 'strategyName', 'strategyLog', 'fees',
    'source', 'externalId', 'accountId', 'syncedAt', 'needsReflection'];

  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function csv(s) { return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); }
  function uniq(a) { var seen = {}, out = []; a.forEach(function (x) { if (x && !seen[x]) { seen[x] = 1; out.push(x); } }); return out; }
  function ms(v) {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    if (typeof v.toMillis === 'function') { try { return v.toMillis(); } catch (e) {} }
    if (typeof v.seconds === 'number') return v.seconds * 1000;
    return 0;
  }
  function round2(n) { return Math.round(n * 100) / 100; }
  function newEid() { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* Salin hanya field entri dari objek apa pun (dokumen lama / baris form). */
  function pick(src) {
    var e = {};
    ENTRY_KEYS.forEach(function (k) { if (src[k] !== undefined) e[k] = src[k]; });
    return e;
  }

  /* Daftar trade pada satu halaman hari. Dokumen lama dibaca sebagai 1 entri. */
  function entriesOf(day) {
    if (!day) return [];
    if (Array.isArray(day.entries) && day.entries.length) {
      return day.entries.filter(function (e) { return e && typeof e === 'object'; });
    }
    var e = pick(day);
    e.eid = 'legacy'; e.legacy = true;
    e.trades = day.trades || 1;
    e.createdMs = ms(day.createdAt);
    return [e];
  }

  /* Urutan di dalam satu hari: yang dibuat lebih dulu = Trade 1. */
  function ordered(entries) {
    return entries.map(function (e, i) { return { e: e, i: i }; }).sort(function (a, b) {
      var ta = ms(a.e.createdMs), tb = ms(b.e.createdMs);
      return (ta - tb) || (a.i - b.i);
    }).map(function (x) { return x.e; });
  }

  function winsOf(e) {
    var n = e.trades || 1;
    if (typeof e.wins === 'number') return Math.max(0, Math.min(e.wins, n));
    return (e.pl || 0) > 0 ? n : 0;
  }
  function beOf(e) {
    var n = e.trades || 1, w = typeof e.wins === 'number' ? Math.max(0, Math.min(e.wins, n)) : 0;
    return typeof e.be === 'number' ? Math.max(0, Math.min(e.be, n - w)) : 0;
  }

  /* Hitung field level-hari dari daftar entri. Hanya mengembalikan field turunan (tanpa menyentuh field lain). */
  function derive(entries) {
    var list = ordered(entries), out = {};
    var pl = 0, trades = 0, wins = 0, be = 0, r = null, pairs = [], tags = [], emos = [], sess = [], notes = [], charts = [];
    var acc = '', risk = null, rating = null, log = [], biasSet = {}, lastBias = '', fees = null;
    var acctId = '', src = '', extId = '', syncAt = '';
    list.forEach(function (e) {
      pl += e.pl || 0; trades += (e.trades || 1); wins += winsOf(e); be += beOf(e);
      if (num(e.rMultiple) !== null) r = (r || 0) + e.rMultiple;
      if (num(e.fees) !== null) fees = (fees || 0) + e.fees;
      pairs = pairs.concat(csv(e.pair)); tags = tags.concat(arr(e.tags)); emos = emos.concat(arr(e.emotions));
      sess = sess.concat(csv(e.session));
      if (e.notes) notes.push(e.notes);
      charts = charts.concat(arr(e.charts));
      if (e.accountType) acc = e.accountType;
      if (e.accountId) acctId = e.accountId;
      if (e.source) src = e.source;
      if (e.externalId) extId = e.externalId;
      if (e.syncedAt) syncAt = e.syncedAt;
      if (num(e.riskPct) !== null) risk = e.riskPct;
      if (num(e.rating) !== null && e.rating >= 1) rating = e.rating;
      if (e.bias) { biasSet[e.bias] = 1; lastBias = e.bias; }
      if (Array.isArray(e.strategyLog) && e.strategyLog.length) log = log.concat(e.strategyLog);
      else if (e.strategyId) log.push({ id: e.strategyId, name: e.strategyName || '', checked: 0, total: 0, reqMissed: 0, items: [] });
    });
    var biasKeys = Object.keys(biasSet);
    out.pl = round2(pl);
    out.trades = trades;
    out.wins = wins;
    out.be = be;
    out.rMultiple = r === null ? null : round2(r);
    out.fees = fees === null ? null : round2(fees);   // biaya (komisi+swap+fee), + = biaya; null = datanya tidak ada
    out.riskPct = risk;
    out.rating = rating;
    out.pair = uniq(pairs).join(', ');
    out.tags = uniq(tags);
    out.emotions = uniq(emos);
    out.session = uniq(sess).join(', ');
    out.notes = notes.join('\n\n');
    out.charts = charts;
    out.accountType = acc;
    if (acctId) out.accountId = acctId;
    if (src) out.source = src;
    if (extId) out.externalId = extId;
    if (syncAt) out.syncedAt = syncAt;
    out.bias = biasKeys.length > 1 ? 'Neutral' : (lastBias || '');
    log = log.slice(-30);
    var last = log[log.length - 1];
    out.strategyLog = log;
    out.strategyId = last ? last.id : null;
    out.strategyName = last ? (last.name || '') : null;
    return out;
  }

  /* Field yang ditulis ke dokumen hari: entries + semua field turunan. */
  function dayPatch(entries) {
    var d = derive(entries);
    d.entries = ordered(entries);
    return d;
  }

  /* Satu baris riwayat per trade. `row.id` = "tanggal~eid" (unik), `row.dayId` = id dokumen hari. */
  function rowsOf(day) {
    var list = ordered(entriesOf(day)), n = list.length;
    return list.map(function (e, i) {
      var row = Object.assign({}, day, pick(e));
      delete row.entries;
      row.trades = e.trades || 1;
      row.id = day.id + '~' + (e.eid || 'legacy');
      row.dayId = day.id;
      row.eid = e.eid || 'legacy';
      row.tradeNo = i + 1;
      row.dayCount = n;
      row.legacy = !!e.legacy;
      row.createdMs = ms(e.createdMs) || 0;
      /* Field yang tidak diisi pada entri tidak boleh "bocor" dari level hari. */
      ['notes', 'tags', 'emotions', 'charts', 'pair', 'session', 'accountType', 'bias', 'source', 'externalId', 'accountId', 'syncedAt'].forEach(function (k) {
        if (e[k] === undefined) row[k] = (k === 'tags' || k === 'emotions' || k === 'charts') ? [] : '';
      });
      ['riskPct', 'rMultiple', 'rating', 'strategyId', 'strategyName', 'fees'].forEach(function (k) { if (e[k] === undefined) row[k] = null; });
      row.needsReflection = !!e.needsReflection;
      if (e.strategyLog === undefined) row.strategyLog = [];
      return row;
    });
  }

  function parseKey(key) {
    var s = String(key || ''), i = s.indexOf('~');
    return i < 0 ? { dayId: s, eid: '' } : { dayId: s.slice(0, i), eid: s.slice(i + 1) };
  }

  window.JEntries = {
    entriesOf: entriesOf, ordered: ordered, derive: derive, dayPatch: dayPatch, rowsOf: rowsOf,
    parseKey: parseKey, newEid: newEid, pick: pick, winsOf: winsOf, beOf: beOf, ms: ms, version: '16.58'
  };
})();
