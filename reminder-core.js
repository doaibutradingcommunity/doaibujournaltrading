/* Logika pengingat journal — dipakai bersama oleh halaman (index.html) dan service worker (sw.js). */
(function (root) {
  'use strict';

  var DEFAULTS = {
    enabled: false,
    time: '20:00',              // jam pengingat (format 24 jam, waktu perangkat)
    days: [0, 1, 2, 3, 4, 5, 6], // 0 = Minggu ... 6 = Sabtu
    repeat: 0,                  // menit; 0 = tidak diulang
    message: '',                // pesan kustom (kosong = pesan bawaan)
    vibrate: true
  };
  var MAX_REPEATS = 3; // pengingat awal + maksimal 3 ulangan per hari

  function pad(n) { return String(n).padStart(2, '0'); }

  // Tanggal lokal (YYYY-MM-DD). Jangan pakai toISOString(): itu UTC dan bergeser di zona WIB dini hari.
  function localDate(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function minutesOf(hhmm) {
    var p = String(hhmm || '20:00').split(':');
    return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
  }

  function normalize(s) {
    s = Object.assign({}, DEFAULTS, s || {});
    if (!Array.isArray(s.days) || !s.days.length) s.days = DEFAULTS.days.slice();
    s.repeat = [0, 30, 60, 120].indexOf(Number(s.repeat)) >= 0 ? Number(s.repeat) : 0;
    s.message = String(s.message || '').slice(0, 120);
    return s;
  }

  // Apakah hari ini sudah lewat jam pengingat, hari aktif, dan journal hari ini belum ada?
  function isDue(s, journalDates, now) {
    now = now || new Date();
    if (!s || !s.enabled) return false;
    if (s.days.indexOf(now.getDay()) < 0) return false;
    if ((journalDates || []).indexOf(localDate(now)) >= 0) return false;
    return now.getHours() * 60 + now.getMinutes() >= minutesOf(s.time);
  }

  // Apakah notifikasi sistem boleh dikirim sekarang (memperhitungkan ulangan & batas per hari)?
  function shouldNotify(s, journalDates, log, now) {
    now = now || new Date();
    if (!isDue(s, journalDates, now)) return false;
    var today = localDate(now);
    var l = log && log.date === today ? log : { date: today, count: 0, last: 0 };
    var max = s.repeat ? 1 + MAX_REPEATS : 1;
    if (l.count >= max) return false;
    if (l.count > 0 && now.getTime() - l.last < s.repeat * 60000) return false;
    return true;
  }

  function nextLog(log, now) {
    now = now || new Date();
    var today = localDate(now);
    var count = log && log.date === today ? log.count : 0;
    return { date: today, count: count + 1, last: now.getTime() };
  }

  // ---- Penyimpanan kecil di IndexedDB (bisa dibaca service worker) ----
  function idb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open('doaibu-reminder', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('kv'); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function idbGet(key) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var r = db.transaction('kv').objectStore('kv').get(key);
        r.onsuccess = function () { resolve(r.result); };
        r.onerror = function () { reject(r.error); };
      });
    }).catch(function () { return undefined; });
  }
  function idbSet(key, value) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(value, key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function () {});
  }

  var DEFAULT_BODY = {
    id: 'Kamu belum mengisi journal hari ini. Yuk catat sekarang!',
    en: "You haven't filled in today's journal yet. Let's log it now!",
    ms: 'Anda belum mengisi jurnal hari ini. Jom catat sekarang!',
    es: 'Aún no has completado el diario de hoy. ¡Regístralo ahora!'
  };

  function notificationOptions(s, lang) {
    return {
      title: 'Doa Ibu Journal',
      options: {
        body: (s && s.message && s.message.trim()) || DEFAULT_BODY[lang] || DEFAULT_BODY.id,
        icon: 'icons/icon-192.png',
        badge: 'icons/favicon-96.png',
        tag: 'journal-reminder',
        renotify: true,
        vibrate: s && s.vibrate === false ? [] : [200, 100, 200],
        data: { url: './?action=new-journal' }
      }
    };
  }

  root.DoaIbuReminder = {
    DEFAULTS: DEFAULTS, MAX_REPEATS: MAX_REPEATS,
    localDate: localDate, minutesOf: minutesOf, normalize: normalize,
    isDue: isDue, shouldNotify: shouldNotify, nextLog: nextLog,
    idbGet: idbGet, idbSet: idbSet, notificationOptions: notificationOptions
  };
})(self);
