/**
 * Zojatech testimonial widget — zero-code drop-in embed (DOC 7 §6.1 flavour).
 *
 * Usage (copy from the product's "Connect & design" page):
 *
 *   <div id="zojatech-wall-<app-slug>"></div>
 *   <script src="https://<your-zojatech-host>/widget/embed.js"
 *           data-app="<app-slug>" async></script>
 *
 * What it does:
 *   1. Reads data-app / data-container / data-host / data-height off the tag.
 *   2. Creates a container (or uses yours) and mounts an <iframe> that points
 *      at the product's public wall — same-origin host, approved reviews only.
 *   3. The wall resolves the tenant's DOC-7 theme server-side on every load,
 *      so preset/token/logo edits appear on every site embedding the widget
 *      without republishing anything.
 *
 * Security: the embed carries only public identifiers and only ever fetches
 * public read endpoints (approved testimonials + theme). No session tokens,
 * no API keys, no secrets — moderation happens server-side before content is
 * ever published to the wall.
 */
(function () {
  'use strict';
  var s = document.currentScript;
  if (!s) return;

  var app = (s.getAttribute('data-app') || '').trim();
  if (!app) return;

  // The widget script is hosted on the Zojatech origin, so its own URL is the
  // correct host for the wall iframe — even when the embedding page is a
  // completely different website.
  var host = (s.getAttribute('data-host') || (s.src || '').split('/widget/embed.js')[0]).replace(/\/$/, '');
  if (!host || host === 'null') return;

  var containerId = (s.getAttribute('data-container') || 'zojatech-wall-' + app).trim();
  var height = parseInt(s.getAttribute('data-height') || '', 10);
  var container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    s.parentNode.insertBefore(container, s.nextSibling);
  }

  var wall = host + '/wall/' + encodeURIComponent(app) + (height ? '?h=' + height : '');
  var frame = document.createElement('iframe');
  frame.src = wall;
  frame.title = 'Reviews';
  frame.loading = 'lazy';
  frame.setAttribute('allowtransparency', 'true');
  frame.style.width = '100%';
  frame.style.maxWidth = '680px';
  frame.style.border = '0';
  frame.style.display = 'block';
  frame.style.minHeight = (height ? height : 420) + 'px';
  frame.style.background = 'transparent';
  container.appendChild(frame);
})();
