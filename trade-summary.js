/* Automatic Trade Summary
   Setelah journal disimpan, sistem membuat ringkasan satu paragraf dari data journal itu sendiri:
   setup, sesi, risk %, hasil R, dan evaluasi (bintang). Bagian yang tidak diisi dilewati, tidak dikarang.
   Field baru di dokumen journal (semua opsional): riskPct (angka, %), rMultiple (angka, R), rating (1-5).
   Tidak perlu mengubah Firestore Rules. */
(function () {
  'use strict';
  var T = {
    id: { title: 'Trade Summary', took: 'Kamu mengambil', trade: 'trade', setup: 'setup', on: 'pada sesi', risk: 'dengan', closed: 'Trade ditutup pada', closedPl: 'Trade ditutup dengan hasil', closedDay: 'Total hari ini ditutup pada', closedDayPl: 'Total hari ini ditutup dengan hasil', eval: 'Evaluasi trade kamu hari ini adalah', close: 'Tutup', refl: 'Refleksi', dir: 'arah',
      lRisk: 'Risk per trade (%)', lR: 'Hasil (R)', hRisk: 'Contoh: 1', hR: 'Contoh: 2.1 atau -1', optional: 'Opsional · dipakai untuk Trade Summary', lRate: 'Evaluasi trade hari ini', hRate: 'Ketuk bintang lagi untuk menghapus', star: 'bintang', of: 'dari 5' },
    en: { title: 'Trade Summary', took: 'You took', trade: 'trade', setup: 'setup', on: 'in the', risk: 'with', closed: 'The trade closed at', closedPl: 'The trade closed with', closedDay: 'Today closed at a total of', closedDayPl: 'Today closed with a total of', eval: 'Your trade evaluation today is', refl: 'Reflection', close: 'Close', dir: 'direction',
      lRisk: 'Risk per trade (%)', lR: 'Result (R)', hRisk: 'e.g. 1', hR: 'e.g. 2.1 or -1', optional: 'Optional · used for the Trade Summary', lRate: "Today's trade evaluation", hRate: 'Tap the same star again to clear', star: 'star', of: 'out of 5' }
  };
  var SESS_EN = { Asia: 'Asia', London: 'London', NewYork: 'New York', Overlap: 'Overlap' };
  function lang() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return (l === 'en' || l === 'es') ? 'en' : 'id'; }
  function L() { return T[lang()]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
  function trim(n) { return String(Math.round(n * 100) / 100); }
  function fmtR(r) { return (r > 0 ? '+' : '') + trim(r) + 'R'; }
  function stars(n) { n = Math.max(0, Math.min(5, n | 0)); return new Array(n + 1).join('\u2605') + new Array(6 - n).join('\u2606'); }
  function money(v) { try { return window.Money ? Money.format(v, { plus: true }) : (v > 0 ? '+' : '') + v.toFixed(2); } catch (e) { return String(v); } }
  /* Refleksi = isi kolom Catatan / Lesson Learned. Baris otomatis dari import broker tidak ikut ditampilkan. */
  function reflection(j) {
    return String(j && j.notes || '').split('\n').filter(function (l) { return l.indexOf('[Import broker statement]') !== 0; }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function reflHTML(s) {
    return s.refl ? '<div class="tsum-refl"><div class="tsum-refl-ttl">' + esc(L().refl) + '</div><div class="tsum-refl-txt">' + esc(s.refl) + '</div></div>' : '';
  }
  function sessions(j) {
    var SL = {}; try { SL = SESSION_LABELS; } catch (e) {}
    return (j.session || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) { return SL[s] || SESS_EN[s] || s; });
  }

  /* Bangun ringkasan. Mengembalikan { text, html, parts } atau null bila tidak ada data. */
  function build(j) {
    if (!j) return null;
    var t = L(), en = lang() === 'en', n = j.trades || 1, multi = n > 1;
    var tags = (j.tags || []).filter(Boolean), sess = sessions(j), risk = num(j.riskPct), r = num(j.rMultiple), rate = num(j.rating), pl = num(j.pl);
    var rateOk = rate !== null && rate >= 1 && rate <= 5;

    /* \u0001..\u0002 = tebal; \u0003..\u0002 = hasil (diwarnai sesuai tone). Dibuang pada versi teks polos. */
    var B = function (x) { return '\u0001' + x + '\u0002'; }, RS = function (x) { return '\u0003' + x + '\u0002'; };
    var what = tags.length ? t.setup + ' ' + B(tags.join(', ')) : (multi ? B(n + ' ' + t.trade + (en ? 's' : '')) : (en ? 'a ' : '') + t.trade);
    var s1 = t.took + ' ' + what;
    if (j.pair) s1 += (en ? ' on ' : ' di ') + B(j.pair);
    if (sess.length) s1 += ' ' + t.on + ' ' + B(sess.join(' + ')) + (en ? ' session' : '');
    if (risk !== null && risk > 0) s1 += ' ' + t.risk + ' ' + B(en ? trim(risk) + '% risk' : 'risk ' + trim(risk) + '%');
    s1 += '.';

    var s2 = '';
    if (r !== null) s2 = (multi ? t.closedDay : t.closed) + ' ' + RS(fmtR(r)) + (pl !== null ? ' (' + RS(money(pl)) + ')' : '') + '.';
    else if (pl !== null) s2 = (multi ? t.closedDayPl : t.closedPl) + ' ' + RS(money(pl)) + '.';

    var s3 = rateOk ? t.eval + ' ' + stars(rate) + '.' : '';
    var parts = [s1, s2, s3].filter(Boolean);
    var tone = (r !== null ? r : (pl || 0)) > 0 ? 'pos' : (r !== null ? r : (pl || 0)) < 0 ? 'neg' : 'zero';
    var chip = r !== null ? fmtR(r) : (pl !== null ? money(pl) : '');
    var refl = reflection(j);
    var text = parts.join(' ').replace(/[\u0001\u0002\u0003]/g, '') + (refl ? '\n' + t.refl + ': ' + refl : '');
    return { text: text, refl: refl, parts: parts, tone: tone, rating: rateOk ? rate : 0, chip: chip };
  }

  var ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15l3-4 3 2 5-6"/></svg>';
  function partHTML(p, rating) {
    var h = esc(p).replace(/\u0001/g, '<b class="tsum-hl">').replace(/\u0003/g, '<b class="tsum-res">').replace(/\u0002/g, '</b>');
    return rating ? h.replace(/([\u2605\u2606]{5})/, '<span class="tsum-stars" aria-label="' + rating + ' ' + L().of + '">$1</span>') : h;
  }
  function bodyHTML(s) {
    return s.parts.map(function (p) { return partHTML(p, /[\u2605\u2606]{5}/.test(p) ? s.rating : 0); }).join(' ');
  }
  /* Blok ringkas untuk kartu journal di dashboard / Trade Stack */
  function cardHTML(j) {
    var s = build(j); if (!s) return '';
    return '<div class="tsum-inline ' + s.tone + '"><div class="tsum-hd"><span class="tsum-ic" aria-hidden="true">' + ICON + '</span><span class="tsum-ttl">' + esc(L().title) + '</span>' +
      (s.chip ? '<span class="tsum-chip">' + esc(s.chip) + '</span>' : '') + '</div><p>' + bodyHTML(s) + '</p>' + reflHTML(s) + '</div>';
  }

  var css = '' +
/* Warna per tone: pos = hijau toska, neg = merah koral, zero = emas */
'.tsum-inline,.tsum-card{--tc:#C8A96A;--tc-1:rgba(200,169,106,.20);--tc-2:rgba(200,169,106,.06);--tc-b:rgba(200,169,106,.45);--tc-glow:rgba(200,169,106,.40);--tc-ink:#1a1405}' +
'.tsum-inline.pos,.tsum-card.pos{--tc:#2dd4bf;--tc-1:rgba(45,212,191,.26);--tc-2:rgba(45,212,191,.07);--tc-b:rgba(45,212,191,.60);--tc-glow:rgba(45,212,191,.50);--tc-ink:#03211d}' +
'.tsum-inline.neg,.tsum-card.neg{--tc:#ff7a68;--tc-1:rgba(255,122,104,.26);--tc-2:rgba(255,122,104,.07);--tc-b:rgba(255,122,104,.60);--tc-glow:rgba(255,122,104,.50);--tc-ink:#2a0804}' +
'body.light .tsum-inline,body.light .tsum-card{--tc:#8a6a10;--tc-1:rgba(200,169,106,.30);--tc-2:rgba(200,169,106,.10);--tc-b:rgba(138,106,16,.45);--tc-glow:rgba(138,106,16,.25);--tc-ink:#fff}' +
'body.light .tsum-inline.pos,body.light .tsum-card.pos{--tc:#0f766e;--tc-1:rgba(15,118,110,.18);--tc-2:rgba(15,118,110,.06);--tc-b:rgba(15,118,110,.50);--tc-glow:rgba(15,118,110,.28)}' +
'body.light .tsum-inline.neg,body.light .tsum-card.neg{--tc:#b83526;--tc-1:rgba(184,53,38,.16);--tc-2:rgba(184,53,38,.05);--tc-b:rgba(184,53,38,.50);--tc-glow:rgba(184,53,38,.26)}' +
/* Modal setelah simpan */
'.tsum-ov{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.6);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);opacity:0;transition:opacity .25s}' +
'.tsum-ov.on{opacity:1}' +
'.tsum-card{width:100%;max-width:440px;padding:28px;border-radius:28px;position:relative;overflow:hidden;transform:translateY(14px) scale(.98);transition:transform .35s cubic-bezier(.2,.8,.2,1);' +
  'background:radial-gradient(120% 80% at 50% 0%,var(--tc-1),transparent 70%),linear-gradient(160deg,#1e1f23 0%,#131417 58%,#0e0f11 100%);border:1px solid var(--tc-b);box-shadow:0 28px 50px -22px rgba(0,0,0,.75),0 0 44px -14px var(--tc-glow),inset 0 1px 0 rgba(255,255,255,.07)}' +
'.tsum-ov.on .tsum-card{transform:none}' +
'.tsum-card{max-height:90vh;overflow-y:auto}' +
'.tsum-refl{margin-top:12px;padding-top:12px;border-top:1px dashed var(--tc-b)}' +
'.tsum-refl-ttl{font-size:12px;letter-spacing:0;text-transform:none;font-weight:600;color:var(--tc);margin-bottom:4px}' +
'.tsum-refl-txt{font-size:15px;line-height:1.65;white-space:pre-wrap;word-break:break-word;color:rgba(255,255,255,.82)}' +
'.tsum-card .tsum-refl{margin:-8px 0 20px}' +
'body.light .tsum-refl-txt{color:#3f3f46}' +
'.tsum-card::after{content:"";position:absolute;left:10%;right:10%;top:0;height:2px;background:linear-gradient(90deg,transparent,var(--tc),transparent)}' +
'.tsum-eye{font-size:12px;letter-spacing:0;text-transform:none;font-weight:600;color:var(--tc)}' +
'.tsum-sub{margin-top:4px;font-size:13px;color:var(--text-secondary,rgba(235,235,245,.65))}' +
'.tsum-big{margin-top:16px;font-size:clamp(40px,12vw,52px);font-weight:600;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums;color:var(--tc);text-shadow:0 0 28px var(--tc-glow)}' +
'.tsum-body{margin:16px 0 24px;font-size:17px;line-height:1.7;color:rgba(255,255,255,.92)}' +
/* Blok ringkas di kartu journal / Trade Stack */
'.tsum-inline{position:relative;margin:16px 0 2px;padding:12px 16px 16px 20px;border-radius:16px;overflow:hidden;clear:both;' +
  'border:1px solid var(--tc-b);background:linear-gradient(135deg,var(--tc-1),var(--tc-2) 70%);box-shadow:0 10px 26px -16px var(--tc-glow)}' +
'.tsum-inline::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--tc);box-shadow:0 0 14px var(--tc-glow)}' +
'.tsum-hd{display:flex;align-items:center;gap:8px;margin-bottom:8px}' +
'.tsum-ic{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:8px;flex:none;background:var(--tc);color:var(--tc-ink)}' +
'.tsum-ttl{font-size:12px;letter-spacing:0;text-transform:none;font-weight:600;color:var(--tc)}' +
'.tsum-chip{margin-left:auto;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600;letter-spacing:-.01em;white-space:nowrap;font-variant-numeric:tabular-nums;background:var(--tc);color:var(--tc-ink);box-shadow:0 4px 14px -4px var(--tc-glow)}' +
'.tsum-inline p{margin:0;font-size:15px;line-height:1.65;color:rgba(255,255,255,.88)}' +
'.tsum-hl{font-weight:700;color:#fff}' +
'.tsum-res{font-weight:700;color:var(--tc)}' +
'body.light .tsum-inline p,body.light .tsum-body{color:#27272a}body.light .tsum-hl{color:#111}' +
'.tsum-stars,.tsum-inline .tsum-stars{color:#fbbf24;letter-spacing:.01em;white-space:nowrap;font-size:1.08em;text-shadow:0 0 10px rgba(251,191,36,.45)}' +
'body.light .tsum-stars,body.light .tsum-inline .tsum-stars{color:#d49300;text-shadow:none}' +
'.tsum-x{width:100%;height:44px;border-radius:16px;font-size:15px;font-weight:700;border:0;background:var(--tc);color:var(--tc-ink)}' +
'.tsum-x:hover{filter:brightness(1.08)}.tsum-x:focus-visible,.tsum-star:focus-visible{outline:2px solid var(--accent,#C8A96A);outline-offset:2px}' +
'.jr>.tsum-inline{margin:16px 0 2px}' +
'@media (min-width:721px){.jr>.tsum-inline{margin-left:120px}}' +
'@media (min-width:721px) and (max-width:900px){.jr>.tsum-inline{margin-left:112px}}' +
/* Field form */
'.tsum-fld{margin-top:4px}.tsum-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
'.tsum-rate{display:flex;gap:4px}.tsum-star{width:44px;height:44px;border:0;background:transparent;font-size:28px;line-height:1;color:var(--text-tertiary,rgba(235,235,245,.3));transition:color .15s,transform .15s}' +
'.tsum-star.on{color:var(--accent,#C8A96A)}.tsum-star:active{transform:scale(.88)}' +
'.tsum-quick-r-pill{padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);font-size:11px;font-weight:600;color:rgba(255,255,255,.8);cursor:pointer;transition:all .15s}' +
'.tsum-quick-r-pill:hover{background:rgba(200,169,106,.2);border-color:rgba(200,169,106,.5);color:#d4af37}' +
'.tsum-quick-r-pill:active{transform:scale(.95)}' +
'.tsum-calc-toggle-btn{background:none;border:none;padding:0;cursor:pointer}' +
'.tsum-calc-box{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 12px}' +
'body.light .tsum-card{background:radial-gradient(120% 80% at 50% 0%,var(--tc-1),transparent 70%),linear-gradient(160deg,#fff 0%,#f6f4ee 60%,#efece3 100%)}body.light .tsum-sub{color:#52525b}' +
'@media (prefers-reduced-motion:reduce){.tsum-ov,.tsum-card{transition:none}}';

  function addStyle() { var s = document.createElement('style'); s.id = 'tsum-css'; s.textContent = css; document.head.appendChild(s); }

  /* ---------- Field baru di form journal ---------- */
  var INP = 'w-full bg-dark-700/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gold-500/60';
  function injectFields() {
    var form = document.getElementById('journal-form'); if (!form || document.getElementById('input-risk')) return;
    var t = L();
    var slotRisk = document.getElementById('jf-slot-risk'), slotR = document.getElementById('jf-slot-r');
    if (slotRisk && slotR) {
      // v16.67: form 4 langkah — Risk di Eksekusi, Hasil (R) di Hasil. Isi & id field tidak berubah.
      var wr = document.createElement('div'); wr.className = 'tsum-fld';
      wr.innerHTML = '<label class="block text-sm text-gray-400 mb-1.5" for="input-risk" data-tsum="lRisk">' + t.lRisk + '</label><input type="number" inputmode="decimal" id="input-risk" min="0" step="any" placeholder="' + t.hRisk + '" class="' + INP + '">';
      slotRisk.insertBefore(wr, slotRisk.firstChild);
      var wR = document.createElement('div'); wR.className = 'tsum-fld';
      wR.innerHTML = '<label class="block text-sm text-gray-400 mb-1.5" for="input-r" data-tsum="lR">' + t.lR + '</label><input type="number" inputmode="decimal" id="input-r" step="any" placeholder="' + t.hR + '" class="' + INP + '">' +
        '<div id="tsum-r-helpers" class="mt-2 space-y-1.5">' +
          '<div id="tsum-quick-r-row" class="tsum-quick-r-row flex flex-wrap items-center gap-1.5" style="display:none;"></div>' +
          '<div class="flex items-center justify-between">' +
            '<p class="text-xs text-gray-500" data-tsum="optional">' + t.optional + '</p>' +
            '<button type="button" id="tsum-btn-toggle-calc" class="tsum-calc-toggle-btn text-xs text-gold-400 hover:text-gold-300 font-medium">⚡ Hitung R dari Resiko ($)</button>' +
          '</div>' +
          '<div id="tsum-calc-box" class="tsum-calc-box" style="display:none;">' +
            '<div class="flex items-center justify-between gap-2 mb-1.5">' +
              '<span class="text-xs text-gray-400">Nilai Resiko 1R ($):</span>' +
              '<input type="number" id="tsum-calc-risk-dollar" placeholder="100" class="bg-dark-900/80 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white w-24 text-right focus:outline-none focus:border-gold-500" step="any" min="1">' +
            '</div>' +
            '<div class="flex items-center justify-between text-xs pt-1 border-t border-white/5">' +
              '<span class="text-gray-400">Estimasi: <b id="tsum-calc-res" class="text-gold-400 font-semibold">—</b></span>' +
              '<button type="button" id="tsum-btn-apply-calc-r" class="btn-token-act primary py-1 px-2.5 text-xs font-semibold">Terapkan ke R</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      slotR.appendChild(wR);
      setupAutoRHelper();
    } else {
    var grp = document.getElementById('trade-result-group'), anchor = grp && grp.parentElement && grp.parentElement.parentElement;
    if (anchor) {
      var w = document.createElement('div'); w.className = 'tsum-fld';
      w.innerHTML = '<div class="tsum-row">' +
        '<div><label class="block text-sm text-gray-400 mb-1.5" for="input-risk" data-tsum="lRisk">' + t.lRisk + '</label><input type="number" inputmode="decimal" id="input-risk" min="0" step="any" placeholder="' + t.hRisk + '" class="' + INP + '"></div>' +
        '<div><label class="block text-sm text-gray-400 mb-1.5" for="input-r" data-tsum="lR">' + t.lR + '</label><input type="number" inputmode="decimal" id="input-r" step="any" placeholder="' + t.hR + '" class="' + INP + '"></div></div>' +
        '<div id="tsum-r-helpers" class="mt-2 space-y-1.5">' +
          '<div id="tsum-quick-r-row" class="tsum-quick-r-row flex flex-wrap items-center gap-1.5" style="display:none;"></div>' +
          '<div class="flex items-center justify-between">' +
            '<p class="text-xs text-gray-500" data-tsum="optional">' + t.optional + '</p>' +
            '<button type="button" id="tsum-btn-toggle-calc" class="tsum-calc-toggle-btn text-xs text-gold-400 hover:text-gold-300 font-medium">⚡ Hitung R dari Resiko ($)</button>' +
          '</div>' +
          '<div id="tsum-calc-box" class="tsum-calc-box" style="display:none;">' +
            '<div class="flex items-center justify-between gap-2 mb-1.5">' +
              '<span class="text-xs text-gray-400">Nilai Resiko 1R ($):</span>' +
              '<input type="number" id="tsum-calc-risk-dollar" placeholder="100" class="bg-dark-900/80 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white w-24 text-right focus:outline-none focus:border-gold-500" step="any" min="1">' +
            '</div>' +
            '<div class="flex items-center justify-between text-xs pt-1 border-t border-white/5">' +
              '<span class="text-gray-400">Estimasi: <b id="tsum-calc-res" class="text-gold-400 font-semibold">—</b></span>' +
              '<button type="button" id="tsum-btn-apply-calc-r" class="btn-token-act primary py-1 px-2.5 text-xs font-semibold">Terapkan ke R</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      anchor.parentNode.insertBefore(w, anchor.nextSibling);
      setupAutoRHelper();
    }
    }
    var notes = document.getElementById('input-notes'), nb = notes && notes.parentElement;
    if (nb) {
      var r = document.createElement('div');
      r.innerHTML = '<label class="block text-sm text-gray-400 mb-1" data-tsum="lRate" id="tsum-rate-l">' + t.lRate + '</label>' +
        '<div class="tsum-rate" role="radiogroup" aria-labelledby="tsum-rate-l">' + [1, 2, 3, 4, 5].map(function (i) {
          return '<button type="button" class="tsum-star" role="radio" aria-checked="false" data-v="' + i + '" aria-label="' + i + ' ' + t.star + '">\u2605</button>';
        }).join('') + '</div><input type="hidden" id="input-rating" value="">' +
        '<p class="text-xs text-gray-500 mt-1" data-tsum="hRate">' + t.hRate + '</p>';
      var slotRate = document.getElementById('jf-slot-rating');
      if (slotRate) slotRate.appendChild(r); else nb.parentNode.insertBefore(r, nb);
      r.addEventListener('click', function (e) {
        var b = e.target.closest('.tsum-star'); if (!b) return;
        var inp = document.getElementById('input-rating'), v = b.getAttribute('data-v');
        inp.value = inp.value === v ? '' : v; syncStars();
      });
    }
    form.addEventListener('reset', function () { setTimeout(syncStars, 0); });
  }

  function setupAutoRHelper() {
    var inpPl = document.getElementById('input-pl');
    var inpR = document.getElementById('input-r');
    var quickRow = document.getElementById('tsum-quick-r-row');
    var toggleCalcBtn = document.getElementById('tsum-btn-toggle-calc');
    var calcBox = document.getElementById('tsum-calc-box');
    var calcRiskInp = document.getElementById('tsum-calc-risk-dollar');
    var calcResDisp = document.getElementById('tsum-calc-res');
    var applyCalcBtn = document.getElementById('tsum-btn-apply-calc-r');

    if (!inpR || !quickRow) return;

    var savedRisk = '100';
    try { savedRisk = localStorage.getItem('doaibu_last_risk_dollar') || '100'; } catch (e) {}
    if (calcRiskInp) calcRiskInp.value = savedRisk;

    function updateQuickRPills() {
      if (!inpPl || !quickRow) return;
      var rawPl = inpPl.value.trim();
      if (!rawPl && rawPl !== '0') {
        quickRow.style.display = 'none';
        return;
      }
      var pl = parseFloat(rawPl);
      if (isNaN(pl)) {
        quickRow.style.display = 'none';
        return;
      }

      var presets = [];
      if (pl > 0) {
        presets = [1.0, 1.5, 2.0, 2.5, 3.0, 4.0];
      } else if (pl < 0) {
        presets = [-1.0, -0.5, -1.5, -2.0];
      } else {
        presets = [0.0];
      }

      var html = '<span class="text-[11px] text-gray-500 mr-1 self-center">Preset:</span>';
      presets.forEach(function (val) {
        var label = (val > 0 ? '+' : '') + val.toFixed(1) + 'R';
        html += '<button type="button" class="tsum-quick-r-pill" data-r-val="' + val + '">' + label + '</button>';
      });
      quickRow.innerHTML = html;
      quickRow.style.display = 'flex';
      updateCalcResult();
    }

    function updateCalcResult() {
      if (!calcResDisp || !calcRiskInp || !inpPl) return;
      var pl = parseFloat(inpPl.value);
      var riskDollar = parseFloat(calcRiskInp.value);
      if (isNaN(pl) || isNaN(riskDollar) || riskDollar <= 0) {
        calcResDisp.textContent = '—';
        return;
      }
      var rVal = (pl / riskDollar);
      calcResDisp.textContent = (rVal > 0 ? '+' : '') + rVal.toFixed(2) + 'R';
    }

    if (inpPl) {
      inpPl.addEventListener('input', updateQuickRPills);
      inpPl.addEventListener('change', updateQuickRPills);
    }

    quickRow.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-r-val]');
      if (!btn) return;
      var val = btn.getAttribute('data-r-val');
      if (inpR) {
        inpR.value = val;
        inpR.dispatchEvent(new Event('input', { bubbles: true }));
        if (window.IosHaptics) window.IosHaptics.selection();
      }
    });

    if (toggleCalcBtn && calcBox) {
      toggleCalcBtn.addEventListener('click', function () {
        var isHidden = (calcBox.style.display === 'none');
        calcBox.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
          updateCalcResult();
          if (calcRiskInp) calcRiskInp.focus();
        }
      });
    }

    if (calcRiskInp) {
      calcRiskInp.addEventListener('input', function () {
        try { localStorage.setItem('doaibu_last_risk_dollar', calcRiskInp.value); } catch (e) {}
        updateCalcResult();
      });
    }

    if (applyCalcBtn && inpR) {
      applyCalcBtn.addEventListener('click', function () {
        var pl = parseFloat(inpPl ? inpPl.value : '');
        var riskDollar = parseFloat(calcRiskInp ? calcRiskInp.value : '');
        if (!isNaN(pl) && !isNaN(riskDollar) && riskDollar > 0) {
          var rVal = (pl / riskDollar);
          inpR.value = rVal.toFixed(2);
          inpR.dispatchEvent(new Event('input', { bubbles: true }));
          calcBox.style.display = 'none';
          if (window.IosHaptics) window.IosHaptics.success();
        }
      });
    }

    setTimeout(updateQuickRPills, 100);
  }

  function syncStars() {
    var v = parseInt((document.getElementById('input-rating') || {}).value, 10) || 0;
    Array.prototype.forEach.call(document.querySelectorAll('.tsum-star'), function (b) {
      var on = parseInt(b.getAttribute('data-v'), 10) <= v; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(parseInt(b.getAttribute('data-v'), 10) === v));
    });
  }
  function fill(j) {
    var a = document.getElementById('input-risk'), b = document.getElementById('input-r'), c = document.getElementById('input-rating');
    if (a) a.value = num(j.riskPct) !== null ? j.riskPct : '';
    if (b) b.value = num(j.rMultiple) !== null ? j.rMultiple : '';
    if (c) c.value = num(j.rating) ? j.rating : '';
    syncStars();
    var inpPl = document.getElementById('input-pl');
    if (inpPl) inpPl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* ---------- Modal ringkasan setelah simpan ---------- */
  var ov, prevFocus;
  function close() {
    if (!ov) return; var o = ov; ov = null; o.classList.remove('on');
    document.removeEventListener('keydown', onKey, true);
    setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 260);
    try { if (prevFocus && prevFocus.focus) prevFocus.focus(); } catch (e) {}
  }
  function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
  function show(j) {
    var s = build(j); if (!s) return; close();
    var t = L(), d = '';
    try { d = new Date(j.date + 'T00:00:00').toLocaleDateString(lang() === 'en' ? 'en-US' : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) {}
    prevFocus = document.activeElement;
    ov = document.createElement('div'); ov.className = 'tsum-ov';
    ov.innerHTML = '<div class="tsum-card ' + s.tone + '" role="dialog" aria-modal="true" aria-labelledby="tsum-t"><div class="tsum-eye" id="tsum-t">' + esc(t.title) + '</div>' +
      (d ? '<div class="tsum-sub">' + esc(d) + '</div>' : '') + (s.chip ? '<div class="tsum-big">' + esc(s.chip) + '</div>' : '') + '<p class="tsum-body">' + bodyHTML(s) + '</p>' + reflHTML(s) + '<button type="button" class="tsum-x">' + esc(t.close) + '</button></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.tsum-x')) close(); });
    document.body.appendChild(ov); document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(function () { ov && ov.classList.add('on'); var b = ov && ov.querySelector('.tsum-x'); if (b) b.focus(); });
  }

  /* Dipicu index.html setelah journal tersimpan & daftar dimuat ulang */
  window.addEventListener('journal-saved', function (e) {
    var id = e.detail && e.detail.id, list = []; try { list = allJournals || []; } catch (x) {}
    var j = (window.__findTradeRow && window.__findTradeRow(id)) || list.filter(function (x) { return x && (x.id === id || x.date === id); })[0];
    if (j) show(j);
  });

  addStyle(); injectFields();
  window.TradeSummary = { build: build, cardHTML: cardHTML, show: show, fill: fill, syncStars: syncStars };
})();
