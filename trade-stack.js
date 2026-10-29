/* Trade Stack: journal ditampilkan bertumpuk seperti kartu fisik.
   Geser kiri/kanan untuk berpindah, ketuk kartu untuk membalik (detail), tombol/panah keyboard sebagai alternatif.
   Hanya membaca allJournals (tidak ada perubahan data/Firestore). Edit & hapus memakai fungsi yang sudah ada. */
(function () {
  'use strict';
  var T = {
    id: { list: 'Daftar', stack: 'Stack', title: 'Trade Stack', all: 'Semua', win: 'Profit', loss: 'Loss', hint: 'Geser untuk berpindah · ketuk untuk detail', tap: 'Ketuk untuk detail',
      empty: 'Belum ada journal. Simpan trade pertamamu, kartunya akan muncul di sini.', emptyF: 'Tidak ada trade pada filter ini.',
      edit: 'Edit', del: 'Hapus', trade: 'trade', notes: 'Catatan', noNotes: 'Tidak ada catatan.', prev: 'Sebelumnya', next: 'Berikutnya', back: 'Ketuk untuk kembali' },
    en: { list: 'List', stack: 'Stack', title: 'Trade Stack', all: 'All', win: 'Profit', loss: 'Loss', hint: 'Swipe to browse · tap for details', tap: 'Tap for details',
      empty: 'No journal yet. Save your first trade and its card will appear here.', emptyF: 'No trades match this filter.',
      edit: 'Edit', del: 'Delete', trade: 'trade', notes: 'Notes', noNotes: 'No notes.', prev: 'Previous', next: 'Next', back: 'Tap to go back' }
  };
  function L() { var l = ''; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return T[(l === 'en' || l === 'es') ? 'en' : 'id']; }

  var css = '' +
'.ts-root{max-width:440px;margin:4px auto 0}' +
'#list-section:not(.ts-on) .ts-root{display:none}#list-section.ts-on #journal-list.space-y-4{display:none}' +
'.ts-flt{display:inline-flex;gap:2px;padding:4px;border-radius:999px;background:var(--surface,rgba(255,255,255,.04));border:1px solid var(--border,rgba(255,255,255,.08))}' +
'.ts-flt button{border:0;background:transparent;font-size:12px;font-weight:600;padding:4px 12px;border-radius:999px;color:var(--text-secondary,rgba(235,235,245,.62));transition:background-color .2s,color .2s}' +
'.ts-flt button.on{background:var(--surface-pressed,rgba(255,255,255,.1));color:var(--text-primary,#fff)}' +
'.ts-deck{position:relative;height:clamp(390px,58vh,490px);margin-bottom:60px;touch-action:pan-y;user-select:none;-webkit-user-select:none}' +
'.ts-card{position:absolute;inset:0;transform-origin:50% 100%;will-change:transform,opacity}' +
'.ts-in{position:absolute;inset:0;transform-style:preserve-3d;transform:perspective(1300px) rotateY(0);transition:transform .62s cubic-bezier(.2,.8,.2,1)}' +
'.ts-card.flip .ts-in{transform:perspective(1300px) rotateY(180deg)}' +
'.ts-face{position:absolute;inset:0;display:flex;flex-direction:column;padding:28px;border-radius:28px;overflow:hidden;-webkit-backface-visibility:hidden;backface-visibility:hidden;' +
  'background:linear-gradient(160deg,#1e1f23 0%,#131417 58%,#0e0f11 100%);border:1px solid var(--border-strong,rgba(255,255,255,.16));' +
  'box-shadow:0 28px 50px -22px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.07)}' +
'.ts-face::after{content:"";position:absolute;left:14%;right:14%;top:0;height:1px;background:linear-gradient(90deg,transparent,var(--accent,#C8A96A),transparent);opacity:.5;pointer-events:none}' +
'.ts-front::before{content:"";position:absolute;inset:0;background:radial-gradient(120% 70% at 100% 0%,var(--ts-glow,transparent),transparent 62%);pointer-events:none}' +
'.ts-front.pos{--ts-glow:rgba(45,212,191,.10)}.ts-front.neg{--ts-glow:rgba(255,122,104,.10)}' +
'.ts-back{transform:rotateY(180deg)}' +
'.ts-shade{position:absolute;inset:0;border-radius:28px;background:#000;opacity:var(--sh,0);pointer-events:none}' +
'.ts-top{position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}' +
'.ts-top b{display:block;font-size:15px;font-weight:600;letter-spacing:-.01em;color:var(--text-primary,#fff)}' +
'.ts-top small{display:block;margin-top:2px;font-size:12px;color:var(--text-tertiary,rgba(235,235,245,.45))}' +
'.ts-dir{display:inline-flex;align-items:center;height:24px;padding:0 12px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;background:rgba(255,255,255,.06);color:var(--text-secondary,rgba(235,235,245,.62))}' +
'.ts-dir.long{background:var(--positive-soft,rgba(45,212,191,.13));color:var(--positive,#2dd4bf)}' +
'.ts-dir.short{background:var(--negative-soft,rgba(255,122,104,.13));color:var(--negative,#ff7a68)}' +
'.ts-mid{position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;min-width:0}' +
'.ts-pair{font-size:15px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--text-secondary,rgba(235,235,245,.62));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
'.ts-pl{margin-top:12px;font-size:clamp(38px,11vw,50px);font-weight:600;letter-spacing:-.035em;line-height:1.05;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--text-secondary,rgba(235,235,245,.62))}' +
'.ts-pos .ts-pl{color:var(--positive,#2dd4bf)}.ts-neg .ts-pl{color:var(--negative,#ff7a68)}' +
'.ts-bot{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding-top:16px;border-top:1px solid var(--border,rgba(255,255,255,.08));font-size:13px;color:var(--text-secondary,rgba(235,235,245,.62))}' +
'.ts-bot i{font-style:normal;font-size:12px;font-weight:600;padding:2px 8px;border-radius:8px;font-variant-numeric:tabular-nums}' +
'.ts-bot i.w{background:var(--positive-soft,rgba(45,212,191,.13));color:var(--positive,#2dd4bf)}.ts-bot i.l{background:var(--negative-soft,rgba(255,122,104,.13));color:var(--negative,#ff7a68)}' +
'.ts-bot .sp{margin-left:auto;color:var(--text-tertiary,rgba(235,235,245,.45));font-size:12px;text-align:right}' +
'.ts-tap{position:relative;margin-top:16px;text-align:center;font-size:12px;letter-spacing:.01em;color:var(--text-tertiary,rgba(235,235,245,.4))}' +
'.ts-scroll{position:relative;flex:1;min-height:0;overflow-y:auto;margin:16px -8px 0;padding:0 8px;touch-action:pan-y;-webkit-overflow-scrolling:touch}' +
'.ts-lab{font-size:12px;letter-spacing:0;text-transform:none;font-weight:600;margin:0 0 8px;color:var(--text-tertiary,rgba(235,235,245,.4))}' +
'.ts-notes{margin:0 0 20px;font-size:15px;line-height:1.6;white-space:pre-wrap;word-break:break-word;color:var(--text-secondary,rgba(235,235,245,.7))}' +
'.ts-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}' +
'.ts-chips span{font-size:12px;padding:4px 12px;border-radius:999px;background:var(--surface-elevated,rgba(255,255,255,.07));color:var(--text-secondary,rgba(235,235,245,.7))}' +
'.ts-chips span.t{background:var(--accent-soft,rgba(200,169,106,.1));color:var(--accent-text,#C8A96A)}' +
'.ts-shots{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}' +
'.ts-shots img{width:100%;height:84px;object-fit:cover;border-radius:12px;border:1px solid var(--border,rgba(255,255,255,.08))}' +
'.ts-act{position:relative;display:flex;gap:8px;padding-top:16px;border-top:1px solid var(--border,rgba(255,255,255,.08))}' +
'.ts-act button{flex:1;height:40px;border-radius:12px;font-size:13px;font-weight:600;border:1px solid var(--border,rgba(255,255,255,.08));background:var(--surface,rgba(255,255,255,.04));color:var(--text-primary,#fff);transition:background-color .2s}' +
'.ts-act button:hover{background:var(--surface-pressed,rgba(255,255,255,.1))}.ts-act button.d{color:var(--negative,#ff7a68)}' +
'.ts-ctl{display:flex;align-items:center;gap:16px}' +
'.ts-nb{width:40px;height:40px;flex:none;border-radius:50%;display:grid;place-items:center;border:1px solid var(--border,rgba(255,255,255,.08));background:var(--surface,rgba(255,255,255,.04));color:var(--text-secondary,rgba(235,235,245,.7));transition:opacity .2s,background-color .2s}' +
'.ts-nb:hover:not(:disabled){background:var(--surface-pressed,rgba(255,255,255,.1))}.ts-nb:disabled{opacity:.28}' +
'.ts-prog{flex:1;text-align:center;font-size:13px;font-variant-numeric:tabular-nums;letter-spacing:.01em;color:var(--text-secondary,rgba(235,235,245,.62))}' +
'.ts-bar{height:2px;margin-top:12px;border-radius:2px;background:var(--border,rgba(255,255,255,.08));overflow:hidden}' +
'.ts-bar i{display:block;height:100%;width:0;background:var(--accent,#C8A96A);transition:width .3s ease}' +
'.ts-hintline{margin-top:16px;text-align:center;font-size:12px;color:var(--text-tertiary,rgba(235,235,245,.4))}' +
'.ts-empty{padding:72px 24px;text-align:center;font-size:15px;line-height:1.6;color:var(--text-tertiary,rgba(235,235,245,.5))}' +
'.ts-root button:focus-visible,.ts-flt button:focus-visible{outline:2px solid var(--accent,#C8A96A);outline-offset:2px}' +
'body.light .ts-face{background:linear-gradient(160deg,#ffffff 0%,#f6f4ee 60%,#efece3 100%);box-shadow:0 26px 44px -24px rgba(60,48,20,.38),inset 0 1px 0 #fff}' +
'body.light .ts-shade{background:#5c4b22}body.light .ts-notes,body.light .ts-chips span{color:rgba(0,0,0,.66)}' +
'@media (prefers-reduced-motion:reduce){.ts-in{transition:none}}';

  var root, deck, els = new Map(), list = [], idx = 0, target = 0, pos = 0, mode = 'list', tog, raf = 0, last = 0, W = 360, drag = null, ready = false;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s) { return root.querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function visible() { var v = document.getElementById('view-dashboard'); return !!root && mode === 'stack' && !!v && !v.classList.contains('hidden'); }
  function money(v) { try { return window.Money ? Money.format(v, { plus: true }) : (v > 0 ? '+' : '') + v.toFixed(2); } catch (e) { return String(v); } }

  function data() {
    var a = []; try { a = (typeof getFilteredJournals === 'function' ? getFilteredJournals() : allJournals) || []; } catch (e) {}
    return a.filter(function (x) { return x && x.date; });
  }

  function cardHTML(j) {
    var t = L(), pl = j.pl || 0, tone = pl > 0 ? 'pos' : pl < 0 ? 'neg' : 'zero';
    var d = new Date(j.date + 'T00:00:00');
    var day = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), sub = d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric' });
    var dir = j.bias === 'Long' ? 'long' : j.bias === 'Short' ? 'short' : '', arrow = j.bias === 'Long' ? '↑ ' : j.bias === 'Short' ? '↓ ' : '';
    var n = j.trades || 1, hasWL = typeof j.wins === 'number', w = hasWL ? clamp(j.wins, 0, n) : 0;
    var SL = {}; try { SL = SESSION_LABELS; } catch (e) {}
    var sess = (j.session || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) { return SL[s] || s; }).join(' · ');
    var dirBadge = '<span class="ts-dir ' + dir + '">' + arrow + esc(j.bias || 'Neutral') + '</span>';
    var tags = (j.tags || []).map(function (x) { return '<span class="t">#' + esc(x) + '</span>'; }).join('');
    var emo = (j.emotions || []).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('');
    var shots = (j.charts || []).map(function (u) { return '<img class="zoomable-chart" loading="lazy" alt="Chart" src="' + esc(u) + '">'; }).join('');
    return '<div class="ts-in">' +
      '<div class="ts-face ts-front ' + tone + ' ts-' + tone + '">' +
        '<div class="ts-top"><div><b>' + esc(day) + '</b><small>' + esc(sub) + '</small></div>' + dirBadge + '</div>' +
        '<div class="ts-mid"><div class="ts-pair">' + (j.pair ? esc(j.pair) : '—') + '</div><div class="ts-pl">' + esc(money(pl)) + '</div></div>' +
        '<div class="ts-bot"><span>' + n + ' ' + t.trade + (n > 1 && t === T.en ? 's' : '') + '</span>' +
          (hasWL ? '<i class="w">' + w + 'W</i><i class="l">' + (n - w) + 'L</i>' : '') +
          '<span class="sp">' + esc([sess, j.accountType].filter(Boolean).join(' · ')) + '</span></div>' +
        '<div class="ts-tap">' + t.tap + '</div>' +
      '</div>' +
      '<div class="ts-face ts-back">' +
        '<div class="ts-top"><div><b>' + esc(day) + ' · ' + esc(j.pair || '—') + '</b><small>' + esc(money(pl)) + '</small></div>' + dirBadge + '</div>' +
        '<div class="ts-scroll">' +
          (window.TradeSummary ? TradeSummary.cardHTML(j) : '') +
          '<p class="ts-lab">' + t.notes + '</p><p class="ts-notes">' + (j.notes ? esc(j.notes) : '<span style="opacity:.55">' + t.noNotes + '</span>') + '</p>' +
          ((tags || emo) ? '<div class="ts-chips">' + tags + emo + '</div>' : '') +
          (shots ? '<div class="ts-shots">' + shots + '</div>' : '') +
        '</div>' +
        '<div class="ts-act"><button type="button" data-ts-edit="' + esc(j.id) + '">' + t.edit + '</button><button type="button" class="d" data-ts-del="' + esc(j.id) + '">' + t.del + '</button></div>' +
      '</div></div><div class="ts-shade"></div>';
  }

  function ensure(k) {
    if (els.has(k)) return els.get(k);
    var el = document.createElement('div'); el.className = 'ts-card'; el.dataset.k = k; el.innerHTML = cardHTML(list[k]);
    deck.appendChild(el); els.set(k, el); return el;
  }

  function layout() {
    if (!list.length) return;
    W = deck.clientWidth || W;
    var lo = Math.max(0, Math.floor(pos) - 1), hi = Math.min(list.length - 1, Math.floor(pos) + 4);
    els.forEach(function (el, k) { if (k < lo - 1 || k > hi + 1) { el.remove(); els.delete(k); } });
    for (var k = lo; k <= hi; k++) {
      var el = ensure(k), rel = k - pos, x = 0, y = 0, s = 1, r = 0, o = 1, sh = 0, vis = true;
      if (rel >= 0) { var d = Math.min(rel, 3.4); y = d * 14; s = 1 - d * .055; sh = Math.min(d * .17, .55); o = rel > 3 ? Math.max(0, 1 - (rel - 3) * 2.5) : 1; }
      else { var u = -rel; x = rel * W; r = rel * 7; y = u * 14; o = u < .55 ? 1 : Math.max(0, 1 - (u - .55) / .45); vis = u < 1; }
      el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + r.toFixed(2) + 'deg) scale(' + s.toFixed(4) + ')';
      el.style.opacity = o.toFixed(3); el.style.zIndex = rel < 0 ? 2000 + Math.round(-rel * 10) : 1000 - Math.round(rel * 100);
      el.style.visibility = vis ? '' : 'hidden'; el.style.setProperty('--sh', sh.toFixed(3));
      var top = k === target; el.style.pointerEvents = top ? '' : 'none';
      if (top) el.removeAttribute('inert'); else el.setAttribute('inert', '');
    }
  }

  function ui() {
    if (!root) return; var n = list.length;
    $('.ts-count').textContent = n ? String(target + 1).padStart(2, '0') + ' / ' + n : '0 / 0';
    $('.ts-bar i').style.width = (n > 1 ? target / (n - 1) * 100 : n ? 100 : 0) + '%';
    $('.ts-prev').disabled = target <= 0; $('.ts-next').disabled = target >= n - 1;
  }

  function tick(now) {
    var dt = Math.min(.05, (now - last) / 1000 || .016); last = now;
    pos += (target - pos) * (1 - Math.exp(-dt / .075));
    if (Math.abs(target - pos) < .001) { pos = target; raf = 0; layout(); return; }
    layout(); raf = requestAnimationFrame(tick);
  }
  function go(i) {
    if (!list.length) return; i = clamp(Math.round(i), 0, list.length - 1);
    if (i !== target) els.forEach(function (el, k) { if (k !== i) el.classList.remove('flip'); });
    target = idx = i; ui();
    if (reduce) { pos = target; layout(); return; }
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }

  function build() {
    var t = L(); els.clear(); deck.innerHTML = '';
    var keepId = list[target] && list[target].id; list = data();
    var at = keepId ? list.findIndex(function (x) { return x.id === keepId; }) : -1;
    target = idx = pos = at >= 0 ? at : 0;
    root.style.display = list.length ? '' : 'none';
    $('.ts-hintline').textContent = t.hint;
    $('.ts-prev').setAttribute('aria-label', t.prev); $('.ts-next').setAttribute('aria-label', t.next);
    layout(); ui();
  }

  function flip() { var el = els.get(target); if (el) el.classList.toggle('flip'); }

  function bind() {
    var skip = 'button,a';
    deck.addEventListener('pointerdown', function (e) {
      if (!list.length || e.button > 0 || e.target.closest(skip)) return;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, lt: performance.now(), v: 0, on: false, sp: pos, base: Math.round(pos), img: !!e.target.closest('img') };
    });
    deck.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.on) { if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) { drag.on = true; try { deck.setPointerCapture(e.pointerId); } catch (_) {} } else return; }
      var now = performance.now(), dt = now - drag.lt; if (dt > 0) drag.v = .75 * drag.v + .25 * ((e.clientX - drag.lx) / dt * 1000); drag.lx = e.clientX; drag.lt = now;
      var p = drag.sp - dx / W, max = list.length - 1;
      pos = p < 0 ? p * .25 : p > max ? max + (p - max) * .25 : p; layout();
    });
    function end(e, cancel) {
      if (!drag || e.pointerId !== drag.id) return; var d = drag; drag = null;
      if (!d.on) { if (!cancel && !d.img && !e.target.closest(skip) && performance.now() - d.t < 450 && Math.abs(e.clientX - d.x) < 8 && Math.abs(e.clientY - d.y) < 8) flip(); else go(d.base); return; }
      var dx = e.clientX - d.x, dir = 0;
      if (!cancel) { if (dx < -W * .22 || d.v < -450) dir = 1; else if (dx > W * .22 || d.v > 450) dir = -1; }
      go(d.base + dir);
    }
    deck.addEventListener('pointerup', function (e) { end(e, false); });
    deck.addEventListener('pointercancel', function (e) { end(e, true); });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('ts-prev')) go(target - 1);
      else if (b.classList.contains('ts-next')) go(target + 1);
      else if (b.dataset.tsEdit) { try { editJournal(b.dataset.tsEdit); } catch (err) { console.error(err); } }
      else if (b.dataset.tsDel) { try { deleteJournal(b.dataset.tsDel); } catch (err) { console.error(err); } }
    });
    document.addEventListener('keydown', function (e) {
      if (!visible() || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '')) return;
      var m = document.getElementById('form-section'); if (m && !m.classList.contains('hidden')) return;
      if (e.key === 'ArrowRight') go(target + 1); else if (e.key === 'ArrowLeft') go(target - 1);
    });
    window.addEventListener('resize', function () { if (visible()) layout(); });
  }

  function setMode(m, save) {
    mode = m === 'stack' ? 'stack' : 'list';
    var ls = document.getElementById('list-section'); if (ls) ls.classList.toggle('ts-on', mode === 'stack');
    tog.querySelectorAll('button').forEach(function (b) { var on = b.dataset.tsMode === mode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    if (save) { try { localStorage.setItem('doaibu.journalView', mode); } catch (e) {} }
    if (mode === 'stack') build();
  }
  function labels() { var t = L(); tog.children[0].textContent = t.list; tog.children[1].textContent = t.stack; }

  function init() {
    var jl = document.getElementById('journal-list'), cnt = document.getElementById('journal-count');
    if (!jl || !cnt || ready) return; ready = true;
    var st = document.createElement('style'); st.id = 'ts-style'; st.textContent = css; document.head.appendChild(st);
    var chev = function (d) { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>'; };
    root = document.createElement('div'); root.className = 'ts-root'; jl.after(root);
    root.innerHTML = '<div class="ts-deck" role="group" aria-roledescription="carousel"></div>' +
      '<div class="ts-ctl"><button type="button" class="ts-nb ts-prev">' + chev('M15 18l-6-6 6-6') + '</button>' +
      '<div class="ts-prog"><span class="ts-count"></span><div class="ts-bar"><i></i></div></div>' +
      '<button type="button" class="ts-nb ts-next">' + chev('M9 18l6-6-6-6') + '</button></div><p class="ts-hintline"></p>';
    deck = $('.ts-deck'); bind();
    tog = document.createElement('div'); tog.className = 'ts-flt'; tog.setAttribute('role', 'group');
    tog.innerHTML = '<button type="button" data-ts-mode="list"></button><button type="button" data-ts-mode="stack"></button>';
    cnt.before(tog); labels();
    tog.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setMode(b.dataset.tsMode, true); });
    // daftar journal dirender ulang oleh aplikasi (filter, sort, simpan, hapus): stack ikut mengikuti
    var pend = 0;
    new MutationObserver(function () { if (mode !== 'stack' || pend) return; pend = setTimeout(function () { pend = 0; build(); }, 0); }).observe(jl, { childList: true });
    var saved = 'list'; try { saved = localStorage.getItem('doaibu.journalView') || 'list'; } catch (e) {}
    setMode(saved);
  }

  window.addEventListener('viewchange', function (e) { if (e && e.detail && e.detail.view === 'dashboard' && visible()) requestAnimationFrame(layout); });
  window.addEventListener('moneychange', function () { if (visible()) build(); });
  document.addEventListener('change', function (e) { if (e.target && /language/.test(e.target.id || '')) setTimeout(function () { if (!ready) return; labels(); if (visible()) build(); }, 0); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.TradeStack = { go: go, setMode: function (m) { if (ready) setMode(m, true); }, rebuild: function () { if (visible()) build(); } };
})();
