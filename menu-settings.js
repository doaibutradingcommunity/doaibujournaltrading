/* v16.45 · Menu, Pengaturan & Navigasi
   1) Navigasi desktop dikelompokkan menurut fungsi (urutan + pemisah). Tombol .nav-pill-btn asli tetap, hanya dipindah ke pembungkus grup.
   2) Halaman Pengaturan menyatukan tema, bahasa, transparansi kaca, mata uang, profil, pengingat, pasang aplikasi, keluar.
      Semua kontrol baru meneruskan klik ke kontrol asli (#btn-theme-toggle, #app-language, #header-left-block, #btn-reminder,
      #btn-install, #btn-logout), jadi logika lama tidak berubah. Grup & sheet Menu HP ada di skrip nav v17 (window.DoaNav). */
(function () {
  'use strict';
  var D = document, $ = function (id) { return D.getElementById(id); };
  var LANGS = ['id', 'en', 'ms', 'es'];

  var T = {
    id: { secDisplay: 'Tampilan', theme: 'Tema', dark: 'Gelap', light: 'Terang', lang: 'Bahasa', secAccount: 'Akun & data', profile: 'Edit profil', reminder: 'Pengingat journal', secApp: 'Aplikasi & sesi', install: 'Pasang aplikasi', logout: 'Keluar',
      textT: 'Ukuran teks', textD: 'Memperbesar teks di seluruh aplikasi. Tersimpan di perangkat ini.', textStd: 'Standar', textLg: 'Nyaman', textSample: 'Contoh: Journal sudah masuk. Tulis review singkat untuk menutup hari ini.' },
    en: { secDisplay: 'Display', theme: 'Theme', dark: 'Dark', light: 'Light', lang: 'Language', secAccount: 'Account & data', profile: 'Edit profile', reminder: 'Journal reminder', secApp: 'App & session', install: 'Install app', logout: 'Log out',
      textT: 'Text size', textD: 'Makes text larger across the app. Saved on this device.', textStd: 'Standard', textLg: 'Comfortable', textSample: 'Example: Journal saved. Write a short review to close the day.' },
    ms: { secDisplay: 'Paparan', theme: 'Tema', dark: 'Gelap', light: 'Cerah', lang: 'Bahasa', secAccount: 'Akaun & data', profile: 'Edit profil', reminder: 'Peringatan jurnal', secApp: 'Aplikasi & sesi', install: 'Pasang aplikasi', logout: 'Log keluar',
      textT: 'Saiz teks', textD: 'Membesarkan teks di seluruh aplikasi. Disimpan pada peranti ini.', textStd: 'Standard', textLg: 'Selesa', textSample: 'Contoh: Jurnal sudah masuk. Tulis ulasan ringkas untuk menutup hari ini.' },
    es: { secDisplay: 'Apariencia', theme: 'Tema', dark: 'Oscuro', light: 'Claro', lang: 'Idioma', secAccount: 'Cuenta y datos', profile: 'Editar perfil', reminder: 'Recordatorio del diario', secApp: 'App y sesión', install: 'Instalar app', logout: 'Salir',
      textT: 'Tamaño del texto', textD: 'Agranda el texto en toda la aplicación. Se guarda en este dispositivo.', textStd: 'Estándar', textLg: 'Cómodo', textSample: 'Ejemplo: Journal guardado. Escribe una reseña breve para cerrar el día.' }
  };
  var SUB = {
    id: 'Semua pengaturan akun dan tampilan ada di satu tempat.',
    en: 'All account and display settings in one place.',
    ms: 'Semua tetapan akaun dan paparan di satu tempat.',
    es: 'Todos los ajustes de cuenta y apariencia en un solo lugar.'
  };
  function lang() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return T[l] ? l : 'id'; }

  /* Subjudul Pengaturan: ikut bahasa (menimpa teks lama lewat kamus I18N yang sudah ada). */
  try { LANGS.forEach(function (l) { if (typeof I18N !== 'undefined' && I18N[l]) I18N[l].settingsSub = SUB[l]; }); } catch (e) {}

  /* ---------- 1. Navigasi desktop: grup ---------- */
  var groupEls = [];
  function groupNav() {
    var wrap = D.querySelector('#nav-scroll .nav-wrap');
    var N = window.DoaNav;
    if (!wrap || !N || wrap.getAttribute('data-ms-grouped')) return;
    var frag = D.createDocumentFragment();
    N.groups.forEach(function (g) {
      var btns = g.views.map(function (v) { return v === 'settings' ? null : $('nav-' + v); }).filter(Boolean);
      if (!btns.length) return;
      var span = D.createElement('span');
      span.className = 'ms-grp'; span.setAttribute('role', 'group'); span.setAttribute('data-ms-g', g.k);
      btns.forEach(function (b) { span.appendChild(b); });
      frag.appendChild(span); groupEls.push(span);
    });
    // tombol yang tidak ada di daftar grup (tab baru di masa depan) tetap dipertahankan di akhir
    Array.prototype.slice.call(wrap.querySelectorAll(':scope > .nav-pill-btn')).forEach(function (b) { frag.appendChild(b); });
    wrap.appendChild(frag);
    wrap.setAttribute('data-ms-grouped', '1');
    labelGroups();
  }
  function labelGroups() {
    var N = window.DoaNav; if (!N) return;
    groupEls.forEach(function (el) { el.setAttribute('aria-label', N.groupLabel(el.getAttribute('data-ms-g'))); });
  }

  /* ---------- 2. Halaman Pengaturan ---------- */
  var sec = $('settings-section');
  function applyText() {
    if (!sec) return;
    var d = T[lang()];
    sec.querySelectorAll('[data-ms]').forEach(function (el) { var v = d[el.getAttribute('data-ms')]; if (v != null && el.textContent !== v) el.textContent = v; });
    var tx = $('px-textsize');   // kartu Ukuran teks dibuat sekali oleh premium.js; dilokalkan ulang di sini
    if (tx) {
      var set = function (sel, v) { var el = tx.querySelector(sel); if (el && el.textContent !== v) el.textContent = v; };
      set('#px-text-t', d.textT); set('.px-set-d', d.textD); set('[data-px-text="std"]', d.textStd);
      set('[data-px-text="lg"]', d.textLg); set('.px-set-sample', d.textSample);
    }
    var h = $('ms-lang'), src = $('app-language');
    if (h && src) {
      if (h.options.length !== src.options.length) {
        h.innerHTML = '';
        Array.prototype.forEach.call(src.options, function (o) { var n = D.createElement('option'); n.value = o.value; n.textContent = o.textContent.trim(); h.appendChild(n); });
      }
      h.value = src.value;
    }
  }
  function syncTheme() {
    var light = D.body.classList.contains('light');
    if (!sec) return;
    sec.querySelectorAll('[data-ms-theme]').forEach(function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-ms-theme') === 'light') === light)); });
  }
  function syncInstall() {
    var row = sec && sec.querySelector('[data-ms-act="install"]'), btn = $('btn-install');
    if (row && btn) row.hidden = btn.style.display === 'none';
  }
  function proxy(id) { var el = $(id); if (el) el.click(); }

  if (sec) {
    sec.addEventListener('click', function (e) {
      var th = e.target.closest('[data-ms-theme]');
      if (th) {
        var wantLight = th.getAttribute('data-ms-theme') === 'light';
        if (wantLight !== D.body.classList.contains('light')) proxy('btn-theme-toggle');
        syncTheme();
        return;
      }
      var a = e.target.closest('[data-ms-act]'); if (!a) return;
      var k = a.getAttribute('data-ms-act');
      if (k === 'profile') proxy('header-left-block');
      else if (k === 'reminder') proxy('btn-reminder');
      else if (k === 'install') proxy('btn-install');
      else if (k === 'logout') proxy('btn-logout');
    });
    sec.addEventListener('change', function (e) {
      if (e.target.id !== 'ms-lang') return;
      var src = $('app-language'); if (!src) return;
      src.value = e.target.value;
      src.dispatchEvent(new Event('change', { bubbles: true }));
      setTimeout(function () { applyText(); labelGroups(); }, 90);
    });
  }

  /* Ukuran teks disuntik premium.js sebagai kartu terpisah (sesudah kartu transparansi kaca).
     Dipindah ke dalam kartu Tampilan supaya semua preferensi tampilan ada di satu kartu. Handler klik ada di elemen itu sendiri, jadi tetap jalan. */
  function adoptTextSize() {
    var c = $('px-textsize'), lg = sec && sec.querySelector('.lg-setting'), host = lg && lg.closest('.ms-sub');
    if (!c || !host) return false;
    if (c.getAttribute('data-ms-adopted')) return true;
    c.className = 'ms-sub'; c.setAttribute('data-ms-adopted', '1');
    host.parentNode.insertBefore(c, host);
    return true;
  }
  function adoptHaptics() {
    var host = sec && sec.querySelector('.ms-sub');
    if (!host || $('ios-haptic-setting')) return false;
    var row = D.createElement('div');
    row.id = 'ios-haptic-setting';
    row.className = 'ms-sub';
    var isEnabled = localStorage.getItem('iosHapticsEnabled') !== '0';
    row.innerHTML =
      '<div class="flex items-center justify-between py-3 border-b border-white/5">' +
        '<div>' +
          '<b class="block text-sm text-gray-200">Apple Taptic Haptic Feedback</b>' +
          '<small class="text-xs text-gray-500">Umpan balik getaran fisik mikro saat menekan tombol dan menyimpan journal.</small>' +
        '</div>' +
        '<button type="button" id="btn-toggle-haptics" class="px-3 py-1.5 rounded-full text-xs font-semibold ' + (isEnabled ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40' : 'bg-white/5 text-gray-400 border border-white/10') + '" aria-pressed="' + isEnabled + '">' +
          (isEnabled ? 'Aktif' : 'Nonaktif') +
        '</button>' +
      '</div>';
    host.parentNode.insertBefore(row, host);

    var btn = row.querySelector('#btn-toggle-haptics');
    btn.addEventListener('click', function () {
      var cur = localStorage.getItem('iosHapticsEnabled') !== '0';
      var next = !cur;
      try { localStorage.setItem('iosHapticsEnabled', next ? '1' : '0'); } catch (e) {}
      btn.setAttribute('aria-pressed', String(next));
      btn.textContent = next ? 'Aktif' : 'Nonaktif';
      btn.className = 'px-3 py-1.5 rounded-full text-xs font-semibold ' + (next ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40' : 'bg-white/5 text-gray-400 border border-white/10');
      if (next && window.IosHaptics) window.IosHaptics.success();
    });
    return true;
  }
  if (sec && !adoptTextSize()) { var tries = 0, iv = setInterval(function () { if (adoptTextSize() || ++tries > 25) clearInterval(iv); }, 400); }
  if (sec && !adoptHaptics()) { var hTries = 0, hIv = setInterval(function () { if (adoptHaptics() || ++hTries > 25) clearInterval(hIv); }, 400); }

  /* ---------- sinkron ---------- */
  var src = $('app-language');
  if (src) src.addEventListener('change', function () { setTimeout(function () { applyText(); labelGroups(); }, 90); });
  if (window.MutationObserver) {
    new MutationObserver(syncTheme).observe(D.body, { attributes: true, attributeFilter: ['class'] });
    var ib = $('btn-install'); if (ib) new MutationObserver(syncInstall).observe(ib, { attributes: true, attributeFilter: ['style'] });
  }
  window.addEventListener('viewchange', function (ev) {
    if (ev && ev.detail && ev.detail.view === 'settings') { applyText(); syncTheme(); syncInstall(); }
  });

  groupNav();
  applyText(); syncTheme(); syncInstall();
  try { if (typeof applyLanguage === 'function') applyLanguage(lang()); } catch (e) {}
  window.DoaMenuSettings = { _regroup: groupNav, _text: applyText };
})();
