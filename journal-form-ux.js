/* v16.67 · Journal Form yang lebih intuitif (skrip)
   - Status simpan di header: belum ada perubahan / belum disimpan / draf tersimpan / menyimpan / gagal
   - Tutup (simpan draf) dan Batal (buang) dibedakan; ada konfirmasi bila ada perubahan yang belum disimpan
   - "Input terakhir": penanda pada pilihan arah/akun/sesi, chip Risk, dan tombol "Pakai setup terakhir"
   Tidak mengubah logika simpan. Bergantung pada draf otomatis di undo-recovery.js (event 'jf-draft'). */
(function () {
  'use strict';
  var D = {
    id: { close: 'Tutup', closeLbl: 'Tutup form (draf disimpan)', cancel: 'Batal', quick: 'Simpan sekarang',
      sIdle: 'Belum ada perubahan', sIdleEdit: 'Mengedit journal · belum ada perubahan', sUnsaved: 'Perubahan belum disimpan',
      sDraft: 'Draf tersimpan di perangkat', sDraftTip: 'Draf otomatis tersimpan di perangkat ini. Journal baru masuk ke daftar setelah kamu menekan Simpan.',
      sSaving: 'Menyimpan journal…', sError: 'Belum tersimpan · isianmu masih aman, coba lagi', sDraftFail: 'Draf gagal disimpan · tekan Simpan agar tidak hilang',
      last: 'Terakhir', lastLbl: 'Input terakhir', reuse: 'Pakai setup terakhir', reuseDone: 'Setup terakhir dipakai',
      qCloseT: 'Tutup form ini?', qCloseB: 'Ada isian yang belum disimpan ke journal. Draf tersimpan otomatis di perangkat ini dan bisa dilanjutkan nanti.',
      qCloseEditB: 'Ada perubahan pada journal ini yang belum disimpan. Draf perubahan tersimpan otomatis dan bisa dilanjutkan nanti.',
      qCancelT: 'Batalkan dan buang isian?', qCancelB: 'Semua isian di form ini akan dibuang dan tidak bisa dikembalikan.',
      qCancelEditB: 'Semua perubahan pada journal ini akan dibuang. Journal yang sudah tersimpan tidak berubah.',
      keep: 'Lanjut mengisi', toDraft: 'Tutup, simpan draf', discard: 'Buang perubahan', yesDiscard: 'Ya, buang isian' },
    en: { close: 'Close', closeLbl: 'Close form (draft is kept)', cancel: 'Cancel', quick: 'Save now',
      sIdle: 'No changes yet', sIdleEdit: 'Editing journal · no changes yet', sUnsaved: 'Changes not saved yet',
      sDraft: 'Draft saved on this device', sDraftTip: 'A draft is saved automatically on this device. The journal only appears in your list after you press Save.',
      sSaving: 'Saving journal…', sError: 'Not saved yet · your entry is safe, try again', sDraftFail: 'Draft could not be saved · press Save so nothing is lost',
      last: 'Last', lastLbl: 'Last input', reuse: 'Use last setup', reuseDone: 'Last setup applied',
      qCloseT: 'Close this form?', qCloseB: 'Some entries are not saved to the journal yet. A draft is kept on this device so you can continue later.',
      qCloseEditB: 'This journal has changes that are not saved yet. A draft of the changes is kept so you can continue later.',
      qCancelT: 'Cancel and discard entries?', qCancelB: 'Everything in this form will be discarded and cannot be restored.',
      qCancelEditB: 'All changes to this journal will be discarded. The saved journal stays as it is.',
      keep: 'Keep editing', toDraft: 'Close, keep draft', discard: 'Discard changes', yesDiscard: 'Yes, discard' },
    ms: { close: 'Tutup', closeLbl: 'Tutup borang (draf disimpan)', cancel: 'Batal', quick: 'Simpan sekarang',
      sIdle: 'Belum ada perubahan', sIdleEdit: 'Mengedit jurnal · belum ada perubahan', sUnsaved: 'Perubahan belum disimpan',
      sDraft: 'Draf disimpan pada peranti', sDraftTip: 'Draf disimpan automatik pada peranti ini. Jurnal baru muncul dalam senarai selepas anda tekan Simpan.',
      sSaving: 'Menyimpan jurnal…', sError: 'Belum disimpan · isian anda selamat, cuba lagi', sDraftFail: 'Draf gagal disimpan · tekan Simpan supaya tidak hilang',
      last: 'Terakhir', lastLbl: 'Input terakhir', reuse: 'Guna setup terakhir', reuseDone: 'Setup terakhir digunakan',
      qCloseT: 'Tutup borang ini?', qCloseB: 'Ada isian yang belum disimpan ke jurnal. Draf disimpan automatik pada peranti ini dan boleh disambung kemudian.',
      qCloseEditB: 'Ada perubahan pada jurnal ini yang belum disimpan. Draf perubahan disimpan automatik.',
      qCancelT: 'Batalkan dan buang isian?', qCancelB: 'Semua isian dalam borang ini akan dibuang dan tidak boleh dikembalikan.',
      qCancelEditB: 'Semua perubahan pada jurnal ini akan dibuang. Jurnal yang sudah disimpan tidak berubah.',
      keep: 'Teruskan mengisi', toDraft: 'Tutup, simpan draf', discard: 'Buang perubahan', yesDiscard: 'Ya, buang isian' },
    es: { close: 'Cerrar', closeLbl: 'Cerrar formulario (se guarda el borrador)', cancel: 'Cancelar', quick: 'Guardar ahora',
      sIdle: 'Sin cambios', sIdleEdit: 'Editando diario · sin cambios', sUnsaved: 'Cambios sin guardar',
      sDraft: 'Borrador guardado en este dispositivo', sDraftTip: 'El borrador se guarda automáticamente en este dispositivo. El diario aparece en la lista al pulsar Guardar.',
      sSaving: 'Guardando diario…', sError: 'Aún no guardado · tus datos están a salvo, inténtalo de nuevo', sDraftFail: 'No se pudo guardar el borrador · pulsa Guardar para no perderlo',
      last: 'Último', lastLbl: 'Última entrada', reuse: 'Usar el último setup', reuseDone: 'Último setup aplicado',
      qCloseT: '¿Cerrar este formulario?', qCloseB: 'Hay datos sin guardar en el diario. Se conserva un borrador en este dispositivo para continuar después.',
      qCloseEditB: 'Este diario tiene cambios sin guardar. Se conserva un borrador de los cambios.',
      qCancelT: '¿Cancelar y descartar?', qCancelB: 'Todo lo del formulario se descartará y no se podrá recuperar.',
      qCancelEditB: 'Se descartarán todos los cambios. El diario guardado no cambia.',
      keep: 'Seguir editando', toDraft: 'Cerrar, guardar borrador', discard: 'Descartar cambios', yesDiscard: 'Sí, descartar' }
  };
  function lang() { try { return localStorage.getItem('journalLanguage') || 'id'; } catch (e) { return 'id'; } }
  function T(k) { return (D[lang()] || D.id)[k] || D.id[k]; }
  var $ = function (id) { return document.getElementById(id); };
  var section = $('form-section'), form = $('journal-form');
  if (!section || !form) return;
  var save = $('btn-save'), preSave = $('jw-pre-save'), revSave = $('jw-rev-save');

  function isOpen() { return !section.classList.contains('hidden'); }
  function isEdit() { var e = $('edit-id'); return !!(e && e.value); }
  function uid() { try { return (typeof currentUser !== 'undefined' && currentUser && currentUser.uid) || 'local'; } catch (e) { return 'local'; } }
  function val(id) { var e = $(id); return e ? String(e.value || '').trim() : ''; }
  function radio(name) { var r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }

  /* =============== Status simpan =============== */
  var dirty = false, saving = false, state = 'idle', draftAt = 0;
  function clock(t) { try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function setStatus(s) {
    state = s;
    var box = $('jf-status'), tx = $('jf-status-text'); if (!box || !tx) return;
    var txt = { idle: isEdit() ? T('sIdleEdit') : T('sIdle'), unsaved: T('sUnsaved'), draft: T('sDraft') + (draftAt ? ' · ' + clock(draftAt) : ''),
      saving: T('sSaving'), error: T('sError'), draftfail: T('sDraftFail') }[s] || '';
    box.setAttribute('data-state', s); tx.textContent = txt; box.title = s === 'draft' ? T('sDraftTip') : '';
  }
  function applyStatic() {
    $('jf-close-text').textContent = T('close');
    $('btn-cancel-form').setAttribute('aria-label', T('closeLbl')); $('btn-cancel-form').title = T('closeLbl');
    $('jf-cancel').textContent = T('cancel'); $('jf-quick').textContent = T('quick');
    setStatus(state);
  }

  // Isi form baru yang bermakna (tanpa outlook). Dipakai bila draf dilanjutkan: isian terisi lewat skrip, bukan ketikan.
  function hasContent() {
    if (isEdit()) return false;
    try {
      return !!(val('input-pair') || val('input-tags') || val('input-pl') || val('input-risk') || val('input-r') || val('input-notes') || val('input-rating') ||
        radio('bias') || radio('tradeResult') || radio('accountType') || radio('session') ||
        (typeof selectedEmotions !== 'undefined' && selectedEmotions.length) || (typeof selectedFiles !== 'undefined' && selectedFiles.length));
    } catch (e) { return false; }
  }
  function isDirty() { return dirty || hasContent(); }

  var NAV = '#btn-cancel-form,#btn-save,#jw-next,#jw-back,#jw-pre-save,#jw-rev-save,[data-jw-tab],[data-jw-go],#jf-cancel,#jf-quick';
  ['input', 'change', 'click'].forEach(function (ev) {
    form.addEventListener(ev, function (e) {
      if (!e.isTrusted || saving) return;
      if (ev === 'click') { var b = e.target.closest && e.target.closest('button'); if (!b || b.matches(NAV)) return; }
      dirty = true; setStatus('unsaved');
    }, true);
  });
  window.addEventListener('jf-draft', function (e) {
    if (!isOpen() || saving) return;
    var s = e.detail && e.detail.state;
    if (s === 'saved') { draftAt = e.detail.at; setStatus('draft'); }
    else if (s === 'failed') setStatus('draftfail');
    else if (s === 'empty') { dirty = false; setStatus('idle'); }
  });

  // Menyimpan: tombol simpan dikunci oleh handler lama selama proses. Bila terbuka lagi tapi form masih ada = gagal / belum lolos.
  function onBusy() {
    var busy = !!((save && save.disabled) || (preSave && preSave.disabled) || (revSave && revSave.disabled));
    if (busy) { saving = true; setStatus('saving'); }
    else if (saving) { saving = false; if (isOpen()) setStatus('error'); }
  }
  var mo = new MutationObserver(onBusy);
  [save, preSave, revSave].forEach(function (b) { if (b) mo.observe(b, { attributes: true, attributeFilter: ['disabled'] }); });

  /* =============== Tutup vs Batal + konfirmasi =============== */
  var ov = null, lastFocus = null, dlgDone = null;
  function buildDlg() {
    if (ov) return;
    ov = document.createElement('div'); ov.className = 'jf-dlg-ov'; ov.hidden = true;
    ov.innerHTML = '<div class="jf-dlg" role="alertdialog" aria-modal="true" aria-labelledby="jf-dlg-t" aria-describedby="jf-dlg-b"><h3 id="jf-dlg-t"></h3><p id="jf-dlg-b"></p><div class="jf-dlg-act"></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) dlgClose('keep'); });
    ov.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); dlgClose('keep'); return; }
      if (e.key === 'Tab') {
        var bs = ov.querySelectorAll('button'); if (!bs.length) return;
        var f = bs[0], l = bs[bs.length - 1];
        if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); }
        else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); }
      }
    });
  }
  function dlgClose(choice) {
    if (!ov || ov.hidden) return;
    ov.hidden = true;
    var fn = dlgDone; dlgDone = null;
    if (choice === 'keep') { try { (lastFocus && lastFocus.focus) && lastFocus.focus(); } catch (e) {} }
    if (fn) fn(choice);
  }
  function ask(title, body, actions, done) {
    buildDlg();
    lastFocus = document.activeElement; dlgDone = done;
    ov.querySelector('#jf-dlg-t').textContent = title; ov.querySelector('#jf-dlg-b').textContent = body;
    var box = ov.querySelector('.jf-dlg-act'); box.textContent = '';
    actions.forEach(function (a) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'is-' + a.tone; b.textContent = a.label;
      b.addEventListener('click', function () { dlgClose(a.id); });
      box.appendChild(b);
    });
    ov.hidden = false;
    var first = box.querySelector('.is-primary') || box.querySelector('button'); if (first) first.focus();
  }

  var bypass = false;
  function closeNow(discard) {
    bypass = true;
    try {
      if (discard) { try { window.UR && UR.clearJournalDraft(); } catch (e) {} }
      var b = $('btn-cancel-form'); if (b) b.click();
    } finally { bypass = false; }
  }
  function askClose() {
    var edit = isEdit();
    ask(T('qCloseT'), edit ? T('qCloseEditB') : T('qCloseB'), [
      { id: 'keep', tone: 'primary', label: T('keep') },
      { id: 'draft', tone: 'secondary', label: T('toDraft') },
      { id: 'discard', tone: 'danger', label: T('discard') }
    ], function (c) { if (c === 'draft') closeNow(false); else if (c === 'discard') closeNow(true); });
  }
  function askCancel() {
    var edit = isEdit();
    ask(T('qCancelT'), edit ? T('qCancelEditB') : T('qCancelB'), [
      { id: 'keep', tone: 'primary', label: T('keep') },
      { id: 'discard', tone: 'danger', label: T('yesDiscard') }
    ], function (c) { if (c === 'discard') closeNow(true); });
  }
  // Capture di window: berjalan sebelum handler lama (Tutup / klik latar) yang langsung mereset form.
  window.addEventListener('click', function (e) {
    if (bypass || !isOpen() || (ov && !ov.hidden)) return;
    var t = e.target, el = t && t.closest ? t : null; if (!el) return;
    var isClose = !!el.closest('#btn-cancel-form'), isBackdrop = t === section, isCancel = !!el.closest('#jf-cancel');
    if (!isClose && !isBackdrop && !isCancel) return;
    if (saving) { e.stopImmediatePropagation(); e.preventDefault(); return; }
    if (isCancel) { e.stopImmediatePropagation(); e.preventDefault(); if (isDirty()) askCancel(); else closeNow(true); return; }
    if (!isDirty()) return;                       // tidak ada perubahan: biarkan handler lama menutup
    e.stopImmediatePropagation(); e.preventDefault(); askClose();
  }, true);

  // Tab ditutup / dimuat ulang saat ada perubahan yang belum sempat tersimpan sebagai draf
  window.addEventListener('beforeunload', function (e) {
    if (isOpen() && dirty && (state === 'unsaved' || state === 'draftfail' || state === 'saving')) { e.preventDefault(); e.returnValue = ''; }
  });

  /* =============== Input terakhir =============== */
  var KEY = 'doaIbuFormLast:v1:';
  function readLast() { try { var v = JSON.parse(localStorage.getItem(KEY + uid()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function writeLast(v) { try { localStorage.setItem(KEY + uid(), JSON.stringify(v)); } catch (e) {} }
  function legacyRecent() {   // riwayat pair/tags/sesi milik index.html (dipakai bila belum ada riwayat baru)
    try { var v = JSON.parse(localStorage.getItem('doaIbuSmartRecentInput:v1:' + uid()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
  }
  function lastSetup() {
    var L = readLast(), R = legacyRecent(), s = L.setup || {};
    var o = {
      pair: s.pair || (R.pair && R.pair[0]) || '', bias: s.bias || '', tags: s.tags || (R.tags && R.tags[0]) || '',
      account: s.account || '', session: s.session || (R.session && R.session[0]) || '', risk: s.risk || ''
    };
    o.any = !!(o.pair || o.bias || o.tags || o.account || o.session || o.risk);
    return o;
  }
  var SESSION_NAME = { NewYork: 'New York' };

  var pending = null;
  form.addEventListener('submit', function (e) {   // dicatat saat submit (form baru direset setelah berhasil), disimpan bila sukses
    if (e.defaultPrevented || isEdit()) { pending = null; return; }
    pending = { pair: val('input-pair'), bias: radio('bias'), tags: val('input-tags'), account: radio('accountType'), session: radio('session'), risk: val('input-risk') };
  }, true);
  window.addEventListener('journal-saved', function () {
    if (!pending) return;
    var L = readLast(), risks = Array.isArray(L.risk) ? L.risk : [];
    if (pending.risk) risks = [pending.risk].concat(risks.filter(function (x) { return String(x) !== String(pending.risk); })).slice(0, 3);
    L.risk = risks; L.setup = pending; pending = null; writeLast(L);
  });

  function markLast() {
    var s = lastSetup();
    [['bias', s.bias], ['accountType', s.account], ['session', s.session]].forEach(function (p) {
      form.querySelectorAll('input[name="' + p[0] + '"]').forEach(function (r) {
        var tile = r.nextElementSibling; if (!tile) return;
        var on = !isEdit() && p[1] && r.value === p[1];
        tile.classList.toggle('jf-last', !!on);
        if (on) tile.setAttribute('data-jf-last', T('last')); else tile.removeAttribute('data-jf-last');
      });
    });
  }
  function renderRiskChips() {
    var host = $('recent-risk'); if (!host) return;
    var L = readLast(), items = Array.isArray(L.risk) ? L.risk.slice(0, 3) : [];
    host.replaceChildren();
    if (!items.length || isEdit()) { host.hidden = true; return; }
    host.hidden = false;
    var lb = document.createElement('span'); lb.className = 'recent-input-label'; lb.textContent = T('lastLbl'); host.appendChild(lb);
    items.forEach(function (v) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'recent-input-chip'; b.textContent = v + '%';
      b.addEventListener('click', function () { var i = $('input-risk'); if (i) { i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); } });
      host.appendChild(b);
    });
  }
  function renderReuse() {
    var host = $('jf-reuse'); if (!host) return;
    var s = lastSetup();
    if (isEdit() || !s.any) { host.hidden = true; host.textContent = ''; return; }
    var parts = [s.pair, s.bias, s.tags, s.account, SESSION_NAME[s.session] || s.session].filter(Boolean);
    host.hidden = false;
    host.innerHTML = '<button type="button"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg><span class="min-w-0"><b></b><small></small></span></button>';
    host.querySelector('b').textContent = T('reuse');
    host.querySelector('small').textContent = parts.join(' · ');
    host.querySelector('button').addEventListener('click', function () { applySetup(lastSetup()); host.querySelector('b').textContent = '✓ ' + T('reuseDone'); });
  }
  function setVal(id, v) { var e = $(id); if (!e || !v) return; e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }
  function setRadio(name, v) {
    if (!v) return;
    var r = [].filter.call(form.querySelectorAll('input[name="' + name + '"]'), function (x) { return x.value === v; })[0];
    if (r && !r.disabled) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  function applySetup(s) {   // hanya konteks setup; hasil, P/L, catatan, dan chart tidak pernah disalin
    setVal('input-pair', s.pair); setVal('input-tags', s.tags); setVal('input-risk', s.risk);
    setRadio('bias', s.bias); setRadio('accountType', s.account); setRadio('session', s.session);
  }
  function refreshHints() { markLast(); renderRiskChips(); renderReuse(); }

  /* =============== Siklus buka / tutup =============== */
  var wasHidden = !isOpen();
  new MutationObserver(function () {
    var open = isOpen();
    if (open && wasHidden) {
      dirty = false; saving = false; draftAt = 0; pending = null; setStatus('idle');
      setTimeout(function () { setStatus('idle'); refreshHints(); }, 0);   // setelah index.html mengisi edit-id
    } else if (!open && !wasHidden) {
      dirty = false; saving = false; setStatus('idle');
      if (ov && !ov.hidden) ov.hidden = true;
    }
    wasHidden = !open;
  }).observe(section, { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('change', function (e) { if (e.target && /language/.test(e.target.id || '')) setTimeout(function () { applyStatic(); refreshHints(); }, 0); });
  applyStatic();
})();
