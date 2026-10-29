/* v16.42 · Undo & Recovery
   1) UNDO  — hapus journal/diary/strategi, ubah journal (edit, gabung di tanggal yang sama, kalender cepat)
              dan import broker bisa dibatalkan. Kondisi SEBELUM aksi disimpan sebagai cadangan; "Urungkan"
              menulis ulang kondisi itu. Cadangan juga disimpan di perangkat selama 10 menit, jadi masih bisa
              dibatalkan setelah halaman dimuat ulang (Ctrl/Cmd+Z di luar kolom teks, atau snackbar saat dibuka lagi).
   2) DRAFT — form journal dan diary disimpan otomatis ke perangkat saat diketik. Setelah halaman ditutup,
              tab di-refresh, atau aplikasi crash, draft ditawarkan kembali ("Lanjutkan" / "Buang").
   Draft dibuang hanya setelah simpan BERHASIL. File gambar yang belum diunggah tidak bisa disimpan di draft.
   Memakai global aplikasi (db, currentUser, showToast, loadJournals, ...) yang sudah ada; tidak mengubah logika statistik. */
(function () {
  'use strict';
  if (window.UR) return;

  var NS = 'doaibu.ur.v1';
  var LOG_MAX = 15;
  var LOG_TTL = 10 * 60 * 1000;            // cadangan undo berlaku 10 menit
  var DRAFT_TTL = 14 * 24 * 3600 * 1000;   // draft dibuang otomatis setelah 14 hari
  var SNACK_MS = 10000;

  /* ---------- teks ---------- */
  var DICT = {
    id: { undo: 'Urungkan', restore: 'Pulihkan', resume: 'Lanjutkan', discard: 'Buang', startNew: 'Mulai baru', close: 'Tutup',
      restored: 'Dikembalikan seperti semula', gone: 'Cadangan sudah kedaluwarsa', restoreFail: 'Gagal mengurungkan: ',
      overwrite: 'Sudah ada data baru di tempat yang sama. Timpa dengan data yang dikembalikan?',
      noBackup: 'Cadangan untuk pembatalan tidak bisa dibuat. Tetap hapus?', delFail: 'Gagal menghapus: ',
      jDeleted: 'Journal dihapus', edited: 'Perubahan disimpan', diaryDeleted: 'Diary dihapus',
      draftSaved: 'Draft journal disimpan otomatis', draftFound: 'Draft journal belum tersimpan ({w})',
      draftResumed: 'Draft journal dilanjutkan', editDraftFound: 'Ada perubahan belum tersimpan untuk journal ini ({w})',
      diaryDraftFound: 'Draft diary belum tersimpan ditemukan ({w})' },
    en: { undo: 'Undo', restore: 'Restore', resume: 'Resume', discard: 'Discard', startNew: 'Start new', close: 'Close',
      restored: 'Restored to the previous state', gone: 'This backup has expired', restoreFail: 'Could not undo: ',
      overwrite: 'Newer data already exists in the same place. Overwrite it with the restored data?',
      noBackup: 'A backup for undo could not be made. Delete anyway?', delFail: 'Could not delete: ',
      jDeleted: 'Journal deleted', edited: 'Changes saved', diaryDeleted: 'Diary deleted',
      draftSaved: 'Journal draft saved automatically', draftFound: 'Unsaved journal draft ({w})',
      draftResumed: 'Journal draft resumed', editDraftFound: 'Unsaved changes found for this journal ({w})',
      diaryDraftFound: 'Unsaved diary draft found ({w})' },
    ms: { undo: 'Buat asal', restore: 'Pulihkan', resume: 'Sambung', discard: 'Buang', startNew: 'Mula baharu', close: 'Tutup',
      restored: 'Dikembalikan seperti asal', gone: 'Sandaran ini telah tamat tempoh', restoreFail: 'Gagal membuat asal: ',
      overwrite: 'Data yang lebih baharu sudah ada di tempat yang sama. Tindih dengan data yang dipulihkan?',
      noBackup: 'Sandaran untuk buat asal tidak dapat dibuat. Padam juga?', delFail: 'Gagal memadam: ',
      jDeleted: 'Jurnal dipadam', edited: 'Perubahan disimpan', diaryDeleted: 'Diari dipadam',
      draftSaved: 'Draf jurnal disimpan automatik', draftFound: 'Draf jurnal belum disimpan ({w})',
      draftResumed: 'Draf jurnal disambung', editDraftFound: 'Ada perubahan belum disimpan untuk jurnal ini ({w})',
      diaryDraftFound: 'Draf diari belum disimpan ditemui ({w})' },
    es: { undo: 'Deshacer', restore: 'Restaurar', resume: 'Continuar', discard: 'Descartar', startNew: 'Empezar de nuevo', close: 'Cerrar',
      restored: 'Restaurado al estado anterior', gone: 'Esta copia ha caducado', restoreFail: 'No se pudo deshacer: ',
      overwrite: 'Ya hay datos más recientes en el mismo lugar. ¿Sobrescribirlos con los datos restaurados?',
      noBackup: 'No se pudo crear la copia para deshacer. ¿Eliminar de todos modos?', delFail: 'No se pudo eliminar: ',
      jDeleted: 'Diario eliminado', edited: 'Cambios guardados', diaryDeleted: 'Diario personal eliminado',
      draftSaved: 'Borrador del diario guardado automáticamente', draftFound: 'Borrador de diario sin guardar ({w})',
      draftResumed: 'Borrador del diario retomado', editDraftFound: 'Hay cambios sin guardar para este diario ({w})',
      diaryDraftFound: 'Borrador de diario personal sin guardar ({w})' }
  };
  var LOCALE = { id: 'id-ID', en: 'en-US', ms: 'ms-MY', es: 'es-ES' };
  function lang() { try { var l = localStorage.getItem('journalLanguage') || 'id'; return DICT[l] ? l : 'id'; } catch (e) { return 'id'; } }
  function T(k, vars) {
    var s = (DICT[lang()] || DICT.id)[k] || DICT.id[k] || k;
    if (vars) Object.keys(vars).forEach(function (v) { s = s.replace('{' + v + '}', vars[v]); });
    return s;
  }
  function when(ts) {
    try { return new Date(ts).toLocaleString(LOCALE[lang()], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return ''; }
  }

  /* ---------- util ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function readJSON(k) { try { var v = JSON.parse(lsGet(k) || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } }
  function uid() { try { return (typeof currentUser !== 'undefined' && currentUser && currentUser.uid) || ''; } catch (e) { return ''; } }
  function key(part) { return NS + '.' + part + '.' + (uid() || 'anon'); }
  function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function tick(ms) { return new Promise(function (r) { setTimeout(r, ms || 0); }); }
  function fs() { return firebase.firestore(); }
  function notify(m) { try { if (typeof pxNotify === 'function') return pxNotify(m); } catch (e) {} try { window.alert(m); } catch (e) {} }
  function appToast(m) { try { if (typeof showToast === 'function') return showToast(m); } catch (e) {} }

  /* Timestamp Firestore <-> JSON */
  function enc(v) {
    if (v === undefined) return undefined;
    if (v === null || typeof v !== 'object') return (typeof v === 'number' && !isFinite(v)) ? null : v;
    if (typeof v.toMillis === 'function' && typeof v.seconds === 'number') return { __ts: [v.seconds, v.nanoseconds || 0] };
    if (Array.isArray(v)) return v.map(function (x) { var e = enc(x); return e === undefined ? null : e; });
    var o = {};
    Object.keys(v).forEach(function (k) { var e = enc(v[k]); if (e !== undefined) o[k] = e; });
    return o;
  }
  function dec(v) {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(dec);
    if (Array.isArray(v.__ts) && v.__ts.length === 2) return new firebase.firestore.Timestamp(v.__ts[0], v.__ts[1]);
    var o = {};
    Object.keys(v).forEach(function (k) { o[k] = dec(v[k]); });
    return o;
  }

  /* ======================================================================
     SNACKBAR
     ====================================================================== */
  var snack = null, snackTimer = 0, snackLeft = 0, snackStart = 0, snackEntry = '';
  function ensureSnack() {
    if (snack) return snack;
    snack = document.createElement('div');
    snack.className = 'ur-snack';
    snack.id = 'ur-snack';
    snack.setAttribute('role', 'status');
    snack.setAttribute('aria-live', 'polite');
    snack.innerHTML = '<span class="ur-msg"></span><span class="ur-acts"></span><button type="button" class="ur-x" aria-label="">\u00d7</button>';
    snack.querySelector('.ur-x').addEventListener('click', function () { hideSnack(); });
    snack.addEventListener('mouseenter', pauseSnack);
    snack.addEventListener('mouseleave', resumeSnack);
    snack.addEventListener('focusin', pauseSnack);
    snack.addEventListener('focusout', resumeSnack);
    document.body.appendChild(snack);
    return snack;
  }
  function armSnack(ms) { clearTimeout(snackTimer); snackLeft = ms; snackStart = Date.now(); snackTimer = setTimeout(hideSnack, ms); }
  function pauseSnack() { if (!snackTimer) return; clearTimeout(snackTimer); snackTimer = 0; snackLeft = Math.max(1500, snackLeft - (Date.now() - snackStart)); }
  function resumeSnack() { if (snack && snack.classList.contains('on') && !snackTimer) armSnack(Math.max(2500, snackLeft)); }
  function hideSnack() {
    clearTimeout(snackTimer); snackTimer = 0; snackEntry = '';
    if (snack) snack.classList.remove('on');
  }
  function showSnack(msg, actions, opts) {
    opts = opts || {};
    var el = ensureSnack();
    try { var t = $('toast'); if (t) t.classList.remove('show'); } catch (e) {}   // jangan tumpang-tindih dengan toast bawaan
    el.querySelector('.ur-msg').textContent = msg;
    el.querySelector('.ur-x').setAttribute('aria-label', T('close'));
    var box = el.querySelector('.ur-acts');
    box.textContent = '';
    (actions || []).forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ur-btn' + (a.ghost ? ' ghost' : '');
      b.textContent = a.text;
      b.addEventListener('click', function () {
        if (b.disabled) return;
        b.disabled = true;
        Promise.resolve().then(a.run).catch(function (err) { console.error(err); }).then(function () { hideSnack(); });
      });
      box.appendChild(b);
    });
    snackEntry = opts.entryId || '';
    el.classList.add('on');
    armSnack(opts.ms || SNACK_MS);
  }

  /* ======================================================================
     UNDO
     ====================================================================== */
  function readLog() {
    var now = Date.now();
    var a = readJSON(key('log'));
    a = Array.isArray(a) ? a : (a && Array.isArray(a.items) ? a.items : []);
    return a.filter(function (e) { return e && e.id && Array.isArray(e.snaps) && now - e.at < LOG_TTL; });
  }
  function writeLog(list) {
    list = list.slice(-LOG_MAX);
    while (list.length && !lsSet(key('log'), JSON.stringify({ items: list }))) list.shift();   // kuota penuh: buang yang paling lama
    if (!list.length) lsDel(key('log'));
  }

  /* Baca kondisi dokumen SEBELUM diubah. Mengembalikan {path, exists, data} atau null bila gagal. */
  function capture(ref, fallback) {
    return new Promise(function (resolve) {
      var done = false;
      function finish(v) { if (done) return; done = true; clearTimeout(tm); resolve(v); }
      function fb() { return fallback ? { path: ref.path, exists: true, data: enc(fallback) } : null; }
      var tm = setTimeout(function () { finish(fb()); }, 4500);
      try {
        ref.get().then(function (s) { finish(fromSnap(s)); }, function () { finish(fb()); });
      } catch (e) { finish(fb()); }
    });
  }
  function fromSnap(s) {
    if (!s) return null;
    return { path: s.ref.path, exists: !!s.exists, data: s.exists ? enc(s.data()) : null };
  }

  /* Catat aksi yang bisa diurungkan dan tampilkan snackbar. snaps = hasil capture()/fromSnap() (satu atau banyak). */
  function offer(snaps, o) {
    o = o || {};
    snaps = (Array.isArray(snaps) ? snaps : [snaps]).filter(Boolean);
    if (!snaps.length) { if (o.message) appToast(o.message); return ''; }
    var entry = { id: rid(), at: Date.now(), kind: o.kind || 'edit', message: o.message || '', snaps: snaps };
    var log = readLog(); log.push(entry); writeLog(log);
    showSnack(o.message || T('undo'), [{ text: T('undo'), run: function () { return restore(entry.id); } }], { entryId: entry.id });
    return entry.id;
  }

  async function restore(id) {
    var e = readLog().filter(function (x) { return x.id === id; })[0];
    if (!e) { appToast(T('gone')); return false; }
    try {
      var ops = [];
      for (var i = 0; i < e.snaps.length; i++) {
        var s = e.snaps[i], ref = fs().doc(s.path);
        if (s.exists) {
          if (e.kind === 'delete') {
            var cur = await ref.get();
            if (cur.exists && !window.confirm(T('overwrite'))) continue;
          }
          ops.push({ ref: ref, set: dec(s.data) });
        } else {
          ops.push({ ref: ref, del: true });
        }
      }
      for (var c = 0; c < ops.length; c += 400) {
        var batch = fs().batch();
        ops.slice(c, c + 400).forEach(function (op) { if (op.del) batch.delete(op.ref); else batch.set(op.ref, op.set); });
        await batch.commit();
      }
      writeLog(readLog().filter(function (x) { return x.id !== id; }));
      refreshAfter(e.snaps.map(function (s) { return s.path; }));
      appToast(T('restored'));
      return true;
    } catch (err) {
      console.error(err);
      notify(T('restoreFail') + (err && err.message || err));
      return false;
    }
  }
  function refreshAfter(paths) {
    try { if (paths.some(function (p) { return /\/journals\//.test(p); }) && typeof loadJournals === 'function') loadJournals(); } catch (e) {}
    try { if (paths.some(function (p) { return /\/diaries\//.test(p); }) && typeof loadDiaryDay === 'function' && typeof diaryState !== 'undefined') loadDiaryDay(diaryState.date); } catch (e) {}
  }

  /* Hapus dokumen + tawarkan undo. Mengembalikan true bila terhapus. */
  async function deleteWithUndo(ref, o) {
    o = o || {};
    var snap = await capture(ref, o.fallback);
    if (!snap && !window.confirm(T('noBackup'))) return false;
    try { await ref.delete(); }
    catch (err) { console.error(err); notify(T('delFail') + (err && err.message || err)); return false; }
    if (snap && snap.exists) offer(snap, { kind: 'delete', message: o.message || T('jDeleted') });
    else if (o.message) appToast(o.message);
    return true;
  }

  function undoLast() {
    var log = readLog(), e = log[log.length - 1];
    if (!e) return Promise.resolve(false);
    hideSnack();
    return restore(e.id);
  }

  document.addEventListener('keydown', function (ev) {
    if (!(ev.ctrlKey || ev.metaKey) || ev.shiftKey || ev.altKey || (ev.key || '').toLowerCase() !== 'z') return;
    var t = ev.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;   // biarkan undo ketik bawaan browser
    if (!readLog().length) return;
    ev.preventDefault();
    undoLast();
  });

  /* ======================================================================
     DRAFT JOURNAL
     ====================================================================== */
  var section = $('form-section'), form = $('journal-form');
  var dirty = false, suspend = false, bypass = false, saveTimer = 0, activeKey = '', wasHidden = true;

  function curEditId() { var e = $('edit-id'); return e ? e.value || '' : ''; }
  function jKey(editId) { return key('draft.journal.' + (editId ? 'e.' + editId : 'new')); }
  function esc(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'); }
  function fire(el, type) { el.dispatchEvent(new Event(type, { bubbles: true })); }

  function serializeForm() {
    var out = [];
    if (!form) return out;
    form.querySelectorAll('input,textarea,select').forEach(function (el) {
      var t = (el.type || '').toLowerCase();
      if (t === 'file' || t === 'button' || t === 'submit' || t === 'reset' || t === 'password' || el.id === 'edit-id') return;
      if (!el.id && !el.name) return;   // 'hidden' tetap ikut (mis. input-rating)
      if (t === 'radio' || t === 'checkbox') out.push({ t: t, n: el.name || '', i: el.id || '', val: el.value, c: !!el.checked });
      else out.push({ n: el.name || '', i: el.id || '', v: el.value });
    });
    return out;
  }
  function activeBtn(sel, attr) { var b = form && form.querySelector(sel); return b ? b.getAttribute(attr) : ''; }
  function snapshot() {
    var s = {
      v: 1, at: Date.now(), editId: curEditId(), fields: serializeForm(),
      emotions: [], charts: [], files: 0, preDirty: !!window.__jwPreDirty,
      tab: activeBtn('.jw-tab.is-active', 'data-jw-tab') || 'trade',
      step: parseInt(activeBtn('.jw-chip.is-active', 'data-jw-go'), 10) || 1
    };
    try { s.emotions = (typeof selectedEmotions !== 'undefined' ? selectedEmotions : []).slice(); } catch (e) {}
    try { s.charts = (typeof existingCharts !== 'undefined' ? existingCharts : []).slice(); } catch (e) {}
    try { s.files = (typeof selectedFiles !== 'undefined' ? selectedFiles.length : 0) + (typeof outlookFiles !== 'undefined' ? outlookFiles.length : 0); } catch (e) {}
    try { if (typeof journalSubmitId !== 'undefined') s.submitId = journalSubmitId; } catch (e) {}
    return s;
  }
  function fieldVal(s, id) { for (var i = 0; i < s.fields.length; i++) if (s.fields[i].i === id) return s.fields[i].v || ''; return ''; }
  function anyChecked(s, name) { return s.fields.some(function (f) { return f.n === name && f.c; }); }
  // Form baru dianggap "ada isinya" bila pengguna sudah mengisi sesuatu yang bermakna.
  function hasContent(s) {
    return !!(String(fieldVal(s, 'input-pl')).trim() || fieldVal(s, 'input-pair').trim() || fieldVal(s, 'input-tags').trim() ||
      fieldVal(s, 'input-notes').trim() || fieldVal(s, 'outlook-reason').trim() || fieldVal(s, 'input-risk').trim() || fieldVal(s, 'input-r').trim() ||
      s.emotions.length || s.files || anyChecked(s, 'bias') || anyChecked(s, 'tradeResult') || anyChecked(s, 'outlookBias'));
  }

  function saveNow() {
    clearTimeout(saveTimer); saveTimer = 0;
    if (!dirty || suspend || !form || !uid() || section.classList.contains('hidden')) return;
    var s = snapshot(), k = jKey(s.editId);
    activeKey = k;
    // v16.67: kabari form (status "draf tersimpan") — tidak mengubah logika draf
    function tell(state) { try { window.dispatchEvent(new CustomEvent('jf-draft', { detail: { state: state, at: Date.now() } })); } catch (e) {} }
    if (!s.editId && !hasContent(s)) { lsDel(k); tell('empty'); return; }
    tell(lsSet(k, JSON.stringify(s)) ? 'saved' : 'failed');
  }
  function schedule() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 450); }

  var NAV_SKIP = '#btn-cancel-form,#btn-save,#jw-next,#jw-back,#jw-pre-save,#jw-rev-save,[data-jw-tab],[data-jw-go]';
  if (form && section) {
    ['input', 'change', 'click'].forEach(function (ev) {
      form.addEventListener(ev, function (e) {
        if (!e.isTrusted || suspend) return;
        if (ev === 'click') {
          var b = e.target.closest && e.target.closest('button');
          if (!b || b.matches(NAV_SKIP)) return;
        }
        dirty = true; schedule();
      }, true);
    });
    // Simpan paksa sebelum modal ditutup (Batal / klik latar / Esc) karena resetForm() menghapus isi form seketika.
    document.addEventListener('click', function (e) { if (dirty && !section.classList.contains('hidden')) saveNow(); }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dirty) saveNow(); }, true);

    new MutationObserver(function () {
      var hidden = section.classList.contains('hidden');
      if (hidden && !wasHidden) onClose();
      else if (!hidden && wasHidden) onOpen();
      wasHidden = hidden;
    }).observe(section, { attributes: true, attributeFilter: ['class'] });
    wasHidden = section.classList.contains('hidden');
  }
  function onOpen() { dirty = false; activeKey = jKey(curEditId()); }
  function onClose() {
    clearTimeout(saveTimer); saveTimer = 0;
    if (!dirty || !activeKey || !readJSON(activeKey)) { dirty = false; return; }
    var k = activeKey;
    showSnack(T('draftSaved'), [
      { text: T('resume'), run: function () { var d = readJSON(k); return d ? resume(d) : null; } },
      { text: T('discard'), ghost: true, run: function () { lsDel(k); } }
    ], { ms: 8000 });
    dirty = false;
  }
  function clearJournalDraft() {
    clearTimeout(saveTimer); saveTimer = 0; dirty = false;
    if (activeKey) lsDel(activeKey);
    lsDel(jKey(''));
    activeKey = '';
  }

  function setField(f) {
    if (f.t === 'radio' || f.t === 'checkbox') {
      var els;
      if (f.n) els = [].slice.call(form.querySelectorAll('input[name="' + esc(f.n) + '"]')).filter(function (x) { return x.type === f.t && x.value === f.val; });
      else { var e0 = f.i && $(f.i); els = e0 ? [e0] : []; }
      els.forEach(function (el) { if (el.checked !== f.c) { el.checked = f.c; if (f.c || f.t === 'checkbox') fire(el, 'change'); } });
      return;
    }
    var el = f.i ? $(f.i) : form.querySelector('[name="' + esc(f.n) + '"]');
    if (!el || el.value === f.v) return;
    el.value = f.v;
    if (f.i === 'input-date') return;   // 'change' pada tanggal akan memuat ulang outlook dan menimpa isian
    fire(el, 'input');
    if (el.tagName === 'SELECT') fire(el, 'change');
  }

  // Isi form yang sedang terbuka dengan isi draft.
  async function applyDraft(d) {
    suspend = true;
    try {
      var df = d.fields.filter(function (f) { return f.i === 'input-date'; })[0];
      if (df && $('input-date')) {
        $('input-date').value = df.v;
        if (typeof loadOutlookForDate === 'function') await loadOutlookForDate(df.v);   // muat outlook tersimpan dulu, agar chart lama tidak terhapus saat simpan
      }
      d.fields.forEach(setField);
      try { selectedEmotions = (d.emotions || []).slice(); if (typeof renderEmotions === 'function') renderEmotions(); } catch (e) {}
      if (d.editId) { try { existingCharts = (d.charts || []).slice(); if (typeof renderChartPreviews === 'function') renderChartPreviews(); } catch (e) {} }
      if (d.submitId) { try { journalSubmitId = d.submitId; } catch (e) {} }
      try { if (typeof refreshPlPreview === 'function') refreshPlPreview(); } catch (e) {}
      try { if (typeof updateTradeLoseDisplay === 'function') updateTradeLoseDisplay(); } catch (e) {}
      try { window.TradeSummary && TradeSummary.syncStars && TradeSummary.syncStars(); } catch (e) {}
      window.__jwPreDirty = !!d.preDirty;
      await tick(30);
      // pulihkan tab / langkah wizard (hanya maju bila syarat langkah 1 terpenuhi, agar tidak memunculkan toast galat)
      if (d.tab === 'pre' || d.tab === 'review') {
        var pt = form.querySelector('[data-jw-tab="' + d.tab + '"]'); if (pt) pt.click();
      } else if (d.step > 1) {
        var okDate = !!($('input-date') && $('input-date').value);
        var locked = [].some.call(document.querySelectorAll('input[name="tradeResult"]'), function (r) { return r.disabled; });
        var okRes = locked || !!document.querySelector('input[name="tradeResult"]:checked');
        var okBias = !!curEditId() || !!document.querySelector('input[name="bias"]:checked');
        var chip = form.querySelector('[data-jw-go="' + d.step + '"]');
        if (chip && okDate && okRes && okBias) chip.click();
      }
    } finally { suspend = false; }
    dirty = true;
    activeKey = jKey(curEditId());
    saveNow();
  }

  // Buka form (baru / edit) lalu isi dengan draft.
  async function resume(d) {
    if (!section || !form) return;
    if (!section.classList.contains('hidden') && dirty) return;   // jangan menimpa form yang sedang diisi
    var fab = $('btn-new-journal-fab');
    bypass = true;
    try {
      if (d.editId && origEdit) {
        await origEdit(d.editId);
        if (curEditId() !== d.editId) d.editId = '';   // journal sudah tidak ada -> lanjutkan sebagai entry baru
      }
      if (!d.editId && fab) fab.click();
    } finally { bypass = false; }
    await tick(60);
    await applyDraft(d);
  }

  // Klik tombol "+" saat ada draft baru -> lanjutkan draft, bukan form kosong.
  document.addEventListener('click', function (e) {
    if (bypass) return;
    var fab = e.target.closest && e.target.closest('#btn-new-journal-fab');
    if (!fab || !uid()) return;
    var d = readJSON(jKey(''));
    if (!d) return;
    e.stopImmediatePropagation(); e.preventDefault();
    resume(d).then(function () {
      showSnack(T('draftResumed'), [{ text: T('startNew'), ghost: true, run: startNew }], { ms: 8000 });
    });
  }, true);
  async function startNew() {
    lsDel(jKey(''));
    var fab = $('btn-new-journal-fab');
    if (!fab) return;
    bypass = true;
    try { fab.click(); } finally { bypass = false; }
    dirty = false;
  }

  // Edit journal: tawarkan perubahan yang belum tersimpan untuk journal yang sama.
  var origEdit = (typeof window.editJournal === 'function') ? window.editJournal : null;
  if (origEdit) {
    window.editJournal = async function (id) {
      var r = await origEdit.apply(this, arguments);
      try {
        var d = readJSON(jKey(id));
        if (d && !bypass && curEditId() === id) {
          showSnack(T('editDraftFound', { w: when(d.at) }), [
            { text: T('restore'), run: function () { return applyDraft(d); } },
            { text: T('discard'), ghost: true, run: function () { lsDel(jKey(id)); } }
          ], { ms: 12000 });
        }
      } catch (e) { console.error(e); }
      return r;
    };
  }

  /* ======================================================================
     DRAFT DIARY
     ====================================================================== */
  function dKey(date) { return key('draft.diary.' + date); }
  var diaryTimer = 0;
  function diaryNowObj() {
    return { v: 1, at: Date.now(), date: diaryState.date, notes: diaryState.notes || '', mood: diaryState.mood || 0,
      tasks: (diaryState.tasks || []).map(function (t) { return { text: t.text, done: !!t.done }; }) };
  }
  function diaryEmpty(o) { return !o.notes.trim() && !o.mood && !o.tasks.length; }
  function saveDiaryNow() {
    clearTimeout(diaryTimer); diaryTimer = 0;
    try {
      if (!uid() || typeof diaryState === 'undefined' || !diaryDirty) return;
      var o = diaryNowObj();
      if (diaryEmpty(o)) lsDel(dKey(o.date)); else lsSet(dKey(o.date), JSON.stringify(o));
    } catch (e) {}
  }
  function scheduleDiary() { clearTimeout(diaryTimer); diaryTimer = setTimeout(saveDiaryNow, 500); }
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'diary-notes') scheduleDiary(); });
  document.addEventListener('change', function (e) { if (e.target && e.target.closest && e.target.closest('#diary-tasks')) scheduleDiary(); });
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    if (t.closest('#diary-tasks') || t.closest('.mood-btn') || t.closest('#diary-task-add')) scheduleDiary();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id === 'diary-task-input') scheduleDiary(); });
  function clearDiaryDraft(date) { clearTimeout(diaryTimer); diaryTimer = 0; if (date) lsDel(dKey(date)); }

  var origLoadDiary = (typeof window.loadDiaryDay === 'function') ? window.loadDiaryDay : null;
  if (origLoadDiary) {
    window.loadDiaryDay = async function (ds) {
      var r = await origLoadDiary.apply(this, arguments);
      try { offerDiaryDraft(ds); } catch (e) { console.error(e); }
      return r;
    };
  }
  function offerDiaryDraft(ds) {
    if (!uid()) return;
    var d = readJSON(dKey(ds));
    if (!d) return;
    var cur = diaryNowObj();
    if (diaryEmpty(d) || (d.notes === cur.notes && d.mood === cur.mood && JSON.stringify(d.tasks) === JSON.stringify(cur.tasks))) { lsDel(dKey(ds)); return; }
    showSnack(T('diaryDraftFound', { w: when(d.at) }), [
      { text: T('restore'), run: function () {
        if (diaryState.date !== ds) return;
        diaryState = { date: ds, tasks: d.tasks, notes: d.notes, mood: d.mood };
        diaryDirty = true;
        renderDiaryForm();
      } },
      { text: T('discard'), ghost: true, run: function () { lsDel(dKey(ds)); } }
    ], { ms: 12000 });
  }

  /* ======================================================================
     Simpan paksa saat halaman disembunyikan / ditutup, lalu tawarkan lagi saat dibuka
     ====================================================================== */
  function flushAll() { saveNow(); saveDiaryNow(); }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flushAll(); });
  window.addEventListener('pagehide', flushAll);
  window.addEventListener('beforeunload', flushAll);

  var booted = '';
  function onUser() {
    var u = uid();
    if (!u || booted === u) return;
    booted = u;
    // buang draft yang sudah terlalu lama
    try {
      var pre = NS + '.draft.', suf = '.' + u, now = Date.now(), best = null, bestKey = '';
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (!k || k.indexOf(pre) !== 0 || k.slice(-suf.length) !== suf) continue;
        var d = readJSON(k);
        if (!d || !d.at || now - d.at > DRAFT_TTL) { lsDel(k); continue; }
        if (k.indexOf(NS + '.draft.journal.') === 0 && (!best || d.at > best.at)) { best = d; bestKey = k; }
      }
    } catch (e) {}
    // 1) cadangan undo yang masih berlaku (mis. halaman dimuat ulang tepat setelah hapus)
    var log = readLog(), last = log[log.length - 1];
    if (last) {
      showSnack(last.message || T('undo'), [{ text: T('undo'), run: function () { return restore(last.id); } }], { entryId: last.id, ms: 12000 });
      return;
    }
    // 2) draft journal yang belum tersimpan
    if (best && section && section.classList.contains('hidden')) {
      var bk = bestKey;
      showSnack(T('draftFound', { w: when(best.at) }), [
        { text: T('resume'), run: function () { var d2 = readJSON(bk); return d2 ? resume(d2) : null; } },
        { text: T('discard'), ghost: true, run: function () { lsDel(bk); } }
      ], { ms: 15000 });
    }
  }
  (function waitUser() {
    var tries = 0;
    (function poll() { if (uid()) return setTimeout(onUser, 700); if (++tries < 60) setTimeout(poll, 500); })();
    try { firebase.auth().onAuthStateChanged(function (u) { if (u) setTimeout(onUser, 900); else booted = ''; }); } catch (e) {}
  })();

  window.UR = {
    t: T, capture: capture, fromSnap: fromSnap, offer: offer, restore: restore, undoLast: undoLast,
    deleteWithUndo: deleteWithUndo, clearJournalDraft: clearJournalDraft, clearDiaryDraft: clearDiaryDraft,
    showSnack: showSnack, hideSnack: hideSnack
  };
})();
