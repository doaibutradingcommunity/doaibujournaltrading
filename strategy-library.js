/* Strategy Playbook (v16.26, pengembangan Strategy Library v16.22)
   v16.26 menambah: Stop Loss & Target per strategy, batas RR/risiko, checklist per grup (Setup/Entry/Risiko/Manajemen),
   screenshot contoh setup valid & tidak valid (diunggah ke imgbb), tab Evaluasi (aturan vs aktual, kepatuhan per rule,
   ringkasan kepatuhan per setup). Semua field baru opsional: strategy & journal lama tetap berfungsi.
   Field baru di users/{uid}/strategies/{id}: stopLoss, target, minRR, maxRisk, targetComp, examples:[{id,url,kind:'valid'|'invalid',caption}],
   dan checklist[].group ('setup'|'entry'|'risk'|'mgmt'). strategyLog[].items[] ikut menyimpan group.

   Strategy Library (v16.22)
   1) Halaman baru "Strategy Library": buat, edit, duplikat, arsipkan, hapus strategy.
      Isi strategy: nama, deskripsi, Entry Checklist (Wajib / Opsional), Invalidation Rules, Exit Rules.
   2) Di form Journal (langkah 01 Trade) muncul "Strategy Used" + "Strategy Compliance" (centang rule sebelum/ketika entry).
   3) Statistik tiap strategy (trade, win rate, P/L, rata-rata kepatuhan) dihitung dari journal kamu sendiri.

   Data baru:
   - Firestore  users/{uid}/strategies/{id}  { name, description, checklist:[{id,text,required}], invalidation, exit, archived, createdAt, updatedAt }
   - Dokumen journal (semua opsional): strategyId, strategyName, strategyLog:[{id,name,checked,total,reqMissed,items:[{id,text,required,checked}]}]
     strategyLog menyimpan salinan rule saat trade dicatat, jadi riwayat tidak berubah walau strategy diedit/dihapus nanti.
   Tidak perlu mengubah Firestore Rules bila rules mencakup  match /{document=**}  di bawah users/{uid}. */
(function () {
  'use strict';

  /* ---------- Teks (ID / EN) ---------- */
  var T = {
    id: {
      title: 'Strategy Playbook', sub: 'Standar trading pribadimu: aturan entry, invalidasi, stop loss, target, contoh screenshot, dan evaluasi kepatuhan dari journal.',
      neu: 'Strategy Baru', search: 'Cari strategy…', active: 'Aktif', archived: 'Arsip',
      sStrat: 'Strategy aktif', sUsed: 'Journal bertag strategy', sComp: 'Rata-rata kepatuhan', na: 'N/A',
      rules: 'rule', trades: 'Trade', win: 'Win rate', comp: 'Kepatuhan', pl: 'Net P/L',
      showRules: 'Lihat aturan', hideRules: 'Sembunyikan', edit: 'Edit', dup: 'Duplikat', arch: 'Arsipkan', unarch: 'Aktifkan', del: 'Hapus',
      entryList: 'Entry Checklist', inv: 'Invalidation Rules', exit: 'Exit Rules', req: 'Wajib', opt: 'Opsional', none: 'Belum diisi',
      cmpTitle: 'Kepatuhan vs hasil', cmpFull: 'Semua rule tercentang', cmpPart: 'Ada rule terlewat', cmpEnough: 'Data belum cukup', cmpNote: 'Deskriptif saja, bukan sebab-akibat. Butuh minimal 10 trade per kelompok.',
      mixedNote: 'hari journal memakai >1 strategy, tidak ikut dihitung P/L.',
      emptyT: 'Belum ada strategy', emptyS: 'Tulis aturan mainmu sekali, lalu pakai di setiap journal. Mulai dari nol atau pakai template:',
      noMatch: 'Tidak ada strategy yang cocok.', emptyArch: 'Arsip kosong.', loadErr: 'Gagal memuat strategy. Periksa koneksi lalu buka ulang halaman ini.',
      tplBreak: 'Breakout Retest', tplIct: 'ICT · IFVG',
      createT: 'Buat Strategy Baru', editT: 'Edit Strategy', createS: 'Definisikan aturan entry, exit, dan invalidasi kamu.',
      fName: 'Nama Strategy', phName: 'cth. Breakout Retest', fDesc: 'Deskripsi', phDesc: 'Deskripsi singkat tentang strategi ini…',
      entryS: 'Kriteria yang harus terpenuhi sebelum entry.', addRule: 'Tambah Rule', noRules: 'Belum ada checklist.', phRule: 'cth. IFVG terbentuk',
      advT: 'Aturan Lanjutan', advS: 'Tetapkan batas invalidasi setup dan rencana keluar.',
      phInv: 'Kondisi di mana setup batal…', phExit: 'Kondisi untuk take profit atau cut loss manual…',
      cancel: 'Batal', save: 'Simpan Strategy', saving: 'Menyimpan…', moveUp: 'Naik', moveDn: 'Turun', rmRule: 'Hapus rule', toggleReq: 'Ubah wajib/opsional',
      errName: 'Nama strategy wajib diisi (min. 2 huruf).', errDup: 'Sudah ada strategy dengan nama ini.', errLogin: 'Silakan login dulu.', errSave: 'Gagal menyimpan: ',
      okSaved: 'Strategy tersimpan', okDup: 'Strategy diduplikat', okArch: 'Strategy diarsipkan', okUnarch: 'Strategy diaktifkan lagi', okDel: 'Strategy dihapus',
      offline: 'Tersimpan di perangkat, akan disinkron saat online.', maxRules: 'Maksimal 20 rule.',
      confirmDel: 'Hapus strategy ini? Journal lama tetap menyimpan salinan rule-nya.', copy: 'salinan',
      phSl: 'cth. Di balik swing low candle retest, plus buffer spread…', phTp: 'cth. Liquidity berikutnya, min. 1:2. Ambil sebagian di 1R…',
      sl: 'Stop Loss', tp: 'Target / Take Profit', minRR: 'Minimal RR', maxRisk: 'Risiko maks. per trade (%)', targetComp: 'Target kepatuhan (%)', grpLbl: 'Grup',
      grp: { setup: 'Setup', entry: 'Entry', risk: 'Risiko (SL/TP)', mgmt: 'Manajemen & Exit' },
      dtRules: 'Aturan', dtEx: 'Contoh Setup', dtEval: 'Evaluasi',
      adhTarget: 'Target', adhTitle: 'Kepatuhan per setup', adhSub: 'Rata-rata rule tercentang di journal. Garis emas = target kepatuhan.', adhNone: 'Belum ada journal dengan checklist.', adhN: 'journal',
      exValid: 'Setup Valid', exInvalid: 'Setup Tidak Valid', exAdd: 'Tambah screenshot', exCap: 'Catatan singkat: kenapa valid / tidak valid', exNone: 'Belum ada screenshot.', exSub: 'Simpan contoh visual supaya kamu bisa membandingkan setup baru dengan standarmu.',
      exUp: 'Mengunggah…', exErr: 'Gagal mengunggah: ', exMax: 'Maksimal 6 screenshot per jenis.', exNoUp: 'Upload gambar belum tersedia di sesi ini.', exImg: 'Pilih file gambar.', exBig: 'Ukuran gambar maksimal 15 MB.', exRm: 'Hapus screenshot', exBusy: 'Tunggu sampai upload selesai.', close: 'Tutup', exHintIn: 'Contoh setup (rujukan visual)',
      evTitle: 'Aturan vs aktual', evRule: 'Aturan', evAct: 'Aktual', evOk: 'Sesuai', evBad: 'Belum sesuai', evNo: 'Data belum cukup',
      evComp: 'Kepatuhan rata-rata', evReq: 'Hari dengan semua rule wajib tercentang', evRisk: 'Risiko per trade', evRR: 'Reward:Risk saat menang', evNoRule: 'belum diatur',
      evRiskAct: function (avg, over, n) { return 'rata-rata ' + avg + '% · ' + over + '/' + n + ' hari melebihi'; }, evRRAct: function (avg, n) { return 'rata-rata ' + avg + 'R · ' + n + ' trade'; }, evDays: 'hari',
      evRRNote: 'R dihitung dari hari dengan 1 trade dan R positif. Risiko dari kolom Risk % di journal.',
      ruleTitle: 'Kepatuhan per rule', ruleSub: 'Rule yang paling sering terlewat ada di atas.', ruleNone: 'Belum ada journal untuk rule ini.', ruleLow: 'Sering terlewat',
      trendRec: '10 journal terakhir', trendAll: 'Semua', evNeedChecklist: 'Pilih strategy dan centang checklist di journal agar evaluasi muncul.',
      jUsed: 'Strategy Digunakan', jNone: '— Tanpa strategy —', jComp: 'Strategy Compliance', jChecked: 'Tercentang',
      jWarn: 'rule wajib belum tercentang. Tetap bisa disimpan; tercatat sebagai rule yang terlewat.', jAll: 'Centang semua', jNoneAll: 'Kosongkan',
      jRem: 'Invalidasi & exit', jManage: '+ Strategy baru', jEmpty: 'Belum punya strategy.', jCreate: 'Buat strategy baru', jGone: '(sudah dihapus)', jArchTag: '(arsip)',
      jHint: 'Dipilih akan otomatis menambah nama strategy ke Setup / Strategy Tag.', jNoRules: 'Strategy ini belum punya checklist.'
    },
    en: {
      title: 'Strategy Playbook', sub: 'Your personal trading standard: entry rules, invalidation, stop loss, targets, example screenshots and a compliance review from your journal.',
      neu: 'New Strategy', search: 'Search strategies…', active: 'Active', archived: 'Archived',
      sStrat: 'Active strategies', sUsed: 'Journals with a strategy', sComp: 'Average compliance', na: 'N/A',
      rules: 'rules', trades: 'Trades', win: 'Win rate', comp: 'Compliance', pl: 'Net P/L',
      showRules: 'View rules', hideRules: 'Hide', edit: 'Edit', dup: 'Duplicate', arch: 'Archive', unarch: 'Restore', del: 'Delete',
      entryList: 'Entry Checklist', inv: 'Invalidation Rules', exit: 'Exit Rules', req: 'Required', opt: 'Optional', none: 'Not set',
      cmpTitle: 'Compliance vs results', cmpFull: 'All rules checked', cmpPart: 'Some rules missed', cmpEnough: 'Not enough data', cmpNote: 'Descriptive only, not cause and effect. Needs at least 10 trades per group.',
      mixedNote: 'journal days used >1 strategy and are left out of P/L.',
      emptyT: 'No strategies yet', emptyS: 'Write your playbook once, then use it in every journal. Start from scratch or use a template:',
      noMatch: 'No matching strategy.', emptyArch: 'Archive is empty.', loadErr: 'Could not load strategies. Check your connection and reopen this page.',
      tplBreak: 'Breakout Retest', tplIct: 'ICT · IFVG',
      createT: 'Create New Strategy', editT: 'Edit Strategy', createS: 'Define your entry, exit and invalidation rules.',
      fName: 'Strategy Name', phName: 'e.g. Breakout Retest', fDesc: 'Description', phDesc: 'A short description of this strategy…',
      entryS: 'Criteria that must be met before entry.', addRule: 'Add Rule', noRules: 'No checklist yet.', phRule: 'e.g. IFVG formed',
      advT: 'Advanced Rules', advS: 'Set the setup invalidation limit and your exit plan.',
      phInv: 'Conditions where the setup is cancelled…', phExit: 'Conditions to take profit or cut loss manually…',
      cancel: 'Cancel', save: 'Save Strategy', saving: 'Saving…', moveUp: 'Up', moveDn: 'Down', rmRule: 'Remove rule', toggleReq: 'Toggle required/optional',
      errName: 'Strategy name is required (min. 2 characters).', errDup: 'A strategy with this name already exists.', errLogin: 'Please sign in first.', errSave: 'Could not save: ',
      okSaved: 'Strategy saved', okDup: 'Strategy duplicated', okArch: 'Strategy archived', okUnarch: 'Strategy restored', okDel: 'Strategy deleted',
      offline: 'Saved on this device, will sync when online.', maxRules: 'Maximum 20 rules.',
      confirmDel: 'Delete this strategy? Past journals keep their own copy of the rules.', copy: 'copy',
      phSl: 'e.g. Beyond the retest candle swing low, plus spread buffer…', phTp: 'e.g. Next liquidity, min. 1:2. Take partials at 1R…',
      sl: 'Stop Loss', tp: 'Target / Take Profit', minRR: 'Minimum RR', maxRisk: 'Max risk per trade (%)', targetComp: 'Compliance target (%)', grpLbl: 'Group',
      grp: { setup: 'Setup', entry: 'Entry', risk: 'Risk (SL/TP)', mgmt: 'Management & Exit' },
      dtRules: 'Rules', dtEx: 'Setup Examples', dtEval: 'Review',
      adhTarget: 'Target', adhTitle: 'Compliance by setup', adhSub: 'Average share of rules checked in your journal. Gold line = compliance target.', adhNone: 'No journals with a checklist yet.', adhN: 'journals',
      exValid: 'Valid Setup', exInvalid: 'Invalid Setup', exAdd: 'Add screenshot', exCap: 'Short note: why valid / invalid', exNone: 'No screenshots yet.', exSub: 'Keep visual examples so you can compare new setups against your standard.',
      exUp: 'Uploading…', exErr: 'Upload failed: ', exMax: 'Maximum 6 screenshots per type.', exNoUp: 'Image upload is not available in this session.', exImg: 'Choose an image file.', exBig: 'Image must be 15 MB or smaller.', exRm: 'Remove screenshot', exBusy: 'Wait for uploads to finish.', close: 'Close', exHintIn: 'Setup examples (visual reference)',
      evTitle: 'Rules vs actual', evRule: 'Rule', evAct: 'Actual', evOk: 'On track', evBad: 'Off track', evNo: 'Not enough data',
      evComp: 'Average compliance', evReq: 'Days with every required rule checked', evRisk: 'Risk per trade', evRR: 'Reward:Risk on wins', evNoRule: 'not set',
      evRiskAct: function (avg, over, n) { return 'average ' + avg + '% · ' + over + '/' + n + ' days over'; }, evRRAct: function (avg, n) { return 'average ' + avg + 'R · ' + n + ' trades'; }, evDays: 'days',
      evRRNote: 'R uses days with 1 trade and positive R. Risk comes from the Risk % field in your journal.',
      ruleTitle: 'Compliance by rule', ruleSub: 'Most often missed rules come first.', ruleNone: 'No journals for this rule yet.', ruleLow: 'Often missed',
      trendRec: 'Last 10 journals', trendAll: 'All', evNeedChecklist: 'Pick a strategy and check its checklist in the journal to see the review.',
      jUsed: 'Strategy Used', jNone: '— No strategy —', jComp: 'Strategy Compliance', jChecked: 'Checked',
      jWarn: 'required rule(s) not checked. You can still save; it is recorded as a missed rule.', jAll: 'Check all', jNoneAll: 'Clear',
      jRem: 'Invalidation & exit', jManage: '+ New strategy', jEmpty: 'No strategies yet.', jCreate: 'Create a strategy', jGone: '(deleted)', jArchTag: '(archived)',
      jHint: 'Picking one also adds its name to Setup / Strategy Tag.', jNoRules: 'This strategy has no checklist yet.'
    }
  };
  function lang() { var l = 'id'; try { l = localStorage.getItem('journalLanguage') || 'id'; } catch (e) {} return (l === 'en' || l === 'es') ? 'en' : 'id'; }
  function L() { return T[lang()]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function rid() { return 'r' + Math.random().toString(36).slice(2, 8); }
  function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
  function toast(m) { try { if (typeof showToast === 'function') return showToast(m); } catch (e) {} }

  /* ---------- Akses ke app utama (global lexical, bukan window.*) ---------- */
  function DB() { try { return db; } catch (e) { return null; } }
  function AUTH() { try { return auth; } catch (e) { return null; } }
  function JOURNALS() { try { return Array.isArray(allJournals) ? allJournals : []; } catch (e) { return []; } }
  function money(v) { try { return window.Money ? Money.format(v, { plus: true }) : (v > 0 ? '+' : '') + Math.round(v * 100) / 100; } catch (e) { return String(v); } }

  /* ---------- State ---------- */
  var S = { list: [], loaded: false, err: false, uid: null, unsub: null, q: '', tab: 'active', open: {}, dtab: {} };

  function cacheKey() { return 'sl_cache_' + S.uid; }
  function readCache() { try { var c = JSON.parse(localStorage.getItem(cacheKey()) || 'null'); return Array.isArray(c) ? c : null; } catch (e) { return null; } }
  function writeCache() { try { localStorage.setItem(cacheKey(), JSON.stringify(S.list)); } catch (e) {} }

  var GROUPS = ['setup', 'entry', 'risk', 'mgmt'], MAX_EX = 6, MAX_RULES = 20;
  function grpOf(g) { return GROUPS.indexOf(g) >= 0 ? g : 'entry'; }
  function posNum(v, max) { var n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(',', '.')); return (isFinite(n) && n > 0 && n <= (max || 1e6)) ? Math.round(n * 100) / 100 : null; }
  function cleanItem(r) { return { id: String(r.id || rid()), text: String(r.text || '').slice(0, 120), required: r.required !== false, group: grpOf(r.group) }; }
  function cleanEx(e) { return { id: String(e.id || rid()), url: String(e.url), kind: e.kind === 'invalid' ? 'invalid' : 'valid', caption: String(e.caption || '').slice(0, 120) }; }
  function normalize(id, d) {
    d = d || {};
    return {
      id: id, name: String(d.name || '').slice(0, 40), description: String(d.description || ''),
      checklist: (Array.isArray(d.checklist) ? d.checklist : []).filter(function (r) { return r && String(r.text || '').trim(); }).map(cleanItem),
      invalidation: String(d.invalidation || ''), exit: String(d.exit || ''), archived: !!d.archived,
      stopLoss: String(d.stopLoss || ''), target: String(d.target || ''), minRR: posNum(d.minRR, 100), maxRisk: posNum(d.maxRisk, 100), targetComp: posNum(d.targetComp, 100) || 80,
      examples: (Array.isArray(d.examples) ? d.examples : []).filter(function (e) { return e && /^https:\/\//i.test(String(e.url || '')); }).map(cleanEx),
      created: d.createdAt && d.createdAt.seconds ? d.createdAt.seconds : (d.created || 0)
    };
  }
  function byId(id) { for (var i = 0; i < S.list.length; i++) if (S.list[i].id === id) return S.list[i]; return null; }
  function sorted(list) { return list.slice().sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }); }); }

  function subscribe(user) {
    if (S.unsub) { try { S.unsub(); } catch (e) {} S.unsub = null; }
    S.list = []; S.loaded = false; S.err = false; S.uid = user ? user.uid : null;
    if (!user || !DB()) { refreshAll(); return; }
    var c = readCache(); if (c) { S.list = c; S.loaded = true; }
    try {
      S.unsub = DB().collection('users').doc(user.uid).collection('strategies').onSnapshot(function (snap) {
        var a = []; snap.forEach(function (d) { a.push(normalize(d.id, d.data())); });
        S.list = a; S.loaded = true; S.err = false; writeCache(); refreshAll();
      }, function (err) { console.error('strategies', err); S.err = true; S.loaded = true; refreshAll(); });
    } catch (e) { console.error(e); S.err = true; S.loaded = true; }
    refreshAll();
  }
  function col() { return DB().collection('users').doc(S.uid).collection('strategies'); }
  function withTimeout(p, ms) { return Promise.race([p, new Promise(function (res) { setTimeout(function () { res('timeout'); }, ms); })]); }
  function stamp() { return firebase.firestore.FieldValue.serverTimestamp(); }

  /* ---------- Journal -> entri strategy ---------- */
  function entriesOf(j) {
    if (!j) return [];
    if (Array.isArray(j.strategyLog) && j.strategyLog.length) return j.strategyLog.filter(function (e) { return e && e.id; });
    if (j.strategyId) return [{ id: j.strategyId, name: j.strategyName || '', checked: 0, total: 0, reqMissed: 0, items: [] }];
    return [];
  }
  function winsOf(j) { var n = j.trades || 1; if (typeof j.wins === 'number') return Math.min(Math.max(j.wins, 0), n); return (j.pl || 0) > 0 ? n : 0; }
  function isFull(e) { return !!e.total && e.checked === e.total; }

  function dateOf(j) { return String(j.date || j.id || ''); }
  function mean(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
  function statsFor(id) {
    var s = { days: 0, trades: 0, wins: 0, pl: 0, mixed: 0, compSum: 0, compN: 0, reqDays: 0, reqOk: 0, full: { t: 0, w: 0, pl: 0 }, part: { t: 0, w: 0, pl: 0 },
      rules: {}, comps: [], risks: [], winR: [], rTrades: 0, rSum: 0 };
    JOURNALS().forEach(function (j) {
      var ent = entriesOf(j), mine = ent.filter(function (e) { return e.id === id; });
      if (!mine.length) return;
      s.days++;
      mine.forEach(function (e) {
        if (!e.total) return;
        var v = e.checked / e.total; s.compSum += v; s.compN++; s.comps.push({ d: dateOf(j), v: v });
        s.reqDays++; if (!e.reqMissed) s.reqOk++;
        (Array.isArray(e.items) ? e.items : []).forEach(function (it) {
          if (!it || !it.id) return; var r = s.rules[it.id] || (s.rules[it.id] = { seen: 0, hit: 0 }); r.seen++; if (it.checked) r.hit++;
        });
      });
      var distinct = {}; ent.forEach(function (e) { distinct[e.id] = 1; });
      if (Object.keys(distinct).length > 1) { s.mixed++; return; }
      var n = j.trades || 1, w = winsOf(j);
      s.trades += n; s.wins += w; s.pl += (j.pl || 0);
      var risk = num(j.riskPct); if (risk !== null && risk > 0) s.risks.push(risk);
      var rm = num(j.rMultiple); if (rm !== null) { s.rTrades += n; s.rSum += rm; if (n === 1 && rm > 0) s.winR.push(rm); }
      var withData = mine.filter(function (e) { return e.total; });
      if (withData.length) { var b = withData.every(isFull) ? s.full : s.part; b.t += n; b.w += w; b.pl += (j.pl || 0); }
    });
    s.wr = s.trades ? s.wins / s.trades : null;
    s.avgComp = s.compN ? s.compSum / s.compN : null;
    s.reqRate = s.reqDays ? s.reqOk / s.reqDays : null;
    s.comps.sort(function (x, y) { return x.d < y.d ? -1 : x.d > y.d ? 1 : 0; });
    var rec = s.comps.slice(-10); s.recComp = rec.length >= 3 ? mean(rec.map(function (c) { return c.v; })) : null;
    s.avgRisk = mean(s.risks); s.avgWinR = mean(s.winR);
    return s;
  }
  function overall() {
    var withS = 0, sum = 0, n = 0;
    JOURNALS().forEach(function (j) {
      var ent = entriesOf(j); if (!ent.length) return; withS++;
      ent.forEach(function (e) { if (e.total) { sum += e.checked / e.total; n++; } });
    });
    return { withS: withS, total: JOURNALS().length, avg: n ? sum / n : null };
  }
  function pct(v) { return v === null ? L().na : Math.round(v * 100) + '%'; }

  /* ---------- CSS ---------- */
  var css =
'.sl{--sl-tx:rgba(255,255,255,.93);--sl-sub:rgba(235,235,245,.64);--sl-mut:rgba(235,235,245,.42);--sl-bd:rgba(255,255,255,.10);--sl-bd2:rgba(255,255,255,.18);--sl-in:rgba(255,255,255,.05);--sl-gold:#d9b857;--sl-gold-s:rgba(212,175,55,.13);--sl-gold-b:rgba(212,175,55,.34);--sl-pos:#2dd4bf;--sl-pos-s:rgba(45,212,191,.13);--sl-neg:#ff7a68;--sl-neg-s:rgba(255,122,104,.13);--sl-sheet:#131417}' +
'body.light .sl{--sl-tx:rgba(0,0,0,.9);--sl-sub:rgba(0,0,0,.62);--sl-mut:rgba(0,0,0,.42);--sl-bd:rgba(0,0,0,.10);--sl-bd2:rgba(0,0,0,.2);--sl-in:rgba(0,0,0,.035);--sl-gold:#8a6a14;--sl-gold-s:rgba(176,138,30,.12);--sl-gold-b:rgba(138,106,20,.35);--sl-pos:#0f766e;--sl-pos-s:rgba(15,118,110,.11);--sl-neg:#b83526;--sl-neg-s:rgba(184,53,38,.10);--sl-sheet:#faf9f5}' +
'.sl{color:var(--sl-tx)}.sl *{box-sizing:border-box}' +
'.sl-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:20px}' +
'.sl-h1{font-size:22px;font-weight:600;letter-spacing:-.02em;line-height:1.15;margin:0}.sl-h1 small{display:block;font-size:13px;font-weight:500;letter-spacing:0;color:var(--sl-sub);margin-top:8px;max-width:46ch;line-height:1.45}' +
'.sl-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 20px;border-radius:16px;font-weight:600;font-size:15px;cursor:pointer;border:1px solid var(--sl-bd);background:var(--sl-in);color:var(--sl-tx);transition:transform .15s,background .2s,border-color .2s;font-family:inherit}' +
'.sl-btn:hover{border-color:var(--sl-bd2)}.sl-btn:active{transform:scale(.97)}.sl-btn svg{width:16px;height:16px}.sl-btn:focus-visible,.sl-ib:focus-visible,.sl-chipb:focus-visible,.sl-item:focus-within,.sl-sel:focus-visible{outline:2px solid var(--sl-gold);outline-offset:2px}' +
'.sl-btn.gold{background:linear-gradient(180deg,#f0d789,#d4af37 55%,#b8932a);color:#1a1405;border-color:rgba(255,255,255,.3);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 8px 22px -10px rgba(212,175,55,.75)}.sl-btn.gold:hover{filter:brightness(1.07)}' +
'.sl-btn.sm{min-height:36px;padding:0 12px;font-size:13px;border-radius:12px}.sl-btn.danger{color:var(--sl-neg)}.sl-btn:disabled{opacity:.55;cursor:default}' +
'.sl-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}' +
'.sl-sc{padding:16px 16px;border-radius:20px;min-width:0}.sl-sc b{display:block;font-size:22px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.15}.sl-sc span{display:block;font-size:12px;color:var(--sl-sub);margin-top:4px;line-height:1.3}' +
'.sl-bar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px}' +
'.sl-search{flex:1 1 200px;min-width:0;position:relative}.sl-search svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--sl-mut);pointer-events:none}' +
'.sl-search input{width:100%;min-height:44px;padding:0 16px 0 40px;border-radius:16px;border:1px solid var(--sl-bd);background:var(--sl-in);color:var(--sl-tx);font:inherit;font-size:15px}.sl-search input::placeholder{color:var(--sl-mut)}.sl-search input:focus{outline:none;border-color:var(--sl-gold-b)}' +
'.sl-seg{display:inline-flex;padding:4px;border-radius:16px;border:1px solid var(--sl-bd);background:var(--sl-in)}.sl-seg button{min-height:38px;padding:0 16px;border-radius:12px;border:0;background:none;color:var(--sl-sub);font:inherit;font-size:13px;font-weight:600;cursor:pointer}.sl-seg button[aria-pressed=true]{background:var(--sl-gold-s);color:var(--sl-gold);box-shadow:inset 0 0 0 1px var(--sl-gold-b)}' +
'.sl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;align-items:start}' +
'.sl-card{border-radius:24px;padding:20px;min-width:0}.sl-ch{display:flex;align-items:flex-start;gap:12px}' +
'.sl-ico{flex:none;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--sl-gold-s);border:1px solid var(--sl-gold-b);color:var(--sl-gold)}.sl-ico svg{width:20px;height:20px}' +
'.sl-ct{min-width:0;flex:1}.sl-ct h3{margin:0;font-size:17px;font-weight:600;letter-spacing:-.01em;line-height:1.25;overflow-wrap:anywhere}.sl-meta{font-size:12px;color:var(--sl-sub);margin-top:4px}' +
'.sl-desc{margin:12px 0 0;font-size:15px;line-height:1.5;color:var(--sl-sub);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}' +
'.sl-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:16px}.sl-k{padding:8px 8px;border-radius:16px;background:var(--sl-in);border:1px solid var(--sl-bd);min-width:0;text-align:center}.sl-k b{display:block;font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sl-k span{display:block;font-size:12px;color:var(--sl-sub);margin-top:2px}' +
'.sl-pos{color:var(--sl-pos)}.sl-neg{color:var(--sl-neg)}' +
'.sl-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}' +
'.sl-detail{margin-top:16px;padding-top:16px;border-top:1px solid var(--sl-bd)}.sl-detail[hidden]{display:none}' +
'.sl-dh{font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--sl-gold);margin:16px 0 8px}.sl-dh:first-child{margin-top:0}' +
'.sl-li{display:flex;align-items:flex-start;gap:12px;padding:8px 12px;border-radius:12px;background:var(--sl-in);border:1px solid var(--sl-bd);margin-bottom:8px;font-size:15px;line-height:1.4}.sl-li span:first-child{flex:1;min-width:0;overflow-wrap:anywhere}' +
'.sl-tag{flex:none;font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--sl-neg);padding-top:2px}.sl-tag.o{color:var(--sl-mut)}' +
'.sl-txt{font-size:15px;line-height:1.55;color:var(--sl-sub);white-space:pre-wrap;overflow-wrap:anywhere;margin:0}' +
'.sl-cmp{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sl-cmp div{padding:12px 12px;border-radius:16px;background:var(--sl-in);border:1px solid var(--sl-bd)}.sl-cmp b{display:block;font-size:17px;font-variant-numeric:tabular-nums}.sl-cmp span{font-size:12px;color:var(--sl-sub);line-height:1.3;display:block}' +
'.sl-note{font-size:12px;color:var(--sl-mut);margin:8px 0 0;line-height:1.4}' +
'.sl-empty{text-align:center;padding:40px 24px;border-radius:28px}.sl-empty h3{margin:12px 0 8px;font-size:17px;font-weight:600}.sl-empty p{margin:0 auto 16px;max-width:40ch;color:var(--sl-sub);font-size:15px;line-height:1.5}.sl-tpls{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px}' +
'.sl-skel{height:190px;border-radius:24px;background:linear-gradient(90deg,var(--sl-in),var(--sl-bd),var(--sl-in));background-size:200% 100%;animation:slSk 1.3s linear infinite}@keyframes slSk{to{background-position:-200% 0}}' +
/* editor */
'.sl-ov{position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .22s}.sl-ov.on{opacity:1}' +
'.sl-sheet{width:100%;max-width:640px;max-height:94vh;max-height:94dvh;overflow:auto;overscroll-behavior:contain;background:var(--sl-sheet);color:var(--sl-tx);border:1px solid var(--sl-bd2);border-bottom:0;border-radius:28px 28px 0 0;padding:20px 20px calc(24px + env(safe-area-inset-bottom,0px));transform:translateY(24px);transition:transform .28s cubic-bezier(.2,.8,.2,1)}.sl-ov.on .sl-sheet{transform:none}' +
'@media(min-width:700px){.sl-ov{align-items:center;padding:24px}.sl-sheet{border-radius:28px;border-bottom:1px solid var(--sl-bd2);padding-bottom:24px}}' +
'.sl-eh{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}.sl-eh h2{margin:0;font-size:22px;font-weight:600;letter-spacing:-.02em}.sl-eh p{margin:4px 0 0;font-size:13px;color:var(--sl-sub);line-height:1.4}' +
'.sl-ib{flex:none;width:44px;height:44px;border-radius:16px;border:1px solid var(--sl-bd);background:var(--sl-in);color:var(--sl-sub);display:grid;place-items:center;cursor:pointer}.sl-ib svg{width:18px;height:18px}.sl-ib:hover{color:var(--sl-tx);border-color:var(--sl-bd2)}.sl-ib.sm{width:36px;height:36px;border-radius:12px}.sl-ib.sm svg{width:15px;height:15px}.sl-ib:disabled{opacity:.35;cursor:default}' +
'.sl-blk{border-radius:24px;padding:16px;margin-bottom:12px;border:1px solid var(--sl-bd);background:var(--sl-in)}' +
'.sl-lbl{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--sl-gold);margin-bottom:8px}.sl-lbl svg{width:15px;height:15px}' +
'.sl-lbl.plain{color:var(--sl-sub)}' +
'.sl-fld{width:100%;min-height:46px;padding:12px 16px;border-radius:16px;border:1px solid var(--sl-bd);background:var(--sl-in);color:var(--sl-tx);font:inherit;font-size:15px;line-height:1.45}textarea.sl-fld{resize:vertical;min-height:92px}.sl-fld::placeholder{color:var(--sl-mut)}.sl-fld:focus{outline:none;border-color:var(--sl-gold-b);box-shadow:0 0 0 3px var(--sl-gold-s)}' +
'.sl-sub{font-size:13px;color:var(--sl-sub);margin:-2px 0 12px;line-height:1.4}' +
'.sl-rh{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}.sl-rh h4{margin:0;font-size:17px;font-weight:600}.sl-rh p{margin:4px 0 0;font-size:13px;color:var(--sl-sub)}' +
'.sl-rule{display:flex;flex-wrap:wrap;align-items:center;gap:8px 8px;margin-bottom:8px;padding:8px;border-radius:16px;border:1px solid var(--sl-bd);background:var(--sl-in)}body .sl-rule input.sl-fld{flex:1 1 200px;min-width:0;min-height:42px;border:0!important;background:transparent!important;padding:8px 8px;box-shadow:none!important;border-radius:12px}.sl-rule:focus-within{border-color:var(--sl-gold-b)}.sl-rc{display:flex;align-items:center;gap:8px;flex:0 0 auto}' +
'.sl-chipb{flex:none;min-height:34px;padding:0 12px;border-radius:999px;border:1px solid var(--sl-bd);background:none;font:inherit;font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;cursor:pointer;color:var(--sl-mut)}.sl-chipb[aria-pressed=true]{color:var(--sl-neg);border-color:var(--sl-neg);background:var(--sl-neg-s)}' +
'.sl-none{padding:20px;border-radius:16px;border:1px dashed var(--sl-bd2);text-align:center;font-size:15px;color:var(--sl-sub)}' +
'.sl-err{margin:0 0 12px;padding:12px 12px;border-radius:12px;background:var(--sl-neg-s);color:var(--sl-neg);font-size:13px;line-height:1.4}.sl-err[hidden]{display:none}' +
'.sl-foot{display:flex;gap:12px;margin-top:8px}.sl-foot .gold{flex:1}' +
/* journal block */
'.sl-jf{margin-top:0}.sl-jf .sl-jl{display:flex;align-items:center;gap:8px;font-size:15px;color:#9ca3af;margin-bottom:8px;font-weight:500}.sl-jf .sl-jl svg{width:15px;height:15px}' +
'body.light .sl-jf .sl-jl{color:#52525b}' +
'.sl-selw{position:relative}.sl-sel{appearance:none;-webkit-appearance:none;width:100%;min-height:46px;padding:12px 40px 12px 16px;border-radius:16px;border:1px solid var(--sl-bd);background:var(--sl-in);color:var(--sl-tx);font:inherit;font-size:15px;font-weight:600}.sl-sel option{background:var(--sl-sheet);color:var(--sl-tx)}.sl-sel:focus{outline:none;border-color:var(--sl-gold-b)}.sl-selw svg{position:absolute;right:14px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--sl-sub);pointer-events:none}' +
'.sl-hint{font-size:12px;color:var(--sl-mut);margin:8px 0 0;line-height:1.4}body .sl-hint button[data-j]{display:inline;min-height:0!important;min-width:0!important;height:auto!important;padding:2px 0!important;margin:0;border:0!important;border-radius:0!important;background:none!important;box-shadow:none!important;color:var(--sl-gold)!important;font:inherit;font-weight:700;text-decoration:underline;text-underline-offset:2px;cursor:pointer;white-space:normal}body .sl-hint button[data-j]:focus-visible{outline:2px solid var(--sl-gold);outline-offset:2px;border-radius:4px!important}' +
'.sl-comp{margin-top:12px;border-radius:24px;padding:16px;border:1px solid var(--sl-gold-b);background:linear-gradient(160deg,var(--sl-gold-s),transparent 70%),var(--sl-in)}' +
'.sl-comp[hidden]{display:none}.sl-ch2{display:flex;align-items:center;gap:8px;padding-bottom:12px;margin-bottom:12px;border-bottom:1px solid var(--sl-bd)}.sl-ch2 svg{width:18px;height:18px;color:var(--sl-gold);flex:none}.sl-ch2 b{flex:1;min-width:0;font-size:13px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--sl-tx)}' +
'.sl-cnt{flex:none;font-size:12px;font-weight:600;padding:4px 12px;border-radius:999px;border:1px solid var(--sl-gold-b);background:var(--sl-gold-s);color:var(--sl-gold);font-variant-numeric:tabular-nums;white-space:nowrap}.sl-cnt.ok{color:var(--sl-pos);border-color:var(--sl-pos);background:var(--sl-pos-s)}' +
'.sl-item{position:relative;display:flex;align-items:flex-start;gap:12px;padding:12px 16px;margin-bottom:8px;border-radius:16px;border:1px solid var(--sl-bd);background:var(--sl-sheet);cursor:pointer;min-height:56px;transition:border-color .2s,background .2s}' +
'.sl-item input{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}.sl-box{flex:none;width:24px;height:24px;border-radius:8px;border:2px solid var(--sl-bd2);display:grid;place-items:center;margin-top:1px;transition:all .18s;color:transparent}.sl-box svg{width:15px;height:15px}' +
'.sl-item.on{border-color:var(--sl-gold-b)}.sl-item.on .sl-box{background:linear-gradient(180deg,#f0d789,#d4af37);border-color:#d4af37;color:#1a1405}' +
'.sl-it{flex:1;min-width:0}.sl-it b{display:block;font-size:15px;font-weight:600;line-height:1.35;overflow-wrap:anywhere}.sl-it i{display:block;font-style:normal;font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--sl-neg);margin-top:4px}.sl-it i.o{color:var(--sl-mut)}' +
'.sl-warn{margin:2px 0 8px;padding:8px 12px;border-radius:12px;background:var(--sl-neg-s);color:var(--sl-neg);font-size:13px;line-height:1.4}.sl-warn[hidden]{display:none}' +
'.sl-tools{display:flex;gap:8px;flex-wrap:wrap;margin-top:2px}' +
'.sl-rem{margin-top:12px;border-top:1px solid var(--sl-bd);padding-top:12px}.sl-rem summary{cursor:pointer;font-size:13px;font-weight:600;color:var(--sl-sub);min-height:32px;display:flex;align-items:center}.sl-rem summary:focus-visible{outline:2px solid var(--sl-gold);outline-offset:2px;border-radius:8px}.sl-rem .sl-dh{margin-top:12px}' +
'.sl-jchip{display:inline-flex;align-items:center;gap:8px}.sl-jchip.ok{color:var(--sl-pos,#2dd4bf)!important}.sl-jchip.bad{color:var(--sl-neg,#ff7a68)!important}.sl-jchip svg{width:12px;height:12px}' +
'@media(max-width:520px){.sl-rule{flex-direction:column;align-items:stretch}body .sl-rule input.sl-fld{flex:0 0 auto;width:100%}.sl-rc{width:100%}.sl-rc .sl-chipb{margin-right:auto}.sl-sum{gap:8px}.sl-sc{padding:12px}.sl-sc b{font-size:17px}.sl-kpis{grid-template-columns:repeat(2,1fr)}.sl-grid{grid-template-columns:1fr}}' +
/* playbook v16.26 */
'.sl-adh{border-radius:24px;padding:16px 20px;margin-bottom:16px}.sl-adh h3{margin:0;font-size:17px;font-weight:600}.sl-adh p{margin:4px 0 12px;font-size:13px;color:var(--sl-sub);line-height:1.4}' +
'.sl-ar{display:grid;grid-template-columns:minmax(80px,170px) 1fr auto;align-items:center;gap:8px 12px;padding:8px 0;border-top:1px solid var(--sl-bd)}.sl-ar:first-of-type{border-top:0}.sl-ar b{font-size:15px;font-weight:600;overflow-wrap:anywhere;line-height:1.3}.sl-ar em{font-style:normal;font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right;min-width:3.4em}.sl-ar small{grid-column:1/-1;font-size:12px;color:var(--sl-mut);margin-top:-2px}' +
'.sl-trk{position:relative;height:10px;border-radius:999px;background:var(--sl-in);border:1px solid var(--sl-bd);overflow:visible}.sl-fill{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:var(--sl-neg)}.sl-fill.ok{background:var(--sl-pos)}.sl-fill.mid{background:var(--sl-gold)}.sl-tick{position:absolute;top:-4px;bottom:-4px;width:2px;border-radius:2px;background:var(--sl-gold)}' +
'.sl-cbar{margin-top:12px}.sl-cbar .sl-cbt{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--sl-sub);margin-bottom:8px;line-height:1.3}.sl-cbar .sl-cbt b{color:var(--sl-tx);font-variant-numeric:tabular-nums}' +
'.sl-dtabs{display:flex;gap:4px;padding:4px;border-radius:16px;border:1px solid var(--sl-bd);background:var(--sl-in);margin-bottom:16px}.sl-dtabs button{flex:1;min-height:38px;padding:0 8px;border-radius:12px;border:0;background:none;color:var(--sl-sub);font:inherit;font-size:13px;font-weight:600;cursor:pointer}.sl-dtabs button[aria-selected=true]{background:var(--sl-gold-s);color:var(--sl-gold);box-shadow:inset 0 0 0 1px var(--sl-gold-b)}.sl-dtabs button:focus-visible{outline:2px solid var(--sl-gold);outline-offset:2px}' +
'.sl-gh{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--sl-sub);margin:12px 0 8px}.sl-gh::after{content:"";flex:1;height:1px;background:var(--sl-bd)}' +
'.sl-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 4px}.sl-chip{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;border:1px solid var(--sl-gold-b);background:var(--sl-gold-s);color:var(--sl-gold);font-size:12px;font-weight:600;font-variant-numeric:tabular-nums}' +
'.sl-exg{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px}.sl-ex{border-radius:16px;overflow:hidden;border:2px solid var(--sl-bd);background:var(--sl-in);min-width:0}.sl-ex.valid{border-color:var(--sl-pos)}.sl-ex.invalid{border-color:var(--sl-neg)}' +
'.sl-ex button.sl-exb{display:block;width:100%;padding:0;margin:0;border:0;background:none;cursor:zoom-in;position:relative;line-height:0}.sl-ex button.sl-exb:focus-visible{outline:2px solid var(--sl-gold);outline-offset:-2px}.sl-ex img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:var(--sl-bd)}' +
'.sl-ex .sl-exk{position:absolute;left:6px;top:6px;display:inline-flex;align-items:center;gap:4px;padding:4px 8px 4px 8px;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;line-height:1.2;background:rgba(0,0,0,.72);color:#fff}.sl-ex.valid .sl-exk svg{color:#2dd4bf}.sl-ex.invalid .sl-exk svg{color:#ff7a68}.sl-exk svg{width:11px;height:11px}' +
'.sl-ex p{margin:0;padding:8px 12px;font-size:12px;line-height:1.35;color:var(--sl-sub);overflow-wrap:anywhere}' +
'.sl-evr{display:grid;grid-template-columns:1fr auto;gap:8px 12px;align-items:center;padding:12px 12px;margin-bottom:8px;border-radius:16px;background:var(--sl-in);border:1px solid var(--sl-bd)}.sl-evl{font-size:15px;font-weight:600;line-height:1.3;overflow-wrap:anywhere}' +
'.sl-evv{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:4px 16px;font-size:13px;color:var(--sl-sub);line-height:1.35}.sl-evv i{font-style:normal;font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--sl-mut);margin-right:8px}.sl-evv b{color:var(--sl-tx);font-variant-numeric:tabular-nums;font-weight:700}' +
'.sl-st{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;padding:4px 8px 4px 8px;border-radius:999px;border:1px solid var(--sl-bd2);color:var(--sl-sub);white-space:nowrap}.sl-st svg{width:12px;height:12px}.sl-st.ok{color:var(--sl-pos);border-color:var(--sl-pos);background:var(--sl-pos-s)}.sl-st.bad{color:var(--sl-neg);border-color:var(--sl-neg);background:var(--sl-neg-s)}' +
'.sl-rb{display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center;padding:8px 0;border-top:1px solid var(--sl-bd)}.sl-rb:first-of-type{border-top:0}.sl-rb span{font-size:13px;line-height:1.35;overflow-wrap:anywhere}.sl-rb em{font-style:normal;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--sl-sub);white-space:nowrap}.sl-rb .sl-trk{grid-column:1/-1}' +
'.sl-lb{position:fixed;inset:0;z-index:140;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px 16px calc(20px + env(safe-area-inset-bottom,0px))}.sl-lb img{max-width:100%;max-height:78vh;max-height:78dvh;object-fit:contain;border-radius:12px;background:#111}.sl-lb p{margin:0;max-width:60ch;text-align:center;color:rgba(255,255,255,.88);font-size:15px;line-height:1.45}.sl-lb .sl-ib{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));right:12px;background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.25)}' +
/* editor additions */
'.sl-gsel{flex:0 0 auto;min-height:34px;max-width:150px;padding:0 24px 0 12px;border-radius:999px;border:1px solid var(--sl-bd);background:var(--sl-in);color:var(--sl-sub);font:inherit;font-size:12px;font-weight:600;cursor:pointer}.sl-gsel option{background:var(--sl-sheet);color:var(--sl-tx)}.sl-gsel:focus-visible{outline:2px solid var(--sl-gold);outline-offset:2px}' +
'.sl-num3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}.sl-num3 label{display:block;font-size:12px;font-weight:600;letter-spacing:.01em;color:var(--sl-sub);margin-bottom:8px;line-height:1.3}.sl-num3 .sl-fld{min-height:44px}' +
'.sl-exh{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:16px 0 8px}.sl-exh:first-of-type{margin-top:0}.sl-exh h5{margin:0;display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700}.sl-exh h5 svg{width:16px;height:16px}.sl-exh.valid h5{color:var(--sl-pos)}.sl-exh.invalid h5{color:var(--sl-neg)}' +
'.sl-exi{display:grid;grid-template-columns:72px 1fr auto;gap:12px;align-items:center;padding:8px;margin-bottom:8px;border-radius:16px;border:1px solid var(--sl-bd);background:var(--sl-sheet)}.sl-exi img{width:72px;height:54px;object-fit:cover;border-radius:12px;display:block}.sl-exi .sl-fld{min-height:40px;padding:8px 12px;font-size:13px}.sl-exi.busy{grid-template-columns:1fr;color:var(--sl-sub);font-size:13px;padding:16px}' +
'@media(max-width:520px){.sl-ar{grid-template-columns:1fr auto}.sl-ar .sl-trk{grid-column:1/-1;grid-row:2}.sl-num3{grid-template-columns:1fr}.sl-exg{grid-template-columns:repeat(2,1fr)}.sl-exi{grid-template-columns:64px 1fr auto}.sl-exi img{width:64px;height:48px}}' +
'@media(prefers-reduced-motion:reduce){.sl-fill{transition:none}}' +
'#strategy-section:not(.hidden){animation:miTab var(--mi-base,.4s) var(--mi-ease,ease) backwards}' +
'@media(prefers-reduced-motion:reduce){.sl-ov,.sl-sheet,.sl-item,.sl-box,.sl-skel{transition:none;animation:none}}';
  (function addStyle() { var s = document.createElement('style'); s.id = 'sl-css'; s.textContent = css; document.head.appendChild(s); })();

  /* ---------- Ikon ---------- */
  function ic(p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var I = {
    book: ic('<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>'),
    plus: ic('<path d="M12 5v14M5 12h14"/>'), x: ic('<path d="M18 6 6 18M6 6l12 12"/>'),
    check: ic('<path d="m5 12.5 4.5 4.5L19 7.5"/>'), search: ic('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    up: ic('<path d="m6 15 6-6 6 6"/>'), down: ic('<path d="m6 9 6 6 6-6"/>'), trash: ic('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'),
    list: ic('<path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17M11 6h10M11 12h10M11 18h10"/>'),
    shield: ic('<path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6z"/><path d="M12 8v4M12 15.5v.01"/>'),
    target: ic('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>'),
    image: ic('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/>'),
    ban: ic('<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>'),
    chart: ic('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    checkbox: ic('<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>')
  };

  /* ==========================================================
     HALAMAN LIBRARY
     ========================================================== */
  function root() { return $('strategy-section'); }
  function visible() { var r = root(); return !!r && !r.classList.contains('hidden'); }

  function renderShell() {
    var r = root(); if (!r) return; var t = L();
    r.classList.add('sl');
    r.innerHTML =
      '<div class="sl-head"><h2 class="sl-h1"><span class="gold-text">' + esc(t.title) + '</span><small>' + esc(t.sub) + '</small></h2>' +
      '<button type="button" class="sl-btn gold" data-sl="new">' + I.plus + esc(t.neu) + '</button></div>' +
      '<div class="sl-sum" id="sl-sum"></div>' +
      '<div class="sl-bar"><label class="sl-search"><span class="sr-only" style="position:absolute;left:-9999px">' + esc(t.search) + '</span>' + I.search + '<input type="search" id="sl-q" autocomplete="off" placeholder="' + esc(t.search) + '" value="' + esc(S.q) + '"></label>' +
      '<div class="sl-seg" role="group" aria-label="Filter"><button type="button" data-sl="tab" data-tab="active" aria-pressed="' + (S.tab === 'active') + '">' + esc(t.active) + '</button><button type="button" data-sl="tab" data-tab="archived" aria-pressed="' + (S.tab === 'archived') + '">' + esc(t.archived) + '</button></div></div>' +
      '<div id="sl-list" aria-live="polite"></div>';
    renderBody();
  }

  function summaryHTML() {
    var t = L(), o = overall(), act = S.list.filter(function (s) { return !s.archived; }).length;
    function card(v, l) { return '<div class="glass sl-sc"><b>' + esc(v) + '</b><span>' + esc(l) + '</span></div>'; }
    return card(String(act), t.sStrat) + card(o.total ? o.withS + '/' + o.total : String(o.withS), t.sUsed) + card(pct(o.avg), t.sComp);
  }

  function kpiHTML(s) {
    var t = L(), plc = s.trades ? (s.pl > 0 ? ' sl-pos' : s.pl < 0 ? ' sl-neg' : '') : '';
    function k(v, l, c) { return '<div class="sl-k"><b class="' + (c || '') + '">' + esc(v) + '</b><span>' + esc(l) + '</span></div>'; }
    return '<div class="sl-kpis">' + k(String(s.trades), t.trades) + k(s.trades >= 10 ? pct(s.wr) : (s.trades ? '·' : t.na), t.win) + k(pct(s.avgComp), t.comp) + k(s.trades ? money(s.pl) : t.na, t.pl, plc) + '</div>';
  }

  /* bar kepatuhan: v = 0..1, target = 1..100 (garis emas). Warna + angka, bukan warna saja. */
  function trk(v, target, label) {
    var p = Math.max(0, Math.min(100, Math.round(v * 100))), cls = p >= target ? 'ok' : (p >= target - 15 ? 'mid' : '');
    return '<div class="sl-trk" role="img" aria-label="' + esc(label + ' ' + p + '%, target ' + target + '%') + '"><div class="sl-fill ' + cls + '" style="width:' + p + '%"></div><span class="sl-tick" style="left:calc(' + target + '% - 1px)"></span></div>';
  }
  function adherenceHTML(list, cache) {
    var t = L(), rows = list.filter(function (st) { return cache[st.id].avgComp !== null; });
    if (!list.length) return '';
    var h = '<section class="glass sl-adh" aria-labelledby="sl-adh-t"><h3 id="sl-adh-t">' + esc(t.adhTitle) + '</h3><p>' + esc(t.adhSub) + '</p>';
    if (!rows.length) h += '<p style="margin:0">' + esc(t.adhNone) + '</p>';
    else h += rows.map(function (st) {
      var s = cache[st.id];
      return '<div class="sl-ar"><b>' + esc(st.name) + '</b>' + trk(s.avgComp, st.targetComp, st.name) + '<em>' + pct(s.avgComp) + '</em><small>' + s.compN + ' ' + esc(t.adhN) + ' · ' + esc(t.evRule.toLowerCase()) + ' ≥ ' + st.targetComp + '%</small></div>';
    }).join('');
    return h + '</section>';
  }

  function chipsHTML(st, noComp) {
    var t = L(), c = [];
    if (st.minRR) c.push(t.minRR + ' 1:' + st.minRR);
    if (st.maxRisk) c.push(t.maxRisk.replace(/\s*\(%\)/, '') + ' ≤ ' + st.maxRisk + '%');
    if (!noComp) c.push(t.targetComp.replace(/\s*\(%\)/, '') + ' ' + st.targetComp + '%');
    return '<div class="sl-chips">' + c.map(function (x) { return '<span class="sl-chip">' + esc(x) + '</span>'; }).join('') + '</div>';
  }
  function byGroup(items) { return GROUPS.map(function (g) { return { g: g, items: items.filter(function (r) { return r.group === g; }) }; }).filter(function (x) { return x.items.length; }); }

  function rulesPane(st) {
    var t = L(), h = chipsHTML(st), gs = byGroup(st.checklist);
    h += '<div class="sl-dh">' + esc(t.entryList) + '</div>';
    if (!gs.length) h += '<p class="sl-txt">' + esc(t.none) + '</p>';
    gs.forEach(function (x) {
      if (gs.length > 1) h += '<div class="sl-gh">' + esc(t.grp[x.g]) + '</div>';
      h += x.items.map(function (r) { return '<div class="sl-li"><span>' + esc(r.text) + '</span><span class="sl-tag' + (r.required ? '' : ' o') + '">' + esc(r.required ? t.req : t.opt) + '</span></div>'; }).join('');
    });
    h += '<div class="sl-dh">' + esc(t.inv) + '</div><p class="sl-txt">' + esc(st.invalidation || t.none) + '</p>';
    h += '<div class="sl-dh">' + esc(t.sl) + '</div><p class="sl-txt">' + esc(st.stopLoss || t.none) + '</p>';
    h += '<div class="sl-dh">' + esc(t.tp) + '</div><p class="sl-txt">' + esc(st.target || t.none) + '</p>';
    h += '<div class="sl-dh">' + esc(t.exit) + '</div><p class="sl-txt">' + esc(st.exit || t.none) + '</p>';
    return h;
  }

  function exLabel(k) { var t = L(); return k === 'invalid' ? t.exInvalid : t.exValid; }
  function thumbHTML(e, act) {
    var lbl = exLabel(e.kind);
    return '<figure class="sl-ex ' + e.kind + '" style="margin:0"><button type="button" class="sl-exb" data-' + act + '="zoom" data-ex="' + esc(e.id) + '" aria-label="' + esc(lbl + (e.caption ? ': ' + e.caption : '')) + '">' +
      '<img loading="lazy" decoding="async" src="' + esc(e.url) + '" alt="' + esc(e.caption || lbl) + '"><span class="sl-exk">' + (e.kind === 'invalid' ? I.x : I.check) + esc(lbl) + '</span></button>' +
      (e.caption ? '<p>' + esc(e.caption) + '</p>' : '') + '</figure>';
  }
  function examplesPane(st) {
    var t = L(), h = '<p class="sl-sub">' + esc(t.exSub) + '</p>';
    ['valid', 'invalid'].forEach(function (k) {
      var list = st.examples.filter(function (e) { return e.kind === k; });
      h += '<div class="sl-dh">' + esc(exLabel(k)) + ' · ' + list.length + '</div>' + (list.length ? '<div class="sl-exg">' + list.map(function (e) { return thumbHTML(e, 'sl'); }).join('') + '</div>' : '<p class="sl-txt">' + esc(t.exNone) + '</p>');
    });
    return h;
  }

  function fmtN(n) { return String(Math.round(n * 100) / 100); }
  function evalPane(st, s) {
    var t = L(), h = '', rows = [], tc = st.targetComp;
    function status(k) { return k === 'ok' ? '<span class="sl-st ok">' + I.check + esc(t.evOk) + '</span>' : k === 'bad' ? '<span class="sl-st bad">' + I.x + esc(t.evBad) + '</span>' : k === 'no' ? '<span class="sl-st">' + esc(t.evNo) + '</span>' : ''; }
    function row(label, rule, act, k) { return '<div class="sl-evr"><div class="sl-evl">' + esc(label) + '</div>' + status(k) + '<div class="sl-evv"><span><i>' + esc(t.evRule) + '</i><b>' + esc(rule) + '</b></span><span><i>' + esc(t.evAct) + '</i><b>' + esc(act) + '</b></span></div></div>'; }
    if (s.avgComp !== null) {
      rows.push(row(t.evComp, '≥ ' + tc + '%', pct(s.avgComp) + ' · ' + s.compN + ' ' + t.adhN, s.compN >= 5 ? (s.avgComp * 100 >= tc ? 'ok' : 'bad') : 'no'));
      rows.push(row(t.evReq, '≥ ' + tc + '%', pct(s.reqRate) + ' · ' + s.reqOk + '/' + s.reqDays + ' ' + t.evDays, s.reqDays >= 5 ? (s.reqRate * 100 >= tc ? 'ok' : 'bad') : 'no'));
    }
    if (st.maxRisk || s.risks.length) {
      var over = s.risks.filter(function (r) { return r > st.maxRisk; }).length;
      rows.push(row(t.evRisk, st.maxRisk ? '≤ ' + st.maxRisk + '%' : t.evNoRule, s.risks.length ? t.evRiskAct(fmtN(s.avgRisk), st.maxRisk ? over : 0, s.risks.length) : t.na, st.maxRisk ? (s.risks.length >= 3 ? (over === 0 ? 'ok' : 'bad') : 'no') : ''));
    }
    if (st.minRR || s.winR.length) {
      rows.push(row(t.evRR, st.minRR ? '≥ 1:' + st.minRR : t.evNoRule, s.winR.length ? t.evRRAct(fmtN(s.avgWinR), s.winR.length) : t.na, st.minRR ? (s.winR.length >= 3 ? (s.avgWinR >= st.minRR ? 'ok' : 'bad') : 'no') : ''));
    }
    h += '<div class="sl-dh">' + esc(t.evTitle) + '</div>';
    h += rows.length ? rows.join('') : '<p class="sl-txt">' + esc(t.evNeedChecklist) + '</p>';
    if (rows.length && (st.minRR || s.winR.length || st.maxRisk || s.risks.length)) h += '<p class="sl-note">' + esc(t.evRRNote) + '</p>';
    if (s.recComp !== null) h += '<p class="sl-note">' + esc(t.trendRec) + ': <b>' + pct(s.recComp) + '</b> · ' + esc(t.trendAll) + ': <b>' + pct(s.avgComp) + '</b></p>';

    var rr = st.checklist.map(function (r) { var x = s.rules[r.id]; return x && x.seen ? { r: r, seen: x.seen, hit: x.hit, v: x.hit / x.seen } : null; }).filter(Boolean).sort(function (a, b) { return a.v - b.v; });
    h += '<div class="sl-dh">' + esc(t.ruleTitle) + '</div>';
    if (!rr.length) h += '<p class="sl-txt">' + esc(t.ruleNone) + '</p>';
    else {
      h += '<p class="sl-sub" style="margin-top:-4px">' + esc(t.ruleSub) + '</p>' + rr.map(function (x) {
        var low = x.seen >= 3 && x.v * 100 < tc;
        return '<div class="sl-rb"><span>' + esc(x.r.text) + (low ? ' <span class="sl-tag">' + esc(t.ruleLow) + '</span>' : '') + '</span><em>' + x.hit + '/' + x.seen + ' · ' + Math.round(x.v * 100) + '%</em>' + trk(x.v, tc, x.r.text) + '</div>';
      }).join('');
    }
    if (s.full.t + s.part.t > 0) {
      var cell = function (b, label) {
        var ok = b.t >= 10;
        return '<div><b>' + (ok ? Math.round(b.w / b.t * 100) + '%' : esc(t.cmpEnough)) + '</b><span>' + esc(label) + ' · ' + b.t + ' ' + esc(t.trades.toLowerCase()) + (ok ? ' · ' + esc(money(b.pl / b.t)) + '/' + esc(t.trades.toLowerCase()) : '') + '</span></div>';
      };
      h += '<div class="sl-dh">' + esc(t.cmpTitle) + '</div><div class="sl-cmp">' + cell(s.full, t.cmpFull) + cell(s.part, t.cmpPart) + '</div><p class="sl-note">' + esc(t.cmpNote) + '</p>';
    }
    if (s.mixed) h += '<p class="sl-note">' + s.mixed + ' ' + esc(t.mixedNote) + '</p>';
    return h;
  }

  function detailHTML(st, s) {
    var t = L(), tab = S.dtab[st.id] || 'rules', tabs = [['rules', t.dtRules], ['ex', t.dtEx + (st.examples.length ? ' (' + st.examples.length + ')' : '')], ['eval', t.dtEval]];
    return '<div class="sl-dtabs" role="tablist">' + tabs.map(function (x) { return '<button type="button" role="tab" data-sl="dtab" data-tab="' + x[0] + '" aria-selected="' + (tab === x[0]) + '">' + esc(x[1]) + '</button>'; }).join('') + '</div>' +
      '<div role="tabpanel">' + (tab === 'ex' ? examplesPane(st) : tab === 'eval' ? evalPane(st, s) : rulesPane(st)) + '</div>';
  }

  function cardHTML(st, s) {
    var t = L(), open = !!S.open[st.id];
    var cbar = s.avgComp !== null ? '<div class="sl-cbar"><div class="sl-cbt"><span>' + esc(t.comp) + ' · ' + esc(t.adhTarget || 'Target') + ' ' + st.targetComp + '%</span><b>' + pct(s.avgComp) + '</b></div>' + trk(s.avgComp, st.targetComp, t.comp) + '</div>' : '';
    return '<article class="glass sl-card" data-id="' + esc(st.id) + '">' +
      '<div class="sl-ch"><div class="sl-ico">' + I.book + '</div><div class="sl-ct"><h3>' + esc(st.name) + '</h3><div class="sl-meta">' + st.checklist.length + ' ' + esc(t.rules) + (st.examples.length ? ' · ' + st.examples.length + ' ' + esc(t.dtEx.toLowerCase()) : '') + (st.archived ? ' · ' + esc(t.archived) : '') + '</div></div></div>' +
      (st.description ? '<p class="sl-desc">' + esc(st.description) + '</p>' : '') + kpiHTML(s) + cbar +
      '<div class="sl-acts"><button type="button" class="sl-btn sm" data-sl="toggle" aria-expanded="' + open + '">' + (open ? I.up : I.down) + '<span>' + esc(open ? t.hideRules : t.showRules) + '</span></button>' +
      '<button type="button" class="sl-btn sm" data-sl="edit">' + esc(t.edit) + '</button><button type="button" class="sl-btn sm" data-sl="dup">' + esc(t.dup) + '</button>' +
      '<button type="button" class="sl-btn sm" data-sl="' + (st.archived ? 'unarch' : 'arch') + '">' + esc(st.archived ? t.unarch : t.arch) + '</button>' +
      '<button type="button" class="sl-btn sm danger" data-sl="del">' + esc(t.del) + '</button></div>' +
      '<div class="sl-detail"' + (open ? '' : ' hidden') + '>' + detailHTML(st, s) + '</div></article>';
  }

  function renderBody() {
    var sum = $('sl-sum'), box = $('sl-list'); if (!sum || !box) return; var t = L();
    sum.innerHTML = summaryHTML();
    if (!S.loaded) { box.innerHTML = '<div class="sl-grid"><div class="sl-skel"></div><div class="sl-skel"></div></div>'; return; }
    if (S.err && !S.list.length) { box.innerHTML = '<div class="glass sl-empty"><p>' + esc(t.loadErr) + '</p></div>'; return; }
    var q = S.q.trim().toLowerCase();
    var list = sorted(S.list.filter(function (s) { return S.tab === 'archived' ? s.archived : !s.archived; }).filter(function (s) { return !q || (s.name + ' ' + s.description).toLowerCase().indexOf(q) >= 0; }));
    if (!list.length) {
      if (!S.list.length) {
        box.innerHTML = '<div class="glass sl-empty"><div class="sl-ico" style="margin:0 auto;width:52px;height:52px;border-radius:16px">' + I.book + '</div><h3>' + esc(t.emptyT) + '</h3><p>' + esc(t.emptyS) + '</p>' +
          '<button type="button" class="sl-btn gold" data-sl="new">' + I.plus + esc(t.neu) + '</button>' +
          '<div class="sl-tpls"><button type="button" class="sl-btn sm" data-sl="tpl" data-tpl="break">' + esc(t.tplBreak) + '</button><button type="button" class="sl-btn sm" data-sl="tpl" data-tpl="ict">' + esc(t.tplIct) + '</button></div></div>';
      } else {
        box.innerHTML = '<div class="glass sl-empty"><p style="margin:0">' + esc(q ? t.noMatch : (S.tab === 'archived' ? t.emptyArch : t.noMatch)) + '</p></div>';
      }
      return;
    }
    var cache = {}; list.forEach(function (st) { cache[st.id] = statsFor(st.id); });
    list.sort(function (a, b) { return cache[b.id].days - cache[a.id].days; });
    box.innerHTML = (S.tab === 'active' && !q && window.StrategyExec ? StrategyExec.html(S.list) : '') + (S.tab === 'active' && !q ? adherenceHTML(list, cache) : '') + '<div class="sl-grid">' + list.map(function (st) { return cardHTML(st, cache[st.id]); }).join('') + '</div>';
  }

  /* ---------- Lightbox screenshot ---------- */
  var lb = null, lbPrev = null;
  function closeLightbox() {
    if (!lb) return; var el = lb; lb = null; document.removeEventListener('keydown', lbKey, true);
    if (el.parentNode) el.parentNode.removeChild(el);
    try { if (lbPrev && lbPrev.focus) lbPrev.focus({ preventScroll: true }); } catch (e) {}
  }
  function lbKey(e) { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closeLightbox(); } else if (e.key === 'Tab') { e.preventDefault(); } }
  function openLightbox(ex) {
    if (!ex) return; closeLightbox(); var t = L(); lbPrev = document.activeElement;
    lb = document.createElement('div'); lb.className = 'sl-lb sl'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', exLabel(ex.kind));
    lb.innerHTML = '<button type="button" class="sl-ib" aria-label="' + esc(t.close) + '">' + I.x + '</button><img src="' + esc(ex.url) + '" alt="' + esc(ex.caption || exLabel(ex.kind)) + '"><p><b>' + esc(exLabel(ex.kind)) + '</b>' + (ex.caption ? ' · ' + esc(ex.caption) : '') + '</p>';
    lb.addEventListener('click', closeLightbox); document.addEventListener('keydown', lbKey, true);
    document.body.appendChild(lb); var b = lb.querySelector('button'); if (b) b.focus({ preventScroll: true });
  }
  function findEx(st, id) { if (!st) return null; for (var i = 0; i < st.examples.length; i++) if (st.examples[i].id === id) return st.examples[i]; return null; }

  function refreshAll() { if (root() && root().firstChild) renderBody(); else if (visible()) renderShell(); try { syncJournalBlock(); } catch (e) {} }

  /* ---------- Aksi di halaman ---------- */
  function onSectionClick(e) {
    var b = e.target.closest('[data-sl]'); if (!b || !root().contains(b)) return;
    var a = b.getAttribute('data-sl'), card = b.closest('.sl-card'), id = card && card.getAttribute('data-id'), st = id && byId(id);
    if (a === 'new') { fromJournal = false; return openEditor(null); }
    if (a === 'tpl') return openEditor(null, TEMPLATES[b.getAttribute('data-tpl')]());
    if (a === 'tab') { S.tab = b.getAttribute('data-tab'); return renderShell(); }
    if (!st) return;
    if (a === 'dtab') {
      S.dtab[id] = b.getAttribute('data-tab'); var dt = card.querySelector('.sl-detail'); dt.innerHTML = detailHTML(st, statsFor(id));
      var nb = dt.querySelector('[data-tab="' + S.dtab[id] + '"]'); if (nb) nb.focus({ preventScroll: true }); return;
    }
    if (a === 'zoom') return openLightbox(findEx(st, b.getAttribute('data-ex')));
    if (a === 'toggle') {
      S.open[id] = !S.open[id]; var d = card.querySelector('.sl-detail'), t = L();
      d.hidden = !S.open[id]; b.setAttribute('aria-expanded', String(!!S.open[id]));
      b.innerHTML = (S.open[id] ? I.up : I.down) + '<span>' + esc(S.open[id] ? t.hideRules : t.showRules) + '</span>'; return;
    }
    if (a === 'edit') { fromJournal = false; return openEditor(st); }
    if (a === 'dup') return duplicate(st);
    if (a === 'arch' || a === 'unarch') return setArchived(st, a === 'arch');
    if (a === 'del') return remove(st);
  }
  function guard() { if (!S.uid || !DB()) { toast(L().errLogin); return false; } return true; }
  function duplicate(st) {
    if (!guard()) return; var t = L();
    var name = (st.name + ' (' + t.copy + ')').slice(0, 40);
    col().add({ name: name, description: st.description, checklist: st.checklist.map(function (r) { return { id: rid(), text: r.text, required: r.required, group: r.group }; }), invalidation: st.invalidation, exit: st.exit,
      stopLoss: st.stopLoss, target: st.target, minRR: st.minRR, maxRisk: st.maxRisk, targetComp: st.targetComp,
      examples: st.examples.map(function (e) { return { id: rid(), url: e.url, kind: e.kind, caption: e.caption }; }), archived: false, createdAt: stamp(), updatedAt: stamp() })
      .then(function () { toast(t.okDup); }).catch(function (err) { toast(t.errSave + err.message); });
  }
  function setArchived(st, v) {
    if (!guard()) return; var t = L();
    col().doc(st.id).set({ archived: v, updatedAt: stamp() }, { merge: true }).then(function () { toast(v ? t.okArch : t.okUnarch); }).catch(function (err) { toast(t.errSave + err.message); });
  }
  function remove(st) {
    if (!guard()) return; var t = L();
    /* v16.42: hapus langsung + "Urungkan" (cadangan dibuat dulu). Tanpa modul undo, tetap memakai konfirmasi. */
    if (window.UR) { UR.deleteWithUndo(col().doc(st.id), { message: t.okDel }).catch(function (err) { toast(t.errSave + err.message); }); return; }
    if (!confirm(t.confirmDel)) return;
    col().doc(st.id).delete().then(function () { toast(t.okDel); }).catch(function (err) { toast(t.errSave + err.message); });
  }

  /* ==========================================================
     EDITOR
     ========================================================== */
  var TEMPLATES = {
    break: function () {
      return { name: 'Breakout Retest', description: 'Masuk saat harga retest level yang baru ditembus.', checklist: [
        { id: rid(), text: 'Level support/resistance jelas di HTF', required: true, group: 'setup' },
        { id: rid(), text: 'Breakout dengan candle body kuat', required: true, group: 'setup' },
        { id: rid(), text: 'Retest tanpa close menembus level', required: true, group: 'entry' },
        { id: rid(), text: 'Konfirmasi rejection di LTF', required: false, group: 'entry' },
        { id: rid(), text: 'Stop loss sudah dipasang di balik level', required: true, group: 'risk' },
        { id: rid(), text: 'RR minimal 1:2 ke target berikutnya', required: true, group: 'risk' }],
        invalidation: 'Candle close kembali masuk ke dalam range sebelum breakout.', stopLoss: 'Di balik candle retest / level yang ditembus, plus buffer spread.',
        target: 'Level atau liquidity berikutnya (min. 1:2). Ambil sebagian di 1R bila perlu.', exit: 'Cut manual bila struktur LTF berbalik.', minRR: 2, maxRisk: 1, targetComp: 80, examples: [] };
    },
    ict: function () {
      return { name: 'ICT', description: 'Entry berbasis Inversion FVG setelah sweep liquidity.', checklist: [
        { id: rid(), text: 'IFVG', required: true, group: 'entry' }, { id: rid(), text: 'No HTF FVG', required: true, group: 'entry' }],
        invalidation: 'Body candle close menembus IFVG berlawanan arah.', stopLoss: 'Di atas/bawah swing yang menciptakan IFVG.', target: 'Liquidity pool terdekat (min. 1:2).',
        exit: 'TP di liquidity pool terdekat.', minRR: 2, maxRisk: 1, targetComp: 80, examples: [] };
    }
  };

  var E = null, edPrev = null, edEl = null, fromJournal = false;

  function openEditor(st, seed) {
    if (!guard()) { fromJournal = false; return; } closeEditor(true);
    var src = st || seed || null;
    E = { id: st ? st.id : null, name: src ? src.name : '', description: src ? src.description : '', checklist: src ? src.checklist.map(function (r) { return { id: r.id || rid(), text: r.text, required: r.required !== false, group: grpOf(r.group) }; }) : [],
      invalidation: src ? src.invalidation : '', exit: src ? src.exit : '', stopLoss: src ? (src.stopLoss || '') : '', target: src ? (src.target || '') : '',
      minRR: src && src.minRR ? String(src.minRR) : '', maxRisk: src && src.maxRisk ? String(src.maxRisk) : '', targetComp: String(src && src.targetComp ? src.targetComp : 80),
      examples: src && Array.isArray(src.examples) ? src.examples.map(function (e) { return { id: e.id || rid(), url: e.url, kind: e.kind === 'invalid' ? 'invalid' : 'valid', caption: e.caption || '' }; }) : [], pending: 0 };
    edPrev = document.activeElement; var t = L();
    edEl = document.createElement('div'); edEl.className = 'sl-ov sl'; edEl.setAttribute('role', 'presentation');
    edEl.innerHTML = '<div class="sl-sheet" role="dialog" aria-modal="true" aria-labelledby="sl-et">' +
      '<div class="sl-eh"><div><h2 id="sl-et"><span class="gold-text">' + esc(E.id ? t.editT : t.createT) + '</span></h2><p>' + esc(t.createS) + '</p></div><button type="button" class="sl-ib" data-ed="cancel" aria-label="' + esc(t.cancel) + '">' + I.x + '</button></div>' +
      '<p class="sl-err" id="sl-err" role="alert" hidden></p>' +
      '<div class="sl-blk"><label class="sl-lbl" for="sl-name">' + I.target + esc(t.fName) + '</label><input class="sl-fld" id="sl-name" maxlength="40" autocomplete="off" placeholder="' + esc(t.phName) + '" value="' + esc(E.name) + '">' +
      '<label class="sl-lbl plain" for="sl-desc" style="margin-top:16px">' + esc(t.fDesc) + '</label><textarea class="sl-fld" id="sl-desc" maxlength="300" placeholder="' + esc(t.phDesc) + '">' + esc(E.description) + '</textarea></div>' +
      '<div class="sl-blk"><div class="sl-rh"><div><h4>' + I.list.replace('<svg', '<svg style="width:16px;height:16px;vertical-align:-2px;margin-right:8px;color:var(--sl-gold)"') + esc(t.entryList) + '</h4><p>' + esc(t.entryS) + '</p></div><button type="button" class="sl-btn sm" data-ed="add">' + I.plus + esc(t.addRule) + '</button></div><div id="sl-rules"></div></div>' +
      '<div class="sl-blk"><div class="sl-rh"><div><h4>' + I.shield.replace('<svg', '<svg style="width:16px;height:16px;vertical-align:-2px;margin-right:8px;color:var(--sl-gold)"') + esc(t.advT) + '</h4><p>' + esc(t.advS) + '</p></div></div>' +
      '<label class="sl-lbl plain" for="sl-inv">' + esc(t.inv) + '</label><textarea class="sl-fld" id="sl-inv" maxlength="600" placeholder="' + esc(t.phInv) + '">' + esc(E.invalidation) + '</textarea>' +
      '<label class="sl-lbl plain" for="sl-sl" style="margin-top:16px">' + esc(t.sl) + '</label><textarea class="sl-fld" id="sl-sl" maxlength="600" placeholder="' + esc(t.phSl) + '">' + esc(E.stopLoss) + '</textarea>' +
      '<label class="sl-lbl plain" for="sl-tp" style="margin-top:16px">' + esc(t.tp) + '</label><textarea class="sl-fld" id="sl-tp" maxlength="600" placeholder="' + esc(t.phTp) + '">' + esc(E.target) + '</textarea>' +
      '<label class="sl-lbl plain" for="sl-exit" style="margin-top:16px">' + esc(t.exit) + '</label><textarea class="sl-fld" id="sl-exit" maxlength="600" placeholder="' + esc(t.phExit) + '">' + esc(E.exit) + '</textarea>' +
      '<div class="sl-num3"><div><label for="sl-rr">' + esc(t.minRR) + '</label><input class="sl-fld" id="sl-rr" inputmode="decimal" maxlength="5" autocomplete="off" placeholder="2" value="' + esc(E.minRR) + '"></div>' +
      '<div><label for="sl-mr">' + esc(t.maxRisk) + '</label><input class="sl-fld" id="sl-mr" inputmode="decimal" maxlength="5" autocomplete="off" placeholder="1" value="' + esc(E.maxRisk) + '"></div>' +
      '<div><label for="sl-tc">' + esc(t.targetComp) + '</label><input class="sl-fld" id="sl-tc" inputmode="numeric" maxlength="3" autocomplete="off" placeholder="80" value="' + esc(E.targetComp) + '"></div></div></div>' +
      '<div class="sl-blk"><div class="sl-rh"><div><h4>' + I.image.replace('<svg', '<svg style="width:16px;height:16px;vertical-align:-2px;margin-right:8px;color:var(--sl-gold)"') + esc(t.dtEx) + '</h4><p>' + esc(t.exSub) + '</p></div></div>' +
      '<div class="sl-exh valid"><h5>' + I.check + esc(t.exValid) + '</h5><button type="button" class="sl-btn sm" data-ed="addex" data-kind="valid">' + I.plus + esc(t.exAdd) + '</button></div><div id="sl-ex-valid"></div>' +
      '<div class="sl-exh invalid"><h5>' + I.ban + esc(t.exInvalid) + '</h5><button type="button" class="sl-btn sm" data-ed="addex" data-kind="invalid">' + I.plus + esc(t.exAdd) + '</button></div><div id="sl-ex-invalid"></div>' +
      '<input type="file" id="sl-file" accept="image/*" multiple hidden></div>' +
      '<div class="sl-foot"><button type="button" class="sl-btn" data-ed="cancel">' + esc(t.cancel) + '</button><button type="button" class="sl-btn gold" data-ed="save" id="sl-save">' + esc(t.save) + '</button></div></div>';
    document.body.appendChild(edEl);
    document.body.style.overflow = 'hidden';
    renderRules(); renderExamples();
    edEl.addEventListener('click', onEdClick); edEl.addEventListener('input', onEdInput); edEl.addEventListener('change', onEdChange);
    document.addEventListener('keydown', onEdKey, true);
    requestAnimationFrame(function () { edEl && edEl.classList.add('on'); var n = $('sl-name'); if (n) n.focus({ preventScroll: true }); });
  }
  function closeEditor(quick) {
    if (!edEl) return; var el = edEl; edEl = null; E = null;
    document.removeEventListener('keydown', onEdKey, true); document.body.style.overflow = '';
    el.classList.remove('on'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, quick ? 0 : 240);
    try { if (!quick && edPrev && edPrev.focus) edPrev.focus({ preventScroll: true }); } catch (e) {}
  }
  function onEdKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); fromJournal = false; closeEditor(); return; }
    if (e.key !== 'Tab' || !edEl) return;
    var f = edEl.querySelectorAll('button:not(:disabled),input,textarea,select'); if (!f.length) return;
    var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  function renderRules(focusIdx) {
    var box = $('sl-rules'); if (!box) return; var t = L();
    if (!E.checklist.length) { box.innerHTML = '<div class="sl-none">' + esc(t.noRules) + '</div>'; return; }
    box.innerHTML = E.checklist.map(function (r, i) {
      return '<div class="sl-rule" data-i="' + i + '"><input class="sl-fld" data-f="text" maxlength="120" autocomplete="off" aria-label="Rule ' + (i + 1) + '" placeholder="' + esc(t.phRule) + '" value="' + esc(r.text) + '">' +
        '<div class="sl-rc"><select class="sl-gsel" data-f="group" aria-label="' + esc(t.grpLbl + ' rule ' + (i + 1)) + '">' + GROUPS.map(function (g) { return '<option value="' + g + '"' + (g === r.group ? ' selected' : '') + '>' + esc(t.grp[g]) + '</option>'; }).join('') + '</select>' +
        '<button type="button" class="sl-chipb" data-ed="req" aria-pressed="' + r.required + '" aria-label="' + esc(t.toggleReq) + '">' + esc(r.required ? t.req : t.opt) + '</button>' +
        '<button type="button" class="sl-ib sm" data-ed="up" aria-label="' + esc(t.moveUp) + '"' + (i === 0 ? ' disabled' : '') + '>' + I.up + '</button>' +
        '<button type="button" class="sl-ib sm" data-ed="dn" aria-label="' + esc(t.moveDn) + '"' + (i === E.checklist.length - 1 ? ' disabled' : '') + '>' + I.down + '</button>' +
        '<button type="button" class="sl-ib sm" data-ed="rm" aria-label="' + esc(t.rmRule) + '">' + I.trash + '</button></div></div>';
    }).join('');
    if (typeof focusIdx === 'number') { var inp = box.querySelector('.sl-rule[data-i="' + focusIdx + '"] input'); if (inp) inp.focus(); }
  }

  /* ---------- Screenshot contoh setup (editor) ---------- */
  function renderExamples() {
    var t = L();
    ['valid', 'invalid'].forEach(function (k) {
      var box = $('sl-ex-' + k); if (!box || !E) return;
      var list = E.examples.filter(function (e) { return e.kind === k; }), busy = (E.busyK && E.busyK[k]) || 0, h = '';
      list.forEach(function (e) {
        h += '<div class="sl-exi" data-ex="' + esc(e.id) + '"><img src="' + esc(e.url) + '" alt="' + esc(e.caption || exLabel(k)) + '"><input class="sl-fld" data-f="cap" maxlength="120" autocomplete="off" aria-label="' + esc(t.exCap) + '" placeholder="' + esc(t.exCap) + '" value="' + esc(e.caption) + '">' +
          '<button type="button" class="sl-ib sm" data-ed="rmex" aria-label="' + esc(t.exRm) + '">' + I.trash + '</button></div>';
      });
      for (var i = 0; i < busy; i++) h += '<div class="sl-exi busy" role="status">' + esc(t.exUp) + '</div>';
      if (!h) h = '<div class="sl-none">' + esc(t.exNone) + '</div>';
      box.innerHTML = h;
    });
  }
  function uploader() { try { return typeof uploadToImgBB === 'function' ? uploadToImgBB : null; } catch (e) { return null; } }
  /* kecilkan screenshot besar sebelum upload (hemat kuota, upload lebih cepat); gagal -> pakai file asli */
  function shrink(file) {
    return new Promise(function (res) {
      try {
        if (file.size < 700000 || !window.URL || !URL.createObjectURL) return res(file);
        var url = URL.createObjectURL(file), im = new Image();
        im.onload = function () {
          try {
            var k = Math.min(1, 1800 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
            c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
            c.toBlob(function (b) { URL.revokeObjectURL(url); res(b && b.size < file.size ? new File([b], 'setup.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.86);
          } catch (e) { URL.revokeObjectURL(url); res(file); }
        };
        im.onerror = function () { URL.revokeObjectURL(url); res(file); };
        im.src = url;
      } catch (e) { res(file); }
    });
  }
  function addFiles(kind, files) {
    var t = L(), up = uploader(); if (!E) return;
    if (!up) return showErr(t.exNoUp);
    var have = E.examples.filter(function (e) { return e.kind === kind; }).length + ((E.busyK && E.busyK[kind]) || 0), room = MAX_EX - have;
    files = Array.prototype.slice.call(files || []);
    if (!files.length) return;
    if (room <= 0) return showErr(t.exMax);
    if (files.length > room) { showErr(t.exMax); files = files.slice(0, room); }
    var cur = E; E.busyK = E.busyK || { valid: 0, invalid: 0 };
    files.forEach(function (f) {
      if (!/^image\//.test(f.type)) return showErr(t.exImg);
      if (f.size > 15 * 1024 * 1024) return showErr(t.exBig);
      cur.pending++; cur.busyK[kind]++; renderExamples();
      shrink(f).then(function (ff) { return up(ff); }).then(function (url) {
        if (E === cur) cur.examples.push({ id: rid(), url: url, kind: kind, caption: '' });
      }).catch(function (err) { if (E === cur) showErr(t.exErr + (err && err.message || '')); }).then(function () {
        cur.pending--; cur.busyK[kind]--; if (E === cur) { renderExamples(); var sb = $('sl-save'); if (sb) sb.disabled = false; }
      });
    });
  }
  function onEdInput(e) {
    var el = e.target;
    if (el.id === 'sl-name') E.name = el.value; else if (el.id === 'sl-desc') E.description = el.value; else if (el.id === 'sl-inv') E.invalidation = el.value; else if (el.id === 'sl-exit') E.exit = el.value;
    else if (el.id === 'sl-sl') E.stopLoss = el.value; else if (el.id === 'sl-tp') E.target = el.value; else if (el.id === 'sl-rr') E.minRR = el.value; else if (el.id === 'sl-mr') E.maxRisk = el.value; else if (el.id === 'sl-tc') E.targetComp = el.value;
    else if (el.getAttribute('data-f') === 'text') { var r = el.closest('.sl-rule'); if (r) E.checklist[+r.getAttribute('data-i')].text = el.value; }
    else if (el.getAttribute('data-f') === 'cap') { var xr = el.closest('.sl-exi'), id = xr && xr.getAttribute('data-ex'); E.examples.forEach(function (x) { if (x.id === id) x.caption = el.value; }); }
    var er = $('sl-err'); if (er && !er.hidden) er.hidden = true;
  }
  function onEdChange(e) {
    var el = e.target; if (!E) return;
    if (el.id === 'sl-file') { var k = el.getAttribute('data-kind') || 'valid', fl = el.files; addFiles(k, fl); el.value = ''; return; }
    if (el.getAttribute('data-f') === 'group') { var r = el.closest('.sl-rule'); if (r) E.checklist[+r.getAttribute('data-i')].group = grpOf(el.value); }
  }
  function onEdClick(e) {
    var b = e.target.closest('[data-ed]');
    if (!b) { if (e.target === edEl) { fromJournal = false; closeEditor(); } return; }
    var a = b.getAttribute('data-ed'), row = b.closest('.sl-rule'), i = row ? +row.getAttribute('data-i') : -1, t = L();
    if (a === 'cancel') { fromJournal = false; return closeEditor(); }
    if (a === 'save') return saveEditor();
    if (a === 'addex') { var fi = $('sl-file'); if (!fi) return; if (!uploader()) return showErr(t.exNoUp); fi.setAttribute('data-kind', b.getAttribute('data-kind')); fi.click(); return; }
    if (a === 'rmex') { var xr = b.closest('.sl-exi'), xid = xr && xr.getAttribute('data-ex'); E.examples = E.examples.filter(function (x) { return x.id !== xid; }); return renderExamples(); }
    if (a === 'add') { if (E.checklist.length >= MAX_RULES) return showErr(t.maxRules); E.checklist.push({ id: rid(), text: '', required: true, group: 'entry' }); return renderRules(E.checklist.length - 1); }
    if (i < 0) return;
    if (a === 'req') { E.checklist[i].required = !E.checklist[i].required; b.setAttribute('aria-pressed', String(E.checklist[i].required)); b.textContent = E.checklist[i].required ? t.req : t.opt; return; }
    if (a === 'rm') { E.checklist.splice(i, 1); return renderRules(); }
    if (a === 'up' && i > 0) { var x = E.checklist.splice(i, 1)[0]; E.checklist.splice(i - 1, 0, x); renderRules(); var u = edEl.querySelector('.sl-rule[data-i="' + (i - 1) + '"] [data-ed="up"]:not(:disabled)') || edEl.querySelector('.sl-rule[data-i="' + (i - 1) + '"] input'); if (u) u.focus(); return; }
    if (a === 'dn' && i < E.checklist.length - 1) { var y = E.checklist.splice(i, 1)[0]; E.checklist.splice(i + 1, 0, y); renderRules(); var d = edEl.querySelector('.sl-rule[data-i="' + (i + 1) + '"] [data-ed="dn"]:not(:disabled)') || edEl.querySelector('.sl-rule[data-i="' + (i + 1) + '"] input'); if (d) d.focus(); return; }
  }
  function showErr(m) { var er = $('sl-err'); if (!er) return; er.textContent = m; er.hidden = false; try { er.scrollIntoView({ block: 'nearest' }); } catch (e) {} }

  function saveEditor() {
    if (!E) return; var t = L(), btn = $('sl-save');
    var name = E.name.trim().replace(/\s+/g, ' ');
    if (name.length < 2) { showErr(t.errName); var n = $('sl-name'); if (n) n.focus(); return; }
    var dup = S.list.some(function (s) { return s.id !== E.id && s.name.toLowerCase() === name.toLowerCase(); });
    if (dup) { showErr(t.errDup); return; }
    if (!S.uid || !DB()) { showErr(t.errLogin); return; }
    if (E.pending > 0) { showErr(t.exBusy); return; }
    var payload = { name: name, description: E.description.trim(), checklist: E.checklist.filter(function (r) { return r.text.trim(); }).map(function (r) { return { id: r.id, text: r.text.trim(), required: !!r.required, group: grpOf(r.group) }; }),
      invalidation: E.invalidation.trim(), exit: E.exit.trim(), stopLoss: E.stopLoss.trim(), target: E.target.trim(),
      minRR: posNum(E.minRR, 100), maxRisk: posNum(E.maxRisk, 100), targetComp: Math.round(posNum(E.targetComp, 100) || 80),
      examples: E.examples.filter(function (x) { return /^https:\/\//i.test(x.url); }).map(function (x) { return { id: x.id, url: x.url, kind: x.kind === 'invalid' ? 'invalid' : 'valid', caption: String(x.caption || '').trim().slice(0, 120) }; }), updatedAt: stamp() };
    var p;
    if (E.id) p = col().doc(E.id).set(payload, { merge: true });
    else { payload.archived = false; payload.createdAt = stamp(); p = col().add(payload); }
    btn.disabled = true; btn.textContent = t.saving;
    var editId = E.id, fj = fromJournal;
    withTimeout(p, 6000).then(function (r) {
      if (r === 'timeout') toast(t.offline); else toast(t.okSaved);
      var newId = editId || (r && r !== 'timeout' && r.id) || null;
      if (newId && !byId(newId)) { S.list.push(normalize(newId, payload)); }
      closeEditor(); fromJournal = false;
      if (fj && newId && $('sl-jf')) {
        var st = byId(newId);
        if (st) { J.sid = newId; J.items = st.checklist.map(mkItem); syncTag(st.name); renderJournalBlock(); }
      }
    }).catch(function (err) { btn.disabled = false; btn.textContent = t.save; showErr(t.errSave + (err && err.message || '')); });
  }

  /* ==========================================================
     BLOK DI FORM JOURNAL
     ========================================================== */
  var J = { sid: '', items: [], log: [], autoTag: null };
  function mkItem(r) { return { id: r.id, text: r.text, required: !!r.required, checked: false, group: grpOf(r.group) }; }

  function tagsInput() { return $('input-tags'); }
  function splitTags(v) { return String(v || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
  function syncTag(name) {
    var inp = tagsInput(); if (!inp) return;
    var tags = splitTags(inp.value);
    if (J.autoTag) { tags = tags.filter(function (x) { return x.toLowerCase() !== J.autoTag.toLowerCase(); }); J.autoTag = null; }
    if (name && !tags.some(function (x) { return x.toLowerCase() === name.toLowerCase(); })) { tags.push(name); J.autoTag = name; }
    inp.value = tags.join(', ');
  }

  function injectBlock() {
    if ($('sl-jf')) return true;
    var inp = tagsInput(); var anchor = inp && inp.parentElement; if (!anchor) return false;
    var w = document.createElement('div'); w.id = 'sl-jf'; w.className = 'sl sl-jf';
    anchor.parentNode.insertBefore(w, anchor.nextSibling);
    w.addEventListener('change', onJChange); w.addEventListener('click', onJClick);
    var form = $('journal-form'); if (form) form.addEventListener('reset', function () { setTimeout(resetState, 0); });
    renderJournalBlock(); return true;
  }

  function options(selected) {
    var t = L(), h = '<option value="">' + esc(t.jNone) + '</option>', found = false;
    sorted(S.list.filter(function (s) { return !s.archived || s.id === selected; })).forEach(function (s) {
      if (s.id === selected) found = true;
      h += '<option value="' + esc(s.id) + '"' + (s.id === selected ? ' selected' : '') + '>' + esc(s.name) + (s.archived ? ' ' + esc(t.jArchTag) : '') + '</option>';
    });
    if (selected && !found) { var last = J.log[J.log.length - 1]; h += '<option value="' + esc(selected) + '" selected>' + esc((last && last.name) || selected) + ' ' + esc(t.jGone) + '</option>'; }
    return h;
  }
  function counts() { var c = 0, rm = 0; J.items.forEach(function (it) { if (it.checked) c++; else if (it.required) rm++; }); return { c: c, t: J.items.length, rm: rm }; }

  function renderJournalBlock() {
    var w = $('sl-jf'); if (!w) return; var t = L();
    var activeCount = S.list.filter(function (s) { return !s.archived; }).length;
    var h = '<label class="sl-jl" for="sl-j-sel">' + I.book + esc(t.jUsed) + '</label>' +
      '<div class="sl-selw"><select id="sl-j-sel" class="sl-sel">' + options(J.sid) + '</select>' + I.down + '</div>';
    if (S.loaded && !activeCount && !J.sid) h += '<p class="sl-hint">' + esc(t.jEmpty) + ' <button type="button" data-j="manage">' + esc(t.jCreate) + '</button></p>';
    else h += '<p class="sl-hint">' + esc(t.jHint) + ' <button type="button" data-j="manage">' + esc(t.jManage) + '</button></p>';
    h += '<div class="sl-comp" id="sl-j-comp"' + (J.sid ? '' : ' hidden') + '></div>';
    w.innerHTML = h; renderComp();
  }

  function renderComp() {
    var box = $('sl-j-comp'); if (!box) return; var t = L();
    if (!J.sid) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    var st = byId(J.sid), c = counts();
    var h = '<div class="sl-ch2">' + I.checkbox + '<b>' + esc(t.jComp) + '</b><span class="sl-cnt" id="sl-j-cnt"></span></div>';
    if (!J.items.length) h += '<p class="sl-txt" style="margin-bottom:8px">' + esc(t.jNoRules) + '</p>';
    else {
      var idx = J.items.map(function (it, i) { return { it: it, i: i }; }), gs = GROUPS.map(function (g) { return { g: g, rows: idx.filter(function (x) { return grpOf(x.it.group) === g; }) }; }).filter(function (x) { return x.rows.length; });
      h += '<div id="sl-j-items">' + gs.map(function (x) {
        return (gs.length > 1 ? '<div class="sl-gh">' + esc(t.grp[x.g]) + '</div>' : '') + x.rows.map(function (r) {
          var it = r.it;
          return '<label class="sl-item' + (it.checked ? ' on' : '') + '" data-i="' + r.i + '"><input type="checkbox" data-j="chk"' + (it.checked ? ' checked' : '') + '><span class="sl-box">' + I.check + '</span><span class="sl-it"><b>' + esc(it.text) + '</b><i class="' + (it.required ? '' : 'o') + '">' + esc(it.required ? t.req : t.opt) + '</i></span></label>';
        }).join('');
      }).join('') + '</div>';
      h += '<p class="sl-warn" id="sl-j-warn" role="status" hidden></p>';
      h += '<div class="sl-tools"><button type="button" class="sl-btn sm" data-j="all">' + esc(t.jAll) + '</button><button type="button" class="sl-btn sm" data-j="none">' + esc(t.jNoneAll) + '</button></div>';
    }
    if (st && (st.invalidation || st.exit || st.stopLoss || st.target || st.examples.length || st.minRR || st.maxRisk)) {
      h += '<details class="sl-rem"><summary>' + esc(t.jRem) + '</summary>' + ((st.minRR || st.maxRisk) ? chipsHTML(st, true) : '') +
        (st.invalidation ? '<div class="sl-dh">' + esc(t.inv) + '</div><p class="sl-txt">' + esc(st.invalidation) + '</p>' : '') +
        (st.stopLoss ? '<div class="sl-dh">' + esc(t.sl) + '</div><p class="sl-txt">' + esc(st.stopLoss) + '</p>' : '') +
        (st.target ? '<div class="sl-dh">' + esc(t.tp) + '</div><p class="sl-txt">' + esc(st.target) + '</p>' : '') +
        (st.exit ? '<div class="sl-dh">' + esc(t.exit) + '</div><p class="sl-txt">' + esc(st.exit) + '</p>' : '') +
        (st.examples.length ? '<div class="sl-dh">' + esc(t.exHintIn) + '</div><div class="sl-exg">' + st.examples.map(function (e) { return thumbHTML(e, 'j'); }).join('') + '</div>' : '') + '</details>';
    }
    box.innerHTML = h; updateCount();
  }
  function updateCount() {
    var cnt = $('sl-j-cnt'), warn = $('sl-j-warn'); if (!cnt) return; var t = L(), c = counts();
    cnt.textContent = c.c + '/' + c.t + ' ' + t.jChecked; cnt.classList.toggle('ok', c.t > 0 && c.c === c.t);
    if (warn) { if (c.rm > 0 && c.c > 0) { warn.hidden = false; warn.textContent = c.rm + ' ' + t.jWarn; } else warn.hidden = true; }
  }

  function onJChange(e) {
    var el = e.target;
    if (el.id === 'sl-j-sel') {
      var id = el.value, st = id ? byId(id) : null;
      J.sid = id; J.items = st ? st.checklist.map(mkItem) : [];
      syncTag(st ? st.name : null); renderComp(); return;
    }
    if (el.getAttribute('data-j') === 'chk') {
      var lab = el.closest('.sl-item'), i = +lab.getAttribute('data-i'); J.items[i].checked = el.checked; lab.classList.toggle('on', el.checked); updateCount();
    }
  }
  function onJClick(e) {
    var b = e.target.closest('[data-j]'); if (!b) return; var a = b.getAttribute('data-j');
    if (a === 'all' || a === 'none') { J.items.forEach(function (it) { it.checked = a === 'all'; }); renderComp(); return; }
    if (a === 'zoom') return openLightbox(findEx(byId(J.sid), b.getAttribute('data-ex')));
    if (a === 'manage') { fromJournal = true; openEditor(null); }
  }
  function syncJournalBlock() {
    if (!$('sl-jf')) return;
    var a = document.activeElement; if (a && a.id === 'sl-j-sel') return;
    renderJournalBlock();
  }
  function resetState() { J = { sid: '', items: [], log: [], autoTag: null }; renderJournalBlock(); }

  /* ---------- API untuk index.html ---------- */
  function buildEntry() {
    if (!J.sid) return null; var st = byId(J.sid), c = counts(), last = J.log[J.log.length - 1];
    return { id: J.sid, name: st ? st.name : ((last && last.id === J.sid && last.name) || ''), checked: c.c, total: c.t, reqMissed: c.rm,
      items: J.items.map(function (it) { return { id: it.id, text: it.text, required: !!it.required, checked: !!it.checked, group: grpOf(it.group) }; }) };
  }
  /* Dipanggil saat Simpan Journal. editing=true: ganti entri terakhir (bukan menambah). */
  function collect(editing) {
    var log = editing ? J.log.slice() : [], entry = buildEntry();
    if (entry) { if (editing && log.length) log[log.length - 1] = entry; else log.push(entry); }
    else if (editing && log.length <= 1) log = [];
    var last = log[log.length - 1] || null;
    return { strategyId: last ? last.id : null, strategyName: last ? (last.name || '') : null, strategyLog: log };
  }
  /* Dipanggil saat Edit Journal membuka form. */
  function fill(j) {
    var log = entriesOf(j).map(function (e) { return e; }); var last = log[log.length - 1];
    J = { sid: last ? last.id : '', items: last && Array.isArray(last.items) ? last.items.map(function (it) { return { id: it.id, text: it.text, required: !!it.required, checked: !!it.checked, group: grpOf(it.group) }; }) : [], log: log, autoTag: null };
    if (last && !J.items.length) { var st = byId(last.id); if (st) J.items = st.checklist.map(mkItem); }
    renderJournalBlock();
  }
  function chipHTML(j) {
    var ent = entriesOf(j); if (!ent.length) return '';
    var e = ent[ent.length - 1], cls = '', txt = esc(e.name || '—');
    if (e.total) { txt += ' · ' + e.checked + '/' + e.total; cls = e.checked === e.total ? ' ok' : (e.reqMissed > 0 ? ' bad' : ''); }
    return '<div class="jr-chips sl"><span class="jr-tag sl-jchip' + cls + '" title="Strategy">' + I.book + txt + '</span></div>';
  }
  function has(j) { return entriesOf(j).length > 0; }

  /* ==========================================================
     Init
     ========================================================== */
  function init() {
    var r = root(); if (r) { r.addEventListener('click', onSectionClick); r.addEventListener('input', function (e) { if (e.target.id === 'sl-q') { S.q = e.target.value; renderBody(); } }); }
    injectBlock();
    var a = AUTH(); if (a) a.onAuthStateChanged(subscribe);
    window.addEventListener('viewchange', function (ev) { if (ev && ev.detail && ev.detail.view === 'strategy') renderShell(); });
    window.addEventListener('journals-loaded', function () { if (visible()) renderBody(); });
    var sel = $('app-language'); if (sel) sel.addEventListener('change', function () { setTimeout(function () { if (visible()) renderShell(); renderJournalBlock(); }, 120); });
    /* form journal dibuat/di-render ulang lebih lambat? coba lagi sebentar */
    if (!$('sl-jf')) { var n = 0, iv = setInterval(function () { if (injectBlock() || ++n > 20) clearInterval(iv); }, 300); }
  }
  window.StrategyLib = { list: function () { return S.list.map(function (x) { return { id: x.id, name: x.name, targetComp: x.targetComp }; }); }, collect: collect, fill: fill, reset: resetState, chipHTML: chipHTML, has: has, entriesOf: entriesOf, open: function () { var n = $('nav-strategy'); if (n) n.click(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
