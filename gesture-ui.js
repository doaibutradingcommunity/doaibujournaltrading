/* v16.47 · Gesture-Driven Mobile UI
   Gestur sentuh yang melengkapi (tidak menggantikan) kontrol yang sudah ada. Setiap gestur punya tombol/ketukan setara:
   1) Geser kartu journal ke kiri  -> buka detail           (alternatif: ketuk kartu / Enter)
   2) Detail trade (bottom sheet): tarik ke bawah -> tutup   (alternatif: tombol ×)
                                    geser kiri/kanan -> trade berikutnya/sebelumnya (alternatif: tombol ‹ ›)
   3) Ringkasan statistik: tarik handle ke bawah/atas -> perluas/ringkas (alternatif: tombol "Lihat … lainnya")
   4) Tombol tambah trade: sisi kanan (bawaan) / kiri bisa dipilih (jangkauan ibu jari) di Pengaturan
   5) Haptic opsional (navigator.vibrate) — hanya bila perangkat mendukung, bisa dimatikan di Pengaturan,
      mati otomatis bila "kurangi gerakan" aktif.
   Hanya aktif pada sentuhan/pena di layar <= 640px. Mouse & desktop tidak berubah. Tidak menyentuh data/Firestore. */
(function () {
  'use strict';
  var D = document;
  var T = {
    id: { hint: 'Tip: geser kartu ke kiri untuk melihat detail', hintX: 'Tutup tip', swipe: 'Detail', secT: 'Gestur & sentuhan', hapT: 'Getaran haptic',
      hapD: 'Getaran singkat saat gestur berhasil. Hanya jalan di perangkat yang mendukung.', fabT: 'Posisi tombol tambah', fabD: 'Pilih sisi yang paling mudah dijangkau ibu jari.',
      left: 'Kiri', right: 'Kanan', on: 'Aktif', off: 'Mati', grab: 'Tarik untuk memperluas atau meringkas' },
    en: { hint: 'Tip: swipe a card left to see its details', hintX: 'Dismiss tip', swipe: 'Details', secT: 'Gestures & touch', hapT: 'Haptic feedback',
      hapD: 'A short buzz when a gesture succeeds. Works only on supported devices.', fabT: 'Add-trade button position', fabD: 'Pick the side your thumb reaches most easily.',
      left: 'Left', right: 'Right', on: 'On', off: 'Off', grab: 'Drag to expand or collapse' },
    ms: { hint: 'Petua: leret kad ke kiri untuk melihat butiran', hintX: 'Tutup petua', swipe: 'Butiran', secT: 'Gerak isyarat & sentuhan', hapT: 'Getaran haptik',
      hapD: 'Getaran ringkas apabila gerak isyarat berjaya. Hanya pada peranti yang menyokong.', fabT: 'Kedudukan butang tambah', fabD: 'Pilih sisi yang paling mudah dicapai ibu jari.',
      left: 'Kiri', right: 'Kanan', on: 'Hidup', off: 'Mati', grab: 'Tarik untuk kembangkan atau ringkaskan' },
    es: { hint: 'Consejo: desliza la tarjeta a la izquierda para ver el detalle', hintX: 'Cerrar consejo', swipe: 'Detalle', secT: 'Gestos y tacto', hapT: 'Vibración háptica',
      hapD: 'Una vibración breve cuando un gesto se completa. Solo en dispositivos compatibles.', fabT: 'Posición del botón añadir', fabD: 'Elige el lado que alcanza mejor tu pulgar.',
      left: 'Izquierda', right: 'Derecha', on: 'Sí', off: 'No', grab: 'Arrastra para expandir o contraer' }
  };
  function L() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return T[l] || T.id; }
  function $(id) { return D.getElementById(id); }
  var mq = window.matchMedia ? window.matchMedia('(max-width: 640px)') : { matches: false };
  var rmq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function mobile() { return !!mq.matches; }
  function touchLike(e) { return e.pointerType === 'touch' || e.pointerType === 'pen'; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }

  /* ---------- Preferensi ---------- */
  var prefs = { haptic: store('gu_haptic') !== '0', fab: store('gu_fab') === 'left' ? 'left' : 'right' };   // bawaan aplikasi: kanan
  var canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  function haptic(kind) {
    if (!prefs.haptic || !canVibrate || rmq.matches || D.visibilityState === 'hidden') return;
    var p = kind === 'commit' ? 18 : kind === 'warn' ? [12, 40, 12] : 8;
    try { navigator.vibrate(p); } catch (e) {}
  }

  function applyPrefs() {
    D.body.classList.toggle('gu-fab-left', prefs.fab === 'left');
  }

  /* ---------- Util: pelacak gestur satu-jari ---------- */
  function track(e) { return { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: e.timeStamp, lock: '', passed: false }; }
  function lockAxis(g, e) {
    g.x = e.clientX; g.y = e.clientY;
    var dx = g.x - g.x0, dy = g.y - g.y0;
    if (!g.lock && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) g.lock = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'x' : 'y';
    return { dx: dx, dy: dy };
  }
  var swallowUntil = 0;
  D.addEventListener('click', function (e) {
    if (Date.now() < swallowUntil) { e.stopPropagation(); e.preventDefault(); }
  }, true);
  function swallowClick() { swallowUntil = Date.now() + 380; }
  function fire(el) { var s = swallowUntil; swallowUntil = 0; try { el.click(); } finally { swallowUntil = s; } }   // klik programatik tidak boleh ikut ditelan

  /* ===================== 1. Geser kartu journal ===================== */
  var rowG = null, rowEl = null;
  var ROW_COMMIT = 84, ROW_MAX = 132;

  function rowDown(e) {
    if (!mobile() || !touchLike(e) || rowG || window.__jrGest) return;   // v16.91: journal-gestures.js memegang geser kartu (tindakan sekunder)
    var row = e.target.closest && e.target.closest('#journal-list .jr');
    if (!row || e.target.closest('.jr-act, a, button, input, select, textarea')) return;
    rowG = track(e); rowEl = row;
  }
  function rowMove(e) {
    if (!rowG || e.pointerId !== rowG.id) return;
    var d = lockAxis(rowG, e);
    if (rowG.lock === 'y') { rowReset(false); rowG = null; return; }
    if (rowG.lock !== 'x') return;
    var dx = Math.min(0, d.dx);                       // hanya ke kiri
    var eased = -Math.min(ROW_MAX, Math.pow(-dx, 0.92));
    var p = Math.min(1, -eased / ROW_COMMIT);
    if (!rowEl.classList.contains('gu-drag')) { rowEl.classList.add('gu-drag'); rowEl.setAttribute('data-gu-label', L().swipe + ' ›'); try { rowEl.setPointerCapture(e.pointerId); } catch (x) {} }
    rowEl.style.setProperty('--gu-x', eased + 'px');
    rowEl.style.setProperty('--gu-p', p.toFixed(2));
    if (p >= 1 && !rowG.passed) { rowG.passed = true; haptic('tick'); rowEl.classList.add('gu-ready'); }
    else if (p < 1 && rowG.passed) { rowG.passed = false; rowEl.classList.remove('gu-ready'); }
  }
  function rowReset(animate) {
    if (!rowEl) return;
    var el = rowEl; rowEl = null;
    el.classList.remove('gu-ready');
    if (animate) { el.classList.add('gu-snap'); el.style.setProperty('--gu-x', '0px'); setTimeout(function () { el.classList.remove('gu-snap', 'gu-drag'); el.style.removeProperty('--gu-p'); el.style.removeProperty('--gu-x'); }, 260); }
    else { el.classList.remove('gu-drag', 'gu-snap'); el.style.removeProperty('--gu-x'); el.style.removeProperty('--gu-p'); }
  }
  function rowUp(e) {
    if (!rowG || e.pointerId !== rowG.id) return;
    var g = rowG, el = rowEl; rowG = null;
    if (g.lock !== 'x' || !el) { rowReset(false); return; }
    swallowClick();
    var dx = g.x - g.x0, fast = (g.x0 - g.x) / Math.max(1, e.timeStamp - g.t0) > 0.6 && -dx > 40;
    var id = el.dataset.jrId;
    rowReset(true);
    if ((-dx >= ROW_COMMIT || fast) && e.type !== 'pointercancel' && window.JournalUX) {
      haptic('commit');
      setTimeout(function () { try { window.JournalUX.open(id); } catch (x) {} }, 60);
    }
  }

  /* ===================== 2. Detail trade: tarik tutup + geser antar trade ===================== */
  var dG = null, dPanel = null, dMode = '';
  function detailDown(e) {
    if (!mobile() || !touchLike(e) || dG) return;
    var p = e.target.closest && e.target.closest('.jd-panel.on'); if (!p) return;
    if (e.target.closest('button, a, input, select, textarea, canvas')) return;
    var head = e.target.closest('.jd-head') || (e.clientY - p.getBoundingClientRect().top < 28);   // area atas + handle
    if (head && window.__nsDrag) return;   // v16.87: tarik-tutup vertikal dipegang native-sheet.js (swipe antar trade di isi tetap di sini)
    var body = e.target.closest('.jd-body');
    if (!head && !body) return;
    dG = track(e); dPanel = p; dMode = head ? 'head' : 'body';
    dG.bodyTop = body ? body.scrollTop : 0;
  }
  function detailMove(e) {
    if (!dG || e.pointerId !== dG.id) return;
    var d = lockAxis(dG, e);
    if (dMode === 'head' && dG.lock === 'y' && d.dy > 0) {
      if (!dPanel.classList.contains('gu-dragging')) { dPanel.classList.add('gu-dragging'); try { dPanel.setPointerCapture(e.pointerId); } catch (x) {} }
      dPanel.style.transform = 'translate3d(0,' + d.dy + 'px,0)';
      if (d.dy > 110 && !dG.passed) { dG.passed = true; haptic('tick'); } else if (d.dy <= 110) dG.passed = false;
    } else if (dMode === 'body' && dG.lock === 'x') {
      if (!dPanel.classList.contains('gu-swiping')) { dPanel.classList.add('gu-swiping'); try { dPanel.setPointerCapture(e.pointerId); } catch (x) {} }
      var b = dPanel.querySelector('.jd-body'); if (b) b.style.transform = 'translate3d(' + (d.dx * 0.35) + 'px,0,0)';
      if (Math.abs(d.dx) > 70 && !dG.passed) { dG.passed = true; haptic('tick'); } else if (Math.abs(d.dx) <= 70) dG.passed = false;
    }
  }
  function detailUp(e) {
    if (!dG || e.pointerId !== dG.id) return;
    var g = dG, p = dPanel, mode = dMode; dG = null; dPanel = null;
    var dx = g.x - g.x0, dy = g.y - g.y0, cancel = e.type === 'pointercancel';
    var b = p.querySelector('.jd-body');
    var wasDrag = p.classList.contains('gu-dragging'), wasSwipe = p.classList.contains('gu-swiping');
    p.classList.remove('gu-dragging', 'gu-swiping');
    if (b) b.style.transform = '';
    if (wasDrag || wasSwipe) swallowClick();
    if (wasDrag) {
      var fast = dy / Math.max(1, e.timeStamp - g.t0) > 0.7 && dy > 50;
      if (!cancel && (dy > 110 || fast)) {
        haptic('commit');
        var x = p.querySelector('.jd-x'); if (x) fire(x);
        setTimeout(function () { p.style.transform = ''; }, 320);
      } else { p.style.transform = ''; }
    } else if (wasSwipe && !cancel && mode === 'body' && Math.abs(dx) > 70) {
      var nav = p.querySelector('[data-nav="' + (dx < 0 ? 1 : -1) + '"]:not(:disabled)');
      if (nav) { haptic('commit'); fire(nav); } else haptic('warn');   // ujung daftar
    }
  }

  /* ===================== 3. Handle ringkasan statistik ===================== */
  var hG = null, hBtn = null;
  function handleDown(e) {
    if (!mobile() || !touchLike(e) || hG) return;
    var b = e.target.closest && e.target.closest('.mf-kpi-more'); if (!b) return;
    hG = track(e); hBtn = b;
  }
  function handleMove(e) {
    if (!hG || e.pointerId !== hG.id) return;
    lockAxis(hG, e);
    if (hG.lock === 'y' && !hBtn.classList.contains('gu-pulling')) { hBtn.classList.add('gu-pulling'); try { hBtn.setPointerCapture(e.pointerId); } catch (x) {} }
  }
  function handleUp(e) {
    if (!hG || e.pointerId !== hG.id) return;
    var g = hG, b = hBtn; hG = null; hBtn = null;
    var dy = g.y - g.y0, was = b.classList.contains('gu-pulling');
    b.classList.remove('gu-pulling');
    if (!was) return;
    swallowClick();
    if (e.type === 'pointercancel') return;
    var grid = b.previousElementSibling, open = grid && grid.classList.contains('mf-open');
    if ((dy > 36 && !open) || (dy < -36 && open)) { haptic('commit'); fire(b); }
  }

  /* ===================== Tip sekali tampil ===================== */
  function showHint() {
    if (!mobile() || store('gu_hint') === '1' || window.__jrGest) return;
    var list = $('journal-list'); if (!list || !list.querySelector('.jr') || $('gu-hint')) return;
    if (list.offsetParent === null) return;
    var t = L(), h = D.createElement('div'); h.id = 'gu-hint'; h.className = 'gu-hint'; h.setAttribute('role', 'note');
    h.innerHTML = '<span aria-hidden="true">←</span><span class="gu-hint-t"></span><button type="button" class="gu-hint-x"></button>';
    h.querySelector('.gu-hint-t').textContent = t.hint;
    var x = h.querySelector('.gu-hint-x'); x.innerHTML = '&times;'; x.setAttribute('aria-label', t.hintX);
    x.addEventListener('click', function () { store('gu_hint', '1'); h.remove(); });
    list.parentNode.insertBefore(h, list);
  }

  /* ===================== Pengaturan: haptic + posisi tombol tambah ===================== */
  function seg(name, opts, cur) {
    return '<div class="gu-seg" role="group" data-gu="' + name + '">' + opts.map(function (o) {
      return '<button type="button" data-v="' + o.v + '" aria-pressed="' + (o.v === cur) + '">' + o.l + '</button>';
    }).join('') + '</div>';
  }
  function settingsCard() {
    var sec = $('settings-section'); if (!sec) return false;
    var t = L(), card = $('gu-settings');
    var hapRow = canVibrate
      ? '<div class="gu-row"><div><b>' + t.hapT + '</b><small>' + t.hapD + '</small></div>' + seg('haptic', [{ v: '1', l: t.on }, { v: '0', l: t.off }], prefs.haptic ? '1' : '0') + '</div>'
      : '';
    var html = '<div class="gu-set-h">' + t.secT + '</div>' + hapRow +
      '<div class="gu-row"><div><b>' + t.fabT + '</b><small>' + t.fabD + '</small></div>' + seg('fab', [{ v: 'right', l: t.right }, { v: 'left', l: t.left }], prefs.fab) + '</div>';
    if (!card) {
      var host = $('px-textsize') || sec.querySelector('.lg-setting');
      host = host && (host.closest('.ms-sub') || host); if (!host || !host.parentNode) return false;
      card = D.createElement('div'); card.id = 'gu-settings'; card.className = 'ms-sub gu-settings';
      host.parentNode.insertBefore(card, host.nextSibling);
      card.addEventListener('click', function (e) {
        var b = e.target.closest('.gu-seg button'); if (!b) return;
        var k = b.parentNode.getAttribute('data-gu'), v = b.getAttribute('data-v');
        if (k === 'haptic') { prefs.haptic = v === '1'; store('gu_haptic', v); if (prefs.haptic) haptic('commit'); }
        else if (k === 'fab') { prefs.fab = v; store('gu_fab', v); applyPrefs(); haptic('tick'); }
        settingsCard();
      });
    }
    card.innerHTML = html;
    return true;
  }

  /* ===================== Haptic untuk kontrol yang sudah ada ===================== */
  D.addEventListener('click', function (e) {
    if (!mobile() || !e.target.closest) return;
    if (e.target.closest('#btn-new-journal-fab, #btn-filter-toggle, .mf-fs-apply, .jd-nav button, .ts-nb')) haptic('tick');
  }, true);

  /* ===================== Init ===================== */
  function bind() {
    D.addEventListener('pointerdown', function (e) { rowDown(e); detailDown(e); handleDown(e); }, { passive: true });
    D.addEventListener('pointermove', function (e) { rowMove(e); detailMove(e); handleMove(e); }, { passive: true });
    ['pointerup', 'pointercancel'].forEach(function (ev) { D.addEventListener(ev, function (e) { rowUp(e); detailUp(e); handleUp(e); }, { passive: true }); });
  }
  function init() {
    applyPrefs(); bind();
    var tries = 0, iv = setInterval(function () { if (settingsCard() || ++tries > 30) clearInterval(iv); }, 500);
    var list = $('journal-list');
    if (list) try { new MutationObserver(function () { setTimeout(showHint, 120); }).observe(list, { childList: true }); } catch (e) {}
    window.addEventListener('viewchange', function () { settingsCard(); setTimeout(showHint, 200); });
    window.addEventListener('storage', function (e) { if (e.key === 'journalLanguage') { settingsCard(); var h = $('gu-hint'); if (h) { h.remove(); showHint(); } } });
    try { new MutationObserver(function () { settingsCard(); }).observe(D.documentElement, { attributes: true, attributeFilter: ['lang'] }); } catch (e) {}
    // label handle ikut bahasa
    D.body.style.setProperty('--gu-grab', '"' + L().grab.replace(/"/g, '') + '"');
    setTimeout(showHint, 600);
  }
  window.GestureUI = { haptic: haptic, prefs: prefs, supported: canVibrate };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();
