/* v16.87 · Native Sheet 2.0 — skrip (tanpa dependensi)
   Menggantikan native-sheet.js v16.86. Satu sistem untuk semua sheet/modal di HP; data, Firestore, dan logika komponen tidak diubah.
     1. GERAK     masuk .30s, keluar .22s, kurva sama untuk semua sheet (termasuk keluar yang dulu tidak ada: Profil, Pengingat, Kalender,
                  Journal, Rekap, Daftar trade, Filter); tarikan mengikuti jari 1:1, pelepasan memakai kecepatan jari (pegas), sheet yang
                  sedang kembali bisa "ditangkap" lagi; tirai ikut meredup.
     2. TARIK     satu mesin untuk handle, header, dan isi sheet (sheet baca/pilih). Menggantikan mesin tarik Detail trade (gesture-ui.js),
                  Filter (mobile-float.js), dan handle sheet-system.js lewat bendera window.__nsDrag.
     3. TINGGI    fit="content": tinggi mengikuti isi dan berubah halus saat isi berubah; fit="fixed": formulir panjang / bertab
                  (Journal, Trade 360, editor Strategi) memakai satu tinggi tetap yang sama.
     4. TUTUP     satu jalur untuk tombol tutup, ketuk tirai, Escape, tombol Kembali (Android), dan tarik: requestClose().
     5. BELUM TERSIMPAN  satu dialog yang sama untuk Profil, Pengingat, Kalender, editor Strategi, dan Trade 360 (menggantikan confirm() bawaan
                  browser). Journal tetap memakai dialog tiga pilihannya sendiri (Lanjut / Simpan draf / Buang).
     6. KEYBOARD  kolom yang difokus digulir ke area terlihat; papan ketik ditutup saat sheet ditutup atau ditarik.
   Menutup SELALU lewat tombol tutup milik komponen (klik). Membatalkan: hapus <link native-sheet.css> dan <script native-sheet.js>. */
(function () {
  'use strict';
  var W = window, D = document, H = D.documentElement;
  if (W.__nsV1687) return; W.__nsV1687 = true;
  W.__nsDrag = true;

  var mqM = W.matchMedia ? W.matchMedia('(max-width: 640px)') : { matches: false };
  var mqR = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var EASE = 'cubic-bezier(.32,.72,0,1)';
  var T_IN = 300, T_OUT = 220;

  var TXT = {
    id: { t: 'Buang perubahan?', b: 'Isian yang belum disimpan akan hilang.', k: 'Lanjut mengedit', d: 'Buang' },
    en: { t: 'Discard changes?', b: 'Anything you haven\u2019t saved will be lost.', k: 'Keep editing', d: 'Discard' },
    ms: { t: 'Buang perubahan?', b: 'Isian yang belum disimpan akan hilang.', k: 'Teruskan menyunting', d: 'Buang' },
    es: { t: '\u00bfDescartar cambios?', b: 'Lo que no hayas guardado se perder\u00e1.', k: 'Seguir editando', d: 'Descartar' }
  };
  function lang() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return TXT[l] ? l : 'id'; }
  function $(id) { return D.getElementById(id); }
  function journalBlocked() { var s = $('jf-status'), st = s && s.getAttribute('data-state'); return st === 'unsaved' || st === 'saving' || st === 'draftfail'; }
  function visible(el) { return !!(el && el.isConnected && el.getClientRects().length); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* esc: Escape · scrim: ketuk tirai menutup (sudah dilakukan komponen) · body: tarik dari isi · zone: header tambahan yang bisa ditarik · handle: pasang handle
     trap: komponen mengurung Tab sendiri · form: dirinya "belum tersimpan" dideteksi dari isian · own: komponen punya dialog sendiri (Journal)
     gate: komponen memakai confirm() saat ditutup (Trade 360) · soft: tebakan murah "ada perubahan" untuk hambatan tarikan
     selfExit: CSS komponen yang menganimasikan keluar · exitApi: komponen memanggil NativeSheet.exit() · scrimEl: tirai terpisah dari sheet */
  var REG = [
    { id: 'profile',  sheet: '#profile-modal > .glass',        close: '#btn-close-profile',        esc: 1, scrim: 1, form: 1, fit: 'content' },
    { id: 'reminder', sheet: '#reminder-modal > .glass',       close: '#rem-close',                esc: 1, scrim: 1, form: 1, fit: 'content' },
    { id: 'calendar', sheet: '#calendar-entry-modal > .glass', close: '#btn-close-calendar-entry', esc: 1, scrim: 1, form: 1, fit: 'content' },
    { id: 'journal',  sheet: '#jw-card',                       close: '#btn-cancel-form',          esc: 1, own: 1, soft: journalBlocked, fit: 'fixed' },
    { id: 'recap',    sheet: '#v22-recap > [role="dialog"]',   close: '#v22-x',                    body: 1, fit: 'content' },
    { id: 'sp',       sheet: '#sp-modal .sp-sheet',            close: '.sp-x',                     body: 1, fit: 'content', open: function () { var o = $('sp-modal'); return !!(o && o.classList.contains('open')); } },
    { id: 'picker',   sheet: '.jr-pick',                       close: '.jr-pick-x',                body: 1, fit: 'content' },
    { id: 'ws',       sheet: '.v23-pn',                        close: '[data-v23-close]',          body: 1, fit: 'content' },
    { id: 't3',       sheet: '.t3-ov > .t3',                   close: '.t3-back',                  handle: 1, trap: 1, gate: 1, selfExit: 1, fit: 'fixed',
      open: function (s) { return !!(s.parentElement && s.parentElement.classList.contains('on')); },
      soft: function () { return !!D.querySelector('.t3 [data-a="discard"]'); } },
    { id: 'sl',       sheet: '.sl-ov > .sl-sheet',             close: '[data-ed="cancel"]',        handle: 1, trap: 1, scrim: 1, form: 1, selfExit: 1, fit: 'fixed',
      open: function (s) { return !!(s.parentElement && s.parentElement.classList.contains('on')); } },
    { id: 'filter',   sheet: '#filter-panel',                  close: '.mf-fs-x',                  zone: '.mf-fs-head', body: 1, exitApi: 1, fit: 'content',
      scrimEl: function () { return D.querySelector('.mf-scrim'); }, open: function () { return D.body.classList.contains('mf-sheet-open'); } },
    { id: 'detail',   sheet: '.jd-panel',                      close: '.jd-x',                     zone: '.jd-head', body: 1, selfExit: 1, fit: 'content',
      scrimEl: function () { return D.querySelector('.jd-ov'); }, open: function (s) { return s.classList.contains('on') && !s.hidden; } }
  ];

  var all = [], stack = [], lastKbd = false;
  var ctx = { closing: false, force: false, ct: 0 };

  function top() { return stack[stack.length - 1]; }
  function parentOv(s) { var p = s.parentElement; return p && p !== D.body && p !== H ? p : null; }
  function scrimOf(s) { var e = s.__ns.e; return e.scrimEl ? e.scrimEl(s) : parentOv(s); }
  function isOpen(s) {
    var e = s.__ns && s.__ns.e; if (!e || !s.isConnected) return false;
    if (e.open) return !!e.open(s);
    var ov = parentOv(s);
    return !!(ov && !ov.hidden && !ov.classList.contains('hidden') && visible(s));
  }
  function docked(s) {
    if (!mqM.matches) return false;
    var r = s.getBoundingClientRect(), ov = parentOv(s), bottom = ov ? ov.getBoundingClientRect().bottom : W.innerHeight;
    return s.offsetWidth >= W.innerWidth * 0.9 && Math.abs(bottom - (r.bottom - curY(s))) < 3;   // posisi lepas dari animasi yang sedang berjalan
  }
  function clickClose(s) { var b = s.querySelector(s.__ns.e.close); if (b) b.click(); return !!b; }
  function markClosing() { ctx.closing = true; clearTimeout(ctx.ct); ctx.ct = setTimeout(function () { ctx.closing = false; }, 0); }
  function curY(s) { var m = getComputedStyle(s).transform; if (!m || m === 'none') return 0; try { return new DOMMatrixReadOnly(m).m42 || 0; } catch (e) { return 0; } }
  function blurIn(s) { var a = D.activeElement; if (a && a !== D.body && s.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { try { a.blur(); } catch (e) {} } }

  /* ============================================================ 4. Nama & peran dialog ============================================================ */
  function label(s) {
    if (s.getAttribute('role') === 'dialog' && (s.getAttribute('aria-label') || s.getAttribute('aria-labelledby'))) return;
    if (s.parentElement && s.parentElement.closest('[role="dialog"]')) return;
    if (s.getAttribute('role') !== 'dialog') s.setAttribute('role', 'dialog');
    if (s.getAttribute('aria-modal') !== 'true') s.setAttribute('aria-modal', 'true');
    if (s.getAttribute('aria-label') || s.getAttribute('aria-labelledby')) return;
    var h = s.querySelector('h1,h2,h3,[data-i18n$="Title"]');
    if (h && (h.textContent || '').trim()) { if (!h.id) h.id = 'ns-t-' + s.__ns.e.id; s.setAttribute('aria-labelledby', h.id); }
  }

  /* ============================================================ Fokus ============================================================ */
  function focusables(s) {
    return [].filter.call(s.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]'), function (n) {
      return !n.disabled && n.tabIndex >= 0 && !n.closest('[inert]') && !n.classList.contains('ns-grab') && !n.classList.contains('ss-grab') && n.type !== 'hidden' && visible(n);
    });
  }
  function enter(s) {
    if (!s.isConnected || s.contains(D.activeElement)) return;
    if (!s.hasAttribute('tabindex')) s.setAttribute('tabindex', '-1');
    var tgt = s;
    if (lastKbd) { var f = focusables(s); if (f.length) tgt = f[0]; }
    try { tgt.focus({ preventScroll: true }); } catch (e) {}
  }
  function leave(s) {
    var n = s.__ns, op = n.opener; n.opener = null;
    if (!op || !op.isConnected || !visible(op) || stack.length) return;
    var a = D.activeElement;
    if (a && a !== D.body && a.isConnected && !s.contains(a) && visible(a)) return;
    try { op.focus({ preventScroll: true }); } catch (e) {}
  }
  D.addEventListener('keydown', function (ev) {
    lastKbd = true;
    if (ev.key !== 'Tab' || ev.defaultPrevented || dlg.open) return;
    var s = top(); if (!s || s.__ns.e.trap) return;
    var f = focusables(s);
    if (!f.length) { ev.preventDefault(); try { s.focus({ preventScroll: true }); } catch (e) {} return; }
    var a = D.activeElement, first = f[0], last = f[f.length - 1];
    if (!s.contains(a)) { ev.preventDefault(); (ev.shiftKey ? last : first).focus(); }
    else if (ev.shiftKey && (a === first || a === s)) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && a === last) { ev.preventDefault(); first.focus(); }
  }, true);
  D.addEventListener('pointerdown', function () { lastKbd = false; }, true);

  /* ============================================================ 5. Belum tersimpan ============================================================
     Deteksi: foto isian saat PERTAMA kali pengguna menyentuh sheet (bukan saat dibuka, supaya isian yang diisi komponen secara
     asinkron tidak dianggap perubahan). Berubah lalu dikembalikan = tidak dianggap berubah. */
  function snap(s) {
    var p = [];
    [].forEach.call(s.querySelectorAll('input,select,textarea'), function (c) {
      var ty = c.type; if (ty === 'hidden' || ty === 'file' || ty === 'button' || ty === 'submit' || ty === 'reset' || ty === 'image') return;
      p.push(ty === 'checkbox' || ty === 'radio' ? (c.checked ? '1' : '0') : c.value);
    });
    [].forEach.call(s.querySelectorAll('[aria-pressed]'), function (b) { p.push(b.getAttribute('aria-pressed')); });
    p.push(s.querySelectorAll('.sl-rule,.sl-exi').length);
    return p.join('\u0001');
  }
  function formDirty(s) { var n = s.__ns; return !!(n && n.e.form && n.base != null && snap(s) !== n.base); }
  function arm(ev) {
    if (!ev.isTrusted) return;
    var t = ev.target, s = t && t.closest ? sheetOf(t) : null;
    if (s && s.__ns.e.form && s.__ns.base == null) s.__ns.base = snap(s);
  }
  ['pointerdown', 'touchstart', 'keydown', 'beforeinput'].forEach(function (k) { D.addEventListener(k, arm, true); });
  function resisting(s) { var e = s.__ns.e; return e.form ? formDirty(s) : (e.soft ? !!e.soft() : false); }

  var dlg = { el: null, open: false, done: null, prev: null, keep: null, drop: null };
  function buildDlg() {
    if (dlg.el) return;
    var ov = D.createElement('div'); ov.className = 'ns-dlg-ov'; ov.hidden = true;
    ov.innerHTML = '<div class="ns-dlg" role="alertdialog" aria-modal="true" aria-labelledby="ns-dlg-t" aria-describedby="ns-dlg-b"><h3 id="ns-dlg-t"></h3><p id="ns-dlg-b"></p>' +
      '<div class="ns-dlg-act"><button type="button" class="is-primary"></button><button type="button" class="is-destructive"></button></div></div>';
    D.body.appendChild(ov);
    dlg.el = ov; dlg.keep = ov.querySelector('.is-primary'); dlg.drop = ov.querySelector('.is-destructive');
    dlg.keep.addEventListener('click', function () { closeDlg('keep'); });
    dlg.drop.addEventListener('click', function () { closeDlg('discard'); });
    ov.addEventListener('click', function (e) { if (e.target === ov) closeDlg('keep'); });
    ov.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDlg('keep'); return; }
      if (e.key === 'Tab') {
        var f = dlg.keep, l = dlg.drop;
        if (e.shiftKey && D.activeElement === f) { e.preventDefault(); l.focus(); }
        else if (!e.shiftKey && D.activeElement === l) { e.preventDefault(); f.focus(); }
      }
    });
  }
  function openDlg(body, done) {
    buildDlg(); var T = TXT[lang()];
    dlg.prev = D.activeElement; dlg.done = done; dlg.open = true;
    dlg.el.querySelector('#ns-dlg-t').textContent = T.t; dlg.el.querySelector('#ns-dlg-b').textContent = body || T.b;
    dlg.keep.textContent = T.k; dlg.drop.textContent = T.d;
    dlg.el.hidden = false;
    requestAnimationFrame(function () { dlg.el.classList.add('on'); try { dlg.keep.focus({ preventScroll: true }); } catch (e) {} });
  }
  function closeDlg(choice) {
    if (!dlg.open) return;
    dlg.open = false; var f = dlg.done; dlg.done = null;
    dlg.el.classList.remove('on');
    setTimeout(function () { if (!dlg.open) dlg.el.hidden = true; }, mqR.matches ? 0 : 160);
    if (choice !== 'discard') { try { if (dlg.prev && dlg.prev.isConnected) dlg.prev.focus({ preventScroll: true }); } catch (e) {} }
    if (f) f(choice);
  }
  function askDiscard(s, body) {
    if (dlg.open) return;
    openDlg(body, function (c) { if (c === 'discard') discard(s); });
  }
  function discard(s) {
    var n = s.__ns; ctx.force = true;
    try { clickClose(s); } finally { ctx.force = false; }
    if (!isOpen(s)) n.base = null;
  }

  /* confirm() milik Trade 360 diganti dialog yang sama. Hanya saat penutupan sheet itu sedang diminta (markClosing) —
     confirm lain (hapus trade, buang perubahan, konflik simpan) tetap bawaan browser. */
  var nativeConfirm = W.confirm;
  if (typeof nativeConfirm === 'function') {
    W.confirm = function (msg) {
      var s = top();
      if (s && s.__ns.e.gate) {
        if (ctx.force) { ctx.force = false; return true; }
        if (ctx.closing) { ctx.closing = false; askDiscard(s, msg); return false; }
      }
      return nativeConfirm.apply(this, arguments);
    };
  }

  /* ============================================================ 4. Satu jalur menutup ============================================================ */
  function requestClose(s) {
    var n = s.__ns; if (!n || !n.open || dlg.open) return false;
    if (n.e.form && formDirty(s)) { askDiscard(s); return false; }
    if (n.e.gate) markClosing();
    return clickClose(s);
  }
  W.addEventListener('click', function (ev) {
    var t = ev.target; if (!t || !t.closest || !stack.length || ctx.force) return;
    if (t.closest('.ns-dlg-ov')) return;
    var s = top(), n = s.__ns, e = n.e; if (e.own) return;
    var x = t.closest(e.close), isX = !!(x && s.contains(x)), isScrim = !!(e.scrim && n.ov && t === n.ov);
    if (!isX && !isScrim) return;
    if (e.gate) { markClosing(); return; }
    if (e.form && formDirty(s)) { ev.preventDefault(); ev.stopImmediatePropagation(); askDiscard(s); }
  }, true);
  D.addEventListener('mousedown', function (ev) {      // Trade 360 menutup lewat mousedown di tirai
    var s = top(); if (s && s.__ns.e.gate && s.__ns.ov && ev.target === s.__ns.ov) markClosing();
  }, true);
  W.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape' || ev.isComposing) return;
    if (dlg.open) { ev.preventDefault(); ev.stopImmediatePropagation(); closeDlg('keep'); return; }
    if (ev.defaultPrevented) return;
    var s = top(); if (!s) return;
    if (D.querySelector('.jf-dlg-ov:not([hidden]),.jr-pick-ov,#image-zoom-modal:not(.hidden)')) return;
    var e = s.__ns.e;
    if (e.gate) { markClosing(); return; }                                            // Trade 360 menutup sendiri
    if (e.esc) { ev.preventDefault(); requestClose(s); return; }                      // belum punya Escape: tambahkan
    if (e.form && formDirty(s)) { ev.preventDefault(); ev.stopImmediatePropagation(); askDiscard(s); }   // editor Strategi: tahan dulu
  }, true);

  /* ---------- Tombol Kembali (Android / gesture iOS) ---------- */
  var pushed = null, ignorePops = 0, pushT = 0, popT = 0, tries = 0;
  function ownEntry() { var st = W.history.state; return !!(st && pushed && st.nsSheet === pushed); }
  function schedulePush() {
    clearTimeout(pushT);
    pushT = setTimeout(function () {
      if (!stack.length || pushed) return;
      var st = W.history.state;
      if (st && st.anSheet && tries++ < 8) return schedulePush();
      tries = 0;
      var tok = 'ns' + Date.now(), ns = {};
      if (st && typeof st === 'object') for (var k in st) if (Object.prototype.hasOwnProperty.call(st, k)) ns[k] = st[k];
      ns.nsSheet = tok;
      try { W.history.pushState(ns, ''); pushed = tok; } catch (e) {}
    }, 140);
  }
  function popOwn() {
    if (ownEntry()) { ignorePops++; pushed = null; try { W.history.back(); } catch (e) { ignorePops--; } } else pushed = null;
  }
  function histSync() {
    if (stack.length) { clearTimeout(popT); if (!pushed) schedulePush(); }
    else if (pushed) { clearTimeout(popT); popT = setTimeout(function () { if (!stack.length) popOwn(); }, 220); }
  }
  W.addEventListener('popstate', function () {
    if (ignorePops > 0) {
      ignorePops--;
      if (stack.length && !ownEntry()) { pushed = null; schedulePush(); }
      return;
    }
    if (pushed && !ownEntry()) {
      pushed = null;
      if (dlg.open) closeDlg('keep');
      else { var s = top(); if (s) requestClose(s); }
      setTimeout(function () { sync(); if (stack.length) schedulePush(); }, 220);    // ditolak / ditanyakan: pasang entri lagi
    }
  });

  /* ============================================================ 1. Gerak ============================================================ */
  function scrimNode(s) { var n = s.__ns, sc = scrimOf(s); if (!sc) return null; n.sep = !sc.contains(s); return sc; }
  function dim(s, k) {
    var n = s.__ns, sc = scrimNode(s); if (!sc) return;
    n.dim = true; k = clamp(k, 0, 1);
    if (n.sep) { sc.style.setProperty('transition', 'none', 'important'); sc.style.setProperty('opacity', k.toFixed(3), 'important'); return; }
    sc.style.setProperty('background', 'color-mix(in srgb, var(--amb-scrim, rgba(0,0,0,.46)) ' + (k * 100).toFixed(1) + '%, transparent)', 'important');
    var b = 'blur(calc(var(--amb-blur-scrim, 6px) * ' + k.toFixed(3) + '))';
    sc.style.setProperty('backdrop-filter', b, 'important'); sc.style.setProperty('-webkit-backdrop-filter', b, 'important');
  }
  function dimClear(s) {
    var n = s.__ns; if (!n || !n.dim) return; n.dim = false;
    var sc = scrimOf(s); if (!sc) return;
    ['background', 'backdrop-filter', '-webkit-backdrop-filter', 'opacity', 'transition'].forEach(function (p) { sc.style.removeProperty(p); });
  }
  function noAnim(s) { var n = s.__ns; if (n.noAnim) return; n.noAnim = true; s.style.setProperty('animation', 'none', 'important'); }
  function put(s, y) { s.style.transform = y === 0 ? '' : 'translate3d(0,' + y.toFixed(2) + 'px,0)'; }

  /* Pegas kritis (tanpa pantulan): melanjutkan kecepatan jari. v dalam px/detik. */
  function settle(s, from, to, v0, done) {
    var n = s.__ns; stopSettle(s); noAnim(s);
    var h = s.offsetHeight || 1, om = to === 0 ? 24 : 20, x = from, v = v0, last = 0, out = to !== 0;
    if (mqR.matches) { put(s, to); dim(s, 1 - to / h); if (done) done(); return; }
    s.classList.add('ns-settling');
    function frame(t) {
      if (!n.settling) return;
      if (!last) last = t;
      var dt = Math.min(0.032, (t - last) / 1000); last = t;
      var sub = Math.max(1, Math.ceil(dt / 0.008)), hh = dt / sub;
      for (var i = 0; i < sub; i++) { v += (-om * om * (x - to) - 2 * om * v) * hh; x += v * hh; }
      if (!out && x < 0) { x = 0; if (v < 0) v = 0; }
      var fin = out ? x >= h - 0.5 : (Math.abs(x - to) < 0.4 && Math.abs(v) < 8);
      if (fin) x = out ? h + 40 : to;
      put(s, x); dim(s, 1 - x / h);
      if (fin) { n.settling = 0; s.classList.remove('ns-settling'); if (!out) { dimClear(s); } if (done) done(); return; }
      n.settling = requestAnimationFrame(frame);
    }
    n.settling = requestAnimationFrame(frame);
  }
  function stopSettle(s) { var n = s.__ns; if (n && n.settling) { cancelAnimationFrame(n.settling); n.settling = 0; s.classList.remove('ns-settling'); } }

  /* ---------- Keluar untuk sheet yang disembunyikan komponen secara instan (display:none / dicabut dari DOM) ----------
     Pengamat mutasi berjalan sebelum frame digambar: overlay ditampilkan lagi sebentar, sheet meluncur turun, lalu disembunyikan. */
  function endLeave(s) {
    var n = s.__ns; if (!n || !n.leaving) return;
    var L = n.leaving; n.leaving = null; clearTimeout(L.tm);
    try { L.a1 && L.a1.cancel(); L.a2 && L.a2.cancel(); } catch (e) {}
    var ov = L.ov;
    ['display', 'visibility', 'opacity', 'pointer-events'].forEach(function (p) { ov.style.removeProperty(p); s.style.removeProperty(p); });
    if (L.moved && ov.parentNode) ov.parentNode.removeChild(ov);
    schedSync();
  }
  function leaveAnim(s) {
    var n = s.__ns, e = n.e, ov = n.ov;
    if (e.selfExit || e.exitApi || n.exited || !n.docked || !ov || mqR.matches || !mqM.matches) return;
    var moved = false;
    if (!ov.isConnected) {
      var hm = n.home; if (!hm || !hm.p || !hm.p.isConnected) return;
      hm.p.insertBefore(ov, hm.n && hm.n.parentNode === hm.p ? hm.n : null); moved = true;
    }
    ov.style.setProperty('display', n.disp && n.disp !== 'none' ? n.disp : 'flex', 'important');
    ov.style.setProperty('visibility', 'visible', 'important'); ov.style.setProperty('opacity', '1', 'important'); ov.style.setProperty('pointer-events', 'none', 'important');
    if (getComputedStyle(s).display === 'none') { if (moved) ov.parentNode.removeChild(ov); ['display', 'visibility', 'opacity', 'pointer-events'].forEach(function (p) { ov.style.removeProperty(p); }); return; }
    var h = s.offsetHeight || 300, dur = Math.round(clamp(T_OUT - 30 + h * 0.03, 190, T_OUT + 30));
    var L = { ov: ov, moved: moved, a1: null, a2: null, tm: 0 };
    var cs = getComputedStyle(ov), bg = cs.backgroundColor, bf = cs.backdropFilter || cs.webkitBackdropFilter;
    try {
      L.a1 = s.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,' + (h + 24) + 'px,0)' }], { duration: dur, easing: EASE, fill: 'forwards' });
      var kf0 = { backgroundColor: bg }, kf1 = { backgroundColor: 'rgba(0,0,0,0)' };
      if (bf && bf !== 'none') { kf0.backdropFilter = bf; kf1.backdropFilter = 'blur(0px)'; kf0.webkitBackdropFilter = bf; kf1.webkitBackdropFilter = 'blur(0px)'; }
      L.a2 = ov.animate([kf0, kf1], { duration: dur, easing: 'linear', fill: 'forwards' });
    } catch (x) { if (moved && ov.parentNode) ov.parentNode.removeChild(ov); ['display', 'visibility', 'opacity', 'pointer-events'].forEach(function (p) { ov.style.removeProperty(p); }); return; }
    n.leaving = L;
    L.tm = setTimeout(function () { endLeave(s); }, dur + 60);
  }

  /* API untuk komponen yang menyembunyikan sheet lewat kelas pada sheet itu sendiri (Filter): animasikan dulu, sembunyikan sesudahnya. */
  function exit(el, done) {
    var n = el && el.__ns;
    if (!n || !n.open || n.exiting || n.exited || !n.docked || mqR.matches || !mqM.matches) return false;
    n.exiting = true; stopSettle(el);
    var h = el.offsetHeight || 300, dur = Math.round(clamp(T_OUT - 30 + h * 0.03, 190, T_OUT + 30)), a1, a2, sc = scrimNode(el), fin = false;
    try {
      a1 = el.animate([{ transform: 'translate3d(0,' + curY(el) + 'px,0)' }, { transform: 'translate3d(0,' + (h + 24) + 'px,0)' }], { duration: dur, easing: EASE, fill: 'forwards' });
      if (sc && n.sep) a2 = sc.animate([{ opacity: parseFloat(getComputedStyle(sc).opacity) || 1 }, { opacity: 0 }], { duration: dur, easing: 'linear', fill: 'forwards' });
    } catch (x) { n.exiting = false; return false; }
    el.style.setProperty('pointer-events', 'none', 'important');
    function end() {
      if (fin) return; fin = true; n.exiting = false;
      try { done(); } catch (x) {}
      el.style.removeProperty('pointer-events');
      setTimeout(function () { try { a1.cancel(); a2 && a2.cancel(); } catch (x) {} }, 320);
    }
    a1.onfinish = end; setTimeout(end, dur + 80);
    return true;
  }

  /* ============================================================ 2. Tarik ============================================================ */
  var INTERACTIVE = 'button,a,input,select,textarea,label,summary,[role="button"],[role="slider"],[contenteditable],canvas,[data-ns-nodrag]';
  var BODYSKIP = 'input,select,textarea,[contenteditable],canvas,[role="slider"],[data-ns-nodrag]';
  var td = null;
  function sheetOf(t) { for (var i = stack.length - 1; i >= 0; i--) if (stack[i].contains(t)) return stack[i]; return null; }
  function zoneSel(e) { return '.ns-grab,.ss-grab,.ss-drag-zone' + (e.zone ? ',' + e.zone : ''); }
  function scrolledAbove(t, s) {
    for (var n = t; n && n.nodeType === 1; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 1 && n.scrollTop > 0) return true;
      if (n === s) break;
    }
    return false;
  }
  function rubber(d) { return 60 * (1 - Math.exp(-d / 120)); }

  D.addEventListener('touchstart', function (ev) {
    if (td || ev.touches.length !== 1 || dlg.open) return;
    var t = ev.target, s = t.closest ? sheetOf(t) : null; if (!s) return;
    var n = s.__ns, e = n.e; if (n.exiting || n.exited || !docked(s)) return;
    var y0 = n.settling ? curY(s) : 0, caught = !!(n.settling && y0 > 2 && s.classList.contains('ns-settling') && n.settleBack);
    var zone = t.closest(zoneSel(e)); if (zone && !s.contains(zone)) zone = null;
    if (!caught) {
      if (zone) { if (t.closest(INTERACTIVE)) return; }
      else { if (!e.body || t.closest(BODYSKIP) || scrolledAbove(t, s)) return; }
    }
    if (caught) stopSettle(s);
    var p = ev.touches[0];
    td = { s: s, t: t, x0: p.clientX, y0: p.clientY, py: p.clientY, pt: ev.timeStamp, vel: 0, hist: [[ev.timeStamp, p.clientY]], raw: 0, base: caught ? y0 : 0, y: caught ? y0 : 0, on: false, moved: false, zone: !!zone || caught, caught: caught, soft: resisting(s) };
    if (caught) { td.on = true; noAnim(s); s.classList.add('ns-dragging'); dim(s, 1 - y0 / (s.offsetHeight || 1)); }
  }, { passive: true });

  D.addEventListener('touchmove', function (ev) {
    if (!td) return;
    var p = ev.touches[0], dy = p.clientY - td.y0, dx = p.clientX - td.x0, s = td.s;
    if (!td.on) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { td = null; return; }
      if (dy < -6) { td = null; return; }
      if (dy < 4) return;
      if (!td.zone && scrolledAbove(td.t, s)) { td = null; return; }
      td.on = true; noAnim(s); s.classList.add('ns-dragging'); blurIn(s); dim(s, 1);
    }
    if (ev.cancelable) ev.preventDefault();
    td.moved = true;
    td.pt = ev.timeStamp; td.hist.push([ev.timeStamp, p.clientY]);
    while (td.hist.length > 2 && ev.timeStamp - td.hist[0][0] > 100) td.hist.shift();
    var h0 = td.hist[0], dt = Math.max(1, ev.timeStamp - h0[0]); td.vel = (p.clientY - h0[1]) / dt;   // px/ms dalam jendela 100 ms
    var raw = td.base + dy, y = raw < 0 ? 0 : (td.soft ? rubber(raw) : raw);
    td.raw = raw; td.y = y; put(s, y); dim(s, 1 - y / (s.offsetHeight || 1));
  }, { passive: false });

  function touchEnd(ev) {
    if (!td) return;
    var d = td; td = null; var s = d.s, n = s.__ns;
    s.classList.remove('ns-dragging');
    if (!d.on) return;
    var h = s.offsetHeight || 1, idle = ev.timeStamp - d.pt, vel = idle > 90 ? 0 : d.vel, vy = vel * 1000;
    var commit = ev.type !== 'touchcancel' && d.moved && vel > -0.35 && (d.raw > Math.min(110, h * 0.3) || (vel > 0.6 && d.raw > 24));
    if (!commit) { n.settleBack = true; settle(s, d.y, 0, vy, function () { n.settleBack = false; put(s, 0); }); return; }
    if (resisting(s)) {                         // ada yang belum tersimpan: kembali dulu, lalu tanya
      n.settleBack = true;
      settle(s, d.y, 0, Math.min(vy, 0), function () { n.settleBack = false; put(s, 0); requestClose(s); });
      return;
    }
    n.settleBack = false;
    settle(s, d.y, h + 40, Math.max(vy, 400), function () {
      n.exited = true; markClosing(); clickClose(s);
      setTimeout(function () {                    // ditolak komponen: kembali
        if (s.isConnected && isOpen(s)) { n.exited = false; n.settleBack = true; settle(s, h + 40, 0, 0, function () { n.settleBack = false; put(s, 0); dimClear(s); }); }
      }, 160);
    });
  }
  D.addEventListener('touchend', touchEnd, true);
  D.addEventListener('touchcancel', touchEnd, true);

  /* ============================================================ 3. Tinggi ============================================================
     Sheet fit="content": perubahan tinggi isi (detail yang selesai dimuat, bidang yang muncul) dianimasikan. Bagian bawah tetap menempel. */
  var kbAt = 0, mqKb = 0;
  function fitWatch(s) {
    if (!W.ResizeObserver || s.__ns.e.fit !== 'content') return;
    var n = s.__ns;
    new ResizeObserver(function () {
      if (!n.open || n.fitAnim || n.settling || n.exiting || n.exited || s.classList.contains('ns-dragging') || mqR.matches || !mqM.matches) { n.h = s.offsetHeight; return; }
      var h1 = s.offsetHeight, h0 = n.h || h1; n.h = h1;
      if (Math.abs(h1 - h0) < 8 || Date.now() - n.openedAt < 450 || Date.now() - kbAt < 500) return;
      try {
        var a = s.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 240, easing: EASE });
        n.fitAnim = a; var clr = function () { n.fitAnim = null; n.h = s.offsetHeight; }; a.onfinish = clr; a.oncancel = clr;
      } catch (x) {}
    }).observe(s);
  }

  /* ============================================================ 6. Keyboard ============================================================ */
  function scrollParent(t, s) {
    for (var n = t.parentElement; n; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 1) return n;
      if (n === s) break;
    }
    return null;
  }
  function reveal(t) {
    var s = sheetOf(t); if (!s || !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !mqM.matches) return;
    var sp = scrollParent(t, s); if (!sp) return;
    var vv = W.visualViewport, bottom = (vv ? vv.height + vv.offsetTop : W.innerHeight) - 12;
    var r = t.getBoundingClientRect(), pr = sp.getBoundingClientRect(), limit = Math.min(bottom, pr.bottom - 8), head = pr.top + 8, delta = 0;
    if (r.bottom > limit) delta = r.bottom - limit + 12; else if (r.top < head) delta = r.top - head - 12;
    if (delta) { try { sp.scrollBy({ top: delta, behavior: mqR.matches ? 'auto' : 'smooth' }); } catch (e) { sp.scrollTop += delta; } }
  }
  D.addEventListener('focusin', function (ev) { var t = ev.target; setTimeout(function () { if (D.activeElement === t) reveal(t); }, 320); }, true);
  if (W.visualViewport) {
    var lastKb = -1;
    W.visualViewport.addEventListener('resize', function () {
      var kb = Math.round(W.innerHeight - W.visualViewport.height); if (kb < 80) kb = 0;
      if (kb !== lastKb) { lastKb = kb; kbAt = Date.now(); }
      var a = D.activeElement; if (a && kb) requestAnimationFrame(function () { reveal(a); });
    });
  }

  /* ============================================================ Penanda sheet terbuka / tertutup ============================================================ */
  var sq = 0;
  function track(s) {
    var n = s.__ns, ov = parentOv(s);
    n.docked = docked(s); n.ov = ov;
    if (ov) { n.disp = getComputedStyle(ov).display; n.home = { p: ov.parentNode, n: ov.nextSibling }; }
  }
  function sync() {
    sq = 0;
    all = all.filter(function (s) { if (s.isConnected || s.__ns.open || s.__ns.leaving) return true; return false; });
    all.forEach(function (s) {
      var n = s.__ns; if (n.leaving) return;
      var o = isOpen(s);
      if (o && !n.open) openOne(s);
      else if (!o && n.open) closeOne(s);
      else if (o && n.open && !n.leaving) track(s);
    });
    all = all.filter(function (s) { return s.isConnected || s.__ns.leaving; });
    histSync();
  }
  function schedSync() { if (!sq) sq = requestAnimationFrame(sync); }
  function openOne(s) {
    var n = s.__ns; endLeave(s); stopSettle(s);
    n.open = true; n.openedAt = Date.now(); n.base = null; n.exited = false; n.exiting = false;
    s.style.transform = ''; s.style.transition = ''; s.classList.remove('ns-dragging', 'ns-settling'); dimClear(s);
    if (stack.indexOf(s) < 0) stack.push(s);
    track(s); n.h = s.offsetHeight;
    var a = D.activeElement; n.opener = a && a !== D.body && !s.contains(a) ? a : null;
    label(s);
    requestAnimationFrame(function () { if (n.open) enter(s); });
  }
  function closeOne(s) {
    var n = s.__ns; if (!n) return;
    var i = stack.indexOf(s); if (i >= 0) stack.splice(i, 1);
    if (n.open) {
      n.open = false; n.base = null;
      stopSettle(s); if (n.fitAnim) { try { n.fitAnim.cancel(); } catch (e) {} n.fitAnim = null; }
      blurIn(s);
      if (!n.exited) leaveAnim(s);
      if (s.isConnected) leave(s); else n.opener = null;
    }
    if (n.exited || !n.leaving) { s.style.transform = ''; s.style.transition = ''; s.classList.remove('ns-dragging', 'ns-settling'); }
    n.exited = false; n.settleBack = false;
    if (n.noAnim) { n.noAnim = false; s.style.removeProperty('animation'); }
    dimClear(s);
  }

  /* ---------- Handle untuk Trade 360 & editor Strategi ---------- */
  function addHandle(s) {
    if (s.querySelector(':scope > .ns-grab')) return;
    var g = D.createElement('div'); g.className = 'ns-grab'; g.setAttribute('aria-hidden', 'true');
    s.insertBefore(g, s.firstChild);
  }

  /* ============================================================ Adopsi ============================================================ */
  function adopt(e, s) {
    if (s.__ns) return;
    s.__ns = { e: e, open: false, opener: null, base: null, dim: false, sep: false, settling: 0, noAnim: false, settleBack: false, exited: false, exiting: false, leaving: null, fitAnim: null, h: 0, openedAt: 0, ov: null, disp: '', home: null, docked: false };
    all.push(s);
    s.setAttribute('data-ns-fit', e.fit || 'content');
    if (e.handle) addHandle(s);
    try {
      var mo = new MutationObserver(schedSync);
      mo.observe(s, { attributes: true, attributeFilter: ['class', 'hidden'] });
      if (s.parentElement) mo.observe(s.parentElement, { attributes: true, attributeFilter: ['class', 'hidden'] });
      fitWatch(s);
      if (e.handle) new MutationObserver(function () { addHandle(s); }).observe(s, { childList: true });   // komponen merender ulang isi (innerHTML) dan menghapus handle
    } catch (x) {}
  }
  function scan() { REG.forEach(function (e) { [].forEach.call(D.querySelectorAll(e.sheet), function (s) { adopt(e, s); }); }); sync(); }
  var scq = 0; function schedScan() { if (!scq) scq = requestAnimationFrame(function () { scq = 0; scan(); }); }

  function start() {
    scan();
    try {
      new MutationObserver(schedScan).observe(D.body, { childList: true });
      new MutationObserver(schedSync).observe(D.body, { attributes: true, attributeFilter: ['class'] });
    } catch (e) {}
    D.addEventListener('click', function () { setTimeout(schedScan, 60); }, true);
    W.addEventListener('viewchange', schedScan);
    H.classList.add('ns-on');
    W.NativeSheet = {
      version: '2.0', v2: true,
      open: function () { return stack.slice(); }, scan: scan,
      close: function (s) { return requestClose(s || top()); },
      exit: exit
    };
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
