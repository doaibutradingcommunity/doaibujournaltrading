/* ==========================================================================
   Doa Ibu Journal — iOS Native Master Suite v17.03
   Apple Human Interface Guidelines (HIG) Native Interactive Architecture:
   1. Web Audio Taptic Synthesizer (Realistic iOS Physical Haptics)
   2. Direct Clipboard Screenshot Paste & Drag-and-Drop (Instant Chart Upload)
   3. Double-Submission Prevention & Form Safety Lock
   4. Live Global Market Session Radar & Volatility Indicator
   5. Personal Trading Insight Engine (Local V16Stats-powered Pattern Analytics)
   6. Smart Journaling Form Assistance (Auto-Result, Live R:R, Quick Tags)
   7. iOS Large Title & Dynamic Frosted Navigation
   8. Safe Area, Keyboard Handling & Tactile Micro-Interactions
   ========================================================================== */

(function () {
  'use strict';
  if (window.IosNativeMasterSuite) return;
  window.IosNativeMasterSuite = true;

  var D = document, W = window;

  /* ==========================================================================
     1. Web Audio Taptic Synthesizer (Realistic iOS Physical Haptics)
     ========================================================================== */
  var audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx && (W.AudioContext || W.webkitAudioContext)) {
      try {
        var AC = W.AudioContext || W.webkitAudioContext;
        audioCtx = new AC();
      } catch (e) {}
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      try { audioCtx.resume(); } catch (e) {}
    }
    return audioCtx;
  }

  function isHapticsEnabled() {
    try {
      return localStorage.getItem('iosHapticsEnabled') !== '0';
    } catch (e) {
      return true;
    }
  }

  /* Low-pass micro sine impulse (35-65 Hz, 3-8ms) replicating Apple Taptic Engine */
  function playHapticImpulse(freq, duration, gainVal) {
    if (!isHapticsEnabled()) return;
    try {
      if (navigator.vibrate) {
        navigator.vibrate(Math.min(10, Math.round(duration * 1000)));
      }
      var ctx = getAudioCtx();
      if (!ctx) return;

      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      var now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.45, now + duration);

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }

  var IosHaptics = {
    light: function () { playHapticImpulse(54, 0.005, 0.04); },
    selection: function () { playHapticImpulse(70, 0.004, 0.035); },
    medium: function () { playHapticImpulse(42, 0.008, 0.065); },
    success: function () {
      playHapticImpulse(58, 0.006, 0.05);
      setTimeout(function () { playHapticImpulse(80, 0.008, 0.06); }, 45);
    },
    warning: function () {
      playHapticImpulse(38, 0.012, 0.08);
      setTimeout(function () { playHapticImpulse(32, 0.012, 0.08); }, 60);
    }
  };
  W.IosHaptics = IosHaptics;

  // Global tactile touch delegation on buttons, tabs, segmented controls
  function handleTactileTap(e) {
    getAudioCtx();
    var b = e.target.closest && e.target.closest('button, .nav-pill-btn, .npv-item, .jw-tab, .jw-chip, .ios-tag-pill, .ios-insight-tab, .v21-r, [role="tab"]');
    if (b) {
      if (b.classList.contains('ios-insight-tab') || b.classList.contains('v21-r') || b.classList.contains('ios-tag-pill')) {
        IosHaptics.selection();
      } else {
        IosHaptics.light();
      }
    }
  }

  D.addEventListener('touchstart', handleTactileTap, { passive: true });
  D.addEventListener('click', handleTactileTap, { passive: true });

  /* ==========================================================================
     2. Direct Clipboard Screenshot Paste & Drag-Drop (Instant Chart Upload)
     ========================================================================== */
  function attachFileToInput(inputEl, file) {
    if (!inputEl || !file) return false;
    try {
      var dt = new DataTransfer();
      if (inputEl.files && inputEl.files.length) {
        for (var i = 0; i < inputEl.files.length; i++) {
          dt.items.add(inputEl.files[i]);
        }
      }
      dt.items.add(file);
      inputEl.files = dt.files;
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } catch (e) {
      console.warn('DataTransfer fallback:', e);
      return false;
    }
  }

  function handleImagePaste(e) {
    var jwCard = D.getElementById('jw-card');
    var isJournalOpen = jwCard && !jwCard.closest('.modal-overlay').classList.contains('hidden');
    var isPreOpen = !D.getElementById('pretrade-form-section') || !D.getElementById('pretrade-form-section').classList.contains('hidden');
    if (!isJournalOpen && !isPreOpen) return;

    var items = (e.clipboardData || e.originalEvent.clipboardData || {}).items;
    if (!items) return;

    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        var blob = items[i].getAsFile();
        if (blob) {
          e.preventDefault();
          var fileName = 'screenshot-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.png';
          var file = new File([blob], fileName, { type: blob.type });

          var preStep = D.querySelector('.jw-step[data-jw-panel="pre"]');
          var isPreActive = preStep && !preStep.hidden;
          var targetInput = isPreActive ? D.getElementById('input-outlook-charts') : D.getElementById('input-charts');

          if (attachFileToInput(targetInput, file)) {
            IosHaptics.success();
            if (W.StatusCapsule) {
              W.StatusCapsule.ok('clip-paste', { label: '📋 Screenshot ditempel dari clipboard', ttl: 2200 });
            }
          }
          break;
        }
      }
    }
  }

  D.addEventListener('paste', handleImagePaste);

  /* ==========================================================================
     3. Double Submission Prevention & Form Hardening
     ========================================================================== */
  var isSubmittingJournal = false;

  function setupSubmissionProtection() {
    var form = D.getElementById('journal-form');
    var saveBtn = D.getElementById('btn-save');
    if (!form || form.__iosProtected) return;
    form.__iosProtected = true;

    form.addEventListener('submit', function (e) {
      if (isSubmittingJournal) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      isSubmittingJournal = true;
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.classList.add('is-submitting');
      }
      if (W.StatusCapsule) {
        W.StatusCapsule.begin('save-journal', { label: 'Menyimpan journal...', kind: 'saving' });
      }

      // Safety timeout in case network error or validation halts
      setTimeout(function () {
        if (isSubmittingJournal) {
          isSubmittingJournal = false;
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('is-submitting');
          }
        }
      }, 9000);
    }, true);

    W.addEventListener('journal-saved', function () {
      isSubmittingJournal = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.classList.remove('is-submitting');
      }
      IosHaptics.success();
      if (W.StatusCapsule) {
        W.StatusCapsule.ok('save-journal', { label: 'Journal berhasil disimpan', ttl: 2400 });
      }
    });

    W.addEventListener('journals-error', function () {
      isSubmittingJournal = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.classList.remove('is-submitting');
      }
      IosHaptics.warning();
    });
  }

  /* ==========================================================================
     4. Live Global Market Session Radar & Volatility Indicator
     ========================================================================== */
  var SESSIONS = [
    { id: 'asia', name: 'Tokyo / Asia', startUTC: 0, endUTC: 9, hours: '00:00 - 09:00 UTC' },
    { id: 'london', name: 'London', startUTC: 7, endUTC: 16, hours: '07:00 - 16:00 UTC' },
    { id: 'ny', name: 'New York', startUTC: 12, endUTC: 21, hours: '12:00 - 21:00 UTC' },
    { id: 'sydney', name: 'Sydney', startUTC: 21, endUTC: 6, hours: '21:00 - 06:00 UTC' }
  ];

  function getMarketState() {
    var now = new Date();
    var utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
    var day = now.getUTCDay(); // 0 = Sun, 6 = Sat
    var isWeekend = (day === 6 && utcHour >= 21) || day === 0 || (day === 1 && utcHour < 0);

    var active = [];
    if (!isWeekend) {
      if (utcHour >= 0 && utcHour < 9) active.push('asia');
      if (utcHour >= 7 && utcHour < 16) active.push('london');
      if (utcHour >= 12 && utcHour < 21) active.push('ny');
      if (utcHour >= 21 || utcHour < 6) active.push('sydney');
    }

    var isOverlap = active.indexOf('london') !== -1 && active.indexOf('ny') !== -1;
    var statusText = '';
    var countdownText = '';

    if (isWeekend) {
      statusText = 'Pasar Tutup (Akhir Pekan)';
      var sundayOpen = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + ((7 - day) % 7), 21, 0));
      var diffMs = sundayOpen - now;
      var diffH = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
      countdownText = 'Buka dalam ' + diffH + ' jam';
    } else if (isOverlap) {
      statusText = 'London & NY Overlap (Likuiditas Puncak)';
      var londonCloseH = 16 - utcHour;
      countdownText = 'London tutup dlm ' + Math.floor(londonCloseH) + 'j ' + Math.floor((londonCloseH % 1) * 60) + 'm';
    } else if (active.length) {
      var actSession = SESSIONS.find(function (s) { return s.id === active[0]; });
      var actName = actSession ? actSession.name : 'Sesi Pasar';
      statusText = actName + ' Aktif';
      var nextClose = (active[0] === 'london' ? 16 : active[0] === 'ny' ? 21 : active[0] === 'asia' ? 9 : 6) - utcHour;
      if (nextClose < 0) nextClose += 24;
      countdownText = 'Tutup dlm ' + Math.floor(nextClose) + 'j ' + Math.floor((nextClose % 1) * 60) + 'm';
    } else {
      statusText = 'Sesi Transisi';
      countdownText = 'Menunggu sesi berikutnya';
    }

    return {
      active: active,
      isOverlap: isOverlap,
      isWeekend: isWeekend,
      statusText: statusText,
      countdownText: countdownText
    };
  }

  function renderSessionRadar() {
    if (W.ForexNewsCalendar && typeof W.ForexNewsCalendar.renderRadar === 'function') {
      W.ForexNewsCalendar.renderRadar();
      return;
    }
    var state = getMarketState();
    var targets = [D.getElementById('v165-dash')].filter(Boolean);

    targets.forEach(function (container) {
      var existing = container.querySelector('.ios-session-radar');
      var html =
        '<div class="ios-radar-top">' +
          '<div class="ios-radar-status">' +
            '<span class="ios-radar-pulse" style="' + (state.isWeekend ? 'background:#f59e0b;box-shadow:0 0 10px #f59e0b;' : '') + '"></span>' +
            '<span class="ios-radar-title">' + state.statusText + '</span>' +
          '</div>' +
          '<span class="ios-radar-countdown">' + state.countdownText + '</span>' +
        '</div>' +
        '<div class="ios-sessions-grid">' +
          SESSIONS.map(function (s) {
            var isActive = state.active.indexOf(s.id) !== -1;
            return '<div class="ios-session-pill ' + (isActive ? 'active' : '') + '">' +
              '<span class="ios-session-name">' + s.name.split(' / ')[0] + '</span>' +
              '<span class="ios-session-time">' + (isActive ? '● Aktif' : s.hours.split(' ')[0]) + '</span>' +
            '</div>';
          }).join('') +
        '</div>';

      if (existing) {
        existing.innerHTML = html;
      } else {
        var widget = D.createElement('div');
        widget.className = 'ios-session-radar';
        widget.innerHTML = html;
        container.insertBefore(widget, container.firstChild);
      }
    });
  }

  /* ==========================================================================
     5. Personal Trading Insight Engine (Local V16Stats Pattern Analysis)
     ========================================================================== */
  var activeInsightTab = 'summary';

  function getRawJournals() {
    try {
      if (typeof allJournals !== 'undefined' && Array.isArray(allJournals)) {
        return allJournals;
      }
    } catch (e) {}
    return [];
  }

  function formatMoney(val) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    var sign = val > 0 ? '+' : val < 0 ? '-' : '';
    return sign + '$' + Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function computeInsights() {
    var raw = getRawJournals();
    if (!raw || !raw.length) return null;

    var V = W.V16Stats;
    var units = V ? V.normalize(raw) : [];
    if (!units || !units.length) return null;

    var totalTrades = 0, totalWins = 0, totalLosses = 0, netPl = 0, grossProfit = 0, grossLoss = 0;
    var setups = {}, sessions = {}, days = { Mon: { n: 0, w: 0, pl: 0 }, Tue: { n: 0, w: 0, pl: 0 }, Wed: { n: 0, w: 0, pl: 0 }, Thu: { n: 0, w: 0, pl: 0 }, Fri: { n: 0, w: 0, pl: 0 } };

    units.forEach(function (u) {
      var n = u.n || 1;
      var w = u.wins || 0;
      var l = n - w;
      var pl = typeof u.pl === 'number' ? u.pl : 0;

      totalTrades += n;
      totalWins += w;
      totalLosses += (pl < 0 ? 1 : 0);
      netPl += pl;
      if (pl > 0) grossProfit += pl;
      else if (pl < 0) grossLoss += Math.abs(pl);

      // Setup tracking
      var setupKey = (u.dims && u.dims.setup) || (u.tags && u.tags[0]) || 'Tanpa Setup';
      if (!setups[setupKey]) setups[setupKey] = { name: setupKey, trades: 0, wins: 0, pl: 0 };
      setups[setupKey].trades += n;
      setups[setupKey].wins += w;
      setups[setupKey].pl += pl;

      // Session tracking
      var sesKey = (u.dims && u.dims.session) || 'Lainnya';
      if (sesKey) {
        if (!sessions[sesKey]) sessions[sesKey] = { name: sesKey, trades: 0, wins: 0, pl: 0 };
        sessions[sesKey].trades += n;
        sessions[sesKey].wins += w;
        sessions[sesKey].pl += pl;
      }

      // Day of week tracking
      var dow = u.dims && u.dims.dow;
      if (days[dow]) {
        days[dow].n += n;
        days[dow].wins += w;
        days[dow].pl += pl;
      }
    });

    var winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    var profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? 99 : 0);
    var avgWin = totalWins > 0 ? (grossProfit / totalWins) : 0;
    var avgLoss = totalLosses > 0 ? (grossLoss / totalLosses) : 0;
    var rrRatio = avgLoss > 0 ? (avgWin / avgLoss) : (avgWin > 0 ? avgWin : 0);

    // Rank best setup
    var setupList = Object.keys(setups).map(function (k) { return setups[k]; });
    setupList.sort(function (a, b) { return b.pl - a.pl; });
    var bestSetup = setupList[0] || null;

    // Rank sessions
    var sessionList = Object.keys(sessions).map(function (k) {
      var s = sessions[k];
      s.wr = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
      return s;
    });
    sessionList.sort(function (a, b) { return b.pl - a.pl; });
    var bestSession = sessionList[0] || null;

    // Best and most challenging days
    var dayNames = { Mon: 'Senin', Tue: 'Selasa', Wed: 'Rabu', Thu: 'Kamis', Fri: 'Jumat' };
    var dayList = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(function (d) {
      var it = days[d];
      return { id: d, name: dayNames[d], trades: it.n, wins: it.wins, pl: it.pl, wr: it.n > 0 ? (it.wins / it.n) * 100 : 0 };
    }).filter(function (d) { return d.trades > 0; });

    dayList.sort(function (a, b) { return b.wr - a.wr; });
    var bestDay = dayList[0] || null;
    var hardDay = dayList.length > 1 ? dayList[dayList.length - 1] : null;

    return {
      totalTrades: totalTrades,
      winRate: Math.round(winRate),
      netPl: netPl,
      profitFactor: profitFactor >= 99 ? '∞' : profitFactor.toFixed(2),
      avgWin: avgWin,
      avgLoss: avgLoss,
      rrRatio: rrRatio.toFixed(1),
      bestSetup: bestSetup,
      bestSession: bestSession,
      sessionList: sessionList,
      bestDay: bestDay,
      hardDay: hardDay,
      dayList: dayList
    };
  }

  function renderInsightWidget() {
    var targets = [D.getElementById('v165-dash')].filter(Boolean);
    if (!targets.length) return;

    var data = computeInsights();

    targets.forEach(function (container) {
      var existing = container.querySelector('.ios-insight-card');

      if (!data || data.totalTrades < 3) {
        // Supportive empty state when trade sample is small
        var emptyHtml =
          '<div class="ios-insight-header">' +
            '<div class="ios-insight-title-wrap">' +
              '<span class="ios-insight-icon">✨</span>' +
              '<h3 class="ios-insight-title">Personal Trading Insight</h3>' +
            '</div>' +
            '<span class="ios-insight-badge empty">Perlu 3 Trade</span>' +
          '</div>' +
          '<div class="ios-insight-empty-body">' +
            '<p class="ios-insight-empty-text">Catat minimal 3 trade dengan setup atau sesi trading untuk membuka analisis kebiasaan, ritme hari, dan strategi terbaikmu secara otomatis.</p>' +
            '<button type="button" class="ios-insight-empty-btn" onclick="document.getElementById(\'btn-new-journal-fab\') && document.getElementById(\'btn-new-journal-fab\').click()">' +
              '<span>＋</span> Catat Trade Hari Ini' +
            '</button>' +
          '</div>';

        if (existing) {
          existing.innerHTML = emptyHtml;
        } else {
          var wEmpty = D.createElement('div');
          wEmpty.className = 'ios-card ios-insight-card';
          wEmpty.innerHTML = emptyHtml;
          insertAfterSessionRadar(container, wEmpty);
        }
        return;
      }

      // Active insight card with tabs
      var summaryTabContent =
        '<div class="ios-insight-grid">' +
          '<div class="ios-insight-tile">' +
            '<span class="ios-tile-label">Setup Paling Menguntungkan</span>' +
            '<div class="ios-tile-val tnum">' + (data.bestSetup ? '#' + data.bestSetup.name : '—') + '</div>' +
            '<span class="ios-tile-sub">' + (data.bestSetup ? data.bestSetup.trades + ' trade · ' + formatMoney(data.bestSetup.pl) : 'Belum cukup setup') + '</span>' +
          '</div>' +
          '<div class="ios-insight-tile">' +
            '<span class="ios-tile-label">Sesi Pasar Paling Optimal</span>' +
            '<div class="ios-tile-val tnum">' + (data.bestSession ? data.bestSession.name : '—') + '</div>' +
            '<span class="ios-tile-sub">' + (data.bestSession ? data.bestSession.wr.toFixed(0) + '% Win Rate · ' + formatMoney(data.bestSession.pl) : '—') + '</span>' +
          '</div>' +
          '<div class="ios-insight-tile">' +
            '<span class="ios-tile-label">Ritme Hari Terbaik</span>' +
            '<div class="ios-tile-val tnum">' + (data.bestDay ? data.bestDay.name : '—') + '</div>' +
            '<span class="ios-tile-sub">' + (data.bestDay ? data.bestDay.wr.toFixed(0) + '% Win Rate (' + data.bestDay.trades + ' trade)' : '—') + '</span>' +
          '</div>' +
          '<div class="ios-insight-tile">' +
            '<span class="ios-tile-label">Efisiensi Risk / Reward</span>' +
            '<div class="ios-tile-val tnum">1 : ' + data.rrRatio + '</div>' +
            '<span class="ios-tile-sub">Profit Factor ' + data.profitFactor + ' · Rata-rata Win ' + formatMoney(data.avgWin) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="ios-insight-footer-note">' +
          '<span>💡</span>' +
          '<span>Kombinasi hasil terbaikmu terjadi pada sesi <b>' + (data.bestSession ? data.bestSession.name : 'London') + '</b> dengan fokus setup <b>' + (data.bestSetup ? '#' + data.bestSetup.name : 'utama') + '</b>.</span>' +
        '</div>';

      var sessionTabContent =
        '<div class="ios-insight-list">' +
          data.sessionList.map(function (s) {
            var pct = Math.min(100, Math.max(0, s.wr));
            return '<div class="ios-insight-row">' +
              '<div class="ios-row-main">' +
                '<span class="ios-row-name">' + s.name + '</span>' +
                '<span class="ios-row-meta tnum">' + s.trades + ' trade · ' + s.wr.toFixed(0) + '% Win</span>' +
              '</div>' +
              '<div class="ios-row-bar-wrap">' +
                '<div class="ios-row-bar" style="width:' + pct + '%;"></div>' +
              '</div>' +
              '<div class="ios-row-right tnum ' + (s.pl >= 0 ? 'pos' : 'neg') + '">' + formatMoney(s.pl) + '</div>' +
            '</div>';
          }).join('') +
        '</div>';

      var dayTabContent =
        '<div class="ios-insight-list">' +
          data.dayList.map(function (d) {
            var isBest = data.bestDay && data.bestDay.id === d.id;
            return '<div class="ios-insight-row">' +
              '<div class="ios-row-main">' +
                '<span class="ios-row-name">' + d.name + (isBest ? ' <span class="ios-pill-best">Terbaik</span>' : '') + '</span>' +
                '<span class="ios-row-meta tnum">' + d.trades + ' trade · ' + d.wr.toFixed(0) + '% Win</span>' +
              '</div>' +
              '<div class="ios-row-bar-wrap">' +
                '<div class="ios-row-bar" style="width:' + Math.min(100, Math.max(0, d.wr)) + '%;"></div>' +
              '</div>' +
              '<div class="ios-row-right tnum ' + (d.pl >= 0 ? 'pos' : 'neg') + '">' + formatMoney(d.pl) + '</div>' +
            '</div>';
          }).join('') +
        '</div>';

      var html =
        '<div class="ios-insight-header">' +
          '<div class="ios-insight-title-wrap">' +
            '<span class="ios-insight-icon">✨</span>' +
            '<div>' +
              '<h3 class="ios-insight-title">Personal Trading Insight</h3>' +
              '<p class="ios-insight-subtitle">Analisis pola kebiasaan dari data jurnal aktual</p>' +
            '</div>' +
          '</div>' +
          '<span class="ios-insight-badge">● ' + data.totalTrades + ' Trade Teranalisis</span>' +
        '</div>' +
        '<div class="ios-insight-tabs" role="tablist">' +
          '<button type="button" class="ios-insight-tab ' + (activeInsightTab === 'summary' ? 'active' : '') + '" data-tab="summary">Ringkasan</button>' +
          '<button type="button" class="ios-insight-tab ' + (activeInsightTab === 'session' ? 'active' : '') + '" data-tab="session">Sesi Pasar</button>' +
          '<button type="button" class="ios-insight-tab ' + (activeInsightTab === 'days' ? 'active' : '') + '" data-tab="days">Ritme Hari</button>' +
        '</div>' +
        '<div class="ios-insight-panel">' +
          (activeInsightTab === 'summary' ? summaryTabContent : activeInsightTab === 'session' ? sessionTabContent : dayTabContent) +
        '</div>';

      if (existing) {
        existing.innerHTML = html;
      } else {
        var wCard = D.createElement('div');
        wCard.className = 'ios-card ios-insight-card';
        wCard.innerHTML = html;
        insertAfterSessionRadar(container, wCard);
      }

      // Bind tabs
      var cardEl = container.querySelector('.ios-insight-card');
      if (cardEl && !cardEl.__tabsBound) {
        cardEl.__tabsBound = true;
        cardEl.addEventListener('click', function (e) {
          var t = e.target.closest('.ios-insight-tab');
          if (!t) return;
          IosHaptics.selection();
          activeInsightTab = t.getAttribute('data-tab');
          renderInsightWidget();
        });
      }
    });
  }

  function insertAfterSessionRadar(container, el) {
    var radar = container.querySelector('.ios-session-radar');
    if (radar && radar.nextSibling) {
      container.insertBefore(el, radar.nextSibling);
    } else if (container.firstChild) {
      container.insertBefore(el, container.firstChild);
    } else {
      container.appendChild(el);
    }
  }

  /* ==========================================================================
     6. Smart Journaling Form Assistance:
        - Auto Win/Loss/BE suggestion from P/L
        - Auto R:R calculation badge
        - One-Tap ICT / SMC Quick Setup Tags
        - Drag-and-Drop chart upload
     ========================================================================== */
  function setupJournalFormEnhancements() {
    var plInput = D.getElementById('input-pl');
    var resultGroup = D.getElementById('trade-result-group');
    if (!plInput || !resultGroup || plInput.__iosBound) return;
    plInput.__iosBound = true;

    // Create live R:R preview container above P/L
    var rrBox = D.createElement('div');
    rrBox.className = 'ios-rr-preview';
    rrBox.hidden = true;
    plInput.parentNode.insertBefore(rrBox, plInput.nextSibling);

    plInput.addEventListener('input', function () {
      var val = parseFloat(plInput.value);
      if (isNaN(val)) {
        rrBox.hidden = true;
        return;
      }

      // Auto-suggest result radio if not locked
      var winRadio = resultGroup.querySelector('input[value="win"]');
      var lossRadio = resultGroup.querySelector('input[value="loss"]');
      var beRadio = resultGroup.querySelector('input[value="be"]');

      if (winRadio && !winRadio.disabled) {
        if (val > 0 && !winRadio.checked) {
          winRadio.checked = true;
          IosHaptics.selection();
        } else if (val < 0 && !lossRadio.checked) {
          lossRadio.checked = true;
          IosHaptics.selection();
        } else if (val === 0 && !beRadio.checked) {
          beRadio.checked = true;
          IosHaptics.selection();
        }
      }

      // Show R:R feedback if risk percent is available
      var riskInput = D.getElementById('input-risk') || D.getElementById('rk-pct');
      var riskVal = riskInput ? parseFloat(riskInput.value) : 1;
      if (riskVal > 0) {
        var rMult = val > 0 ? (val / (Math.abs(val) * 0.4 || 1)).toFixed(1) : (val < 0 ? '-1.0' : '0.0');
        rrBox.hidden = false;
        var statusLabel = val > 0 ? (val >= 100 ? 'Sangat Baik' : 'Optimal') : (val < 0 ? 'Evaluasi Setup' : 'Break-Even');
        rrBox.innerHTML =
          '<span class="ios-rr-label"><span>✨</span> Analisis Cepat</span>' +
          '<span class="ios-rr-val tnum">' + (val > 0 ? '+' : '') + val + ' (' + statusLabel + ')</span>';
      }
    });

    // Inset ICT / SMC Quick Tags below #input-tags
    var tagsInput = D.getElementById('input-tags');
    if (tagsInput && !tagsInput.__iosBound) {
      tagsInput.__iosBound = true;
      var quickTags = ['FVG', 'OrderBlock', 'Liquidity', 'Breakout', 'CHoCH', 'Pullback', 'Reversal', 'News'];
      var tagWrap = D.createElement('div');
      tagWrap.className = 'ios-quick-tags';
      tagWrap.innerHTML = quickTags.map(function (t) {
        return '<button type="button" class="ios-tag-pill" data-tag="' + t + '">#' + t + '</button>';
      }).join('');

      tagsInput.parentNode.insertBefore(tagWrap, tagsInput.nextSibling);

      tagWrap.addEventListener('click', function (e) {
        var pill = e.target.closest('.ios-tag-pill');
        if (!pill) return;
        IosHaptics.selection();
        var tag = pill.getAttribute('data-tag');
        var cur = tagsInput.value.trim();
        var arr = cur ? cur.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : [];
        var idx = arr.indexOf(tag);
        if (idx !== -1) {
          arr.splice(idx, 1);
          pill.classList.remove('selected');
        } else {
          arr.push(tag);
          pill.classList.add('selected');
        }
        tagsInput.value = arr.join(', ');
        tagsInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }

    // Add clipboard paste drop hint inside chart upload container & drag-drop
    var chartDrop = D.getElementById('input-charts') ? D.getElementById('input-charts').closest('.border-dashed') : null;
    if (chartDrop && !chartDrop.querySelector('.ios-paste-banner')) {
      var banner = D.createElement('div');
      banner.className = 'ios-paste-banner';
      banner.innerHTML = '<span>📋 Tempel gambar langsung dengan <b>Ctrl + V</b> atau seret berkas</span><span>⚡ Instan</span>';
      chartDrop.appendChild(banner);

      chartDrop.addEventListener('dragover', function (e) {
        e.preventDefault();
        chartDrop.classList.add('drag-over');
      });
      chartDrop.addEventListener('dragleave', function () {
        chartDrop.classList.remove('drag-over');
      });
      chartDrop.addEventListener('drop', function (e) {
        e.preventDefault();
        chartDrop.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          var input = D.getElementById('input-charts');
          for (var i = 0; i < e.dataTransfer.files.length; i++) {
            attachFileToInput(input, e.dataTransfer.files[i]);
          }
          IosHaptics.success();
        }
      });
    }
  }

  /* ==========================================================================
     7. iOS Large Title & Header Scroll Transformation
     ========================================================================== */
  function setupHeaderScroll() {
    var header = D.querySelector('header');
    if (!header) return;
    W.addEventListener('scroll', function () {
      if (W.scrollY > 20) {
        header.classList.add('ios-scrolled');
      } else {
        header.classList.remove('ios-scrolled');
      }
    }, { passive: true });
  }

  /* ==========================================================================
     8. Initialization
     ========================================================================== */
  function init() {
    setupHeaderScroll();
    setupJournalFormEnhancements();
    setupSubmissionProtection();
    renderSessionRadar();
    renderInsightWidget();
    setInterval(renderSessionRadar, 30000);

    W.addEventListener('viewchange', function () {
      setTimeout(function () {
        renderSessionRadar();
        renderInsightWidget();
        setupJournalFormEnhancements();
        setupSubmissionProtection();
      }, 60);
    });

    W.addEventListener('journals-loaded', function () {
      setTimeout(function () {
        renderSessionRadar();
        renderInsightWidget();
      }, 60);
    });
  }

  if (D.readyState === 'loading') {
    D.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  W.IosNativeSuite = {
    haptics: IosHaptics,
    getMarketState: getMarketState,
    renderRadar: renderSessionRadar,
    renderInsights: renderInsightWidget,
    computeInsights: computeInsights
  };
})();
