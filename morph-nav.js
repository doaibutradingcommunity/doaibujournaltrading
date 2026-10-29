/* v16.79 · Morphing Glass Navigation
   Tidak mengubah logika navigasi. Skrip hanya MEMBACA status (kelas .active pada tab desktop, variabel --i pada dock HP)
   dan menggerakkan kapsul kaca. Tanpa skrip ini, tampilan sama seperti v16.78.

   Desktop: satu <span class="mg-ind"> disisipkan ke .nav-wrap. Posisi akhir dipasang langsung (left/top/width/height),
            lalu animasi FLIP memakai transform saja: kapsul memanjang menutup jarak antar-tab, lalu menyusut di tab tujuan.
   HP     : .npv-ind sudah meluncur sendiri (CSS). Skrip hanya memberi arah + jarak untuk efek morph di ::before.
   Fallback: prefers-reduced-motion, html.mo-lite, data-ui-effects="low", atau tanpa Element.animate → pindah langsung. */
(function () {
  'use strict';
  var D = document, root = D.documentElement;
  if (window.DoaMorphNav) return;

  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function motionOff() {
    return !!(mqReduce && mqReduce.matches) ||
      root.classList.contains('mo-lite') ||
      root.getAttribute('data-ui-effects') === 'low' ||
      typeof Element.prototype.animate !== 'function';
  }

  /* =====================================================================
     Desktop / tablet: indikator bersama
     ===================================================================== */
  var wrap = null, ind = null, anim = null;
  var lastBtn = null, lastGeom = null, shown = false, pending = 0;

  function activeBtn() {
    var list = wrap.querySelectorAll('.nav-pill-btn.active');
    for (var i = 0; i < list.length; i++) if (list[i].offsetWidth > 0) return list[i];   // tab sekunder disembunyikan (npv-sec)
    return null;
  }

  /* Posisi relatif ke .nav-wrap lewat offset* (abaikan transform seperti :active scale); tombol bisa berada di dalam .ms-grp. */
  function geom(el) {
    var x = 0, y = 0, n = el;
    while (n && n !== wrap) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    if (n !== wrap) {                                   // rantai offsetParent tidak sampai ke wrap: pakai rect
      var w = wrap.getBoundingClientRect(), b = el.getBoundingClientRect();
      x = b.left - w.left - wrap.clientLeft; y = b.top - w.top - wrap.clientTop;
    }
    return { x: x, y: y, w: el.offsetWidth, h: el.offsetHeight };
  }
  function sameGeom(a, b) { return !!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h; }

  function place(g) {
    var s = ind.style;
    s.left = g.x + 'px'; s.top = g.y + 'px'; s.width = g.w + 'px'; s.height = g.h + 'px';
  }

  function stopAnim() { if (anim) { try { anim.cancel(); } catch (e) {} anim = null; } }

  function hide() {
    stopAnim();
    ind.style.opacity = '0';
    shown = false; lastBtn = null; lastGeom = null;
  }

  /* FLIP: kotak awal (A) → kotak akhir (B). Di tengah jalan kapsul memanjang menutup jarak, sedikit pipih. */
  function morph(A, B) {
    var ax = A.left - B.left, ay = A.top - B.top;
    var asx = A.width / (B.width || 1), asy = A.height / (B.height || 1);
    var cA = A.left + A.width / 2, cB = B.left + B.width / 2;
    var dist = Math.abs(cB - cA);
    var sx = Math.min(1.7, 1 + dist / ((B.width || 1) * 2.2));        // 1 tab ≈ 1.45×, lompatan jauh dibatasi 1.7×
    var midLeft = (cA + cB) / 2 - (B.width * sx) / 2;
    var f0 = 'translate(' + ax + 'px,' + ay + 'px) scale(' + asx + ',' + asy + ')';
    var f1 = 'translate(' + (midLeft - B.left) + 'px,' + (ay / 2) + 'px) scale(' + sx + ',.9)';
    var ms = Math.round(380 + Math.min(160, dist * 0.4));
    try {
      anim = ind.animate([
        { transform: f0, filter: 'none', easing: 'cubic-bezier(.45,0,.55,1)' },
        { transform: f1, filter: 'brightness(1.14)', offset: .42, easing: 'cubic-bezier(.2,.9,.3,1)' },
        { transform: 'none', filter: 'none' }
      ], { duration: ms });
      anim.onfinish = anim.oncancel = function () { anim = null; };
    } catch (e) { anim = null; }
  }

  function update() {
    if (!wrap || !ind) return;
    var btn = activeBtn();
    if (!btn) { hide(); return; }

    var g = geom(btn);
    if (g.w === 0 || g.h === 0) { hide(); return; }
    if (btn === lastBtn && sameGeom(g, lastGeom)) return;               // tidak ada perubahan: jangan ganggu animasi berjalan

    var running = !!anim;
    var from = null;
    if (shown && !motionOff() && (btn !== lastBtn || running)) from = ind.getBoundingClientRect();   // kotak visual saat ini (termasuk animasi berjalan)

    stopAnim();
    place(g);
    ind.style.opacity = '1';
    if (from && from.width > 0) morph(from, ind.getBoundingClientRect());

    lastBtn = btn; lastGeom = g; shown = true;
  }

  function schedule() {
    if (pending) return;
    pending = window.requestAnimationFrame ? window.requestAnimationFrame(function () { pending = 0; update(); }) : (update(), 0);
  }

  function initDesktop() {
    wrap = D.querySelector('#nav-scroll .nav-wrap');
    if (!wrap || wrap.querySelector(':scope > .mg-ind')) return;
    ind = D.createElement('span');
    ind.className = 'mg-ind'; ind.setAttribute('aria-hidden', 'true');
    wrap.insertBefore(ind, wrap.firstChild);
    wrap.classList.add('mg-on');

    if (window.MutationObserver) {
      // .active berpindah (app), tombol dikelompokkan / ditambah (menu-settings.js). Atribut 'style' tidak diamati → tidak ada putaran balik.
      new MutationObserver(schedule).observe(wrap, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
    }
    if (window.ResizeObserver) new ResizeObserver(schedule).observe(wrap);   // ganti bahasa, ukuran teks, header tampil setelah login
    window.addEventListener('resize', schedule, { passive: true });
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(schedule);
    if (D.fonts && D.fonts.addEventListener) D.fonts.addEventListener('loadingdone', schedule);
    update();
  }

  /* =====================================================================
     HP: arah + jarak lompatan untuk morph .npv-ind
     ===================================================================== */
  var dock = null, dInd = null, lastIdx = null, dockTimer = 0;

  function readIdx() {
    var v = parseFloat(dock.style.getPropertyValue('--i'));
    return isNaN(v) ? null : v;
  }
  function endDock() { if (dInd) dInd.classList.remove('mg-go'); }

  function onDock() {
    var i = readIdx();
    if (i === null || dock.hasAttribute('data-none')) { if (i !== null) lastIdx = i; return; }
    var prev = lastIdx; lastIdx = i;
    if (prev === null || prev === i || motionOff()) return;

    var span = Math.abs(i - prev);
    dInd.setAttribute('data-mg-dir', i > prev ? 'r' : 'l');
    dInd.style.setProperty('--mg-sx', String(Math.min(1.55, 1 + 0.16 * span)));
    dInd.classList.remove('mg-go');
    void dInd.offsetWidth;                                   // mulai ulang animasi bila berpindah beruntun
    dInd.classList.add('mg-go');
    window.clearTimeout(dockTimer);
    dockTimer = window.setTimeout(endDock, 560);             // jaring pengaman bila animationend tidak datang
  }

  function initDock() {
    dock = D.querySelector('.npv-dock');
    dInd = dock && dock.querySelector('.npv-ind');
    if (!dock || !dInd) return;
    lastIdx = readIdx();
    dInd.addEventListener('animationend', function (e) { if (e.animationName === 'mg-dock-morph') endDock(); });
    // sync() di index.html mengisi --i lewat style dan data-none lewat atribut; gaya pada anak (.npv-ind) tidak diamati
    if (window.MutationObserver) new MutationObserver(onDock).observe(dock, { attributes: true, attributeFilter: ['style', 'data-none'] });
  }

  /* ---------- mulai ---------- */
  function init() { if (!ind) initDesktop(); if (!dInd) initDock(); }
  init();
  // dock dan tab dibuat oleh skrip lain; coba lagi setelah semuanya selesai dimuat bila belum ada
  if (!ind || !dInd) window.addEventListener('load', init);

  window.DoaMorphNav = { refresh: schedule, _update: update };
})();
