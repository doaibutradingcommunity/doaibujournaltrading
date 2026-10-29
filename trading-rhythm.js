/* v16.93 · Personal Trading Rhythm
   Ringkasan kebiasaan journaling yang menilai KONSISTENSI, bukan profit. Tampil di Beranda, di bawah kartu-kartu bawaan.
     - Rutinitas hari ini  : Pre-Market, checklist pra-trade, journal, review harian (+ review mingguan), masing-masing bisa diselesaikan lewat tombol
     - Kalender konsistensi: 5 minggu terakhir (Senin-Minggu). Akhir pekan kosong tidak dianggap bolong
     - Belum dievaluasi    : hari ber-journal yang review hariannya belum lengkap
     - Rencana             : Pre-Market yang sudah / belum diisi bagian After-nya
   MURNI BACA. Tidak menulis ke Firestore/localStorage, tidak menyentuh V16Stats, P/L, win rate, atau data journal.
   Tidak ada angka P/L di kartu ini. Semua aksi memanggil fungsi/tombol asli (openNewJournalForm, openReviewForm, editJournal, tab Journal).

   Sumber data (semua sudah dimuat aplikasi):
     allJournals                              -> hari ber-journal (field `date`)
     allOutlooks[tanggal]                     -> rencana Pre-Market (bias/reason/charts) dan `after` (review rencana)
     users/{uid}/reviews/d_{tgl}, w_{senin}   -> review harian/mingguan {w,x,i}; cadangan localStorage 'v2rev:d:{tgl}' / 'v2rev:w:{senin}'
     localStorage v22ckitems + v21ck:{tgl}    -> checklist pra-trade (sama dengan Beranda)

   API: window.TradingRhythm.compute(input) murni (dipakai uji), .render(), .reviewState(o), .version */
(function () {
  'use strict';
  if (window.TradingRhythm) return;

  var WEEKS = 5;           // panjang kalender
  var REVIEW_NEED = 3;     // review harian "selesai" bila w, x, i terisi (sama dengan Fokus Hari Ini di dashboard). Turunkan ke 1 untuk lebih longgar

  /* ---------- tanggal (lokal, tanpa zona waktu) ---------- */
  function p2(n) { return String(n).padStart(2, '0'); }
  function dstr(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function parse(s) { var m = String(s || '').split('-'); return new Date(+m[0], +m[1] - 1, +m[2], 12); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return dstr(d); }
  function dow(s) { return (parse(s).getDay() + 6) % 7; }                 // 0 = Senin ... 6 = Minggu
  function mondayOf(s) { return addDays(s, -dow(s)); }
  function weekend(s) { return dow(s) > 4; }
  function todayStr() {
    try { if (window.DoaIbuReminder && DoaIbuReminder.localDate) return DoaIbuReminder.localDate(); } catch (e) {}
    return dstr(new Date());
  }

  /* ---------- logika murni ---------- */
  function filled(v) { return String(v == null ? '' : v).trim().length > 0; }
  function reviewState(o) {                       // {w,x,i} -> 'none' | 'partial' | 'done'
    var n = ['w', 'x', 'i'].filter(function (k) { return o && filled(o[k]); }).length;
    return n === 0 ? 'none' : n >= REVIEW_NEED ? 'done' : 'partial';
  }
  function hasPlan(o) { return !!(o && (filled(o.bias) || filled(o.reason) || (o.charts && o.charts.length))); }
  function planReviewed(o) {
    var a = o && o.after;
    return !!(a && ['actual', 'happened', 'change', 'reflect'].some(function (k) { return filled(a[k]); }));
  }

  /* input: {today, journals:[{id,date,trades}], outlooks:{tgl:{...}}, reviews:{'d_tgl':{w,x,i}, 'w_senin':{...}}, ck:{done,total}} */
  function compute(inp) {
    var today = inp.today, js = inp.journals || [], outs = inp.outlooks || {}, rvs = inp.reviews || {}, ck = inp.ck || { done: 0, total: 0 };
    var jmap = {};
    js.forEach(function (j) {
      if (!j || !j.date) return;
      var n = Math.max(1, j.trades || 1), x = jmap[j.date];
      if (x) x.trades += n; else jmap[j.date] = { id: j.id || j.date, date: j.date, trades: n };
    });
    function rv(date) { return reviewState(rvs['d_' + date]); }

    var start = addDays(mondayOf(today), -7 * (WEEKS - 1)), cells = [], i, d;
    for (i = 0; i < WEEKS * 7; i++) {
      d = addDays(start, i);
      var j = jmap[d], o = outs[d], r = rv(d), plan = hasPlan(o), st;
      if (d > today) st = 'future';
      else if (j) st = r === 'done' ? 'done' : 'journal';
      else if (plan) st = 'plan';
      else st = weekend(d) ? 'off' : 'miss';
      cells.push({ date: d, day: +d.slice(8), dow: dow(d), status: st, today: d === today, journal: !!j, id: j ? j.id : '', trades: j ? j.trades : 0, review: r, plan: plan });
    }

    /* hari ber-journal yang belum dievaluasi (terbaru dulu) */
    var unrev = cells.filter(function (c) { return c.journal && c.review !== 'done'; }).reverse();
    var jDays = cells.filter(function (c) { return c.journal; }).length;

    /* rencana Pre-Market: hari ini belum jatuh tempo kecuali sudah direview */
    var plans = cells.filter(function (c) { return c.plan && c.date <= today; }).filter(function (c) { return c.date < today || planReviewed(outs[c.date]); });
    var plansDone = plans.filter(function (c) { return planReviewed(outs[c.date]); }).length;
    var plansPending = plans.filter(function (c) { return !planReviewed(outs[c.date]); }).reverse();

    /* rutinitas hari ini */
    var tj = jmap[today], tr = rv(today), items = [
      { key: 'plan', state: hasPlan(outs[today]) ? 'done' : 'todo', act: 'plan' }
    ];
    if (ck.total > 0) items.push({ key: 'ck', state: ck.done >= ck.total ? 'done' : (ck.done > 0 ? 'partial' : 'todo'), act: 'ck', detail: ck.done + '/' + ck.total });
    items.push({ key: 'journal', state: tj ? 'done' : 'todo', act: 'journal', detail: tj ? tj.trades : 0 });
    items.push({ key: 'review', state: tr, act: 'review' });
    var routineDone = items.filter(function (x) { return x.state === 'done'; }).length;
    var week = reviewState(rvs['w_' + mondayOf(today)]);

    /* beruntun: akhir pekan kosong dan hari ini yang belum diisi tidak memutus */
    var streak = 0, k = today, guard = 0;
    while (guard++ < 400) {
      if (jmap[k]) streak++; else if (!weekend(k) && k !== today) break;
      k = addDays(k, -1);
    }
    /* konsistensi 28 hari: hari kerja ber-journal / hari kerja yang sudah lewat (hari ini ikut bila sudah diisi) */
    var num = 0, den = 0;
    for (i = 27; i >= 0; i--) {
      d = addDays(today, -i);
      if (weekend(d)) continue;
      if (d === today && !jmap[d]) continue;
      den++; if (jmap[d]) num++;
    }
    return {
      today: today, start: start, cells: cells, items: items, routineDone: routineDone, week: week,
      streak: streak, cons: { num: num, den: den },
      unrev: unrev, jDays: jDays, evaluated: jDays - unrev.length,
      plans: { total: plans.length, done: plansDone, pending: plansPending },
      hasAny: js.length > 0 || Object.keys(outs).length > 0
    };
  }

  window.TradingRhythm = { compute: compute, reviewState: reviewState, version: '16.93', _dates: { mondayOf: mondayOf, addDays: addDays } };

  var view = document.getElementById('view-home'), hm = document.getElementById('hm-root');
  if (!view || !hm) return;     // halaman uji / tanpa Beranda: hanya API murni

  /* ---------- teks 4 bahasa ---------- */
  var T = {
    id: { title: 'Personal Trading Rhythm', sub: 'Konsistensi kebiasaan, bukan profit.', sRoutine: 'Rutinitas hari ini', sRoutineS: 'langkah selesai', sStreak: 'Beruntun', sStreakV: '{n} hari', sStreakS: 'Akhir pekan tidak memutus',
      sCons: '28 hari terakhir', sConsV: '{a}/{b}', sConsS: 'hari kerja ber-journal',
      rtTitle: 'Rutinitas hari ini', rtCount: '{d} dari {t} selesai',
      plan: 'Pre-Market', planD: 'Bias dan alasan sebelum trade', ck: 'Checklist pra-trade', ckD: '{d} dari {t} aturan', journal: 'Journal', journalD: 'Catat setup, emosi, dan pelajaran', journalD1: '{n} trade tercatat',
      review: 'Review harian', reviewD: 'Yang baik, yang salah, yang diperbaiki', week: 'Review mingguan', weekD: 'Minggu ini',
      stDone: 'Selesai', stPartial: 'Sebagian', stTodo: 'Belum', aPlan: 'Isi', aCk: 'Buka', aJr: 'Tulis', aRv: 'Review', aPlanL: 'Isi Pre-Market', aCkL: 'Buka checklist', aJrL: 'Tulis journal', aRvL: 'Tulis review',
      calTitle: 'Kalender konsistensi', calSub: '{n} minggu terakhir', lgDone: 'Journal + evaluasi', lgJr: 'Journal, belum dievaluasi', lgPlan: 'Rencana saja', lgMiss: 'Tanpa catatan',
      wd: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'], today: 'hari ini',
      unTitle: 'Belum dievaluasi', unSum: '{e} dari {j} hari ber-journal sudah dievaluasi', unNone: 'Semua hari ber-journal sudah dievaluasi.', unNone0: 'Belum ada journal dalam {n} minggu terakhir.',
      unNo: 'Belum ada review', unPartial: 'Review belum lengkap', unEval: 'Evaluasi', more: '+{n} lagi',
      plTitle: 'Rencana Pre-Market', plSum: '{r} dari {t} sudah direview', plNone: 'Belum ada rencana Pre-Market dalam {n} minggu terakhir.', plAll: 'Semua rencana sudah direview.',
      plPend: 'After belum diisi', plRev: 'Review', trades: '{n} trade', open: 'Buka journal {d}', evalL: 'Evaluasi {d}', revL: 'Review rencana {d}' },
    en: { title: 'Personal Trading Rhythm', sub: 'Consistency of habit, not profit.', sRoutine: 'Today’s routine', sRoutineS: 'steps done', sStreak: 'Streak', sStreakV: '{n} days', sStreakS: 'Weekends don’t break it',
      sCons: 'Last 28 days', sConsV: '{a}/{b}', sConsS: 'weekdays journaled',
      rtTitle: 'Today’s routine', rtCount: '{d} of {t} done',
      plan: 'Pre-Market', planD: 'Bias and reasoning before the trade', ck: 'Pre-trade checklist', ckD: '{d} of {t} rules', journal: 'Journal', journalD: 'Log setup, emotions and lessons', journalD1: '{n} trade(s) logged',
      review: 'Daily review', reviewD: 'What went well, wrong, and to fix', week: 'Weekly review', weekD: 'This week',
      stDone: 'Done', stPartial: 'Partial', stTodo: 'Not yet', aPlan: 'Fill', aCk: 'Open', aJr: 'Write', aRv: 'Review', aPlanL: 'Fill Pre-Market', aCkL: 'Open checklist', aJrL: 'Write journal', aRvL: 'Write review',
      calTitle: 'Consistency calendar', calSub: 'Last {n} weeks', lgDone: 'Journal + review', lgJr: 'Journal, not reviewed', lgPlan: 'Plan only', lgMiss: 'No entry',
      wd: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], today: 'today',
      unTitle: 'Not reviewed yet', unSum: '{e} of {j} journaled days reviewed', unNone: 'Every journaled day has been reviewed.', unNone0: 'No journals in the last {n} weeks.',
      unNo: 'No review yet', unPartial: 'Review incomplete', unEval: 'Review', more: '+{n} more',
      plTitle: 'Pre-Market plans', plSum: '{r} of {t} reviewed', plNone: 'No Pre-Market plans in the last {n} weeks.', plAll: 'Every plan has been reviewed.',
      plPend: 'After not filled', plRev: 'Review', trades: '{n} trade(s)', open: 'Open journal {d}', evalL: 'Review {d}', revL: 'Review plan {d}' },
    ms: { title: 'Personal Trading Rhythm', sub: 'Konsistensi tabiat, bukan keuntungan.', sRoutine: 'Rutin hari ini', sRoutineS: 'langkah selesai', sStreak: 'Berturut', sStreakV: '{n} hari', sStreakS: 'Hujung minggu tidak memutuskan',
      sCons: '28 hari lepas', sConsV: '{a}/{b}', sConsS: 'hari bekerja berjurnal',
      rtTitle: 'Rutin hari ini', rtCount: '{d} daripada {t} selesai',
      plan: 'Pra-Pasaran', planD: 'Bias dan sebab sebelum dagangan', ck: 'Senarai semak pra-dagangan', ckD: '{d} daripada {t} peraturan', journal: 'Jurnal', journalD: 'Catat setup, emosi dan pengajaran', journalD1: '{n} dagangan dicatat',
      review: 'Ulasan harian', reviewD: 'Yang baik, yang salah, yang dibaiki', week: 'Ulasan mingguan', weekD: 'Minggu ini',
      stDone: 'Selesai', stPartial: 'Separa', stTodo: 'Belum', aPlan: 'Isi', aCk: 'Buka', aJr: 'Tulis', aRv: 'Ulasan', aPlanL: 'Isi Pra-Pasaran', aCkL: 'Buka senarai semak', aJrL: 'Tulis jurnal', aRvL: 'Tulis ulasan',
      calTitle: 'Kalendar konsistensi', calSub: '{n} minggu lepas', lgDone: 'Jurnal + ulasan', lgJr: 'Jurnal, belum diulas', lgPlan: 'Pelan sahaja', lgMiss: 'Tiada catatan',
      wd: ['Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab', 'Ahd'], today: 'hari ini',
      unTitle: 'Belum diulas', unSum: '{e} daripada {j} hari berjurnal telah diulas', unNone: 'Semua hari berjurnal telah diulas.', unNone0: 'Tiada jurnal dalam {n} minggu lepas.',
      unNo: 'Belum ada ulasan', unPartial: 'Ulasan belum lengkap', unEval: 'Ulas', more: '+{n} lagi',
      plTitle: 'Pelan Pra-Pasaran', plSum: '{r} daripada {t} telah diulas', plNone: 'Tiada pelan Pra-Pasaran dalam {n} minggu lepas.', plAll: 'Semua pelan telah diulas.',
      plPend: 'After belum diisi', plRev: 'Ulas', trades: '{n} dagangan', open: 'Buka jurnal {d}', evalL: 'Ulas {d}', revL: 'Ulas pelan {d}' },
    es: { title: 'Personal Trading Rhythm', sub: 'Constancia del hábito, no beneficio.', sRoutine: 'Rutina de hoy', sRoutineS: 'pasos hechos', sStreak: 'Racha', sStreakV: '{n} días', sStreakS: 'El fin de semana no la rompe',
      sCons: 'Últimos 28 días', sConsV: '{a}/{b}', sConsS: 'días hábiles con diario',
      rtTitle: 'Rutina de hoy', rtCount: '{d} de {t} listas',
      plan: 'Pre-Mercado', planD: 'Sesgo y motivos antes de operar', ck: 'Lista previa', ckD: '{d} de {t} reglas', journal: 'Diario', journalD: 'Anota setup, emociones y lecciones', journalD1: '{n} operación(es) anotadas',
      review: 'Revisión diaria', reviewD: 'Lo bueno, lo malo y lo que mejorar', week: 'Revisión semanal', weekD: 'Esta semana',
      stDone: 'Hecho', stPartial: 'Parcial', stTodo: 'Pendiente', aPlan: 'Rellenar', aCk: 'Abrir', aJr: 'Escribir', aRv: 'Revisar', aPlanL: 'Rellenar Pre-Mercado', aCkL: 'Abrir lista', aJrL: 'Escribir diario', aRvL: 'Escribir revisión',
      calTitle: 'Calendario de constancia', calSub: 'Últimas {n} semanas', lgDone: 'Diario + revisión', lgJr: 'Diario, sin revisar', lgPlan: 'Solo plan', lgMiss: 'Sin registro',
      wd: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], today: 'hoy',
      unTitle: 'Sin revisar', unSum: '{e} de {j} días con diario revisados', unNone: 'Todos los días con diario están revisados.', unNone0: 'Sin diarios en las últimas {n} semanas.',
      unNo: 'Sin revisión', unPartial: 'Revisión incompleta', unEval: 'Revisar', more: '+{n} más',
      plTitle: 'Planes Pre-Mercado', plSum: '{r} de {t} revisados', plNone: 'Sin planes Pre-Mercado en las últimas {n} semanas.', plAll: 'Todos los planes están revisados.',
      plPend: 'After sin completar', plRev: 'Revisar', trades: '{n} operación(es)', open: 'Abrir diario {d}', evalL: 'Revisar {d}', revL: 'Revisar plan {d}' }
  };
  var LOC = { id: 'id-ID', en: 'en-US', ms: 'ms-MY', es: 'es-ES' };
  function lang() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return T[l] ? l : 'id'; }
  function t(L, k, v) {
    var s = T[L][k]; if (s == null) s = T.id[k]; if (s == null) return k;
    if (v) for (var p in v) s = s.split('{' + p + '}').join(v[p]);
    return s;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dlabel(date, L, long) {
    try { return new Intl.DateTimeFormat(LOC[L], long ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' }).format(parse(date)); } catch (e) { return date; }
  }

  /* ---------- membaca data aplikasi (typeof-guard, tanpa eval) ---------- */
  var G = {
    allJournals: function () { return typeof allJournals !== 'undefined' ? allJournals : undefined; },
    allOutlooks: function () { return typeof allOutlooks !== 'undefined' ? allOutlooks : undefined; },
    currentUser: function () { return typeof currentUser !== 'undefined' ? currentUser : undefined; },
    db: function () { return typeof db !== 'undefined' ? db : undefined; }
  };
  function g(n) { try { return G[n](); } catch (e) { return undefined; } }
  function LS(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function readCk(today) {     // sama dengan checklist di Beranda
    var items = null;
    try { var a = JSON.parse(LS('v22ckitems') || 'null'); if (Array.isArray(a)) items = a.filter(function (x) { return x && typeof x.t === 'string' && x.t.trim(); }); } catch (e) {}
    if (!items) items = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return { id: 'd' + i }; });
    var st = []; try { st = JSON.parse(LS('v21ck:' + today) || '[]'); } catch (e) {}
    st = (Array.isArray(st) ? st : []).map(function (v) { return typeof v === 'number' ? 'd' + v : v; });
    var list = items.slice(0, 15);
    return { total: list.length, done: list.filter(function (x) { return st.indexOf(x.id) > -1; }).length };
  }

  var remote = {}, remoteKey = '', remoteAt = 0, loaded = null;
  function localRev(id) { try { return JSON.parse(LS('v2rev:' + id.replace('_', ':')) || 'null'); } catch (e) { return null; } }
  function reviewsFor(today) {
    var out = {}, start = addDays(mondayOf(today), -7 * (WEEKS - 1)), i, id;
    for (i = 0; i < WEEKS * 7; i++) { id = 'd_' + addDays(start, i); out[id] = remote[id] || localRev(id) || null; }
    for (i = 0; i < WEEKS; i++) { id = 'w_' + addDays(start, i * 7); out[id] = remote[id] || localRev(id) || null; }
    return out;
  }
  function pull(force) {        // satu query baca; gagal / offline -> tetap memakai cadangan lokal
    var u = g('currentUser'), d = g('db'); if (!u || !d) return;
    var from = addDays(mondayOf(todayStr()), -7 * (WEEKS - 1)), key = u.uid + '|' + from;
    if (!force && remoteKey === key && Date.now() - remoteAt < 30000) return;
    remoteKey = key; remoteAt = Date.now();
    try {
      d.collection('users').doc(u.uid).collection('reviews').where('start', '>=', from).get().then(function (snap) {
        var m = {}; snap.forEach(function (x) { m[x.id] = x.data(); }); remote = m; later();
      }).catch(function () {});
    } catch (e) {}
  }

  function state() {
    var today = todayStr(), js = g('allJournals'), outs = g('allOutlooks');
    return compute({ today: today, journals: Array.isArray(js) ? js : [], outlooks: outs || {}, reviews: reviewsFor(today), ck: readCk(today) });
  }

  /* ---------- tampilan ---------- */
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  var ACT = { plan: ['aPlan', 'aPlanL'], ck: ['aCk', 'aCkL'], journal: ['aJr', 'aJrL'], review: ['aRv', 'aRvL'] };

  function stat(l, v, s) { return '<div class="ptr-stat"><dt>' + esc(l) + '</dt><dd>' + esc(v) + '</dd><small>' + esc(s) + '</small></div>'; }

  function routine(c, L) {
    var rows = c.items.map(function (x) {
      var detail = x.key === 'ck' ? t(L, 'ckD', { d: x.detail.split('/')[0], t: x.detail.split('/')[1] }) : x.key === 'journal' ? (x.detail ? t(L, 'journalD1', { n: x.detail }) : t(L, 'journalD')) : t(L, x.key + 'D');
      var st = x.state === 'done' ? t(L, 'stDone') : x.state === 'partial' ? t(L, 'stPartial') : t(L, 'stTodo');
      var a = ACT[x.act], btn = x.state === 'done' ? '' : '<button type="button" class="ptr-btn" data-ptr-act="' + x.act + '" aria-label="' + esc(t(L, a[1])) + '">' + esc(t(L, a[0])) + '</button>';
      return '<li class="ptr-r ' + x.state + '"><span class="ptr-ck" aria-hidden="true">' + (x.state === 'done' ? CHECK : x.state === 'partial' ? '<i></i>' : '') + '</span>' +
        '<span class="ptr-rt"><b>' + esc(t(L, x.key)) + '</b><small>' + esc(detail) + '</small></span><span class="ptr-rs">' + esc(st) + '</span>' + btn + '</li>';
    }).join('');
    var wk = c.week, wst = wk === 'done' ? t(L, 'stDone') : wk === 'partial' ? t(L, 'stPartial') : t(L, 'stTodo');
    rows += '<li class="ptr-r ptr-wk ' + wk + '"><span class="ptr-ck" aria-hidden="true">' + (wk === 'done' ? CHECK : wk === 'partial' ? '<i></i>' : '') + '</span>' +
      '<span class="ptr-rt"><b>' + esc(t(L, 'week')) + '</b><small>' + esc(t(L, 'weekD')) + '</small></span><span class="ptr-rs">' + esc(wst) + '</span>' +
      (wk === 'done' ? '' : '<button type="button" class="ptr-btn" data-ptr-act="week" aria-label="' + esc(t(L, 'week')) + '">' + esc(t(L, 'aRv')) + '</button>') + '</li>';
    return '<div class="ptr-sec"><div class="ptr-sh"><h4>' + esc(t(L, 'rtTitle')) + '</h4><span>' + esc(t(L, 'rtCount', { d: c.routineDone, t: c.items.length })) + '</span></div><ul class="ptr-rl">' + rows + '</ul></div>';
  }

  var GLYPH = { done: '✓', journal: '•', plan: '◦' };
  function calendar(c, L) {
    var T_ = function (k) { return t(L, k); };
    var head = T_('wd').map(function (w) { return '<span class="ptr-wd" aria-hidden="true">' + esc(w) + '</span>'; }).join('');
    var lab = { done: T_('lgDone'), journal: T_('lgJr'), plan: T_('lgPlan'), miss: T_('lgMiss') };
    var cells = c.cells.map(function (x) {
      var label = dlabel(x.date, L) + (x.today ? ' · ' + T_('today') : '') + (lab[x.status] ? ' · ' + lab[x.status] : '');
      var inner = '<span class="n">' + x.day + '</span>' + (GLYPH[x.status] ? '<i aria-hidden="true">' + GLYPH[x.status] + '</i>' : '');
      var cls = 'ptr-d ' + x.status + (x.today ? ' now' : '');
      return x.journal && x.id ? '<button type="button" class="' + cls + '" data-ptr-act="open" data-id="' + esc(x.id) + '" aria-label="' + esc(label) + '">' + inner + '</button>'
        : '<div class="' + cls + '" role="img" aria-label="' + esc(label) + '">' + inner + '</div>';
    }).join('');
    var legend = ['done', 'journal', 'plan', 'miss'].map(function (k) { return '<li class="' + k + '"><span class="ptr-sw ' + k + '" aria-hidden="true">' + (GLYPH[k] || '') + '</span>' + esc(lab[k]) + '</li>'; }).join('');
    return '<div class="ptr-sec"><div class="ptr-sh"><h4>' + esc(T_('calTitle')) + '</h4><span>' + esc(t(L, 'calSub', { n: WEEKS })) + '</span></div>' +
      '<div class="ptr-cal">' + head + cells + '</div><ul class="ptr-lg">' + legend + '</ul></div>';
  }

  function unreviewed(c, L) {
    var h = '<div class="ptr-sec"><div class="ptr-sh"><h4>' + esc(t(L, 'unTitle')) + '</h4>' + (c.jDays ? '<span>' + esc(t(L, 'unSum', { e: c.evaluated, j: c.jDays })) + '</span>' : '') + '</div>';
    if (!c.jDays) return h + '<p class="ptr-empty">' + esc(t(L, 'unNone0', { n: WEEKS })) + '</p></div>';
    if (!c.unrev.length) return h + '<p class="ptr-empty ok">' + esc(t(L, 'unNone')) + '</p></div>';
    h += '<ul class="ptr-ul">' + c.unrev.slice(0, 3).map(function (x) {
      var note = x.review === 'partial' ? t(L, 'unPartial') : t(L, 'unNo');
      return '<li><span class="ptr-rt"><b>' + esc(dlabel(x.date, L)) + '</b><small>' + esc(t(L, 'trades', { n: x.trades }) + ' · ' + note) + '</small></span>' +
        '<button type="button" class="ptr-btn" data-ptr-act="eval" data-date="' + esc(x.date) + '" aria-label="' + esc(t(L, 'evalL', { d: dlabel(x.date, L) })) + '">' + esc(t(L, 'unEval')) + '</button></li>';
    }).join('') + '</ul>';
    if (c.unrev.length > 3) h += '<p class="ptr-more">' + esc(t(L, 'more', { n: c.unrev.length - 3 })) + '</p>';
    return h + '</div>';
  }

  function plans(c, L) {
    var p = c.plans, h = '<div class="ptr-sec"><div class="ptr-sh"><h4>' + esc(t(L, 'plTitle')) + '</h4>' + (p.total ? '<span>' + esc(t(L, 'plSum', { r: p.done, t: p.total })) + '</span>' : '') + '</div>';
    if (!p.total) return h + '<p class="ptr-empty">' + esc(t(L, 'plNone', { n: WEEKS })) + '</p></div>';
    h += '<div class="ptr-bar" role="img" aria-label="' + esc(t(L, 'plSum', { r: p.done, t: p.total })) + '"><i style="width:' + Math.round(p.done / p.total * 100) + '%"></i></div>';
    if (!p.pending.length) return h + '<p class="ptr-empty ok">' + esc(t(L, 'plAll')) + '</p></div>';
    h += '<ul class="ptr-ul">' + p.pending.slice(0, 3).map(function (x) {
      return '<li><span class="ptr-rt"><b>' + esc(dlabel(x.date, L)) + '</b><small>' + esc(t(L, 'plPend')) + '</small></span>' +
        '<button type="button" class="ptr-btn" data-ptr-act="eval" data-date="' + esc(x.date) + '" aria-label="' + esc(t(L, 'revL', { d: dlabel(x.date, L) })) + '">' + esc(t(L, 'plRev')) + '</button></li>';
    }).join('') + '</ul>';
    if (p.pending.length > 3) h += '<p class="ptr-more">' + esc(t(L, 'more', { n: p.pending.length - 3 })) + '</p>';
    return h + '</div>';
  }

  function build(c, L) {
    var stats = '<dl class="ptr-stats">' + stat(t(L, 'sRoutine'), c.routineDone + '/' + c.items.length, t(L, 'sRoutineS')) +
      stat(t(L, 'sStreak'), c.streak ? t(L, 'sStreakV', { n: c.streak }) : '—', t(L, 'sStreakS')) +
      stat(t(L, 'sCons'), c.cons.num ? t(L, 'sConsV', { a: c.cons.num, b: c.cons.den }) : '—', t(L, 'sConsS')) + '</dl>';
    return '<header class="ptr-head"><h3 id="ptr-h">' + esc(t(L, 'title')) + '</h3><p>' + esc(t(L, 'sub')) + '</p></header>' + stats + routine(c, L) + calendar(c, L) +
      '<div class="ptr-cols">' + unreviewed(c, L) + plans(c, L) + '</div>';
  }

  /* ---------- pasang & render ---------- */
  var sec = document.createElement('section');
  sec.id = 'ptr-root'; sec.className = 'ptr'; sec.hidden = true; sec.setAttribute('aria-labelledby', 'ptr-h');
  hm.parentNode.insertBefore(sec, hm.nextSibling);
  view.classList.add('ptr-on');

  var tmr = 0, last = '';
  function render() {
    var show = loaded === true || (loaded === null && Array.isArray(g('allJournals')) && g('allJournals').length > 0);
    if (!show) { sec.hidden = true; return; }
    var html; try { html = build(state(), lang()); } catch (e) { console.error('TradingRhythm', e); sec.hidden = true; return; }
    sec.hidden = false;
    if (html === last) return; last = html;
    var f = document.activeElement, key = f && f.getAttribute && sec.contains(f) ? (f.getAttribute('data-ptr-act') || '') + '|' + (f.getAttribute('data-date') || f.getAttribute('data-id') || '') : '';
    sec.innerHTML = html;
    if (key) {
      var all = sec.querySelectorAll('[data-ptr-act]');
      for (var i = 0; i < all.length; i++) if ((all[i].getAttribute('data-ptr-act') || '') + '|' + (all[i].getAttribute('data-date') || all[i].getAttribute('data-id') || '') === key) { try { all[i].focus({ preventScroll: true }); } catch (e) {} break; }
    }
  }
  function later() { clearTimeout(tmr); tmr = setTimeout(render, 40); }
  window.TradingRhythm.render = function () { last = ''; render(); };

  function openForm(date) {
    try { if (typeof openNewJournalForm === 'function') return openNewJournalForm(date); } catch (e) { console.warn(e); }
    var f = document.getElementById('btn-new-journal-fab'); if (f) f.click();
  }
  function nav(v) { var b = document.getElementById('nav-' + v); if (b) b.click(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function act(a, el) {
    var date = (el && el.getAttribute('data-date')) || todayStr();
    if (a === 'plan' || a === 'journal') openForm(todayStr());
    else if (a === 'review' || a === 'eval') { if (window.openReviewForm) window.openReviewForm({ date: date, period: 'd' }); }
    else if (a === 'week') { if (window.openReviewForm) window.openReviewForm({ date: todayStr(), period: 'w' }); }
    else if (a === 'ck') {
      nav('dashboard');
      setTimeout(function () { var l = document.getElementById('ck-list'); if (!l) return; var dt = l.closest && l.closest('details'); if (dt) dt.open = true; try { l.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {} }, 120);
    } else if (a === 'open') { var id = el && el.getAttribute('data-id'); if (id && typeof editJournal === 'function') { try { editJournal(id); } catch (e) { console.warn(e); } } }
  }
  sec.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-ptr-act]'); if (b && sec.contains(b)) { e.preventDefault(); act(b.getAttribute('data-ptr-act'), b); } });

  window.addEventListener('journals-loaded', function () { loaded = true; pull(false); later(); setTimeout(render, 1500); });
  window.addEventListener('journals-error', function () { loaded = false; later(); });
  window.addEventListener('review-saved', function () { pull(true); later(); });
  window.addEventListener('journal-saved', function () { later(); });
  window.addEventListener('viewchange', function (ev) { if (ev && ev.detail && ev.detail.view === 'home') { pull(false); later(); } });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { pull(false); later(); } });   // ganti hari saat aplikasi terbuka
  var sel = document.getElementById('app-language'); if (sel) sel.addEventListener('change', function () { setTimeout(function () { last = ''; render(); }, 90); });
  render();
})();
