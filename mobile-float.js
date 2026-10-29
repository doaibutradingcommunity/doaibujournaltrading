/* v16.44 · Mobile-First Floating UI
   1) Tombol tambah trade: menyingkir saat menggulir turun, kembali saat menggulir naik / diam sejenak
   2) Filter & Sort: panel #filter-panel dipakai ulang sebagai bottom sheet di HP (<= 640px)
   3) Kartu statistik: ringkas (4 kartu pertama) + dapat diperluas; ketuk kartu untuk detail
   Tidak mengubah logika filter, statistik, atau data. Bergantung pada window.__jrApi (v16.43) bila ada. */
(function () {
  'use strict';
  var T = {
    id: { title: 'Filter & Sort', reset: 'Reset', show: function (n) { return n == null ? 'Lihat hasil' : 'Lihat ' + n + ' journal'; }, close: 'Tutup', more: function (n) { return 'Lihat ' + n + ' lainnya'; }, less: 'Ringkas', tap: 'Ketuk untuk detail' },
    en: { title: 'Filter & Sort', reset: 'Reset', show: function (n) { return n == null ? 'Show results' : 'Show ' + n + (n === 1 ? ' journal' : ' journals'); }, close: 'Close', more: function (n) { return 'Show ' + n + ' more'; }, less: 'Show less', tap: 'Tap for details' },
    ms: { title: 'Tapis & Susun', reset: 'Set semula', show: function (n) { return n == null ? 'Lihat hasil' : 'Lihat ' + n + ' jurnal'; }, close: 'Tutup', more: function (n) { return 'Lihat ' + n + ' lagi'; }, less: 'Ringkaskan', tap: 'Ketik untuk butiran' },
    es: { title: 'Filtrar y ordenar', reset: 'Restablecer', show: function (n) { return n == null ? 'Ver resultados' : 'Ver ' + n + (n === 1 ? ' diario' : ' diarios'); }, close: 'Cerrar', more: function (n) { return 'Ver ' + n + ' más'; }, less: 'Ver menos', tap: 'Toca para ver detalles' }
  };
  function L() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return T[l] || T.id; }
  function $(id) { return document.getElementById(id); }
  var mq = window.matchMedia ? window.matchMedia('(max-width: 640px)') : { matches: false };
  function mobile() { return !!mq.matches; }

  /* ===================== 1. Tombol tambah trade ===================== */
  var fab = null, lastY = 0, ticking = false, idleT = 0;
  function fabScroll() {
    ticking = false;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0, d = y - lastY;
    var max = (document.documentElement.scrollHeight || 0) - window.innerHeight;
    var cl = document.body.classList;
    if (!mobile() || y < 160 || (max > 0 && y >= max - 24)) cl.remove('mf-fab-hide');
    else if (d > 8) cl.add('mf-fab-hide');
    else if (d < -8) cl.remove('mf-fab-hide');
    if (Math.abs(d) > 2) lastY = y;
    clearTimeout(idleT);
    idleT = setTimeout(function () { document.body.classList.remove('mf-fab-hide'); }, 1400);
  }
  function initFab() {
    fab = $('btn-new-journal-fab'); if (!fab) return;
    if (!fab.getAttribute('aria-label')) fab.setAttribute('aria-label', fab.getAttribute('title') || 'Journal Baru');
    lastY = window.pageYOffset || 0;
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(fabScroll); } }, { passive: true });
  }

  /* ===================== 2. Filter sebagai bottom sheet ===================== */
  var panelHome = null, panel = null, scrim = null, head = null, foot = null, applyBtn = null, toggleBtn = null, badge = null, built = false, wasOpen = false;

  function build() {
    panel = $('filter-panel'); if (!panel || built) return;
    built = true;
    // Placeholder agar panel bisa kembali ke tempat semula di desktop
    panelHome = document.createComment('mf-filter-home'); panel.parentNode.insertBefore(panelHome, panel);
    toggleBtn = $('btn-filter-toggle');
    var t = L();
    var body = document.createElement('div'); body.className = 'mf-fs-body';
    while (panel.firstChild) body.appendChild(panel.firstChild);

    head = document.createElement('div'); head.className = 'mf-fs-head';
    head.innerHTML = '<div class="mf-fs-grab" aria-hidden="true"></div><div class="mf-fs-title"><h3 id="mf-fs-h"></h3><button type="button" class="mf-fs-x"></button></div>';
    foot = document.createElement('div'); foot.className = 'mf-fs-foot';
    foot.innerHTML = '<button type="button" class="mf-fs-reset"></button><button type="button" class="mf-fs-apply"></button>';
    applyBtn = foot.querySelector('.mf-fs-apply');
    panel.appendChild(head); panel.appendChild(body); panel.appendChild(foot);
    panel.setAttribute('role', 'dialog'); panel.setAttribute('tabindex', '-1'); panel.setAttribute('aria-labelledby', 'mf-fs-h');

    scrim = document.createElement('div'); scrim.className = 'mf-scrim'; scrim.setAttribute('aria-hidden', 'true');
    document.body.appendChild(scrim);

    if (toggleBtn) { badge = document.createElement('span'); badge.className = 'mf-fbadge'; badge.setAttribute('aria-hidden', 'true'); toggleBtn.appendChild(badge); }

    scrim.addEventListener('click', closeSheet);
    head.querySelector('.mf-fs-x').addEventListener('click', closeSheet);
    applyBtn.addEventListener('click', closeSheet);
    foot.querySelector('.mf-fs-reset').addEventListener('click', function () {
      try { window.__jrApi && window.__jrApi.reset(); } catch (e) {}
      setTimeout(refresh, 30);
    });
    panel.addEventListener('change', function () { setTimeout(refresh, 0); });
    panel.addEventListener('keydown', trapTab);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { e.preventDefault(); closeSheet(); } });
    dragToClose();

    var cnt = $('journal-count');
    if (cnt) try { new MutationObserver(function () { setTimeout(refresh, 0); }).observe(cnt, { childList: true, characterData: true, subtree: true }); } catch (e) {}
    try { new MutationObserver(syncSheet).observe(panel, { attributes: true, attributeFilter: ['class'] }); } catch (e) {}
    placePanel(); labels();
  }

  /* position:fixed di dalam seksi beranimasi (.enter) terikat ke seksi itu, bukan layar.
     Di HP panel dipindah ke <body>; di desktop dikembalikan ke posisi semula. */
  function placePanel() {
    if (!panel || !panelHome || !panelHome.parentNode) return;
    if (mobile()) { if (panel.parentNode !== document.body) document.body.appendChild(panel); }
    else if (panel.parentNode === document.body) panelHome.parentNode.insertBefore(panel, panelHome.nextSibling);
  }

  function labels() {
    if (!built) return;
    var t = L();
    head.querySelector('#mf-fs-h').textContent = t.title;
    var x = head.querySelector('.mf-fs-x'); x.innerHTML = '&times;'; x.setAttribute('aria-label', t.close);
    foot.querySelector('.mf-fs-reset').textContent = t.reset;
    refresh();
  }

  function isOpen() { return !!panel && mobile() && !panel.classList.contains('hidden'); }

  function activeCount() {
    try {
      var f = window.__jrApi.filters(), n = 0;
      ['start', 'end', 'pair', 'session', 'tag', 'bias'].forEach(function (k) { if (f[k]) n++; });
      if (f.sort && f.sort !== 'date-desc') n++;
      return n;
    } catch (e) { return 0; }
  }
  function resultCount() { try { return window.__jrApi.list().length; } catch (e) { return null; } }

  function refresh() {
    if (!built) return;
    var t = L();
    applyBtn.textContent = t.show(resultCount());
    var n = activeCount();
    if (badge) { badge.textContent = n ? String(n) : ''; badge.classList.toggle('on', n > 0); }
  }

  function syncSheet() {
    var open = isOpen();
    document.body.classList.toggle('mf-sheet-open', open);
    if (open && !wasOpen) {
      refresh();
      setTimeout(function () { if (isOpen()) panel.focus({ preventScroll: true }); }, 60);
    }
    if (!open && wasOpen && panel) panel.style.transform = '';
    wasOpen = open;
  }

  function closeSheet() {
    if (!panel) return;
    var hide = function () { panel.classList.add('hidden'); panel.style.transform = ''; };
    if (!(window.NativeSheet && window.NativeSheet.exit && window.NativeSheet.exit(panel, hide))) hide();   // v16.87: animasi keluar, lalu sembunyikan
    if (toggleBtn && mobile()) try { toggleBtn.focus({ preventScroll: true }); } catch (e) {}
  }

  function trapTab(e) {
    if (e.key !== 'Tab' || !isOpen()) return;
    var f = [].filter.call(panel.querySelectorAll('button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])'), function (n) { return n.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function dragToClose() {
    var y0 = null, dy = 0;
    head.addEventListener('pointerdown', function (e) {
      if (window.__nsDrag) return;   // v16.87: tarik-tutup dipegang native-sheet.js
      if (e.target.closest('.mf-fs-x')) return;
      y0 = e.clientY; dy = 0; panel.style.transition = 'none';
      try { head.setPointerCapture(e.pointerId); } catch (x) {}
    });
    head.addEventListener('pointermove', function (e) {
      if (y0 === null) return;
      dy = Math.max(0, e.clientY - y0); panel.style.transform = 'translateY(' + dy + 'px)';
    });
    function end() {
      if (y0 === null) return;
      panel.style.transition = '';
      if (dy > 90) closeSheet(); else panel.style.transform = '';
      y0 = null; dy = 0;
    }
    head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
  }

  /* ===================== 3. Kartu statistik ringkas ===================== */
  var SECS = ['dashboard-section', 'statistik-section'];
  var SHOW = 4, openGrp = {}, openCard = {}, enhT = 0;

  function cardKey(card, sec) { var l = card.querySelector('.l'); return sec + '|' + (l ? l.textContent.trim() : ''); }
  function setCard(card, on) {
    card.classList.toggle('mf-open', on);
    if (card.getAttribute('role') === 'button') card.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  function moreLabel(btn, grid, extra) {
    var t = L(), open = grid.classList.contains('mf-open');
    btn.textContent = open ? t.less : t.more(extra);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function enhance() {
    var m = mobile();
    SECS.forEach(function (sid) {
      var sec = $(sid); if (!sec) return;
      var grids = sec.querySelectorAll('.v5-kpis, .v5-stats');
      [].forEach.call(grids, function (grid, gi) {
        var cards = [].filter.call(grid.children, function (c) { return c.classList && c.classList.contains('v5-kpi'); });
        var gkey = sid + '#' + gi;
        var groupable = grid.classList.contains('v5-kpis') && cards.length > SHOW;

        cards.forEach(function (c, i) {
          var s = c.querySelector('.s'), has = !!(s && s.textContent.trim());
          if (!c.dataset.mf) {
            c.dataset.mf = '1';
            if (has) { c.classList.add('mf-x'); if (openCard[cardKey(c, sid)]) c.classList.add('mf-open'); }
            if (groupable && i >= SHOW) c.classList.add('mf-kpi-extra');
          }
          if (c.classList.contains('mf-x')) {
            if (m) { c.setAttribute('role', 'button'); c.setAttribute('tabindex', '0'); c.setAttribute('aria-expanded', c.classList.contains('mf-open') ? 'true' : 'false'); }
            else { c.removeAttribute('role'); c.removeAttribute('tabindex'); c.removeAttribute('aria-expanded'); }
          }
        });

        if (!groupable) return;
        grid.classList.add('mf-kpi-grp');
        if (openGrp[gkey]) grid.classList.add('mf-open');
        var nx = grid.nextElementSibling, extra = cards.length - SHOW;
        if (!nx || !nx.classList.contains('mf-kpi-more')) {
          nx = document.createElement('button'); nx.type = 'button'; nx.className = 'mf-kpi-more'; nx.dataset.gkey = gkey;
          grid.parentNode.insertBefore(nx, grid.nextSibling);
        }
        nx.dataset.gkey = gkey;
        moreLabel(nx, grid, extra);
      });
    });
    // tombol sisa dari grid yang sudah dirender ulang
    [].forEach.call(document.querySelectorAll('.mf-kpi-more'), function (b) {
      var p = b.previousElementSibling; if (!p || !p.classList.contains('mf-kpi-grp')) b.remove();
    });
  }
  function scheduleEnhance() { clearTimeout(enhT); enhT = setTimeout(enhance, 60); }

  document.addEventListener('click', function (e) {
    var more = e.target.closest && e.target.closest('.mf-kpi-more');
    if (more) {
      var grid = more.previousElementSibling; if (!grid) return;
      var on = !grid.classList.contains('mf-open');
      grid.classList.toggle('mf-open', on); openGrp[more.dataset.gkey] = on;
      moreLabel(more, grid, grid.querySelectorAll('.mf-kpi-extra').length);
      return;
    }
    var card = e.target.closest && e.target.closest('.v5-kpi.mf-x');
    if (!card || !mobile() || e.target.closest('a, button, input, select')) return;
    var sec = card.closest('#dashboard-section, #statistik-section'); if (!sec) return;
    var on2 = !card.classList.contains('mf-open');
    setCard(card, on2); openCard[cardKey(card, sec.id)] = on2;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var card = e.target.classList && e.target.classList.contains('mf-x') ? e.target : null;
    if (!card || !mobile()) return;
    e.preventDefault(); card.click();
  });

  /* ===================== Inisialisasi ===================== */
  function onMq() {
    if (!mobile()) { document.body.classList.remove('mf-sheet-open', 'mf-fab-hide'); if (panel) panel.style.transform = ''; }
    placePanel(); syncSheet(); enhance();
  }
  function init() {
    try { initFab(); } catch (e) {}
    try { build(); syncSheet(); } catch (e) {}
    try {
      enhance();
      SECS.forEach(function (sid) { var s = $(sid); if (s) new MutationObserver(scheduleEnhance).observe(s, { childList: true, subtree: true }); });
    } catch (e) {}
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }
  function onLang() { labels(); [].forEach.call(document.querySelectorAll('.mf-kpi-more'), function (b) { var g = b.previousElementSibling; if (g) moreLabel(b, g, g.querySelectorAll('.mf-kpi-extra').length); }); }
  window.addEventListener('storage', function (e) { if (e.key === 'journalLanguage') onLang(); });
  try { new MutationObserver(onLang).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] }); } catch (e) {}

  window.MobileFloat = { refresh: refresh, enhance: enhance, close: closeSheet };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
