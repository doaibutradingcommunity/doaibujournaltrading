/* ============================================================
   tradingview-import.js — Tahap 2: Import CSV TradingView Paper Trade
   DOA IBU Trading Journal v17.03 — Apple Dark iOS Premium
   ============================================================ */

(function (W, D) {
  'use strict';

  var parsedRows = [];
  var selectedAccountTargetId = null;

  /* --------------------------------------------------------------------------
     1. CSV Parser (Robust RFC 4180 compliant with multiline & delimiter support)
     -------------------------------------------------------------------------- */
  function parseCSV(text) {
    if (!text || typeof text !== 'string') return [];
    // Hapus BOM jika ada
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }

    var lines = [];
    var row = [];
    var cell = '';
    var inQuotes = false;
    var i = 0;
    var len = text.length;

    // Deteksi delimiter otomatis (, atau ;)
    var firstLine = text.split(/[\r\n]+/)[0] || '';
    var commaCount = (firstLine.match(/,/g) || []).length;
    var semiCount = (firstLine.match(/;/g) || []).length;
    var delim = semiCount > commaCount ? ';' : ',';

    while (i < len) {
      var c = text[i];
      var next = text[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = !inQuotes;
        i++;
        continue;
      }

      if (!inQuotes && c === delim) {
        row.push(cell.trim());
        cell = '';
        i++;
        continue;
      }

      if (!inQuotes && (c === '\r' || c === '\n')) {
        if (c === '\r' && next === '\n') {
          i++;
        }
        row.push(cell.trim());
        // Hanya simpan baris jika tidak seluruhnya kosong
        var hasContent = row.some(function (v) { return v.length > 0; });
        if (hasContent) {
          lines.push(row);
        }
        row = [];
        cell = '';
        i++;
        continue;
      }

      cell += c;
      i++;
    }

    if (cell.length > 0 || row.length > 0) {
      row.push(cell.trim());
      if (row.some(function (v) { return v.length > 0; })) {
        lines.push(row);
      }
    }

    return lines;
  }

  /* --------------------------------------------------------------------------
     2. Smart Column Header Matcher
     -------------------------------------------------------------------------- */
  function detectColumns(headers) {
    var map = {
      id: -1,
      time: -1,
      symbol: -1,
      side: -1,
      qty: -1,
      price: -1,
      pl: -1,
      fee: -1,
      sl: -1,
      tp: -1
    };

    var patterns = {
      id: /^(order\s*id|order\s*#|trade\s*id|trade\s*#|ticket|tiket|id|position\s*id)$/i,
      time: /^(time|fill\s*time|close\s*time|open\s*time|date|datetime|waktu|tanggal|timestamp|created\s*at)$/i,
      symbol: /^(symbol|simbol|pair|instrument|instrumen|ticker|asset)$/i,
      side: /^(side|sisi|type|tipe|action|aksi|direction|arah)$/i,
      qty: /^(qty|quantity|jumlah|size|contracts|shares|lot|volume|amount)$/i,
      price: /^(avg\s*fill\s*price|avg\s*price|fill\s*price|price|close\s*price|open\s*price|harga)$/i,
      pl: /^(realized\s*p&l|realized\s*pl|net\s*p&l|net\s*profit|p&l|pl|profit|profit\/loss|untung\/rugi|pnl)$/i,
      fee: /^(commission|commissions|fee|fees|komisi|biaya)$/i,
      sl: /^(stop\s*loss|sl|stop)$/i,
      tp: /^(take\s*profit|tp|limit)$/i
    };

    headers.forEach(function (rawH, idx) {
      var h = String(rawH || '').trim().replace(/^["']|["']$/g, '');
      for (var key in patterns) {
        if (map[key] === -1 && patterns[key].test(h)) {
          map[key] = idx;
        }
      }
    });

    // Fallback jika header tidak cocok sempurna secara regex exact: cari substring
    headers.forEach(function (rawH, idx) {
      var h = String(rawH || '').trim().toLowerCase();
      if (map.pl === -1 && (h.indexOf('p&l') >= 0 || h.indexOf('profit') >= 0 || h.indexOf('pnl') >= 0)) map.pl = idx;
      if (map.time === -1 && (h.indexOf('time') >= 0 || h.indexOf('date') >= 0 || h.indexOf('waktu') >= 0)) map.time = idx;
      if (map.symbol === -1 && (h.indexOf('symbol') >= 0 || h.indexOf('pair') >= 0 || h.indexOf('simbol') >= 0)) map.symbol = idx;
      if (map.side === -1 && (h.indexOf('side') >= 0 || h.indexOf('action') >= 0 || h.indexOf('type') >= 0)) map.side = idx;
      if (map.qty === -1 && (h.indexOf('qty') >= 0 || h.indexOf('size') >= 0 || h.indexOf('lot') >= 0)) map.qty = idx;
      if (map.price === -1 && (h.indexOf('price') >= 0 || h.indexOf('harga') >= 0)) map.price = idx;
      if (map.id === -1 && (h.indexOf('order') >= 0 || h.indexOf('id') >= 0 || h.indexOf('ticket') >= 0)) map.id = idx;
    });

    return map;
  }

  /* --------------------------------------------------------------------------
     3. Normalizer & Cleaners
     -------------------------------------------------------------------------- */
  function cleanSymbol(sym) {
    if (!sym) return 'UNKNOWN';
    var s = String(sym).trim();
    // Hilangkan prefix broker umum TradingView: "FX:EURUSD", "OANDA:XAUUSD", "BINANCE:BTCUSDT"
    var colonIdx = s.indexOf(':');
    if (colonIdx >= 0) {
      s = s.slice(colonIdx + 1);
    }
    // Bersihkan suffix seperti ".m", "_SB", ".pro" jika ada
    s = s.replace(/\.[a-zA-Z0-9]+$/, '').replace(/_[a-zA-Z0-9]+$/, '');
    return s.toUpperCase().trim();
  }

  function parseSide(sideStr) {
    var s = String(sideStr || '').trim().toLowerCase();
    if (s.indexOf('buy') >= 0 || s.indexOf('long') >= 0 || s.indexOf('beli') >= 0) {
      return 'Long';
    }
    if (s.indexOf('sell') >= 0 || s.indexOf('short') >= 0 || s.indexOf('jual') >= 0) {
      return 'Short';
    }
    return 'Long';
  }

  function parseNumber(numStr) {
    if (numStr === undefined || numStr === null) return 0;
    var s = String(numStr).trim();
    if (!s) return 0;
    // Cek format kurung: (120.50) = -120.50
    var isNeg = false;
    if (s.charAt(0) === '(' && s.charAt(s.length - 1) === ')') {
      isNeg = true;
      s = s.slice(1, -1);
    }
    // Hapus simbol mata uang dan pemisah ribuan
    s = s.replace(/[$€£Rp\s+]/g, '');
    // Jika format eropa 1.234,56
    if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) {
      if (s.indexOf('.') < s.indexOf(',')) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else if (s.indexOf(',') >= 0) {
      // Jika hanya ada koma, bisa jadi desimal: 12,50
      s = s.replace(',', '.');
    }
    var val = parseFloat(s);
    if (!isFinite(val)) return 0;
    return isNeg ? -Math.abs(val) : val;
  }

  function parseDateAndMs(dateStr) {
    if (!dateStr) {
      var now = new Date();
      return {
        date: now.toISOString().slice(0, 10),
        createdMs: now.getTime()
      };
    }

    var s = String(dateStr).trim();
    var d = null;

    // Cek format Unix timestamp (detik atau milidetik)
    if (/^\d{10,13}$/.test(s)) {
      var ts = parseInt(s, 10);
      if (s.length === 10) ts *= 1000;
      d = new Date(ts);
    } else {
      // Coba native Date parse dulu (bagus untuk ISO "2026-10-28 14:30:00" atau "2026-10-28T14:30:00Z")
      var testD = new Date(s);
      if (!isNaN(testD.getTime())) {
        d = testD;
      } else {
        // Coba pola DD/MM/YYYY atau MM/DD/YYYY
        var parts = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
        if (parts) {
          var p1 = parseInt(parts[1], 10);
          var p2 = parseInt(parts[2], 10);
          var yr = parseInt(parts[3], 10);
          var hr = parseInt(parts[4] || '0', 10);
          var mn = parseInt(parts[5] || '0', 10);
          var sc = parseInt(parts[6] || '0', 10);

          // Asumsi DD/MM/YYYY jika p1 > 12
          if (p1 > 12) {
            d = new Date(yr, p2 - 1, p1, hr, mn, sc);
          } else {
            // Default ke YYYY-MM-DD standar internasional
            d = new Date(yr, p1 - 1, p2, hr, mn, sc);
          }
        }
      }
    }

    if (!d || isNaN(d.getTime())) {
      d = new Date();
    }

    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var yyyy = d.getFullYear();
    var mm = pad(d.getMonth() + 1);
    var dd = pad(d.getDate());

    return {
      date: yyyy + '-' + mm + '-' + dd,
      createdMs: d.getTime()
    };
  }

  /* --------------------------------------------------------------------------
     4. Ambil Daftar ExternalId yang Sudah Ada di Firestore (Anti-Duplikat)
     -------------------------------------------------------------------------- */
  function getExistingExternalIds() {
    var set = {};
    try {
      var allJ = W.allJournals;
      if (Array.isArray(allJ) && W.JEntries) {
        allJ.forEach(function (day) {
          var rows = W.JEntries.rowsOf(day);
          rows.forEach(function (r) {
            if (r.externalId) {
              set[String(r.externalId).trim()] = true;
            }
          });
        });
      }
    } catch (e) {
      console.warn('Gagal memuat externalIds yang sudah ada:', e);
    }
    return set;
  }

  /* --------------------------------------------------------------------------
     5. Konversi Baris CSV ke Objek Trade Siap Pratinjau
     -------------------------------------------------------------------------- */
  function parseCSVContent(csvText) {
    var matrix = parseCSV(csvText);
    if (!matrix || matrix.length < 2) {
      throw new Error('File CSV kosong atau tidak memiliki baris data.');
    }

    var headers = matrix[0];
    var colMap = detectColumns(headers);

    if (colMap.symbol === -1 && colMap.pl === -1) {
      throw new Error('Kolom TradingView tidak dikenali. Pastikan file adalah ekspor Paper Trading dari TradingView.');
    }

    var existingExtIds = getExistingExternalIds();
    var out = [];

    for (var r = 1; r < matrix.length; r++) {
      var row = matrix[r];
      if (!row || row.length < 2) continue;

      var rawSymbol = colMap.symbol >= 0 ? row[colMap.symbol] : '';
      var rawTime = colMap.time >= 0 ? row[colMap.time] : '';
      var rawSide = colMap.side >= 0 ? row[colMap.side] : '';
      var rawQty = colMap.qty >= 0 ? row[colMap.qty] : '';
      var rawPrice = colMap.price >= 0 ? row[colMap.price] : '';
      var rawPl = colMap.pl >= 0 ? row[colMap.pl] : '';
      var rawFee = colMap.fee >= 0 ? row[colMap.fee] : '';
      var rawId = colMap.id >= 0 ? row[colMap.id] : '';

      var pair = cleanSymbol(rawSymbol);
      if (!pair || pair === 'UNKNOWN') continue; // Lewati baris header berulang atau baris kosong

      var dt = parseDateAndMs(rawTime);
      var bias = parseSide(rawSide);
      var pl = parseNumber(rawPl);
      var lot = parseNumber(rawQty) || 1;
      var price = parseNumber(rawPrice);
      var fees = colMap.fee >= 0 ? Math.abs(parseNumber(rawFee)) : null;

      // Buat externalId deterministik jika kolom ID tidak tersedia
      var extId = String(rawId || '').trim();
      if (!extId) {
        extId = 'tv_' + dt.date + '_' + pair + '_' + bias + '_' + Math.round(pl * 100) + '_' + Math.round(lot * 100);
      }

      var isDup = !!existingExtIds[extId];

      out.push({
        pair: pair,
        date: dt.date,
        createdMs: dt.createdMs,
        bias: bias,
        lot: lot,
        entryPrice: price > 0 ? price : null,
        pl: Math.round(pl * 100) / 100,
        fees: fees,
        externalId: extId,
        source: 'tradingview',
        needsReflection: true,
        isDuplicate: isDup,
        selected: !isDup // Secara default, baris duplikat tidak dicentang
      });
    }

    return out;
  }

  /* --------------------------------------------------------------------------
     6. Render View Import CSV
     -------------------------------------------------------------------------- */
  function renderView() {
    var section = D.getElementById('tv-import-section');
    if (!section) return;

    // Ambil daftar akun untuk dropdown
    var accounts = [];
    var activeId = null;
    if (W.AccountsManager && typeof W.AccountsManager.getAccounts === 'function') {
      accounts = W.AccountsManager.getAccounts();
      var act = W.AccountsManager.getActiveAccount();
      activeId = act ? act.id : null;
    }
    if (!selectedAccountTargetId && activeId) {
      // Prioritaskan akun bertipe 'tradingview' jika ada
      var tvAcct = accounts.find(function (a) { return a.type === 'tradingview'; });
      selectedAccountTargetId = tvAcct ? tvAcct.id : activeId;
    }

    var html =
      '<div class="tv-import-wrap">' +

        // Header
        '<div class="tv-import-header">' +
          '<div class="tv-import-eyebrow">' +
            '<span>📥</span> SINKRONISASI PAPER TRADING' +
          '</div>' +
          '<h1 class="tv-import-title">Impor CSV TradingView</h1>' +
          '<p class="tv-import-subtitle">' +
            'Unggah file riwayat ekspor Paper Trading TradingView untuk dimasukkan ke dalam jurnal secara rapi tanpa risiko duplikasi data.' +
          '</p>' +
        '</div>' +

        // Panduan Langkah Demi Langkah (In-page Guide)
        '<div class="tv-guide-card is-open" id="tv-guide-card">' +
          '<button type="button" class="tv-guide-toggle" id="tv-guide-toggle">' +
            '<div class="tv-guide-toggle-left">' +
              '<span class="tv-guide-toggle-icon">📖</span>' +
              '<span>Panduan Cara Ekspor CSV dari TradingView</span>' +
            '</div>' +
            '<span class="tv-guide-chevron">▼</span>' +
          '</button>' +
          '<div class="tv-guide-body">' +
            '<div class="tv-guide-steps">' +
              '<div class="tv-guide-step">' +
                '<div class="tv-guide-step-num">1</div>' +
                '<div class="tv-guide-step-text">' +
                  'Buka chart di <strong>TradingView</strong> dan pastikan Anda login ke broker <strong>Paper Trading</strong>.' +
                '</div>' +
              '</div>' +
              '<div class="tv-guide-step">' +
                '<div class="tv-guide-step-num">2</div>' +
                '<div class="tv-guide-step-text">' +
                  'Pada panel bawah chart, klik tab <strong>Trading Panel</strong> lalu pilih <strong>Paper Trading</strong>.' +
                '</div>' +
              '</div>' +
              '<div class="tv-guide-step">' +
                '<div class="tv-guide-step-num">3</div>' +
                '<div class="tv-guide-step-text">' +
                  'Pilih sub-tab <strong>Account History</strong> (Histori Akun) atau <strong>Orders</strong> (Pesanan).' +
                '</div>' +
              '</div>' +
              '<div class="tv-guide-step">' +
                '<div class="tv-guide-step-num">4</div>' +
                '<div class="tv-guide-step-text">' +
                  'Klik ikon <strong>Export (.csv)</strong> di pojok kanan atas tabel riwayat TradingView untuk mengunduh file.' +
                '</div>' +
              '</div>' +
              '<div class="tv-guide-step">' +
                '<div class="tv-guide-step-num">5</div>' +
                '<div class="tv-guide-step-text">' +
                  'Upload file CSV yang baru diunduh ke kotak dropzone di bawah.' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="tv-guide-note">' +
              '<strong>Aturan Keamanan Data:</strong> Analisis, refleksi psikologi, dan rating sengaja <strong>tidak diisi otomatis</strong> agar jurnal Anda tetap jujur dan bermakna. Trade hasil impor akan diberi tanda refleksi pending.' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Pemilih Akun Tujuan
        '<div class="tv-acct-selector">' +
          '<label class="tv-acct-selector-label" for="tv-target-account">Tautkan ke Akun:</label>' +
          '<div class="tv-acct-select-wrap">' +
            '<select id="tv-target-account" class="tv-acct-select">';

    if (accounts.length === 0) {
      html += '<option value="acc_default_main">Akun Utama (Manual)</option>';
    } else {
      accounts.forEach(function (acc) {
        var isSel = (acc.id === selectedAccountTargetId);
        html += '<option value="' + acc.id + '" ' + (isSel ? 'selected' : '') + '>' +
          acc.name + ' (' + (acc.type === 'tradingview' ? 'TradingView Paper' : acc.type) + ')' +
        '</option>';
      });
    }

    html +=
            '</select>' +
            '<span class="tv-acct-select-arrow">▼</span>' +
          '</div>' +
        '</div>' +

        // Dropzone Uploader
        '<div class="tv-dropzone" id="tv-dropzone">' +
          '<input type="file" id="tv-file-input" class="tv-file-input" accept=".csv,text/csv,text/plain" />' +
          '<span class="tv-dropzone-icon">📄</span>' +
          '<div class="tv-dropzone-title">Pilih atau Tarik File CSV TradingView</div>' +
          '<div class="tv-dropzone-subtitle">' +
            'Mendukung format ekspor resmi <strong>Paper Trading</strong> (.csv)' +
          '</div>' +
          '<div class="tv-dropzone-sub2">Klik atau drag file ke sini</div>' +
          '<div class="tv-file-chosen" id="tv-file-chosen">' +
            '<span class="tv-file-chosen-name" id="tv-file-name"></span>' +
            '<button type="button" class="tv-file-clear" id="tv-file-clear" title="Hapus file">✕</button>' +
          '</div>' +
        '</div>' +

        // Status / Error
        '<div class="tv-parse-status" id="tv-parse-status"></div>' +

        // Preview Section (Tabel)
        '<div class="tv-preview-section" id="tv-preview-section">' +
          '<div class="tv-preview-header">' +
            '<div>' +
              '<div class="tv-preview-title">Pratinjau Data Trade</div>' +
              '<div class="tv-preview-meta" id="tv-preview-meta">0 trade ditemukan</div>' +
            '</div>' +
            '<div class="tv-preview-controls">' +
              '<label class="tv-preview-select-all">' +
                '<input type="checkbox" id="tv-select-all" checked />' +
                '<span>Pilih Semua yang Baru</span>' +
              '</label>' +
            '</div>' +
          '</div>' +

          '<div class="tv-preview-table-wrap">' +
            '<div class="tv-preview-table-scroll">' +
              '<table class="tv-preview-table">' +
                '<thead>' +
                  '<tr>' +
                    '<th>Pilih</th>' +
                    '<th>Tanggal</th>' +
                    '<th>Pair</th>' +
                    '<th>Arah</th>' +
                    '<th>Lot</th>' +
                    '<th>Harga Entry</th>' +
                    '<th>P/L ($)</th>' +
                    '<th>Status</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody id="tv-preview-tbody"></tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +

          // Footer Aksi Import
          '<div class="tv-import-footer">' +
            '<div class="tv-import-summary" id="tv-import-summary"></div>' +
            '<div class="tv-import-actions">' +
              '<button type="button" class="tv-btn-cancel-import" id="tv-btn-cancel-import">Batal</button>' +
              '<button type="button" class="tv-btn-confirm-import" id="tv-btn-confirm-import">Simpan ke Jurnal</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Kartu Sukses
        '<div class="tv-success-card" id="tv-success-card">' +
          '<div class="tv-success-icon">🎉</div>' +
          '<h3 class="tv-success-title">Impor Selesai!</h3>' +
          '<p class="tv-success-sub" id="tv-success-msg"></p>' +
          '<div class="tv-success-btns">' +
            '<button type="button" class="tv-btn-go-dashboard" id="tv-btn-go-dash">Lihat Dashboard</button>' +
            '<button type="button" class="tv-btn-import-more" id="tv-btn-import-more">Impor File Lain</button>' +
          '</div>' +
        '</div>' +

      '</div>' +

      // Progress Overlay
      '<div class="tv-progress-ov hidden" id="tv-progress-ov">' +
        '<div class="tv-progress-card">' +
          '<div class="tv-progress-spinner"></div>' +
          '<div class="tv-progress-title" id="tv-progress-title">Menyimpan Trade...</div>' +
          '<div class="tv-progress-sub" id="tv-progress-sub">Mohon tunggu sebentar</div>' +
          '<div class="tv-progress-bar-wrap">' +
            '<div class="tv-progress-bar" id="tv-progress-bar"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    section.innerHTML = html;
    bindEvents();
  }

  /* --------------------------------------------------------------------------
     7. Bind UI Events
     -------------------------------------------------------------------------- */
  function bindEvents() {
    var section = D.getElementById('tv-import-section');
    if (!section) return;

    // Toggle Panduan
    var guideToggle = section.querySelector('#tv-guide-toggle');
    var guideCard = section.querySelector('#tv-guide-card');
    if (guideToggle && guideCard) {
      guideToggle.addEventListener('click', function () {
        guideCard.classList.toggle('is-open');
      });
    }

    // Pemilih Akun Target
    var acctSelect = section.querySelector('#tv-target-account');
    if (acctSelect) {
      acctSelect.addEventListener('change', function () {
        selectedAccountTargetId = acctSelect.value;
        updateSummaryText();
      });
    }

    // File Input & Drag and Drop
    var dropzone = section.querySelector('#tv-dropzone');
    var fileInput = section.querySelector('#tv-file-input');
    var fileChosen = section.querySelector('#tv-file-chosen');
    var fileName = section.querySelector('#tv-file-name');
    var fileClear = section.querySelector('#tv-file-clear');

    if (dropzone && fileInput) {
      ['dragenter', 'dragover'].forEach(function (evt) {
        dropzone.addEventListener(evt, function (e) {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('drag-over');
        });
      });

      ['dragleave', 'drop'].forEach(function (evt) {
        dropzone.addEventListener(evt, function (e) {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('drag-over');
        });
      });

      dropzone.addEventListener('drop', function (e) {
        var files = e.dataTransfer.files;
        if (files && files.length > 0) {
          handleFile(files[0]);
        }
      });

      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files.length > 0) {
          handleFile(fileInput.files[0]);
        }
      });
    }

    if (fileClear) {
      fileClear.addEventListener('click', function (e) {
        e.stopPropagation();
        resetFileInput();
      });
    }

    // Checkbox Pilih Semua
    var selectAllCb = section.querySelector('#tv-select-all');
    if (selectAllCb) {
      selectAllCb.addEventListener('change', function () {
        var isChecked = selectAllCb.checked;
        parsedRows.forEach(function (row) {
          if (!row.isDuplicate) {
            row.selected = isChecked;
          }
        });
        renderTableRows();
        updateSummaryText();
      });
    }

    // Tombol Batal
    var btnCancel = section.querySelector('#tv-btn-cancel-import');
    if (btnCancel) {
      btnCancel.addEventListener('click', function () {
        if (confirm('Batalkan proses impor?')) {
          resetFileInput();
        }
      });
    }

    // Tombol Simpan
    var btnConfirm = section.querySelector('#tv-btn-confirm-import');
    if (btnConfirm) {
      btnConfirm.addEventListener('click', function () {
        saveSelectedTrades();
      });
    }

    // Tombol di layar sukses
    var btnGoDash = section.querySelector('#tv-btn-go-dash');
    if (btnGoDash) {
      btnGoDash.addEventListener('click', function () {
        if (typeof W.switchView === 'function') {
          W.switchView('home');
          W.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }

    var btnMore = section.querySelector('#tv-btn-import-more');
    if (btnMore) {
      btnMore.addEventListener('click', function () {
        resetFileInput();
      });
    }
  }

  /* --------------------------------------------------------------------------
     8. Handle File Reading
     -------------------------------------------------------------------------- */
  function handleFile(file) {
    var statusEl = D.getElementById('tv-parse-status');
    var dropzone = D.getElementById('tv-dropzone');
    var fileChosen = D.getElementById('tv-file-chosen');
    var fileName = D.getElementById('tv-file-name');

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv') && file.type && file.type.indexOf('csv') < 0 && file.type.indexOf('text') < 0) {
      showStatus('File harus berformat .csv', 'error');
      return;
    }

    if (fileName) fileName.textContent = file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
    if (fileChosen) fileChosen.classList.add('visible');
    if (dropzone) dropzone.classList.add('has-file');

    showStatus('Membaca file CSV...', 'info');

    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var text = e.target.result;
        parsedRows = parseCSVContent(text);

        if (parsedRows.length === 0) {
          showStatus('Tidak ada data trade valid yang dapat dibaca dari file ini.', 'error');
          return;
        }

        hideStatus();
        showPreview();
      } catch (err) {
        console.error(err);
        showStatus('Gagal membaca CSV: ' + err.message, 'error');
      }
    };
    reader.onerror = function () {
      showStatus('Gagal membaca file dari perangkat.', 'error');
    };
    reader.readAsText(file);
  }

  function resetFileInput() {
    parsedRows = [];
    var fileInput = D.getElementById('tv-file-input');
    if (fileInput) fileInput.value = '';
    var fileChosen = D.getElementById('tv-file-chosen');
    if (fileChosen) fileChosen.classList.remove('visible');
    var dropzone = D.getElementById('tv-dropzone');
    if (dropzone) dropzone.classList.remove('has-file');
    var previewSec = D.getElementById('tv-preview-section');
    if (previewSec) previewSec.classList.remove('visible');
    var successCard = D.getElementById('tv-success-card');
    if (successCard) successCard.classList.remove('visible');
    hideStatus();
  }

  function showStatus(msg, type) {
    var el = D.getElementById('tv-parse-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'tv-parse-status visible ' + (type || 'info');
  }

  function hideStatus() {
    var el = D.getElementById('tv-parse-status');
    if (el) el.className = 'tv-parse-status';
  }

  /* --------------------------------------------------------------------------
     9. Render Preview Table
     -------------------------------------------------------------------------- */
  function showPreview() {
    var previewSec = D.getElementById('tv-preview-section');
    if (!previewSec) return;
    previewSec.classList.add('visible');

    var dupCount = parsedRows.filter(function (r) { return r.isDuplicate; }).length;
    var newCount = parsedRows.length - dupCount;

    var metaEl = D.getElementById('tv-preview-meta');
    if (metaEl) {
      metaEl.innerHTML =
        '<b>' + parsedRows.length + '</b> trade terdeteksi (' +
        '<span style="color:var(--tv-green);font-weight:600">' + newCount + ' baru</span>' +
        (dupCount > 0 ? ', <span style="color:var(--tv-red);font-weight:600">' + dupCount + ' duplikat</span>' : '') +
        ')';
    }

    renderTableRows();
    updateSummaryText();

    previewSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderTableRows() {
    var tbody = D.getElementById('tv-preview-tbody');
    if (!tbody) return;

    var html = '';
    parsedRows.forEach(function (r, idx) {
      var plClass = r.pl > 0 ? 'pos' : (r.pl < 0 ? 'neg' : 'zero');
      var plFormatted = (r.pl >= 0 ? '+' : '') + '$' + Number(r.pl).toFixed(2);
      var biasClass = r.bias.toLowerCase();

      html +=
        '<tr class="' + (r.isDuplicate ? 'is-dup' : '') + '">' +
          '<td>' +
            '<input type="checkbox" data-idx="' + idx + '" ' +
              (r.selected ? 'checked' : '') +
              (r.isDuplicate ? ' disabled title="Sudah pernah diimpor"' : '') +
            ' />' +
          '</td>' +
          '<td class="tv-cell-date">' + r.date + '</td>' +
          '<td class="tv-cell-pair">' + r.pair + '</td>' +
          '<td><span class="tv-cell-bias ' + biasClass + '">' + r.bias + '</span></td>' +
          '<td class="tv-cell-lot">' + r.lot + '</td>' +
          '<td class="tnum">' + (r.entryPrice !== null ? r.entryPrice : '—') + '</td>' +
          '<td class="tv-cell-pl ' + plClass + '">' + plFormatted + '</td>' +
          '<td>' +
            (r.isDuplicate ?
              '<span class="tv-cell-dup-label">Sudah Ada</span>' :
              '<span class="tv-cell-new-label">Baru</span>') +
          '</td>' +
        '</tr>';
    });

    tbody.innerHTML = html;

    // Pasang listener pada tiap checkbox individual
    var checkboxes = tbody.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(function (cb) {
      cb.addEventListener('change', function () {
        var idx = parseInt(cb.getAttribute('data-idx'), 10);
        if (!isNaN(idx) && parsedRows[idx]) {
          parsedRows[idx].selected = cb.checked;
          updateSummaryText();
        }
      });
    });
  }

  function updateSummaryText() {
    var selected = parsedRows.filter(function (r) { return r.selected && !r.isDuplicate; });
    var btn = D.getElementById('tv-btn-confirm-import');
    var sumEl = D.getElementById('tv-import-summary');

    // Ambil nama akun target
    var targetName = 'Akun Utama';
    if (W.AccountsManager && typeof W.AccountsManager.getAccounts === 'function') {
      var acc = W.AccountsManager.getAccounts().find(function (a) { return a.id === selectedAccountTargetId; });
      if (acc) targetName = acc.name;
    }

    if (btn) {
      btn.disabled = selected.length === 0;
      btn.textContent = 'Simpan ' + selected.length + ' Trade ke Jurnal';
    }

    if (sumEl) {
      var totalPl = selected.reduce(function (acc, r) { return acc + r.pl; }, 0);
      var plText = (totalPl >= 0 ? '+' : '') + '$' + totalPl.toFixed(2);
      sumEl.innerHTML =
        'Siap mengimpor <b>' + selected.length + ' trade</b> (Akumulasi P/L: <b>' + plText + '</b>) ke akun <b>' + targetName + '</b>. ' +
        'Seluruh trade baru akan otomatis ditandai memerlukan catatan refleksi psikologi.';
    }
  }

  /* --------------------------------------------------------------------------
     10. Batch Simpan Trade ke Firestore (Menjaga Format JEntries & Kalender)
     -------------------------------------------------------------------------- */
  async function saveSelectedTrades() {
    var selected = parsedRows.filter(function (r) { return r.selected && !r.isDuplicate; });
    if (selected.length === 0) {
      alert('Pilih setidaknya 1 trade baru untuk diimpor.');
      return;
    }

    var uid = null;
    if (W.currentUser && W.currentUser.uid) {
      uid = W.currentUser.uid;
    } else if (W.firebase && W.firebase.auth && W.firebase.auth().currentUser) {
      uid = W.firebase.auth().currentUser.uid;
    }
    if (!uid) {
      alert('Sesi login tidak ditemukan. Mohon masuk kembali.');
      return;
    }

    var db = W.db;
    if (!db && W.firebase && W.firebase.firestore) {
      db = W.firebase.firestore();
    }
    if (!db) {
      alert('Koneksi Firestore tidak siap.');
      return;
    }

    // Buka progress overlay
    var ov = D.getElementById('tv-progress-ov');
    var titleEl = D.getElementById('tv-progress-title');
    var subEl = D.getElementById('tv-progress-sub');
    var barEl = D.getElementById('tv-progress-bar');
    if (ov) ov.classList.remove('hidden');

    // Kelompokkan trade berdasarkan tanggal (YYYY-MM-DD)
    var groups = {};
    selected.forEach(function (trade) {
      if (!groups[trade.date]) groups[trade.date] = [];
      groups[trade.date].push(trade);
    });

    var dateKeys = Object.keys(groups);
    var totalDates = dateKeys.length;
    var processedDates = 0;
    var totalSavedCount = 0;
    var nowIso = new Date().toISOString();
    var FV = W.firebase.firestore.FieldValue;

    try {
      for (var d = 0; d < totalDates; d++) {
        var date = dateKeys[d];
        var tradesForDate = groups[date];

        if (titleEl) titleEl.textContent = 'Menyimpan ' + date + ' (' + (d + 1) + '/' + totalDates + ')...';
        if (subEl) subEl.textContent = tradesForDate.length + ' trade pada tanggal ini';
        if (barEl) barEl.style.width = Math.round(((d) / totalDates) * 100) + '%';

        var refTarget = db.collection('users').doc(uid).collection('journals').doc(date);

        // Eksekusi penulisan per tanggal dengan transaksi agar tidak menimpa trade manual yang sudah ada
        await db.runTransaction(async function (tx) {
          var tSnap = await tx.get(refTarget);
          var tDay = tSnap.exists ? tSnap.data() : null;
          var exEntries = (tDay && W.JEntries) ? W.JEntries.entriesOf(tDay) : [];

          // Konversi tiap trade ke skema JEntries
          var newEntries = tradesForDate.map(function (trade) {
            var eid = (W.JEntries && typeof W.JEntries.newEid === 'function') ?
              W.JEntries.newEid() :
              ('e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));

            return {
              eid: eid,
              date: trade.date,
              pair: trade.pair,
              bias: trade.bias,
              lot: trade.lot,
              pl: trade.pl,
              trades: 1,
              wins: trade.pl > 0 ? 1 : 0,
              be: trade.pl === 0 ? 1 : 0,
              accountId: selectedAccountTargetId || 'acc_default_main',
              source: 'tradingview',
              externalId: trade.externalId,
              syncedAt: nowIso,
              needsReflection: true,
              fees: trade.fees,
              createdMs: trade.createdMs || Date.now(),
              updatedMs: Date.now(),
              tags: ['TradingView'],
              notes: '',
              charts: [],
              emotions: [],
              rating: null,
              riskPct: null,
              rMultiple: null
            };
          });

          var combinedEntries = exEntries.concat(newEntries);
          var patch = (W.JEntries && typeof W.JEntries.dayPatch === 'function') ?
            W.JEntries.dayPatch(combinedEntries) :
            { entries: combinedEntries, pl: trade.pl, trades: combinedEntries.length };

          patch.date = date;
          patch.updatedAt = FV.serverTimestamp();
          if (!tDay) {
            patch.createdAt = FV.serverTimestamp();
          }

          tx.set(refTarget, patch, { merge: true });
        });

        totalSavedCount += tradesForDate.length;
        processedDates++;
      }

      if (barEl) barEl.style.width = '100%';

      // Update timestamp sinkronisasi pada akun yang bersangkutan
      if (W.AccountsManager && typeof W.AccountsManager.updateAccountLastSynced === 'function') {
        W.AccountsManager.updateAccountLastSynced(selectedAccountTargetId, nowIso);
      }

      // Muat ulang data journals agar kalender dan dashboard terupdate
      if (typeof W.loadJournals === 'function') {
        await W.loadJournals();
      }

      // Trigger event agar UI lain menyadari adanya pembaruan
      W.dispatchEvent(new CustomEvent('tv-import-completed', {
        detail: { count: totalSavedCount, accountId: selectedAccountTargetId }
      }));

      // Sembunyikan progress
      setTimeout(function () {
        if (ov) ov.classList.add('hidden');
        showSuccessView(totalSavedCount);
      }, 300);

    } catch (err) {
      console.error('Error saat menyimpan trade CSV:', err);
      if (ov) ov.classList.add('hidden');
      alert('Gagal menyimpan beberapa trade: ' + err.message);
    }
  }

  /* --------------------------------------------------------------------------
     11. Success View
     -------------------------------------------------------------------------- */
  function showSuccessView(count) {
    var previewSec = D.getElementById('tv-preview-section');
    if (previewSec) previewSec.classList.remove('visible');

    var dropzone = D.getElementById('tv-dropzone');
    if (dropzone) dropzone.classList.remove('has-file');

    var card = D.getElementById('tv-success-card');
    var msgEl = D.getElementById('tv-success-msg');

    var targetName = 'Akun';
    if (W.AccountsManager && typeof W.AccountsManager.getAccounts === 'function') {
      var acc = W.AccountsManager.getAccounts().find(function (a) { return a.id === selectedAccountTargetId; });
      if (acc) targetName = acc.name;
    }

    if (msgEl) {
      msgEl.innerHTML =
        'Berhasil mengimpor <b>' + count + ' trade</b> ke <b>' + targetName + '</b>.<br>' +
        'Data telah tersimpan di kalender &amp; dashboard. Buka jurnal untuk melengkapi refleksi psikologi Anda.';
    }

    if (card) {
      card.classList.add('visible');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (W.IosHaptics) {
      W.IosHaptics.notification('success');
    }
  }

  /* --------------------------------------------------------------------------
     12. Helper: Hitung Trade yang Memerlukan Refleksi
     -------------------------------------------------------------------------- */
  function countNeedsReflection(filterAccountId) {
    var count = 0;
    try {
      var allJ = W.allJournals;
      if (Array.isArray(allJ) && W.JEntries) {
        allJ.forEach(function (day) {
          var rows = W.JEntries.rowsOf(day);
          rows.forEach(function (r) {
            var matchAcct = !filterAccountId || r.accountId === filterAccountId;
            if (matchAcct && r.needsReflection === true) {
              count++;
            }
          });
        });
      }
    } catch (e) {}
    return count;
  }

  function updateNavBadge() {
    var navBtn = D.getElementById('nav-accounts');
    if (!navBtn) return;
    var count = countNeedsReflection();
    var existingBadge = navBtn.querySelector('.tv-reflection-badge');
    if (count > 0) {
      if (!existingBadge) {
        navBtn.style.position = 'relative';
        var b = D.createElement('span');
        b.className = 'tv-reflection-badge';
        b.textContent = count > 99 ? '99+' : count;
        navBtn.appendChild(b);
      } else {
        existingBadge.textContent = count > 99 ? '99+' : count;
      }
    } else if (existingBadge) {
      existingBadge.remove();
    }
  }

  /* --------------------------------------------------------------------------
     13. Inisialisasi & Global Exposure
     -------------------------------------------------------------------------- */
  function init() {
    renderView();
    updateNavBadge();
    W.addEventListener('tv-import-completed', updateNavBadge);
    W.addEventListener('journal-saved', updateNavBadge);
  }

  function open(targetAccountId) {
    if (targetAccountId) {
      selectedAccountTargetId = targetAccountId;
    }
    renderView();
    updateNavBadge();
    if (typeof W.switchView === 'function') {
      W.switchView('tvimport');
      W.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  W.TradingViewImport = {
    init: init,
    open: open,
    renderView: renderView,
    parseCSV: parseCSV,
    parseCSVContent: parseCSVContent,
    countNeedsReflection: countNeedsReflection,
    updateNavBadge: updateNavBadge
  };

  if (D.readyState === 'loading') {
    D.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 50);
  }

})(window, document);
