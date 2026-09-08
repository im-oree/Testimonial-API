/**
 * Zojatech testimonial widget — zero-code drop-in embed.
 *
 * Usage (copy from the product's "Widget" page):
 *
 *   <div id="zojatech-wall-<app-slug>"></div>
 *   <script src="https://<your-zojatech-host>/widget/embed.js"
 *           data-app="<app-slug>" async></script>
 *
 * What it does:
 *   1. Reads data-app / data-container / data-host / data-height off the tag.
 *   2. Asks the public wall endpoint for the product's WIDGET — its template-
 *      based design with FIXED dimensions (required rating components, edited
 *      per-product in the design studio).
 *   3. Creates a container (or uses yours) and mounts an <iframe> sized
 *      exactly to the template, pointing at the wall in embed mode. The page
 *      inside renders the same schema the studio edits, cycling the product's
 *      live approved reviews — so design changes appear on every site
 *      embedding the widget without republishing anything.
 *   4. Falls back to the classic auto-height wall for older payloads.
 *
 * Security: the embed carries only public identifiers and only ever fetches
 * public read endpoints (approved testimonials + theme + widget schema). No
 * session tokens, no API keys, no secrets — moderation happens server-side
 * before content is ever published to the wall.
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
  var manualHeight = parseInt(s.getAttribute('data-height') || '', 10);
  var container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    s.parentNode.insertBefore(container, s.nextSibling);
  }

  var frame = document.createElement('iframe');
  frame.title = 'Customer reviews';
  frame.loading = 'lazy';
  frame.setAttribute('allowtransparency', 'true');
  frame.style.border = '0';
  frame.style.display = 'block';
  frame.style.background = 'transparent';
  frame.style.width = '100%';
  frame.style.maxWidth = '680px';
  frame.style.minHeight = (manualHeight ? manualHeight : 320) + 'px';
  frame.style.height = 'auto';
  container.appendChild(frame);

  // Auto-height for non-template walls: the wall page reports its rendered
  // height so long designs are never cropped inside the iframe.
  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d || !d.zojatech || typeof d.zojatech.height !== 'number') return;
    if (!ev.source) return;
    try {
      // Only trust the wall we opened (same origin as this script).
      var src = String(ev.source.location.href || '');
      if (src.indexOf(host) !== 0) return;
    } catch (err) {
      return; // cross-origin sender — ignore
    }
    frame.style.height = d.zojatech.height + 'px';
    frame.style.minHeight = '0px';
  });

  // Fixed-dimension widget templates: ask the public API for the product's
  // widget and size the iframe to its exact template dimensions — the developer
  // embedding it knows precisely what space it occupies.
  fetch(host + '/v1/public/walls/' + encodeURIComponent(app))
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (wall) {
      var w = wall && wall.widget;
      if (!w || !w.width || !w.height) return;
      var width = Math.round(w.width);
      var height = manualHeight ? manualHeight : Math.round(w.height);

      // Responsive: the design keeps its aspect, but never overflows a narrow
      // container — the whole iframe scales down proportionally instead.
      function fit() {
        var avail = Math.max(60, container.clientWidth || width);
        if (avail >= width) {
          frame.style.transform = '';
          frame.style.width = '100%';
          frame.style.maxWidth = width + 'px';
          frame.style.height = height + 'px';
          container.style.height = '';
        } else {
          var k = avail / width;
          frame.style.maxWidth = 'none';
          frame.style.width = width + 'px';
          frame.style.height = height + 'px';
          frame.style.transform = 'scale(' + k + ')';
          frame.style.transformOrigin = 'top left';
          container.style.height = Math.round(height * k) + 'px';
        }
      }
      frame.style.minHeight = '0px';
      fit();
      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(fit).observe(container);
      } else {
        window.addEventListener('resize', fit);
      }
    })
    .catch(function () {
      /* keep the auto-height fallback */
    });

  frame.src = host + '/wall/' + encodeURIComponent(app) + '?embed=1' + (manualHeight ? '&h=' + manualHeight : '');
})();
