/* v16.61 · Journal Detail Cinematic
   Panel detail trade dibuat seperti laporan evaluasi:
     1) ringkasan hasil di atas (P/L besar di header + baris metrik R / Risk / Evaluasi / Biaya),
     2) screenshot setup sebagai fokus visual (satu foto besar + strip thumbnail, ketuk untuk zoom),
     3) Alasan Entry · Emosi · Evaluasi sebagai bagian yang bisa dibuka-tutup.
   Aturan: bagian/metrik yang datanya tidak ada TIDAK ditampilkan (tidak ada isi karangan).
   Dipanggil oleh renderJournalDetail() di index.html; panel & navigasinya tetap milik journal-ux.js. */
(function () {
  'use strict';
  var T = {
    id: { shot: 'Screenshot setup', zoom: 'Ketuk untuk perbesar', noShot: 'Belum ada screenshot setup untuk trade ini.', entry: 'Alasan Entry', emo: 'Emosi', evalu: 'Evaluasi',
      notes: 'Catatan & lesson learned', kR: 'Hasil R', kRisk: 'Risk', kRate: 'Evaluasi', kFee: 'Biaya', of: 'dari', picShot: 'Tampilkan screenshot', ctx: 'Konteks market', more: 'lainnya', rate: 'bintang', auto: 'Ringkasan otomatis' },
    en: { shot: 'Setup screenshot', zoom: 'Tap to enlarge', noShot: 'No setup screenshot for this trade yet.', entry: 'Entry rationale', emo: 'Emotions', evalu: 'Evaluation',
      notes: 'Notes & lesson learned', kR: 'R result', kRisk: 'Risk', kRate: 'Rating', kFee: 'Costs', of: 'of', picShot: 'Show screenshot', ctx: 'Market context', more: 'more', rate: 'stars', auto: 'Auto summary' },
    ms: { shot: 'Tangkap skrin setup', zoom: 'Ketik untuk besarkan', noShot: 'Belum ada tangkap skrin setup untuk dagangan ini.', entry: 'Sebab Kemasukan', emo: 'Emosi', evalu: 'Penilaian',
      notes: 'Nota & pengajaran', kR: 'Hasil R', kRisk: 'Risiko', kRate: 'Penilaian', kFee: 'Kos', of: 'daripada', picShot: 'Papar tangkap skrin', ctx: 'Konteks pasaran', more: 'lagi', rate: 'bintang', auto: 'Ringkasan automatik' },
    es: { shot: 'Captura del setup', zoom: 'Toca para ampliar', noShot: 'Aún no hay captura del setup para este trade.', entry: 'Motivo de entrada', emo: 'Emociones', evalu: 'Evaluación',
      notes: 'Notas y lecciones', kR: 'Resultado R', kRisk: 'Riesgo', kRate: 'Valoración', kFee: 'Costos', of: 'de', picShot: 'Mostrar captura', ctx: 'Contexto de mercado', more: 'más', rate: 'estrellas', auto: 'Resumen automático' }
  };
  function L() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return T[l] || T.id; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
  function money(v) { try { return window.Money.format(v, { plus: true }); } catch (e) { return (v > 0 ? '+' : '') + v; } }
  function tone(v) { return v > 0 ? 'pos' : v < 0 ? 'neg' : ''; }
  function clip(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; }

  var userOpen = {};   // pilihan buka/tutup pengguna; bertahan saat pindah trade dengan ‹ ›

  function metrics(j, t) {
    var out = [], r = num(j.rMultiple), risk = num(j.riskPct), rate = num(j.rating), fee = num(j.fees);
    if (r !== null) out.push([t.kR, (r > 0 ? '+' : '') + (Math.round(r * 100) / 100) + 'R', tone(r)]);
    if (risk !== null) out.push([t.kRisk, (Math.round(risk * 100) / 100) + '%', '']);
    if (rate !== null && rate >= 1 && rate <= 5) {
      var n = Math.round(rate);
      out.push([t.kRate, '<span class="jc-stars" role="img" aria-label="' + n + ' / 5 ' + esc(t.rate) + '">' + '\u2605'.repeat(n) + '\u2606'.repeat(5 - n) + '</span>', '', true]);
    }
    if (fee !== null) out.push([t.kFee, money(-fee), fee > 0 ? 'neg' : tone(-fee)]);
    if (!out.length) return '';
    return '<div class="jc-kpis jc-n' + out.length + '" style="--n:' + out.length + '">' + out.map(function (m) {
      return '<div class="jc-k"><small>' + esc(m[0]) + '</small><b class="' + m[2] + '">' + (m[3] ? m[1] : esc(m[1])) + '</b></div>';
    }).join('') + '</div>';
  }

  function hero(charts, t) {
    if (!charts.length) return '<div class="jc-noshot"><span aria-hidden="true">\u25A3</span>' + esc(t.noShot) + '</div>';
    var u = esc(charts[0]), n = charts.length;
    var thumbs = n > 1 ? '<div class="jc-thumbs" role="group" aria-label="' + esc(t.shot) + '">' + charts.map(function (c, i) {
      return '<button type="button" class="jc-thumb' + (i === 0 ? ' on' : '') + '" data-jcthumb="' + i + '" data-src="' + esc(c) + '" aria-pressed="' + (i === 0) + '" aria-label="' + esc(t.picShot) + ' ' + (i + 1) + '"><img src="' + esc(c) + '" alt="" loading="lazy"></button>';
    }).join('') + '</div>' : '';
    return '<figure class="jc-hero" data-n="' + n + '">' +
      '<button type="button" class="jc-shot" data-jcshot aria-label="' + esc(t.zoom) + '">' +
        '<img class="jc-bg" src="' + u + '" alt="" aria-hidden="true">' +
        '<img class="jc-img zoomable-chart" src="' + u + '" alt="' + esc(t.shot) + ' 1 ' + esc(t.of) + ' ' + n + '">' +
        '<span class="jc-cap"><b>' + esc(t.shot) + '</b>' + (n > 1 ? '<em class="jc-count">1 / ' + n + '</em>' : '') + '</span>' +
        '<span class="jc-hint">' + esc(t.zoom) + '</span>' +
      '</button>' + thumbs + '</figure>';
  }

  function section(key, no, title, preview, inner, open) {
    return '<section class="jc-sec' + (open ? ' jc-open' : '') + '" data-jcs="' + key + '">' +
      '<button type="button" class="jc-sh" data-jcx="' + key + '" aria-expanded="' + open + '" aria-controls="jc-' + key + '">' +
        '<span class="jc-no" aria-hidden="true">' + no + '</span>' +
        '<span class="jc-st"><b>' + esc(title) + '</b>' + (preview ? '<small>' + esc(preview) + '</small>' : '') + '</span>' +
        '<i class="jc-chev" aria-hidden="true"></i></button>' +
      '<div class="jc-sb" id="jc-' + key + '"><div class="jc-si"' + (open ? '' : ' inert') + '>' + inner + '</div></div></section>';
  }

  /* j = baris trade; P = bagian siap pakai dari jrParts(); X = { summary: html ringkasan otomatis } */
  function body(j, P, X) {
    var t = L(), charts = (j.charts || []).filter(Boolean), tags = (j.tags || []).filter(Boolean), emo = (j.emotions || []).filter(Boolean);
    X = X || {};
    var secs = [];

    var entryInner = (tags.length ? '<div class="jc-grp"><h5>Setup</h5><div class="jr-chips">' + tags.map(function (x) { return '<span class="jr-tag">#' + esc(x) + '</span>'; }).join('') + '</div></div>' : '') +
      (P.sessionHtml ? '<div class="jc-grp"><h5>Sesi</h5><div class="jr-sess">' + P.sessionHtml + '</div></div>' : '') +
      (P.outlookHtml || '') + (P.stratHtml ? '<div class="jc-grp">' + P.stratHtml + '</div>' : '');
    if (entryInner) {
      var pv = tags.length ? tags.slice(0, 3).map(function (x) { return '#' + x; }).join(' · ') + (tags.length > 3 ? ' +' + (tags.length - 3) : '') : (P.outlookHtml ? t.ctx : '');
      secs.push({ k: 'entry', title: t.entry, pv: pv, html: entryInner });
    }
    if (emo.length) {
      secs.push({ k: 'emo', title: t.emo, pv: emo.slice(0, 3).join(', ') + (emo.length > 3 ? ' +' + (emo.length - 3) : ''), html: '<div class="jr-chips jr-emo">' + P.emotionsHtml + '</div>' });
    }
    var evalInner = (X.summary || '') + (j.notes ? '<div class="jc-grp"><h5>' + esc(t.notes) + '</h5><blockquote class="jc-note">' + esc(j.notes) + '</blockquote></div>' : '');
    if (evalInner) secs.push({ k: 'eval', title: t.evalu, pv: j.notes ? clip(j.notes, 64) : t.auto, html: evalInner });

    var first = secs.length ? secs[0].k : '';
    var secHtml = secs.map(function (s, i) {
      var open = userOpen.hasOwnProperty(s.k) ? !!userOpen[s.k] : s.k === first;
      return section(s.k, (i + 1 < 10 ? '0' : '') + (i + 1), s.title, s.pv, s.html, open);
    }).join('');

    var m = metrics(j, t), h = hero(charts, t);
    if (!secHtml && !m && !charts.length) return '';
    return '<div class="jc-wrap">' + m + h + secHtml + '</div>';
  }

  /* ---------- interaksi (delegasi; panel dirender ulang tiap pindah trade) ---------- */
  document.addEventListener('click', function (e) {
    var x = e.target.closest && e.target.closest('[data-jcx]');
    if (x) {
      var box = x.closest('.jc-sec'), key = x.getAttribute('data-jcx'); if (!box) return;
      var open = !box.classList.contains('jc-open'), inner = box.querySelector('.jc-si');
      box.classList.toggle('jc-open', open); x.setAttribute('aria-expanded', open);
      if (inner) { if (open) inner.removeAttribute('inert'); else inner.setAttribute('inert', ''); }
      userOpen[key] = open; return;
    }
    var th = e.target.closest && e.target.closest('[data-jcthumb]');
    if (th) {
      var hero = th.closest('.jc-hero'), src = th.getAttribute('data-src'), i = +th.getAttribute('data-jcthumb'), n = +hero.getAttribute('data-n') || 1, t = L();
      var img = hero.querySelector('.jc-img'), bg = hero.querySelector('.jc-bg'), cnt = hero.querySelector('.jc-count');
      if (img) { img.src = src; img.alt = t.shot + ' ' + (i + 1) + ' ' + t.of + ' ' + n; } if (bg) bg.src = src; if (cnt) cnt.textContent = (i + 1) + ' / ' + n;
      [].forEach.call(hero.querySelectorAll('.jc-thumb'), function (b) { var on = b === th; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      return;
    }
    var shot = e.target.closest && e.target.closest('[data-jcshot]');   // Enter/Space pada tombol -> teruskan ke gambar (zoom milik index.html)
    if (shot && !(e.target.closest && e.target.closest('.zoomable-chart'))) { var im = shot.querySelector('.zoomable-chart'); if (im) im.click(); }
  });
  /* Header memadat saat isi di-scroll (hanya bila halaman cukup panjang, supaya tidak berkedip). paint() mereset kelasnya tiap pindah trade. */
  document.addEventListener('scroll', function (e) {
    var el = e.target; if (!el || !el.classList || !el.classList.contains('jd-body')) return;
    var panel = el.closest('.jd-panel'); if (!panel || !panel.classList.contains('jc')) return;
    var on = panel.classList.contains('jc-compact'), y = el.scrollTop;
    if (!on && y > 70 && el.scrollHeight - el.clientHeight > 260) panel.classList.add('jc-compact');
    else if (on && y < 12) panel.classList.remove('jc-compact');
  }, true);
  document.addEventListener('error', function (e) {   // gambar gagal dimuat -> sembunyikan figur, jangan tampilkan ikon rusak
    var el = e.target; if (!el || el.tagName !== 'IMG' || !el.closest) return;
    var hero = el.closest('.jc-hero'); if (!hero) return;
    if (el.classList.contains('jc-img')) hero.classList.add('jc-broken');
    else if (el.closest('.jc-thumb')) el.closest('.jc-thumb').style.display = 'none';
  }, true);

  window.JournalCinematic = { body: body, version: '16.61' };
})();
