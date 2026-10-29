/* v16.60 · Smart Expandable Cards
   Kartu ringkasan tetap kecil & rapi; ketuk untuk melihat rincian tambahan.
   Aturan emas: baris rincian HANYA muncul bila datanya benar-benar ada (tidak ada angka karangan).
   Contoh: kartu P/L -> Profit kotor, Loss kotor, Biaya (komisi & swap) bila tercatat, lalu Net P/L. */
(function () {
  'use strict';
  var openMap = {};                       // kunci kartu -> true (bertahan walau Dashboard dirender ulang)
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fin = function (v) { return typeof v === 'number' && isFinite(v); };
  var tone = function (v) { return v > 0 ? 'pos' : v < 0 ? 'neg' : ''; };

  /* det = { rows: [[label, nilai, tone], ...], note: '' } atau null bila tidak ada rincian. */
  function pack(rows, note) { return rows.length ? { rows: rows, note: note || '' } : null; }

  function plRows(s, money) {
    if (!s || (!(s.gp > 0) && !(s.gl > 0))) return null;
    var rows = [['Profit kotor', money(s.gp, true), 'pos'], ['Loss kotor', money(-s.gl), s.gl > 0 ? 'neg' : '']];
    var notes = [];
    if (s.feeN > 0) {
      rows.push(['Biaya (komisi & swap)', money(-s.fees), s.fees > 0 ? 'neg' : tone(-s.fees)]);
      notes.push('Net P/L sudah termasuk biaya.');
      if (s.units && s.feeN < s.units) notes.push('Biaya tercatat di ' + s.feeN + ' dari ' + s.units + ' journal.');
    }
    rows.push(['Net P/L', money(s.net, true), tone(s.net), 'total']);
    if (!s.tradeLevel) notes.push('Profit & loss dihitung per hari journal.');
    return pack(rows, notes.join(' '));
  }
  function grossRows(s, money) {
    if (!s || (!(s.gp > 0) && !(s.gl > 0))) return null;
    return pack([['Gross profit', money(s.gp, true), 'pos'], ['Gross loss', money(-s.gl), s.gl > 0 ? 'neg' : '']],
      s.tradeLevel ? '' : 'Dihitung per hari journal.');
  }
  function countRows(s) {
    if (!s || !s.trades) return null;
    var rows = [['Menang', String(s.wins), 'pos'], ['Loss', String(s.losses), s.losses > 0 ? 'neg' : '']];
    if (s.be > 0) rows.push(['Break-even', String(s.be), '']);
    return pack(rows);
  }
  function avgRows(s, money) {
    if (!s || !s.tradeLevel || (s.avgWin === null && s.avgLoss === null)) return null;
    var rows = [];
    if (fin(s.avgWin)) rows.push(['Rata-rata menang', money(s.avgWin, true), 'pos']);
    if (fin(s.avgLoss)) rows.push(['Rata-rata loss', money(-s.avgLoss), 'neg']);
    return pack(rows);
  }

  function list(det) {
    if (!det || !det.rows || !det.rows.length) return '';
    return '<dl class="sc-rows">' + det.rows.map(function (r) {
      return '<div class="sc-row' + (r[3] === 'total' ? ' sc-total' : '') + '"><dt>' + esc(r[0]) + '</dt><dd class="' + esc(r[2] || '') + '">' + esc(r[1]) + '</dd></div>';
    }).join('') + '</dl>' + (det.note ? '<p class="sc-note">' + esc(det.note) + '</p>' : '');
  }

  /* Kartu perluasan mandiri (dipakai hero Net P/L). */
  function card(key, title, det) {
    if (!det) return '';
    var open = !!openMap[key], id = 'sc-' + key + '-body';
    return '<div class="sc-card' + (open ? ' sc-open' : '') + '" data-sc="' + esc(key) + '">' +
      '<button type="button" class="sc-trig" data-scx="' + esc(key) + '" aria-expanded="' + open + '" aria-controls="' + id + '"><span>' + esc(title) + '</span><i class="sc-chev" aria-hidden="true"></i></button>' +
      '<div class="sc-body" id="' + id + '"><div class="sc-inner"' + (open ? '' : ' inert') + '>' + list(det) + '</div></div></div>';
  }

  function toggle(btn) {
    var key = btn.getAttribute('data-scx'), box = btn.closest('.sc-card'); if (!box) return;
    var open = !box.classList.contains('sc-open'), inner = box.querySelector('.sc-inner');
    box.classList.toggle('sc-open', open); btn.setAttribute('aria-expanded', open);
    if (inner) { if (open) inner.removeAttribute('inert'); else inner.setAttribute('inert', ''); }
    if (open) openMap[key] = true; else delete openMap[key];
  }

  window.SmartCards = { plRows: plRows, grossRows: grossRows, countRows: countRows, avgRows: avgRows, list: list, card: card, toggle: toggle, version: '16.60' };
})();
