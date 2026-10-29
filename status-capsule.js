/* v16.92 · Live Activity Status Capsule
   Kapsul kecil di atas layar untuk aktivitas yang SEDANG berlangsung, lalu berubah/menghilang saat selesai.
     Simpan journal   -> "Menyimpan journal…" / "Mengunggah chart 1/2…" -> "Journal tersimpan"
     Sinkronisasi     -> "Offline" (menetap) -> online: "Menyinkronkan…" -> "Tersinkron"
     Ekspor laporan   -> "Menyiapkan PDF…" -> "PDF siap · nama-file.pdf"
   Ini komponen web di dalam halaman, BUKAN Live Activity native iOS: tidak tampil di Lock Screen/Dynamic Island,
   dan hilang bila aplikasi ditutup.
   Tidak menyentuh data. Tidak memblokir sentuhan saat berjalan. Pesan dibacakan lewat region aria-live terpisah.

   API (window.StatusCapsule):
     begin(id, {kind, label, detail, progress})   mulai (progress 0..1 = cincin pasti; kosong = berputar)
     update(id, {label, detail, progress})        ubah teks / progres
     ok(id, {label, detail, ttl}) · warn(...) · fail(...)   selesai (otomatis hilang; fail/warn lebih lama)
     end(id)                                      tutup tanpa hasil (mis. validasi gagal, pesannya sudah tampil di tempat lain)
     run({id, kind, label, doneLabel, ...}, fn)   bungkus pekerjaan; fn boleh sinkron/async, return false = batal diam-diam
     exportRun(fmt, fn)  ·  save.{begin, upload, writing, ok, fail, end}  ·  t(key, vars) */
(function () {
  'use strict';
  if (window.StatusCapsule) return;

  var D = document;
  var SHOW_DELAY = 120;     // proses < 120 ms tidak memunculkan kapsul (tanpa kedip)
  var MIN_RUN = 800;        // kapsul "berjalan" terlihat minimal segini sebelum berganti hasil
  var TTL = { ok: 2200, err: 6000, warn: 8000 };
  var PRI = { err: 4, run: 3, warn: 2, off: 2, ok: 1 };

  var T = {
    id: { saving: 'Menyimpan journal…', uploading: 'Mengunggah chart {i}/{n}…', saved: 'Journal tersimpan', saveFail: 'Gagal menyimpan',
      syncing: 'Menyinkronkan…', synced: 'Tersinkron', syncFail: 'Belum tersinkron', syncFailD: 'Dicoba lagi saat online',
      offline: 'Offline', offlineD: 'Disimpan di perangkat', exporting: 'Menyiapkan {fmt}…', exported: '{fmt} siap', exportFail: 'Ekspor gagal' },
    en: { saving: 'Saving journal…', uploading: 'Uploading chart {i}/{n}…', saved: 'Journal saved', saveFail: 'Couldn’t save',
      syncing: 'Syncing…', synced: 'Synced', syncFail: 'Not synced yet', syncFailD: 'Will retry when online',
      offline: 'Offline', offlineD: 'Saved on this device', exporting: 'Preparing {fmt}…', exported: '{fmt} ready', exportFail: 'Export failed' },
    ms: { saving: 'Menyimpan jurnal…', uploading: 'Memuat naik carta {i}/{n}…', saved: 'Jurnal disimpan', saveFail: 'Gagal menyimpan',
      syncing: 'Menyegerak…', synced: 'Disegerakkan', syncFail: 'Belum disegerakkan', syncFailD: 'Cuba lagi apabila dalam talian',
      offline: 'Luar talian', offlineD: 'Disimpan pada peranti ini', exporting: 'Menyediakan {fmt}…', exported: '{fmt} sedia', exportFail: 'Eksport gagal' },
    es: { saving: 'Guardando diario…', uploading: 'Subiendo gráfico {i}/{n}…', saved: 'Diario guardado', saveFail: 'No se pudo guardar',
      syncing: 'Sincronizando…', synced: 'Sincronizado', syncFail: 'Aún sin sincronizar', syncFailD: 'Se reintentará al conectarte',
      offline: 'Sin conexión', offlineD: 'Guardado en este dispositivo', exporting: 'Preparando {fmt}…', exported: '{fmt} listo', exportFail: 'Error al exportar' }
  };
  function lang() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return T[l] ? l : 'id'; }
  function t(key, v) {
    var s = T[lang()][key] || T.id[key] || key;
    return v ? s.replace(/\{(\w+)\}/g, function (_, k) { return v[k] == null ? '' : v[k]; }) : s;
  }

  var acts = [], seq = 0, el, ic, lb, dt, nb, live;
  var lastSig = '', lastMsg = '', delayT = 0, morphT = 0, wasOffline = false;
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function find(id) { for (var i = 0; i < acts.length; i++) if (acts[i].id === id) return acts[i]; return null; }
  function errMsg(e) { return e && e.message ? String(e.message) : (e ? String(e) : ''); }

  /* ---------- Ikon ---------- */
  function icon(a) {
    if (a.state === 'run') {
      var det = a.progress != null;
      return '<svg class="lsc-ring" viewBox="0 0 20 20" data-det="' + (det ? 1 : 0) + '"><circle class="lsc-trk" cx="10" cy="10" r="8" pathLength="100"/><circle class="lsc-arc" cx="10" cy="10" r="8" pathLength="100"/></svg>';
    }
    if (a.state === 'ok') return '<svg viewBox="0 0 20 20"><circle class="lsc-ok-disc" cx="10" cy="10" r="9"/><path class="lsc-ok-tick" d="M6 10.4l2.9 2.9 5.2-5.6"/></svg>';
    if (a.state === 'err') return '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"/><path d="M10 6v4.8M10 13.7v.01"/></svg>';
    return '<svg viewBox="0 0 20 20"><path d="M7 15.2h6.6a3.1 3.1 0 0 0 .9-6.1A4.5 4.5 0 0 0 6 7.9"/><path d="M5.2 8.9A3.2 3.2 0 0 0 6.2 15.2"/><path d="M3.8 3.8l12.4 12.4"/></svg>';
  }

  /* ---------- DOM ---------- */
  function build() {
    if (el || !D.body) return !!el;
    el = D.createElement('div'); el.className = 'lsc'; el.setAttribute('aria-hidden', 'true'); el.setAttribute('data-open', '0');
    el.innerHTML = '<span class="lsc-ic"></span><span class="lsc-tx"><span class="lsc-l"></span><span class="lsc-d"></span></span><span class="lsc-n"></span>';
    ic = el.querySelector('.lsc-ic'); lb = el.querySelector('.lsc-l'); dt = el.querySelector('.lsc-d'); nb = el.querySelector('.lsc-n');
    live = D.createElement('div'); live.className = 'lsc-sr'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
    el.addEventListener('click', function () { var a = top(); if (a && a.state !== 'run') drop(a.id); });
    D.body.appendChild(el); D.body.appendChild(live);
    return true;
  }
  function top() {
    var best = null;
    for (var i = 0; i < acts.length; i++) {
      var a = acts[i];
      if (!best || PRI[a.state] > PRI[best.state] || (PRI[a.state] === PRI[best.state] && a.seq > best.seq)) best = a;
    }
    return best;
  }
  function closeCap() {
    if (!el) return;
    el.setAttribute('data-open', '0'); lastSig = ''; lastMsg = ''; clearTimeout(morphT); el.style.width = '';
    if (live) live.textContent = '';
  }

  function render() {
    D.documentElement.classList.toggle('lsc-save', acts.some(function (a) { return a.kind === 'save' && a.state === 'run'; }));
    if (!build()) return;
    clearTimeout(delayT);
    var a = top();
    if (!a) { closeCap(); return; }
    var open = el.getAttribute('data-open') === '1';
    if (a.state === 'run' && !a.now && !open) {                 // tunda: proses sangat cepat tidak perlu kapsul
      var left = SHOW_DELAY - (Date.now() - a.t0);
      if (left > 0) { delayT = setTimeout(render, left); return; }
    }
    var w0 = open ? el.offsetWidth : 0;
    var det = a.progress != null, sig = a.state + (det ? 'd' : 'i');
    if (sig !== lastSig) {
      var hadIcon = !!lastSig;
      ic.innerHTML = icon(a); lastSig = sig;
      if (hadIcon && !reduce.matches) { ic.classList.remove('pop'); void ic.offsetWidth; ic.classList.add('pop'); }
    }
    if (a.state === 'run' && det) { var arc = ic.querySelector('.lsc-arc'), p = Math.max(0, Math.min(1, a.progress)) * 100; if (arc) arc.style.strokeDasharray = p + ' ' + (100 - p); }
    lb.textContent = a.label || ''; dt.textContent = a.detail || '';
    var more = 0; acts.forEach(function (x) { if (x !== a && x.state !== 'ok') more++; });
    nb.textContent = more ? '+' + more : '';
    el.setAttribute('data-state', a.state); el.setAttribute('data-kind', a.kind || '');
    el.setAttribute('data-sticky', a.state === 'run' || a.state === 'ok' ? '0' : '1');
    if (w0 && !reduce.matches) {                                // morf lebar: lebar lama -> lebar alami yang baru
      el.style.width = 'auto'; var w1 = el.offsetWidth;
      if (Math.abs(w1 - w0) > 1) {
        el.style.width = w0 + 'px'; void el.offsetWidth; el.style.width = w1 + 'px';
        clearTimeout(morphT); morphT = setTimeout(function () { el.style.width = ''; }, 400);
      } else el.style.width = '';
    }
    el.setAttribute('data-open', '1');
    var msg = (a.label || '') + (a.detail ? '. ' + a.detail : '');
    if (msg !== lastMsg) { lastMsg = msg; live.textContent = msg; }
  }

  /* ---------- Model aktivitas ---------- */
  function put(id, patch) {
    var a = find(id);
    if (!a) { a = { id: id, kind: '', state: 'run', label: '', detail: '', progress: null, t0: Date.now(), seq: 0, now: false, fin: false, timer: 0 }; acts.push(a); }
    for (var k in patch) if (patch[k] !== undefined) a[k] = patch[k];
    a.seq = ++seq; clearTimeout(a.timer); a.timer = 0;
    return a;
  }
  function drop(id) {
    var a = find(id); if (!a) return;
    clearTimeout(a.timer); acts.splice(acts.indexOf(a), 1); render();
  }
  function begin(id, o) {
    o = o || {};
    put(id, { kind: o.kind || '', state: 'run', label: o.label || '', detail: o.detail || '', progress: o.progress == null ? null : o.progress, t0: Date.now(), now: !!o.immediate, fin: false });
    render();
  }
  function update(id, o) {
    o = o || {};
    if (!find(id)) return begin(id, o);
    put(id, { label: o.label, detail: o.detail, progress: o.progress === undefined ? undefined : o.progress });
    render();
  }
  function finish(id, state, o) {
    o = o || {};
    var a = find(id);
    var wait = a && a.state === 'run' ? Math.max(0, MIN_RUN - (Date.now() - a.t0)) : 0;
    function apply() {
      var x = put(id, { kind: o.kind, state: state, label: o.label || (a && a.label) || '', detail: o.detail === undefined ? '' : o.detail, progress: null, fin: false });
      var ttl = o.ttl != null ? o.ttl : TTL[state];
      render();
      if (ttl) x.timer = setTimeout(function () { drop(id); }, ttl);
    }
    if (a && wait) { a.fin = true; clearTimeout(a.timer); a.timer = setTimeout(apply, wait); } else apply();
  }
  function end(id) { var a = find(id); if (a && a.state === 'run' && !a.fin) drop(id); }

  function run(spec, fn) {
    spec = spec || {};
    var id = spec.id || 'run' + (++seq);
    begin(id, { kind: spec.kind, label: spec.label, detail: spec.detail, progress: spec.progress, immediate: true });
    return new Promise(function (resolve) {
      var went = false;
      function go() {
        if (went) return; went = true;
        var out; try { out = fn(); } catch (e) { out = Promise.reject(e); }
        Promise.resolve(out).then(function (r) {
          if (r === false) end(id);                                             // batal diam-diam (pesan sudah ditampilkan pemanggil)
          else finish(id, 'ok', { label: spec.doneLabel, detail: typeof r === 'string' ? r : spec.doneDetail });
          resolve(r);
        }, function (e) {
          try { console.error(e); } catch (_) {}
          finish(id, 'err', { label: spec.failLabel, detail: errMsg(e) });
          resolve();
        });
      }
      var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
      raf(function () { raf(go); }); setTimeout(go, 150);                        // 2 frame: kapsul sempat tergambar sebelum kerja berat
    });
  }
  function exportRun(fmt, fn) {
    return run({ id: 'export', kind: 'export', label: t('exporting', { fmt: fmt }), doneLabel: t('exported', { fmt: fmt }), failLabel: t('exportFail') }, fn);
  }

  /* ---------- Simpan journal (dipanggil dari index.html) ---------- */
  function safe(f) { return function () { try { return f.apply(null, arguments); } catch (e) { try { console.warn('StatusCapsule', e); } catch (_) {} } }; }
  var save = {
    begin: safe(function () { begin('save', { kind: 'save', label: t('saving') }); }),
    upload: safe(function (i, n) { update('save', { label: t('uploading', { i: i, n: n }), progress: (i - 1) / (n + 1) }); }),
    writing: safe(function () { update('save', { label: t('saving'), progress: null }); }),
    ok: safe(function () { finish('save', 'ok', { kind: 'save', label: t('saved') }); }),
    fail: safe(function (e) { finish('save', 'err', { kind: 'save', label: t('saveFail'), detail: errMsg(e) }); }),
    end: safe(function () { end('save'); })
  };

  /* ---------- Sinkronisasi: offline menetap -> online -> tunggu tulisan tertunda selesai ---------- */
  function pendingWrites() {
    try { if (window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore().waitForPendingWrites(); } catch (e) {}
    return Promise.resolve();
  }
  function goOffline() { wasOffline = true; put('net', { kind: 'sync', state: 'off', label: t('offline'), detail: t('offlineD'), progress: null, fin: false }); render(); }
  function goOnline() {
    if (!wasOffline) return;                                    // hanya bila tadi memang offline: tidak berkedip tanpa alasan
    wasOffline = false;
    begin('net', { kind: 'sync', label: t('syncing'), immediate: true });
    var settled = false;
    pendingWrites().then(function () { settled = true; if (!wasOffline) finish('net', 'ok', { kind: 'sync', label: t('synced') }); },
      function () { settled = true; if (!wasOffline) finish('net', 'warn', { kind: 'sync', label: t('syncFail'), detail: t('syncFailD') }); });
    setTimeout(function () { if (!settled && !wasOffline) finish('net', 'warn', { kind: 'sync', label: t('syncFail'), detail: t('syncFailD') }); }, 15000);
  }
  window.addEventListener('offline', goOffline);
  window.addEventListener('online', goOnline);
  function init() { build(); if (navigator.onLine === false) goOffline(); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();

  window.StatusCapsule = {
    version: '16.92',
    begin: safe(begin), update: safe(update), end: safe(end), run: run, exportRun: exportRun, save: save, t: t,
    ok: safe(function (id, o) { finish(id, 'ok', o); }),
    warn: safe(function (id, o) { finish(id, 'warn', o); }),
    fail: safe(function (id, o) { finish(id, 'err', o); })
  };
})();
