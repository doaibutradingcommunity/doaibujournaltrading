/* v16.91 · Gesture-Driven Journal List
   Daftar journal terasa natural dengan satu tangan, tanpa memenuhi layar dengan tombol.
     Geser kartu ke kiri  -> tindakan sekunder muncul (Edit · Pilih · Hapus)   [alternatif: tombol ⋯ di kartu]
     Ketuk kartu          -> buka detail (seperti sebelumnya)                   [alternatif: Enter / Spasi]
     Tahan kartu          -> mode pemilihan, lalu ketuk untuk menambah/mengurangi [alternatif: tombol "Pilih" di toolbar,
                                                                                  atau "Pilih" di tindakan geser, Ctrl/Cmd+klik di desktop]
   Setiap gestur punya tombol setara; tidak ada fungsi yang hanya bisa lewat gestur.
   Gestur hanya aktif untuk sentuhan/pena di layar <= 720px. Mouse dan desktop: perilaku lama + tombol "Pilih".
   Tidak menyentuh data. Hapus massal memakai UR (Undo & Recovery) lewat JournalAPI.delMany di index.html. */
(function () {
  'use strict';
  if (window.JournalGestures) return;
  window.__jrGest = true;          // gesture-ui.js: lepaskan geser-untuk-detail lama & tip lamanya

  var D = document;
  var OPEN = 192;                  // jarak geser penuh (3 tombol)
  var TRAY_W = OPEN + 16;          // lebar baki = jarak geser + padding kanan kartu
  var LP_MS = 480, SLOP = 8;

  var T = {
    id: { edit: 'Edit', sel: 'Pilih', del: 'Hapus', more: 'Tindakan lainnya', moreOf: 'Tindakan untuk', pick: 'Pilih', done: 'Selesai', all: 'Semua', none: 'Kosongkan',
      n: '{n} dipilih', bar: 'Tindakan pilihan', selMode: 'Pilih', selOff: 'Selesai pilih', deleted: '{n} trade dihapus', failed: 'Gagal menghapus: ',
      hint: 'Tip: geser kartu ke kiri untuk Edit/Hapus, tahan untuk memilih', hintX: 'Tutup tip', entered: 'Mode pilih aktif', left: 'Mode pilih ditutup' },
    en: { edit: 'Edit', sel: 'Select', del: 'Delete', more: 'More actions', moreOf: 'Actions for', pick: 'Select', done: 'Done', all: 'All', none: 'Clear',
      n: '{n} selected', bar: 'Selection actions', selMode: 'Select', selOff: 'Done selecting', deleted: '{n} trades deleted', failed: 'Could not delete: ',
      hint: 'Tip: swipe a card left for Edit/Delete, press and hold to select', hintX: 'Dismiss tip', entered: 'Selection mode on', left: 'Selection mode off' },
    ms: { edit: 'Edit', sel: 'Pilih', del: 'Padam', more: 'Tindakan lain', moreOf: 'Tindakan untuk', pick: 'Pilih', done: 'Selesai', all: 'Semua', none: 'Kosongkan',
      n: '{n} dipilih', bar: 'Tindakan pilihan', selMode: 'Pilih', selOff: 'Selesai pilih', deleted: '{n} dagangan dipadam', failed: 'Gagal memadam: ',
      hint: 'Petua: leret kad ke kiri untuk Edit/Padam, tekan lama untuk memilih', hintX: 'Tutup petua', entered: 'Mod pilih aktif', left: 'Mod pilih ditutup' },
    es: { edit: 'Editar', sel: 'Elegir', del: 'Eliminar', more: 'Más acciones', moreOf: 'Acciones para', pick: 'Elegir', done: 'Listo', all: 'Todos', none: 'Limpiar',
      n: '{n} seleccionados', bar: 'Acciones de selección', selMode: 'Elegir', selOff: 'Terminar selección', deleted: '{n} trades eliminados', failed: 'No se pudo eliminar: ',
      hint: 'Consejo: desliza la tarjeta a la izquierda para Editar/Eliminar, mantén pulsado para elegir', hintX: 'Cerrar consejo', entered: 'Modo selección activo', left: 'Modo selección cerrado' }
  };
  function L() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return T[l] || T.id; }
  function $(id) { return D.getElementById(id); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  var mq = window.matchMedia ? window.matchMedia('(max-width: 720px)') : { matches: false };
  function narrow() { return !!mq.matches; }
  function touchLike(e) { return e.pointerType === 'touch' || e.pointerType === 'pen'; }
  function haptic(k) { try { if (window.GestureUI && GestureUI.haptic) GestureUI.haptic(k); } catch (e) {} }
  function listEl() { return $('journal-list'); }
  function rowsAll() { var l = listEl(); return l ? [].slice.call(l.querySelectorAll('.jr')) : []; }
  function rowOf(t) { return t && t.closest ? t.closest('#journal-list .jr') : null; }

  var sel = Object.create(null), selCount = 0, selMode = false, openRow = null, bar = null, busy = false;
  var swallowUntil = 0, lastPtr = '';

  /* ---------- Sorotan visual seleksi + a11y ---------- */
  function rowLabel(r) { return r.getAttribute('data-jg-label') || r.getAttribute('aria-label') || ''; }
  function paintRow(r) {
    var on = !!sel[r.dataset.jrId];
    r.classList.toggle('jg-sel', selMode && on);
    if (selMode) {
      if (!r.hasAttribute('data-jg-label')) { r.setAttribute('data-jg-label', r.getAttribute('aria-label') || ''); r.setAttribute('data-jg-haspopup', r.getAttribute('aria-haspopup') || ''); }
      var orig = r.getAttribute('data-jg-label'), i = orig.indexOf(': ');
      r.setAttribute('aria-label', L().pick + (i >= 0 ? orig.slice(i) : ': ' + orig));
      r.setAttribute('aria-pressed', on ? 'true' : 'false'); r.removeAttribute('aria-haspopup');
    } else if (r.hasAttribute('data-jg-label')) {
      r.setAttribute('aria-label', r.getAttribute('data-jg-label')); r.removeAttribute('data-jg-label');
      var hp = r.getAttribute('data-jg-haspopup'); r.removeAttribute('data-jg-haspopup'); if (hp) r.setAttribute('aria-haspopup', hp);
      r.removeAttribute('aria-pressed');
    }
  }
  function applyAll() {
    D.body.classList.toggle('jg-select', selMode);
    var rows = rowsAll(); rows.forEach(paintRow);
    var tb = $('btn-select-mode'); if (tb) { tb.setAttribute('aria-pressed', selMode ? 'true' : 'false'); var s = tb.querySelector('span'); if (s) s.textContent = selMode ? L().selOff : L().selMode; }
    if (bar) {
      bar.hidden = !selMode;
      var t = L(), allOn = rows.length > 0 && rows.every(function (r) { return sel[r.dataset.jrId]; });
      bar.querySelector('.jg-count').textContent = t.n.replace('{n}', selCount);
      var a = bar.querySelector('.jg-all'); a.textContent = allOn ? t.none : t.all; a.setAttribute('data-mode', allOn ? 'none' : 'all');
      bar.querySelector('.jg-del').disabled = busy || !selCount;
    }
  }
  function prune() {   // setelah render ulang: buang pilihan yang tidak lagi tampil (jangan pernah menghapus yang tersembunyi)
    var vis = Object.create(null); rowsAll().forEach(function (r) { vis[r.dataset.jrId] = 1; });
    Object.keys(sel).forEach(function (k) { if (!vis[k]) { delete sel[k]; selCount--; } });
    if (selCount < 0) selCount = 0;
  }

  /* ---------- Mode pilih ---------- */
  function enterSelect(id) {
    closeOpen(true);
    if (!selMode) { selMode = true; announce(L().entered); }
    if (id && !sel[id]) { sel[id] = 1; selCount++; }
    applyAll();
  }
  function exitSelect() {
    if (!selMode) return;
    selMode = false; sel = Object.create(null); selCount = 0; busy = false;
    applyAll(); announce(L().left);
  }
  function toggle(id) {
    if (sel[id]) { delete sel[id]; selCount--; haptic('tick'); if (selCount === 0) { exitSelect(); return; } }
    else { sel[id] = 1; selCount++; haptic('tick'); }
    applyAll();
  }
  function announce(txt) { var c = bar && bar.querySelector('.jg-live'); if (c) { c.textContent = ''; setTimeout(function () { c.textContent = txt; }, 30); } }
  function selectAllToggle() {
    var rows = rowsAll(), allOn = rows.length && rows.every(function (r) { return sel[r.dataset.jrId]; });
    sel = Object.create(null); selCount = 0;
    if (!allOn) rows.forEach(function (r) { sel[r.dataset.jrId] = 1; selCount++; });
    applyAll();
  }
  async function deleteSelected() {
    if (busy || !selCount) return;
    var ids = Object.keys(sel), api = window.__jrApi;
    busy = true; applyAll();
    try {
      if (api && api.delMany) await api.delMany(ids);
      else if (api && api.del) { for (var i = 0; i < ids.length; i++) await api.del(ids[i]); }
    } catch (err) { console.error(err); }
    busy = false; exitSelect();
  }

  /* ---------- Baki tindakan (geser / tombol ⋯) ---------- */
  function setX(r, x) { r.style.setProperty('--jg-x', x + 'px'); r.style.setProperty('--jg-w', Math.max(0, -x) + 'px'); }
  function clearX(r) { r.style.removeProperty('--jg-x'); r.style.removeProperty('--jg-w'); }
  function moreBtn(r) { return r.querySelector('.jr-more'); }
  function openTray(r, focus) {
    if (openRow && openRow !== r) closeOpen(true);
    openRow = r; r.classList.add('jg-open', 'jg-snap'); r.classList.remove('jg-drag'); setX(r, -OPEN);
    var m = moreBtn(r); if (m) m.setAttribute('aria-expanded', 'true');
    setTimeout(function () { r.classList.remove('jg-snap'); }, 260);
    if (focus) { var f = r.querySelector('.jg-tray button'); if (f) f.focus({ preventScroll: true }); }
  }
  function closeRow(r, animate) {
    if (!r) return;
    var m = moreBtn(r); if (m) m.setAttribute('aria-expanded', 'false');
    r.classList.remove('jg-open', 'jg-drag');
    if (animate === false) { r.classList.remove('jg-snap'); clearX(r); return; }
    r.classList.add('jg-snap'); setX(r, 0);
    setTimeout(function () { r.classList.remove('jg-snap'); clearX(r); }, 260);
  }
  function closeOpen(quick) { var r = openRow; openRow = null; if (r) closeRow(r, quick ? false : true); }

  /* ---------- Gestur sentuh ---------- */
  var g = null, lpTimer = 0;
  function cancelLP() { clearTimeout(lpTimer); lpTimer = 0; }
  function down(e) {
    if (!narrow() || !touchLike(e) || g) return;
    lastPtr = e.pointerType;
    var r = rowOf(e.target); if (!r) { return; }
    if (e.target.closest('.jg-tray, .jr-act, a, button, input, select, textarea')) return;
    g = { id: e.pointerId, r: r, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: e.timeStamp, lock: '', lp: false,
          off: r.classList.contains('jg-open') ? -OPEN : 0 };
    if (!selMode) {
      lpTimer = setTimeout(function () {
        if (!g || g.lock) return;
        g.lp = true; haptic('commit'); enterSelect(g.r.dataset.jrId);
      }, LP_MS);
    }
  }
  function move(e) {
    if (!g || e.pointerId !== g.id || g.lp) return;
    g.x = e.clientX; g.y = e.clientY;
    var dx = g.x - g.x0, dy = g.y - g.y0, ax = Math.abs(dx), ay = Math.abs(dy);
    if (!g.lock && (ax > SLOP || ay > SLOP)) { cancelLP(); g.lock = ax > ay * 1.4 ? 'x' : 'y'; }
    if (g.lock === 'y') { g = null; return; }          // gulir vertikal: biarkan browser
    if (g.lock !== 'x' || selMode) return;
    var v = g.off + dx; if (v > 0) v = 0;
    if (v < -OPEN) v = -OPEN + (v + OPEN) * 0.35;       // karet di ujung
    v = Math.max(v, -OPEN - 30);
    if (openRow && openRow !== g.r) closeOpen(true);
    if (!g.r.classList.contains('jg-drag')) { g.r.classList.add('jg-drag'); g.r.classList.remove('jg-snap'); try { g.r.setPointerCapture(e.pointerId); } catch (x) {} }
    setX(g.r, v);
  }
  function up(e) {
    if (!g || e.pointerId !== g.id) return;
    cancelLP();
    var s = g; g = null;
    if (s.lp) { swallowUntil = Date.now() + 250; return; }         // tahan selesai: jangan ikut membuka detail
    if (s.lock !== 'x' || selMode) return;
    swallowUntil = Date.now() + 250;
    var dx = s.x - s.x0, vx = dx / Math.max(1, e.timeStamp - s.t0), fin = s.off + dx, open;
    if (e.type === 'pointercancel') open = s.off !== 0;
    else if (vx < -0.5 && dx < -30) open = true;
    else if (vx > 0.5 && dx > 30) open = false;
    else open = fin <= -OPEN * 0.45;
    if (open) { haptic('tick'); openTray(s.r, false); } else { if (openRow === s.r) openRow = null; closeRow(s.r, true); }
  }

  /* ---------- Klik / keyboard (satu jalur untuk gestur dan tombol) ---------- */
  D.addEventListener('click', function (e) {
    var t = e.target, r = rowOf(t);
    if (Date.now() < swallowUntil && (r || (t.closest && t.closest('#journal-list')))) { e.stopPropagation(); e.preventDefault(); return; }
    if (t.closest && t.closest('#btn-select-mode')) { e.preventDefault(); if (selMode) exitSelect(); else enterSelect(); return; }
    var tb = t.closest && t.closest('.jg-tray button');
    if (tb) {
      if (tb.hasAttribute('data-jg-select')) { e.preventDefault(); e.stopPropagation(); var id = r && r.dataset.jrId; haptic('commit'); enterSelect(id); return; }
      closeOpen(true); return;                                    // Edit/Hapus: tutup baki, biarkan handler aplikasi berjalan
    }
    var mb = t.closest && t.closest('.jr-more');
    if (mb && r) { e.preventDefault(); e.stopPropagation(); if (r.classList.contains('jg-open')) { closeOpen(false); } else { openTray(r, true); } return; }
    if (r && selMode) { e.preventDefault(); e.stopPropagation(); toggle(r.dataset.jrId); return; }
    if (r && !selMode && (e.ctrlKey || e.metaKey) && !narrow()) { e.preventDefault(); e.stopPropagation(); enterSelect(r.dataset.jrId); return; }
    if (openRow) {
      var wasRow = r; closeOpen(false);
      if (wasRow) { e.preventDefault(); e.stopPropagation(); }       // ketuk saat baki terbuka = tutup baki, bukan buka detail
    }
  }, true);
  D.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (openRow) { var m = moreBtn(openRow); closeOpen(false); if (m) m.focus({ preventScroll: true }); e.stopPropagation(); return; }
      if (selMode && !D.querySelector('.jd-panel.on')) { e.stopPropagation(); exitSelect(); return; }
    }
    if ((e.key === 'Enter' || e.key === ' ') && selMode) {
      var r = e.target && e.target.classList && e.target.classList.contains('jr') ? e.target : null;
      if (r) { e.preventDefault(); e.stopPropagation(); toggle(r.dataset.jrId); }
    }
  }, true);
  D.addEventListener('contextmenu', function (e) {                // tekan-tahan di Android memunculkan menu konteks
    if (narrow() && (lastPtr === 'touch' || lastPtr === 'pen') && rowOf(e.target)) e.preventDefault();
  });
  var lastY = window.scrollY || 0;
  window.addEventListener('scroll', function () { if (openRow && Math.abs((window.scrollY || 0) - lastY) > 14) closeOpen(false); lastY = window.scrollY || 0; }, { passive: true });

  /* ---------- Pelabelan + penanda per kartu ---------- */
  function localize() {
    var t = L();
    rowsAll().forEach(function (r) {
      [].forEach.call(r.querySelectorAll('.jg-tray [data-jg]'), function (b) { var k = b.getAttribute('data-jg'), s = b.querySelector('.jg-l'); if (s) s.textContent = t[k]; });
      var m = moreBtn(r); if (m) { m.setAttribute('aria-label', t.more); m.title = t.more; }
    });
    if (bar) {
      bar.setAttribute('aria-label', t.bar);
      bar.querySelector('.jg-done .jg-bl').textContent = t.done;
      bar.querySelector('.jg-del .jg-bl').textContent = t.del;
    }
    var h = $('jg-hint'); if (h) { h.querySelector('.jg-hint-t').textContent = t.hint; h.querySelector('.jg-hint-x').setAttribute('aria-label', t.hintX); }
    applyAll();
  }
  function showHint() {
    if (!narrow() || store('jg_hint') === '1' || $('jg-hint')) return;
    var list = listEl(); if (!list || !list.querySelector('.jr') || list.offsetParent === null) return;
    var old = $('gu-hint'); if (old) old.remove();
    var h = D.createElement('div'); h.id = 'jg-hint'; h.className = 'jg-hint'; h.setAttribute('role', 'note');
    h.innerHTML = '<span aria-hidden="true">←</span><span class="jg-hint-t"></span><button type="button" class="jg-hint-x">&times;</button>';
    h.querySelector('.jg-hint-x').addEventListener('click', function () { store('jg_hint', '1'); h.remove(); });
    list.parentNode.insertBefore(h, list); localize();
  }
  function afterRender() {
    if (openRow && !D.contains(openRow)) openRow = null;
    prune();
    if (selMode && !rowsAll().length) { exitSelect(); return; }
    localize(); showHint();
  }

  /* ---------- Bilah aksi pilihan ---------- */
  function buildBar() {
    bar = D.createElement('div'); bar.id = 'jg-bar'; bar.className = 'jg-bar'; bar.hidden = true; bar.setAttribute('role', 'toolbar');
    bar.innerHTML =
      '<button type="button" class="jg-done"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg><span class="jg-bl"></span></button>' +
      '<span class="jg-count" aria-hidden="false"></span><span class="jg-live jg-sr" role="status" aria-live="polite"></span>' +
      '<button type="button" class="jg-all" data-mode="all"></button>' +
      '<button type="button" class="jg-del"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 7l-.87 12.14A2 2 0 0 1 16.14 21H7.86a2 2 0 0 1-1.99-1.86L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"/></svg><span class="jg-bl"></span></button>';
    D.body.appendChild(bar);
    bar.querySelector('.jg-done').addEventListener('click', exitSelect);
    bar.querySelector('.jg-all').addEventListener('click', selectAllToggle);
    bar.querySelector('.jg-del').addEventListener('click', deleteSelected);
  }

  /* ---------- Init ---------- */
  function init() {
    buildBar();
    D.addEventListener('pointerdown', down, { passive: true });
    D.addEventListener('pointermove', move, { passive: true });
    ['pointerup', 'pointercancel'].forEach(function (ev) { D.addEventListener(ev, up, { passive: true }); });
    var list = listEl();
    if (list) try { new MutationObserver(function () { afterRender(); }).observe(list, { childList: true }); } catch (e) {}
    window.addEventListener('viewchange', function () { var l = listEl(); if (selMode && (!l || l.offsetParent === null)) exitSelect(); closeOpen(true); setTimeout(showHint, 200); });
    window.addEventListener('storage', function (e) { if (e.key === 'journalLanguage') localize(); });
    try { new MutationObserver(localize).observe(D.documentElement, { attributes: true, attributeFilter: ['lang'] }); } catch (e) {}
    if (mq.addEventListener) mq.addEventListener('change', function () { closeOpen(true); });
    afterRender();
  }
  window.JournalGestures = {
    enter: enterSelect, exit: exitSelect, selected: function () { return Object.keys(sel); }, active: function () { return selMode; },
    msg: function (k, n) { return (L()[k] || '').replace('{n}', n); }, version: '16.91'
  };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();
