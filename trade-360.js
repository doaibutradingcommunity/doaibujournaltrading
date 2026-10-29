/* v16.51 · Trade Journal 360°
   Halaman analisis lengkap per transaksi: Overview, Timeline eksekusi, Sebelum vs Sesudah,
   Kepatuhan rule, Review pasca-trade, dan Riwayat edit.

   Data (semua opsional, ditambahkan ke dokumen journal yang sudah ada; tidak perlu ubah Firestore Rules):
     users/{uid}/journals/{tanggal}.t360       = [ { id, pair, side, entry, exit, sl, tp, size, pl, openAt, closeAt,
                                                      pEntry, pSL, pTP, imgPlan, imgActual, noteBefore, noteAfter,
                                                      tl:[{id,ph,at,tx}], rules:[{id,t,g,req,s,n}],
                                                      mistakeType, mistake, lesson, next, nextDone, ca, ua } ]
     users/{uid}/journals/{tanggal}.t360Hist   = [ { at, k:'new'|'upd'|'del', rid, n, p, c:[{f,a,b,x,k}], m } ]  (maks 120)
     users/{uid}/journals/{tanggal}.t360UpdatedAt

   Satu dokumen journal = satu hari (bisa banyak trade), jadi tiap trade punya rekaman sendiri di array t360.
   Jalur simpan lama memakai update / set merge sehingga t360 tidak tertimpa.
   Membaca: allJournals, db, currentUser, uploadToImgBB, showToast (global dari index.html). Tanpa library baru. */
(function () {
  'use strict';

  var MAXR = 12, MAXH = 120, MAXTL = 40, MAXRULES = 40;

  /* ===================== Teks ===================== */
  var D = {
    id: {
      title: 'Trade Journal 360°', back: 'Kembali', close: 'Tutup', comp: 'Kelengkapan',
      ctaSub: 'Timeline keputusan, sebelum vs sesudah, kepatuhan rule, dan review dalam satu halaman.',
      ctaStart: 'Mulai', ctaOpen: 'Buka 360°', ctaTrades: 'trade', ctaFull: 'lengkap',
      s_ov: 'Overview', s_tl: 'Timeline', s_ba: 'Sebelum vs Sesudah', s_rl: 'Aturan', s_rv: 'Review', s_hs: 'Riwayat',
      d_ov: 'Instrumen, arah, harga, dan hasil', d_tl: 'Urutan keputusan dari sebelum entry sampai penutupan',
      d_ba: 'Rencana dibandingkan dengan eksekusi aktual', d_rl: 'Rule yang dipatuhi, dilanggar, atau tidak relevan',
      d_rv: 'Kesalahan utama, pelajaran, dan tindakan berikutnya', d_hs: 'Jejak perubahan catatan',
      trade: 'Trade', addTrade: 'Tambah trade', delTrade: 'Hapus trade ini', maxTrades: 'Maksimal 12 trade per hari.',
      pair: 'Instrumen', side: 'Arah', Long: 'Long', Short: 'Short', entry: 'Entry', exit: 'Exit', sl: 'Stop Loss', tp: 'Take Profit',
      size: 'Ukuran (lot)', pl: 'P/L', openAt: 'Waktu buka', closeAt: 'Waktu tutup',
      res: 'Hasil', profit: 'Profit', loss: 'Loss', be: 'BE', rrPlan: 'R/R rencana', rAct: 'R aktual', dur: 'Durasi', pips: 'Gerak harga',
      badSL: 'Stop Loss berada di sisi yang salah untuk arah {s}.', badTP: 'Take Profit berada di sisi yang salah untuk arah {s}.',
      noSide: 'Pilih arah (Long/Short) agar R/R bisa dihitung.', badTime: 'Waktu tutup lebih awal dari waktu buka.',
      multi: 'Journal hari ini berisi {n} trade; {m} sudah dianalisis di 360°.',
      sum: 'Total P/L trade 360°: {a} · total journal hari ini: {b}',
      tl_before: 'Sebelum entry', tl_entry: 'Entry', tl_manage: 'Manajemen posisi', tl_exit: 'Penutupan',
      ph_before: 'Apa yang kamu lihat dan tunggu sebelum entry?', ph_entry: 'Konfirmasi apa yang memicu entry?',
      ph_manage: 'Keputusan saat posisi berjalan (geser SL, partial, tahan)…', ph_exit: 'Kenapa kamu menutup posisi?',
      autoEntry: 'Entry di {p}', autoExit: 'Exit di {p}', fillPrice: 'isi harga di Overview', emptyTl: 'Belum ada langkah. Mulai dari apa yang kamu lakukan sebelum entry.',
      time: 'Waktu', del: 'Hapus', phase: 'Fase',
      plan: 'Rencana', actual: 'Eksekusi aktual', upload: 'Unggah screenshot', pickChart: 'Dari chart journal', replace: 'Ganti', remove: 'Hapus',
      uploading: 'Mengunggah…', upFail: 'Gagal mengunggah: ', notImg: 'File harus berupa gambar.', tooBig: 'Gambar terlalu besar (maks 15 MB).',
      noUp: 'Fitur unggah belum siap. Muat ulang halaman.', zoom: 'Perbesar',
      noteBefore: 'Catatan rencana: skenario, level kunci, invalidasi…', noteAfter: 'Catatan eksekusi: apa yang berbeda dari rencana?',
      pEntry: 'Entry rencana', pSL: 'SL rencana', pTP: 'TP rencana',
      param: 'Parameter', cPlan: 'Rencana', cAct: 'Aktual', cDiff: 'Selisih', rEntry: 'Entry', rSL: 'Stop Loss', rTgt: 'Target / Exit', rRR: 'R/R',
      baHint: 'Isi harga rencana untuk melihat selisih dengan eksekusi.',
      ok: 'Dipatuhi', viol: 'Dilanggar', na: 'Tidak relevan', un: 'Belum dinilai', score: 'Kepatuhan', req: 'wajib',
      addRule: 'Tambah rule sendiri…', add: 'Tambah', loadRules: 'Muat dari journal', noRules: 'Belum ada rule. Tambahkan sendiri atau muat dari checklist journal.',
      violNote: 'Kenapa dilanggar?', reqViol: '{n} rule wajib dilanggar', loaded: '{n} rule ditambahkan', nothingLoad: 'Tidak ada rule baru untuk dimuat.',
      g_setup: 'Setup', g_entry: 'Entry', g_risk: 'Risiko', g_mgmt: 'Manajemen',
      mistakeT: 'Kesalahan utama', mt_none: 'Tidak ada kesalahan', mt_early: 'Entry terlalu awal', mt_late: 'Entry terlambat / mengejar',
      mt_sl: 'Geser / hapus SL', mt_size: 'Risiko / size berlebih', mt_fomo: 'FOMO / revenge', mt_rule: 'Melanggar rule',
      mt_exit: 'Exit terlalu cepat / lambat', mt_other: 'Lainnya',
      mistake: 'Apa yang terjadi', mistakePh: 'Jelaskan kesalahan utamanya, atau apa yang sudah benar…',
      lesson: 'Pelajaran', lessonPh: 'Apa yang kamu pelajari dari trade ini?',
      next: 'Tindakan berikutnya', nextPh: 'Satu tindakan konkret untuk trade berikutnya', nextDone: 'Sudah dilakukan', violCtx: 'Rule dilanggar di trade ini: ',
      hist: 'Riwayat perubahan', histThis: 'Trade ini', histAll: 'Semua trade', noHist: 'Belum ada riwayat. Perubahan tercatat setelah kamu menyimpan.',
      histNote: 'Hanya perubahan yang sudah disimpan.', created: 'Dibuat', removed: 'Trade dihapus', more: 'dan {n} perubahan lain', showAll: 'Tampilkan semua',
      empty: '(kosong)', tlAdd: 'Timeline +', tlDel: 'Timeline −', tlEdit: 'Timeline diubah', imgAdd: 'ditambahkan', imgRep: 'diganti', imgDel: 'dihapus',
      ruleAdd: 'Rule ditambahkan', ruleDel: 'Rule dihapus', ruleNote: 'catatan diubah', rule: 'Rule', imgPlan: 'Screenshot rencana', imgActual: 'Screenshot aktual', trade_: 'Trade',
      dirty: 'Ada perubahan belum disimpan', saved: 'Semua perubahan tersimpan', unsaved: 'Belum disimpan ke akun', save: 'Simpan', saving: 'Menyimpan…', discard: 'Buang perubahan',
      saveOk: 'Trade 360° tersimpan', saveNone: 'Tidak ada perubahan', saveFail: 'Gagal menyimpan: ',
      conflict: 'Data ini diubah dari perangkat atau tab lain sejak kamu membukanya. Timpa dengan versi kamu?',
      discardQ: 'Buang semua perubahan yang belum disimpan?', closeQ: 'Ada perubahan belum disimpan. Tutup tanpa menyimpan?',
      delQ: 'Hapus trade ini dari analisis 360°? Penghapusan tetap tercatat di riwayat.', notFound: 'Journal tidak ditemukan.', needLogin: 'Masuk ke akun untuk menyimpan.',
      d: 'h', hh: 'j', mm: 'm', locale: 'id-ID'
    },
    en: {
      title: 'Trade Journal 360°', back: 'Back', close: 'Close', comp: 'Completeness',
      ctaSub: 'Decision timeline, before vs after, rule compliance and review on one page.',
      ctaStart: 'Start', ctaOpen: 'Open 360°', ctaTrades: 'trade', ctaFull: 'complete',
      s_ov: 'Overview', s_tl: 'Timeline', s_ba: 'Before vs After', s_rl: 'Rules', s_rv: 'Review', s_hs: 'History',
      d_ov: 'Instrument, direction, prices and result', d_tl: 'Decisions from before entry until close',
      d_ba: 'Plan compared with the actual execution', d_rl: 'Rules followed, broken or not relevant',
      d_rv: 'Main mistake, lesson and next action', d_hs: 'Trail of changes to your notes',
      trade: 'Trade', addTrade: 'Add trade', delTrade: 'Delete this trade', maxTrades: 'Maximum 12 trades per day.',
      pair: 'Instrument', side: 'Direction', Long: 'Long', Short: 'Short', entry: 'Entry', exit: 'Exit', sl: 'Stop Loss', tp: 'Take Profit',
      size: 'Size (lots)', pl: 'P/L', openAt: 'Opened', closeAt: 'Closed',
      res: 'Result', profit: 'Profit', loss: 'Loss', be: 'BE', rrPlan: 'Planned R/R', rAct: 'Actual R', dur: 'Duration', pips: 'Price move',
      badSL: 'Stop Loss is on the wrong side for a {s} trade.', badTP: 'Take Profit is on the wrong side for a {s} trade.',
      noSide: 'Pick a direction (Long/Short) to calculate R/R.', badTime: 'Close time is earlier than open time.',
      multi: "Today's journal holds {n} trades; {m} analysed in 360°.",
      sum: 'Total 360° trade P/L: {a} · journal total today: {b}',
      tl_before: 'Before entry', tl_entry: 'Entry', tl_manage: 'Trade management', tl_exit: 'Close',
      ph_before: 'What did you see and wait for before entering?', ph_entry: 'What confirmation triggered the entry?',
      ph_manage: 'Decisions while the trade ran (move SL, partial, hold)…', ph_exit: 'Why did you close the position?',
      autoEntry: 'Entry at {p}', autoExit: 'Exit at {p}', fillPrice: 'fill the price in Overview', emptyTl: 'No steps yet. Start with what you did before entering.',
      time: 'Time', del: 'Delete', phase: 'Phase',
      plan: 'Plan', actual: 'Actual execution', upload: 'Upload screenshot', pickChart: 'From journal charts', replace: 'Replace', remove: 'Remove',
      uploading: 'Uploading…', upFail: 'Upload failed: ', notImg: 'The file must be an image.', tooBig: 'Image too large (max 15 MB).',
      noUp: 'Upload is not ready. Reload the page.', zoom: 'Enlarge',
      noteBefore: 'Plan notes: scenario, key levels, invalidation…', noteAfter: 'Execution notes: what differed from the plan?',
      pEntry: 'Planned entry', pSL: 'Planned SL', pTP: 'Planned TP',
      param: 'Parameter', cPlan: 'Plan', cAct: 'Actual', cDiff: 'Difference', rEntry: 'Entry', rSL: 'Stop Loss', rTgt: 'Target / Exit', rRR: 'R/R',
      baHint: 'Fill in the planned prices to see the difference from execution.',
      ok: 'Followed', viol: 'Broken', na: 'Not relevant', un: 'Not rated', score: 'Compliance', req: 'required',
      addRule: 'Add your own rule…', add: 'Add', loadRules: 'Load from journal', noRules: 'No rules yet. Add your own or load them from the journal checklist.',
      violNote: 'Why was it broken?', reqViol: '{n} required rule(s) broken', loaded: '{n} rule(s) added', nothingLoad: 'No new rules to load.',
      g_setup: 'Setup', g_entry: 'Entry', g_risk: 'Risk', g_mgmt: 'Management',
      mistakeT: 'Main mistake', mt_none: 'No mistake', mt_early: 'Entered too early', mt_late: 'Entered late / chased',
      mt_sl: 'Moved / removed SL', mt_size: 'Excess risk / size', mt_fomo: 'FOMO / revenge', mt_rule: 'Broke a rule',
      mt_exit: 'Exited too early / late', mt_other: 'Other',
      mistake: 'What happened', mistakePh: 'Describe the main mistake, or what went right…',
      lesson: 'Lesson', lessonPh: 'What did you learn from this trade?',
      next: 'Next action', nextPh: 'One concrete action for the next trade', nextDone: 'Done', violCtx: 'Rules broken in this trade: ',
      hist: 'Edit history', histThis: 'This trade', histAll: 'All trades', noHist: 'No history yet. Changes are logged once you save.',
      histNote: 'Saved changes only.', created: 'Created', removed: 'Trade deleted', more: 'and {n} more change(s)', showAll: 'Show all',
      empty: '(empty)', tlAdd: 'Timeline +', tlDel: 'Timeline −', tlEdit: 'Timeline edited', imgAdd: 'added', imgRep: 'replaced', imgDel: 'removed',
      ruleAdd: 'Rule added', ruleDel: 'Rule removed', ruleNote: 'note changed', rule: 'Rule', imgPlan: 'Plan screenshot', imgActual: 'Actual screenshot', trade_: 'Trade',
      dirty: 'Unsaved changes', saved: 'All changes saved', unsaved: 'Not saved to your account yet', save: 'Save', saving: 'Saving…', discard: 'Discard changes',
      saveOk: 'Trade 360° saved', saveNone: 'No changes', saveFail: 'Could not save: ',
      conflict: 'This data was changed from another device or tab since you opened it. Overwrite with your version?',
      discardQ: 'Discard all unsaved changes?', closeQ: 'You have unsaved changes. Close without saving?',
      delQ: 'Delete this trade from the 360° analysis? The deletion is still kept in history.', notFound: 'Journal not found.', needLogin: 'Sign in to save.',
      d: 'd', hh: 'h', mm: 'm', locale: 'en-US'
    }
  };
  function lang() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return (l === 'en' || l === 'es') ? 'en' : 'id'; }
  function t(k, v) {
    var s = D[lang()][k]; if (s == null) s = D.id[k]; if (s == null) s = k;
    if (v) for (var x in v) s = s.split('{' + x + '}').join(v[x]);
    return s;
  }

  /* ===================== Util ===================== */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function uid() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function str(v, n) { return String(v == null ? '' : v).trim().slice(0, n); }
  function cut(s, n) { s = String(s == null ? '' : s); n = n || 60; return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function canon(v) {
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; }).map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
    return JSON.stringify(v === undefined ? null : v);
  }
  /* Angka: terima "1,2345", "2.345,67", "2,345.67". Pemisah desimal = pemisah terakhir bila keduanya ada. */
  function num(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v).trim().replace(/\s/g, ''); if (!s) return null;
    var c = s.lastIndexOf(','), d = s.lastIndexOf('.');
    if (c > -1 && d > -1) s = c > d ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (c > -1) s = s.replace(',', '.');
    var x = parseFloat(s); return isFinite(x) ? x : null;
  }
  function fmt(n, dp) {
    if (n == null || !isFinite(n)) return '—';
    var a = Math.abs(n), d = dp != null ? dp : (a >= 1000 ? 2 : a >= 10 ? 3 : 5);
    var s = n.toFixed(d); if (s.indexOf('.') > -1) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }
  function raw(n) { return n == null ? '' : String(n); }
  function money(v) { try { return window.Money.format(v || 0, { plus: true }); } catch (e) { return String(v || 0); } }
  function fmtDay(d) { try { return new Date(d + 'T00:00:00').toLocaleDateString(t('locale'), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return d || ''; } }
  function fmtDT(iso) {
    if (!iso) return '';
    var d = new Date(iso); if (isNaN(d)) return String(iso);
    try { return d.toLocaleString(t('locale'), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; }
  }
  function fmtLocal(s) { // 'YYYY-MM-DDTHH:mm' -> tampilan ringkas
    if (!s) return '';
    var d = new Date(s); if (isNaN(d)) return s;
    try { return d.toLocaleString(t('locale'), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return s; }
  }
  function okUrl(u) { u = String(u || ''); return /^https?:\/\//i.test(u) ? u.slice(0, 600) : ''; }
  function toast(m) { try { if (typeof showToast === 'function') return showToast(m); } catch (e) {} try { if (window.PX && PX.error) return PX.error(m); } catch (e2) {} try { alert(m); } catch (e3) {} }
  function q(sel) { return panel ? panel.querySelector(sel) : null; }

  /* ===================== Model ===================== */
  var NUMF = { entry: 1, exit: 1, sl: 1, tp: 1, size: 1, pl: 1, pEntry: 1, pSL: 1, pTP: 1 };
  var PHASES = ['before', 'entry', 'manage', 'exit'];
  var MTYPES = ['none', 'early', 'late', 'sl', 'size', 'fomo', 'rule', 'exit', 'other'];
  var SCALARS = ['pair', 'side', 'entry', 'exit', 'sl', 'tp', 'size', 'pl', 'openAt', 'closeAt', 'pEntry', 'pSL', 'pTP', 'noteBefore', 'noteAfter', 'mistakeType', 'mistake', 'lesson', 'next', 'nextDone'];

  function jOf(id) { try { return window.__jrApi.find(id); } catch (e) { return null; } }

  function seedRules(j) {
    var out = [], seen = {};
    function push(tx, g, req, s) { tx = str(tx, 80); if (!tx || seen[tx.toLowerCase()]) return; seen[tx.toLowerCase()] = 1; out.push({ id: uid(), t: tx, g: /^(setup|entry|risk|mgmt)$/.test(g) ? g : '', req: !!req, s: s || '', n: '' }); }
    try {
      if (window.StrategyLib && StrategyLib.entriesOf) {
        var ent = StrategyLib.entriesOf(j), last = ent[ent.length - 1];
        if (last && Array.isArray(last.items)) last.items.forEach(function (it) { push(it.text, it.group, it.required, it.checked ? 'ok' : ''); });
      }
    } catch (e) {}
    if (!out.length) {
      var ck = null; try { ck = JSON.parse(localStorage.getItem('v22ckitems') || 'null'); } catch (e2) {}
      if (Array.isArray(ck)) ck.forEach(function (x) { if (x && x.t) push(x.t, '', false, ''); });
    }
    return out.slice(0, MAXRULES);
  }
  function newRec(j, prev) {
    var side = j && (j.bias === 'Long' || j.bias === 'Short') ? j.bias : '';
    var single = j && (j.trades || 1) <= 1;
    var now = new Date().toISOString();
    return {
      id: uid(), pair: prev ? prev.pair : str(String((j && j.pair) || '').split(',')[0], 40), side: prev ? '' : side,
      entry: null, exit: null, sl: null, tp: null, size: null, pl: single && !prev && j && typeof j.pl === 'number' ? j.pl : null,
      openAt: '', closeAt: '', pEntry: null, pSL: null, pTP: null, imgPlan: '', imgActual: '', noteBefore: '', noteAfter: '',
      tl: [], rules: seedRules(j), mistakeType: '', mistake: '', lesson: '', next: '', nextDone: false, ca: now, ua: now
    };
  }
  function clean(arr) {
    return (arr || []).slice(0, MAXR).map(function (r) {
      var o = { id: str(r.id, 40) || uid() };
      o.pair = str(r.pair, 40); o.side = (r.side === 'Long' || r.side === 'Short') ? r.side : '';
      Object.keys(NUMF).forEach(function (k) { o[k] = num(r[k]); });
      o.openAt = str(r.openAt, 20); o.closeAt = str(r.closeAt, 20);
      o.imgPlan = okUrl(r.imgPlan); o.imgActual = okUrl(r.imgActual);
      o.noteBefore = str(r.noteBefore, 1200); o.noteAfter = str(r.noteAfter, 1200);
      o.tl = (r.tl || []).slice(0, MAXTL).map(function (e) {
        return { id: str(e.id, 40) || uid(), ph: PHASES.indexOf(e.ph) > -1 ? e.ph : 'before', at: str(e.at, 20), tx: str(e.tx, 400) };
      }).filter(function (e) { return e.tx || e.at; });
      o.rules = (r.rules || []).slice(0, MAXRULES).map(function (x) {
        return { id: str(x.id, 40) || uid(), t: str(x.t, 80), g: /^(setup|entry|risk|mgmt)$/.test(x.g) ? x.g : '', req: !!x.req, s: /^(ok|viol|na)$/.test(x.s) ? x.s : '', n: x.s === 'viol' ? str(x.n, 200) : '' };
      }).filter(function (x) { return x.t; });
      o.mistakeType = MTYPES.indexOf(r.mistakeType) > -1 ? r.mistakeType : '';
      o.mistake = str(r.mistake, 1200); o.lesson = str(r.lesson, 1200); o.next = str(r.next, 600); o.nextDone = !!r.nextDone;
      o.ca = str(r.ca, 30); o.ua = str(r.ua, 30);
      return o;
    });
  }

  /* ----- Perhitungan turunan ----- */
  function calc(r) {
    var o = { dir: r.side === 'Short' ? -1 : (r.side === 'Long' ? 1 : 0) }, d = o.dir;
    var e = num(r.entry), x = num(r.exit), sl = num(r.sl), tp = num(r.tp);
    var pe = num(r.pEntry), ps = num(r.pSL), pt = num(r.pTP);
    if (pe == null) pe = e; if (ps == null) ps = sl; if (pt == null) pt = tp;
    o.rrPlan = null; o.rAct = null; o.warn = [];
    if (!d && (pe != null || e != null) && (ps != null || sl != null)) o.warn.push(t('noSide'));
    if (d) {
      if (pe != null && ps != null && (pe - ps) * d <= 0) o.warn.push(t('badSL', { s: r.side }));
      else if (pe != null && ps != null && pt != null) {
        if ((pt - pe) * d <= 0) o.warn.push(t('badTP', { s: r.side }));
        else o.rrPlan = ((pt - pe) * d) / ((pe - ps) * d);
      }
      if (e != null && sl != null && x != null && (e - sl) * d > 0) o.rAct = ((x - e) * d) / ((e - sl) * d);
      else if (e != null && sl != null && (e - sl) * d <= 0 && o.warn.indexOf(t('badSL', { s: r.side })) < 0) o.warn.push(t('badSL', { s: r.side }));
      if (e != null && x != null) o.move = (x - e) * d;
    }
    var a = Date.parse(r.openAt), b = Date.parse(r.closeAt);
    o.dur = null;
    if (isFinite(a) && isFinite(b)) { if (b >= a) o.dur = b - a; else o.warn.push(t('badTime')); }
    var pl = num(r.pl);
    o.status = pl == null ? '' : (pl > 0 ? 'profit' : pl < 0 ? 'loss' : 'be');
    return o;
  }
  function fmtDur(ms) {
    if (ms == null) return '—';
    var m = Math.round(ms / 60000), dd = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60, p = [];
    if (dd) p.push(dd + t('d')); if (h) p.push(h + t('hh')); if (mm || !p.length) p.push(mm + t('mm'));
    return p.join(' ');
  }
  function compStat(r) {
    var c = { ok: 0, viol: 0, na: 0, un: 0, reqViol: 0 };
    (r.rules || []).forEach(function (x) { if (x.s === 'ok') c.ok++; else if (x.s === 'viol') { c.viol++; if (x.req) c.reqViol++; } else if (x.s === 'na') c.na++; else c.un++; });
    var dn = c.ok + c.viol; c.pct = dn ? Math.round(c.ok / dn * 100) : null; c.total = (r.rules || []).length;
    return c;
  }
  function flags(r) {
    var c = compStat(r);
    return {
      ov: !!(str(r.pair, 40) && num(r.entry) != null && num(r.exit) != null),
      tl: (r.tl || []).some(function (e) { return e.tx; }),
      ba: !!(r.imgPlan && r.imgActual),
      rl: c.total > 0 && c.un === 0,
      rv: !!((r.mistakeType || r.mistake) && r.lesson && r.next)
    };
  }
  function flagCount(r) { var f = flags(r), n = 0; for (var k in f) if (f[k]) n++; return n; }

  /* ----- Diff untuk riwayat ----- */
  function sv(v) { return v == null || v === false ? '' : (v === true ? '1' : String(v)); }
  function diff(o, n) {
    var ch = [];
    SCALARS.forEach(function (k) { var a = sv(o[k]), b = sv(n[k]); if (a !== b) ch.push({ f: k, a: cut(a), b: cut(b) }); });
    ['imgPlan', 'imgActual'].forEach(function (k) { var a = o[k] || '', b = n[k] || ''; if (a !== b) ch.push({ f: k, k: !a ? 'add' : !b ? 'del' : 'rep' }); });
    var om = {}, nm = {};
    (o.tl || []).forEach(function (e) { om[e.id] = e; });
    (n.tl || []).forEach(function (e) {
      nm[e.id] = 1; var p = om[e.id];
      if (!p) ch.push({ f: 'tl', k: 'add', b: cut(e.tx) });
      else if (p.tx !== e.tx || p.at !== e.at || p.ph !== e.ph) ch.push({ f: 'tl', k: 'edit', a: cut(p.tx), b: cut(e.tx) });
    });
    (o.tl || []).forEach(function (e) { if (!nm[e.id]) ch.push({ f: 'tl', k: 'del', a: cut(e.tx) }); });
    var rm = {}, rn = {};
    (o.rules || []).forEach(function (x) { rm[x.id] = x; });
    (n.rules || []).forEach(function (x) {
      rn[x.id] = 1; var p = rm[x.id];
      if (!p) ch.push({ f: 'rule', k: 'add', x: x.t, b: x.s });
      else if (p.s !== x.s) ch.push({ f: 'rule', x: x.t, a: p.s, b: x.s });
      else if (p.n !== x.n) ch.push({ f: 'rule', k: 'note', x: x.t, b: cut(x.n) });
    });
    (o.rules || []).forEach(function (x) { if (!rn[x.id]) ch.push({ f: 'rule', k: 'del', x: x.t }); });
    return ch;
  }
  function histEntry(kind, r, idx, ch, at) {
    var e = { at: at, k: kind, rid: r.id, n: idx + 1, p: cut(r.pair, 30) };
    if (ch && ch.length) { e.c = ch.slice(0, 24); if (ch.length > 24) e.m = ch.length - 24; }
    return e;
  }

  /* ===================== State & DOM ===================== */
  var ov = null, panel = null, S = null, lastFocus = null, io = null;

  function cur() { return S.recs[S.cur] || S.recs[0]; }
  function isDirty() { return canon(clean(S.recs)) !== S.base; }
  function curUser() { try { return currentUser; } catch (e) { return null; } }
  function dbRef() { try { return db.collection('users').doc(curUser().uid).collection('journals').doc((S.j && S.j.dayId) || S.jid); } catch (e) { return null; } }

  function build() {
    if (panel) return;
    ov = document.createElement('div'); ov.className = 't3-ov'; ov.hidden = true;
    panel = document.createElement('section'); panel.className = 't3'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    ov.appendChild(panel); document.body.appendChild(ov);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) tryClose(); });
    panel.addEventListener('click', onClick);
    panel.addEventListener('input', onInput);
    panel.addEventListener('change', onChange);
  }

  function open(id) {
    var j = jOf(id); if (!j) { toast(t('notFound')); return; }
    build(); lastFocus = document.activeElement;
    var stored = Array.isArray(j.t360) ? j.t360 : [];
    S = { jid: id, j: j, cur: 0, recs: clean(copy(stored)), hist: Array.isArray(j.t360Hist) ? copy(j.t360Hist) : [], scope: 'one', all: false, picker: null, up: {}, saving: false, sec: 'ov', lb: null };
    S.unsaved = !stored.length;
    if (!S.recs.length) S.recs.push(newRec(j));
    S.storedJson = canon(stored);
    S.base = canon(clean(S.recs));
    ov.hidden = false; panel.setAttribute('aria-label', t('title'));
    render();
    requestAnimationFrame(function () { ov.classList.add('on'); });
    document.body.classList.add('t3-lock');
    window.addEventListener('keydown', onKey, true);
    var b = q('.t3-back'); if (b) b.focus({ preventScroll: true });
  }
  function tryClose() {
    if (!S) return;
    if (isDirty() && !confirm(t('closeQ'))) return;
    close();
  }
  function close() {
    if (!S) return;
    var id = S.jid, j = S.j;
    window.removeEventListener('keydown', onKey, true);
    document.body.classList.remove('t3-lock');
    if (io) { io.disconnect(); io = null; }
    ov.classList.remove('on');
    var o = ov, p = panel; S = null;
    setTimeout(function () { if (!S) { o.hidden = true; p.innerHTML = ''; } }, 240);
    refreshCta(id, j);
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
  }

  /* ===================== Render ===================== */
  function secHead(k, n) {
    return '<header class="t3-sh"><span class="t3-n">' + n + '</span><div><h3>' + esc(t('s_' + k)) + '</h3><p>' + esc(t('d_' + k)) + '</p></div></header>';
  }
  function fld(label, inner, cls) { return '<label class="t3-f ' + (cls || '') + '"><span>' + esc(label) + '</span>' + inner + '</label>'; }
  function numIn(r, k, ph) { return '<input class="t3-in tnum" inputmode="decimal" autocomplete="off" data-f="' + k + '" value="' + esc(raw(r[k])) + '" placeholder="' + esc(ph || '') + '">'; }

  function headHTML(r) {
    var j = S.j, c = calc(r), f = flags(r), n = flagCount(r);
    var pl = num(r.pl); if (pl == null && S.recs.length === 1 && typeof j.pl === 'number') pl = j.pl;
    var tone = pl == null ? '' : (pl > 0 ? 'pos' : pl < 0 ? 'neg' : 'zero');
    var tabs = S.recs.map(function (x, i) {
      return '<button type="button" class="t3-tab' + (i === S.cur ? ' on' : '') + '" role="tab" aria-selected="' + (i === S.cur) + '" data-a="sel" data-i="' + i + '">' + esc(t('trade')) + ' ' + (i + 1) + (x.pair ? ' · ' + esc(cut(x.pair, 10)) : '') + '</button>';
    }).join('') + '<button type="button" class="t3-tab add" data-a="addTrade">+ ' + esc(t('addTrade')) + '</button>';
    var nav = ['ov', 'tl', 'ba', 'rl', 'rv', 'hs'].map(function (k, i) {
      return '<button type="button" class="t3-pill' + (S.sec === k ? ' on' : '') + (f[k] ? ' done' : '') + '" data-a="go" data-v="' + k + '"><b>' + (i + 1) + '</b>' + esc(t('s_' + k)) + '</button>';
    }).join('');
    return '<div class="t3-hd"><div class="t3-top"><button type="button" class="t3-back" data-a="close" aria-label="' + esc(t('close')) + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>' + esc(t('back')) + '</button>' +
      '<span class="t3-brand">' + esc(t('title')) + '</span><span class="t3-comp" id="t3-comp" title="' + esc(t('comp')) + '">' + n + '/5</span></div>' +
      '<div class="t3-ttl" id="t3-ttl">' + ttlInner(r, pl, tone) + '</div>' +
      '<div class="t3-tabs" role="tablist">' + tabs + '</div>' +
      '<nav class="t3-nav" id="t3-nav" aria-label="' + esc(t('title')) + '">' + nav + '</nav></div>';
  }
  function ttlInner(r, pl, tone) {
    var dir = r.side === 'Long' ? 'long' : r.side === 'Short' ? 'short' : '';
    return '<div><h2>' + (esc(r.pair) || '—') + (r.side ? ' <span class="t3-badge ' + dir + '">' + (r.side === 'Long' ? '↑ ' : '↓ ') + esc(t(r.side)) + '</span>' : '') + '</h2><small>' + esc(fmtDay(S.j.date)) + '</small></div>' +
      '<div class="t3-pl tnum ' + tone + '">' + (pl == null ? '' : esc(money(pl))) + '</div>';
  }

  function derivedHTML(r) {
    var c = calc(r), pl = num(r.pl);
    function tile(l, v, cls) { return '<div class="t3-tile ' + (cls || '') + '"><small>' + esc(l) + '</small><b class="tnum">' + v + '</b></div>'; }
    var h = tile(t('res'), c.status ? esc(t(c.status)) : '—', c.status === 'profit' ? 'pos' : c.status === 'loss' ? 'neg' : '') +
      tile(t('rrPlan'), c.rrPlan != null ? '1 : ' + fmt(c.rrPlan, 2) : '—') +
      tile(t('rAct'), c.rAct != null ? (c.rAct >= 0 ? '+' : '') + fmt(c.rAct, 2) + 'R' : '—', c.rAct != null ? (c.rAct > 0 ? 'pos' : c.rAct < 0 ? 'neg' : '') : '') +
      tile(t('pips'), c.move != null ? (c.move >= 0 ? '+' : '') + fmt(c.move) : '—', c.move != null ? (c.move > 0 ? 'pos' : c.move < 0 ? 'neg' : '') : '') +
      tile(t('dur'), esc(fmtDur(c.dur)));
    return h;
  }
  function warnHTML(r) {
    var c = calc(r); return c.warn.map(function (w) { return '<p class="t3-warn">⚠ ' + esc(w) + '</p>'; }).join('');
  }
  function multiHTML(r) {
    var j = S.j, n = j.trades || 1, out = '';
    if (n > S.recs.length) out += '<p class="t3-hint">' + esc(t('multi', { n: n, m: S.recs.length })) + '</p>';
    if (S.recs.length > 1) {
      var sum = 0, any = false; S.recs.forEach(function (x) { var p = num(x.pl); if (p != null) { sum += p; any = true; } });
      if (any) out += '<p class="t3-hint">' + esc(t('sum', { a: money(Math.round(sum * 100) / 100), b: money(j.pl || 0) })) + '</p>';
    }
    return out;
  }

  function secOv(r) {
    var seg = '<div class="t3-seg" role="radiogroup" aria-label="' + esc(t('side')) + '">' +
      ['Long', 'Short'].map(function (s) { return '<button type="button" role="radio" aria-checked="' + (r.side === s) + '" class="' + s.toLowerCase() + (r.side === s ? ' on' : '') + '" data-a="side" data-v="' + s + '">' + (s === 'Long' ? '↑ ' : '↓ ') + esc(t(s)) + '</button>'; }).join('') + '</div>';
    return '<section class="t3-sec" id="t3-s-ov" data-sec="ov">' + secHead('ov', 1) +
      '<div class="t3-grid">' +
      fld(t('pair'), '<input class="t3-in" data-f="pair" maxlength="40" autocomplete="off" value="' + esc(r.pair) + '" placeholder="XAUUSD">') +
      '<div class="t3-f"><span>' + esc(t('side')) + '</span>' + seg + '</div>' +
      fld(t('entry'), numIn(r, 'entry')) + fld(t('exit'), numIn(r, 'exit')) +
      fld(t('sl'), numIn(r, 'sl')) + fld(t('tp'), numIn(r, 'tp')) +
      fld(t('size'), numIn(r, 'size')) + fld(t('pl'), numIn(r, 'pl', '0.00')) +
      fld(t('openAt'), '<input class="t3-in" type="datetime-local" data-f="openAt" value="' + esc(r.openAt) + '">') +
      fld(t('closeAt'), '<input class="t3-in" type="datetime-local" data-f="closeAt" value="' + esc(r.closeAt) + '">') +
      '</div><div class="t3-der" id="t3-der">' + derivedHTML(r) + '</div><div id="t3-warn">' + warnHTML(r) + '</div><div id="t3-multi">' + multiHTML(r) + '</div>' +
      (S.recs.length > 1 ? '<button type="button" class="t3-link danger" data-a="delTrade">' + esc(t('delTrade')) + '</button>' : '') +
      '</section>';
  }

  function sortedTl(r) {
    return (r.tl || []).map(function (e, i) { return { e: e, i: i }; }).sort(function (a, b) {
      var pa = PHASES.indexOf(a.e.ph), pb = PHASES.indexOf(b.e.ph); if (pa !== pb) return pa - pb;
      var ta = a.e.at || '\uffff', tb = b.e.at || '\uffff'; if (ta !== tb) return ta < tb ? -1 : 1;
      return a.i - b.i;
    });
  }
  function evHTML(x) {
    var e = x.e;
    return '<li class="t3-ev ' + e.ph + '"><span class="t3-dot" aria-hidden="true"></span><div class="t3-evb">' +
      '<div class="t3-evr"><select class="t3-in sm" data-tl="ph" data-i="' + x.i + '" aria-label="' + esc(t('phase')) + '">' + PHASES.map(function (p) { return '<option value="' + p + '"' + (p === e.ph ? ' selected' : '') + '>' + esc(t('tl_' + p)) + '</option>'; }).join('') + '</select>' +
      '<input class="t3-in sm" type="datetime-local" data-tl="at" data-i="' + x.i + '" value="' + esc(e.at) + '" aria-label="' + esc(t('time')) + '">' +
      '<button type="button" class="t3-x" data-a="delEv" data-i="' + x.i + '" aria-label="' + esc(t('del')) + '">&times;</button></div>' +
      '<textarea class="t3-in t3-ta" rows="2" maxlength="400" data-tl="tx" data-i="' + x.i + '" placeholder="' + esc(t('ph_' + e.ph)) + '">' + esc(e.tx) + '</textarea></div></li>';
  }
  function autoHTML(kind, r) {
    var p = num(kind === 'entry' ? r.entry : r.exit), at = kind === 'entry' ? r.openAt : r.closeAt;
    return '<li class="t3-ev auto ' + kind + '"><span class="t3-dot" aria-hidden="true"></span><div class="t3-evb"><div class="t3-auto"><b>' +
      (p != null ? esc(t(kind === 'entry' ? 'autoEntry' : 'autoExit', { p: fmt(p) })) : esc(t(kind === 'entry' ? 'tl_entry' : 'tl_exit')) + ' · ' + esc(t('fillPrice'))) +
      '</b>' + (at ? '<small>' + esc(fmtLocal(at)) + '</small>' : '') + '</div></div></li>';
  }
  function tlInner(r) {
    var list = sortedTl(r), h = '';
    PHASES.forEach(function (ph) {
      var items = list.filter(function (x) { return x.e.ph === ph; });
      var auto = ph === 'entry' ? autoHTML('entry', r) : ph === 'exit' ? '' : '';
      var autoEnd = ph === 'exit' ? autoHTML('exit', r) : '';
      if (!items.length && !auto && !autoEnd) return;
      h += '<li class="t3-ph ' + ph + '"><span>' + esc(t('tl_' + ph)) + '</span></li>' + auto + items.map(evHTML).join('') + autoEnd;
    });
    if (!list.length) h = '<li class="t3-empty">' + esc(t('emptyTl')) + '</li>' + h;
    return h;
  }
  function secTl(r) {
    return '<section class="t3-sec" id="t3-s-tl" data-sec="tl">' + secHead('tl', 2) +
      '<ol class="t3-tl" id="t3-tl">' + tlInner(r) + '</ol>' +
      '<div class="t3-adds">' + PHASES.map(function (p) { return '<button type="button" class="t3-add ' + p + '" data-a="addEv" data-ph="' + p + '">+ ' + esc(t('tl_' + p)) + '</button>'; }).join('') + '</div></section>';
  }

  function shotHTML(r, w) {
    var key = w === 'plan' ? 'imgPlan' : 'imgActual', url = r[key], busy = S.up[w];
    var charts = (S.j.charts || []).filter(function (u) { return okUrl(u); });
    var box;
    if (url) box = '<button type="button" class="t3-img" data-a="zoom" data-u="' + esc(url) + '" aria-label="' + esc(t('zoom')) + '"><img src="' + esc(url) + '" alt="' + esc(t(w === 'plan' ? 'plan' : 'actual')) + '" loading="lazy" decoding="async"></button>' +
      '<div class="t3-shot-act"><button type="button" class="t3-link" data-a="up" data-w="' + w + '"' + (busy ? ' disabled' : '') + '>' + esc(busy ? t('uploading') : t('replace')) + '</button>' +
      (charts.length ? '<button type="button" class="t3-link" data-a="picker" data-w="' + w + '">' + esc(t('pickChart')) + '</button>' : '') +
      '<button type="button" class="t3-link danger" data-a="rmImg" data-w="' + w + '">' + esc(t('remove')) + '</button></div>';
    else box = '<button type="button" class="t3-drop" data-a="up" data-w="' + w + '"' + (busy ? ' disabled' : '') + '><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5-5 4 4 3-3 4 4"/></svg><span>' + esc(busy ? t('uploading') : t('upload')) + '</span></button>' +
      (charts.length ? '<div class="t3-shot-act"><button type="button" class="t3-link" data-a="picker" data-w="' + w + '">' + esc(t('pickChart')) + '</button></div>' : '');
    var pick = '';
    if (S.picker === w && charts.length) pick = '<div class="t3-thumbs">' + charts.map(function (u) { return '<button type="button" data-a="pick" data-w="' + w + '" data-u="' + esc(u) + '"><img src="' + esc(u) + '" alt="" loading="lazy" decoding="async"></button>'; }).join('') + '</div>';
    return box + pick;
  }
  function baTable(r) {
    var c = calc(r), d = c.dir || 1;
    var e = num(r.entry), x = num(r.exit), sl = num(r.sl), tp = num(r.tp), pe = num(r.pEntry), ps = num(r.pSL), pt = num(r.pTP);
    function row(l, a, b, df, cls) { return '<tr><th scope="row">' + esc(l) + '</th><td class="tnum">' + a + '</td><td class="tnum">' + b + '</td><td class="tnum ' + (cls || '') + '">' + df + '</td></tr>'; }
    function dd(a, b, goodWhen) { // a = aktual, b = rencana
      if (a == null || b == null) return ['—', '']; var v = a - b; if (Math.abs(v) < 1e-12) return ['0', 'ok'];
      var good = goodWhen ? goodWhen(v) : null; return [(v > 0 ? '+' : '') + fmt(v), good == null ? '' : (good ? 'pos' : 'neg')];
    }
    var en = dd(e, pe, function (v) { return c.dir ? v * d < 0 : null; });
    var sx = dd(sl, ps, null);
    var tg = dd(x, pt, function (v) { return c.dir ? v * d >= 0 : null; });
    var rr = (c.rrPlan != null && c.rAct != null) ? [(c.rAct - c.rrPlan >= 0 ? '+' : '') + fmt(c.rAct - c.rrPlan, 2), c.rAct - c.rrPlan >= 0 ? 'pos' : 'neg'] : ['—', ''];
    var any = pe != null || ps != null || pt != null;
    return '<table class="t3-tab2"><thead><tr><th>' + esc(t('param')) + '</th><th>' + esc(t('cPlan')) + '</th><th>' + esc(t('cAct')) + '</th><th>' + esc(t('cDiff')) + '</th></tr></thead><tbody>' +
      row(t('rEntry'), fmt(pe), fmt(e), en[0], en[1]) + row(t('rSL'), fmt(ps), fmt(sl), sx[0], sx[1]) + row(t('rTgt'), fmt(pt), fmt(x), tg[0], tg[1]) +
      row(t('rRR'), c.rrPlan != null ? '1 : ' + fmt(c.rrPlan, 2) : '—', c.rAct != null ? fmt(c.rAct, 2) + 'R' : '—', rr[0], rr[1]) +
      '</tbody></table>' + (any ? '' : '<p class="t3-hint">' + esc(t('baHint')) + '</p>');
  }
  function secBa(r) {
    return '<section class="t3-sec" id="t3-s-ba" data-sec="ba">' + secHead('ba', 3) +
      '<div class="t3-ba"><div class="t3-shot"><h4><i class="plan"></i>' + esc(t('plan')) + '</h4><div id="t3-shot-plan">' + shotHTML(r, 'plan') + '</div>' +
      '<div class="t3-grid3">' + fld(t('pEntry'), numIn(r, 'pEntry')) + fld(t('pSL'), numIn(r, 'pSL')) + fld(t('pTP'), numIn(r, 'pTP')) + '</div>' +
      '<textarea class="t3-in t3-ta" rows="3" maxlength="1200" data-f="noteBefore" placeholder="' + esc(t('noteBefore')) + '">' + esc(r.noteBefore) + '</textarea></div>' +
      '<div class="t3-shot"><h4><i class="act"></i>' + esc(t('actual')) + '</h4><div id="t3-shot-actual">' + shotHTML(r, 'actual') + '</div>' +
      '<textarea class="t3-in t3-ta" rows="3" maxlength="1200" data-f="noteAfter" placeholder="' + esc(t('noteAfter')) + '">' + esc(r.noteAfter) + '</textarea></div></div>' +
      '<div class="t3-wrap-x" id="t3-bat">' + baTable(r) + '</div></section>';
  }

  function ruleRow(x, i) {
    function b(s, label, sym) { return '<button type="button" class="t3-rs ' + s + (x.s === s ? ' on' : '') + '" data-a="rs" data-i="' + i + '" data-v="' + s + '" aria-pressed="' + (x.s === s) + '" title="' + esc(label) + '"><span aria-hidden="true">' + sym + '</span><em>' + esc(label) + '</em></button>'; }
    return '<li class="t3-rule ' + (x.s || 'un') + '"><div class="t3-rt"><span>' + esc(x.t) + '</span>' + (x.g ? '<i class="t3-g">' + esc(t('g_' + x.g)) + '</i>' : '') + (x.req ? '<i class="t3-g req">' + esc(t('req')) + '</i>' : '') +
      '<button type="button" class="t3-x" data-a="delRule" data-i="' + i + '" aria-label="' + esc(t('del')) + '">&times;</button></div>' +
      '<div class="t3-rb" role="group">' + b('ok', t('ok'), '✓') + b('viol', t('viol'), '✕') + b('na', t('na'), '–') + '</div>' +
      (x.s === 'viol' ? '<input class="t3-in sm" data-rl="n" data-i="' + i + '" maxlength="200" value="' + esc(x.n) + '" placeholder="' + esc(t('violNote')) + '">' : '') + '</li>';
  }
  function rsumHTML(r) {
    var c = compStat(r), tot = Math.max(c.total, 1);
    return '<div class="t3-score"><div><small>' + esc(t('score')) + '</small><b class="tnum ' + (c.pct == null ? '' : c.pct >= 80 ? 'pos' : c.pct < 50 ? 'neg' : '') + '">' + (c.pct == null ? '—' : c.pct + '%') + '</b></div>' +
      '<div class="t3-sbar" role="img" aria-label="' + esc(t('score')) + '"><i class="ok" style="width:' + c.ok / tot * 100 + '%"></i><i class="viol" style="width:' + c.viol / tot * 100 + '%"></i><i class="na" style="width:' + c.na / tot * 100 + '%"></i></div>' +
      '<ul class="t3-leg"><li class="ok">' + c.ok + ' ' + esc(t('ok')) + '</li><li class="viol">' + c.viol + ' ' + esc(t('viol')) + '</li><li class="na">' + c.na + ' ' + esc(t('na')) + '</li><li class="un">' + c.un + ' ' + esc(t('un')) + '</li></ul></div>' +
      (c.reqViol ? '<p class="t3-warn">⚠ ' + esc(t('reqViol', { n: c.reqViol })) + '</p>' : '');
  }
  function secRl(r) {
    return '<section class="t3-sec" id="t3-s-rl" data-sec="rl">' + secHead('rl', 4) +
      '<div id="t3-rsum">' + rsumHTML(r) + '</div>' +
      '<ul class="t3-rules" id="t3-rules">' + (r.rules.length ? r.rules.map(ruleRow).join('') : '<li class="t3-empty">' + esc(t('noRules')) + '</li>') + '</ul>' +
      '<div class="t3-addrule"><input class="t3-in" id="t3-newrule" maxlength="80" placeholder="' + esc(t('addRule')) + '"><button type="button" class="t3-btn" data-a="addRule">' + esc(t('add')) + '</button></div>' +
      '<button type="button" class="t3-link" data-a="loadRules">' + esc(t('loadRules')) + '</button></section>';
  }

  function vctxHTML(r) {
    var v = (r.rules || []).filter(function (x) { return x.s === 'viol'; }).map(function (x) { return x.t; });
    return v.length ? '<p class="t3-hint">' + esc(t('violCtx')) + esc(v.join(' · ')) + '</p>' : '';
  }
  function secRv(r) {
    return '<section class="t3-sec" id="t3-s-rv" data-sec="rv">' + secHead('rv', 5) +
      '<div class="t3-sub">' + esc(t('mistakeT')) + '</div><div class="t3-chips" role="group" aria-label="' + esc(t('mistakeT')) + '">' +
      MTYPES.map(function (m) { return '<button type="button" class="t3-chip' + (r.mistakeType === m ? ' on' : '') + (m === 'none' ? ' good' : '') + '" aria-pressed="' + (r.mistakeType === m) + '" data-a="mt" data-v="' + m + '">' + esc(t('mt_' + m)) + '</button>'; }).join('') + '</div>' +
      '<div id="t3-vctx">' + vctxHTML(r) + '</div>' +
      fld(t('mistake'), '<textarea class="t3-in t3-ta" rows="3" maxlength="1200" data-f="mistake" placeholder="' + esc(t('mistakePh')) + '">' + esc(r.mistake) + '</textarea>') +
      fld(t('lesson'), '<textarea class="t3-in t3-ta" rows="3" maxlength="1200" data-f="lesson" placeholder="' + esc(t('lessonPh')) + '">' + esc(r.lesson) + '</textarea>') +
      fld(t('next'), '<textarea class="t3-in t3-ta" rows="2" maxlength="600" data-f="next" placeholder="' + esc(t('nextPh')) + '">' + esc(r.next) + '</textarea>') +
      '<label class="t3-chk"><input type="checkbox" data-f="nextDone"' + (r.nextDone ? ' checked' : '') + '><span>' + esc(t('nextDone')) + '</span></label></section>';
  }

  /* ----- Riwayat ----- */
  function mtLabel(v) { return v ? t('mt_' + v) : t('empty'); }
  function valFmt(f, v) {
    if (f === 'mistakeType') return mtLabel(v);
    if (f === 'nextDone') return v ? '✓' : '—';
    if (f === 'side') return v ? t(v) : t('empty');
    if (f === 'openAt' || f === 'closeAt') return v ? fmtLocal(v) : t('empty');
    return v === '' || v == null ? t('empty') : v;
  }
  var FLAB = { pair: 'pair', side: 'side', entry: 'entry', exit: 'exit', sl: 'sl', tp: 'tp', size: 'size', pl: 'pl', openAt: 'openAt', closeAt: 'closeAt', pEntry: 'pEntry', pSL: 'pSL', pTP: 'pTP', mistakeType: 'mistakeT', mistake: 'mistake', lesson: 'lesson', next: 'next', nextDone: 'nextDone', noteBefore: 'plan', noteAfter: 'actual' };
  function stLabel(s) { return t(s || 'un'); }
  function changeHTML(c) {
    var s = '';
    if (c.f === 'tl') s = c.k === 'add' ? esc(t('tlAdd')) + ' <q>' + esc(c.b || t('empty')) + '</q>' : c.k === 'del' ? esc(t('tlDel')) + ' <q>' + esc(c.a || t('empty')) + '</q>' : esc(t('tlEdit')) + ': <s>' + esc(c.a || t('empty')) + '</s> → <q>' + esc(c.b || t('empty')) + '</q>';
    else if (c.f === 'rule') s = c.k === 'add' ? esc(t('ruleAdd')) + ' <q>' + esc(c.x) + '</q>' : c.k === 'del' ? esc(t('ruleDel')) + ' <q>' + esc(c.x) + '</q>' : c.k === 'note' ? esc(t('rule')) + ' <q>' + esc(c.x) + '</q>: ' + esc(t('ruleNote')) : esc(t('rule')) + ' <q>' + esc(c.x) + '</q>: <s>' + esc(stLabel(c.a)) + '</s> → <b>' + esc(stLabel(c.b)) + '</b>';
    else if (c.f === 'imgPlan' || c.f === 'imgActual') s = esc(t(c.f)) + ' ' + esc(t(c.k === 'add' ? 'imgAdd' : c.k === 'del' ? 'imgDel' : 'imgRep'));
    else if (c.f === 'noteBefore' || c.f === 'noteAfter') s = esc(t(c.f === 'noteBefore' ? 'noteBefore' : 'noteAfter').split(':')[0]) + ': <s>' + esc(valFmt(c.f, c.a)) + '</s> → <b>' + esc(valFmt(c.f, c.b)) + '</b>';
    else s = esc(t(FLAB[c.f] || c.f)) + ': <s>' + esc(valFmt(c.f, c.a)) + '</s> → <b>' + esc(valFmt(c.f, c.b)) + '</b>';
    return '<li>' + s + '</li>';
  }
  function histInner(r) {
    var list = S.hist.slice().reverse();
    if (S.scope === 'one') list = list.filter(function (h) { return h.rid === r.id; });
    var total = list.length; if (!S.all) list = list.slice(0, 12);
    if (!list.length) return '<li class="t3-empty">' + esc(t('noHist')) + '</li>';
    var h = list.map(function (e) {
      var title = e.k === 'new' ? t('created') : e.k === 'del' ? t('removed') : '';
      var who = t('trade_') + ' ' + (e.n || '?') + (e.p ? ' · ' + e.p : '');
      return '<li class="t3-he ' + e.k + '"><span class="t3-dot" aria-hidden="true"></span><div><div class="t3-hh"><b>' + esc(fmtDT(e.at)) + '</b><small>' + esc(who) + '</small></div>' +
        (title ? '<p class="t3-ht">' + esc(title) + '</p>' : '') +
        (e.c && e.c.length ? '<ul class="t3-hc">' + e.c.map(changeHTML).join('') + (e.m ? '<li class="t3-more">' + esc(t('more', { n: e.m })) + '</li>' : '') + '</ul>' : '') + '</div></li>';
    }).join('');
    if (!S.all && total > 12) h += '<li class="t3-moreb"><button type="button" class="t3-link" data-a="histAll">' + esc(t('showAll')) + ' (' + total + ')</button></li>';
    return h;
  }
  function secHs(r) {
    var sc = S.recs.length > 1 || S.hist.some(function (h) { return h.rid !== r.id; });
    return '<section class="t3-sec" id="t3-s-hs" data-sec="hs">' + secHead('hs', 6) +
      (sc ? '<div class="t3-scope" role="group"><button type="button" class="t3-chip' + (S.scope === 'one' ? ' on' : '') + '" data-a="scope" data-v="one">' + esc(t('histThis')) + '</button><button type="button" class="t3-chip' + (S.scope === 'all' ? ' on' : '') + '" data-a="scope" data-v="all">' + esc(t('histAll')) + '</button></div>' : '') +
      '<ol class="t3-hist" id="t3-hist">' + histInner(r) + '</ol><p class="t3-hint">' + esc(t('histNote')) + '</p></section>';
  }

  function footHTML() {
    var d = isDirty(), can = d || S.unsaved;
    var msg = S.saving ? t('saving') : d ? t('dirty') : S.unsaved ? t('unsaved') : t('saved');
    return '<span class="t3-st ' + (d ? 'dirty' : S.unsaved ? 'dirty' : 'ok') + '" role="status">' + esc(msg) + '</span>' +
      (d ? '<button type="button" class="t3-btn ghost" data-a="discard">' + esc(t('discard')) + '</button>' : '') +
      '<button type="button" class="t3-btn pri" data-a="save"' + (can && !S.saving ? '' : ' disabled') + '>' + esc(S.saving ? t('saving') : t('save')) + '</button>';
  }
  function lbHTML() {
    return S.lb ? '<div class="t3-lb" data-a="lbClose" role="dialog" aria-modal="true"><button type="button" class="t3-lbx" data-a="lbClose" aria-label="' + esc(t('close')) + '">&times;</button><img src="' + esc(S.lb) + '" alt=""></div>' : '';
  }

  function render(opt) {
    opt = opt || {};
    var r = cur(), old = q('.t3-scroll'), top = old ? old.scrollTop : 0;
    panel.innerHTML = headHTML(r) + '<div class="t3-scroll">' + secOv(r) + secTl(r) + secBa(r) + secRl(r) + secRv(r) + secHs(r) + '</div><footer class="t3-bar" id="t3-bar">' + footHTML() + '</footer><div id="t3-lbw">' + lbHTML() + '</div>';
    var sc = q('.t3-scroll'); if (sc) sc.scrollTop = opt.top ? 0 : top;
    spy();
    if (opt.focus) { var el = panel.querySelector(opt.focus); if (el) { try { el.focus(); } catch (e) {} } }
  }
  var cache = {};
  function setHTML(id, h) { var el = document.getElementById(id); if (!el) return; if (cache[id] === h && el.innerHTML) return; cache[id] = h; el.innerHTML = h; }
  /* Perbarui bagian turunan tanpa menyentuh kolom yang sedang diketik. */
  function live() {
    if (!S) return;
    var r = cur(), f = flags(r), n = flagCount(r), pl = num(r.pl); if (pl == null && S.recs.length === 1 && typeof S.j.pl === 'number') pl = S.j.pl;
    var tone = pl == null ? '' : (pl > 0 ? 'pos' : pl < 0 ? 'neg' : 'zero');
    setHTML('t3-der', derivedHTML(r)); setHTML('t3-warn', warnHTML(r)); setHTML('t3-multi', multiHTML(r));
    setHTML('t3-bat', baTable(r)); setHTML('t3-rsum', rsumHTML(r)); setHTML('t3-vctx', vctxHTML(r));
    setHTML('t3-ttl', ttlInner(r, pl, tone)); setHTML('t3-bar', footHTML());
    var c = document.getElementById('t3-comp'); if (c) c.textContent = n + '/5';
    [].forEach.call(panel.querySelectorAll('.t3-pill'), function (p) { p.classList.toggle('done', !!f[p.dataset.v]); });
    var tab = panel.querySelector('.t3-tab.on'); if (tab) tab.textContent = t('trade') + ' ' + (S.cur + 1) + (r.pair ? ' · ' + cut(r.pair, 10) : '');
  }
  function spy() {
    if (io) { io.disconnect(); io = null; }
    var sc = q('.t3-scroll'); if (!sc || !('IntersectionObserver' in window)) return;
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && S) { S.sec = e.target.dataset.sec; [].forEach.call(panel.querySelectorAll('.t3-pill'), function (p) { p.classList.toggle('on', p.dataset.v === S.sec); }); } });
    }, { root: sc, rootMargin: '-6% 0px -78% 0px', threshold: 0 });
    [].forEach.call(sc.querySelectorAll('.t3-sec'), function (s) { io.observe(s); });
  }

  /* ===================== Interaksi ===================== */
  function setPath(r, el) {
    var k;
    if (el.dataset.f) {
      k = el.dataset.f;
      if (el.type === 'checkbox') r[k] = el.checked;
      else if (NUMF[k]) r[k] = num(el.value);
      else r[k] = el.value;
    } else if (el.dataset.tl) {
      var e = r.tl[+el.dataset.i]; if (e) e[el.dataset.tl] = el.value;
    } else if (el.dataset.rl) {
      var x = r.rules[+el.dataset.i]; if (x) x[el.dataset.rl] = el.value;
    }
  }
  function onInput(e) {
    var el = e.target; if (!S || !(el.dataset.f || el.dataset.tl || el.dataset.rl)) return;
    if (el.tagName === 'SELECT' || el.type === 'datetime-local' || el.type === 'checkbox') return; // ditangani di change
    setPath(cur(), el); live();
  }
  function onChange(e) {
    var el = e.target; if (!S) return;
    if (el.dataset.f || el.dataset.tl || el.dataset.rl) {
      setPath(cur(), el);
      if (el.dataset.tl === 'ph' || el.dataset.tl === 'at') { render({ keep: true }); return; }
      if (el.dataset.f === 'openAt' || el.dataset.f === 'closeAt') setHTML('t3-tl', tlInner(cur()));
      live();
    }
  }
  function addEvent(ph) {
    var r = cur(); if (r.tl.length >= MAXTL) return;
    r.tl.push({ id: uid(), ph: ph, at: '', tx: '' });
    var i = r.tl.length - 1; render({ focus: '[data-tl="tx"][data-i="' + i + '"]' });
  }
  function upload(w) {
    var rid = cur().id, key = w === 'plan' ? 'imgPlan' : 'imgActual';
    if (typeof uploadToImgBB !== 'function') { toast(t('noUp')); return; }
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0]; if (!f || !S) return;
      if (!/^image\//.test(f.type)) { toast(t('notImg')); return; }
      if (f.size > 15 * 1024 * 1024) { toast(t('tooBig')); return; }
      S.up[w] = true; setHTML('t3-shot-' + w, shotHTML(cur(), w));
      var jid = S.jid;
      Promise.resolve(uploadToImgBB(f)).then(function (url) {
        if (!S || S.jid !== jid) return;
        var r = S.recs.filter(function (x) { return x.id === rid; })[0]; if (r) r[key] = okUrl(url);
        S.up[w] = false; S.picker = null; if (cur().id === rid) { cache['t3-shot-' + w] = null; setHTML('t3-shot-' + w, shotHTML(cur(), w)); live(); }
      }).catch(function (err) {
        if (!S) return; S.up[w] = false; cache['t3-shot-' + w] = null; setHTML('t3-shot-' + w, shotHTML(cur(), w));
        toast(t('upFail') + (err && err.message ? err.message : ''));
      });
    });
    inp.click();
  }
  function loadRules() {
    var r = cur(), have = {}; r.rules.forEach(function (x) { have[x.t.toLowerCase()] = 1; });
    var add = seedRules(S.j).filter(function (x) { return !have[x.t.toLowerCase()]; }).slice(0, MAXRULES - r.rules.length);
    if (!add.length) { toast(t('nothingLoad')); return; }
    add.forEach(function (x) { r.rules.push(x); }); render({ keep: true }); toast(t('loaded', { n: add.length }));
  }
  function onClick(e) {
    var b = e.target.closest('[data-a]'); if (!b || !S || !panel.contains(b)) return;
    var a = b.dataset.a, r = cur();
    if (a === 'close') tryClose();
    else if (a === 'save') save(false);
    else if (a === 'discard') { if (confirm(t('discardQ'))) { S.recs = clean(copy(JSON.parse(S.base))); if (!S.recs.length) S.recs.push(newRec(S.j)); S.cur = Math.min(S.cur, S.recs.length - 1); render({ keep: true }); } }
    else if (a === 'sel') { S.cur = +b.dataset.i; S.picker = null; render({ top: true }); }
    else if (a === 'addTrade') { if (S.recs.length >= MAXR) { toast(t('maxTrades')); return; } S.recs.push(newRec(S.j, r)); S.cur = S.recs.length - 1; S.picker = null; render({ top: true }); }
    else if (a === 'delTrade') { if (S.recs.length > 1 && confirm(t('delQ'))) { S.recs.splice(S.cur, 1); S.cur = Math.max(0, S.cur - 1); render({ top: true }); } }
    else if (a === 'go') { var el = document.getElementById('t3-s-' + b.dataset.v); if (el) { S.sec = b.dataset.v; el.scrollIntoView({ behavior: window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); [].forEach.call(panel.querySelectorAll('.t3-pill'), function (p) { p.classList.toggle('on', p === b); }); } }
    else if (a === 'side') { r.side = r.side === b.dataset.v ? '' : b.dataset.v; [].forEach.call(panel.querySelectorAll('.t3-seg button'), function (x) { var on = x.dataset.v === r.side; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); }); live(); }
    else if (a === 'addEv') addEvent(b.dataset.ph);
    else if (a === 'delEv') { r.tl.splice(+b.dataset.i, 1); setHTML('t3-tl', tlInner(r)); cache['t3-tl'] = null; render({ keep: true }); }
    else if (a === 'up') upload(b.dataset.w);
    else if (a === 'picker') { S.picker = S.picker === b.dataset.w ? null : b.dataset.w; cache['t3-shot-plan'] = cache['t3-shot-actual'] = null; setHTML('t3-shot-plan', shotHTML(r, 'plan')); setHTML('t3-shot-actual', shotHTML(r, 'actual')); }
    else if (a === 'pick') { r[b.dataset.w === 'plan' ? 'imgPlan' : 'imgActual'] = okUrl(b.dataset.u); S.picker = null; cache['t3-shot-plan'] = cache['t3-shot-actual'] = null; setHTML('t3-shot-plan', shotHTML(r, 'plan')); setHTML('t3-shot-actual', shotHTML(r, 'actual')); live(); }
    else if (a === 'rmImg') { r[b.dataset.w === 'plan' ? 'imgPlan' : 'imgActual'] = ''; cache['t3-shot-' + b.dataset.w] = null; setHTML('t3-shot-' + b.dataset.w, shotHTML(r, b.dataset.w)); live(); }
    else if (a === 'zoom') { S.lb = b.dataset.u; setHTML('t3-lbw', lbHTML()); cache['t3-lbw'] = null; }
    else if (a === 'lbClose') { if (e.target === b || b.classList.contains('t3-lbx')) { S.lb = null; var w = document.getElementById('t3-lbw'); if (w) w.innerHTML = ''; cache['t3-lbw'] = null; } }
    else if (a === 'rs') { var x = r.rules[+b.dataset.i]; if (x) { x.s = x.s === b.dataset.v ? '' : b.dataset.v; if (x.s !== 'viol') x.n = ''; render({ keep: true }); } }
    else if (a === 'delRule') { r.rules.splice(+b.dataset.i, 1); render({ keep: true }); }
    else if (a === 'addRule') { var inp = document.getElementById('t3-newrule'), v = str(inp && inp.value, 80); if (v && r.rules.length < MAXRULES) { r.rules.push({ id: uid(), t: v, g: '', req: false, s: '', n: '' }); render({ keep: true, focus: '#t3-newrule' }); } }
    else if (a === 'loadRules') loadRules();
    else if (a === 'mt') { r.mistakeType = r.mistakeType === b.dataset.v ? '' : b.dataset.v; [].forEach.call(panel.querySelectorAll('[data-a="mt"]'), function (x) { var on = x.dataset.v === r.mistakeType; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); live(); }
    else if (a === 'scope') { S.scope = b.dataset.v; S.all = false; render({ keep: true }); }
    else if (a === 'histAll') { S.all = true; render({ keep: true }); }
  }
  document.addEventListener('keydown', function (e) {
    if (!S || e.key !== 'Enter') return;
    var el = e.target; if (el && el.id === 't3-newrule') { e.preventDefault(); var b = panel.querySelector('[data-a="addRule"]'); if (b) b.click(); }
  });
  /* Listener di window (capture) supaya Escape/Tab/panah tidak bocor ke panel detail di bawahnya. */
  function onKey(e) {
    if (!S) return;
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); if (S.lb) { S.lb = null; var w = document.getElementById('t3-lbw'); if (w) w.innerHTML = ''; cache['t3-lbw'] = null; } else tryClose(); return; }
    if (e.key === 'Tab') {
      var f = [].filter.call(panel.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'), function (n) { return n.offsetParent !== null; });
      if (!f.length) return; var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    }
  }

  /* ===================== Simpan ===================== */
  function save(force) {
    if (!S || S.saving) return;
    var ref = dbRef(); if (!ref || !curUser()) { toast(t('needLogin')); return; }
    var next = clean(S.recs), jid = S.jid, expect = S.storedJson, FV = firebase.firestore.FieldValue;
    S.saving = true; setHTML('t3-bar', footHTML());
    var written = null, nowIso = new Date().toISOString();
    db.runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) {
        if (!snap.exists) throw new Error(t('notFound'));
        var d = snap.data(), stored = Array.isArray(d.t360) ? d.t360 : [], hist = Array.isArray(d.t360Hist) ? d.t360Hist : [];
        if (!force && canon(stored) !== expect) { var er = new Error('CONFLICT'); er.conflict = true; throw er; }
        var om = {}; stored.forEach(function (r) { om[r.id] = r; });
        var out = [], logs = [];
        next.forEach(function (r, i) {
          var o = om[r.id]; delete om[r.id];
          if (!o) { r.ca = r.ca || nowIso; r.ua = nowIso; logs.push(histEntry('new', r, i, null, nowIso)); }
          else {
            var ch = diff(o, r);
            if (ch.length) { r.ua = nowIso; logs.push(histEntry('upd', r, i, ch, nowIso)); } else r.ua = o.ua || r.ua;
            r.ca = o.ca || r.ca;
          }
          out.push(r);
        });
        Object.keys(om).forEach(function (id) { var o = om[id], idx = stored.indexOf(o); logs.push({ at: nowIso, k: 'del', rid: id, n: idx + 1, p: cut(o.pair, 30) }); });
        if (!logs.length) return { none: true, stored: stored };
        written = copy(out);
        tx.update(ref, { t360: written, t360Hist: copy(hist.concat(logs).slice(-MAXH)), t360UpdatedAt: FV.serverTimestamp() });
        return { logs: logs, hist: hist.concat(logs).slice(-MAXH) };
      });
    }).then(function (res) {
      if (!S || S.jid !== jid) return;
      S.saving = false;
      if (res && res.none) { S.recs = clean(copy(res.stored.length ? res.stored : next)); S.unsaved = !res.stored.length; S.storedJson = canon(res.stored); S.base = canon(clean(S.recs)); render({ keep: true }); toast(t('saveNone')); return; }
      S.j.t360 = copy(written); S.j.t360Hist = copy(res.hist); S.hist = copy(res.hist);
      S.recs = clean(copy(written)); S.cur = Math.min(S.cur, S.recs.length - 1);
      S.unsaved = false; S.storedJson = canon(written); S.base = canon(clean(S.recs));
      render({ keep: true }); toast(t('saveOk'));
    }).catch(function (err) {
      if (!S) return; S.saving = false; setHTML('t3-bar', footHTML());
      if (err && err.conflict) { if (confirm(t('conflict'))) save(true); return; }
      console.error(err); toast(t('saveFail') + (err && err.message ? err.message : ''));
    });
  }

  /* ===================== Titik masuk: panel detail ===================== */
  function ctaHTML(j) {
    var recs = Array.isArray(j.t360) ? j.t360 : [], has = recs.length > 0, sub, n = 0;
    if (has) { recs.forEach(function (r) { n += flagCount(clean([r])[0]); }); sub = recs.length + ' ' + t('ctaTrades') + ' · ' + n + '/' + (recs.length * 5) + ' ' + t('ctaFull'); }
    else sub = t('ctaSub');
    return '<div class="t3-cta' + (has ? ' has' : '') + '" data-jid="' + esc(j.id) + '"><div class="t3-cta-i" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="2.5"/></svg></div>' +
      '<div class="t3-cta-t"><b>' + esc(t('title')) + '</b><small>' + esc(sub) + '</small></div>' +
      '<button type="button" data-t3-open="' + esc(j.id) + '">' + esc(has ? t('ctaOpen') : t('ctaStart')) + '</button></div>';
  }
  function refreshCta(id, j) {
    var el = document.querySelector('.t3-cta[data-jid="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    if (el && j) { var tmp = document.createElement('div'); tmp.innerHTML = ctaHTML(j); if (tmp.firstChild) el.replaceWith(tmp.firstChild); }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-t3-open]'); if (!b) return;
    e.preventDefault(); open(b.getAttribute('data-t3-open'));
  });
  var orig = window.__jrDetail;
  if (typeof orig === 'function') window.__jrDetail = function (j, o) { return ctaHTML(j) + orig(j, o); };

  window.Trade360 = { open: open, version: '16.51' };
})();
