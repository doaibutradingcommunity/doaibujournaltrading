/* v16.43 · Trade Journal UX
   - Chip filter aktif + sinkronisasi toolbar pencarian/status
   - Panel detail trade (drawer di desktop, bottom sheet di HP) dengan navigasi ‹ ›
   Bergantung pada window.__jrApi dan window.__jrDetail yang disediakan index.html. */
(function () {
  'use strict';
  var T = {
    id: { ph: 'Cari pair, setup, catatan, tanggal…', all: 'Semua', profit: 'Profit', loss: 'Loss', be: 'BE', beTitle: 'Break-even (P/L 0)', q: 'Cari', from: 'Dari', to: 'Sampai', pair: 'Pair', session: 'Sesi', tag: 'Setup', bias: 'Arah', status: 'Status', reset: 'Reset semua', rm: 'Hapus filter', statusGrp: 'Status hasil', search: 'Cari journal', clear: 'Hapus pencarian',
      detail: 'Detail trade', close: 'Tutup', prev: 'Sebelumnya', next: 'Berikutnya', edit: 'Edit', del: 'Hapus', trade: 'trade', of: 'dari', add: '+ Trade di tanggal ini', no: 'Trade' },
    en: { ph: 'Search pair, setup, notes, date…', all: 'All', profit: 'Profit', loss: 'Loss', be: 'BE', beTitle: 'Break-even (P/L 0)', q: 'Search', from: 'From', to: 'To', pair: 'Pair', session: 'Session', tag: 'Setup', bias: 'Direction', status: 'Status', reset: 'Reset all', rm: 'Remove filter', statusGrp: 'Result status', search: 'Search journals', clear: 'Clear search',
      detail: 'Trade detail', close: 'Close', prev: 'Previous', next: 'Next', edit: 'Edit', del: 'Delete', trade: 'trade', of: 'of', add: '+ Add trade this day', no: 'Trade' },
    ms: { ph: 'Cari pair, setup, nota, tarikh…', all: 'Semua', profit: 'Untung', loss: 'Rugi', be: 'BE', beTitle: 'Pulang modal (P/L 0)', q: 'Cari', from: 'Dari', to: 'Hingga', pair: 'Pair', session: 'Sesi', tag: 'Setup', bias: 'Arah', status: 'Status', reset: 'Set semula semua', rm: 'Buang penapis', statusGrp: 'Status hasil', search: 'Cari jurnal', clear: 'Kosongkan carian',
      detail: 'Butiran dagangan', close: 'Tutup', prev: 'Sebelumnya', next: 'Seterusnya', edit: 'Edit', del: 'Padam', trade: 'dagangan', of: 'daripada', add: '+ Tambah dagangan hari ini', no: 'Dagangan' },
    es: { ph: 'Buscar par, setup, notas, fecha…', all: 'Todos', profit: 'Ganancia', loss: 'Pérdida', be: 'BE', beTitle: 'Break-even (P/L 0)', q: 'Buscar', from: 'Desde', to: 'Hasta', pair: 'Par', session: 'Sesión', tag: 'Setup', bias: 'Dirección', status: 'Estado', reset: 'Restablecer todo', rm: 'Quitar filtro', statusGrp: 'Estado del resultado', search: 'Buscar diarios', clear: 'Borrar búsqueda',
      detail: 'Detalle del trade', close: 'Cerrar', prev: 'Anterior', next: 'Siguiente', edit: 'Editar', del: 'Eliminar', trade: 'trade', of: 'de', add: '+ Añadir trade este día', no: 'Trade' }
  };
  function L() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return T[l] || T.id; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function $(id) { return document.getElementById(id); }
  function api() { return window.__jrApi; }

  var ids = [], openId = null, ov = null, panel = null, lastFocus = null;

  /* ---------- Toolbar + chip filter aktif ---------- */
  function syncControls() {
    var a = api(), t = L(); if (!a) return;
    var f = a.filters();
    var inp = $('journal-search'); if (inp) { inp.placeholder = t.ph; inp.setAttribute('aria-label', t.search); }
    var x = $('journal-search-clear'); if (x) { x.hidden = !inp.value; x.setAttribute('aria-label', t.clear); }
    var grp = $('jr-status'); if (grp) {
      grp.setAttribute('aria-label', t.statusGrp);
      [].forEach.call(grp.querySelectorAll('button[data-status]'), function (b) {
        var k = b.dataset.status, on = k === (f.status || '');
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.textContent = k === '' ? t.all : t[k]; if (k === 'be') b.title = t.beTitle;
      });
    }
    var chips = [];
    function add(key, label, val) { if (val) chips.push({ key: key, label: label, val: val }); }
    add('q', t.q, f.q); add('status', t.status, f.status ? t[f.status] : '');
    add('start', t.from, f.start); add('end', t.to, f.end);
    add('pair', t.pair, f.pair); add('session', t.session, f.session);
    add('tag', t.tag, f.tag); add('bias', t.bias, f.bias);
    var box = $('jr-active'); if (!box) return;
    if (!chips.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = chips.map(function (c) {
      return '<span class="jr-chip"><span>' + esc(c.label) + ': ' + esc(c.val) + '</span><button type="button" data-clear="' + c.key + '" aria-label="' + esc(t.rm + ': ' + c.label) + '">&times;</button></span>';
    }).join('') + '<button type="button" class="jr-chip-reset" data-reset>' + esc(t.reset) + '</button>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#jr-active [data-clear]'); if (b && api()) { api().clear(b.dataset.clear); return; }
    if (e.target.closest && e.target.closest('#jr-active [data-reset]') && api()) api().reset();
  });

  /* ---------- Panel detail ---------- */
  function build() {
    if (panel) return;
    ov = document.createElement('div'); ov.className = 'jd-ov'; ov.hidden = true;
    panel = document.createElement('aside'); panel.className = 'jd-panel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    document.body.appendChild(ov); document.body.appendChild(panel);
    ov.addEventListener('click', close);
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('jd-x')) close();
      else if (b.dataset.nav) go(+b.dataset.nav);
      else if (b.classList.contains('jd-edit')) { var id = openId; close(true); api().edit(id); }
      else if (b.classList.contains('jd-add')) { var cur = api().find(openId), dt = cur && cur.date; close(true); if (dt && api().addTo) api().addTo(dt); }
      else if (b.classList.contains('jd-del')) { var d = openId; close(true); api().del(d); }
    });
  }
  function fmtLong(d) { try { return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return d || ''; } }
  function money(v) { try { return window.Money.format(v || 0, { plus: true }); } catch (e) { return String(v || 0); } }
  function paint() {
    var a = api(), t = L(), j = a.find(openId); if (!j) { close(true); return; }
    var st = a.status(j), tone = st === 'profit' ? 'pos' : st === 'loss' ? 'neg' : 'zero';
    var i = ids.indexOf(openId), n = ids.length;
    var tr = j.trades || 1, hasWL = typeof j.wins === 'number';
    var c = a.counts(j), w = c.w, be = c.be, l = c.l;
    var dir = j.bias === 'Long' ? 'long' : j.bias === 'Short' ? 'short' : 'neutral', arrow = j.bias === 'Long' ? '↑ ' : j.bias === 'Short' ? '↓ ' : '';
    panel.className = 'jd-panel ' + tone + (window.JournalCinematic ? ' jc' : '') + ' on';
    panel.setAttribute('aria-label', t.detail + ' ' + (j.date || ''));
    panel.innerHTML =
      '<div class="jd-head"><div class="jd-top">' +
        '<div class="jd-nav"><button type="button" data-nav="-1" aria-label="' + esc(t.prev) + '"' + (i <= 0 ? ' disabled' : '') + '>&#8249;</button>' +
        '<span aria-live="polite">' + (i >= 0 ? (i + 1) + ' ' + esc(t.of) + ' ' + n : '') + '</span>' +
        '<button type="button" data-nav="1" aria-label="' + esc(t.next) + '"' + (i < 0 || i >= n - 1 ? ' disabled' : '') + '>&#8250;</button></div>' +
        (window.ActionSurface ? '<button type="button" class="jd-more" aria-haspopup="dialog" aria-label="' + esc(L().more || 'Tindakan lainnya') + '">' + window.ActionSurface.dots + '</button>' : '') +
        '<button type="button" class="jd-x" aria-label="' + esc(t.close) + '">&times;</button></div>' +
      '<div class="jd-title"><div><h3>' + (j.pair ? esc(j.pair) : '—') + '</h3><small>' + esc(fmtLong(j.date)) + (j.dayCount > 1 ? ' · ' + esc(t.no) + ' ' + j.tradeNo + ' ' + esc(t.of) + ' ' + j.dayCount : '') + '</small></div>' +
        '<div class="jd-pl tnum">' + esc(money(j.pl)) + '</div></div>' +
      '<div class="jd-meta"><span class="jr-status ' + tone + '"><i aria-hidden="true"></i>' + esc(t[st]) + '</span>' +
        '<span class="jr-badge ' + dir + '">' + arrow + esc(j.bias || 'Neutral') + '</span>' +
        '<span class="jr-n">' + tr + ' ' + esc(t.trade) + (tr > 1 && L() === T.en ? 's' : '') + '</span>' +
        (hasWL ? '<span class="jr-w">' + w + 'W</span>' + (be ? '<span class="jr-be">' + be + 'BE</span>' : '') + '<span class="jr-l">' + l + 'L</span>' : '') +
        (j.accountType ? '<span class="jr-acc">' + esc(j.accountType) + '</span>' : '') + '</div></div>' +
      '<div class="jd-body">' + window.__jrDetail(j, a.outlook(j.date)) + '</div>' +
      '<div class="jd-act"><button type="button" class="jd-edit">' + esc(t.edit) + '</button><button type="button" class="jd-add">' + esc(t.add) + '</button><button type="button" class="jd-del">' + esc(t.del) + '</button></div>';
    var body = panel.querySelector('.jd-body'); if (body) body.scrollTop = 0;
  }
  function open(id) {
    if (!api() || !api().find(id)) return;
    build(); lastFocus = document.activeElement;
    var first = !openId; openId = id;
    ov.hidden = false; panel.hidden = false;
    paint();
    if (first) {
      requestAnimationFrame(function () { ov.classList.add('on'); });
      document.body.classList.add('jd-lock');
      document.addEventListener('keydown', onKey, true);
    }
    var x = panel.querySelector('.jd-x'); if (x) x.focus({ preventScroll: true });
  }
  function close(noRestore) {
    if (!openId) return;
    var id = openId; openId = null;
    document.removeEventListener('keydown', onKey, true);
    document.body.classList.remove('jd-lock');
    ov.classList.remove('on'); panel.classList.remove('on');
    var hideNow = function () { if (!openId && ov && panel) { ov.hidden = true; panel.hidden = true; panel.innerHTML = ''; ov.classList.remove('on'); panel.classList.remove('on'); document.body.classList.remove('jd-lock'); } };
    setTimeout(hideNow, 260); setTimeout(hideNow, 700); /* cadangan jika transisi tertahan */
    if (noRestore === true) return;
    var row = findRow(id); var tgt = row || lastFocus; if (tgt && tgt.focus) try { tgt.focus({ preventScroll: true }); } catch (e) {}
  }
  function go(d) {
    var i = ids.indexOf(openId), k = i + d; if (i < 0 || k < 0 || k >= ids.length) return;
    openId = ids[k]; paint();
    var row = findRow(openId); if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
    var b = panel.querySelector('[data-nav="' + d + '"]:not(:disabled)') || panel.querySelector('.jd-x'); b.focus({ preventScroll: true });
  }
  function findRow(id) { var rows = document.querySelectorAll('#journal-list .jr'); for (var i = 0; i < rows.length; i++) if (rows[i].dataset.jrId === id) return rows[i]; return null; }
  function zoomOpen() { var z = $('image-zoom-modal'); return !!(z && !z.classList.contains('hidden')); }
  function onKey(e) {
    if (zoomOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    var tag = (e.target && e.target.tagName) || '';
    if (!/INPUT|TEXTAREA|SELECT/.test(tag)) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); return; }
    }
    if (e.key === 'Tab' && panel) {
      var f = [].filter.call(panel.querySelectorAll('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'), function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (!panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  /* ---------- Buka dari baris ---------- */
  document.addEventListener('click', function (e) {
    var row = e.target.closest && e.target.closest('#journal-list .jr'); if (!row) return;
    if (e.target.closest('.jr-act, a, button')) return;
    open(row.dataset.jrId);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var row = e.target.classList && e.target.classList.contains('jr') ? e.target : null; if (!row) return;
    e.preventDefault(); open(row.dataset.jrId);
  });

  window.JournalUX = {
    syncControls: syncControls,
    afterRender: function (filtered) {
      ids = (filtered || []).map(function (j) { return j.id; });
      if (!openId) { document.body.classList.remove('jd-lock'); if (ov && !ov.hidden && !ov.classList.contains('on')) ov.hidden = true; if (panel && !panel.hidden && !panel.classList.contains('on')) panel.hidden = true; }
      if (openId) { if (api().find(openId)) paint(); else close(true); }
    },
    open: open, close: close,
    current: function () { return openId; }
  };
  window.addEventListener('storage', function (e) { if (e.key === 'journalLanguage') { syncControls(); if (openId) paint(); } });
  try { new MutationObserver(function () { syncControls(); if (openId) paint(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] }); } catch (e) {}
  document.addEventListener('DOMContentLoaded', function () { try { syncControls(); } catch (e) {} });
})();
