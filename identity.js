/* v16.99 · DOA IBU Signature Identity — skrip (tanpa dependensi, tanpa data, tanpa jaringan)
   Seluruh tampilan ada di identity.css. Skrip ini hanya MENAMBAH bentuk di atas markup yang sudah ada:
     1. monogram "Lengkung Doa" di header, Beranda, dan pemuat;
     2. angka besar: tanda +/− dan mata uang dikecilkan, desimal diredupkan (teks asli tidak berubah);
     3. cincin win-rate / checklist -> gauge lengkung (id elemen dan atribut stroke-dasharray dipertahankan,
        jadi stxViz() dan template Beranda tetap bekerja tanpa diubah);
     4. grafik equity SVG + sparkline Beranda -> anak tangga (equity juga diarsir) + penanda ujung lengkung;
     5. plugin Chart.js (hanya line chart): anak tangga, arsiran, garis nol bertitik, penanda ujung;
     6. pindah halaman: garis emas ditarik + isi halaman mengendap bertahap (event 'viewchange').
   Tidak menyentuh V16Stats, Firebase, P/L, atau logika navigasi. Teks angka (textContent) tidak pernah berubah.
   API: window.DoaIdentity = { version, markHTML, splitMoney, upgrade }.  Membatalkan: hapus <script identity.js>. */
(function () {
  'use strict';
  if (window.DoaIdentity) return;
  var W = window, D = document, html = D.documentElement;

  /* ---------- 1. Monogram: lengkung runcing + anak tangga naik + garis ganda ---------- */
  var MARK_SVG = '<svg viewBox="0 0 48 56" aria-hidden="true" focusable="false">' +
    '<path class="m-rule" d="M3 53.5H45"/><path class="m-base" d="M3 49H45"/>' +
    '<path class="m-arch" pathLength="100" d="M6 49V24C6 14 14 7 24 2C34 7 42 14 42 24V49"/>' +
    '<path class="m-step" pathLength="100" d="M14 41H21V34H28V27H35V20"/><circle class="m-dot" cx="35" cy="20" r="2.9"/></svg>';
  function markHTML(cls) { return '<span class="id-mark' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + MARK_SVG + '</span>'; }
  function markEl(cls) { var t = D.createElement('div'); t.innerHTML = markHTML(cls); return t.firstChild; }

  function placeMarks() {
    var brand = D.querySelector('.app-brand');
    if (brand && !brand.querySelector('.id-mark')) brand.insertBefore(markEl(''), brand.firstChild);
    var tops = D.querySelectorAll('.hm-top, .ed-top');      // .hm-top = hero klasik, .ed-top = hero editorial (mode aktif)
    for (var i = 0; i < tops.length; i++) if (!tops[i].querySelector('.id-mark')) tops[i].insertBefore(markEl(''), tops[i].firstChild);
    var spin = D.querySelector('#loading .animate-spin');
    if (spin && !D.querySelector('#loading .id-mark')) { spin.style.display = 'none'; spin.parentNode.insertBefore(markEl('id-draw'), spin); }
  }

  /* ---------- 2. Angka ---------- */
  var NUM_SEL = '.pf-val, .de-fig, .ed-fig, .hm-stat dd, .ed-sec dd, .hm-pl';
  var RE = /^(\s*)([+\-\u2212\u2013]?)\s*([^\d\s+\-\u2212\u2013.,<>&]{0,4})\s*([+\-\u2212\u2013]?)\s*(\d[\d.,\u00a0\u202f]*\d|\d)(\D*)$/;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* memecah "+$1,284.50" -> {sign, cur, int, dec, unit}. Desimal = 1–2 digit setelah pemisah terakhir (3 digit = ribuan). */
  function splitMoney(str) {
    var m = RE.exec(String(str == null ? '' : str)); if (!m) return null;
    var num = m[5], k = Math.max(num.lastIndexOf('.'), num.lastIndexOf(',')), dec = '', int = num;
    if (k > 0 && num.length - k - 1 >= 1 && num.length - k - 1 <= 2) { int = num.slice(0, k); dec = num.slice(k); }
    return { sign: m[2] || m[4] || '', cur: m[3] || '', int: int, dec: dec, unit: (m[6] || '').trim(), lead: m[1] || '' };
  }
  function decorate(el) {
    if (el.querySelector('.id-n')) return;                       // sudah didekorasi (tanpa loop)
    if (el.children.length) return;                              // elemen berisi markup lain: biarkan
    var p = splitMoney(el.textContent); if (!p) return;
    el.innerHTML = (p.sign ? '<span class="id-s">' + esc(p.sign) + '</span>' : '') + (p.cur ? '<span class="id-c">' + esc(p.cur) + '</span>' : '') +
      '<span class="id-n">' + esc(p.int) + '</span>' + (p.dec ? '<span class="id-d">' + esc(p.dec) + '</span>' : '') + (p.unit ? '<span class="id-u">' + esc(p.unit) + '</span>' : '');
  }

  /* ---------- 3. Gauge lengkung (menggantikan cincin bulat) ---------- */
  var ARCH44 = 'M6 41V23C6 14 14 9 22 3C30 9 38 14 38 23V41';
  function upgradeRing(svg) {
    if (svg.classList.contains('id-arch')) return;
    var a = svg.querySelector('.a'), t = svg.querySelector('.t'); if (!a || !t) return;
    var dash = a.getAttribute('stroke-dasharray') || '0 100', id = a.getAttribute('id'), op = a.style && a.style.opacity;
    svg.setAttribute('viewBox', '0 0 44 44');
    svg.innerHTML = '<path class="t" pathLength="100" d="' + ARCH44 + '"/><path class="a"' + (id ? ' id="' + id + '"' : '') + ' pathLength="100" stroke-dasharray="' + esc(dash) + '" d="' + ARCH44 + '"/>';
    if (op) svg.querySelector('.a').style.opacity = op;
    svg.classList.add('id-arch');
  }

  /* ---------- 4. Grafik equity SVG: anak tangga + arsiran + penanda ujung ---------- */
  function pairs(d) { var out = [], re = /[MLHV]?\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, m; while ((m = re.exec(d))) out.push([+m[1], +m[2]]); return out; }
  function f1(n) { return (Math.round(n * 10) / 10).toString(); }
  /* anak tangga "step-after": nilai hari ke-i bertahan sampai hari berikutnya. Titik data tetap berada di jalur garis. */
  function stepify(line, area) {
    var d0 = line.getAttribute('d') || '', pts = pairs(d0); if (pts.length < 2) return null;
    if (/C/.test(d0)) return pts[pts.length - 1]; // v17.01: sudah kurva halus (TouchChart) — jangan diubah jadi anak tangga
    if (W.TouchChart) { // v17.01: grafik halus, bukan patah-patah; titik data tetap berada di jalur garis
      var sm = W.TouchChart.smooth(pts.map(function (q) { return { x: q[0], y: q[1] }; })), last0 = pts[pts.length - 1];
      if (area) {
        var ap0 = pairs(area.getAttribute('d') || ''), y00 = ap0.length >= 2 ? ap0[ap0.length - 2][1] : pts[0][1];
        area.setAttribute('d', sm + 'L' + f1(last0[0]) + ' ' + f1(y00) + 'L' + f1(pts[0][0]) + ' ' + f1(y00) + 'Z');
      }
      line.setAttribute('d', sm);
      return last0;
    }
    var d = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]), i;
    for (i = 1; i < pts.length; i++) d += 'H' + f1(pts[i][0]) + 'V' + f1(pts[i][1]);
    if (area) {
      var ap = pairs(area.getAttribute('d') || ''), y0 = ap.length >= 2 ? ap[ap.length - 2][1] : pts[0][1], last = pts[pts.length - 1];
      area.setAttribute('d', d + 'L' + f1(last[0]) + ' ' + f1(y0) + 'L' + f1(pts[0][0]) + ' ' + f1(y0) + 'Z');
    }
    line.setAttribute('d', d);
    return pts[pts.length - 1];
  }
  function upgradeEquity(svg) {
    if (svg.classList.contains('id-step')) return;
    var area = null, line = null, ps = svg.querySelectorAll('path'), i;
    for (i = 0; i < ps.length; i++) {
      if (ps[i].getAttribute('fill') === 'url(#v5g)') area = ps[i];
      else if (ps[i].hasAttribute('stroke') && ps[i].getAttribute('fill') === 'none') line = ps[i];
    }
    if (!line) return;
    var up = line.getAttribute('stroke') !== 'var(--loss)', end = stepify(line, area); if (!end) return;
    var col = up ? 'var(--win)' : 'var(--loss)', g = D.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'id-end'); g.setAttribute('transform', 'translate(' + f1(end[0]) + ' ' + f1(end[1]) + ')' + (up ? '' : ' scale(1 -1)'));
    // lengkung kecil berdiri di atas titik (profit) atau tergantung di bawahnya (loss); alas lengkung = titik data
    g.innerHTML = '<path class="pin" fill="' + col + '" d="M-4.5 -3V-8C-4.5 -11.5 -2 -14 0 -17C2 -14 4.5 -11.5 4.5 -8V-3Z"/><circle class="pt" r="3.2" fill="' + col + '"/>';
    svg.insertBefore(g, svg.querySelector('#v5-dot'));
    svg.style.overflow = 'visible';
    svg.classList.add('id-step');
  }
  /* sparkline Beranda editorial (.ed-spark): garis anak tangga; penanda ujung dibentuk CSS (.ed-sp-dot) */
  function upgradeSpark(sp) {
    if (sp.hasAttribute('data-id-step')) return;
    var line = sp.querySelector('path.ed-sp-path'), area = sp.querySelector('path.ed-sp-area'); if (!line) return;
    if (stepify(line, area)) sp.setAttribute('data-id-step', '1');
  }

  /* pola arsiran (didefinisikan sekali di dokumen; warna dari token tema, jadi ikut terang/gelap) */
  function ensureDefs() {
    if (D.getElementById('id-defs') || !D.body) return;
    var s = D.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('id', 'id-defs'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    s.innerHTML = '<defs>' +
      '<pattern id="idHatchUp" class="h-up" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6"/></pattern>' +
      '<pattern id="idHatchDn" class="h-dn" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6"/></pattern></defs>';
    D.body.insertBefore(s, D.body.firstChild);
  }

  /* ---------- 5. Plugin Chart.js (line chart saja) ---------- */
  var hatchCache = {};
  function hatch(color, light) {
    var key = color + (light ? 'L' : 'D'); if (hatchCache[key]) return hatchCache[key];
    var c = D.createElement('canvas'); c.width = c.height = 8; var x = c.getContext('2d'); if (!x) return color;
    x.strokeStyle = color; x.globalAlpha = light ? .5 : .4; x.lineWidth = 1.3;
    x.beginPath(); x.moveTo(-1, 9); x.lineTo(9, -1); x.moveTo(-1, 1); x.lineTo(1, -1); x.moveTo(7, 9); x.lineTo(9, 7); x.stroke();
    return (hatchCache[key] = x.createPattern(c, 'repeat') || color);
  }
  function registerChart() {
    if (!W.Chart || !W.Chart.register) return false;
    if (W.Chart.registry && W.Chart.registry.plugins && W.Chart.registry.plugins.get && (function () { try { return W.Chart.registry.plugins.get('doaIdentity'); } catch (e) { return null; } })()) return true;
    W.Chart.register({
      id: 'doaIdentity',
      beforeUpdate: function (chart) {
        if (chart.config.type !== 'line') return;
        var light = D.body.classList.contains('light');
        chart.data.datasets.forEach(function (ds) {
          if (W.TouchChart) { ds.stepped = false; ds.tension = .4; ds.cubicInterpolationMode = 'monotone'; ds.borderJoinStyle = 'round'; } else { ds.stepped = 'after'; ds.tension = 0; ds.borderJoinStyle = 'miter'; } // v17.01: halus
          if (typeof ds.borderColor === 'string') ds.backgroundColor = hatch(ds.borderColor, light);
        });
      },
      afterDatasetsDraw: function (chart) {
        if (chart.config.type !== 'line') return;
        var meta = chart.getDatasetMeta(0), ds = chart.data.datasets[0], n = meta && meta.data ? meta.data.length : 0; if (!n || !ds) return;
        var pt = meta.data[n - 1], c = chart.ctx, col = typeof ds.borderColor === 'string' ? ds.borderColor : '#c8a96a', area = chart.chartArea;
        var zero = chart.scales.y ? chart.scales.y.getPixelForValue(0) : null;
        c.save();
        if (zero != null && zero > area.top && zero < area.bottom) {   // garis nol bertitik
          c.strokeStyle = D.body.classList.contains('light') ? '#8a6a10' : '#c8a96a'; c.globalAlpha = .75; c.lineWidth = 1.5; c.setLineDash([1, 5]); c.lineCap = 'round';
          c.beginPath(); c.moveTo(area.left, zero); c.lineTo(area.right, zero); c.stroke(); c.setLineDash([]);
        }
        c.globalAlpha = 1; c.fillStyle = col; c.strokeStyle = D.body.classList.contains('light') ? '#fff' : '#0e0f11'; c.lineWidth = 1.5;
        var dir = (ds.data[n - 1] >= 0) ? -1 : 1, x = pt.x, y = pt.y;       // lengkung runcing (lancet) di ujung kurva
        c.beginPath(); c.moveTo(x - 4.5, y + dir * 3); c.lineTo(x - 4.5, y + dir * 8);
        c.bezierCurveTo(x - 4.5, y + dir * 11.5, x - 2, y + dir * 14, x, y + dir * 17);
        c.bezierCurveTo(x + 2, y + dir * 14, x + 4.5, y + dir * 11.5, x + 4.5, y + dir * 8);
        c.lineTo(x + 4.5, y + dir * 3); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.fill(); c.stroke();
        c.restore();
      }
    });
    return true;
  }

  /* ---------- pemindai: idempoten, dipanggil tiap kali DOM berubah (1x per frame) ---------- */
  var obs = null, queued = false;
  function scan() {
    queued = false;
    if (obs) obs.disconnect();
    try {
      placeMarks();
      var nodes = D.querySelectorAll(NUM_SEL), i;
      for (i = 0; i < nodes.length; i++) decorate(nodes[i]);
      var rings = D.querySelectorAll('svg.stx-ring, .hm-ring svg');
      for (i = 0; i < rings.length; i++) upgradeRing(rings[i]);
      var eq = D.querySelectorAll('.v5-eq svg');
      for (i = 0; i < eq.length; i++) upgradeEquity(eq[i]);
      var sps = D.querySelectorAll('.ed-spark');
      for (i = 0; i < sps.length; i++) upgradeSpark(sps[i]);
    } catch (e) { if (W.console) console.warn('DoaIdentity', e); }
    if (obs) { obs.takeRecords(); obs.observe(D.body, { childList: true, subtree: true }); }
  }
  function queue() { if (queued) return; queued = true; (W.requestAnimationFrame || W.setTimeout)(scan, 16); }

  /* ---------- 6. Pindah halaman ---------- */
  var rule = null, trT = 0;
  function transition(view) {
    if (!rule) { rule = D.createElement('div'); rule.id = 'id-rule'; rule.setAttribute('aria-hidden', 'true'); D.body.appendChild(rule); }
    var h = D.querySelector('#app > header.app-header, header.app-header');
    if (h) rule.style.setProperty('--id-rule-top', Math.max(0, Math.round(h.getBoundingClientRect().bottom)) + 'px');
    var host = D.getElementById('view-' + view), k = host ? host.children : [], i, n = 0;
    for (i = 0; i < k.length && n < 7; i++) if (!k[i].classList.contains('hidden')) k[i].style.setProperty('--id-i', n++);
    html.setAttribute('data-id-tr', '1');
    rule.classList.remove('go'); void rule.offsetWidth; rule.classList.add('go');
    clearTimeout(trT); trT = setTimeout(function () { html.removeAttribute('data-id-tr'); rule.classList.remove('go'); }, 760);
  }

  function start() {
    if (!D.body) return;
    ensureDefs(); registerChart();
    html.classList.add('id-on');
    obs = new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) { if (recs[i].addedNodes.length || recs[i].type === 'childList') { queue(); return; } }
    });
    scan();
    W.addEventListener('viewchange', function (ev) { var v = ev && ev.detail && ev.detail.view; if (v) transition(v); });
    // font angka dimuat belakangan: ukur ulang agar angka panjang tidak meluber
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(function () { try { if (W.Money && W.Money.fitAll) W.Money.fitAll(); } catch (e) {} });
    if (!W.Chart) { var tries = 0, iv = setInterval(function () { if (registerChart() || ++tries > 40) clearInterval(iv); }, 250); }
  }

  W.DoaIdentity = { version: '16.99', markHTML: markHTML, splitMoney: splitMoney, upgrade: scan };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
