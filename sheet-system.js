/* v16.71 · Premium Sheet System — skrip (tanpa dependensi)
   Seluruh tampilan ada di sheet-system.css. Skrip ini:
     1. mengenali tiap sheet/modal (daftar REG) dan memberi handle yang bisa ditarik;
     2. menyusun Profil / Pengingat / Input Kalender menjadi judul tetap | isi menggulir | aksi tetap;
     3. menyeragamkan tombol tutup (kelas .ss-x + label sesuai bahasa);
     4. geser-tutup: TIDAK menutup sendiri, melainkan mengklik tombol tutup milik komponen itu
        (agar konfirmasi "perubahan belum tersimpan" tetap jalan);
     5. Filter: pilihan sedikit (sesi, arah, urutan) tampil sebagai chip besar; <select> asli tetap ada dan dipakai aplikasi;
     6. mengukur keyboard lewat visualViewport (--ss-kb, --ss-vvh) dan mengunci gulir halaman saat sheet terbuka.
   Tidak menyentuh data/Firestore/logika. Menambah class html.ss-on saat siap. */
(function () {
  'use strict';
  var W = window, D = document, H = D.documentElement;
  if (H.classList.contains('ss-on')) return;

  var T = { id: 'Tutup', en: 'Close', ms: 'Tutup', es: 'Cerrar' };
  function lang() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return T[l] ? l : 'id'; }
  function $(id) { return D.getElementById(id); }
  var mqM = W.matchMedia ? W.matchMedia('(max-width: 640px)') : { matches: false };
  var mqR = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  /* ---------- Daftar sheet ---------- */
  function journalBlocked() { var s = $('jf-status'), st = s && s.getAttribute('data-state'); return st === 'unsaved' || st === 'saving' || st === 'draftfail'; }
  var REG = [
    { id: 'profile',  sheet: '#profile-modal > .glass',        close: '#btn-close-profile',        norm: 'profile',  grab: 1, drag: 1 },
    { id: 'reminder', sheet: '#reminder-modal > .glass',       close: '#rem-close',                norm: 'reminder', grab: 1, drag: 1 },
    { id: 'calendar', sheet: '#calendar-entry-modal > .glass', close: '#btn-close-calendar-entry', norm: 'calendar', grab: 1, drag: 1 },
    { id: 'journal',  sheet: '#jw-card',                       close: '#btn-cancel-form', head: '.jf-top', grab: 1, drag: 1, guard: journalBlocked },
    { id: 'recap',    sheet: '#v22-recap > [role="dialog"]',   close: '#v22-x',           head: '.rc-h',   grab: 1, drag: 1 },
    { id: 'sp',       sheet: '#sp-modal .sp-sheet',            close: '.sp-x',            head: '.sp-mh',  grab: 1, drag: 1 },
    { id: 'picker',   sheet: '.jr-pick',                       close: '.jr-pick-x',       head: '.jr-pick-h', grab: 1, drag: 1 },
    { id: 'ws',       sheet: '.v23-pn',                        close: '[data-v23-close]', head: '.v23-hd', grab: 1, drag: 1 },
    { id: 'filter',   sheet: '#filter-panel',                  close: '.mf-fs-x', native: 1, open: function () { return D.body.classList.contains('mf-sheet-open'); } },
    { id: 'detail',   sheet: '.jd-panel',                      close: '.jd-x',    native: 1, open: function (s) { return s.classList.contains('on') && !s.hidden; } }
  ];

  /* ---------- Util ---------- */
  function visible(el) {
    if (!el || !el.isConnected) return false;
    var cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden';
  }
  function isOpen(s) {
    var e = s.__ss; if (!e) return false;
    if (e.open) return !!e.open(s);
    var ov = s.parentElement;
    return !!(ov && !ov.classList.contains('hidden') && !ov.hidden && visible(s));
  }
  function docked(s) {
    if (!mqM.matches) return false;
    var ov = s.parentElement, r = s.getBoundingClientRect(), o = ov ? ov.getBoundingClientRect() : { bottom: W.innerHeight };
    return r.width >= W.innerWidth * 0.9 && Math.abs(o.bottom - r.bottom) < 3;
  }

  /* ---------- Tombol tutup ---------- */
  function markClose(s) {
    var e = s.__ss, label = T[lang()];
    [].forEach.call(s.querySelectorAll(e.close), function (b) {
      if (!b.classList.contains('ss-x')) b.classList.add('ss-x');
      if (b.getAttribute('data-ss-label') !== label) b.setAttribute('data-ss-label', label);
      if (!b.getAttribute('aria-label') && !(b.textContent || '').replace(/[×✕x\s]/gi, '')) b.setAttribute('aria-label', label);
    });
  }

  /* ---------- Anatomi head / body / foot (Profil, Pengingat, Kalender) ---------- */
  function normalize(s, kind) {
    if (s.getAttribute('data-ss-norm')) return;
    var kids = [].filter.call(s.children, function (c) { return !c.classList.contains('ss-grab'); });
    var head = kids[0]; if (!head) return;
    head.classList.add('ss-head');
    var body = D.createElement('div'); body.className = 'ss-body';
    kids.slice(1).forEach(function (k) { body.appendChild(k); });
    var foot = D.createElement('div'); foot.className = 'ss-foot';
    function toFoot(el) { if (el) foot.appendChild(el); }
    if (kind === 'profile' || kind === 'calendar') {
      var fid = kind === 'profile' ? 'profile-form' : 'calendar-entry-form';
      var b = body.querySelector('#' + fid + ' [type="submit"]');
      if (b) { b.setAttribute('form', fid); toFoot(b); }   // tombol di luar <form> tetap mengirim form (atribut form=)
    } else if (kind === 'reminder') {
      var t = body.querySelector('#rem-test'), sv = body.querySelector('#rem-save'), row = sv && sv.parentNode;
      toFoot(t); toFoot(sv);
      if (row && row.parentNode && !row.children.length) row.parentNode.removeChild(row);
    }
    s.appendChild(body);
    if (foot.children.length) s.appendChild(foot);
    s.setAttribute('data-ss-norm', '1');
  }

  /* ---------- Geser untuk menutup ---------- */
  var drag = null;
  function rubber(d) { return 60 * (1 - Math.exp(-d / 120)); }
  function clearStyle(s) { s.style.transform = ''; s.style.transition = ''; s.classList.remove('ss-dragging'); }
  function spring(s) {
    s.style.transition = mqR.matches ? 'none' : 'transform .34s cubic-bezier(.22,1,.36,1)'; s.style.transform = '';
    setTimeout(function () { s.style.transition = ''; }, 380);
  }
  function clickClose(s) {
    var b = s.querySelector(s.__ss.close);
    if (b) b.click();
  }
  function onDown(ev) {
    if (W.__nsDrag) return;   // v16.87: mesin tarik tunggal ada di native-sheet.js
    var h = ev.currentTarget, s = h.closest('.ss-sheet'); if (!s || !s.__ss || !s.__ss.drag || drag) return;
    if (!ev.isPrimary || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    if (!docked(s)) return;
    if (ev.target.closest && ev.target.closest('button,a,input,select,textarea,label,summary,[role="button"],[contenteditable]')) return;
    var e = s.__ss;
    drag = { s: s, h: h, id: ev.pointerId, y0: ev.clientY, t0: ev.timeStamp, py: ev.clientY, pt: ev.timeStamp, vel: 0, dy: 0, on: false, blocked: !!(e.guard && e.guard()) };
  }
  function onMove(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    var dy = ev.clientY - drag.y0;
    if (!drag.on) {
      if (Math.abs(dy) < 6) return;
      drag.on = true; drag.s.classList.add('ss-dragging'); drag.s.style.transition = 'none';
      try { drag.h.setPointerCapture(ev.pointerId); } catch (x) {}
    }
    var dt = Math.max(1, ev.timeStamp - drag.pt); drag.vel = 0.8 * drag.vel + 0.2 * ((ev.clientY - drag.py) / dt);
    drag.py = ev.clientY; drag.pt = ev.timeStamp;
    var y = dy < 0 ? 0 : (drag.blocked ? rubber(dy) : dy);
    drag.dy = y; drag.s.style.transform = 'translate3d(0,' + y + 'px,0)';
  }
  function onUp(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    var d = drag; drag = null; var s = d.s;
    s.classList.remove('ss-dragging');
    if (!d.on) return;
    var h = s.offsetHeight, commit = ev.type !== 'pointercancel' && (d.dy > Math.min(110, h * 0.3) || (d.vel > 0.6 && d.dy > 40));
    if (!commit) { spring(s); return; }
    if (d.blocked) { spring(s); clickClose(s); return; }     // ada perubahan belum tersimpan: biarkan komponen menanyakan
    s.style.transition = mqR.matches ? 'none' : 'transform .2s cubic-bezier(.4,0,1,1)';
    s.style.transform = 'translate3d(0,' + (h + 40) + 'px,0)';
    setTimeout(function () {
      clickClose(s);
      setTimeout(function () { if (s.isConnected && isOpen(s)) spring(s); else clearStyle(s); }, 90);   // ditolak komponen (mis. konfirmasi): kembali
    }, mqR.matches ? 0 : 200);
  }
  D.addEventListener('pointermove', onMove, { passive: true });
  D.addEventListener('pointerup', onUp, true);
  D.addEventListener('pointercancel', onUp, true);

  /* ---------- Adopsi ---------- */
  var adopted = [];
  function adopt(e, s) {
    if (s.__ss) return;
    s.__ss = e; adopted.push(s);
    if (!e.native) {
      s.classList.add('ss-sheet');
      if (s.parentElement) s.parentElement.classList.add('ss-ov');
      if (e.grab && !s.querySelector(':scope > .ss-grab')) {
        var g = D.createElement('div'); g.className = 'ss-grab'; g.setAttribute('aria-hidden', 'true'); s.insertBefore(g, s.firstChild);
        g.addEventListener('pointerdown', onDown);
      }
      if (e.norm) normalize(s, e.norm);
      var head = e.norm ? s.querySelector(':scope > .ss-head') : (e.head ? s.querySelector(e.head) : null);
      if (head && e.drag) { head.classList.add('ss-drag-zone'); head.addEventListener('pointerdown', onDown); }
    }
    markClose(s);
    var pend = 0;
    try {
      new MutationObserver(function () {   // isi sheet dirender ulang (detail trade, bahasa): pasang ulang kelas tutup
        if (pend) return; pend = requestAnimationFrame(function () { pend = 0; markClose(s); if (e.id === 'filter') chips(); });
      }).observe(s, { childList: true, subtree: true });
      var watch = function (n) { new MutationObserver(lockSync).observe(n, { attributes: true, attributeFilter: ['class', 'hidden'] }); };
      watch(s); if (s.parentElement && !e.native) watch(s.parentElement);
    } catch (x) {}
    if (e.id === 'filter') chips();
  }
  function scan() {
    REG.forEach(function (e) { [].forEach.call(D.querySelectorAll(e.sheet), function (s) { adopt(e, s); }); });
    lockSync();
  }
  var sq = 0; function schedScan() { if (sq) return; sq = requestAnimationFrame(function () { sq = 0; scan(); }); }

  /* ---------- Kunci gulir halaman ---------- */
  function lockSync() {
    adopted = adopted.filter(function (s) { return s.isConnected; });
    var any = adopted.some(isOpen);
    if (H.classList.contains('ss-locked') !== any) H.classList.toggle('ss-locked', any);
  }

  /* ---------- Filter: chip untuk pilihan sedikit ---------- */
  var CHIP_IDS = ['filter-session', 'filter-bias', 'filter-sort'];
  function chips() {
    var panel = $('filter-panel'); if (!panel) return;
    [].forEach.call(panel.querySelectorAll('select'), function (sel) {
      var host = sel.parentNode, opts = [].slice.call(sel.options), grp = host.querySelector(':scope > .ss-chips');
      if (CHIP_IDS.indexOf(sel.id) < 0 || opts.length < 2 || opts.length > 6) {   // Pair & Tag (daftar tumbuh): tetap <select>
        if (grp) { grp.remove(); sel.classList.remove('ss-chipped'); host.classList.remove('ss-has-chips'); }
        return;
      }
      var sig = opts.map(function (o) { return o.value + '\u0001' + o.textContent; }).join('\u0002');
      if (!grp || grp.__sig !== sig) {
        if (grp) grp.remove();
        grp = D.createElement('div'); grp.className = 'ss-chips'; grp.setAttribute('role', 'group'); grp.__sig = sig;
        var lb = host.querySelector('label');
        if (lb) { lb.id = lb.id || 'ss-l-' + (sel.id || 'x'); grp.setAttribute('aria-labelledby', lb.id); }
        opts.forEach(function (o) {
          var b = D.createElement('button'); b.type = 'button'; b.className = 'ss-chip'; b.textContent = o.textContent; b.setAttribute('data-v', o.value);
          b.addEventListener('click', function () {
            if (sel.value === o.value) return;
            sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); chips();
          });
          grp.appendChild(b);
        });
        host.appendChild(grp); sel.classList.add('ss-chipped'); host.classList.add('ss-has-chips');
      }
      [].forEach.call(grp.children, function (b) { var on = b.getAttribute('data-v') === sel.value; if (b.getAttribute('aria-pressed') !== String(on)) b.setAttribute('aria-pressed', String(on)); });
    });
  }
  setInterval(function () { if (D.body && D.body.classList.contains('mf-sheet-open')) chips(); }, 450);   // reset/populate mengubah nilai tanpa event

  /* ---------- Keyboard & area terlihat ---------- */
  var vv = W.visualViewport, mq = 0, lastVh = -1, lastKb = -1;
  function measure() {
    mq = 0;
    var ih = W.innerHeight, vh = ih, kb = 0;
    if (vv) {
      if (vv.scale > 1.02) vh = ih;                       // pinch-zoom bukan keyboard
      else { vh = vv.height; kb = Math.round(ih - vv.height - vv.offsetTop); if (kb < 80) kb = 0; }
    }
    vh = Math.round(vh);
    if (vh !== lastVh) { H.style.setProperty('--ss-vvh', vh + 'px'); lastVh = vh; }
    if (kb !== lastKb) { H.style.setProperty('--ss-kb', kb + 'px'); H.classList.toggle('ss-kb', kb > 0); lastKb = kb; }
  }
  function schedMeasure() { if (!mq) mq = requestAnimationFrame(measure); }
  if (vv) { vv.addEventListener('resize', schedMeasure); vv.addEventListener('scroll', schedMeasure); }
  W.addEventListener('resize', schedMeasure); W.addEventListener('orientationchange', function () { setTimeout(schedMeasure, 300); });

  /* ---------- Mulai ---------- */
  function start() {
    measure(); scan();
    try { new MutationObserver(schedScan).observe(D.body, { childList: true }); } catch (e) {}
    D.addEventListener('click', function () { setTimeout(schedScan, 60); }, true);
    W.addEventListener('viewchange', schedScan);
    H.classList.add('ss-on');
    W.SheetSystem = { version: '16.71', adopted: function () { return adopted.slice(); }, scan: scan, measure: measure };
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
