/* verify-surfaces.js — surfaces beyond the authed shell:
 *   · design studio (immersive shell, floating panels inside the viewport)
 *   · public form + public wall (the no-login pages customers' visitors see)
 *   · platform admin console (separate login mode)
 *   · touch-target sizes on a dense management page (coarse pointers only)
 *
 * Usage: node verify-surfaces.js      (SIZES env filters, see browser.js)
 */
const { chromium } = require('playwright');
const { launchOptions, BASE, login, settle, OFFENDER_SCAN, pickSizes } = require('./browser');

(async () => {
  const browser = await chromium.launch(launchOptions());
  const problems = [];
  const info = [];

  for (const size of pickSizes()) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      isMobile: !!size.touch,
      hasTouch: !!size.touch,
    });
    const page = await context.newPage();
    try {
      await login(context, 'company');
      await settle(page);

      await page.goto(`${BASE}/app/products`, { waitUntil: 'networkidle' });
      await settle(page);
      const href = await page.evaluate(() => document.querySelector('a[href*="/app/a/"]')?.getAttribute('href'));
      const appId = href?.match(/\/app\/a\/([^/]+)/)?.[1];

      // ---------- design studio (immersive shell) ----------
      if (appId) {
        await page.goto(`${BASE}/app/a/${appId}/studio`, { waitUntil: 'networkidle' });
        await settle(page);
        await page.waitForTimeout(1200);
        const studio = await page.evaluate(() => {
          const immersive = !!document.querySelector('.shell-immersive');
          const sidebar = document.querySelector('.sidebar');
          const sidebarVisible = sidebar ? getComputedStyle(sidebar).display !== 'none' : false;
          const ov = [...document.querySelectorAll('.studio-ov')];
          const vw = document.documentElement.clientWidth;
          const clippedPanel = ov.find((p) => { const r = p.getBoundingClientRect(); return r.right > vw + 3 || r.left < -3; });
          const toolbar = document.querySelector('.studio-toolbar');
          const tr = toolbar?.getBoundingClientRect();
          return { immersive, sidebarVisible, panels: ov.length, clippedPanel: !!clippedPanel, toolbarFits: tr ? tr.left >= 0 && tr.right <= vw : null };
        });
        info.push(`${size.name}: studio ${JSON.stringify(studio)}`);
        if (!studio.immersive) problems.push(`${size.name}: studio not immersive`);
        // Desktop keeps the nav sidebar beside the immersive studio (existing
        // design); small/touch viewports hide it so the canvas owns the screen.
        if (size.touch && studio.sidebarVisible) problems.push(`${size.name}: sidebar visible in immersive studio on a phone`);
        if (studio.clippedPanel) problems.push(`${size.name}: studio panel clipped off-screen`);
        const so = await page.evaluate(OFFENDER_SCAN);
        if (so.length) problems.push(`${size.name} studio: offenders ${so.join(',')}`);

        // ---------- public form ----------
        await page.goto(`${BASE}/forms/website-review`, { waitUntil: 'networkidle' }).catch(() => {});
        await page.waitForTimeout(800);
        const formOff = await page.evaluate(OFFENDER_SCAN);
        const formFacts = await page.evaluate(() => {
          const cta = document.querySelector('.public-form .btn-lg, .public-actions .btn');
          const r = cta?.getBoundingClientRect();
          const sb = document.querySelector('.stars-interactive button.star');
          const sr = sb?.getBoundingClientRect();
          return {
            cta: r ? { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), right: Math.round(window.innerWidth - r.right) } : null,
            starH: sr ? Math.round(sr.height) : null,
          };
        });
        info.push(`${size.name}: public form ${JSON.stringify(formFacts)}`);
        if (formOff.offenders.length) problems.push(`${size.name} public form: ${formOff.offenders.join(',')}`);
        if (size.touch && formFacts.starH && formFacts.starH < 40) problems.push(`${size.name}: rating star target ${formFacts.starH}px < 40`);

        // ---------- public wall (hero widget must SCALES to fit, never crop) ----------
        await page.goto(`${BASE}/wall/acme-marketing-site`, { waitUntil: 'networkidle' }).catch(() => {});
        await page.waitForTimeout(900);
        const wallOff = await page.evaluate(OFFENDER_SCAN);
        const wallFacts = await page.evaluate(() => {
          const fit = document.querySelector('.wall-fit');
          const r = fit?.getBoundingClientRect();
          return { fit: !!fit, w: r ? Math.round(r.width) : null, cards: document.querySelectorAll('.wall-card').length };
        });
        info.push(`${size.name}: wall ${JSON.stringify(wallFacts)}`);
        if (wallOff.offenders.length) problems.push(`${size.name} wall: ${wallOff.offenders.join(',')}`);
      }

      // ---------- touch targets on a dense page (coarse pointers only) ----------
      if (size.touch && appId) {
        await page.goto(`${BASE}/app/a/${appId}/testimonials`, { waitUntil: 'networkidle' });
        await settle(page);
        const targets = await page.evaluate(() => {
          const small = [];
          document.querySelectorAll('.content button, .content a, .content input, .content select, .content textarea, .content .segment, .content .toggle').forEach((el) => {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return;
            if (el.matches('button:disabled, button[aria-disabled="true"]')) return; // not interactive
            const r = el.getBoundingClientRect();
            if (r.width < 2 || r.height < 2) return;
            if (r.bottom < 0 || r.top > innerHeight) return; // in-viewport only
            if (r.height < 30 || (r.width < 28 && !el.matches('input[type="checkbox"]')))
              small.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ${Math.round(r.width)}x${Math.round(r.height)}`);
          });
          return [...new Set(small)].slice(0, 8);
        });
        if (targets.length) info.push(`${size.name}: small touch targets (text links are usually fine): ${targets.join(' | ')}`);
      }

      // ---------- platform admin (separate login mode) ----------
      await context.clearCookies();
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }).catch(() => {});
      await login(context, 'platform');
      await settle(page);
      for (const r of ['/platform/overview', '/platform/tenants', '/platform/audit', '/platform/templates', '/platform/accounts']) {
        await page.goto(`${BASE}${r}`, { waitUntil: 'networkidle' });
        await settle(page);
        await page.waitForTimeout(300);
        const off = await page.evaluate(OFFENDER_SCAN);
        const oX = off.overflowX;
        if (oX > 2 || off.offenders.length) problems.push(`${size.name} ${r}: docOverflow=${oX} ${off.offenders.join(',')}`);
      }
      info.push(`${size.name}: platform pages scanned`);
    } catch (e) {
      problems.push(`${size.name}: FATAL ${String(e).split('\n')[0]}`);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log('=== FACTS ===');
  info.forEach((l) => console.log('  ' + l));
  console.log(problems.length ? `\n=== PROBLEMS (${problems.length}) ===\n` + problems.join('\n') : '\n=== ALL SURFACE CHECKS PASSED ===');
})();
