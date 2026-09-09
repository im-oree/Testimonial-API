/* verify-embed.js — the surfaces CUSTOMERS' VISITORS actually hit:
 *
 *   1. the external-site demo (acme.html) — a plain page integrating the
 *      widget the way a real customer would: embed.js iframe + modal.js
 *      review popup, at phone/tablet/desktop widths
 *   2. the public form submission flow — fill → submit → thank-you state
 *      with the visitor's own snapshot (the end-customer experience)
 *
 * Usage: node verify-embed.js
 */
const { chromium } = require('playwright');
const { launchOptions, BASE } = require('./browser');

(async () => {
  const browser = await chromium.launch(launchOptions());
  const problems = [];
  const info = [];

  // ---------- 1. external site: embed iframe + review popup ----------
  for (const size of [
    { name: 'phone-390', width: 390, height: 844, touch: true },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'desktop-1440', width: 1440, height: 900 },
  ]) {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, isMobile: !!size.touch, hasTouch: !!size.touch });
    const page = await context.newPage();
    try {
      await page.goto(`${BASE}/external/acme.html?app=acme-marketing-site&form=website-review`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1800); // embed.js bootstraps async + iframe fetches its data

      // iframe rendered and visible inside the customer's container
      const embed = await page.evaluate(() => {
        const host = document.getElementById('acme-site-wall');
        const iframe = host?.querySelector('iframe');
        if (!iframe) return { ok: false };
        const r = iframe.getBoundingClientRect();
        const hr = host.getBoundingClientRect();
        return { ok: true, iframeW: Math.round(r.width), iframeH: Math.round(r.height), hostW: Math.round(hr.width), fitsHost: r.width <= hr.width + 2, visible: r.height > 40 };
      });
      info.push(`${size.name}: embed ${JSON.stringify(embed)}`);
      if (!embed.ok) problems.push(`${size.name}: embed iframe did not render`);
      else {
        if (!embed.fitsHost) problems.push(`${size.name}: embed iframe wider than its container (${embed.iframeW} > ${embed.hostW})`);
        if (!embed.visible) problems.push(`${size.name}: embed iframe has no height`);
        // inside the iframe the widget must fit-scale, never crop
        const frame = page.frames().find((f) => f.url().includes('/wall/') && f.url().includes('embed'));
        if (frame) {
          const inner = await frame.evaluate(() => {
            const fit = document.querySelector('.wall-fit');
            const w = document.querySelector('.tpl-widget');
            if (!fit) return { fit: false };
            const fr = fit.getBoundingClientRect();
            return { fit: true, w: Math.round(fr.width), h: Math.round(fr.height), scale: getComputedStyle(document.querySelector('.wall-fit-inner')).transform !== 'none', docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
          }).catch(() => null);
          info.push(`${size.name}: embed-inner ${JSON.stringify(inner)}`);
          if (inner && inner.docOverflow > 2) problems.push(`${size.name}: embed iframe page scrolls sideways (${inner.docOverflow}px)`);
        }
      }

      // the review popup (modal.js): opens from the hero CTA, fits, closes
      const cta = page.locator('.cta-review').first();
      if (await cta.count()) {
        await cta.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await cta.click();
        await page.waitForTimeout(1500);
        const modal = await page.evaluate(() => {
          const m = document.querySelector('.zr-modal');
          if (!m) return null;
          const p = m.querySelector('.zr-modal-panel');
          const r = p.getBoundingClientRect();
          return { w: Math.round(r.width), centered: Math.abs(r.left - (innerWidth - r.right)) < 4, fitsV: r.top >= 0 && r.bottom <= innerHeight, fullscreen: r.width > innerWidth - 8 };
        });
        info.push(`${size.name}: review popup ${JSON.stringify(modal)}`);
        if (!modal) problems.push(`${size.name}: review popup did not open from CTA`);
        else {
          if (!modal.centered) problems.push(`${size.name}: review popup not centered`);
          if (!modal.fitsV) problems.push(`${size.name}: review popup taller than the screen`);
          // phone must go fullscreen per modal.js's 520px breakpoint
          if (size.width <= 520 && !modal.fullscreen) problems.push(`${size.name}: review popup not fullscreen on a phone (w=${modal.w})`);
        }
        const x = page.locator('.zr-modal-x').first();
        if (await x.count()) {
          await x.click();
          await page.waitForTimeout(600);
          const closed = await page.evaluate(() => !document.querySelector('.zr-modal'));
          if (!closed) problems.push(`${size.name}: review popup ✕ did not close it`);
        }
      }
    } catch (e) {
      problems.push(`${size.name}: FATAL ${String(e).split('\n')[0]}`);
    } finally {
      await context.close();
    }
  }

  // ---------- 2. public form: full submission flow ----------
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    try {
      await page.goto(`${BASE}/forms/website-review`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);

      const before = await page.evaluate(() => ({
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        hasForm: !!document.querySelector('.public-form'),
      }));
      if (before.overflowX > 2) problems.push(`form page: overflowX=${before.overflowX}`);
      if (!before.hasForm) problems.push('form page: no form rendered');

      // fill: name, rating (interactive stars), first text answer
      // (fields are .f-input <input>s — no type attribute in the DOM)
      const inputs = page.locator('.public-form .f-input');
      const nInputs = await inputs.count();
      if (nInputs > 0) await inputs.first().fill('Ada Playwright');
      const stars = page.locator('.stars-interactive button.star');
      if (await stars.count()) await stars.nth(4).click(); // 5 stars
      if (nInputs > 1) await inputs.nth(1).fill('The embed was live before lunch and reviews started arriving the same day.');

      await page.locator('.public-form button[type="submit"], .public-form .btn-lg').first().click();
      await page.waitForTimeout(1200);

      const after = await page.evaluate(() => {
        const done = !!document.querySelector('.public-state, .big-check');
        const snap = document.querySelector('.review-snapshot');
        const h1 = document.querySelector('.public-state h1, h1')?.textContent?.trim();
        return { done, snap: !!snap, h1, overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      info.push(`form submit: ${JSON.stringify(after)}`);
      if (!after.done) problems.push('form submit: no thank-you state after submitting');
      if (!after.snap) problems.push('form submit: no review snapshot shown');
      if (!/thank you/i.test(after.h1 ?? '')) problems.push(`form submit: unexpected heading ${JSON.stringify(after.h1)}`);
      if (after.overflowX > 2) problems.push(`thank-you page: overflowX=${after.overflowX}`);
    } catch (e) {
      problems.push(`form submit: FATAL ${String(e).split('\n')[0]}`);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log('=== FACTS ===');
  info.forEach((l) => console.log('  ' + l));
  console.log(problems.length ? `\n=== PROBLEMS (${problems.length}) ===\n` + problems.join('\n') : '\n=== ALL EMBED & FORM CHECKS PASSED ===');
})();
