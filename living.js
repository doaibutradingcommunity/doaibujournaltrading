/* v16.69 · Living Components (bagian skrip, tanpa dependensi)
   Komponen kecil yang merespons tindakan pengguna. Tidak ada animasi dekoratif yang berjalan terus.
   Tidak mengubah data, statistik, atau logika halaman; hanya mengamati DOM dan menambah lapisan tampilan.
   1) Angka berubah dengan transisi singkat (hitung naik/turun ~420 ms), hanya saat nilai memang berubah.
   2) Indikator filter: lencana jumlah filter aktif di tombol Filter, kolom terisi ditandai, aria-expanded ikut panel.
   3) Grafik Chart.js (P/L kumulatif): garis bidik + sorotan titik saat disentuh/di-hover, geser horizontal tanpa
      mengunci gulir vertikal, detail hilang sendiri setelah jari diangkat.
   4) Chip/segmen: pilihan baru "mengambil" status aktif dengan pop singkat.
   Semua gaya dikunci ke html.lc-on. Hapus <script src="living.js"> dan <link href="living.css"> untuk membatalkan. */
(function () {
  'use strict';
  if (window.__doaLiving1669) return;
  window.__doaLiving1669 = true;
  var W = window, D = document, root = D.documentElement;
  root.classList.add('lc-on');

  function mq(q) { try { return W.matchMedia(q).matches; } catch (e) { return false; } }
  function motionOff() { return mq('(prefers-reduced-motion: reduce)') || root.classList.contains('mo-lite'); }
  function raf(fn) { return (W.requestAnimationFrame || function (f) { return setTimeout(f, 16); })(fn); }

  /* ============================================================
     1. ANGKA — tween dari teks lama ke teks baru dengan format yang sama
     ============================================================ */
  var NUM_SEL = '.tnum, [data-money], .v5-kpi .v, .stx-big';
  var SIGNS = /[-−–+]/;
  var memory = Object.create(null);   // key stabil -> teks terakhir (bertahan saat DOM dirender ulang)
  var tweens = [];                    // tween aktif
  var looping = false;

  function parseNum(tok) {
    var hasDot = tok.indexOf('.') > -1, hasCom = tok.indexOf(',') > -1, dec = '', th = '', parts;
    if (hasDot && hasCom) { dec = tok.lastIndexOf('.') > tok.lastIndexOf(',') ? '.' : ','; th = dec === '.' ? ',' : '.'; }
    else if (hasDot || hasCom) {
      var s = hasDot ? '.' : ',';
      parts = tok.split(s);
      if (parts.length > 2 || (parts[1].length === 3 && parts[0] !== '0')) th = s; else dec = s;
    }
    var clean = tok.split(th || '\u0000').join('');
    if (dec) clean = clean.replace(dec, '.');
    var v = parseFloat(clean);
    if (!isFinite(v)) return null;
    var decimals = 0;
    if (dec) decimals = tok.length - tok.lastIndexOf(dec) - 1;
    return { v: v, dec: dec, th: th, decimals: decimals };
  }

  /* Pecah teks menjadi {pre, sign, signAt, num, suf}; null bila bukan "satu angka dengan hiasan" */
  function parse(str) {
    if (typeof str !== 'string') return null;
    var s = str.replace(/ /g, ' ').trim();
    if (!s || s.length > 28) return null;
    var m = /^([^\d]*)(\d[\d.,]*\d|\d)(.*)$/.exec(s);
    if (!m) return null;
    var pre = m[1], suf = m[3];
    if (pre.length > 8 || suf.length > 8 || /\d/.test(suf)) return null;
    var sign = '', signAt = 0, plus = false, stripped = '', i, ch;
    for (i = 0; i < pre.length; i++) {
      ch = pre.charAt(i);
      if (SIGNS.test(ch)) { if (ch === '+') plus = true; else sign = ch; signAt = stripped.length; }
      else stripped += ch;
    }
    var n = parseNum(m[2]);
    if (!n) return null;
    n.pre = stripped; n.suf = suf; n.neg = !!sign; n.negCh = sign; n.plus = plus; n.signAt = signAt;
    n.v = sign ? -n.v : n.v;
    n.hadSign = !!(sign || plus);
    return n;
  }

  function group(intStr, th) {
    if (!th) return intStr;
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, th);
  }

  function fmt(v, f) {
    var neg = v < 0, a = Math.abs(v).toFixed(f.decimals);
    if (parseFloat(a) === 0) neg = false;
    var p = a.split('.'), out = group(p[0], f.th);
    if (p[1]) out += (f.dec || '.') + p[1];
    var sg = neg ? (f.negCh || '-') : (f.plus && v > 0 ? '+' : '');
    var at = Math.min(f.signAt, f.pre.length);
    return f.pre.slice(0, at) + sg + f.pre.slice(at) + out + f.suf;
  }

  function candidate(el) {
    return el && el.nodeType === 1 && el.childElementCount === 0 && el.matches && el.matches(NUM_SEL);
  }

  /* kunci stabil agar elemen yang dirender ulang tetap bisa dibandingkan dengan nilai sebelumnya */
  function keyOf(el) {
    if (el.id) return '#' + el.id;
    var kpi = el.closest && el.closest('.v5-kpi');
    if (kpi && kpi.contains(el) && el.classList.contains('v')) {
      var l = kpi.querySelector('.l'), host = kpi.closest('[id]');
      var idx = 0, sib = kpi.parentNode ? kpi.parentNode.children : [];
      for (var i = 0; i < sib.length; i++) { if (sib[i] === kpi) { idx = i; break; } }
      return 'kpi:' + (host ? host.id : '') + ':' + (l ? l.textContent.trim() : idx);
    }
    return '';
  }

  function visible(el) { return !!(el.offsetParent || (el.getClientRects && el.getClientRects().length)); }

  function textNodeOf(el) {
    var n = el.firstChild;
    return n && n.nodeType === 3 && !n.nextSibling ? n : null;
  }

  function stop(el) {
    for (var i = tweens.length - 1; i >= 0; i--) if (tweens[i].el === el) tweens.splice(i, 1);
    el.__lcTween = null;
  }

  function startTween(el, fromTxt, toTxt) {
    if (motionOff() || !visible(el)) return;
    var a = parse(fromTxt), b = parse(toTxt);
    if (!a || !b) return;
    if (a.pre !== b.pre || a.suf !== b.suf) return;              // mata uang / satuan berbeda: ganti langsung
    if (a.v === b.v) return;
    var node = textNodeOf(el);
    if (!node) return;
    var f = {
      dec: b.dec || a.dec, th: b.th || a.th, decimals: b.dec ? b.decimals : (a.dec ? a.decimals : 0),
      pre: b.pre, suf: b.suf, negCh: b.negCh || a.negCh || '-', plus: a.plus || b.plus,
      signAt: b.hadSign ? b.signAt : (a.hadSign ? a.signAt : 0)
    };
    stop(el);
    var span = Math.abs(b.v - a.v);
    var t = { el: el, node: node, from: a.v, to: b.v, f: f, final: toTxt, t0: 0, dur: span > 0 ? 420 : 0 };
    el.__lcTween = t; el.__lcLast = null;
    el.classList.add('lc-counting');
    tweens.push(t);
    node.data = fromTxt; el.__lcLast = fromTxt;
    if (!looping) { looping = true; raf(step); }
  }

  function step(now) {
    for (var i = tweens.length - 1; i >= 0; i--) {
      var t = tweens[i];
      if (!t.t0) t.t0 = now;
      var p = Math.min(1, (now - t.t0) / t.dur);
      var e = 1 - Math.pow(1 - p, 3);                            // easeOutCubic
      var txt = p >= 1 ? t.final : fmt(t.from + (t.to - t.from) * e, t.f);
      if (t.node.data !== txt) t.node.data = txt;
      t.el.__lcLast = txt;
      if (p >= 1) { tweens.splice(i, 1); t.el.__lcTween = null; t.el.__lcLast = null; t.el.classList.remove('lc-counting'); }
    }
    if (tweens.length) raf(step); else looping = false;
  }

  function remember(el) {
    var k = keyOf(el);
    if (k) memory[k] = el.textContent;
    return k;
  }

  /* elemen yang baru dirender ulang: bandingkan dengan ingatan lalu tween bila beda */
  function handleFresh(el) {
    var k = keyOf(el), cur = el.textContent;
    if (!k) return;
    var prev = memory[k];
    memory[k] = cur;
    if (prev !== undefined && prev !== cur) startTween(el, prev, cur);
  }

  function scanNumbers(rootEl, fresh) {
    if (!rootEl || rootEl.nodeType !== 1) return;
    var list = [];
    if (candidate(rootEl)) list.push(rootEl);
    var found = rootEl.querySelectorAll ? rootEl.querySelectorAll(NUM_SEL) : [];
    for (var i = 0; i < found.length; i++) if (candidate(found[i])) list.push(found[i]);
    for (var j = 0; j < list.length; j++) { if (fresh) handleFresh(list[j]); else remember(list[j]); }
  }

  /* ============================================================
     2. CHIP / SEGMEN — status aktif baru mendapat pop singkat
     ============================================================ */
  var groupMemory = Object.create(null);
  function isOn(b) {
    var p = b.getAttribute('aria-pressed');
    if (p === 'true') return true;
    if (p === 'false') return false;
    return b.classList.contains('on');
  }
  function groupKey(box) {
    var host = box.closest('[id]'), hid = host ? host.id : '';
    if (box.id) return '#' + box.id;
    var lbl = box.getAttribute('aria-label') || box.className || '';
    var same = host ? host.querySelectorAll(':scope ' + (box.className ? '.' + String(box.className).trim().split(/\s+/).join('.') : '*')) : [];
    var idx = 0;
    for (var i = 0; i < same.length; i++) if (same[i] === box) { idx = i; break; }
    return hid + '|' + lbl + '|' + idx;
  }
  function scanGroups(rootEl, announce) {
    if (!rootEl || rootEl.nodeType !== 1) return;
    var btns = rootEl.matches && rootEl.matches('[aria-pressed]') ? [rootEl] : [];
    var found = rootEl.querySelectorAll ? rootEl.querySelectorAll('[aria-pressed]') : [];
    for (var i = 0; i < found.length; i++) btns.push(found[i]);
    var seen = [];
    for (var j = 0; j < btns.length; j++) {
      var box = btns[j].parentNode;
      if (!box || seen.indexOf(box) > -1) continue;
      seen.push(box);
      var kids = [], k;
      for (k = 0; k < box.children.length; k++) if (box.children[k].hasAttribute('aria-pressed')) kids.push(box.children[k]);
      if (kids.length < 2) continue;                              // satu tombol saja = toggle biasa, bukan grup
      var active = -1;
      for (k = 0; k < kids.length; k++) if (isOn(kids[k])) { active = k; break; }
      var key = groupKey(box), prev = groupMemory[key];
      groupMemory[key] = active;
      if (announce && prev !== undefined && active > -1 && prev !== active && !motionOff()) popEl(kids[active]);
    }
  }
  function popEl(el) {
    el.classList.remove('lc-pop');
    void el.offsetWidth;
    el.classList.add('lc-pop');
    setTimeout(function () { el.classList.remove('lc-pop'); }, 320);
  }

  /* ============================================================
     3. FILTER — lencana jumlah, kolom terisi, aria-expanded
     ============================================================ */
  var FILTER_IDS = ['filter-date-start', 'filter-date-end', 'filter-pair', 'filter-session', 'filter-tag', 'filter-bias', 'filter-sort'];
  var badge = null, lastCount = -1, fTimer = 0;

  function ensureBadge() {
    var btn = D.getElementById('btn-filter-toggle');
    if (!btn) return null;
    if (!badge || !btn.contains(badge)) {
      badge = D.createElement('span');
      badge.className = 'lc-badge'; badge.hidden = true;
      badge.setAttribute('aria-hidden', 'true');
      btn.appendChild(badge);
    }
    return btn;
  }
  function updateFilters() {
    fTimer = 0;
    var btn = ensureBadge();
    if (!btn) return;
    var n = 0, i, el, set;
    for (i = 0; i < FILTER_IDS.length; i++) {
      el = D.getElementById(FILTER_IDS[i]);
      if (!el) continue;
      set = el.id === 'filter-sort' ? (el.value && el.value !== 'date-desc') : !!el.value;
      if (set) { n++; el.setAttribute('data-lc-set', '1'); } else el.removeAttribute('data-lc-set');
    }
    badge.textContent = n; badge.hidden = !n;
    btn.classList.toggle('lc-filtered', n > 0);
    btn.setAttribute('data-lc-count', String(n));
    var panel = D.getElementById('filter-panel');
    if (panel) {
      var open = !panel.classList.contains('hidden');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-controls', 'filter-panel');
      btn.classList.toggle('lc-open', open);
    }
    if (lastCount !== -1 && n !== lastCount && n > 0 && !motionOff()) popEl(badge);
    lastCount = n;
  }
  function queueFilters() { if (!fTimer) fTimer = setTimeout(updateFilters, 0); }

  /* ============================================================
     4. GRAFIK — garis bidik, sorotan titik, sentuhan
     ============================================================ */
  function hexOrColor(c) { return typeof c === 'string' ? c : '#d4af37'; }
  var chartPlugin = {
    id: 'doaLiving',
    afterInit: function (chart) {
      var cv = chart.canvas;
      if (!cv || chart.config.type !== 'line') return;
      cv.style.touchAction = 'pan-y';                             // geser horizontal = baca grafik, vertikal = gulir halaman
      if (cv.__lcTouch) return;
      cv.__lcTouch = true;
      var timer = 0;
      function clear() {
        var c = W.Chart && W.Chart.getChart ? W.Chart.getChart(cv) : null;
        if (!c) return;
        try {
          c.setActiveElements([]);
          if (c.tooltip) c.tooltip.setActiveElements([], { x: 0, y: 0 });
          c.update('none');
        } catch (e) { /* hanya hiasan */ }
      }
      function arm() { W.clearTimeout(timer); timer = W.setTimeout(clear, 1800); }
      cv.addEventListener('touchstart', function () { W.clearTimeout(timer); }, { passive: true });
      cv.addEventListener('touchend', arm, { passive: true });
      cv.addEventListener('touchcancel', arm, { passive: true });
    },
    beforeDatasetsDraw: function (chart) {
      if (chart.config.type !== 'line' || !chart.tooltip) return;
      var act = chart.tooltip.getActiveElements ? chart.tooltip.getActiveElements() : [];
      if (!act || !act.length) return;
      var el = act[0].element, area = chart.chartArea, ctx = chart.ctx;
      if (!el || !area || typeof el.x !== 'number') return;
      var ds = chart.data.datasets[act[0].datasetIndex] || {};
      var col = hexOrColor(ds.borderColor);
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = root.classList.contains('light') || D.body.classList.contains('light') ? 'rgba(0,0,0,.28)' : 'rgba(255,255,255,.28)';
      ctx.moveTo(el.x, area.top); ctx.lineTo(el.x, area.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(el.x, el.y, 9, 0, Math.PI * 2);
      ctx.globalAlpha = .2; ctx.fillStyle = col; ctx.fill();
      ctx.restore();
    }
  };
  function registerChart() {
    var C = W.Chart;
    if (!C || !C.register || C.__doaLiving1669) return false;
    C.__doaLiving1669 = true;
    try { C.register(chartPlugin); } catch (e) { /* jangan ganggu grafik */ }
    return true;
  }
  if (!registerChart()) {
    var tries = 0, iv = setInterval(function () { if (registerChart() || ++tries > 40) clearInterval(iv); }, 250);
  }

  /* ============================================================
     Pengamat DOM tunggal
     ============================================================ */
  function onMutations(list) {
    for (var i = 0; i < list.length; i++) {
      var r = list[i], t = r.target, el;
      if (r.type === 'characterData') {
        el = t.parentNode;
        if (!el || el.nodeType !== 1 || !candidate(el)) continue;
        if (el.__lcLast !== undefined && el.__lcLast !== null && t.data === el.__lcLast) continue;   // tulisan kita sendiri
        var old = el.__lcLast || r.oldValue || '';
        if (el.__lcTween) stop(el);
        var k = keyOf(el); if (k) memory[k] = t.data;
        startTween(el, old, t.data);
      } else if (r.type === 'childList') {
        if (candidate(t) && r.removedNodes.length && r.addedNodes.length && t.__lcLast == null) {
          // textContent = '...' pada elemen yang sama: teks lama ada di node yang dilepas
          var rem = r.removedNodes[0], oldTxt = rem && rem.nodeType === 3 ? rem.data : null;
          var kk = keyOf(t); if (kk) memory[kk] = t.textContent;
          if (oldTxt != null) { if (t.__lcTween) stop(t); startTween(t, oldTxt, t.textContent); }
          continue;
        }
        for (var a = 0; a < r.addedNodes.length; a++) {
          var n = r.addedNodes[a];
          if (n.nodeType !== 1) continue;
          scanNumbers(n, true);
          scanGroups(n, true);
          if (n.id === 'filter-panel' || (n.querySelector && n.querySelector('#filter-panel'))) queueFilters();
        }
      } else if (r.type === 'attributes') {
        if (t.id === 'filter-panel') queueFilters();
        else if (t.hasAttribute && t.hasAttribute('aria-pressed') && t.parentNode) scanGroups(t.parentNode, true);
      }
    }
  }

  function init() {
    ensureBadge();
    scanNumbers(D.body, false);
    scanGroups(D.body, false);
    updateFilters();
    try {
      var mo = new MutationObserver(onMutations);
      mo.observe(D.body, { childList: true, subtree: true, characterData: true, characterDataOldValue: true,
        attributes: true, attributeFilter: ['class', 'aria-pressed'] });
    } catch (e) { /* tanpa MutationObserver, semua tetap berjalan seperti sebelumnya */ }
    ['input', 'change', 'click'].forEach(function (ev) {
      D.addEventListener(ev, function (e) {
        var t = e.target;
        if (t && t.closest && t.closest('#filter-panel, #btn-filter-toggle, #jr-active, #jr-toolbar')) queueFilters();
      }, true);
    });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();
