/* DOA IBU v16.36 — delegated interaction motion.
   Visual feedback only: does not intercept application actions or change data. */
(function () {
  'use strict';
  if (window.__doaMotion1636) return;
  window.__doaMotion1636 = true;
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}
  var interactive = 'button, [role="button"], .hm-btn, .v5-btn, .px-state-act, .recent-input-chip';
  var pressTimer = null;

  function closest(el, selector) {
    return el && el.closest ? el.closest(selector) : null;
  }
  function clearPressed(el) {
    if (el && el.classList) el.classList.remove('di-pressed');
  }
  document.addEventListener('pointerdown', function (event) {
    if (reduceMotion || event.button !== 0 || !event.isPrimary) return;
    var target = closest(event.target, interactive);
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
    target.classList.add('di-pressed');
    window.clearTimeout(pressTimer);
    pressTimer = window.setTimeout(function () { clearPressed(target); }, 650);
    if (event.pointerType === 'mouse') return;
    var rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.width * rect.height > 180000) return;
    var diameter = Math.max(rect.width, rect.height) * 1.65;
    var ripple = document.createElement('span');
    ripple.className = 'di-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.width = diameter + 'px';
    ripple.style.height = diameter + 'px';
    ripple.style.left = (event.clientX - rect.left - diameter / 2) + 'px';
    ripple.style.top = (event.clientY - rect.top - diameter / 2) + 'px';
    target.appendChild(ripple);
    window.setTimeout(function () { if (ripple.parentNode) ripple.parentNode.removeChild(ripple); }, 620);
  }, { passive: true });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (name) {
    document.addEventListener(name, function (event) {
      var target = closest(event.target, interactive);
      clearPressed(target);
    }, { passive: true, capture: true });
  });
  document.addEventListener('click', function (event) {
    var target = closest(event.target, interactive);
    if (!target || target.disabled) return;
    clearPressed(target);
  }, true);
  document.addEventListener('change', function (event) {
    var el = event.target;
    if (!el || !el.matches || !el.matches('input,select,textarea,[contenteditable="true"]')) return;
    el.classList.remove('di-control-changed');
    void el.offsetWidth;
    el.classList.add('di-control-changed');
    window.setTimeout(function () { el.classList.remove('di-control-changed'); }, 300);
  }, true);

  /* Detect the app's existing view visibility changes, without replacing switchView. */
  var viewSelector = '#view-home,#view-dashboard,#calendar-section,#statistik-section,#monthly-section,#strategy-section,#coach-section,#wrapped-section,#gallery-section,#diary-section,#settings-section,#web-section';
  var lastVisible = '';
  function visibleViews() {
    var found = [];
    document.querySelectorAll(viewSelector).forEach(function (node) {
      if (!node.classList.contains('hidden') && node.getAttribute('aria-hidden') !== 'true' && node.getClientRects().length) {
        found.push(node);
      }
    });
    return found;
  }
  function animateVisibleViews() {
    if (reduceMotion || !document.body.classList.contains('px')) return;
    var visible = visibleViews();
    if (!visible.length) return;
    var signature = visible.map(function (node) { return node.id; }).join('|');
    if (signature === lastVisible) return;
    lastVisible = signature;
    visible.forEach(function (node) {
      node.classList.remove('di-view-enter');
      void node.offsetWidth;
      node.classList.add('di-view-enter');
      node.addEventListener('animationend', function done() {
        node.classList.remove('di-view-enter');
        node.removeEventListener('animationend', done);
      }, { once: true });
    });
  }
  if (window.MutationObserver && document.documentElement) {
    var observer = new MutationObserver(function (records) {
      if (records.some(function (r) { return r.type === 'attributes' && (r.attributeName === 'class' || r.attributeName === 'aria-hidden'); })) {
        window.requestAnimationFrame(animateVisibleViews);
      }
    });
    observer.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['class', 'aria-hidden'] });
  }
  window.addEventListener('viewchange', function () { window.requestAnimationFrame(animateVisibleViews); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', animateVisibleViews, { once: true });
  else window.requestAnimationFrame(animateVisibleViews);
})();