/**
 * Zojatech review modal — turn any button into a "Leave a review" popup so
 * visitors never leave the site that asked them.
 *
 * Usage (copy from the product's "Connect & design" page):
 *
 *   <button type="button"
 *           data-zr-open
 *           data-zr-form="website-review"
 *           style="...">Leave a review</button>
 *   <script src="https://<your-zojatech-host>/widget/modal.js" async></script>
 *
 * How it works:
 *   1. Binds every element with [data-zr-open]; data-zr-form is the form slug.
 *   2. Opens an overlay + iframe pointing at the public form in embed mode
 *      (?embed=1) — chrome-free, themed by the product's resolved theme.
 *   3. When the visitor submits, the form posts a message; this script shows a
 *      short "submitted" state, closes the modal, and the visitor is back on
 *      the page that asked. The review sits in the company's moderation queue
 *      until approved, exactly like a normal submission.
 *
 * Security: only public form pages are ever loaded, the overlay is plain DOM
 * on the host page, and close/submitted messages are only acted on when the
 * sender is the form we opened (same origin as this script's host).
 */
(function () {
  'use strict';
  var s = document.currentScript;
  if (!s) return;

  var host = (s.getAttribute('data-host') || (s.src || '').split('/widget/modal.js')[0]).replace(/\/$/, '');
  if (!host || host === 'null') return;

  var triggers = document.querySelectorAll('[data-zr-open]');
  if (!triggers.length) return;

  var ICON_X =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var css =
    '.zr-modal{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;' +
    'background:rgba(20,24,54,0.55);backdrop-filter:blur(3px);animation:zrFade .18s ease}' +
    '.zr-modal-panel{width:min(560px,94vw);max-height:88vh;display:flex;flex-direction:column;background:#fff;' +
    'border-radius:16px;overflow:hidden;box-shadow:0 24px 60px -18px rgba(20,24,54,.45);animation:zrUp .2s ease}' +
    '.zr-modal-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;' +
    'font-weight:700;font-size:14px;color:#161a2e;border-bottom:1px solid #ececf1}' +
    '.zr-modal-x{border:0;background:transparent;color:#6b7280;cursor:pointer;padding:4px;border-radius:8px}' +
    '.zr-modal-x:hover{background:#f1f2f8;color:#161a2e}' +
    '.zr-modal-frame{width:100%;height:620px;border:0;background:#fff;display:block}' +
    '.zr-modal.zr-thanks .zr-modal-frame{opacity:.25;pointer-events:none;filter:blur(2px);transition:.25s ease}' +
    '.zr-modal.zr-thanks .zr-modal-panel{position:relative}' +
    '.zr-modal.zr-thanks .zr-modal-panel::after{content:"Thank you — your review is in moderation. Closing…";' +
    'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;' +
    'padding:24px;font-weight:650;color:#166534;background:rgba(250,253,251,.6)}' +
    '@media(max-width:520px){.zr-modal-frame{height:88vh}.zr-modal{padding:0}.zr-modal-panel{border-radius:0;width:100vw;height:100vh;max-height:100vh}}' +
    '@keyframes zrFade{from{opacity:0}to{opacity:1}}@keyframes zrUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var overlay = null;

  function closeOverlay() {
    if (!overlay) return;
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    document.removeEventListener('keydown', onKey);
    overlay = null;
  }

  function onKey(e) {
    if (e.key === 'Escape') closeOverlay();
  }

  function openModal(formSlug) {
    if (overlay) closeOverlay();
    overlay = document.createElement('div');
    overlay.className = 'zr-modal';
    overlay.setAttribute('role', 'presentation');
    var panel = document.createElement('div');
    panel.className = 'zr-modal-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Leave a review');
    var head = document.createElement('div');
    head.className = 'zr-modal-head';
    var title = document.createElement('span');
    title.textContent = 'Leave a review';
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'zr-modal-x';
    x.setAttribute('aria-label', 'Close review form');
    x.innerHTML = ICON_X;
    x.addEventListener('click', closeOverlay);
    head.appendChild(title);
    head.appendChild(x);
    var frame = document.createElement('iframe');
    frame.className = 'zr-modal-frame';
    frame.src = host + '/forms/' + encodeURIComponent(formSlug) + '?embed=1';
    frame.title = 'Review form';
    frame.loading = 'lazy';
    frame.setAttribute('allowtransparency', 'true');
    panel.appendChild(head);
    panel.appendChild(frame);
    overlay.appendChild(panel);
    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay) closeOverlay();
    });
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKey);
  }

  Array.prototype.forEach.call(triggers, function (el) {
    el.addEventListener('click', function (e) {
      var slug = el.getAttribute('data-zr-form') || '';
      if (!slug) return;
      e.preventDefault();
      openModal(slug);
    });
  });

  // Form -> host messages: submitted (auto-close after thanks state) / close.
  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || !d.zojatech) return;
    if (!overlay) return;
    try {
      var src = String(ev.source.location.href || '');
      if (src.indexOf(host + '/forms/') !== 0) return;
    } catch (err) {
      return; // cross-origin sender we did not open — ignore
    }
    if (d.zojatech.submitted === true) {
      overlay.classList.add('zr-thanks');
      window.setTimeout(closeOverlay, 1500);
    } else if (d.zojatech.close === true) {
      closeOverlay();
    }
  });
})();
