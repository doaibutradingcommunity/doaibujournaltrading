/* v16.90 · Review (Before/After + Evaluasi) dipindah ke form "+" (tab ke-3 di samping Pre-Market dan Journal Trade).
   Logika data TIDAK berubah, hanya tempat mengisinya:
   - After     -> users/{uid}/outlooks/{tanggal}.after  {actual, happened, change, reflect}
   - Evaluasi  -> users/{uid}/reviews/{d|w|m}_{tanggal-awal}  {period, start, end, w, x, i}  (+ cadangan localStorage 'v2rev:{p}:{awal}')
   Rekap Evaluasi tetap membaca dari dua tempat itu, jadi "kesalahan" (x), "perbaikan" (i), dan refleksi tetap muncul di sana.
   Halaman Diary & Review kini hanya menampilkan hasilnya (baca saja) dengan tombol yang membuka tab ini. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('journal-form'), section = $('form-section');
  var panel = form && form.querySelector('[data-jw-panel="review"]');
  var saveBtn = $('jw-rev-save');
  if (!form || !section || !panel || !saveBtn) return;

  /* ---------- Teks 4 bahasa ---------- */
  var D = {
    id: { jwRev: 'Review', jwRevTag: 'After & evaluasi', jwRevSub: 'Bandingkan prediksi dengan kenyataan, lalu catat kesalahan dan perbaikannya.',
      jwRevSave: 'Simpan Review', rvAfterT: 'Kenyataan market', rvActual: 'Bias aktual', rvHappened: 'Apa yang terjadi', rvChange: 'Perubahan market', rvReflect: 'Refleksi',
      rvEvalT: 'Masuk ke Rekap Evaluasi', rvDaily: 'Harian', rvWeekly: 'Mingguan', rvMonthly: 'Bulanan',
      rvX: 'Apa yang salah / kesalahan terbesar', rvI: 'Yang diperbaiki berikutnya', rvW: 'Apa yang berjalan baik',
      rvHint: 'Kesalahan dan perbaikan yang kamu tulis tampil di Rekap Evaluasi.',
      rvBefore: 'BEFORE · Pre-Market', rvBias: 'Bias', rvNoBefore: 'Belum ada Pre-Market untuk tanggal ini.', rvFillPre: 'Isi Pre-Market',
      rvMatch: '✓ Sesuai analisis', rvMiss: '✗ Meleset dari analisis', rvRange: 'Periode', rvWeek: 'Minggu', rvMonth: 'Bulan',
      rvSaved: 'Review tersimpan ✓', rvQueued: 'Belum terhubung ke server. Review akan tersinkron otomatis saat online.', rvNeed: 'Isi minimal satu kolom review dulu',
      rvLogin: 'Belum login', rvFail: 'Gagal menyimpan review: ', rvDenied: 'ditolak Firestore Rules', rvSaving: 'Menyimpan…', rvNeedDate: 'Isi tanggal dulu' },
    en: { jwRev: 'Review', jwRevTag: 'After & review', jwRevSub: 'Compare your prediction with reality, then note the mistakes and fixes.',
      jwRevSave: 'Save Review', rvAfterT: 'What the market did', rvActual: 'Actual bias', rvHappened: 'What happened', rvChange: 'Market change', rvReflect: 'Reflection',
      rvEvalT: 'Goes to Review Recap', rvDaily: 'Daily', rvWeekly: 'Weekly', rvMonthly: 'Monthly',
      rvX: 'What went wrong / biggest mistake', rvI: 'To fix next', rvW: 'What went well',
      rvHint: 'Mistakes and fixes you write here appear in the Review Recap.',
      rvBefore: 'BEFORE · Pre-Market', rvBias: 'Bias', rvNoBefore: 'No Pre-Market for this date yet.', rvFillPre: 'Fill Pre-Market',
      rvMatch: '✓ Matched your analysis', rvMiss: '✗ Missed your analysis', rvRange: 'Period', rvWeek: 'Week', rvMonth: 'Month',
      rvSaved: 'Review saved ✓', rvQueued: 'Not connected to the server. The review will sync automatically when online.', rvNeed: 'Fill in at least one review field first',
      rvLogin: 'Not signed in', rvFail: 'Could not save review: ', rvDenied: 'denied by Firestore Rules', rvSaving: 'Saving…', rvNeedDate: 'Please fill in the date' },
    ms: { jwRev: 'Ulasan', jwRevTag: 'After & ulasan', jwRevSub: 'Bandingkan ramalan dengan realiti, kemudian catat kesilapan dan pembaikannya.',
      jwRevSave: 'Simpan Ulasan', rvAfterT: 'Realiti pasaran', rvActual: 'Bias sebenar', rvHappened: 'Apa yang berlaku', rvChange: 'Perubahan pasaran', rvReflect: 'Refleksi',
      rvEvalT: 'Masuk ke Rekap Penilaian', rvDaily: 'Harian', rvWeekly: 'Mingguan', rvMonthly: 'Bulanan',
      rvX: 'Apa yang salah / kesilapan terbesar', rvI: 'Perlu dibaiki seterusnya', rvW: 'Apa yang berjalan baik',
      rvHint: 'Kesilapan dan pembaikan yang anda tulis dipaparkan dalam Rekap Penilaian.',
      rvBefore: 'BEFORE · Pra-Pasaran', rvBias: 'Bias', rvNoBefore: 'Belum ada Pra-Pasaran untuk tarikh ini.', rvFillPre: 'Isi Pra-Pasaran',
      rvMatch: '✓ Sepadan dengan analisis', rvMiss: '✗ Tersasar daripada analisis', rvRange: 'Tempoh', rvWeek: 'Minggu', rvMonth: 'Bulan',
      rvSaved: 'Ulasan disimpan ✓', rvQueued: 'Belum bersambung ke pelayan. Ulasan akan disegerak automatik apabila dalam talian.', rvNeed: 'Isi sekurang-kurangnya satu ruang ulasan',
      rvLogin: 'Belum log masuk', rvFail: 'Gagal menyimpan ulasan: ', rvDenied: 'ditolak Firestore Rules', rvSaving: 'Menyimpan…', rvNeedDate: 'Sila isi tarikh' },
    es: { jwRev: 'Revisión', jwRevTag: 'After y evaluación', jwRevSub: 'Compara tu predicción con la realidad y anota errores y mejoras.',
      jwRevSave: 'Guardar revisión', rvAfterT: 'Lo que hizo el mercado', rvActual: 'Sesgo real', rvHappened: 'Qué ocurrió', rvChange: 'Cambio del mercado', rvReflect: 'Reflexión',
      rvEvalT: 'Va al resumen de evaluación', rvDaily: 'Diaria', rvWeekly: 'Semanal', rvMonthly: 'Mensual',
      rvX: 'Qué salió mal / mayor error', rvI: 'A mejorar después', rvW: 'Qué salió bien',
      rvHint: 'Los errores y mejoras que escribas aparecen en el resumen de evaluación.',
      rvBefore: 'BEFORE · Pre-Mercado', rvBias: 'Sesgo', rvNoBefore: 'Aún no hay Pre-Mercado para esta fecha.', rvFillPre: 'Completar Pre-Mercado',
      rvMatch: '✓ Coincidió con tu análisis', rvMiss: '✗ Falló tu análisis', rvRange: 'Periodo', rvWeek: 'Semana', rvMonth: 'Mes',
      rvSaved: 'Revisión guardada ✓', rvQueued: 'Sin conexión al servidor. La revisión se sincronizará al volver a estar en línea.', rvNeed: 'Completa al menos un campo de la revisión',
      rvLogin: 'Sin sesión', rvFail: 'No se pudo guardar la revisión: ', rvDenied: 'denegado por Firestore Rules', rvSaving: 'Guardando…', rvNeedDate: 'Completa la fecha' }
  };
  function lang() { try { return localStorage.getItem('journalLanguage') || 'id'; } catch (e) { return 'id'; } }
  function T(k) { return (D[lang()] || D.id)[k] || D.id[k]; }
  try { ['id', 'en', 'ms', 'es'].forEach(function (l) { if (typeof I18N !== 'undefined' && I18N[l]) Object.assign(I18N[l], D[l]); }); } catch (e) {}
  try { if (typeof applyLanguage === 'function') applyLanguage(lang()); } catch (e) {}

  /* ---------- Helper ---------- */
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var LS = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var LW = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var ymd = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function parse(s) { var m = String(s || '').split('-'); return m.length === 3 ? new Date(+m[0], +m[1] - 1, +m[2]) : null; }
  function toast(m) { try { if (typeof showToast === 'function') return showToast(m, 4200); } catch (e) {} }
  function user() { try { return currentUser; } catch (e) { return null; } }
  function fdb() { try { return db; } catch (e) { return null; } }
  function outlooks() { try { return allOutlooks || {}; } catch (e) { return {}; } }
  function period() { var r = form.querySelector('input[name="revPeriod"]:checked'); return r ? r.value : 'd'; }
  function dateVal() { var e = $('input-date'); return e ? e.value : ''; }

  /* Rentang periode: sama persis dengan range() di halaman Review lama (minggu mulai Senin). */
  function range(date, p) {
    var b = parse(date); if (!b) return null; var a, z;
    if (p === 'd') { a = z = b; }
    else if (p === 'w') { a = new Date(b); a.setDate(b.getDate() - ((b.getDay() + 6) % 7)); z = new Date(a); z.setDate(a.getDate() + 6); }
    else { a = new Date(b.getFullYear(), b.getMonth(), 1); z = new Date(b.getFullYear(), b.getMonth() + 1, 0); }
    return [ymd(a), ymd(z)];
  }
  function revIds(date, p) { var r = range(date, p); return r ? { start: r[0], end: r[1], id: p + '_' + r[0], key: 'v2rev:' + p + ':' + r[0] } : null; }

  var AFTER = ['happened', 'change', 'reflect'], REV = ['w', 'x', 'i'];
  function field(k) { return panel.querySelector('[data-k="' + k + '"]'); }
  function readAfter() {
    var r = form.querySelector('input[name="afterActual"]:checked'), o = { actual: r ? r.value : '' };
    AFTER.forEach(function (k) { o[k] = field(k).value.trim(); }); return o;
  }
  function readRev() { var o = {}; REV.forEach(function (k) { o[k] = field(k).value; }); return o; }
  function hasAny(o) { return Object.keys(o).some(function (k) { return String(o[k] || '').trim(); }); }
  function setAfter(a) {
    a = a || {};
    form.querySelectorAll('input[name="afterActual"]').forEach(function (r) { r.checked = r.value === a.actual; });
    AFTER.forEach(function (k) { field(k).value = a[k] || ''; });
  }
  function setRev(v) { v = v || {}; REV.forEach(function (k) { field(k).value = v[k] || ''; }); }

  /* ---------- Status isi ---------- */
  var touched = { after: false, rev: false }, had = { after: false, rev: false };
  var loaded = { after: '', rev: '' }, saving = false, token = 0;
  function afterEmpty() { return !hasAny(readAfter()); }
  function revEmpty() { return !hasAny(readRev()); }

  /* ---------- Kartu BEFORE (baca saja) ---------- */
  function renderBefore() {
    var box = $('rvf-before'); if (!box) return;
    var date = dateVal(), x = outlooks()[date] || {};
    var pred = String(x.bias || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var has = !!(pred.length || x.reason || (x.charts && x.charts.length));
    if (!has) {
      box.innerHTML = '<p class="rvf-b-t">' + esc(T('rvBefore')) + '</p><p class="rvf-b-n">' + esc(T('rvNoBefore')) + '</p>' +
        '<button type="button" class="rvf-link" data-rvf-pre>' + esc(T('rvFillPre')) + ' →</button>';
      return;
    }
    var r = form.querySelector('input[name="afterActual"]:checked'), act = r ? r.value : '';
    var verdict = act && pred.length ? (pred.indexOf(act) > -1 ? '<b class="rvf-ok">' + esc(T('rvMatch')) + '</b>' : '<b class="rvf-bad">' + esc(T('rvMiss')) + '</b>') : '';
    box.innerHTML = '<p class="rvf-b-t">' + esc(T('rvBefore')) + ' ' + verdict + '</p>' +
      '<p class="rvf-b-l">' + esc(T('rvBias')) + ': <b>' + esc(pred.join(' & ') || '-') + '</b></p>' +
      (x.reason ? '<p class="rvf-b-r">' + esc(x.reason) + '</p>' : '') +
      ((x.charts && x.charts.length) ? '<div class="rvf-b-i">' + x.charts.slice(0, 3).map(function (u) { return '<img src="' + esc(u) + '" alt="" class="zoomable-chart" loading="lazy">'; }).join('') + '</div>' : '');
  }

  /* ---------- Muat isi untuk tanggal / periode terpilih ---------- */
  function renderRange() {
    var el = $('rvf-range'), date = dateVal(), p = period(), ids = revIds(date, p);
    if (!el) return;
    if (!ids) { el.textContent = ''; return; }
    var lbl = p === 'd' ? ids.start : (p === 'w' ? T('rvWeek') + ' ' : T('rvMonth') + ' ') + (p === 'w' ? ids.start + ' → ' + ids.end : ids.start.slice(0, 7));
    el.textContent = T('rvRange') + ': ' + lbl;
  }

  function loadAfter(force) {
    var date = dateVal(), key = date;
    if (!force && loaded.after === key) return;
    if (!force && !afterEmpty()) { loaded.after = key; touched.after = true; return; }   // isian dari draf / ketikan: jangan ditimpa
    var a = (outlooks()[date] || {}).after || {};
    setAfter(a); loaded.after = key; touched.after = false; had.after = hasAny(a);
  }
  var REVC = {};
  function loadRev(force) {
    var date = dateVal(), ids = revIds(date, period()); if (!ids) return;
    if (!force && loaded.rev === ids.id) return;
    if (!force && !revEmpty()) { loaded.rev = ids.id; touched.rev = true; return; }
    var my = ++token, cached = REVC[ids.id], local = null;
    try { local = JSON.parse(LS(ids.key) || 'null'); } catch (e) {}
    var first = cached || local || {};
    setRev(first); loaded.rev = ids.id; touched.rev = false; had.rev = hasAny(first);
    var u = user(), d = fdb();
    if (!u || !d) return;
    d.collection('users').doc(u.uid).collection('reviews').doc(ids.id).get().then(function (snap) {
      if (my !== token || touched.rev) return;           // sudah ganti tanggal/periode, atau pengguna mulai mengetik
      var data = snap.exists ? snap.data() : null;
      if (data) { REVC[ids.id] = data; setRev(data); had.rev = hasAny(data); }
    }).catch(function () {});
  }
  function refresh(force) {
    renderRange(); renderBefore();
    loadAfter(force); loadRev(force);
    renderBefore();
  }

  /* ---------- Event ---------- */
  panel.addEventListener('input', function (e) {
    var t = e.target; if (!t) return;
    if (t.matches('[data-rvf="after"]')) touched.after = true;
    if (t.matches('[data-rvf="rev"]')) touched.rev = true;
  });
  panel.addEventListener('change', function (e) {
    var t = e.target; if (!t) return;
    if (t.name === 'afterActual') { touched.after = true; renderBefore(); }
    if (t.name === 'revPeriod') { loaded.rev = ''; renderRange(); loadRev(true); }
  });
  panel.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-rvf-pre]') && window.__jwSetMode) window.__jwSetMode('pre');
  });
  var dEl = $('input-date');
  if (dEl) dEl.addEventListener('change', function () { if (window.__jwMode && window.__jwMode() === 'review') refresh(true); else { loaded.after = ''; loaded.rev = ''; } });
  form.addEventListener('jw-mode', function (e) {
    if (e.detail && e.detail.mode === 'review') refresh(false);
  });
  /* Form dibuka baru / ditutup: kosongkan penanda supaya tidak membawa isi tanggal lain */
  var wasHidden = section.classList.contains('hidden');
  new MutationObserver(function () {
    var h = section.classList.contains('hidden');
    if (wasHidden && !h) { touched.after = touched.rev = false; loaded.after = loaded.rev = ''; had.after = had.rev = false; var wp = window.__jwWantPeriod || 'd'; window.__jwWantPeriod = null; var p = form.querySelector('input[name="revPeriod"][value="' + wp + '"]'); if (p) p.checked = true; }
    wasHidden = h;
  }).observe(section, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('change', function (e) { if (e.target && /language/.test(e.target.id || '')) setTimeout(function () { renderRange(); renderBefore(); }, 0); });

  /* ---------- Simpan ---------- */
  function withTimeout(p) {
    return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej({ code: 'timeout' }); }, 12000); })]);
  }
  function finish(msg, detail) {
    toast(msg);
    try { window.dispatchEvent(new CustomEvent('review-saved', { detail: detail })); } catch (e) {}
    try { window.DoaRecap && window.DoaRecap.refresh && window.DoaRecap.refresh(); } catch (e) {}
    section.classList.add('hidden');
    try { resetForm(); } catch (e) {}
    try { window.UR && UR.clearJournalDraft(); } catch (e) {}
    try { loadJournals(); } catch (e) {}
  }
  saveBtn.addEventListener('click', function () {
    if (saving) return;
    var date = dateVal();
    if (!date) { toast(T('rvNeedDate')); try { dEl.focus(); } catch (e) {} return; }
    var after = readAfter(), rev = readRev(), p = period(), ids = revIds(date, p);
    var doAfter = touched.after && (hasAny(after) || had.after), doRev = touched.rev && (hasAny(rev) || had.rev);
    if (!doAfter && !doRev) { toast(T('rvNeed')); return; }
    var u = user(), d = fdb();
    if (!u || !d) { toast(T('rvLogin')); return; }
    var FV = firebase.firestore.FieldValue, base = d.collection('users').doc(u.uid), jobs = [];
    if (doAfter) jobs.push(base.collection('outlooks').doc(date).set({ date: date, after: after, afterUpdatedAt: FV.serverTimestamp() }, { merge: true }));
    if (doRev) {
      LW(ids.key, JSON.stringify(rev));       // cadangan lokal, sama seperti halaman Review lama
      jobs.push(base.collection('reviews').doc(ids.id).set(Object.assign({ period: p, start: ids.start, end: ids.end, updatedAt: FV.serverTimestamp() }, rev), { merge: true }));
    }
    saving = true; saveBtn.disabled = true; var label = saveBtn.textContent; saveBtn.textContent = T('rvSaving');
    var detail = { date: date, period: p, start: ids.start, id: ids.id, after: doAfter ? after : null, rev: doRev ? rev : null };
    function local() {
      if (doAfter) { try { allOutlooks[date] = Object.assign(allOutlooks[date] || {}, { after: after }); } catch (e) {} }
      if (doRev) REVC[ids.id] = Object.assign({ period: p, start: ids.start, end: ids.end }, rev);
    }
    withTimeout(Promise.all(jobs)).then(function () {
      local(); finish(T('rvSaved'), detail);
    }).catch(function (e) {
      if (e && e.code === 'timeout') { local(); finish(T('rvQueued'), detail); return; }
      toast(T('rvFail') + (e && e.code === 'permission-denied' ? T('rvDenied') : ((e && e.message) || 'error')));
    }).then(function () { saving = false; saveBtn.disabled = false; saveBtn.textContent = label; try { applyLanguage(lang()); } catch (e) {} });
  });

  /* ---------- Dipakai halaman Diary & Review: buka form langsung di tab Review ---------- */
  window.openReviewForm = function (o) {
    o = o || {};
    var p = o.period || 'd', date = o.date;
    if (!date) {
      var t = ymd(new Date()), r = range(t, p);
      date = o.start && o.end ? ((t >= o.start && t <= o.end) ? t : o.start) : t;
      if (!o.start && r) date = t;
    }
    window.__jwWantMode = 'review'; window.__jwWantPeriod = p;
    try { if (typeof openNewJournalForm === 'function') openNewJournalForm(date); else { var f = $('btn-new-journal-fab'); if (f) f.click(); } } catch (e) { console.error(e); }
    var rd = form.querySelector('input[name="revPeriod"][value="' + p + '"]'); if (rd) rd.checked = true;
    if ($('input-date')) $('input-date').value = date;
    setTimeout(function () { if (window.__jwSetMode && window.__jwMode() !== 'review') window.__jwSetMode('review'); loaded.after = loaded.rev = ''; refresh(true); }, 30);
  };
})();
