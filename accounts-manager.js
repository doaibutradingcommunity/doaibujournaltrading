/* ==========================================================================
   Doa Ibu Journal — Accounts Manager v17.03 (Tahap 1)
   Halaman Akun Terpisah, Skema Akun Firestore, Migrasi Aman Data Lama,
   Penggantian Pemilih Akun Dashboard & Manajemen Portofolio Multi-Akun.
   ========================================================================== */

(function () {
  'use strict';
  if (window.AccountsManager) return;

  var D = document, W = window;
  var ACCOUNTS_KEY_PREFIX = 'doaIbuAccounts:';
  var ACTIVE_ACCT_KEY_PREFIX = 'doaIbuActiveAcctId:';
  var MIGRATION_BACKUP_KEY_PREFIX = 'doaIbu_backup_pre_migration:';

  var DEFAULT_MAIN_ACCOUNT = {
    id: 'acc_default_main',
    name: 'Akun Utama',
    type: 'manual', // 'manual' | 'mt4' | 'mt5' | 'tradingview'
    status: 'connected', // 'connected' | 'disconnected'
    isActive: true,
    isDefault: true,
    syncToken: 'sync_tok_main_' + Math.random().toString(36).slice(2, 10),
    lastSyncedAt: new Date().toISOString(),
    tradeCount: 0,
    createdAt: new Date().toISOString()
  };

  var accounts = [];
  var activeAccountId = 'acc_default_main';
  var hasMigrated = false;

  function getUid() {
    try {
      return (typeof currentUser !== 'undefined' && currentUser && currentUser.uid) ? currentUser.uid : 'local_guest';
    } catch (e) {
      return 'local_guest';
    }
  }

  function getDb() {
    try {
      return typeof db !== 'undefined' && db ? db : null;
    } catch (e) {
      return null;
    }
  }

  function getJournals() {
    try {
      return (typeof allJournals !== 'undefined' && Array.isArray(allJournals)) ? allJournals : [];
    } catch (e) {
      return [];
    }
  }

  /* --------------------------------------------------------------------------
     1. Storage & Firestore Sync
     -------------------------------------------------------------------------- */
  function loadLocalAccounts() {
    var uid = getUid();
    try {
      var raw = localStorage.getItem(ACCOUNTS_KEY_PREFIX + uid);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          accounts = parsed;
        }
      }
    } catch (e) {}

    if (!accounts.length) {
      accounts = [Object.assign({}, DEFAULT_MAIN_ACCOUNT)];
    }

    try {
      var actId = localStorage.getItem(ACTIVE_ACCT_KEY_PREFIX + uid);
      if (actId && accounts.some(function (a) { return a.id === actId; })) {
        activeAccountId = actId;
      } else {
        activeAccountId = accounts[0].id;
      }
    } catch (e) {
      activeAccountId = accounts[0].id;
    }
  }

  function saveLocalAccounts() {
    var uid = getUid();
    try {
      localStorage.setItem(ACCOUNTS_KEY_PREFIX + uid, JSON.stringify(accounts));
      localStorage.setItem(ACTIVE_ACCT_KEY_PREFIX + uid, activeAccountId);
    } catch (e) {}
  }

  function syncAccountsToFirestore() {
    var firestore = getDb(), uid = getUid();
    if (!firestore || uid === 'local_guest') return;

    try {
      accounts.forEach(function (acc) {
        firestore.collection('users').doc(uid).collection('accounts').doc(acc.id).set(acc, { merge: true })
          .catch(function (err) { console.warn('Firestore account sync error:', err); });
      });
      firestore.collection('users').doc(uid).set({ activeAccountId: activeAccountId }, { merge: true })
        .catch(function () {});
    } catch (e) {}
  }

  function pullAccountsFromFirestore() {
    var firestore = getDb(), uid = getUid();
    if (!firestore || uid === 'local_guest') return;

    try {
      firestore.collection('users').doc(uid).collection('accounts').get().then(function (snapshot) {
        if (!snapshot.empty) {
          var pulled = [];
          snapshot.forEach(function (doc) {
            pulled.push(doc.data());
          });
          if (pulled.length) {
            accounts = pulled;
            saveLocalAccounts();
            renderAccountsView();
            updateTopPill();
          }
        } else {
          // If Firestore is empty, save the local default account
          syncAccountsToFirestore();
        }
      }).catch(function (err) {
        console.warn('Pull accounts warning:', err);
      });
    } catch (e) {}
  }

  /* --------------------------------------------------------------------------
     2. Safe Data Migration & Backup
     -------------------------------------------------------------------------- */
  function migrateLegacyTrades() {
    var jList = getJournals();
    if (!jList.length) return;

    var uid = getUid();
    var unlinked = jList.filter(function (j) { return !j.accountId || !j.source; });

    if (!unlinked.length) {
      hasMigrated = true;
      return;
    }

    // 1. Create safety snapshot in LocalStorage before any changes
    try {
      var existingBackup = localStorage.getItem(MIGRATION_BACKUP_KEY_PREFIX + uid);
      if (!existingBackup) {
        var snapshot = jList.map(function (j) {
          return { id: j.id, date: j.date, pl: j.pl, pair: j.pair, accountType: j.accountType, accountId: j.accountId, source: j.source };
        });
        localStorage.setItem(MIGRATION_BACKUP_KEY_PREFIX + uid, JSON.stringify({
          at: new Date().toISOString(),
          count: snapshot.length,
          data: snapshot
        }));
      }
    } catch (e) {}

    // 2. Link legacy trades to default 'Akun Utama'
    var firestore = getDb();
    var batch = firestore ? firestore.batch() : null;
    var batchCount = 0;

    unlinked.forEach(function (j) {
      j.accountId = 'acc_default_main';
      j.source = 'manual';

      if (batch && firestore && uid !== 'local_guest' && j.id && batchCount < 450) {
        var ref = firestore.collection('users').doc(uid).collection('journals').doc(j.id);
        batch.update(ref, { accountId: 'acc_default_main', source: 'manual' });
        batchCount++;
      }
    });

    if (batch && batchCount > 0) {
      batch.commit().catch(function (err) { console.warn('Migration batch error:', err); });
    }

    // Update main account trade count
    var mainAcc = accounts.find(function (a) { return a.id === 'acc_default_main'; });
    if (mainAcc) {
      mainAcc.tradeCount = jList.filter(function (j) { return j.accountId === 'acc_default_main'; }).length;
      saveLocalAccounts();
    }

    hasMigrated = true;
  }

  function rollbackMigration() {
    var uid = getUid();
    try {
      var raw = localStorage.getItem(MIGRATION_BACKUP_KEY_PREFIX + uid);
      if (!raw) {
        if (W.StatusCapsule) W.StatusCapsule.warn('rollback', { label: 'Tidak ada cadangan pra-migrasi', ttl: 2500 });
        return false;
      }
      var backup = JSON.parse(raw);
      if (!backup || !Array.isArray(backup.data)) return false;

      var jList = getJournals();
      var count = 0;
      backup.data.forEach(function (snap) {
        var target = jList.find(function (j) { return j.id === snap.id; });
        if (target) {
          if (snap.accountId !== undefined) target.accountId = snap.accountId;
          else delete target.accountId;
          if (snap.source !== undefined) target.source = snap.source;
          else delete target.source;
          count++;
        }
      });

      if (W.StatusCapsule) {
        W.StatusCapsule.ok('rollback', { label: 'Cadangan dipulihkan (' + count + ' trade)', ttl: 3000 });
      }
      renderAccountsView();
      if (typeof renderDash === 'function') renderDash();
      return true;
    } catch (e) {
      console.error('Rollback error:', e);
      return false;
    }
  }

  /* --------------------------------------------------------------------------
     3. Account Management CRUD
     -------------------------------------------------------------------------- */
  function getAccounts() {
    return accounts.slice();
  }

  function getActiveAccount() {
    var acc = accounts.find(function (a) { return a.id === activeAccountId; });
    if (!acc && accounts.length) {
      acc = accounts[0];
      activeAccountId = acc.id;
    }
    return acc || DEFAULT_MAIN_ACCOUNT;
  }

  function setActiveAccount(accId) {
    var target = accounts.find(function (a) { return a.id === accId; });
    if (!target) return;

    activeAccountId = target.id;
    accounts.forEach(function (a) { a.isActive = (a.id === activeAccountId); });
    saveLocalAccounts();
    syncAccountsToFirestore();

    if (W.IosHaptics) W.IosHaptics.selection();
    if (W.StatusCapsule) {
      W.StatusCapsule.ok('acct-switch', { label: 'Akun aktif: ' + target.name, ttl: 2000 });
    }

    renderAccountsView();
    updateTopPill();

    // Notify other components & re-render dashboard
    W.dispatchEvent(new CustomEvent('account-changed', { detail: { account: target } }));
    if (typeof renderDash === 'function') {
      try { renderDash(); } catch (e) {}
    }
    if (W.PersonalTradingInsight && typeof W.PersonalTradingInsight.render === 'function') {
      try { W.PersonalTradingInsight.render(); } catch (e) {}
    }
  }

  function createAccount(params) {
    var name = (params.name || '').trim();
    if (!name) return false;
    var type = params.type || 'manual';

    var newId = 'acc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    var newAcc = {
      id: newId,
      name: name,
      type: type,
      status: 'connected',
      isActive: false,
      isDefault: false,
      syncToken: 'sync_tok_' + Math.random().toString(36).slice(2, 12),
      lastSyncedAt: new Date().toISOString(),
      tradeCount: 0,
      createdAt: new Date().toISOString()
    };

    accounts.push(newAcc);
    saveLocalAccounts();
    syncAccountsToFirestore();

    if (W.IosHaptics) W.IosHaptics.success();
    if (W.StatusCapsule) {
      W.StatusCapsule.ok('acct-create', { label: 'Akun ' + name + ' berhasil dibuat', ttl: 2400 });
    }

    renderAccountsView();
    return newAcc;
  }

  function renameAccount(accId, newName) {
    var target = accounts.find(function (a) { return a.id === accId; });
    if (!target || !newName.trim()) return false;

    target.name = newName.trim();
    saveLocalAccounts();
    syncAccountsToFirestore();

    if (W.IosHaptics) W.IosHaptics.light();
    renderAccountsView();
    updateTopPill();
    return true;
  }

  function toggleAccountStatus(accId) {
    var target = accounts.find(function (a) { return a.id === accId; });
    if (!target) return;

    target.status = target.status === 'connected' ? 'disconnected' : 'connected';
    saveLocalAccounts();
    syncAccountsToFirestore();

    if (W.IosHaptics) W.IosHaptics.medium();
    renderAccountsView();
  }

  function updateAccountLastSynced(accId, isoTime) {
    var target = accounts.find(function (a) { return a.id === accId; });
    if (!target) return;
    target.lastSyncedAt = isoTime || new Date().toISOString();
    saveLocalAccounts();
    syncAccountsToFirestore();
    renderAccountsView();
  }

  function regenerateSyncToken(accId) {
    var target = accounts.find(function (a) { return a.id === accId; });
    if (!target) return;
    target.syncToken = 'sync_tok_' + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8);
    saveLocalAccounts();
    syncAccountsToFirestore();
    renderAccountsView();
    if (W.IosHaptics) W.IosHaptics.success();
    if (W.StatusCapsule) {
      W.StatusCapsule.ok('acct-regen', { label: 'Token Sync baru berhasil digenerate!', ttl: 2500 });
    }
  }

  function deleteAccount(accId) {
    var idx = accounts.findIndex(function (a) { return a.id === accId; });
    if (idx === -1) return false;

    var target = accounts[idx];
    if (target.isDefault) {
      if (W.StatusCapsule) W.StatusCapsule.warn('acct-del', { label: 'Akun Utama bawaan tidak dapat dihapus', ttl: 2500 });
      return false;
    }

    accounts.splice(idx, 1);
    if (activeAccountId === accId) {
      activeAccountId = accounts[0].id;
    }

    saveLocalAccounts();
    var firestore = getDb(), uid = getUid();
    if (firestore && uid !== 'local_guest') {
      firestore.collection('users').doc(uid).collection('accounts').doc(accId).delete().catch(function () {});
    }

    if (W.IosHaptics) W.IosHaptics.warning();
    if (W.StatusCapsule) {
      W.StatusCapsule.ok('acct-del', { label: 'Akun ' + target.name + ' dihapus', ttl: 2200 });
    }

    renderAccountsView();
    updateTopPill();
    if (typeof renderDash === 'function') renderDash();
    return true;
  }

  /* --------------------------------------------------------------------------
     4. UI Rendering: Halaman Akun (#accounts-section)
     -------------------------------------------------------------------------- */
  function formatDate(iso) {
    if (!iso) return 'Belum pernah';
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return iso;
    }
  }

  function formatRelativeTime(iso) {
    if (!iso) return 'Belum pernah';
    try {
      var d = new Date(iso);
      var now = new Date();
      var diffMs = now - d;
      if (diffMs < 0) return 'Baru saja';
      var diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Baru saja';
      var diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return diffMin + ' menit lalu';
      var diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return diffHour + ' jam lalu';
      var diffDay = Math.floor(diffHour / 24);
      if (diffDay === 1) return 'Kemarin';
      if (diffDay < 7) return diffDay + ' hari lalu';
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch (e) {
      return iso;
    }
  }

  function getTypeLabel(type) {
    var map = {
      mt4: 'MetaTrader 4',
      mt5: 'MetaTrader 5',
      tradingview: 'TradingView Paper',
      manual: 'Manual'
    };
    return map[type] || type.toUpperCase();
  }

  function renderAccountsView() {
    var section = D.getElementById('accounts-section');
    if (!section) return;

    var jList = getJournals();
    // Update live trade counts
    accounts.forEach(function (acc) {
      acc.tradeCount = jList.filter(function (j) {
        return j.accountId === acc.id || (!j.accountId && acc.isDefault);
      }).length;
    });

    var activeAcc = getActiveAccount();
    var uid = getUid();
    var hasBackup = !!localStorage.getItem(MIGRATION_BACKUP_KEY_PREFIX + uid);
    var refCount = (W.TradingViewImport && typeof W.TradingViewImport.countNeedsReflection === 'function') ?
      W.TradingViewImport.countNeedsReflection() : 0;

    var html =
      '<div class="acct-header">' +
        '<div class="acct-eyebrow"><span>🪙</span> SINKRONISASI &amp; MANAJEMEN PORTOFOLIO</div>' +
        '<h1 class="acct-title">Akun Trading</h1>' +
        '<p class="acct-subtitle">Pusat kendali akun multi-broker, sinkronisasi otomatis MT4/MT5, TradingView, dan jurnal manual. Akun yang aktif di sini menentukan data yang tampil di dashboard.</p>' +
      '</div>';

    // 1. Hero Card: Akun Aktif Saat Ini
    html +=
      '<div class="acct-hero-card">' +
        '<div class="acct-hero-badge">★ AKUN AKTIF SAAT INI</div>' +
        '<div class="acct-hero-main">' +
          '<div>' +
            '<h2 class="acct-hero-name">' + activeAcc.name + '</h2>' +
            '<div class="acct-hero-meta">' +
              '<span class="acct-type-pill">' + getTypeLabel(activeAcc.type) + '</span>' +
              '<span class="inline-flex items-center gap-1.5">' +
                '<i class="acct-status-dot ' + (activeAcc.status === 'connected' ? '' : 'disconnected') + '"></i> ' +
                (activeAcc.status === 'connected' ? 'Terhubung' : 'Terputus') +
              '</span>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="btn-add-acct" id="btn-open-add-acct-modal">' +
            '<span>＋</span> Tambah Akun Baru' +
          '</button>' +
        '</div>' +
        '<div class="acct-hero-stats">' +
          '<div class="acct-stat-box">' +
            '<span class="acct-stat-label">Total Trade Tersinkron</span>' +
            '<span class="acct-stat-val tnum">' + activeAcc.tradeCount + ' Trade</span>' +
          '</div>' +
          '<div class="acct-stat-box">' +
            '<span class="acct-stat-label">Sinkronisasi Terakhir</span>' +
            '<span class="acct-stat-val tnum" title="' + formatDate(activeAcc.lastSyncedAt) + '">' +
              formatRelativeTime(activeAcc.lastSyncedAt) +
              (activeAcc.lastSyncedAt ? ' <span class="text-xs text-gray-500 font-normal">(' + formatDate(activeAcc.lastSyncedAt).split(',')[0] + ')</span>' : '') +
            '</span>' +
          '</div>' +
        '</div>' +
      '</div>';

    // 1b. Badge / Card Refleksi Tertunda jika ada trade hasil import yang belum dievaluasi
    if (refCount > 0) {
      html +=
        '<div class="tv-reflection-box mb-4">' +
          '<span class="tv-reflection-box-icon">💡</span>' +
          '<div class="tv-reflection-box-content">' +
            '<div class="tv-reflection-box-title">Refleksi Psikologi Tertunda</div>' +
            '<div class="tv-reflection-box-sub">' +
              'Terdapat <b class="tv-reflection-count inline">' + refCount + ' trade</b> yang belum dilengkapi catatan refleksi psikologi &amp; emosi.' +
            '</div>' +
            '<button type="button" class="btn-token-act primary mt-2 text-xs font-semibold inline-flex items-center gap-1.5" data-acct-act="review-reflections">' +
              '🔍 Tinjau &amp; Lengkapi Catatan Psikologi (' + refCount + ' trade) ›' +
            '</button>' +
          '</div>' +
        '</div>';
    }

    // 2. Toolbar & List Cards
    html +=
      '<div class="acct-toolbar">' +
        '<span class="acct-count-badge">Daftar Akun (' + accounts.length + ')</span>' +
      '</div>' +
      '<div class="acct-grid">';

    accounts.forEach(function (acc) {
      var isCurrent = (acc.id === activeAccountId);
      html +=
        '<div class="acct-card ' + (isCurrent ? 'is-active' : '') + '">' +
          '<div class="acct-card-head">' +
            '<div class="acct-card-title-wrap">' +
              '<div class="acct-card-name">' +
                '<span>' + acc.name + '</span>' +
                (isCurrent ? '<span class="acct-active-tag">Aktif</span>' : '') +
              '</div>' +
              '<div class="flex items-center gap-2">' +
                '<span class="acct-type-pill">' + getTypeLabel(acc.type) + '</span>' +
                '<span class="text-xs text-gray-400 inline-flex items-center gap-1">' +
                  '<i class="acct-status-dot ' + (acc.status === 'connected' ? '' : 'disconnected') + '"></i> ' +
                  (acc.status === 'connected' ? 'Aktif' : 'Nonaktif') +
                '</span>' +
              '</div>' +
            '</div>' +
            '<div class="acct-card-menu-btns">' +
              '<button type="button" class="btn-acct-icon" data-acct-act="rename" data-id="' + acc.id + '" title="Ganti Nama">' +
                '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
              '</button>' +
              (!acc.isDefault ?
                '<button type="button" class="btn-acct-icon danger" data-acct-act="delete" data-id="' + acc.id + '" title="Hapus Akun">' +
                  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
                '</button>' : '') +
            '</div>' +
          '</div>' +
          '<div class="acct-card-details">' +
            '<div><b>' + acc.tradeCount + '</b> trade</div>' +
            '<div title="' + formatDate(acc.lastSyncedAt) + '">Sync: <span class="text-gray-300 font-medium">' + formatRelativeTime(acc.lastSyncedAt) + '</span></div>' +
          '</div>';

      if (acc.type === 'mt4' || acc.type === 'mt5') {
        var tok = acc.syncToken || ('sync_tok_' + Math.random().toString(36).slice(2, 12));
        if (!acc.syncToken) { acc.syncToken = tok; saveLocalAccounts(); }
        var maskedTok = tok.slice(0, 9) + '••••••••••••';
        html +=
          '<div class="acct-token-section">' +
            '<div class="acct-token-head">' +
              '<span>Token Sync ' + acc.type.toUpperCase() + '</span>' +
              '<button type="button" class="text-xs text-gold-400 hover:text-gold-300 font-medium" data-acct-act="guide-ea" data-type="' + acc.type + '">' +
                '📖 Panduan Setup EA ›' +
              '</button>' +
            '</div>' +
            '<div class="acct-token-row">' +
              '<div class="acct-token-code is-masked" id="tok-disp-' + acc.id + '" data-token="' + tok + '">' +
                maskedTok +
              '</div>' +
              '<button type="button" class="btn-token-act" data-acct-act="toggle-token" data-id="' + acc.id + '" title="Lihat/Sembunyikan">' +
                '👁️' +
              '</button>' +
              '<button type="button" class="btn-token-act primary" data-acct-act="copy-token" data-token="' + tok + '" title="Salin Token">' +
                '📋 Salin' +
              '</button>' +
            '</div>' +
            '<div class="acct-token-footer-btns">' +
              '<button type="button" class="btn-token-act" data-acct-act="download-ea" data-type="' + acc.type + '">' +
                '📥 Unduh EA ' + acc.type.toUpperCase() +
              '</button>' +
              '<button type="button" class="btn-token-act" data-acct-act="regen-token" data-id="' + acc.id + '">' +
                '🔄 Buat Token Baru' +
              '</button>' +
            '</div>' +
          '</div>';
      }

      html +=
          '<div class="acct-card-actions">' +
            '<button type="button" class="btn-acct-select ' + (isCurrent ? 'selected' : '') + '" data-acct-act="select" data-id="' + acc.id + '">' +
              (isCurrent ? '✓ Akun Aktif' : 'Pilih Akun Ini') +
            '</button>' +
            (acc.type === 'tradingview' ?
              '<button type="button" class="text-xs text-gold-400 hover:text-gold-300 font-semibold" data-acct-act="import-tv" data-id="' + acc.id + '">' +
                '📥 Impor CSV' +
              '</button>' : '') +
            '<button type="button" class="text-xs text-gray-400 hover:text-gray-200" data-acct-act="toggle-status" data-id="' + acc.id + '">' +
              (acc.status === 'connected' ? 'Putuskan' : 'Hubungkan') +
            '</button>' +
          '</div>' +
        '</div>';
    });

    html += '</div>';

    // 2b. Card Entri Sinkronisasi MetaTrader 4 & 5
    html +=
      '<div class="tv-import-entry-card my-4">' +
        '<div class="tv-import-entry-head">' +
          '<div class="tv-import-entry-icon">⚡</div>' +
          '<div class="tv-import-entry-texts">' +
            '<div class="tv-import-entry-title">Sinkronisasi Otomatis MetaTrader 4 &amp; 5 (EA)</div>' +
            '<div class="tv-import-entry-desc">Kirim transaksi otomatis dari MT4/MT5 ke jurnal via EA resmi Doa Ibu (tanpa menyimpan password broker).</div>' +
          '</div>' +
        '</div>' +
        '<div class="flex items-center gap-2 mt-1 flex-wrap">' +
          '<button type="button" class="btn-token-act primary flex-1 justify-center" data-acct-act="guide-ea" data-type="mt4">' +
            '📖 Panduan Setup EA &amp; WebRequest' +
          '</button>' +
          '<button type="button" class="btn-token-act justify-center" data-acct-act="download-ea" data-type="mt4">' +
            '📥 Unduh EA MT4 (.mq4)' +
          '</button>' +
          '<button type="button" class="btn-token-act justify-center" data-acct-act="download-ea" data-type="mt5">' +
            '📥 Unduh EA MT5 (.mq5)' +
          '</button>' +
        '</div>' +
      '</div>';

    // 2c. Card Entri Impor CSV TradingView
    html +=
      '<div class="tv-import-entry-card my-4">' +
        '<div class="tv-import-entry-head">' +
          '<div class="tv-import-entry-icon">📥</div>' +
          '<div class="tv-import-entry-texts">' +
            '<div class="tv-import-entry-title">Impor CSV TradingView Paper</div>' +
            '<div class="tv-import-entry-desc">Unggah riwayat transaksi Paper Trading TradingView untuk dimasukkan ke dalam jurnal tanpa duplikasi.</div>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="tv-btn-open-import" data-acct-act="import-tv" data-id="' + activeAcc.id + '">' +
          '<span>↗</span> Buka Pengimpor CSV TradingView' +
        '</button>' +
      '</div>';

    // 3. Panel Status Migrasi & Rollback
    html +=
      '<div class="acct-migration-box">' +
        '<div class="flex items-center gap-2.5">' +
          '<span class="text-base">🛡️</span>' +
          '<div class="acct-migration-text">' +
            '<b>Integritas Data Aman</b>: Seluruh trade lama telah otomatis dikaitkan ke <b>Akun Utama</b>. Skema lama tetap utuh tanpa risiko kehilangan data.' +
          '</div>' +
        '</div>' +
        (hasBackup ?
          '<button type="button" class="btn-acct-rollback" id="btn-acct-rollback">' +
            '↺ Pulihkan Cadangan Pra-Migrasi' +
          '</button>' : '') +
      '</div>';

    section.innerHTML = html;
    bindAccountsEvents();
  }

  function bindAccountsEvents() {
    var section = D.getElementById('accounts-section');
    if (!section) return;

    var addBtn = section.querySelector('#btn-open-add-acct-modal');
    if (addBtn) {
      addBtn.addEventListener('click', openAddAccountModal);
    }

    var rollbackBtn = section.querySelector('#btn-acct-rollback');
    if (rollbackBtn) {
      rollbackBtn.addEventListener('click', function () {
        if (confirm('Pulihkan snapshot data journal ke keadaan sebelum migrasi Akun?')) {
          rollbackMigration();
        }
      });
    }

    section.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-acct-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-acct-act');
      var id = btn.getAttribute('data-id');

      if (act === 'select') {
        setActiveAccount(id);
      } else if (act === 'review-reflections') {
        openReflectionReviewModal();
      } else if (act === 'import-tv') {
        if (W.TradingViewImport && typeof W.TradingViewImport.open === 'function') {
          W.TradingViewImport.open(id || activeAccountId);
        } else if (typeof W.switchView === 'function') {
          W.switchView('tvimport');
        }
      } else if (act === 'toggle-status') {
        toggleAccountStatus(id);
      } else if (act === 'rename') {
        var acc = accounts.find(function (a) { return a.id === id; });
        var newName = prompt('Masukkan nama baru untuk akun ini:', acc ? acc.name : '');
        if (newName) renameAccount(id, newName);
      } else if (act === 'copy-token') {
        var token = btn.getAttribute('data-token');
        if (token) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(token);
          } else {
            var ta = D.createElement('textarea');
            ta.value = token;
            D.body.appendChild(ta);
            ta.select();
            D.execCommand('copy');
            ta.remove();
          }
          if (W.IosHaptics) W.IosHaptics.selection();
          if (W.StatusCapsule) {
            W.StatusCapsule.ok('tok-copy', { label: 'Token Sync disalin ke clipboard!', ttl: 2200 });
          } else {
            alert('Token Sync disalin ke clipboard!');
          }
        }
      } else if (act === 'toggle-token') {
        var disp = D.getElementById('tok-disp-' + id);
        if (disp) {
          var isMasked = disp.classList.contains('is-masked');
          if (isMasked) {
            disp.classList.remove('is-masked');
            disp.textContent = disp.getAttribute('data-token') || '';
          } else {
            disp.classList.add('is-masked');
            var raw = disp.getAttribute('data-token') || '';
            disp.textContent = raw.slice(0, 9) + '••••••••••••';
          }
        }
      } else if (act === 'regen-token') {
        if (confirm('Buat Token Sync baru untuk akun ini? Token lama akan dicabut dan EA di MetaTrader harus diperbarui dengan token baru.')) {
          regenerateSyncToken(id);
        }
      } else if (act === 'download-ea') {
        var eaType = btn.getAttribute('data-type') || 'mt4';
        var fileName = eaType === 'mt5' ? 'DoaIbu_Sync_MT5.mq5' : 'DoaIbu_Sync_MT4.mq4';
        var link = D.createElement('a');
        link.href = 'ea/' + fileName;
        link.download = fileName;
        D.body.appendChild(link);
        link.click();
        link.remove();
        if (W.IosHaptics) W.IosHaptics.selection();
      } else if (act === 'guide-ea') {
        var eaType = btn.getAttribute('data-type') || 'mt4';
        openEaSetupModal(eaType);
      } else if (act === 'delete') {
        var acc = accounts.find(function (a) { return a.id === id; });
        if (confirm('Yakin ingin menghapus akun "' + (acc ? acc.name : '') + '"? Data trade tidak akan terhapus namun tidak lagi terikat akun ini.')) {
          deleteAccount(id);
        }
      }
    });
  }

  /* --------------------------------------------------------------------------
     5. Modal Tambah Akun
     -------------------------------------------------------------------------- */
  function openAddAccountModal() {
    var existing = D.getElementById('acct-modal-ov');
    if (existing) existing.remove();

    var ov = D.createElement('div');
    ov.id = 'acct-modal-ov';
    ov.className = 'acct-modal-ov';
    ov.innerHTML =
      '<div class="acct-modal-card" role="dialog" aria-modal="true" aria-labelledby="acct-modal-t">' +
        '<h3 id="acct-modal-t" class="acct-modal-title">Tambah Akun Baru</h3>' +
        '<div class="acct-form-group">' +
          '<label class="acct-form-label">Tipe Akun</label>' +
          '<div class="acct-type-options" id="acct-modal-type-opts">' +
            '<div class="acct-type-opt selected" data-type="manual">Manual</div>' +
            '<div class="acct-type-opt" data-type="mt4">MetaTrader 4</div>' +
            '<div class="acct-type-opt" data-type="mt5">MetaTrader 5</div>' +
            '<div class="acct-type-opt" data-type="tradingview">TradingView Paper</div>' +
          '</div>' +
        '</div>' +
        '<div class="acct-form-group">' +
          '<label class="acct-form-label" for="input-new-acct-name">Nama Akun</label>' +
          '<input type="text" id="input-new-acct-name" class="acct-form-input" placeholder="mis. IC Markets Live, FTMO 100K..." autocomplete="off" />' +
        '</div>' +
        '<div class="acct-modal-acts">' +
          '<button type="button" class="btn-modal-cancel" id="btn-cancel-add-acct">Batal</button>' +
          '<button type="button" class="btn-modal-save" id="btn-save-new-acct">Simpan Akun</button>' +
        '</div>' +
      '</div>';

    D.body.appendChild(ov);

    var selectedType = 'manual';
    var typeOpts = ov.querySelectorAll('.acct-type-opt');
    typeOpts.forEach(function (opt) {
      opt.addEventListener('click', function () {
        typeOpts.forEach(function (o) { o.classList.remove('selected'); });
        opt.classList.add('selected');
        selectedType = opt.getAttribute('data-type');
        if (W.IosHaptics) W.IosHaptics.selection();
      });
    });

    var nameInput = ov.querySelector('#input-new-acct-name');
    setTimeout(function () { if (nameInput) nameInput.focus(); }, 100);

    ov.querySelector('#btn-cancel-add-acct').addEventListener('click', function () {
      ov.remove();
    });

    ov.querySelector('#btn-save-new-acct').addEventListener('click', function () {
      var name = nameInput.value.trim();
      if (!name) {
        alert('Mohon masukkan nama akun');
        nameInput.focus();
        return;
      }
      createAccount({ name: name, type: selectedType });
      ov.remove();
    });

    ov.addEventListener('click', function (e) {
      if (e.target === ov) ov.remove();
    });
  }

  /* --------------------------------------------------------------------------
     5b. Modal Panduan Setup EA MetaTrader 4 & 5
     -------------------------------------------------------------------------- */
  function openEaSetupModal(initialType) {
    var existing = D.getElementById('ea-guide-modal-ov');
    if (existing) existing.remove();

    var currentType = (initialType === 'mt5') ? 'mt5' : 'mt4';
    var defaultUrl = W.location.origin + '/.netlify/functions/sync-trade';

    var ov = D.createElement('div');
    ov.id = 'ea-guide-modal-ov';
    ov.className = 'ea-guide-modal-ov';

    function renderGuideContent(type) {
      var isMt5 = (type === 'mt5');
      var eaFileName = isMt5 ? 'DoaIbu_Sync_MT5.mq5' : 'DoaIbu_Sync_MT4.mq4';
      var folderPath = isMt5 ? 'MQL5/Experts' : 'MQL4/Experts';
      var eaTitle = isMt5 ? 'MetaTrader 5 (MT5)' : 'MetaTrader 4 (MT4)';

      return (
        '<div class="ea-step-item">' +
          '<div class="ea-step-badge">1</div>' +
          '<div class="ea-step-text">' +
            '<strong>Unduh File EA</strong><br>' +
            'Unduh script EA resmi Doa Ibu untuk ' + eaTitle + ' ke komputer Anda.' +
            '<div class="mt-2">' +
              '<a href="ea/' + eaFileName + '" download="' + eaFileName + '" class="btn-token-act primary inline-flex items-center gap-1.5">' +
                '📥 Unduh ' + eaFileName +
              '</a>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="ea-step-item">' +
          '<div class="ea-step-badge">2</div>' +
          '<div class="ea-step-text">' +
            '<strong>Salin File ke Direktori MetaTrader</strong><br>' +
            'Buka aplikasi ' + eaTitle + ' di PC/VPS Anda, lalu buka menu:<br>' +
            '<code>File → Open Data Folder → ' + folderPath + '</code><br>' +
            'Tempelkan file <code>' + eaFileName + '</code> di folder tersebut.' +
          '</div>' +
        '</div>' +

        '<div class="ea-step-item">' +
          '<div class="ea-step-badge">3</div>' +
          '<div class="ea-step-text">' +
            '<strong>Aktifkan Izin WebRequest</strong><br>' +
            'Di ' + eaTitle + ', buka menu: <code>Tools → Options → Expert Advisors</code>.<br>' +
            '1. Centang <strong>"Allow WebRequest for listed URL"</strong>.<br>' +
            '2. Klik dua kali pada daftar dan tambahkan URL Webhook berikut:' +
            '<div class="ea-code-box">' +
              '<span class="ea-code-box-val" id="ea-modal-webhook-url">' + defaultUrl + '</span>' +
              '<button type="button" class="ea-btn-copy-code" id="btn-copy-webhook-url">Salin URL</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="ea-step-item">' +
          '<div class="ea-step-badge">4</div>' +
          '<div class="ea-step-text">' +
            '<strong>Pasang EA ke Chart &amp; Masukkan Token</strong><br>' +
            'Di panel <strong>Navigator</strong> (Ctrl + N), klik kanan pada <em>Expert Advisors</em> lalu pilih <strong>Refresh</strong>.<br>' +
            'Tarik (drag) <code>' + eaFileName.replace(/\.(mq4|mq5)$/, '') + '</code> ke salah satu chart aktif (mis. EURUSD M1).<br>' +
            'Pada tab <strong>Inputs</strong>, masukkan <strong>InpSyncToken</strong> akun Anda (tersedia di kartu akun).' +
          '</div>' +
        '</div>' +

        '<div class="ea-step-item">' +
          '<div class="ea-step-badge">5</div>' +
          '<div class="ea-step-text">' +
            '<strong>Selesai &amp; Otomatis</strong><br>' +
            'Buka tab <strong>Experts</strong> di bagian bawah terminal untuk memastikan log koneksi:<br>' +
            '<span class="text-xs text-green-400 font-mono">[DoaIbu SUCCESS] Berhasil menyinkronkan trade ke Doa Ibu Journal!</span>' +
          '</div>' +
        '</div>'
      );
    }

    ov.innerHTML =
      '<div class="ea-guide-modal-card" role="dialog" aria-modal="true">' +
        '<div class="ea-guide-modal-header">' +
          '<div class="ea-guide-modal-title">' +
            '<span>⚙️</span> Panduan Pemasangan EA MetaTrader' +
          '</div>' +
          '<button type="button" class="ea-guide-modal-close" id="btn-close-ea-guide">✕</button>' +
        '</div>' +
        '<div class="ea-guide-tabs">' +
          '<button type="button" class="ea-guide-tab ' + (currentType === 'mt4' ? 'active' : '') + '" data-tab="mt4">MetaTrader 4 (MT4)</button>' +
          '<button type="button" class="ea-guide-tab ' + (currentType === 'mt5' ? 'active' : '') + '" data-tab="mt5">MetaTrader 5 (MT5)</button>' +
        '</div>' +
        '<div class="ea-guide-modal-body" id="ea-guide-modal-body">' +
          renderGuideContent(currentType) +
        '</div>' +
        '<div class="ea-guide-modal-footer">' +
          '<button type="button" class="ea-guide-btn-done" id="btn-done-ea-guide">Selesai</button>' +
        '</div>' +
      '</div>';

    D.body.appendChild(ov);

    function bindModalEvents() {
      var tabs = ov.querySelectorAll('.ea-guide-tab');
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          tabs.forEach(function (t) { t.classList.remove('active'); });
          tab.classList.add('active');
          var t = tab.getAttribute('data-tab');
          currentType = t;
          var body = ov.querySelector('#ea-guide-modal-body');
          if (body) {
            body.innerHTML = renderGuideContent(t);
            bindCopyBtn();
          }
        });
      });

      function bindCopyBtn() {
        var copyBtn = ov.querySelector('#btn-copy-webhook-url');
        if (copyBtn) {
          copyBtn.addEventListener('click', function () {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(defaultUrl);
            } else {
              var ta = D.createElement('textarea');
              ta.value = defaultUrl;
              D.body.appendChild(ta);
              ta.select();
              D.execCommand('copy');
              ta.remove();
            }
            copyBtn.textContent = 'Tersalin!';
            setTimeout(function () { copyBtn.textContent = 'Salin URL'; }, 2000);
          });
        }
      }

      bindCopyBtn();

      var closeBtn = ov.querySelector('#btn-close-ea-guide');
      if (closeBtn) closeBtn.addEventListener('click', function () { ov.remove(); });

      var doneBtn = ov.querySelector('#btn-done-ea-guide');
      if (doneBtn) doneBtn.addEventListener('click', function () { ov.remove(); });

      ov.addEventListener('click', function (e) {
        if (e.target === ov) ov.remove();
      });
    }

    bindModalEvents();
  }

  /* --------------------------------------------------------------------------
     5c. Modal Tinjau Trade Butuh Refleksi (Review Unreflected Trades)
     -------------------------------------------------------------------------- */
  function openReflectionReviewModal(filterAccountId) {
    var existing = D.getElementById('acct-refl-modal-ov');
    if (existing) existing.remove();

    var allJ = W.allJournals;
    var unreflected = [];
    if (Array.isArray(allJ) && W.JEntries) {
      allJ.forEach(function (day) {
        var rows = W.JEntries.rowsOf(day);
        rows.forEach(function (r) {
          var matchAcct = !filterAccountId || r.accountId === filterAccountId;
          if (matchAcct && r.needsReflection === true) {
            unreflected.push(r);
          }
        });
      });
    }

    // Urutkan dari trade terbaru ke terlama
    unreflected.sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '') || (b.createdMs || 0) - (a.createdMs || 0);
    });

    var ov = D.createElement('div');
    ov.id = 'acct-refl-modal-ov';
    ov.className = 'acct-modal-ov acct-refl-modal';

    var html =
      '<div class="acct-refl-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="acct-refl-title">' +
        '<div class="acct-refl-modal-header">' +
          '<div>' +
            '<div class="acct-eyebrow"><span>💡</span> EVALUASI TRADING</div>' +
            '<h3 id="acct-refl-title" class="acct-refl-title">Refleksi Psikologi Tertunda</h3>' +
            '<p class="acct-refl-subtitle">Trade hasil impor yang perlu dilengkapi catatan evaluasi, emosi, dan rating.</p>' +
          '</div>' +
          '<button type="button" class="btn-modal-close" id="btn-close-refl-modal" aria-label="Tutup">✕</button>' +
        '</div>';

    // Filter tab per akun bila terdapat lebih dari 1 akun
    if (accounts.length > 1) {
      html +=
        '<div class="acct-refl-tabs">' +
          '<button type="button" class="acct-refl-tab ' + (!filterAccountId ? 'active' : '') + '" data-tab-acct="">Semua Akun (' + unreflected.length + ')</button>';
      accounts.forEach(function (acc) {
        var c = 0;
        if (Array.isArray(allJ) && W.JEntries) {
          allJ.forEach(function (day) {
            W.JEntries.rowsOf(day).forEach(function (r) {
              if (r.accountId === acc.id && r.needsReflection === true) c++;
            });
          });
        }
        if (c > 0 || acc.id === filterAccountId) {
          html += '<button type="button" class="acct-refl-tab ' + (filterAccountId === acc.id ? 'active' : '') + '" data-tab-acct="' + acc.id + '">' +
            acc.name + ' (' + c + ')' +
          '</button>';
        }
      });
      html += '</div>';
    }

    html += '<div class="acct-refl-list">';

    if (!unreflected.length) {
      html +=
        '<div class="acct-refl-empty">' +
          '<div class="acct-refl-empty-icon">🎉</div>' +
          '<h4 class="acct-refl-empty-title">Semua Refleksi Selesai!</h4>' +
          '<p class="acct-refl-empty-desc">Tidak ada trade tertunda yang membutuhkan catatan refleksi. Kedisiplinan jurnal Anda 100% terjaga!</p>' +
        '</div>';
    } else {
      unreflected.forEach(function (r) {
        var plVal = Number(r.pl || 0);
        var plFormatted = plVal > 0 ? ('+' + plVal.toFixed(2)) : plVal.toFixed(2);
        var plClass = plVal > 0 ? 'text-emerald-400' : (plVal < 0 ? 'text-rose-400' : 'text-gray-400');
        var srcLabel = r.source === 'tradingview' ? 'TradingView Paper' : (r.source === 'mt4' ? 'MT4 EA' : (r.source === 'mt5' ? 'MT5 EA' : 'Manual'));
        var ticket = r.externalId ? (' #' + String(r.externalId).replace(/^(tv_|mt4_|mt5_)/, '')) : '';
        var accObj = accounts.find(function (a) { return a.id === r.accountId; });
        var accName = accObj ? accObj.name : 'Akun Utama';

        html +=
          '<div class="acct-refl-card">' +
            '<div class="acct-refl-card-main">' +
              '<div class="acct-refl-card-header">' +
                '<span class="acct-refl-date">' + (r.date || '—') + '</span>' +
                '<span class="acct-refl-source-badge">' + srcLabel + ticket + '</span>' +
                '<span class="acct-refl-acc-tag">' + accName + '</span>' +
              '</div>' +
              '<div class="acct-refl-card-body">' +
                '<div class="acct-refl-pair-wrap">' +
                  '<b class="acct-refl-pair">' + (r.pair || 'XAUUSD') + '</b>' +
                  (r.bias ? '<span class="acct-refl-bias ' + (r.bias.toLowerCase().indexOf('buy') >= 0 || r.bias.toLowerCase().indexOf('long') >= 0 ? 'buy' : 'sell') + '">' + r.bias + '</span>' : '') +
                '</div>' +
                '<div class="acct-refl-pl ' + plClass + ' tnum">' +
                  plFormatted + ' $' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<button type="button" class="btn-refl-action" data-refl-trade-id="' + r.id + '">' +
              '<span>📝</span> Lengkapi Refleksi ›' +
            '</button>' +
          '</div>';
      });
    }

    html +=
        '</div>' +
        '<div class="acct-refl-footer">' +
          '<button type="button" class="btn-refl-dismiss" id="btn-refl-done">Tutup</button>' +
        '</div>' +
      '</div>';

    ov.innerHTML = html;
    D.body.appendChild(ov);

    // Event listeners
    var closeBtn = ov.querySelector('#btn-close-refl-modal');
    if (closeBtn) closeBtn.addEventListener('click', function () { ov.remove(); });
    var doneBtn = ov.querySelector('#btn-refl-done');
    if (doneBtn) doneBtn.addEventListener('click', function () { ov.remove(); });

    ov.addEventListener('click', function (e) {
      if (e.target === ov) ov.remove();

      var tabBtn = e.target.closest('[data-tab-acct]');
      if (tabBtn) {
        var targetAcct = tabBtn.getAttribute('data-tab-acct');
        openReflectionReviewModal(targetAcct || null);
        return;
      }

      var actBtn = e.target.closest('[data-refl-trade-id]');
      if (actBtn) {
        var tradeId = actBtn.getAttribute('data-refl-trade-id');
        ov.remove();
        navigateToTradeReflection(tradeId);
      }
    });

    var onKey = function (e) {
      if (e.key === 'Escape') {
        D.removeEventListener('keydown', onKey);
        ov.remove();
      }
    };
    D.addEventListener('keydown', onKey);
  }

  function navigateToTradeReflection(tradeId) {
    if (!tradeId) return;
    // 1. Pindah ke view dashboard / jurnal
    if (typeof W.switchView === 'function') {
      W.switchView('dashboard');
    }
    // 2. Buka editor journal untuk trade ID ini
    if (typeof W.editJournal === 'function') {
      W.editJournal(tradeId);
    }
    // 3. Scroll form ke tampilan dan aktifkan tab Review / Psikologi
    setTimeout(function () {
      var formSec = D.getElementById('form-section');
      if (formSec) {
        formSec.classList.remove('hidden');
        formSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      var step4Chip = D.querySelector('[data-jw-go="4"]');
      if (step4Chip) step4Chip.click();
      var notesInp = D.getElementById('input-notes');
      if (notesInp) {
        notesInp.focus();
      }
      if (W.StatusCapsule) {
        W.StatusCapsule.ok('refl-open', { label: 'Silakan lengkapi catatan refleksi & psikologi trade ini', ttl: 3500 });
      }
    }, 150);
  }

  /* --------------------------------------------------------------------------
     6. Dashboard Active Account Top Indicator (Menggantikan pemilih akun lama)
     -------------------------------------------------------------------------- */
  function renderTopPillHtml() {
    var act = getActiveAccount();
    return (
      '<div class="ios-active-acct-pill">' +
        '<div class="flex items-center gap-2.5">' +
          '<span class="acct-status-dot ' + (act.status === 'connected' ? '' : 'disconnected') + '"></span>' +
          '<span class="text-xs text-gray-400">Akun Aktif:</span>' +
          '<b class="text-xs text-gold-400 font-semibold">' + act.name + '</b>' +
          '<span class="acct-type-pill">' + getTypeLabel(act.type) + '</span>' +
        '</div>' +
        '<button type="button" class="text-xs text-gold-400 hover:text-gold-300 underline underline-offset-2" onclick="switchView(\'accounts\'); window.scrollTo({top: 0, behavior: \'smooth\'});">' +
          'Ganti / Kelola Akun ›' +
        '</button>' +
      '</div>'
    );
  }

  function updateTopPill() {
    var pill = D.querySelector('.ios-active-acct-pill');
    if (pill) {
      var act = getActiveAccount();
      var bName = pill.querySelector('b');
      var pType = pill.querySelector('.acct-type-pill');
      var dot = pill.querySelector('.acct-status-dot');
      if (bName) bName.textContent = act.name;
      if (pType) pType.textContent = getTypeLabel(act.type);
      if (dot) {
        dot.className = 'acct-status-dot ' + (act.status === 'connected' ? '' : 'disconnected');
      }
    }
  }

  /* --------------------------------------------------------------------------
     7. Initialization
     -------------------------------------------------------------------------- */
  function init() {
    loadLocalAccounts();
    pullAccountsFromFirestore();

    W.addEventListener('journals-loaded', function () {
      setTimeout(function () {
        migrateLegacyTrades();
        renderAccountsView();
        updateTopPill();
      }, 50);
    });

    W.addEventListener('viewchange', function (e) {
      if (e.detail && e.detail.view === 'accounts') {
        renderAccountsView();
      }
    });

    renderAccountsView();
  }

  if (D.readyState === 'loading') {
    D.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  W.AccountsManager = {
    getAccounts: getAccounts,
    getActiveAccount: getActiveAccount,
    setActiveAccount: setActiveAccount,
    createAccount: createAccount,
    renameAccount: renameAccount,
    deleteAccount: deleteAccount,
    renderAccountsView: renderAccountsView,
    renderTopPillHtml: renderTopPillHtml,
    updateTopPill: updateTopPill,
    updateAccountLastSynced: updateAccountLastSynced,
    regenerateSyncToken: regenerateSyncToken,
    openEaSetupModal: openEaSetupModal,
    openReflectionReviewModal: openReflectionReviewModal,
    formatRelativeTime: formatRelativeTime,
    migrateLegacyTrades: migrateLegacyTrades,
    rollbackMigration: rollbackMigration
  };
})();
