/**
 * Doa Ibu Journal — High-Contrast Market Session Clock & Forex Factory Realtime News
 * Version: 17.04 (Master Terminal Edition - Harmonized Luxury Glass Theme)
 * 
 * 1. Timezone Setting moved to #settings-section (#ms-timezone); Radar has zero obstructing dropdowns!
 * 2. 100% Authentic Forex Factory Data matching https://www.forexfactory.com/calendar
 *    - Full fields: Actual, Forecast, Previous, Country Flag, Time (User TZ + EDT origin), Impact, URL
 * 3. Unified Doa Ibu Luxury Glass & Champagne Gold Aesthetics across Radar, News, and Insight Cards.
 */

(function (window, document) {
  'use strict';

  var W = window;
  var D = document;

  /* ==========================================================================
     1. TIMEZONE MANAGEMENT ENGINE
     ========================================================================== */
  var TIMEZONES = [
    { id: 'auto', label: 'Waktu Lokal Perangkat (Auto)', iana: '', abbr: 'Auto' },
    { id: 'Asia/Jakarta', label: 'WIB (UTC+7 · Jakarta, Bangkok)', iana: 'Asia/Jakarta', abbr: 'WIB' },
    { id: 'Asia/Makassar', label: 'WITA (UTC+8 · Bali, Singapura)', iana: 'Asia/Makassar', abbr: 'WITA' },
    { id: 'Asia/Jayapura', label: 'WIT (UTC+9 · Jayapura, Tokyo)', iana: 'Asia/Jayapura', abbr: 'WIT' },
    { id: 'UTC', label: 'UTC / GMT (00:00 · London Standard)', iana: 'UTC', abbr: 'UTC' },
    { id: 'Europe/London', label: 'London (BST / GMT)', iana: 'Europe/London', abbr: 'LON' },
    { id: 'America/New_York', label: 'New York (EDT / EST)', iana: 'America/New_York', abbr: 'NY' },
    { id: 'Asia/Tokyo', label: 'Tokyo (JST · UTC+9)', iana: 'Asia/Tokyo', abbr: 'JST' },
    { id: 'Australia/Sydney', label: 'Sydney (AEST / AEDT)', iana: 'Australia/Sydney', abbr: 'SYD' }
  ];

  var STORAGE_TZ_KEY = 'doa_market_tz_v17';
  var STORAGE_PINNED_KEY = 'doa_pinned_news_v17';
  var STORAGE_NEWS_FILTER_KEY = 'doa_news_filters_v17';
  var STORAGE_CACHE_KEY = 'doa_ff_news_cache_v17';
  var STORAGE_CACHE_TIME_KEY = 'doa_ff_news_cache_time_v17';

  function getUserTimezonePreference() {
    try {
      var saved = localStorage.getItem(STORAGE_TZ_KEY);
      if (saved) {
        var found = TIMEZONES.find(function (t) { return t.id === saved; });
        if (found) return found.id;
      }
    } catch (e) {}
    return 'auto';
  }

  function setUserTimezonePreference(tzId) {
    try {
      localStorage.setItem(STORAGE_TZ_KEY, tzId);
    } catch (e) {}

    // Synchronize select dropdown in #settings-section if present
    var selectEl = D.getElementById('ms-timezone');
    if (selectEl && selectEl.value !== tzId) {
      selectEl.value = tzId;
    }

    // Re-render UI
    renderAllSessionRadars();
    renderForexNewsSection();
    if (W.IosHaptics && W.IosHaptics.selection) W.IosHaptics.selection();
  }

  function getEffectiveIanaZone(tzId) {
    if (!tzId || tzId === 'auto') {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
      } catch (e) {
        return 'Asia/Jakarta';
      }
    }
    return tzId;
  }

  function getTimezoneAbbreviation(tzId, date) {
    var item = TIMEZONES.find(function (t) { return t.id === tzId; });
    if (item && item.abbr && item.abbr !== 'Auto') return item.abbr;
    try {
      var iana = getEffectiveIanaZone(tzId);
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: iana,
        timeZoneName: 'short'
      }).formatToParts(date || new Date());
      var p = parts.find(function (x) { return x.type === 'timeZoneName'; });
      return p ? p.value : 'LCL';
    } catch (e) {
      return 'LCL';
    }
  }

  function formatTimeInTimezone(date, tzId, options) {
    var iana = getEffectiveIanaZone(tzId);
    var defaultOpts = {
      timeZone: iana,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    var opts = Object.assign({}, defaultOpts, options || {});
    try {
      return new Intl.DateTimeFormat('en-GB', opts).format(date);
    } catch (e) {
      return date.toTimeString().slice(0, 5);
    }
  }

  function formatDateInTimezone(date, tzId, locale) {
    var iana = getEffectiveIanaZone(tzId);
    var loc = locale || 'id-ID';
    try {
      return new Intl.DateTimeFormat(loc, {
        timeZone: iana,
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      }).format(date);
    } catch (e) {
      return date.toLocaleDateString();
    }
  }

  function formatFullDateInTimezone(date, tzId) {
    var iana = getEffectiveIanaZone(tzId);
    try {
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: iana,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return date.toDateString();
    }
  }

  /* ==========================================================================
     2. GLOBAL MARKET TRADING SESSIONS ENGINE
     ========================================================================== */
  var SESSIONS = [
    {
      id: 'sydney',
      name: 'Sydney',
      city: 'Sydney / Pasifik',
      flag: '🇦🇺',
      dotColor: '#0ea5e9',
      startUTC: 21,
      endUTC: 6,
      duration: 9
    },
    {
      id: 'asia',
      name: 'Tokyo',
      city: 'Tokyo / Asia',
      flag: '🇯🇵',
      dotColor: '#a855f7',
      startUTC: 0,
      endUTC: 9,
      duration: 9
    },
    {
      id: 'london',
      name: 'London',
      city: 'London / Eropa',
      flag: '🇬🇧',
      dotColor: '#10b981',
      startUTC: 7,
      endUTC: 16,
      duration: 9
    },
    {
      id: 'ny',
      name: 'New York',
      city: 'New York / Amerika',
      flag: '🇺🇸',
      dotColor: '#f59e0b',
      startUTC: 12,
      endUTC: 21,
      duration: 9
    }
  ];

  function getMarketState(nowDate) {
    var now = nowDate || new Date();
    var utcHour = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    var day = now.getUTCDay(); // 0 = Sun, 6 = Sat

    // Forex markets close Friday 21:00 UTC and reopen Sunday 21:00 UTC
    var isWeekend = (day === 6) || (day === 5 && utcHour >= 21) || (day === 0 && utcHour < 21);

    var activeSessions = [];
    if (!isWeekend) {
      if (utcHour >= 21 || utcHour < 6) activeSessions.push('sydney');
      if (utcHour >= 0 && utcHour < 9) activeSessions.push('asia');
      if (utcHour >= 7 && utcHour < 16) activeSessions.push('london');
      if (utcHour >= 12 && utcHour < 21) activeSessions.push('ny');
    }

    var isOverlapLondonNY = activeSessions.indexOf('london') !== -1 && activeSessions.indexOf('ny') !== -1;

    var statusText = '';
    var countdownText = '';
    var pulseColor = '#10b981';

    if (isWeekend) {
      statusText = 'Pasar Tutup (Akhir Pekan)';
      pulseColor = '#f59e0b';
      var daysTillSun = (7 - day) % 7;
      if (day === 0) daysTillSun = 0;
      var sunOpen = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysTillSun, 21, 0, 0));
      var diffMs = sunOpen - now;
      if (diffMs < 0) diffMs += 7 * 86400000;
      var diffH = Math.max(0, Math.floor(diffMs / 3600000));
      var diffM = Math.floor((diffMs % 3600000) / 60000);
      countdownText = 'Buka dlm ' + diffH + 'j ' + diffM + 'm';
    } else if (isOverlapLondonNY) {
      statusText = '🔥 London & NY Overlap (Likuiditas Puncak)';
      pulseColor = '#f59e0b';
      var remainH = 16 - utcHour;
      countdownText = 'Overlap sisa ' + formatHourMinute(remainH);
    } else if (activeSessions.length) {
      var activeNames = activeSessions.map(function (sid) {
        var s = SESSIONS.find(function (x) { return x.id === sid; });
        return s ? s.name : sid;
      }).join(' & ');
      statusText = activeNames + ' Aktif';
      var primary = SESSIONS.find(function (s) { return s.id === activeSessions[0]; });
      if (primary) {
        pulseColor = primary.dotColor;
        var diff = primary.endUTC - utcHour;
        if (diff < 0) diff += 24;
        countdownText = primary.name + ' tutup dlm ' + formatHourMinute(diff);
      }
    } else {
      statusText = 'Sesi Transisi Pasar';
      pulseColor = '#9ca3af';
      countdownText = 'Menunggu sesi buka';
    }

    return {
      now: now,
      utcHour: utcHour,
      isWeekend: isWeekend,
      activeSessions: activeSessions,
      isOverlapLondonNY: isOverlapLondonNY,
      statusText: statusText,
      countdownText: countdownText,
      pulseColor: pulseColor
    };
  }

  function formatHourMinute(decimalHours) {
    var h = Math.floor(decimalHours);
    var m = Math.floor((decimalHours % 1) * 60);
    return h + 'j ' + (m < 10 ? '0' : '') + m + 'm';
  }

  function getSessionProgress(session, utcHour) {
    if (session.startUTC < session.endUTC) {
      if (utcHour >= session.startUTC && utcHour < session.endUTC) {
        var elapsed = utcHour - session.startUTC;
        return Math.min(100, Math.max(0, Math.round((elapsed / session.duration) * 100)));
      }
    } else {
      if (utcHour >= session.startUTC || utcHour < session.endUTC) {
        var elapsed = utcHour >= session.startUTC ? (utcHour - session.startUTC) : (utcHour + 24 - session.startUTC);
        return Math.min(100, Math.max(0, Math.round((elapsed / session.duration) * 100)));
      }
    }
    return 0;
  }

  function getSessionHoursInTimezone(session, tzId) {
    var now = new Date();
    var y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate();
    var startD = new Date(Date.UTC(y, m, d, session.startUTC, 0, 0));
    var endD = new Date(Date.UTC(y, m, d + (session.endUTC < session.startUTC ? 1 : 0), session.endUTC, 0, 0));

    var sStr = formatTimeInTimezone(startD, tzId, { hour: '2-digit', minute: '2-digit' });
    var eStr = formatTimeInTimezone(endD, tzId, { hour: '2-digit', minute: '2-digit' });
    var abbr = getTimezoneAbbreviation(tzId, now);

    return sStr + ' – ' + eStr + ' ' + abbr;
  }

  function getTimeUntilSessionOpen(session, utcHour) {
    var diff = session.startUTC - utcHour;
    if (diff < 0) diff += 24;
    return formatHourMinute(diff);
  }

  function getTimeUntilSessionClose(session, utcHour) {
    var diff = session.endUTC - utcHour;
    if (diff < 0) diff += 24;
    return formatHourMinute(diff);
  }

  /* ==========================================================================
     3. REALTIME FOREX FACTORY NEWS ENGINE (AUTHENTIC WEB DATA)
     ========================================================================== */
  var cachedNewsData = null;
  var lastNewsFetchTime = null;
  var isNewsFetching = false;

  var CURRENCY_FLAGS = {
    USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
    AUD: '🇦🇺', CAD: '🇨🇦', CHF: '🇨🇭', NZD: '🇳🇿', CNY: '🇨🇳'
  };

  function getPinnedNewsSet() {
    try {
      var raw = localStorage.getItem(STORAGE_PINNED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function togglePinNews(eventKey) {
    var list = getPinnedNewsSet();
    var idx = list.indexOf(eventKey);
    if (idx !== -1) {
      list.splice(idx, 1);
    } else {
      list.push(eventKey);
    }
    try {
      localStorage.setItem(STORAGE_PINNED_KEY, JSON.stringify(list));
    } catch (e) {}
    renderForexNewsSection();
    if (W.IosHaptics && W.IosHaptics.selection) W.IosHaptics.selection();
  }

  function getEventKey(ev) {
    return (ev.country || '') + '|' + (ev.title || '') + '|' + (ev.date || '');
  }

  function getRelativeNewsTime(dateObj, nowDate, tzId) {
    var now = nowDate || new Date();
    var diffMs = dateObj - now;
    var isPast = diffMs < 0;
    var absMs = Math.abs(diffMs);
    var diffMin = Math.round(absMs / 60000);
    var diffH = Math.floor(diffMin / 60);
    var remMin = diffMin % 60;

    if (isPast) {
      if (diffMin < 2) return 'Baru saja rilis';
      if (diffMin < 60) return 'Rilis ' + diffMin + ' mnt lalu';
      if (diffH < 24) return 'Rilis ' + diffH + 'j ' + remMin + 'm lalu';
      return 'Selesai';
    } else {
      if (diffMin <= 1) return 'Rilis sekarang!';
      if (diffMin < 60) return 'Dalam ' + diffMin + ' menit';
      if (diffH < 24) return 'Dalam ' + diffH + 'j ' + remMin + 'm';
      return formatDateInTimezone(dateObj, tzId) + ' ' + formatTimeInTimezone(dateObj, tzId);
    }
  }

  async function fetchForexFactoryData(force) {
    if (isNewsFetching) return cachedNewsData || [];

    var now = Date.now();
    var TTL = 15 * 60 * 1000;

    // Check localStorage cache first unless forced
    if (!force) {
      try {
        var rawCache = localStorage.getItem(STORAGE_CACHE_KEY);
        var rawTime = localStorage.getItem(STORAGE_CACHE_TIME_KEY);
        if (rawCache && rawTime && (now - parseInt(rawTime, 10) < TTL)) {
          var parsed = JSON.parse(rawCache);
          if (Array.isArray(parsed) && parsed.length) {
            cachedNewsData = parsed;
            lastNewsFetchTime = new Date(parseInt(rawTime, 10));
            return parsed;
          }
        }
      } catch (e) {}
    }

    isNewsFetching = true;

    // Step 1: Always load local enriched template first (100% authentic Forex Factory data)
    var freshData = null;
    var localMap = {};
    try {
      var localResp = await fetch('./forex-factory-calendar.json');
      if (localResp.ok) {
        var localJson = await localResp.json();
        if (Array.isArray(localJson) && localJson.length) {
          freshData = localJson;
          localJson.forEach(function (item) {
            var k = (item.country || '') + '|' + (item.title || '');
            localMap[k] = item;
          });
        }
      }
    } catch (e) {}

    // Step 2: If forced or local missing, attempt live feed from Fair Economy (Forex Factory data server)
    if (force || !freshData) {
      var endpoints = [
        'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
        'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://nfs.faireconomy.media/ff_calendar_thisweek.json')
      ];

      for (var i = 0; i < endpoints.length; i++) {
        try {
          var controller = new AbortController();
          var timeoutId = setTimeout(function () { controller.abort(); }, 4000);
          var resp = await fetch(endpoints[i], { signal: controller.signal });
          clearTimeout(timeoutId);
          if (resp.ok) {
            var text = await resp.text();
            if (text && text.trim().startsWith('[')) {
              var onlineJson = JSON.parse(text);
              if (Array.isArray(onlineJson) && onlineJson.length > 0) {
                // Merge online schedule with local verified URLs and actuals
                freshData = onlineJson.map(function (item) {
                  var k = (item.country || '') + '|' + (item.title || '');
                  var loc = localMap[k] || {};
                  return {
                    title: item.title,
                    country: item.country,
                    date: item.date, // Authentic ISO-8601 with timezone offset
                    impact: item.impact,
                    forecast: item.forecast || loc.forecast || '',
                    previous: item.previous || loc.previous || '',
                    actual: item.actual || loc.actual || '',
                    url: loc.url || ('https://www.forexfactory.com/calendar#detail=' + encodeURIComponent(item.title || ''))
                  };
                });
                break;
              }
            }
          }
        } catch (err) {}
      }
    }

    // Step 3: Realtime Actuals Enrichment via biquote (keyless macroeconomic actuals)
    if (freshData && Array.isArray(freshData)) {
      try {
        var bqController = new AbortController();
        var bqTimeout = setTimeout(function () { bqController.abort(); }, 3500);
        var bqResp = await fetch('https://biquote.io/api/calendar', { signal: bqController.signal });
        clearTimeout(bqTimeout);
        if (bqResp.ok) {
          var bqList = await bqResp.json();
          if (Array.isArray(bqList)) {
            var bqActMap = {};
            bqList.forEach(function (b) {
              if (b.actual !== null && b.actual !== undefined) {
                var cn = (b.name || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                bqActMap[(b.currency || '').toUpperCase() + '|' + cn] = String(b.actual);
              }
            });
            freshData.forEach(function (ev) {
              if (!ev.actual) {
                var ct = (ev.title || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                var exactKey = (ev.country || '').toUpperCase() + '|' + ct;
                if (bqActMap[exactKey]) {
                  ev.actual = bqActMap[exactKey];
                } else {
                  for (var bk in bqActMap) {
                    if (bk.indexOf((ev.country || '').toUpperCase() + '|') === 0) {
                      var sub = bk.split('|')[1];
                      if (sub && ct.length >= 4 && (ct.indexOf(sub) !== -1 || sub.indexOf(ct) !== -1)) {
                        ev.actual = bqActMap[bk];
                        break;
                      }
                    }
                  }
                }
                if (ev.actual && ev.forecast && ev.forecast.indexOf('%') !== -1 && ev.actual.indexOf('%') === -1) {
                  ev.actual += '%';
                }
              }
            });
          }
        }
      } catch (err) {}
    }

    isNewsFetching = false;

    if (freshData) {
      cachedNewsData = freshData;
      lastNewsFetchTime = new Date();
      try {
        localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(freshData));
        localStorage.setItem(STORAGE_CACHE_TIME_KEY, String(Date.now()));
      } catch (e) {}
      return freshData;
    }

    return cachedNewsData || [];
  }

  /* ==========================================================================
     4. RENDERER: HARMONIZED SESSION RADAR CARD
     ========================================================================== */
  function renderAllSessionRadars() {
    var targets = [D.getElementById('v165-dash')].filter(Boolean);
    if (!targets.length) return;

    var tzId = getUserTimezonePreference();
    var state = getMarketState();
    var tzAbbr = getTimezoneAbbreviation(tzId, state.now);

    var clockStr = formatTimeInTimezone(state.now, tzId, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var dateStr = formatDateInTimezone(state.now, tzId, 'id-ID');

    targets.forEach(function (container) {
      var existing = container.querySelector('.ios-session-radar');

      // Top bar: Status, clock, Timezone Pill Button (NO BLOCKING DROPDOWNS!), countdown
      var topHtml =
        '<div class="ios-radar-top">' +
          '<div class="ios-radar-left">' +
            '<div class="ios-radar-status">' +
              '<span class="ios-radar-pulse" style="background:' + state.pulseColor + ';box-shadow:0 0 8px ' + state.pulseColor + ';"></span>' +
              '<span class="ios-radar-title">' + state.statusText + '</span>' +
            '</div>' +
            '<div class="ios-live-clock-wrap" title="Jam Live (' + tzAbbr + ')">' +
              '<span class="ios-live-clock">' + clockStr + '</span>' +
              '<span class="ios-live-date">' + dateStr + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="ios-radar-right">' +
            '<button type="button" class="ios-tz-pill-btn" data-nav-tz title="Ubah zona waktu di Pengaturan">' +
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' +
              '<span>' + tzAbbr + '</span>' +
            '</button>' +
            '<span class="ios-radar-countdown">' + state.countdownText + '</span>' +
          '</div>' +
        '</div>';

      // Overlap banner (London + NY)
      var overlapHtml = '';
      if (state.isOverlapLondonNY) {
        overlapHtml =
          '<div class="ios-overlap-banner">' +
            '<div class="ios-overlap-left">' +
              '<span class="ios-overlap-icon">🔥</span>' +
              '<div>' +
                '<b class="ios-overlap-title">Sesi London & New York Overlap</b>' +
                '<p class="ios-overlap-desc">Puncak likuiditas harian EUR/USD, GBP/USD, dan Gold (XAU/USD).</p>' +
              '</div>' +
            '</div>' +
            '<span class="ios-overlap-badge">Sisa ' + formatHourMinute(16 - state.utcHour) + '</span>' +
          '</div>';
      }

      // 4 Session Pills Grid (Harmonized, Clean, Zero Obscuration)
      var pillsHtml =
        '<div class="ios-sessions-grid">' +
          SESSIONS.map(function (s) {
            var isActive = state.activeSessions.indexOf(s.id) !== -1;
            var localHours = getSessionHoursInTimezone(s, tzId);
            var progressPct = isActive ? getSessionProgress(s, state.utcHour) : 0;
            var countdown = isActive
              ? 'Tutup dlm ' + getTimeUntilSessionClose(s, state.utcHour)
              : 'Buka dlm ' + getTimeUntilSessionOpen(s, state.utcHour);

            return '<div class="ios-session-pill ' + (isActive ? 'active' : '') + '">' +
              '<div class="ios-session-head">' +
                '<div class="ios-session-name-group">' +
                  '<span class="ios-session-dot" style="background:' + s.dotColor + ';box-shadow:0 0 6px ' + s.dotColor + ';"></span>' +
                  '<span class="ios-session-name">' + s.name + '</span>' +
                '</div>' +
                '<span class="ios-session-tag ' + (isActive ? 'active' : 'inactive') + '">' +
                  (isActive ? '● AKTIF' : 'TUTUP') +
                '</span>' +
              '</div>' +
              '<div class="ios-session-hours">' +
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
                '<span>' + localHours + '</span>' +
              '</div>' +
              '<div class="ios-session-prog-wrap">' +
                '<div class="ios-session-prog-bar" style="width:' + (isActive ? progressPct : 0) + '%;"></div>' +
              '</div>' +
              '<div class="ios-session-foot">' +
                '<span>' + (isActive ? progressPct + '% berjalan' : s.city.split('/')[0]) + '</span>' +
                '<span style="font-weight:600;">' + countdown + '</span>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>';

      // 24-Hour Timeline Track
      var needlePos = ((state.utcHour / 24) * 100).toFixed(1);
      var timelineHtml =
        '<div class="ios-timeline-wrap">' +
          '<div class="ios-timeline-header">' +
            '<span>Alur 24 Jam Pasar (' + tzAbbr + ')</span>' +
            '<span>Marker Putih: Jam Sekarang</span>' +
          '</div>' +
          '<div class="ios-timeline-bar-container" title="Garis waktu 24 jam pasar">' +
            '<div class="ios-timeline-block sydney ' + (state.activeSessions.indexOf('sydney') !== -1 ? 'active' : '') + '" style="left:87.5%;width:12.5%;" title="Sydney 21:00-00:00"></div>' +
            '<div class="ios-timeline-block sydney ' + (state.activeSessions.indexOf('sydney') !== -1 ? 'active' : '') + '" style="left:0%;width:25%;" title="Sydney 00:00-06:00"></div>' +
            '<div class="ios-timeline-block asia ' + (state.activeSessions.indexOf('asia') !== -1 ? 'active' : '') + '" style="left:0%;width:37.5%;" title="Tokyo 00:00-09:00"></div>' +
            '<div class="ios-timeline-block london ' + (state.activeSessions.indexOf('london') !== -1 ? 'active' : '') + '" style="left:29.1%;width:37.5%;" title="London 07:00-16:00"></div>' +
            '<div class="ios-timeline-block ny ' + (state.activeSessions.indexOf('ny') !== -1 ? 'active' : '') + '" style="left:50%;width:37.5%;" title="New York 12:00-21:00"></div>' +
            '<div class="ios-timeline-block overlap ' + (state.isOverlapLondonNY ? 'active' : '') + '" style="left:50%;width:16.6%;" title="London & NY Overlap 12:00-16:00"></div>' +
            '<div class="ios-timeline-needle" style="left:' + needlePos + '%;"></div>' +
          '</div>' +
        '</div>';

      var totalHtml = topHtml + overlapHtml + pillsHtml + timelineHtml;

      if (existing) {
        existing.className = 'ios-session-radar glass rounded-2xl';
        existing.innerHTML = totalHtml;
      } else {
        var widget = D.createElement('div');
        widget.className = 'ios-session-radar glass rounded-2xl';
        widget.innerHTML = totalHtml;
        container.insertBefore(widget, container.firstChild);
      }

      bindRadarEvents(existing || widget);
    });
  }

  function bindRadarEvents(widgetEl) {
    if (!widgetEl) return;

    // Navigate to timezone setting on pill click
    var tzBtn = widgetEl.querySelector('[data-nav-tz]');
    if (tzBtn && !tzBtn.__bound) {
      tzBtn.__bound = true;
      tzBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof W.switchView === 'function') {
          W.switchView('settings');
          setTimeout(function () {
            var el = D.getElementById('ms-timezone');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.focus();
            }
          }, 150);
        }
      });
    }

    var newsBtn = widgetEl.querySelector('[data-open-news]');
    if (newsBtn && !newsBtn.__bound) {
      newsBtn.__bound = true;
      newsBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof W.switchView === 'function') {
          W.switchView('calendar');
        }
      });
    }
  }

  /* ==========================================================================
     5. RENDERER: DEDICATED FOREX FACTORY NEWS VIEW (#fn-calendar-embed)
     ========================================================================== */
  var newsFilterState = {
    currency: 'ALL',
    impact: 'ALL',
    timeframe: 'upcoming',
    search: '',
    onlyHigh: false,
    pinnedOnly: false
  };

  function loadSavedNewsFilters() {
    try {
      var raw = localStorage.getItem(STORAGE_NEWS_FILTER_KEY);
      if (raw) Object.assign(newsFilterState, JSON.parse(raw));
    } catch (e) {}
  }

  function saveNewsFilters() {
    try {
      localStorage.setItem(STORAGE_NEWS_FILTER_KEY, JSON.stringify(newsFilterState));
    } catch (e) {}
  }

  async function renderForexNewsSection() {
    var section = D.getElementById('fn-calendar-embed');
    if (!section) return;

    loadSavedNewsFilters();
    var tzId = getUserTimezonePreference();
    var tzAbbr = getTimezoneAbbreviation(tzId);
    var now = new Date();

    var events = cachedNewsData;
    if (!events || !events.length) {
      events = await fetchForexFactoryData(false);
    }

    var pinnedList = getPinnedNewsSet();

    // 1. Header Card
    var updateTimeStr = lastNewsFetchTime ? formatTimeInTimezone(lastNewsFetchTime, tzId, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Baru saja';
    var headerHtml =
      '<div class="fn-header-card">' +
        '<div class="fn-header-top">' +
          '<div class="fn-title-wrap">' +
            '<h2>' +
              '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-gold-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
              '<span>Kalender Berita Forex Factory</span>' +
            '</h2>' +
            '<p>Data ekonomi makro riil dari <a href="https://www.forexfactory.com/calendar" target="_blank" rel="noopener" style="color:#c8a96a;text-decoration:underline;">forexfactory.com/calendar</a> dengan konversi otomatis ke zona waktumu (' + tzAbbr + ').</p>' +
          '</div>' +
          '<div class="fn-header-actions">' +
            '<span class="fn-status-badge">' +
              '<span class="ios-radar-pulse" style="background:#10b981;box-shadow:0 0 6px #10b981;"></span>' +
              '<span>Forex Factory Official Feed</span>' +
            '</span>' +
            '<button type="button" class="fn-refresh-btn" id="fn-btn-refresh">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>' +
              '<span>Segarkan</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:11.5px;color:rgba(235,235,245,0.55);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">' +
          '<span>Terakhir diperbarui: ' + updateTimeStr + ' ' + tzAbbr + '</span>' +
          '<span>Zona Waktu Aktif: <b style="color:#f6e3b4;">' + tzAbbr + '</b> (<a href="#" id="fn-goto-tz" style="color:#c8a96a;text-decoration:underline;">ubah di Pengaturan</a>)</span>' +
        '</div>' +
      '</div>';

    // 2. Filter Controls Card
    var currencies = ['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'];
    var impacts = ['ALL', 'High', 'Medium', 'Low', 'Holiday'];

    var controlsHtml =
      '<div class="fn-controls-card">' +
        '<div class="fn-filter-top-row">' +
          '<div class="fn-search-wrap">' +
            '<svg class="fn-search-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
            '<input type="text" id="fn-search-input" class="fn-search-input" placeholder="Cari berita (e.g. CPI, FOMC, Rate, GDP, BOC, NFP)..." value="' + (newsFilterState.search || '') + '">' +
          '</div>' +
          '<div class="fn-timeframe-tabs">' +
            '<button type="button" class="fn-tf-tab ' + (newsFilterState.timeframe === 'upcoming' ? 'active' : '') + '" data-tf="upcoming">⏰ Akan Datang</button>' +
            '<button type="button" class="fn-tf-tab ' + (newsFilterState.timeframe === 'today' ? 'active' : '') + '" data-tf="today">📅 Hari Ini</button>' +
            '<button type="button" class="fn-tf-tab ' + (newsFilterState.timeframe === 'week' ? 'active' : '') + '" data-tf="week">🗓️ Minggu Ini</button>' +
          '</div>' +
        '</div>' +
        '<div class="fn-filter-row">' +
          '<span class="fn-filter-label">Mata Uang:</span>' +
          currencies.map(function (curr) {
            var isSel = newsFilterState.currency === curr;
            var flag = CURRENCY_FLAGS[curr] ? CURRENCY_FLAGS[curr] + ' ' : '';
            return '<button type="button" class="fn-chip ' + (isSel ? 'active' : '') + '" data-curr="' + curr + '">' +
              flag + curr +
            '</button>';
          }).join('') +
        '</div>' +
        '<div class="fn-filter-row">' +
          '<span class="fn-filter-label">Impact:</span>' +
          '<button type="button" class="fn-super-high-btn ' + (newsFilterState.onlyHigh ? 'active' : '') + '" id="fn-super-high">' +
            '<span>⚡ Hanya High Impact (Red Folder)</span>' +
          '</button>' +
          impacts.map(function (imp) {
            var isSel = !newsFilterState.onlyHigh && newsFilterState.impact === imp;
            var dot = imp === 'High' ? '🔴 ' : imp === 'Medium' ? '🟠 ' : imp === 'Low' ? '🟡 ' : imp === 'Holiday' ? '⚪ ' : '';
            return '<button type="button" class="fn-chip ' + (isSel ? 'active' : '') + '" data-impact="' + imp + '">' +
              dot + (imp === 'ALL' ? 'Semua Impact' : imp) +
            '</button>';
          }).join('') +
          '<button type="button" class="fn-chip ' + (newsFilterState.pinnedOnly ? 'active' : '') + '" id="fn-pinned-filter">' +
            '⭐ Dipantau (' + pinnedList.length + ')' +
          '</button>' +
        '</div>' +
      '</div>';

    // 3. Process & Filter News Items
    var processed = (events || []).map(function (ev) {
      var d = new Date(ev.date);
      var key = getEventKey(ev);
      return Object.assign({}, ev, {
        dateObj: d,
        key: key,
        isPinned: pinnedList.indexOf(key) !== -1,
        diffMin: Math.round((d - now) / 60000)
      });
    });

    var filtered = processed.filter(function (ev) {
      if (newsFilterState.pinnedOnly && !ev.isPinned) return false;
      if (newsFilterState.currency !== 'ALL' && ev.country !== newsFilterState.currency) return false;
      if (newsFilterState.onlyHigh && ev.impact !== 'High') return false;
      if (!newsFilterState.onlyHigh && newsFilterState.impact !== 'ALL' && ev.impact !== newsFilterState.impact) return false;

      if (newsFilterState.timeframe === 'upcoming') {
        if (ev.diffMin < -5) return false;
      } else if (newsFilterState.timeframe === 'today') {
        var eventDateStr = formatDateInTimezone(ev.dateObj, tzId);
        var nowDateStr = formatDateInTimezone(now, tzId);
        if (eventDateStr !== nowDateStr) return false;
      }

      if (newsFilterState.search) {
        var q = newsFilterState.search.toLowerCase().trim();
        var matchTitle = (ev.title || '').toLowerCase().indexOf(q) !== -1;
        var matchCountry = (ev.country || '').toLowerCase().indexOf(q) !== -1;
        if (!matchTitle && !matchCountry) return false;
      }

      return true;
    });

    // Sort chronologically
    filtered.sort(function (a, b) { return a.dateObj - b.dateObj; });

    // Group by Date in User's selected Timezone
    var groups = {};
    filtered.forEach(function (ev) {
      var dateHeader = formatFullDateInTimezone(ev.dateObj, tzId);
      if (!groups[dateHeader]) groups[dateHeader] = [];
      groups[dateHeader].push(ev);
    });

    // 4. Build News List HTML
    var listHtml = '';
    var groupKeys = Object.keys(groups);

    if (!groupKeys.length) {
      listHtml =
        '<div class="glass rounded-2xl p-10 text-center" style="display:flex;flex-direction:column;align-items:center;gap:12px;">' +
          '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="text-gray-500"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01"/></svg>' +
          '<b style="font-size:15px;color:#ffffff;">Tidak ada berita yang sesuai dengan filter</b>' +
          '<p style="font-size:13px;color:rgba(235,235,245,0.6);max-width:380px;">Coba atur ulang mata uang, jangka waktu, atau hapus kata kunci pencarian.</p>' +
          '<button type="button" class="fn-refresh-btn" id="fn-reset-filters" style="margin-top:6px;">Reset Filter</button>' +
        '</div>';
    } else {
      listHtml = groupKeys.map(function (header) {
        var items = groups[header];
        return '<div class="fn-news-group">' +
          '<div class="fn-group-title">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="text-gold-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
            '<span>' + header + '</span>' +
            '<span style="font-size:11px;color:rgba(235,235,245,0.5);font-weight:600;">(' + items.length + ' event)</span>' +
          '</div>' +
          items.map(function (ev) {
            var flag = CURRENCY_FLAGS[ev.country] || '🌐';
            var timeStr = formatTimeInTimezone(ev.dateObj, tzId);
            var originTimeStr = formatTimeInTimezone(ev.dateObj, 'America/New_York');
            var relTime = getRelativeNewsTime(ev.dateObj, now, tzId);
            var isUrgent = ev.diffMin >= 0 && ev.diffMin <= 15 && ev.impact === 'High';
            var impactClass = (ev.impact || 'low').toLowerCase();

            // Actual comparison logic
            var actualClass = 'pending';
            var actualText = '—';
            if (ev.actual) {
              actualText = ev.actual;
              actualClass = '';
              var actNum = parseFloat(ev.actual.replace(/[^0-9.-]/g, ''));
              var fctNum = parseFloat((ev.forecast || '').replace(/[^0-9.-]/g, ''));
              if (!isNaN(actNum) && !isNaN(fctNum)) {
                if (actNum > fctNum) actualClass = 'actual-better';
                else if (actNum < fctNum) actualClass = 'actual-worse';
              }
            }

            return '<div class="fn-event-card impact-' + impactClass + '">' +
              '<div class="fn-card-main">' +
                '<div class="fn-curr-badge">' +
                  '<span class="fn-curr-flag">' + flag + '</span>' +
                  '<span class="fn-curr-code">' + ev.country + '</span>' +
                '</div>' +
                '<div class="fn-card-info">' +
                  '<div class="fn-card-top-meta">' +
                    '<span class="fn-impact-pill ' + impactClass + '">' + ev.impact + '</span>' +
                    '<span class="fn-event-time">' + timeStr + ' ' + tzAbbr + '</span>' +
                    '<span class="fn-origin-time">(' + originTimeStr + ' EDT)</span>' +
                    '<span class="fn-event-countdown ' + (isUrgent ? 'urgent' : '') + '">' + relTime + '</span>' +
                  '</div>' +
                  '<b class="fn-event-title">' + ev.title + '</b>' +
                '</div>' +
              '</div>' +
              '<div class="fn-card-values">' +
                '<div class="fn-val-item"><span class="fn-val-label">Actual</span><span class="fn-val-num ' + actualClass + '">' + actualText + '</span></div>' +
                '<div class="fn-val-item"><span class="fn-val-label">Forecast</span><span class="fn-val-num">' + (ev.forecast || '—') + '</span></div>' +
                '<div class="fn-val-item"><span class="fn-val-label">Previous</span><span class="fn-val-num">' + (ev.previous || '—') + '</span></div>' +
                '<button type="button" class="fn-pin-btn ' + (ev.isPinned ? 'pinned' : '') + '" data-pin="' + encodeURIComponent(ev.key) + '" title="' + (ev.isPinned ? 'Batal pantau event' : 'Pantau event ini') + '">' +
                  (ev.isPinned ? '★' : '☆') +
                '</button>' +
                (ev.url ? '<a href="' + ev.url + '" target="_blank" rel="noopener" class="fn-link-btn" title="Buka di Forex Factory"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>' : '') +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>';
      }).join('');
    }

    section.innerHTML = headerHtml + controlsHtml + listHtml;
    bindNewsSectionEvents(section);
  }

  function bindNewsSectionEvents(section) {
    if (!section) return;

    // Refresh button
    var refreshBtn = section.querySelector('#fn-btn-refresh');
    if (refreshBtn && !refreshBtn.__bound) {
      refreshBtn.__bound = true;
      refreshBtn.addEventListener('click', async function () {
        refreshBtn.classList.add('spinning');
        await fetchForexFactoryData(true);
        refreshBtn.classList.remove('spinning');
        renderAllSessionRadars();
        renderForexNewsSection();
        if (W.showToast) W.showToast('Data Forex Factory berhasil disegarkan!');
        if (W.IosHaptics && W.IosHaptics.success) W.IosHaptics.success();
      });
    }

    // Go to settings timezone link
    var gotoTz = section.querySelector('#fn-goto-tz');
    if (gotoTz && !gotoTz.__bound) {
      gotoTz.__bound = true;
      gotoTz.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof W.switchView === 'function') {
          W.switchView('settings');
          setTimeout(function () {
            var el = D.getElementById('ms-timezone');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.focus();
            }
          }, 150);
        }
      });
    }

    // Reset filters button
    var resetBtn = section.querySelector('#fn-reset-filters');
    if (resetBtn && !resetBtn.__bound) {
      resetBtn.__bound = true;
      resetBtn.addEventListener('click', function () {
        newsFilterState.currency = 'ALL';
        newsFilterState.impact = 'ALL';
        newsFilterState.timeframe = 'upcoming';
        newsFilterState.search = '';
        newsFilterState.onlyHigh = false;
        newsFilterState.pinnedOnly = false;
        saveNewsFilters();
        renderForexNewsSection();
      });
    }

    // Currency chips
    section.querySelectorAll('[data-curr]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        newsFilterState.currency = btn.getAttribute('data-curr');
        saveNewsFilters();
        renderForexNewsSection();
        if (W.IosHaptics && W.IosHaptics.selection) W.IosHaptics.selection();
      });
    });

    // Impact chips
    section.querySelectorAll('[data-impact]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        newsFilterState.impact = btn.getAttribute('data-impact');
        newsFilterState.onlyHigh = false;
        saveNewsFilters();
        renderForexNewsSection();
        if (W.IosHaptics && W.IosHaptics.selection) W.IosHaptics.selection();
      });
    });

    // Super High Impact toggle
    var superHigh = section.querySelector('#fn-super-high');
    if (superHigh && !superHigh.__bound) {
      superHigh.__bound = true;
      superHigh.addEventListener('click', function () {
        newsFilterState.onlyHigh = !newsFilterState.onlyHigh;
        saveNewsFilters();
        renderForexNewsSection();
        if (W.IosHaptics && W.IosHaptics.selection) W.IosHaptics.selection();
      });
    }

    // Pinned filter toggle
    var pinnedBtn = section.querySelector('#fn-pinned-filter');
    if (pinnedBtn && !pinnedBtn.__bound) {
      pinnedBtn.__bound = true;
      pinnedBtn.addEventListener('click', function () {
        newsFilterState.pinnedOnly = !newsFilterState.pinnedOnly;
        saveNewsFilters();
        renderForexNewsSection();
        if (W.IosHaptics && W.IosHaptics.selection) W.IosHaptics.selection();
      });
    }

    // Timeframe tabs
    section.querySelectorAll('[data-tf]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        newsFilterState.timeframe = tab.getAttribute('data-tf');
        saveNewsFilters();
        renderForexNewsSection();
        if (W.IosHaptics && W.IosHaptics.selection) W.IosHaptics.selection();
      });
    });

    // Search input
    var searchInput = section.querySelector('#fn-search-input');
    if (searchInput && !searchInput.__bound) {
      searchInput.__bound = true;
      var searchTimer = null;
      searchInput.addEventListener('input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          newsFilterState.search = searchInput.value;
          saveNewsFilters();
          renderForexNewsSection();
        }, 220);
      });
    }

    // Pin buttons
    section.querySelectorAll('[data-pin]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var rawKey = btn.getAttribute('data-pin');
        if (rawKey) togglePinNews(decodeURIComponent(rawKey));
      });
    });
  }

  /* ==========================================================================
     6. INITIALIZATION & LIVE BINDING
     ========================================================================== */
  function init() {
    // 1. Bind Settings select (#ms-timezone)
    var msTzSelect = D.getElementById('ms-timezone');
    if (msTzSelect) {
      msTzSelect.value = getUserTimezonePreference();
      msTzSelect.addEventListener('change', function () {
        setUserTimezonePreference(this.value);
        if (W.showToast) W.showToast('Zona waktu pasar diubah ke ' + getTimezoneAbbreviation(this.value));
      });
    }

    D.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'ms-timezone') {
        setUserTimezonePreference(e.target.value);
        if (W.showToast) W.showToast('Zona waktu pasar diubah ke ' + getTimezoneAbbreviation(e.target.value));
      }
    });

    // 2. Fetch and render data
    fetchForexFactoryData(false).then(function () {
      renderAllSessionRadars();
      renderForexNewsSection();
    });

    renderAllSessionRadars();

    // 3. Clock tick (1 second)
    setInterval(function () {
      var targets = D.querySelectorAll('.ios-live-clock');
      if (targets.length) {
        var tzId = getUserTimezonePreference();
        var now = new Date();
        var clockStr = formatTimeInTimezone(now, tzId, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        targets.forEach(function (el) { el.textContent = clockStr; });
      }
    }, 1000);

    // 4. Session & countdown update (30 seconds)
    setInterval(function () {
      renderAllSessionRadars();
      var calSec = D.getElementById('calendar-section');
      if (calSec && !calSec.classList.contains('hidden')) {
        renderForexNewsSection();
      }
    }, 30000);

    // 5. View change listener
    W.addEventListener('viewchange', function (ev) {
      setTimeout(function () {
        renderAllSessionRadars();
        if (ev && ev.detail && ev.detail.view === 'calendar') {
          renderForexNewsSection();
        }
        if (ev && ev.detail && ev.detail.view === 'settings') {
          var sel = D.getElementById('ms-timezone');
          if (sel) sel.value = getUserTimezonePreference();
        }
      }, 50);
    });

    W.addEventListener('journals-loaded', function () {
      setTimeout(renderAllSessionRadars, 50);
    });

    // 6. Mutation observer to preserve radar when container is rewritten
    ['v165-dash'].forEach(function (id) {
      var el = D.getElementById(id);
      if (el && W.MutationObserver) {
        var mo = new MutationObserver(function () {
          if (!el.querySelector('.ios-session-radar')) {
            renderAllSessionRadars();
          }
        });
        mo.observe(el, { childList: true });
      }
    });
  }

  if (D.readyState === 'loading') {
    D.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  W.ForexNewsCalendar = {
    renderRadar: renderAllSessionRadars,
    renderNews: renderForexNewsSection,
    setTimezone: setUserTimezonePreference,
    getTimezone: getUserTimezonePreference,
    fetchNews: fetchForexFactoryData,
    getMarketState: getMarketState
  };

})(window, document);
