/* Trading Wrapped: tampilan (v16.27)
   Halaman baru "Trading Wrapped" (#wrapped-section). Semua angka datang dari trading-wrapped.js (lokal, dari journalmu).
   Data yang DIBACA (tidak ada yang ditulis ke journal):
   - journal (allJournals), daftar strategy (StrategyLib.list), fokus AI Coach (localStorage aicoach:<uid> / users/{uid}.coachFocus),
     catatan fokus bulanan (localStorage v165focus:<YYYY-MM> / users/{uid}/reviews/focus_<YYYY-MM>)
   Ekspor: gambar PNG (kartu yang sedang dibuka) dan PDF (semua kartu) dibuat di perangkat; tidak ada upload. */
(function () {
  'use strict';
  if (typeof document === 'undefined' || !window.TradingWrapped) return;
  var TW = window.TradingWrapped;

  var T = {
    id: {
      title: 'Trading Wrapped', sub: 'Laporan visual mingguan, bulanan, dan tahunan dari journalmu: mudah dipahami dan siap dibagikan.', badge: 'Dihitung lokal · tanpa data dummy',
      week: 'Mingguan', month: 'Bulanan', year: 'Tahunan', per: 'Jenis laporan', prev: 'Periode sebelumnya', next: 'Periode berikutnya', running: 'Periode berjalan: angka masih bisa berubah.',
      cardN: 'Kartu', of: 'dari', prevC: 'Kartu sebelumnya', nextC: 'Kartu berikutnya', go: 'Buka kartu',
      png: 'Simpan gambar', share: 'Bagikan', pdf: 'Unduh PDF', busy: 'Menyiapkan', done: 'Tersimpan.', pngFail: 'Gagal membuat gambar. Coba lagi.', pdfLib: 'Library PDF belum termuat. Cek koneksi internet lalu coba lagi.', pdfFail: 'Gagal membuat PDF. Coba lagi.',
      shareFail: 'Berbagi dibatalkan atau tidak didukung. Gambar disimpan sebagai file.', text: 'Lihat sebagai teks',
      noData: 'Belum ada journal di periode ini', noDataS: 'Pilih periode lain dengan tombol panah, atau ganti jenis laporan.',
      emptyT: 'Belum ada journal', emptyS: 'Trading Wrapped dibuat dari journalmu. Catat beberapa trade dulu, lalu laporan visual muncul di sini.', emptyGo: 'Buat journal',
      loading: 'Memuat journal…', err: 'Gagal memuat journal.', retry: 'Coba lagi', note: 'Deskriptif dari data historismu. Bukan prediksi dan bukan saran trading.'
    },
    en: {
      title: 'Trading Wrapped', sub: 'A visual weekly, monthly and yearly report from your journal: easy to read and ready to share.', badge: 'Computed locally · no dummy data',
      week: 'Weekly', month: 'Monthly', year: 'Yearly', per: 'Report type', prev: 'Previous period', next: 'Next period', running: 'Period in progress: numbers can still change.',
      cardN: 'Card', of: 'of', prevC: 'Previous card', nextC: 'Next card', go: 'Open card',
      png: 'Save image', share: 'Share', pdf: 'Download PDF', busy: 'Preparing', done: 'Saved.', pngFail: 'Could not create the image. Try again.', pdfLib: 'The PDF library has not loaded. Check your connection and try again.', pdfFail: 'Could not create the PDF. Try again.',
      shareFail: 'Sharing was cancelled or is not supported. The image was saved as a file.', text: 'View as text',
      noData: 'No journals in this period', noDataS: 'Pick another period with the arrows, or change the report type.',
      emptyT: 'No journals yet', emptyS: 'Trading Wrapped is built from your journal. Log a few trades first, then the visual report shows up here.', emptyGo: 'Create journal',
      loading: 'Loading journals…', err: 'Could not load journals.', retry: 'Try again', note: 'Descriptive of your historical data. Not a prediction and not trading advice.'
    }
  };
  function lang() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return (l === 'en' || l === 'es') ? 'en' : 'id'; }
  function L() { return T[lang()]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function toast(m) { try { if (typeof showToast === 'function') showToast(m); } catch (e) {} }
  function JOURNALS() { try { return Array.isArray(allJournals) ? allJournals : []; } catch (e) { return []; } }
  function DB() { try { return db; } catch (e) { return null; } }
  function UID() { try { return currentUser ? currentUser.uid : ''; } catch (e) { return ''; } }
  function mm(v) { try { return window.Money ? Money.format(v, { plus: true }) : (v > 0 ? '+' : '') + (Math.round(v * 100) / 100); } catch (e) { return String(v); } }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  var S = { period: 'month', key: null, idx: 0, loaded: false, err: false, rep: null, slides: [], busy: false, picked: [], pickedTs: 0, pulled: '', focus: {}, focusAsked: {}, uid: '' };
  function root() { return $('wrapped-section'); }
  function visible() { var r = root(); return !!r && !r.classList.contains('hidden'); }

  /* ---------- Data pendukung (hanya dibaca) ---------- */
  function readPicked() {
    var uid = UID(), raw = null; try { raw = JSON.parse(lsGet('aicoach:' + (uid || 'anon')) || 'null'); } catch (e) {}
    var loc = raw && Array.isArray(raw.picked) ? raw.picked : [], ts = raw && raw.ts || 0;
    if (S.pickedTs > ts && S.picked.length) return S.picked;
    return loc.filter(function (x) { return x && typeof x.id === 'string'; });
  }
  function pullRemote() {
    var uid = UID(), d = DB(); if (!uid || !d || S.pulled === uid) return; S.pulled = uid;
    try {
      d.collection('users').doc(uid).get().then(function (snap) {
        var x = snap && snap.exists ? snap.data() : null, r = x && x.coachFocus; if (!r || UID() !== uid || !Array.isArray(r.picked)) return;
        var loc = null; try { loc = JSON.parse(lsGet('aicoach:' + uid) || 'null'); } catch (e) {}
        if ((r.ts || 0) > ((loc && loc.ts) || 0)) { S.picked = r.picked.filter(function (p) { return p && typeof p.id === 'string'; }); S.pickedTs = r.ts; if (visible()) render(); }
      }).catch(function () {});
    } catch (e) {}
  }
  function focusNote(ym) {
    if (S.focus[ym] !== undefined) return S.focus[ym];
    var loc = lsGet('v165focus:' + ym); if (loc) { S.focus[ym] = loc; return loc; }
    var uid = UID(), d = DB();
    if (uid && d && !S.focusAsked[ym]) {
      S.focusAsked[ym] = 1;
      try { d.collection('users').doc(uid).collection('reviews').doc('focus_' + ym).get().then(function (snap) {
        var v = snap && snap.exists && typeof snap.data().focus === 'string' ? snap.data().focus : '';
        if (v) { S.focus[ym] = v; if (visible() && S.rep && S.rep.key === ym) render(true); }
      }).catch(function () {}); } catch (e) {}
    }
    return '';
  }
  function strategies() { try { return window.StrategyLib && StrategyLib.list ? StrategyLib.list() : []; } catch (e) { return []; } }

  function report() {
    var rep = TW.build(JOURNALS(), { period: S.period, key: S.key, lang: lang(), picked: readPicked(), strategies: strategies() });
    if (!rep.empty && !rep.error) S.key = rep.key;
    if (S.period === 'month' && rep.focus) { var n = focusNote(rep.key); if (n) rep.focus.manual = String(n).trim(); }
    return rep;
  }

  /* ---------- CSS ---------- */
  var css =
'.tw{--tw-tx:rgba(255,255,255,.93);--tw-sub:rgba(235,235,245,.64);--tw-mut:rgba(235,235,245,.42);--tw-bd:rgba(255,255,255,.10);--tw-bd2:rgba(255,255,255,.18);--tw-in:rgba(255,255,255,.05);--tw-gold:#d9b857;--tw-gold-s:rgba(212,175,55,.13);--tw-gold-b:rgba(212,175,55,.34)}' +
'body.light .tw{--tw-tx:rgba(0,0,0,.9);--tw-sub:rgba(0,0,0,.62);--tw-mut:rgba(0,0,0,.42);--tw-bd:rgba(0,0,0,.10);--tw-bd2:rgba(0,0,0,.2);--tw-in:rgba(0,0,0,.035);--tw-gold:#8a6a14;--tw-gold-s:rgba(176,138,30,.12);--tw-gold-b:rgba(138,106,20,.35)}' +
'.tw{color:var(--tw-tx)}.tw *{box-sizing:border-box}' +
'.tw-head{margin-bottom:16px}.tw-h1{font-size:22px;font-weight:600;letter-spacing:-.02em;line-height:1.15;margin:0}.tw-h1 small{display:block;font-size:13px;font-weight:400;letter-spacing:0;color:var(--tw-sub);margin-top:8px;max-width:56ch;line-height:1.45}' +
'.tw-badge{display:inline-flex;margin-top:12px;font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;padding:4px 12px;border-radius:999px;border:1px solid var(--tw-gold-b);background:var(--tw-gold-s);color:var(--tw-gold)}' +
'.tw-card{border-radius:24px;padding:16px;margin-bottom:16px;min-width:0}' +
'.tw-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}' +
'.tw-seg{display:inline-flex;padding:4px;border-radius:16px;border:1px solid var(--tw-bd);background:var(--tw-in)}.tw-seg button{min-height:40px;padding:0 16px;border-radius:12px;border:0;background:none;color:var(--tw-sub);font:inherit;font-size:13px;font-weight:600;cursor:pointer}.tw-seg button[aria-pressed=true]{background:var(--tw-gold-s);color:var(--tw-gold);box-shadow:inset 0 0 0 1px var(--tw-gold-b)}' +
'.tw-pn{display:flex;align-items:center;gap:8px;min-width:0;flex:1 1 220px;justify-content:flex-end}.tw-pl{font-weight:700;font-size:15px;min-width:0;text-align:center;flex:1;overflow-wrap:anywhere}' +
'.tw-ib{flex:none;width:44px;height:44px;border-radius:16px;border:1px solid var(--tw-bd);background:var(--tw-in);color:var(--tw-sub);display:grid;place-items:center;cursor:pointer}.tw-ib:disabled{opacity:.35;cursor:default}.tw-ib svg{width:18px;height:18px}' +
'.tw-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 20px;border-radius:16px;font-weight:700;font-size:15px;cursor:pointer;border:1px solid var(--tw-bd);background:var(--tw-in);color:var(--tw-tx);font-family:inherit}.tw-btn:hover{border-color:var(--tw-bd2)}.tw-btn:active{transform:scale(.97)}.tw-btn:disabled{opacity:.5;cursor:default}' +
'.tw-btn.gold{background:linear-gradient(180deg,#f0d789,#d4af37 55%,#b8932a);color:#1a1405;border-color:rgba(255,255,255,.3)}.tw-btn svg{width:16px;height:16px}' +
'.tw-btn:focus-visible,.tw-seg button:focus-visible,.tw-ib:focus-visible,.tw-dot:focus-visible,.tw-stage:focus-visible{outline:2px solid var(--tw-gold);outline-offset:2px}' +
'.tw-run{margin:12px 0 0;font-size:13px;color:var(--tw-gold);font-weight:600}' +
'.tw-stage{display:flex;justify-content:center;touch-action:pan-y;border-radius:20px}' +
'.tw-phone{flex:0 1 auto;width:min(100%,calc(72vh * 9 / 16));min-width:0;border-radius:28px;overflow:hidden;border:1px solid var(--tw-bd2);background:#0E0F11;box-shadow:0 18px 50px rgba(0,0,0,.35);aspect-ratio:9/16}' +
'.tw-phone svg{display:block;width:100%;height:100%}' +
'.tw-dots{display:flex;justify-content:center;flex-wrap:wrap;gap:2px;margin:12px 0 4px}.tw-dot{width:28px;height:28px;border:0;background:none;display:grid;place-items:center;cursor:pointer;border-radius:50%}.tw-dot i{display:block;width:9px;height:9px;border-radius:50%;background:var(--tw-bd2)}.tw-dot[aria-current=true] i{width:22px;border-radius:6px;background:var(--tw-gold)}' +
'.tw-cn{display:flex;align-items:center;justify-content:center;gap:16px;margin:12px 0 2px}.tw-cnt{text-align:center;font-size:13px;color:var(--tw-sub);margin:0;font-weight:600;min-width:9ch}.tw-dots{margin-bottom:12px!important}' +
'.tw-act{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}' +
'.tw-det{margin-top:16px}.tw-det summary{cursor:pointer;font-weight:700;font-size:15px;color:var(--tw-sub);min-height:44px;display:flex;align-items:center}.tw-det ul{margin:8px 0 0;padding:0;list-style:none}.tw-det li{padding:12px 12px;border-radius:16px;background:var(--tw-in);border:1px solid var(--tw-bd);margin-bottom:8px;font-size:15px;line-height:1.45;overflow-wrap:anywhere}' +
'.tw-note{font-size:13px;color:var(--tw-mut);margin:16px 0 0;line-height:1.45;text-align:center}' +
'.tw-empty{text-align:center;padding:40px 24px;border-radius:28px}.tw-empty h3{margin:0 0 8px;font-size:17px;font-weight:600}.tw-empty p{margin:0 auto 16px;max-width:42ch;color:var(--tw-sub);font-size:15px;line-height:1.5}' +
'.tw-skel{height:150px;border-radius:24px;margin-bottom:16px;background:linear-gradient(90deg,var(--tw-in),var(--tw-bd),var(--tw-in));background-size:200% 100%;animation:twSk 1.3s linear infinite}@keyframes twSk{to{background-position:-200% 0}}' +
'@media(max-width:640px){.tw-card{padding:12px;border-radius:24px}.tw-h1{font-size:22px}.tw-phone{width:min(100%,calc(68vh * 9 / 16));border-radius:24px}.tw-pn{justify-content:space-between}}' +
'#wrapped-section:not(.hidden){animation:miTab var(--mi-base,.4s) var(--mi-ease,ease) backwards}' +
'@media(prefers-reduced-motion:reduce){.tw-skel{animation:none}.tw-btn:active{transform:none}}';
  (function () { var s = document.createElement('style'); s.id = 'tw-css'; s.textContent = css; document.head.appendChild(s); })();

  var IC = {
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 19h14"/></svg>'
  };
  function canShareFiles() { try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [new File(['x'], 'a.png', { type: 'image/png' })] })); } catch (e) { return false; } }

  /* ---------- Render ---------- */
  function keyList(rep) { var ks = rep.keys.slice(); if (ks.indexOf(rep.curKey) < 0) ks.push(rep.curKey); ks.sort().reverse(); return ks; }
  function controls(rep, t) {
    var ks = keyList(rep), i = ks.indexOf(rep.key), older = i >= 0 && i < ks.length - 1, newer = i > 0;
    return '<div class="glass tw-card"><div class="tw-bar"><div class="tw-seg" role="group" aria-label="' + esc(t.per) + '">' +
      ['week', 'month', 'year'].map(function (p) { return '<button type="button" data-tw="period" data-p="' + p + '" aria-pressed="' + (S.period === p) + '">' + esc(t[p]) + '</button>'; }).join('') + '</div>' +
      '<div class="tw-pn"><button type="button" class="tw-ib" data-tw="pk" data-dir="older" data-k="' + esc(older ? ks[i + 1] : '') + '" aria-label="' + esc(t.prev) + '"' + (older ? '' : ' disabled') + '>' + IC.left + '</button>' +
      '<div class="tw-pl" aria-live="polite">' + esc(rep.label || '') + '</div>' +
      '<button type="button" class="tw-ib" data-tw="pk" data-dir="newer" data-k="' + esc(newer ? ks[i - 1] : '') + '" aria-label="' + esc(t.next) + '"' + (newer ? '' : ' disabled') + '>' + IC.right + '</button></div></div>' +
      (rep.inProgress && !rep.noData ? '<p class="tw-run">' + esc(t.running) + '</p>' : '') + '</div>';
  }
  function viewerHTML(t) {
    var n = S.slides.length, i = S.idx, sl = S.slides[i];
    return '<div class="glass tw-card"><div class="tw-stage" tabindex="0" data-tw="stage" role="group" aria-roledescription="carousel" aria-label="' + esc(t.title) + '">' +
      '<div class="tw-phone" id="tw-phone" role="img" aria-label="' + esc(t.cardN + ' ' + (i + 1) + ' ' + t.of + ' ' + n + ': ' + sl.title) + '">' + sl.svg + '</div></div>' +
      '<div class="tw-cn"><button type="button" class="tw-ib" data-tw="card" data-d="-1" aria-label="' + esc(t.prevC) + '">' + IC.left + '</button>' +
      '<p class="tw-cnt" id="tw-cnt" aria-live="polite">' + esc(t.cardN + ' ' + (i + 1) + ' ' + t.of + ' ' + n) + '</p>' +
      '<button type="button" class="tw-ib" data-tw="card" data-d="1" aria-label="' + esc(t.nextC) + '">' + IC.right + '</button></div>' +
      '<div class="tw-dots">' + S.slides.map(function (s, k) { return '<button type="button" class="tw-dot" data-tw="go" data-i="' + k + '" aria-label="' + esc(t.go + ' ' + (k + 1) + ': ' + s.title) + '"' + (k === i ? ' aria-current="true"' : '') + '><i></i></button>'; }).join('') + '</div>' +
      '<div class="tw-act"><button type="button" class="tw-btn gold" data-tw="png">' + IC.img + '<span>' + esc(t.png) + '</span></button>' +
      (canShareFiles() ? '<button type="button" class="tw-btn" data-tw="share">' + IC.share + '<span>' + esc(t.share) + '</span></button>' : '') +
      '<button type="button" class="tw-btn" data-tw="pdf">' + IC.pdf + '<span>' + esc(t.pdf) + '</span></button></div>' +
      '<details class="tw-det"><summary>' + esc(t.text) + '</summary><ul>' + TW.textSummary(S.rep, { mm: mm }).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details>' +
      '<p class="tw-note">' + esc(t.note) + '</p></div>';
  }
  function render(keepIdx) {
    var r = root(); if (!r) return; var t = L(); r.classList.add('tw');
    var head = '<div class="tw-head"><h2 class="tw-h1"><span class="gold-text">' + esc(t.title) + '</span><small>' + esc(t.sub) + '</small></h2><span class="tw-badge">' + esc(t.badge) + '</span></div>';
    if (S.err && !JOURNALS().length) { r.innerHTML = head + '<div class="glass tw-empty"><p style="margin:0 auto 12px">' + esc(t.err) + '</p><button type="button" class="tw-btn gold" data-tw="retry">' + esc(t.retry) + '</button></div>'; return; }
    if (!S.loaded && !JOURNALS().length) { r.innerHTML = head + '<div class="tw-skel" aria-label="' + esc(t.loading) + '"></div><div class="tw-skel"></div>'; return; }
    var prevKey = S.rep && S.rep.key, rep = report(); S.rep = rep;
    if (rep.empty) { S.slides = []; r.innerHTML = head + '<div class="glass tw-empty"><h3>' + esc(t.emptyT) + '</h3><p>' + esc(t.emptyS) + '</p><button type="button" class="tw-btn gold" data-tw="new">' + esc(t.emptyGo) + '</button></div>'; return; }
    S.slides = TW.slides(rep, { mm: mm });
    if (!keepIdx || prevKey !== rep.key) S.idx = 0; if (S.idx >= S.slides.length) S.idx = 0;
    var body = rep.noData ? '<div class="glass tw-empty"><h3>' + esc(t.noData) + '</h3><p>' + esc(t.noDataS) + '</p></div>' : viewerHTML(t);
    r.innerHTML = head + controls(rep, t) + body;
  }
  function showSlide(i) {
    var n = S.slides.length; if (!n) return; S.idx = (i + n) % n; var t = L(), sl = S.slides[S.idx], ph = $('tw-phone'); if (!ph) return;
    ph.innerHTML = sl.svg; ph.setAttribute('aria-label', t.cardN + ' ' + (S.idx + 1) + ' ' + t.of + ' ' + n + ': ' + sl.title);
    var c = $('tw-cnt'); if (c) c.textContent = t.cardN + ' ' + (S.idx + 1) + ' ' + t.of + ' ' + n;
    var dots = root().querySelectorAll('.tw-dot'); Array.prototype.forEach.call(dots, function (d, k) { if (k === S.idx) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
  }

  /* ---------- Ekspor ---------- */
  function svgToCanvas(svg) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })), img = new Image();
      img.onload = function () { try { var c = document.createElement('canvas'); c.width = TW.W; c.height = TW.H; var g = c.getContext('2d'); g.fillStyle = '#0E0F11'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, TW.W, TW.H); URL.revokeObjectURL(url); res(c); } catch (e) { URL.revokeObjectURL(url); rej(e); } };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('svg')); };
      img.src = url;
    });
  }
  function canvasBlob(c) { return new Promise(function (res, rej) { c.toBlob(function (b) { b ? res(b) : rej(new Error('blob')); }, 'image/png'); }); }
  function fname(ext, suffix) { var r = S.rep; return 'trading-wrapped-' + S.period + '-' + r.key + (suffix ? '-' + suffix : '') + '.' + ext; }
  function download(blob, name) { var a = document.createElement('a'), u = URL.createObjectURL(blob); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); }
  function setBusy(btn, on, label) {
    S.busy = on; var r = root(); if (!r) return;
    Array.prototype.forEach.call(r.querySelectorAll('.tw-act .tw-btn'), function (b) { b.disabled = on; });
    r.setAttribute('aria-busy', on ? 'true' : 'false');
    if (btn) { var sp = btn.querySelector('span'); if (sp) { if (on) { btn.__lbl = sp.textContent; sp.textContent = label; } else if (btn.__lbl) sp.textContent = btn.__lbl; } }
  }
  function exportPng(btn, doShare) {
    if (S.busy || !S.slides.length) return; var t = L(), sl = S.slides[S.idx];
    setBusy(btn, true, t.busy + '…');
    svgToCanvas(sl.svg).then(canvasBlob).then(function (blob) {
      var name = fname('png', sl.id);
      if (doShare && canShareFiles()) {
        var f = new File([blob], name, { type: 'image/png' });
        return navigator.share({ files: [f], title: t.title + ' · ' + S.rep.label }).catch(function (e) { if (e && e.name === 'AbortError') return; download(blob, name); toast(t.shareFail); });
      }
      download(blob, name); toast(t.done);
    }).catch(function () { toast(t.pngFail); }).then(function () { setBusy(btn, false); });
  }
  function exportPdf(btn) {
    if (S.busy || !S.slides.length) return; var t = L();
    if (!window.jspdf || !window.jspdf.jsPDF) { toast(t.pdfLib); return; }
    setBusy(btn, true, t.busy + '…');
    var doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'px', format: [TW.W, TW.H], hotfixes: ['px_scaling'], compress: true }), slides = S.slides.slice(), chain = Promise.resolve();
    slides.forEach(function (sl, i) {
      chain = chain.then(function () {
        var sp = btn && btn.querySelector('span'); if (sp) sp.textContent = t.busy + ' ' + (i + 1) + '/' + slides.length;
        return svgToCanvas(sl.svg);
      }).then(function (c) { if (i) doc.addPage([TW.W, TW.H], 'portrait'); doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, TW.W, TW.H, undefined, 'FAST'); });
    });
    chain.then(function () { doc.setProperties({ title: t.title + ' · ' + S.rep.label }); doc.save(fname('pdf')); toast(t.done); })
      .catch(function () { toast(t.pdfFail); }).then(function () { setBusy(btn, false); });
  }

  /* ---------- Interaksi ---------- */
  function onClick(ev) {
    var b = ev.target.closest ? ev.target.closest('[data-tw]') : null; if (!b || b.disabled) return;
    var act = b.getAttribute('data-tw');
    if (act === 'period') {
      var p = b.getAttribute('data-p'), rp = S.rep, anchor = rp && (rp.equity && rp.equity.length ? rp.equity[rp.equity.length - 1].date : rp.from); if (p === S.period) return;
      S.period = p; S.key = anchor ? TW.keyOf(p, anchor) : null; render(); var nb = root().querySelector('[data-tw="period"][data-p="' + p + '"]'); if (nb) nb.focus(); return;
    }
    if (act === 'pk') {
      var k = b.getAttribute('data-k'), dir = b.getAttribute('data-dir'); if (!k) return;
      S.key = k; render();
      var nx = root().querySelector('[data-tw="pk"][data-dir="' + dir + '"]'); if (!nx || nx.disabled) nx = root().querySelector('[data-tw="pk"]:not([disabled])'); if (nx) nx.focus(); return;
    }
    if (act === 'card') { showSlide(S.idx + parseInt(b.getAttribute('data-d'), 10)); return; }
    if (act === 'go') { showSlide(parseInt(b.getAttribute('data-i'), 10)); return; }
    if (act === 'png') { exportPng(b, false); return; }
    if (act === 'share') { exportPng(b, true); return; }
    if (act === 'pdf') { exportPdf(b); return; }
    if (act === 'retry') { S.loaded = false; S.err = false; render(); try { if (typeof loadJournals === 'function') loadJournals(); } catch (e) {} return; }
    if (act === 'new') { var fab = $('btn-new-journal-fab'); if (fab) fab.click(); }
  }
  function onKey(ev) {
    var st = ev.target.closest ? ev.target.closest('[data-tw="stage"]') : null; if (!st) return;
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); showSlide(S.idx - 1); } else if (ev.key === 'ArrowRight') { ev.preventDefault(); showSlide(S.idx + 1); }
  }
  var tx0 = null, ty0 = null;
  function onTouchStart(ev) { var st = ev.target.closest ? ev.target.closest('[data-tw="stage"]') : null; if (!st || !ev.touches || ev.touches.length !== 1) { tx0 = null; return; } tx0 = ev.touches[0].clientX; ty0 = ev.touches[0].clientY; }
  function onTouchEnd(ev) {
    if (tx0 === null || !ev.changedTouches || !ev.changedTouches.length) return;
    var dx = ev.changedTouches[0].clientX - tx0, dy = ev.changedTouches[0].clientY - ty0; tx0 = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) showSlide(S.idx + (dx < 0 ? 1 : -1));
  }

  var skelTimer = null;
  function markLoaded(err) { S.loaded = true; S.err = !!err; clearTimeout(skelTimer); if (visible()) render(true); }
  window.addEventListener('viewchange', function (ev) {
    if (!(ev && ev.detail && ev.detail.view === 'wrapped')) return;
    S.key = null; S.idx = 0; pullRemote(); render();
    clearTimeout(skelTimer); if (!S.loaded) skelTimer = setTimeout(function () { markLoaded(false); }, 1200);
  });
  setTimeout(function () { if (!S.loaded) markLoaded(false); }, 2500);
  window.addEventListener('journals-loaded', function () { pullRemote(); markLoaded(false); });
  window.addEventListener('journals-error', function () { markLoaded(true); });

  function init() {
    var r = root(); if (!r) return;
    r.addEventListener('click', onClick); r.addEventListener('keydown', onKey);
    r.addEventListener('touchstart', onTouchStart, { passive: true }); r.addEventListener('touchend', onTouchEnd, { passive: true });
    var sel = $('app-language'); if (sel) sel.addEventListener('change', function () { setTimeout(function () { if (visible()) render(true); }, 120); });
  }
  window.TradingWrappedUI = { render: render, open: function () { var n = $('nav-wrapped'); if (n) n.click(); }, state: S };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
