/* AI Trading Coach: tampilan (v16.25)
   Halaman baru "AI Coach" (#coach-section). Semua analisis datang dari ai-coach.js (lokal, tanpa AI eksternal).
   Data tersimpan (hanya fokus latihan yang kamu pilih):
   - localStorage  aicoach:<uid>
   - Firestore     users/{uid}  field coachFocus {ts, picked:[...]}  (versi dengan ts terbaru dipakai; bila ditolak, lokal tetap jalan)
   Percakapan AI sungguhan butuh integrasi model dan TIDAK aktif; sebagai gantinya ada tombol "Salin ringkasan"
   (hanya angka agregat, tanpa catatan/chart) untuk ditempel ke asisten AI pilihan pengguna. */
(function () {
  'use strict';
  if (typeof document === 'undefined' || !window.AICoach) return;
  var C = window.AICoach, V = window.V16Stats;

  /* ---------- Teks (ID / EN) ---------- */
  var T = {
    id: {
      title: 'AI Trading Coach', sub: 'Asisten evaluasi yang membaca riwayat journal dan membantu kamu menemukan kebiasaan yang perlu diperbaiki.',
      badge: 'Analisis lokal · tanpa AI eksternal', r30: '30 hari', r90: '90 hari', rAll: 'Semua', rangeLbl: 'Rentang analisis pola',
      wTitle: 'Evaluasi Mingguan', wPrev: 'Pekan sebelumnya', wNext: 'Pekan berikutnya', wNow: 'Pekan ini', wEmpty: 'Tidak ada journal pada pekan ini.', wEmptyGo: 'Pilih pekan lain dengan tombol panah.',
      kNet: 'Net P/L', kWin: 'Win rate', kTr: 'Trade', kDays: 'Hari journal', vsPrev: 'Pekan lalu', well: 'Berjalan baik', imp: 'Perlu diperbaiki', wNone: 'Belum ada catatan.',
      small: 'Sampel kecil (di bawah 10 trade): baca sebagai gambaran, bukan kesimpulan.', na: 'N/A',
      pTitle: 'Pola Kerugian Berulang', pSub: 'Kelompok trade dengan hasil negatif yang muncul berulang di journalmu.', pNone: 'Belum ada pola kerugian yang berulang. Itu kabar baik, atau datanya belum cukup.',
      pLow: 'Butuh minimal 10 trade sebelum pola bisa dibaca. Saat ini', pLow2: 'trade.', more: 'pola lain tidak ditampilkan.', ex: 'expectancy', perTr: '/trade', wr: 'win rate', tr: 'trade', days: 'hari',
      tInsight: 'Sampel kecil', tReliable: 'Sampel cukup', pNote: 'Deskriptif dari data historismu. Bukan sebab-akibat dan bukan saran trading.', also: 'Trade yang sama juga cocok dengan',
      bTitle: 'Setup Terbaik', bSub: 'Setup dengan net P/L dan expectancy positif (minimal 10 trade).', bNone: 'Belum ada setup dengan minimal 10 trade yang positif.', bCombo: 'Kombinasi menonjol', bCov: 'Setup terisi pada {p}% trade. Isi Setup / Strategy Tag di journal supaya analisis ini lebih tajam.',
      fTitle: 'Fokus Latihan Berikutnya', fSub: 'Saran kebiasaan (proses), bukan sinyal entry. Pilih sampai 3 untuk dilacak.', fPick: 'Jadikan fokus', fPicked: 'Fokus aktif', fDrop: 'Lepas', fActive: 'Fokus aktif', fTarget: 'Target', fNow: 'Pekan ini', fMet: 'Tercapai', fNot: 'Belum', fManual: 'Dinilai manual', fMax: 'Maksimal 3 fokus aktif.', fSaved: 'Fokus disimpan', fDropped: 'Fokus dilepas', fNoData: 'Belum ada data pekan ini',
      cTitle: 'Ngobrol dengan AI', cBody: 'Percakapan AI sungguhan butuh integrasi model dan belum aktif di aplikasi ini. Sementara itu, salin ringkasan analisis (hanya angka agregat, tanpa catatan atau chart) lalu tempel ke asisten AI pilihanmu.', cBtn: 'Salin ringkasan', cOk: 'Ringkasan disalin', cFail: 'Gagal menyalin. Pilih teks lalu salin manual.',
      emptyT: 'Belum ada journal', emptyS: 'Coach membaca journalmu. Catat beberapa trade dulu, lalu analisis muncul di sini.', emptyGo: 'Buat journal', loading: 'Memuat journal…', err: 'Gagal memuat journal. Periksa koneksi lalu buka ulang halaman ini.',
      dim: { setup: 'Setup', pair: 'Pair', session: 'Sesi', emotion: 'Emosi', mistake: 'Mistake', dow: 'Hari', direction: 'Arah' },
      pNegEmo: 'Hari dengan emosi negatif', pOver: 'Hari dengan trade berlebih', pComp: 'Rule wajib terlewat',
      unitTrade: 'trade', unitDay: 'hari'
    },
    en: {
      title: 'AI Trading Coach', sub: 'An evaluation assistant that reads your journal history and helps you spot the habits worth fixing.',
      badge: 'Local analysis · no external AI', r30: '30 days', r90: '90 days', rAll: 'All', rangeLbl: 'Pattern analysis range',
      wTitle: 'Weekly Review', wPrev: 'Previous week', wNext: 'Next week', wNow: 'This week', wEmpty: 'No journals this week.', wEmptyGo: 'Use the arrows to pick another week.',
      kNet: 'Net P/L', kWin: 'Win rate', kTr: 'Trades', kDays: 'Journal days', vsPrev: 'Last week', well: 'Going well', imp: 'Needs work', wNone: 'No notes yet.',
      small: 'Small sample (under 10 trades): read it as a snapshot, not a conclusion.', na: 'N/A',
      pTitle: 'Recurring Loss Patterns', pSub: 'Groups of trades with negative results that keep showing up in your journal.', pNone: 'No recurring loss patterns yet. That is good news, or there is not enough data.',
      pLow: 'At least 10 trades are needed before patterns can be read. Right now there are', pLow2: 'trades.', more: 'more patterns not shown.', ex: 'expectancy', perTr: '/trade', wr: 'win rate', tr: 'trades', days: 'days',
      tInsight: 'Small sample', tReliable: 'Solid sample', pNote: 'Descriptive of your historical data. Not cause and effect, and not trading advice.', also: 'The same trades also match',
      bTitle: 'Best Setups', bSub: 'Setups with positive net P/L and expectancy (at least 10 trades).', bNone: 'No setup with at least 10 trades is positive yet.', bCombo: 'Standout combinations', bCov: 'Setup is filled on {p}% of trades. Fill Setup / Strategy Tag in your journal to sharpen this.',
      fTitle: 'Next Training Focus', fSub: 'Habit (process) suggestions, not entry signals. Pick up to 3 to track.', fPick: 'Make it a focus', fPicked: 'Active focus', fDrop: 'Remove', fActive: 'Active focus', fTarget: 'Target', fNow: 'This week', fMet: 'Met', fNot: 'Not yet', fManual: 'Self-assessed', fMax: 'Up to 3 active focuses.', fSaved: 'Focus saved', fDropped: 'Focus removed', fNoData: 'No data this week yet',
      cTitle: 'Talk to an AI', cBody: 'A real AI conversation needs a model integration and is not active in this app. In the meantime, copy the analysis summary (aggregate numbers only, no notes or charts) and paste it into the AI assistant of your choice.', cBtn: 'Copy summary', cOk: 'Summary copied', cFail: 'Copy failed. Select the text and copy it manually.',
      emptyT: 'No journals yet', emptyS: 'The coach reads your journal. Log a few trades first, then the analysis shows up here.', emptyGo: 'Create journal', loading: 'Loading journals…', err: 'Could not load journals. Check your connection and reopen this page.',
      dim: { setup: 'Setup', pair: 'Pair', session: 'Session', emotion: 'Emotion', mistake: 'Mistake', dow: 'Weekday', direction: 'Direction' },
      pNegEmo: 'Negative-emotion days', pOver: 'Heavy trading days', pComp: 'Required rules missed',
      unitTrade: 'trades', unitDay: 'days'
    }
  };
  function lang() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return (l === 'en' || l === 'es') ? 'en' : 'id'; }
  function L() { return T[lang()]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function toast(m) { try { if (typeof showToast === 'function') showToast(m); } catch (e) {} }
  function JOURNALS() { try { return Array.isArray(allJournals) ? allJournals : []; } catch (e) { return []; } }
  function DB() { try { return db; } catch (e) { return null; } }
  function UID() { try { return currentUser ? currentUser.uid : ''; } catch (e) { return ''; } }
  function mm(v) { try { return window.Money ? Money.format(v, { plus: true }) : (v > 0 ? '+' : '') + Math.round(v * 100) / 100; } catch (e) { return String(v); } }
  function pc(v) { return v === null || v === undefined ? L().na : Math.round(v) + '%'; }
  function n1(v) { return (Math.round(v * 10) / 10).toString(); }
  function dLabel(ds) { try { return new Date(ds + 'T12:00:00').toLocaleDateString(lang() === 'en' ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'short' }); } catch (e) { return ds; } }
  function dLabelY(ds) { try { return new Date(ds + 'T12:00:00').toLocaleDateString(lang() === 'en' ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ds; } }

  /* ---------- Kalimat (ID / EN) ---------- */
  var WS = {
    id: {
      netPos: function (p) { return 'Net P/L pekan ini positif: ' + mm(p.net) + ' dari ' + p.trades + ' trade.'; },
      wrHigh: function (p) { return 'Win rate ' + pc(p.wr) + ': ' + p.wins + ' win dari ' + p.trades + ' trade.'; },
      bestDay: function (p) { return 'Hari terbaik ' + dLabel(p.date) + ': ' + mm(p.pl) + '.'; },
      bestSetup: function (p) { return 'Setup ' + p.key + ' mencatat net ' + mm(p.net) + ' dari ' + p.trades + ' trade.'; },
      allRules: function () { return 'Semua rule wajib strategy tercentang di setiap journal pekan ini.'; },
      ratingHigh: function (p) { return 'Evaluasi dirimu rata-rata ★ ' + n1(p.avg) + ' dari ' + p.n + ' journal.'; },
      calm: function (p) { return 'Tidak ada tag emosi negatif selama ' + p.days + ' hari trading.'; },
      better: function (p) { return 'Net P/L lebih tinggi dari pekan lalu (' + mm(p.from) + ' → ' + mm(p.to) + ').'; },
      netNeg: function (p) { return 'Net P/L pekan ini negatif: ' + mm(p.net) + ' dari ' + p.trades + ' trade.'; },
      wrLow: function (p) { return 'Win rate ' + pc(p.wr) + ': ' + p.wins + ' win dari ' + p.trades + ' trade.'; },
      worstDay: function (p) { return 'Hari terburuk ' + dLabel(p.date) + ': ' + mm(p.pl) + '.'; },
      worstSetup: function (p) { return 'Setup ' + p.key + ' mencatat net ' + mm(p.net) + ' dari ' + p.trades + ' trade.'; },
      negEmo: function (p) { return p.days + ' hari diberi tag emosi negatif.'; },
      mistake: function (p) { return 'Mistake tag paling sering: ' + p.key + ' (' + p.count + ' trade).'; },
      missedRules: function (p) { return p.days + ' hari ada rule wajib strategy yang terlewat.'; },
      overCap: function (p) { return p.days + ' hari melebihi ' + p.cap + ' trade per hari (batas dari polamu).'; },
      lossStreak: function (p) { return 'Streak loss ' + p.n + (p.unit === 'trade' ? ' trade' : ' hari') + ' berturut-turut.'; },
      untagged: function (p) { return p.days + ' hari belum lengkap tag setup dan emosinya.'; },
      worse: function (p) { return 'Net P/L lebih rendah dari pekan lalu (' + mm(p.from) + ' → ' + mm(p.to) + ').'; }
    },
    en: {
      netPos: function (p) { return 'Net P/L this week is positive: ' + mm(p.net) + ' from ' + p.trades + ' trades.'; },
      wrHigh: function (p) { return 'Win rate ' + pc(p.wr) + ': ' + p.wins + ' wins from ' + p.trades + ' trades.'; },
      bestDay: function (p) { return 'Best day ' + dLabel(p.date) + ': ' + mm(p.pl) + '.'; },
      bestSetup: function (p) { return 'Setup ' + p.key + ' logged net ' + mm(p.net) + ' from ' + p.trades + ' trades.'; },
      allRules: function () { return 'Every required strategy rule was checked in every journal this week.'; },
      ratingHigh: function (p) { return 'Your self-rating averaged ★ ' + n1(p.avg) + ' across ' + p.n + ' journals.'; },
      calm: function (p) { return 'No negative emotion tags across ' + p.days + ' trading days.'; },
      better: function (p) { return 'Net P/L is higher than last week (' + mm(p.from) + ' → ' + mm(p.to) + ').'; },
      netNeg: function (p) { return 'Net P/L this week is negative: ' + mm(p.net) + ' from ' + p.trades + ' trades.'; },
      wrLow: function (p) { return 'Win rate ' + pc(p.wr) + ': ' + p.wins + ' wins from ' + p.trades + ' trades.'; },
      worstDay: function (p) { return 'Worst day ' + dLabel(p.date) + ': ' + mm(p.pl) + '.'; },
      worstSetup: function (p) { return 'Setup ' + p.key + ' logged net ' + mm(p.net) + ' from ' + p.trades + ' trades.'; },
      negEmo: function (p) { return p.days + ' day(s) tagged with a negative emotion.'; },
      mistake: function (p) { return 'Most frequent mistake tag: ' + p.key + ' (' + p.count + ' trades).'; },
      missedRules: function (p) { return p.days + ' day(s) with a required strategy rule missed.'; },
      overCap: function (p) { return p.days + ' day(s) above ' + p.cap + ' trades per day (limit taken from your pattern).'; },
      lossStreak: function (p) { return 'Losing streak of ' + p.n + (p.unit === 'trade' ? ' trades' : ' days') + ' in a row.'; },
      untagged: function (p) { return p.days + ' day(s) missing setup or emotion tags.'; },
      worse: function (p) { return 'Net P/L is lower than last week (' + mm(p.from) + ' → ' + mm(p.to) + ').'; }
    }
  };
  function wsent(o) { var f = WS[lang()][o.k]; return f ? f(o) : ''; }

  function pLabel(p) {
    var t = L();
    if (p.kind === 'neg-emotion') return t.pNegEmo; if (p.kind === 'overtrade') return t.pOver; if (p.kind === 'compliance') return t.pComp;
    return p.dims.map(function (d, i) { return (p.kind === 'dim' ? t.dim[d] + ' ' : '') + p.parts[i]; }).join(' · ');
  }
  function pSent(p) {
    var en = lang() === 'en', t = L();
    if (p.kind === 'dim' || p.kind === 'combo') {
      var s = p.trades + ' ' + t.tr + ', ' + t.wr + ' ' + pc(p.winRate) + ', net ' + mm(p.net) + ' (' + t.ex + ' ' + mm(p.expectancy) + t.perTr + ').';
      if (p.vsWin !== null && p.vsWin > 0) s += en ? ' Win rate is ' + Math.round(p.vsWin) + ' points below your overall average.' : ' Win rate ' + Math.round(p.vsWin) + ' poin di bawah rata-rata keseluruhanmu.';
      return s;
    }
    var vs = p.avgOther === null ? '' : (en ? ' vs ' : ' vs ') + mm(p.avgOther) + (en ? '/day on other days' : '/hari pada hari lain');
    if (p.kind === 'neg-emotion') return (en ? p.days + ' days tagged ' : p.days + ' hari bertag ') + p.names.join(', ') + ': net ' + mm(p.net) + ', ' + (en ? 'average ' : 'rata-rata ') + mm(p.avgDay) + (en ? '/day' : '/hari') + vs + '.';
    if (p.kind === 'overtrade') return (en ? p.days + ' days with more than ' + p.cap + ' trades (your daily median is ' + p.median + '): ' : p.days + ' hari dengan lebih dari ' + p.cap + ' trade (median harianmu ' + p.median + '): ') + 'net ' + mm(p.net) + ', ' + (en ? 'average ' : 'rata-rata ') + mm(p.avgDay) + (en ? '/day' : '/hari') + vs + '.';
    return (en ? p.days + ' days with a required rule missed: ' : p.days + ' hari ada rule wajib terlewat: ') + 'net ' + mm(p.net) + ', ' + (en ? 'average ' : 'rata-rata ') + mm(p.avgDay) + (en ? '/day' : '/hari') + (p.avgOther === null ? '' : (en ? ' vs ' + mm(p.avgOther) + '/day when all rules were checked' : ' vs ' + mm(p.avgOther) + '/hari saat semua rule tercentang')) + '.';
  }

  var FT = {
    id: {
      compliance: { t: 'Centang semua rule wajib sebelum entry', d: function (p) { return 'Di datamu, ' + p.days + ' hari dengan rule wajib terlewat berkinerja lebih buruk. Target pekan ini: 0 hari dengan rule wajib terlewat.'; }, g: '0 hari rule wajib terlewat' },
      overtrade: { t: 'Batasi jumlah trade per hari', d: function (p) { return 'Hari dengan lebih dari ' + p.cap + ' trade berkinerja lebih buruk dari hari biasamu. Target: tidak ada hari yang melebihi ' + p.cap + ' trade.'; }, g: 'Maks. {cap} trade per hari' },
      emotion: { t: 'Jeda saat emosi negatif muncul', d: function (p) { return 'Hari dengan tag ' + p.names.join(', ') + ' cenderung berakhir rugi. Target: paling banyak 1 hari ber-tag emosi negatif pekan ini; bila muncul, berhenti dan tulis journal dulu sebelum trade lagi.'; }, g: 'Maks. 1 hari emosi negatif' },
      review: { t: function (p) { return 'Telaah ulang ' + p.label; }, d: function (p) { return p.trades + ' trade di sini bernet ' + mm(p.net) + '. Buka journal-nya, cari kesamaan di tiap loss, lalu tulis satu aturan baru di Strategy Library. Dinilai manual.'; }, g: 'Satu aturan baru tertulis' },
      journaling: { t: 'Lengkapi tag setup dan emosi', d: function (p) { return 'Baru ' + Math.round(p.pct) + '% trade punya tag setup, jadi analisis belum tajam. Target: setiap hari journal punya tag setup dan emosi.'; }, g: '0 hari belum bertag' },
      consistency: { t: 'Journal minimal 3 hari pekan ini', d: function () { return 'Belum ada pola kerugian yang menonjol. Jaga kebiasaan mencatat; makin banyak data, makin tajam analisisnya.'; }, g: '≥ 3 hari journal' }
    },
    en: {
      compliance: { t: 'Check every required rule before entry', d: function (p) { return 'In your data, ' + p.days + ' days with a missed required rule did worse. Target this week: 0 days with a required rule missed.'; }, g: '0 days with a required rule missed' },
      overtrade: { t: 'Cap your trades per day', d: function (p) { return 'Days with more than ' + p.cap + ' trades did worse than your usual days. Target: no day above ' + p.cap + ' trades.'; }, g: 'Max {cap} trades per day' },
      emotion: { t: 'Pause when a negative emotion shows up', d: function (p) { return 'Days tagged ' + p.names.join(', ') + ' tend to end in a loss. Target: at most 1 negative-emotion day this week; when it happens, stop and write the journal before trading again.'; }, g: 'Max 1 negative-emotion day' },
      review: { t: function (p) { return 'Review ' + p.label + ' again'; }, d: function (p) { return p.trades + ' trades here net ' + mm(p.net) + '. Open the journals, find what the losses share, then write one new rule in the Strategy Library. Self-assessed.'; }, g: 'One new rule written' },
      journaling: { t: 'Complete setup and emotion tags', d: function (p) { return 'Only ' + Math.round(p.pct) + '% of trades have a setup tag, so the analysis is not sharp yet. Target: every journal day has a setup and an emotion tag.'; }, g: '0 untagged days' },
      consistency: { t: 'Journal at least 3 days this week', d: function () { return 'No standout loss pattern yet. Keep the logging habit; more data makes the analysis sharper.'; }, g: '≥ 3 journal days' }
    }
  };
  function fMeta(f) {
    var d = FT[lang()][f.id], p = Object.assign({}, f.params);
    if (f.id === 'review') p.label = (L().dim[p.dim] || p.dim) + ' ' + p.key;
    return { title: typeof d.t === 'function' ? d.t(p) : d.t, desc: d.d(p), goal: d.g.replace('{cap}', p.cap) };
  }

  /* ---------- State ---------- */
  var S = { range: '90', week: null, picked: [], loaded: false, err: false, uid: '', pulled: '' };
  function root() { return $('coach-section'); }
  function visible() { var r = root(); return !!r && !r.classList.contains('hidden'); }
  function fromDate(range) { if (range === 'all') return null; return C.addDays(C.today(), -(range === '30' ? 30 : 90)); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function key() { return 'aicoach:' + (UID() || 'anon'); }

  function cleanPicked(a) {
    return (Array.isArray(a) ? a : []).filter(function (f) { return f && FT.id[f.id]; }).slice(0, 3).map(function (f) {
      return { id: String(f.id), metric: f.metric || null, op: f.op || null, target: typeof f.target === 'number' ? f.target : null, params: f.params && typeof f.params === 'object' ? f.params : {}, since: String(f.since || '') };
    });
  }
  function loadPicked() {
    var uid = UID(); if (S.uid === uid && S.loaded) return; S.uid = uid;
    var raw = null; try { raw = JSON.parse(lsGet(key()) || 'null'); } catch (e) {}
    S.picked = cleanPicked(raw && raw.picked); S.ts = raw && raw.ts || 0;
  }
  function savePicked() {
    S.ts = Date.now(); lsSet(key(), JSON.stringify({ ts: S.ts, picked: S.picked }));
    var uid = UID(), d = DB(); if (!uid || !d) return;
    try { var r = d.collection('users').doc(uid).set({ coachFocus: { ts: S.ts, picked: S.picked } }, { merge: true }); if (r && r.catch) r.catch(function () {}); } catch (e) {}
  }
  function pullRemote() {
    var uid = UID(), d = DB(); if (!uid || !d || S.pulled === uid) return; S.pulled = uid;
    try {
      d.collection('users').doc(uid).get().then(function (snap) {
        var x = snap && snap.exists ? snap.data() : null, r = x && x.coachFocus; if (!r || UID() !== uid) return;
        if ((r.ts || 0) > (S.ts || 0)) { S.picked = cleanPicked(r.picked); S.ts = r.ts; lsSet(key(), JSON.stringify({ ts: S.ts, picked: S.picked })); if (visible()) render(); }
      }).catch(function () {});
    } catch (e) {}
  }

  /* ---------- CSS ---------- */
  var css =
'.ac{--ac-tx:rgba(255,255,255,.93);--ac-sub:rgba(235,235,245,.64);--ac-mut:rgba(235,235,245,.42);--ac-bd:rgba(255,255,255,.10);--ac-bd2:rgba(255,255,255,.18);--ac-in:rgba(255,255,255,.05);--ac-gold:#d9b857;--ac-gold-s:rgba(212,175,55,.13);--ac-gold-b:rgba(212,175,55,.34);--ac-pos:#2dd4bf;--ac-pos-s:rgba(45,212,191,.13);--ac-neg:#ff7a68;--ac-neg-s:rgba(255,122,104,.13)}' +
'body.light .ac{--ac-tx:rgba(0,0,0,.9);--ac-sub:rgba(0,0,0,.62);--ac-mut:rgba(0,0,0,.42);--ac-bd:rgba(0,0,0,.10);--ac-bd2:rgba(0,0,0,.2);--ac-in:rgba(0,0,0,.035);--ac-gold:#8a6a14;--ac-gold-s:rgba(176,138,30,.12);--ac-gold-b:rgba(138,106,20,.35);--ac-pos:#0f766e;--ac-pos-s:rgba(15,118,110,.11);--ac-neg:#b83526;--ac-neg-s:rgba(184,53,38,.10)}' +
'.ac{color:var(--ac-tx)}.ac *{box-sizing:border-box}' +
'.ac-head{margin-bottom:16px}.ac-h1{font-size:22px;font-weight:600;letter-spacing:-.02em;line-height:1.15;margin:0}.ac-h1 small{display:block;font-size:13px;font-weight:500;letter-spacing:0;color:var(--ac-sub);margin-top:8px;max-width:52ch;line-height:1.45}' +
'.ac-badge{display:inline-flex;align-items:center;gap:8px;margin-top:12px;font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;padding:4px 12px;border-radius:999px;border:1px solid var(--ac-gold-b);background:var(--ac-gold-s);color:var(--ac-gold)}' +
'.ac-card{border-radius:24px;padding:20px;margin-bottom:16px;min-width:0}.ac-ch{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}' +
'.ac-ch h3{margin:0;font-size:17px;font-weight:600;letter-spacing:-.01em}.ac-ch p{margin:4px 0 0;font-size:13px;color:var(--ac-sub);line-height:1.4;max-width:52ch}' +
'.ac-seg{display:inline-flex;padding:4px;border-radius:16px;border:1px solid var(--ac-bd);background:var(--ac-in)}.ac-seg button{min-height:38px;padding:0 16px;border-radius:12px;border:0;background:none;color:var(--ac-sub);font:inherit;font-size:13px;font-weight:600;cursor:pointer}.ac-seg button[aria-pressed=true]{background:var(--ac-gold-s);color:var(--ac-gold);box-shadow:inset 0 0 0 1px var(--ac-gold-b)}' +
'.ac-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 20px;border-radius:16px;font-weight:600;font-size:15px;cursor:pointer;border:1px solid var(--ac-bd);background:var(--ac-in);color:var(--ac-tx);font-family:inherit}.ac-btn:hover{border-color:var(--ac-bd2)}.ac-btn:active{transform:scale(.97)}.ac-btn:disabled{opacity:.45;cursor:default}' +
'.ac-btn.gold{background:linear-gradient(180deg,#f0d789,#d4af37 55%,#b8932a);color:#1a1405;border-color:rgba(255,255,255,.3)}.ac-btn.sm{min-height:40px;padding:0 16px;font-size:13px;border-radius:12px}.ac-btn[aria-pressed=true]{border-color:var(--ac-gold-b);color:var(--ac-gold);background:var(--ac-gold-s)}' +
'.ac-btn:focus-visible,.ac-seg button:focus-visible,.ac-ib:focus-visible{outline:2px solid var(--ac-gold);outline-offset:2px}.ac-btn svg,.ac-ib svg{width:16px;height:16px}' +
'.ac-ib{flex:none;width:44px;height:44px;border-radius:16px;border:1px solid var(--ac-bd);background:var(--ac-in);color:var(--ac-sub);display:grid;place-items:center;cursor:pointer}.ac-ib:disabled{opacity:.35;cursor:default}' +
'.ac-wn{display:flex;align-items:center;gap:8px}.ac-wl{font-weight:700;font-size:15px;min-width:0;text-align:center;flex:1;white-space:nowrap}.ac-wl small{display:block;font-weight:500;font-size:12px;color:var(--ac-mut);letter-spacing:.01em}' +
'.ac-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}.ac-k{padding:12px 12px;border-radius:16px;background:var(--ac-in);border:1px solid var(--ac-bd);min-width:0;text-align:center}.ac-k b{display:block;font-size:17px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.01em;overflow-wrap:anywhere}.ac-k span{display:block;font-size:12px;color:var(--ac-sub);margin-top:4px;font-weight:600}' +
'.ac-pos{color:var(--ac-pos)}.ac-neg{color:var(--ac-neg)}.ac-note{font-size:12px;color:var(--ac-mut);margin:12px 0 0;line-height:1.45}.ac-warn{font-size:13px;color:var(--ac-gold);background:var(--ac-gold-s);border-radius:12px;padding:8px 12px;margin:0 0 12px;line-height:1.4}' +
'.ac-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ac-col h4{margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0;text-transform:none}.ac-col.w h4{color:var(--ac-pos)}.ac-col.i h4{color:var(--ac-neg)}' +
'.ac-li{padding:12px 12px;border-radius:16px;background:var(--ac-in);border:1px solid var(--ac-bd);margin-bottom:8px;font-size:15px;line-height:1.45;overflow-wrap:anywhere}.ac-none{font-size:13px;color:var(--ac-mut);padding:8px 2px}' +
'.ac-item{padding:16px;border-radius:20px;background:var(--ac-in);border:1px solid var(--ac-bd);margin-bottom:12px}.ac-it{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.ac-it b{font-size:17px;font-weight:600;overflow-wrap:anywhere}' +
'.ac-tier{font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;padding:4px 8px;border-radius:999px;border:1px solid var(--ac-bd2);color:var(--ac-sub);white-space:nowrap}.ac-tier.r{color:var(--ac-gold);border-color:var(--ac-gold-b);background:var(--ac-gold-s)}' +
'.ac-p{margin:8px 0 0;font-size:15px;line-height:1.5;color:var(--ac-sub);overflow-wrap:anywhere}' +
'.ac-act{border-color:var(--ac-gold-b);background:linear-gradient(160deg,var(--ac-gold-s),transparent 70%),var(--ac-in)}.ac-prog{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;font-size:13px;color:var(--ac-sub)}' +
'.ac-st{font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;padding:4px 12px;border-radius:999px}.ac-st.ok{background:var(--ac-pos-s);color:var(--ac-pos)}.ac-st.no{background:var(--ac-neg-s);color:var(--ac-neg)}.ac-st.na{background:var(--ac-in);color:var(--ac-sub);border:1px solid var(--ac-bd)}' +
'.ac-goal{font-size:12px;font-weight:600;color:var(--ac-gold);margin-top:8px}.ac-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}' +
'.ac-empty{text-align:center;padding:40px 24px;border-radius:28px}.ac-empty h3{margin:0 0 8px;font-size:17px;font-weight:600}.ac-empty p{margin:0 auto 16px;max-width:42ch;color:var(--ac-sub);font-size:15px;line-height:1.5}' +
'.ac-skel{height:150px;border-radius:24px;margin-bottom:16px;background:linear-gradient(90deg,var(--ac-in),var(--ac-bd),var(--ac-in));background-size:200% 100%;animation:acSk 1.3s linear infinite}@keyframes acSk{to{background-position:-200% 0}}' +
'@media(max-width:640px){.ac-kpis{grid-template-columns:repeat(2,1fr)}.ac-cols{grid-template-columns:1fr}.ac-card{padding:16px;border-radius:24px}.ac-h1{font-size:22px}}' +
'#coach-section:not(.hidden){animation:miTab var(--mi-base,.4s) var(--mi-ease,ease) backwards}' +
'@media(prefers-reduced-motion:reduce){.ac-skel{animation:none}.ac-btn:active{transform:none}}';
  (function () { var s = document.createElement('style'); s.id = 'ac-css'; s.textContent = css; document.head.appendChild(s); })();

  var IC = {
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>'
  };

  /* ---------- Render ---------- */
  var cache = null; // hasil analisis terakhir (dipakai tombol salin)
  function analysis() { return C.analyze(JOURNALS(), { from: fromDate(S.range), week: S.week || undefined }); }

  function weeklyHTML(A) {
    var t = L(), w = A.week, ws = w.weekStart, cur = ws === A.currentWeek;
    var nav = '<div class="ac-wn"><button type="button" class="ac-ib" data-ac="wk" data-w="' + esc(w.prevWeek || '') + '" aria-label="' + esc(t.wPrev) + '"' + (w.prevWeek ? '' : ' disabled') + '>' + IC.left + '</button>' +
      '<div class="ac-wl" aria-live="polite">' + esc(dLabel(ws) + ' – ' + dLabelY(w.weekEnd)) + '<small>' + (cur ? esc(t.wNow) : '') + '</small></div>' +
      '<button type="button" class="ac-ib" data-ac="wk" data-w="' + esc(w.nextWeek || '') + '" aria-label="' + esc(t.wNext) + '"' + (w.nextWeek ? '' : ' disabled') + '>' + IC.right + '</button></div>';
    var h = '<section class="glass ac-card" aria-labelledby="ac-wt"><div class="ac-ch"><h3 id="ac-wt">' + esc(t.wTitle) + '</h3>' + nav + '</div>';
    if (w.empty) return h + '<p class="ac-none">' + esc(t.wEmpty) + ' ' + esc(t.wEmptyGo) + '</p></section>';
    var s = w.stats, cls = s.net > 0 ? ' ac-pos' : s.net < 0 ? ' ac-neg' : '';
    if (w.small) h += '<p class="ac-warn">' + esc(t.small) + '</p>';
    h += '<div class="ac-kpis"><div class="ac-k"><b class="' + cls.trim() + '">' + esc(mm(s.net)) + '</b><span>' + esc(t.kNet) + '</span></div>' +
      '<div class="ac-k"><b>' + esc(pc(s.winRate)) + '</b><span>' + esc(t.kWin) + '</span></div>' +
      '<div class="ac-k"><b>' + s.trades + '</b><span>' + esc(t.kTr) + '</span></div>' +
      '<div class="ac-k"><b>' + w.journalDays + '</b><span>' + esc(t.kDays) + '</span></div></div>';
    h += '<div class="ac-cols"><div class="ac-col w"><h4>' + esc(t.well) + '</h4>' + (w.wins.length ? w.wins.map(function (o) { return '<div class="ac-li">' + esc(wsent(o)) + '</div>'; }).join('') : '<div class="ac-none">' + esc(t.wNone) + '</div>') + '</div>' +
      '<div class="ac-col i"><h4>' + esc(t.imp) + '</h4>' + (w.improve.length ? w.improve.map(function (o) { return '<div class="ac-li">' + esc(wsent(o)) + '</div>'; }).join('') : '<div class="ac-none">' + esc(t.wNone) + '</div>') + '</div></div>';
    return h + '</section>';
  }

  function patternsHTML(A) {
    var t = L(), P = A.patterns, h = '<section class="glass ac-card" aria-labelledby="ac-pt"><div class="ac-ch"><div><h3 id="ac-pt">' + esc(t.pTitle) + '</h3><p>' + esc(t.pSub) + '</p></div>' +
      '<div class="ac-seg" role="group" aria-label="' + esc(t.rangeLbl) + '">' + [['30', t.r30], ['90', t.r90], ['all', t.rAll]].map(function (r) { return '<button type="button" data-ac="range" data-r="' + r[0] + '" aria-pressed="' + (S.range === r[0]) + '">' + esc(r[1]) + '</button>'; }).join('') + '</div></div>';
    if (!P.enough) return h + '<p class="ac-none">' + esc(t.pLow + ' ' + P.overall.trades + ' ' + t.pLow2) + '</p></section>';
    if (!P.items.length) return h + '<p class="ac-none">' + esc(t.pNone) + '</p></section>';
    P.items.forEach(function (p) {
      h += '<div class="ac-item"><div class="ac-it"><b>' + esc(pLabel(p)) + '</b><span class="ac-tier' + (p.tier === 'reliable' ? ' r' : '') + '">' + esc(p.tier === 'reliable' ? t.tReliable : t.tInsight) + '</span></div><p class="ac-p">' + esc(pSent(p)) + '</p>' +
        (p.also && p.also.length ? '<p class="ac-note" style="margin-top:8px">' + esc(t.also) + ': ' + esc(p.also.map(pLabel).join(', ')) + '</p>' : '') + '</div>';
    });
    if (P.total > P.items.length) h += '<p class="ac-note">+' + (P.total - P.items.length) + ' ' + esc(t.more) + '</p>';
    return h + '<p class="ac-note">' + esc(t.pNote) + '</p></section>';
  }

  function bestHTML(A) {
    var t = L(), B = A.best, h = '<section class="glass ac-card" aria-labelledby="ac-bt"><div class="ac-ch"><div><h3 id="ac-bt">' + esc(t.bTitle) + '</h3><p>' + esc(t.bSub) + '</p></div></div>';
    if (!B.items.length) h += '<p class="ac-none">' + esc(B.enough ? t.bNone : t.pLow + ' ' + B.overall.trades + ' ' + t.pLow2) + '</p>';
    B.items.forEach(function (b, i) {
      h += '<div class="ac-item"><div class="ac-it"><b>' + (i + 1) + '. ' + esc(b.key) + '</b><span class="ac-tier' + (b.tier === 'reliable' ? ' r' : '') + '">' + esc(b.tier === 'reliable' ? t.tReliable : t.tInsight) + '</span></div>' +
        '<p class="ac-p"><span class="ac-pos">' + esc(mm(b.net)) + '</span> · ' + b.trades + ' ' + esc(t.tr) + ' · ' + esc(t.wr) + ' ' + esc(pc(b.winRate)) + ' · ' + esc(t.ex) + ' ' + esc(mm(b.expectancy)) + esc(t.perTr) + '</p></div>';
    });
    if (B.combos.length) h += '<p class="ac-note" style="margin:4px 0 8px">' + esc(t.bCombo) + '</p>' + B.combos.map(function (c) { return '<div class="ac-li"><b>' + esc(c.label) + '</b> · ' + c.trades + ' ' + esc(t.tr) + ' · ' + esc(mm(c.net)) + '</div>'; }).join('');
    if (B.coverage && B.coverage.total && B.coverage.pct < 60) h += '<p class="ac-note">' + esc(t.bCov.replace('{p}', Math.round(B.coverage.pct))) + '</p>';
    return h + '</section>';
  }

  function progressHTML(f, units, ws) {
    var t = L(), pr = C.progress(f, units, JOURNALS(), ws);
    if (pr.manual) return '<span class="ac-st na">' + esc(t.fManual) + '</span>';
    if (pr.value === null) return '<span class="ac-st na">' + esc(t.fNoData) + '</span>';
    return '<span>' + esc(t.fNow) + ': <b>' + pr.value + '</b> / ' + esc(t.fTarget.toLowerCase()) + ' ' + (pr.op === '<=' ? '≤' : '≥') + ' ' + pr.target + '</span><span class="ac-st ' + (pr.met ? 'ok' : 'no') + '">' + esc(pr.met ? t.fMet : t.fNot) + '</span>';
  }

  function focusHTML(A) {
    var t = L(), units = V.normalize(JOURNALS()), ws = A.currentWeek, h = '<section class="glass ac-card" aria-labelledby="ac-ft"><div class="ac-ch"><div><h3 id="ac-ft">' + esc(t.fTitle) + '</h3><p>' + esc(t.fSub) + '</p></div></div>';
    if (S.picked.length) {
      h += S.picked.map(function (f, i) {
        var m = fMeta(f);
        return '<div class="ac-item ac-act"><div class="ac-it"><b>' + esc(m.title) + '</b><span class="ac-tier r">' + esc(t.fActive) + '</span></div><div class="ac-goal">' + esc(t.fTarget) + ': ' + esc(m.goal) + '</div>' +
          '<div class="ac-prog">' + progressHTML(f, units, ws) + '</div><div class="ac-row"><button type="button" class="ac-btn sm" data-ac="drop" data-i="' + i + '">' + esc(t.fDrop) + '</button></div></div>';
      }).join('');
    }
    var pickedIds = {}; S.picked.forEach(function (f) { pickedIds[f.id] = 1; });
    var sugg = A.focus.filter(function (f) { return !pickedIds[f.id]; });
    sugg.forEach(function (f) {
      var m = fMeta(f);
      h += '<div class="ac-item"><div class="ac-it"><b>' + esc(m.title) + '</b></div><p class="ac-p">' + esc(m.desc) + '</p><div class="ac-goal">' + esc(t.fTarget) + ': ' + esc(m.goal) + '</div>' +
        '<div class="ac-row"><button type="button" class="ac-btn sm" data-ac="pick" data-id="' + esc(f.id) + '" aria-pressed="false">' + esc(t.fPick) + '</button></div></div>';
    });
    return h + '</section>';
  }

  function chatHTML() {
    var t = L();
    return '<section class="glass ac-card" aria-labelledby="ac-ct"><div class="ac-ch"><div><h3 id="ac-ct">' + esc(t.cTitle) + '</h3><p>' + esc(t.cBody) + '</p></div></div>' +
      '<button type="button" class="ac-btn" data-ac="copy">' + IC.copy + esc(t.cBtn) + '</button></section>';
  }

  function render() {
    var r = root(); if (!r) return; var t = L(); r.classList.add('ac');
    loadPicked();
    var head = '<div class="ac-head"><h2 class="ac-h1"><span class="gold-text">' + esc(t.title) + '</span><small>' + esc(t.sub) + '</small></h2><span class="ac-badge">' + esc(t.badge) + '</span></div>';
    if (S.err && !JOURNALS().length) { r.innerHTML = head + '<div class="glass ac-empty"><p style="margin:0">' + esc(t.err) + '</p></div>'; return; }
    if (!S.loaded && !JOURNALS().length) { r.innerHTML = head + '<div class="ac-skel" aria-label="' + esc(t.loading) + '"></div><div class="ac-skel"></div>'; return; }
    var A = analysis(); cache = A;
    if (A.empty) { r.innerHTML = head + '<div class="glass ac-empty"><h3>' + esc(t.emptyT) + '</h3><p>' + esc(t.emptyS) + '</p><button type="button" class="ac-btn gold" data-ac="new">' + esc(t.emptyGo) + '</button></div>'; return; }
    r.innerHTML = head + weeklyHTML(A) + patternsHTML(A) + bestHTML(A) + focusHTML(A) + chatHTML();
  }

  /* ---------- Ringkasan untuk ditempel ke AI (hanya agregat) ---------- */
  function summaryText() {
    var A = cache || analysis(), en = lang() === 'en', t = L(), o = A.overall, L1 = [];
    L1.push(en ? 'Trading journal summary (aggregate numbers only):' : 'Ringkasan journal trading (hanya angka agregat):');
    L1.push((en ? 'Period: ' : 'Periode: ') + (S.range === 'all' ? t.rAll : S.range === '30' ? t.r30 : t.r90) + ' · ' + o.trades + ' ' + t.tr + ', ' + t.wr + ' ' + pc(o.winRate) + ', net ' + mm(o.net) + (o.profitFactor !== null ? ', profit factor ' + (Math.round(o.profitFactor * 100) / 100) : ''));
    if (A.patterns.items.length) { L1.push(''); L1.push(en ? 'Recurring loss patterns:' : 'Pola kerugian berulang:'); A.patterns.items.forEach(function (p) { L1.push('- ' + pLabel(p) + ': ' + pSent(p)); }); }
    if (A.best.items.length) { L1.push(''); L1.push(en ? 'Best setups:' : 'Setup terbaik:'); A.best.items.forEach(function (b) { L1.push('- ' + b.key + ': ' + b.trades + ' ' + t.tr + ', ' + t.wr + ' ' + pc(b.winRate) + ', net ' + mm(b.net)); }); }
    var w = A.week; if (!w.empty) {
      L1.push(''); L1.push((en ? 'Week ' : 'Pekan ') + w.weekStart + ' – ' + w.weekEnd + ': net ' + mm(w.stats.net) + ', ' + w.stats.trades + ' ' + t.tr + ', ' + t.wr + ' ' + pc(w.stats.winRate));
      w.wins.forEach(function (x) { L1.push('+ ' + wsent(x)); }); w.improve.forEach(function (x) { L1.push('- ' + wsent(x)); });
    }
    if (A.focus.length) { L1.push(''); L1.push(en ? 'Suggested focus:' : 'Fokus yang disarankan:'); A.focus.forEach(function (f) { L1.push('- ' + fMeta(f).title); }); }
    L1.push(''); L1.push(en ? 'Please act as my trading coach: point out habits to improve and ask me follow-up questions. Do not give entry or exit signals.' : 'Tolong jadi coach trading saya: tunjukkan kebiasaan yang perlu diperbaiki dan ajukan pertanyaan lanjutan. Jangan beri sinyal entry atau exit.');
    return L1.join('\n');
  }
  function copyText(txt) {
    var t = L();
    function fallback() {
      try { var ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); document.body.removeChild(ta); toast(ok ? t.cOk : t.cFail); } catch (e) { toast(t.cFail); }
    }
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(function () { toast(t.cOk); }, fallback); return; } } catch (e) {}
    fallback();
  }

  /* ---------- Interaksi ---------- */
  function onClick(ev) {
    var b = ev.target.closest ? ev.target.closest('[data-ac]') : null; if (!b || b.disabled) return;
    var act = b.getAttribute('data-ac'), t = L();
    if (act === 'range') { S.range = b.getAttribute('data-r'); render(); return; }
    if (act === 'wk') { var w = b.getAttribute('data-w'); if (w) { S.week = w; render(); } return; }
    if (act === 'pick') {
      if (S.picked.length >= 3) { toast(t.fMax); return; }
      var A = cache || analysis(), f = A.focus.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0]; if (!f) return;
      S.picked.push({ id: f.id, metric: f.metric, op: f.op, target: f.target, params: f.params, since: C.today() }); savePicked(); render(); toast(t.fSaved); return;
    }
    if (act === 'drop') { S.picked.splice(+b.getAttribute('data-i'), 1); savePicked(); render(); toast(t.fDropped); return; }
    if (act === 'copy') { copyText(summaryText()); return; }
    if (act === 'new') { var fab = $('btn-new-journal-fab'); if (fab) fab.click(); }
  }

  /* Listener window dipasang SEKARANG (bukan menunggu DOMContentLoaded) supaya event 'journals-loaded' awal tidak terlewat. */
  var skelTimer = null;
  function markLoaded(err) { S.loaded = true; S.err = !!err; clearTimeout(skelTimer); if (visible()) render(); }
  window.addEventListener('viewchange', function (ev) {
    if (!(ev && ev.detail && ev.detail.view === 'coach')) return;
    S.week = null; pullRemote(); render();
    /* jaring pengaman: bila event muat tidak pernah datang, jangan biarkan skeleton selamanya */
    clearTimeout(skelTimer); if (!S.loaded) skelTimer = setTimeout(function () { markLoaded(false); }, 1200);
  });
  /* Skrip ini dimuat di akhir halaman, jadi event muat awal bisa sudah lewat. Bila tidak ada kabar dalam 2,5 dtk,
     anggap pemuatan selesai: journal terisi -> tampil; tetap kosong -> state "Belum ada journal". */
  setTimeout(function () { if (!S.loaded) markLoaded(false); }, 2500);
  window.addEventListener('journals-loaded', function () { pullRemote(); markLoaded(false); });
  window.addEventListener('journals-error', function () { markLoaded(true); });

  function init() {
    var r = root(); if (!r) return;
    r.addEventListener('click', onClick);
    var sel = $('app-language'); if (sel) sel.addEventListener('change', function () { setTimeout(function () { if (visible()) render(); }, 120); });
  }
  window.AICoachUI = { render: render, summaryText: summaryText, open: function () { var n = $('nav-coach'); if (n) n.click(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
