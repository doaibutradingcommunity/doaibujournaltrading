/* v16.53 — lightweight touch feedback and smooth navigation */
(function () {
  'use strict';
  if (window.__doaTouchSmoothV1653) return;
  window.__doaTouchSmoothV1653 = true;
  var reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}
  var coarse = false;
  try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (_) {}
  var targets = 'button, [role="button"], .nav-pill-btn, .recent-input-chip, .quick-action, summary';
  var active = null, startX = 0, startY = 0, rippleTimer = 0;

  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    var el = e.target && e.target.closest ? e.target.closest(targets) : null;
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    active = el; startX = e.clientX; startY = e.clientY;
    el.classList.add('touch-pressing');
    if (!reduced && !coarse && el.classList.contains('touch-ripple')) {
      var rect = el.getBoundingClientRect();
      var wave = document.createElement('span');
      wave.className = 'touch-ripple-wave';
      wave.style.left = (e.clientX - rect.left) + 'px';
      wave.style.top = (e.clientY - rect.top) + 'px';
      el.appendChild(wave);
      window.clearTimeout(rippleTimer);
      rippleTimer = window.setTimeout(function () {
        if (wave.parentNode) wave.parentNode.removeChild(wave);
      }, 550);
    }
  }, { passive: true });

  function release() {
    if (active) active.classList.remove('touch-pressing');
    active = null;
  }
  document.addEventListener('pointerup', release, { passive: true });
  document.addEventListener('pointercancel', release, { passive: true });
  document.addEventListener('pointermove', function (e) {
    if (!active) return;
    if (Math.abs(e.clientX - startX) > 12 || Math.abs(e.clientY - startY) > 12) release();
  }, { passive: true });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) release();
  });

  /* Scroll only when a view changes; preserve reduced-motion preferences. */
  window.addEventListener('viewchange', function () {
    if (reduced) return;
    requestAnimationFrame(function () {
      var main = document.querySelector('main, #app-main, .app-main');
      if (main && typeof main.scrollTo === 'function') {
        try { main.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) {}
      }
    });
  });
})();
