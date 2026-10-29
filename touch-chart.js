/* v17.01 — Touch-First Chart Exploration
   Tampilan & interaksi saja. Tidak menghitung ulang P/L, tidak menyentuh data/Firebase/V16Stats.
   API: window.TouchChart = { smooth(points), stats(pts,k), attach(opts) } */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var HOLD_MS = 4000; // setelah jari diangkat, pilihan tetap terlihat sebentar supaya sempat dibaca

  /* Kurva halus monotone-cubic (Fritsch–Butland): tidak "patah-patah" dan tidak pernah melampaui
     puncak/lembah data (tidak ada puncak palsu di equity). pts = [{x,y}] → string path SVG. */
  function smooth(P) {
    var n = P.length, i;
    if (!n) return '';
    var f = function (v) { return (Math.round(v * 10) / 10); };
    if (n === 1) return 'M' + f(P[0].x) + ' ' + f(P[0].y);
    if (n === 2) return 'M' + f(P[0].x) + ' ' + f(P[0].y) + ' L' + f(P[1].x) + ' ' + f(P[1].y);
    var dx = [], d = [], m = [];
    for (i = 0; i < n - 1; i++) { dx[i] = (P[i + 1].x - P[i].x) || 1e-6; d[i] = (P[i + 1].y - P[i].y) / dx[i]; }
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else {
        var w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1];
        m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
      }
    }
    var s = 'M' + f(P[0].x) + ' ' + f(P[0].y);
    for (i = 0; i < n - 1; i++) {
      var h = dx[i] / 3;
      s += ' C' + f(P[i].x + h) + ' ' + f(P[i].y + m[i] * h) + ' ' + f(P[i + 1].x - h) + ' ' + f(P[i + 1].y - m[i + 1] * h) + ' ' + f(P[i + 1].x) + ' ' + f(P[i + 1].y);
    }
    return s;
  }

  /* Ringkasan periode dari awal rentang sampai titik k (inklusif). pts[].pl = P/L hari itu. */
  function stats(pts, k) {
    var n = 0, win = 0, loss = 0, i, p = pts[Math.max(0, Math.min(pts.length - 1, k))];
    for (i = 0; i <= k && i < pts.length; i++) { n++; if (pts[i].pl > 0) win++; else if (pts[i].pl < 0) loss++; }
    return { n: n, win: win, loss: loss, wr: n ? win / n * 100 : 0, delta: p ? p.cum : 0, from: pts[0], to: p };
  }

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* attach — crosshair, titik, tooltip, pointer/keyboard.
     o: { host, svg, W, H, plot:{L,T,pw,ph}, n, X(k), Y(k), color, tip(k)->html, onSelect(k), onClear(), label }
     Mouse: hover. Sentuh/pena: sentuh = pilih, geser horizontal = crosshair mengikuti jari,
     geser vertikal = halaman tetap bisa discroll (touch-action: pan-y). */
  function attach(o) {
    if (o.host.__tcAbort) { try { o.host.__tcAbort.abort(); } catch (e) {} }
    var ac = typeof AbortController === 'function' ? new AbortController() : null;
    o.host.__tcAbort = ac;
    var sig = ac ? { signal: ac.signal } : {};
    var svg = o.svg, L = o.plot.L, T = o.plot.T, pw = o.plot.pw, ph = o.plot.ph, n = o.n;
    var g = el('g', { 'class': 'tc-dot', style: 'display:none', 'pointer-events': 'none' }, svg);
    var vl = el('line', { 'class': 'v5-cross tc-vl', x1: 0, x2: 0, y1: T, y2: T + ph }, g);
    var halo = el('circle', { 'class': 'tc-halo', r: 13, fill: o.color, 'fill-opacity': '.18' }, g);
    var pt = el('circle', { 'class': 'tc-pt', r: 5, fill: o.color, stroke: 'var(--bg)', 'stroke-width': 2 }, g);
    // area sentuh: seluruh lebar grafik + sumbu + sedikit ruang vertikal (jari tidak harus tepat di garis)
    var hit = el('rect', { x: 0, y: 0, width: o.W, height: o.H, fill: 'transparent', 'class': 'tc-hit' }, svg);
    var tip = document.createElement('div');
    tip.className = 'v5-tip tc-tip'; tip.setAttribute('aria-hidden', 'true'); o.host.appendChild(tip);

    var cur = n - 1, shown = false, last = -1, timer = 0, ready = false, touching = false;
    function kAt(ev) {
      var r = svg.getBoundingClientRect(), sx = (ev.clientX - r.left) / (r.width || 1) * o.W;
      return Math.max(0, Math.min(n - 1, Math.round((sx - L) / (pw || 1) * (n - 1))));
    }
    function move(node, x, y) { node.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
    function show(k, byTouch) {
      clearTimeout(timer);
      cur = k; var x = o.X(k), y = o.Y(k);
      g.style.display = '';
      move(vl, x, 0); move(halo, x, y); move(pt, x, y);
      halo.setAttribute('cx', 0); halo.setAttribute('cy', 0); pt.setAttribute('cx', 0); pt.setAttribute('cy', 0);
      vl.setAttribute('x1', 0); vl.setAttribute('x2', 0);
      if (!ready) { // pemilihan pertama langsung di tempat, gerak berikutnya meluncur halus
        requestAnimationFrame(function () { requestAnimationFrame(function () { g.classList.add('tc-glide'); ready = true; }); });
      }
      if (k !== last) {
        tip.innerHTML = o.tip(k); o.onSelect(k);
        if (byTouch && last !== -1 && navigator.vibrate) { try { navigator.vibrate(2); } catch (e) {} }
        last = k;
      }
      tip.classList.add('on'); shown = true;
      var sc = svg.getBoundingClientRect().width / o.W, tw = tip.offsetWidth, th = tip.offsetHeight, hw = o.host.clientWidth, px = x * sc, py = y * sc;
      var lift = byTouch ? 30 : 18, left = Math.max(0, Math.min(hw - tw, px - tw / 2)), top = py - th - lift;
      if (top < 0) { // tidak muat di atas: pindah ke samping titik supaya tidak tertutup jari
        top = Math.max(0, Math.min(py - th / 2, o.H * sc - th));
        left = px + 26 + tw <= hw ? px + 26 : Math.max(0, px - 26 - tw);
      }
      tip.style.left = left + 'px'; tip.style.top = top + 'px';
    }
    function clear() {
      clearTimeout(timer); if (!shown) return; shown = false; last = -1; ready = false; g.classList.remove('tc-glide');
      g.style.display = 'none'; tip.classList.remove('on'); o.onClear();
    }
    function later() { clearTimeout(timer); timer = setTimeout(clear, HOLD_MS); }

    hit.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      touching = e.pointerType !== 'mouse'; if (touching) show(kAt(e), true);
    }, sig);
    hit.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse') show(kAt(e), false);
      else if (touching) show(kAt(e), true);
    }, sig);
    hit.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') { touching = false; later(); } }, sig);
    hit.addEventListener('pointercancel', function () { touching = false; clear(); }, sig); // browser mengambil alih untuk scroll vertikal
    hit.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') clear(); }, sig);
    hit.addEventListener('contextmenu', function (e) { if (touching || e.pointerType === 'touch') e.preventDefault(); }, sig);
    // sentuh di luar grafik = tutup pilihan
    document.addEventListener('pointerdown', function (e) { if (shown && !o.host.contains(e.target)) clear(); }, ac ? { signal: ac.signal, passive: true } : { passive: true });

    hit.setAttribute('tabindex', '0'); hit.setAttribute('role', 'group');
    hit.setAttribute('aria-label', o.label || 'Grafik. Gunakan panah kiri dan kanan untuk melihat nilai tiap hari.');
    hit.addEventListener('keydown', function (e) {
      var k = e.key === 'ArrowLeft' ? cur - 1 : e.key === 'ArrowRight' ? cur + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null;
      if (k === null) { if (e.key === 'Escape') clear(); return; }
      e.preventDefault(); show(Math.max(0, Math.min(n - 1, k)), false);
    }, sig);
    hit.addEventListener('blur', clear, sig);
    return { show: show, clear: clear };
  }

  window.TouchChart = { smooth: smooth, stats: stats, attach: attach };
})();
