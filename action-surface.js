/* v17.00 · Contextual Action Surface — skrip (tanpa dependensi)
   Satu action sheet bergaya iOS, isinya mengikuti konteks:
     TRADE  (baris journal, panel detail)  → Lihat detail · Edit · Evaluasi · Lihat chart · Duplikat · Pilih beberapa · Hapus
     CHART  (penampil chart, thumbnail)    → Reset zoom · Buka di tab baru · Simpan gambar · Bagikan · Salin tautan
   Pemicu: tombol ⋯ (baris, panel detail, penampil chart), tekan-tahan di layar sentuh, klik kanan di desktop.
   Aksi destruktif SELALU lewat sheet konfirmasi (juga tombol Hapus lama di baris, baki geser, dan panel detail).
   Data, Firestore, dan logika journal tidak diubah: semua aksi memanggil fungsi yang sudah ada lewat window.__jrApi.
   Membatalkan: hapus <link action-surface.css> dan <script action-surface.js>. */
(function () {
  'use strict';
  var W = window, D = document;
  if (W.__asV1700) return; W.__asV1700 = true;

  var TXT = {
    id: { detail: 'Lihat detail', edit: 'Edit', evalu: 'Evaluasi', chart: 'Lihat chart', dup: 'Duplikat', select: 'Pilih beberapa', del: 'Hapus trade',
      cancel: 'Batal', none: 'Tidak ada', delT: 'Hapus trade ini?', delGo: 'Hapus trade', delUndo: 'Kamu bisa mengurungkannya sesaat setelah dihapus.',
      delNo: 'Tindakan ini tidak bisa dibatalkan.', chartT: 'Chart', chartN: 'Chart {n}', reset: 'Reset zoom', zin: 'Perbesar', full: 'Buka layar penuh',
      tab: 'Buka di tab baru', save: 'Simpan gambar', share: 'Bagikan', copy: 'Salin tautan', copied: 'Tautan disalin', more: 'Tindakan lainnya', noPair: 'Tanpa pair',
      trade: 'Trade' },
    en: { detail: 'View details', edit: 'Edit', evalu: 'Review', chart: 'View chart', dup: 'Duplicate', select: 'Select multiple', del: 'Delete trade',
      cancel: 'Cancel', none: 'None', delT: 'Delete this trade?', delGo: 'Delete trade', delUndo: 'You can undo this right after deleting.',
      delNo: 'This can\u2019t be undone.', chartT: 'Chart', chartN: 'Chart {n}', reset: 'Reset zoom', zin: 'Zoom in', full: 'Open full screen',
      tab: 'Open in new tab', save: 'Save image', share: 'Share', copy: 'Copy link', copied: 'Link copied', more: 'More actions', noPair: 'No pair',
      trade: 'Trade' },
    es: { detail: 'Ver detalles', edit: 'Editar', evalu: 'Evaluar', chart: 'Ver gr\u00e1fico', dup: 'Duplicar', select: 'Seleccionar varios', del: 'Eliminar trade',
      cancel: 'Cancelar', none: 'Ninguno', delT: '\u00bfEliminar este trade?', delGo: 'Eliminar trade', delUndo: 'Puedes deshacerlo justo despu\u00e9s de eliminar.',
      delNo: 'Esta acci\u00f3n no se puede deshacer.', chartT: 'Gr\u00e1fico', chartN: 'Gr\u00e1fico {n}', reset: 'Restablecer zoom', zin: 'Acercar', full: 'Pantalla completa',
      tab: 'Abrir en pesta\u00f1a nueva', save: 'Guardar imagen', share: 'Compartir', copy: 'Copiar enlace', copied: 'Enlace copiado', more: 'M\u00e1s acciones', noPair: 'Sin par',
      trade: 'Trade' }
  };
  TXT.ms = TXT.id;
  function L() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return TXT[l] || TXT.id; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return D.getElementById(id); }
  function api() { return W.__jrApi || null; }
  function toast(m) { try { if (typeof W.showToast === 'function') W.showToast(m); } catch (e) {} }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {} }

  /* ---------- ikon (garis 1.8, 24px) ---------- */
  var IC = {
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
    evalu: '<path d="M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1z"/><path d="M8 6H6a1 1 0 00-1 1v13a1 1 0 001 1h12a1 1 0 001-1V7a1 1 0 00-1-1h-2"/><path d="m9 14 2 2 4-4"/>',
    chart: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
    dup: '<rect x="9" y="9" width="12" height="12" rx="3"/><path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1"/>',
    select: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
    trash: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l.9 12a2 2 0 002 1.9h6.2a2 2 0 002-1.9L18 7"/><path d="M9 7V4h6v3"/>',
    reset: '<path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/>',
    zin: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/>',
    ext: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
    save: '<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>',
    share: '<path d="M12 15V3"/><path d="m7.5 7.5 4.5-4.5 4.5 4.5"/><path d="M6 11H5a1 1 0 00-1 1v7a1 1 0 001 1h14a1 1 0 001-1v-7a1 1 0 00-1-1h-1"/>',
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>'
  };
  function svg(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (IC[k] || '') + '</svg>'; }
  var DOTS = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>';

  /* ---------- mesin sheet ---------- */
  var root = null, sheet = null, cfgNow = null, prevFocus = null, closing = false, closeTimer = 0;

  function teardown() {
    clearTimeout(closeTimer);
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = sheet = cfgNow = null; closing = false;
    D.body.classList.remove('as-lock');
    W.removeEventListener('keydown', onKey, true);
  }
  function restoreFocus() { try { if (prevFocus && prevFocus.isConnected && prevFocus.focus) prevFocus.focus({ preventScroll: true }); } catch (e) {} prevFocus = null; }

  /* cfg: { title, sub, pl:{text,tone}, message, confirm:bool, plain:bool, actions:[{label,icon,danger,disabled,hint,keep,run}], cancel } */
  function open(cfg) {
    var t = L();
    var keepFocus = prevFocus;
    if (root) teardown(); else keepFocus = D.activeElement;
    prevFocus = keepFocus;
    cfgNow = cfg;
    root = D.createElement('div'); root.className = 'as-root'; root.setAttribute('role', 'presentation');
    var head = '';
    if (cfg.title || cfg.sub || cfg.pl) {
      head = '<div class="as-head' + (cfg.plain ? ' plain' : '') + '">' +
        (cfg.title ? '<p class="as-title" id="as-t">' + esc(cfg.title) + '</p>' : '') +
        (cfg.sub ? '<p class="as-sub">' + esc(cfg.sub) + '</p>' : '') +
        (cfg.pl ? '<span class="as-pl ' + esc(cfg.pl.tone || 'zero') + '">' + esc(cfg.pl.text) + '</span>' : '') + '</div>';
    }
    var msg = cfg.message ? '<p class="as-msg">' + esc(cfg.message) + '</p>' : '';
    var btns = (cfg.actions || []).map(function (a, i) {
      return '<button type="button" class="as-btn' + (a.danger ? ' danger' : '') + '" data-i="' + i + '"' + (a.disabled ? ' disabled' : '') + '>' +
        (a.icon ? '<span class="as-ico">' + svg(a.icon) + '</span>' : '') +
        '<span class="as-lbl">' + esc(a.label) + '</span>' + (a.hint ? '<span class="as-hint">' + esc(a.hint) + '</span>' : '') + '</button>';
    }).join('');
    root.innerHTML = '<div class="as-scrim" data-as-x></div>' +
      '<div class="as-sheet' + (cfg.confirm ? ' confirm' : '') + '" role="dialog" aria-modal="true"' + (cfg.title ? ' aria-labelledby="as-t"' : ' aria-label="' + esc(t.more) + '"') + '>' +
        '<div class="as-group">' + head + msg + '<div class="as-list">' + btns + '</div></div>' +
        '<div class="as-group as-cancel"><button type="button" class="as-btn" data-as-x><span class="as-lbl">' + esc(cfg.cancel || t.cancel) + '</span></button></div>' +
      '</div>';
    sheet = root.querySelector('.as-sheet');
    D.body.appendChild(root); D.body.classList.add('as-lock');
    root.addEventListener('click', onClick);
    W.addEventListener('keydown', onKey, true);
    void root.offsetWidth;
    root.classList.add('on');
    var first = root.querySelector('.as-list .as-btn:not(:disabled)') || root.querySelector('.as-cancel .as-btn');
    if (first) try { first.focus({ preventScroll: true }); } catch (e) {}
  }

  function close(after) {
    if (!root || closing) { if (after) after(); return; }
    closing = true; root.classList.remove('on'); root.classList.add('out');
    var done = function () { teardown(); restoreFocus(); if (after) after(); };
    var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
    closeTimer = setTimeout(done, reduce ? 0 : 230);
  }

  function onClick(e) {
    if (closing) return;
    var x = e.target.closest('[data-as-x]'); if (x) { e.preventDefault(); close(); return; }
    var b = e.target.closest('.as-list .as-btn'); if (!b || b.disabled) return;
    var a = cfgNow && cfgNow.actions && cfgNow.actions[+b.getAttribute('data-i')]; if (!a) return;
    e.preventDefault();
    if (a.keep) { try { a.run && a.run(); } catch (err) { console.warn(err); } return; }   // aksi yang membuka sheet berikutnya: ganti langsung
    close(function () { try { a.run && a.run(); } catch (err) { console.warn(err); } });
  }

  function onKey(e) {
    if (!root) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
    var items = [].slice.call(root.querySelectorAll('.as-btn:not(:disabled)'));
    if (!items.length) return;
    var i = items.indexOf(D.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopImmediatePropagation(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); items[(i - 1 + items.length) % items.length].focus(); }
    else if (e.key === 'Tab') {
      e.preventDefault(); e.stopImmediatePropagation();
      items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
    }
  }

  /* ---------- konteks TRADE ---------- */
  function tradeOf(id) { try { return api() && api().find(id) || null; } catch (e) { return null; } }
  function money(v) { try { return W.Money.format(v || 0, { plus: true }); } catch (e) { return String(v || 0); } }
  function shortDate(d) { try { return new Date(d + 'T00:00:00').toLocaleDateString(L() === TXT.en ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return d || ''; } }
  function toneOf(j) { try { var s = api().status(j); return s === 'profit' ? 'pos' : s === 'loss' ? 'neg' : 'zero'; } catch (e) { return (j.pl || 0) > 0 ? 'pos' : (j.pl || 0) < 0 ? 'neg' : 'zero'; } }
  function chartsOf(j) { return ((j && j.charts) || []).filter(Boolean); }
  function detailOpen() { var p = D.querySelector('.jd-panel.on'); return !!p; }
  function closeDetail() { try { if (W.JournalUX) W.JournalUX.close(true); } catch (e) {} }

  function evaluate(id) {
    closeDetail();
    var p; try { p = api().edit(id); } catch (e) { return; }
    var go = function () { try { if (W.__jwSetMode) W.__jwSetMode('review'); } catch (e) {} };
    Promise.resolve(p).then(function () { setTimeout(go, 60); setTimeout(go, 320); });
  }
  function duplicate(id) {
    closeDetail();
    try { if (api().dup) api().dup(id); } catch (e) { console.warn(e); }
  }
  function zoomUrl(u) {
    if (!u) return;
    var im = D.createElement('img'); im.className = 'zoomable-chart'; im.alt = ''; im.src = u;
    im.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
    D.body.appendChild(im); im.click(); setTimeout(function () { if (im.parentNode) im.parentNode.removeChild(im); }, 0);
  }
  function pickChart(j) {
    var t = L(), cs = chartsOf(j);
    if (cs.length === 1) { zoomUrl(cs[0]); return; }
    open({
      title: t.chartT, sub: j.pair || '', plain: true,
      actions: cs.map(function (u, i) { return { label: t.chartN.replace('{n}', i + 1), icon: 'chart', hint: (i + 1) + '/' + cs.length, run: function () { zoomUrl(u); } }; })
    });
  }

  function confirmDelete(id) {
    var t = L(), j = tradeOf(id);
    var what = j ? [j.pair || t.noPair, shortDate(j.date), money(j.pl)].join(' \u00b7 ') : '';
    var undo = !!W.UR;
    open({
      confirm: true, title: t.delT,
      message: (what ? what + '. ' : '') + (undo ? t.delUndo : t.delNo),
      actions: [{ label: t.delGo, danger: true, run: function () { doDelete(id); } }]
    });
  }
  function doDelete(id) {
    closeDetail();
    var oc = W.confirm, p;
    W.confirm = function () { return true; };          // konfirmasi sudah diberikan lewat sheet; jangan tanya dua kali
    try { p = api().del(id); } catch (e) { console.warn(e); } finally { W.confirm = oc; }
    return p;
  }

  function tradeSheet(id, opt) {
    opt = opt || {};
    var t = L(), j = tradeOf(id); if (!j) return;
    var cs = chartsOf(j), row = opt.row || null;
    var canSelect = !!(row && row.querySelector('[data-jg-select]'));
    var acts = [];
    if (!opt.fromDetail) acts.push({ label: t.detail, icon: 'eye', run: function () { try { W.JournalUX && W.JournalUX.open(id); } catch (e) {} } });
    acts.push({ label: t.edit, icon: 'edit', run: function () { closeDetail(); try { api().edit(id); } catch (e) {} } });
    acts.push({ label: t.evalu, icon: 'evalu', run: function () { evaluate(id); } });
    acts.push({ label: t.chart, icon: 'chart', disabled: !cs.length, hint: cs.length ? String(cs.length) : t.none, run: function () { pickChart(j); } });
    acts.push({ label: t.dup, icon: 'dup', run: function () { duplicate(id); } });
    if (canSelect) acts.push({ label: t.select, icon: 'select', run: function () { try { row.querySelector('[data-jg-select]').click(); } catch (e) {} } });
    acts.push({ label: t.del, icon: 'trash', danger: true, keep: true, run: function () { confirmDelete(id); } });
    open({
      title: (j.pair || t.noPair) + (j.bias ? ' \u00b7 ' + j.bias : ''),
      sub: shortDate(j.date) + (j.dayCount > 1 ? ' \u00b7 ' + t.trade + ' ' + j.tradeNo : ''),
      pl: { text: money(j.pl), tone: toneOf(j) },
      actions: acts
    });
  }

  /* ---------- konteks CHART ---------- */
  function save(url) {
    fetch(url, { mode: 'cors' }).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (b) {
      var ext = (b.type || '').indexOf('png') > -1 ? '.png' : (b.type || '').indexOf('webp') > -1 ? '.webp' : '.jpg';
      var a = D.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'chart-' + new Date().toISOString().slice(0, 10) + ext;
      D.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    }).catch(function () { try { W.open(url, '_blank', 'noopener'); } catch (e) {} });   // host gambar tanpa CORS: buka agar bisa ditekan-tahan lalu disimpan
  }
  function copy(url) {
    var t = L();
    try { navigator.clipboard.writeText(url).then(function () { toast(t.copied); }, function () {}); } catch (e) {}
  }
  function chartSheet(url, opt) {
    opt = opt || {};
    if (!url) return;
    var t = L(), acts = [];
    if (opt.inViewer) {
      acts.push({ label: t.zin, icon: 'zin', run: function () { var b = $('zoom-in'); if (b) b.click(); } });
      acts.push({ label: t.reset, icon: 'reset', run: function () { var b = $('zoom-reset'); if (b) b.click(); } });
    } else {
      acts.push({ label: t.full, icon: 'zin', run: function () { zoomUrl(url); } });
    }
    acts.push({ label: t.tab, icon: 'ext', run: function () { try { W.open(url, '_blank', 'noopener'); } catch (e) {} } });
    acts.push({ label: t.save, icon: 'save', run: function () { save(url); } });
    if (navigator.share) acts.push({ label: t.share, icon: 'share', run: function () { try { navigator.share({ url: url }).catch(function () {}); } catch (e) {} } });
    acts.push({ label: t.copy, icon: 'link', run: function () { copy(url); } });
    open({ title: t.chartT, plain: true, actions: acts });
  }

  /* ---------- pemicu ---------- */
  var swallowUntil = 0, pressTimer = 0, pressRow = null, pressX = 0, pressY = 0, shownAt = 0;
  function selecting() { try { return !!(W.JournalGestures && W.JournalGestures.active()); } catch (e) { return false; } }
  function rowOf(n) { return n && n.closest ? n.closest('#journal-list .jr, .jr[data-jr-id]') : null; }
  function thumbOf(n) { var z = n && n.closest && n.closest('.zoomable-chart'); return z && !z.closest('#image-zoom-modal') && !z.closest('.as-root') ? z : null; }

  W.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest || t.closest('.as-root')) return;
    if (Date.now() < swallowUntil && (rowOf(t) || thumbOf(t))) { e.preventDefault(); e.stopImmediatePropagation(); return; }

    var more = t.closest('.jr-more'), r = more && rowOf(more);
    if (more && r && !selecting()) { e.preventDefault(); e.stopImmediatePropagation(); tradeSheet(r.getAttribute('data-jr-id'), { row: r }); return; }

    var dm = t.closest('.jd-more');
    if (dm) { e.preventDefault(); e.stopImmediatePropagation(); var cur = W.JournalUX && W.JournalUX.current && W.JournalUX.current(); if (cur) tradeSheet(cur, { fromDetail: true }); return; }

    var zm = t.closest('#zoom-more');
    if (zm) { e.preventDefault(); e.stopImmediatePropagation(); var im = $('zoom-image'); chartSheet(im && im.src, { inViewer: true }); return; }

    // hapus lama di baris / baki geser / panel detail → konfirmasi dulu
    var dl = t.closest('.jr [data-delete]');
    if (dl) { e.preventDefault(); e.stopImmediatePropagation(); try { if (W.JournalGestures && !selecting()) { /* baki tertutup sendiri saat render ulang */ } } catch (x) {} confirmDelete(dl.getAttribute('data-delete')); return; }
    var jd = t.closest('.jd-panel .jd-del');
    if (jd) { e.preventDefault(); e.stopImmediatePropagation(); var c2 = W.JournalUX && W.JournalUX.current && W.JournalUX.current(); if (c2) confirmDelete(c2); return; }
  }, true);

  function cancelPress() { clearTimeout(pressTimer); pressTimer = 0; if (pressRow) { pressRow.classList.remove('as-hold'); pressRow = null; } }
  W.addEventListener('pointerdown', function (e) {
    cancelPress();
    if ((e.pointerType !== 'touch' && e.pointerType !== 'pen') || (e.button != null && e.button > 0)) return;
    var t = e.target; if (!t || !t.closest || t.closest('.as-root') || selecting()) return;
    var th = thumbOf(t), r = th ? null : rowOf(t);
    if (!th && !r) return;
    if (r && t.closest('button, a, input, select, textarea, .jg-tray')) return;
    pressX = e.clientX; pressY = e.clientY;
    if (r) { pressRow = r; }
    pressTimer = setTimeout(function () {
      pressTimer = 0; buzz(10); swallowUntil = Date.now() + 900; shownAt = Date.now();
      if (th) { chartSheet(th.currentSrc || th.src, {}); }
      else if (r) { r.classList.add('as-hold'); tradeSheet(r.getAttribute('data-jr-id'), { row: r }); setTimeout(function () { r.classList.remove('as-hold'); }, 260); }
      pressRow = null;
    }, 480);
  }, { passive: true, capture: true });
  W.addEventListener('pointermove', function (e) {
    if (!pressTimer) return;
    if (Math.abs(e.clientX - pressX) > 8 || Math.abs(e.clientY - pressY) > 8) cancelPress();
  }, { passive: true, capture: true });
  ['pointerup', 'pointercancel', 'scroll'].forEach(function (ev) { W.addEventListener(ev, cancelPress, { passive: true, capture: true }); });

  // klik kanan (desktop) / menu konteks bawaan (sebagian Android)
  D.addEventListener('contextmenu', function (e) {
    var t = e.target; if (!t || !t.closest || t.closest('.as-root') || selecting()) return;
    if (Date.now() - shownAt < 900) { e.preventDefault(); return; }
    var th = thumbOf(t);
    if (th) { e.preventDefault(); shownAt = Date.now(); chartSheet(th.currentSrc || th.src, {}); return; }
    var r = rowOf(t); if (!r || t.closest('input, textarea, select')) return;
    e.preventDefault(); shownAt = Date.now(); tradeSheet(r.getAttribute('data-jr-id'), { row: r });
  });

  W.addEventListener('viewchange', function () { if (root) { teardown(); } });
  W.addEventListener('popstate', function () { if (root) close(); });

  /* ---------- tombol ⋯ ---------- */
  function mountZoomMore() {
    var stage = $('zoom-stage'); if (!stage || $('zoom-more')) return;
    var b = D.createElement('button'); b.type = 'button'; b.id = 'zoom-more'; b.setAttribute('aria-label', L().more); b.setAttribute('aria-haspopup', 'dialog'); b.innerHTML = DOTS;
    stage.appendChild(b);
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', mountZoomMore); else mountZoomMore();

  W.ActionSurface = { open: open, close: close, trade: tradeSheet, chart: chartSheet, dots: DOTS, version: '17.00' };
})();
