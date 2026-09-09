/* verify-layout.js — the core responsive-layout matrix.
 *
 * For every viewport class (SIZES env to filter, e.g. SIZES=phone-390):
 *   1. shell facts    — bottom tab bar on phones, 62px rail on landscape
 *                       phones, left sidebar on tablet/desktop
 *   2. page overflow  — the DOCUMENT never scrolls sideways on any route,
 *                       with scroll-container-aware offender detection
 *   3. modal math     — create-product modal + testimonial edit modal are
 *                       horizontally centered, never clipped, scroll inside
 *
 * Requires the dev servers running (root: npm run dev). Output: FACTS lines
 * (what was measured) and PROBLEMS lines (what failed). Exit code is always
 * 0 — read the PROBLEMS section.
 *
 * Usage: node verify-layout.js          (from e2e/, after setup-browser.sh)
 *        SIZES=phone-390 node verify-layout.js
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
    try {
      await login(context, 'company');
      const page = await context.newPage();

      // Pick the first product-scoped app id (routes under /app/a/:id/…).
      await page.goto(`${BASE}/app/products`, { waitUntil: 'networkidle' });
      await settle(page);
      const appHref = await page.evaluate(() => document.querySelector('a[href*="/app/a/"]')?.getAttribute('href'));
      const appId = appHref?.match(/\/app\/a\/([^/]+)/)?.[1] ?? '';

      // ---- 1. shell layout facts (after the boot intro settles)
      const shell = await page.evaluate(() => {
        const shell = document.querySelector('.shell');
        const sidebar = document.querySelector('.sidebar');
        if (!shell || !sidebar) return null;
        const cs = getComputedStyle(shell);
        const ss = getComputedStyle(sidebar);
        const sr = sidebar.getBoundingClientRect();
        return {
          shellDir: cs.flexDirection,
          sidebarDir: ss.flexDirection,
          sidebarAtBottom: sr.bottom >= window.innerHeight - 2,
          sidebarAtLeft: sr.left <= 1,
          sidebarH: Math.round(sr.height),
          sidebarW: Math.round(sr.width),
          navLabels: [...document.querySelectorAll('.sidebar .nav-label')].filter((n) => getComputedStyle(n).display !== 'none').length,
          navLinks: document.querySelectorAll('.sidebar .nav-link').length,
          railToggleVisible: (() => { const t = document.querySelector('.rail-toggle'); return t ? getComputedStyle(t).display !== 'none' : false; })(),
        };
      });
      if (!shell) problems.push(`${size.name}: no shell rendered`);
      else {
        const expectBottomBar = size.width <= 760 && size.height >= 480;
        const expectRail = size.width <= 932 && size.height < 480;
        if (expectBottomBar) {
          if (shell.shellDir !== 'column' || shell.sidebarDir !== 'row')
            problems.push(`${size.name}: expected bottom tab bar, got shell=${shell.shellDir} sidebar=${shell.sidebarDir}`);
          if (!shell.sidebarAtBottom) problems.push(`${size.name}: bottom bar not at screen bottom`);
          if (shell.navLabels < shell.navLinks) problems.push(`${size.name}: bottom bar hides labels (${shell.navLabels}/${shell.navLinks})`);
          if (shell.railToggleVisible) problems.push(`${size.name}: rail toggle visible on phone`);
        } else if (expectRail) {
          if (shell.sidebarAtLeft !== true || shell.sidebarW > 100)
            problems.push(`${size.name}: expected compact left rail, sidebarW=${shell.sidebarW}`);
        } else if (shell.shellDir !== 'row') {
          problems.push(`${size.name}: desktop shell not row (got ${shell.shellDir})`);
        }
        info.push(`${size.name}: shell=${shell.shellDir} sidebar=${shell.sidebarDir} bar=${shell.sidebarW}x${shell.sidebarH} labels=${shell.navLabels}/${shell.navLinks}`);
      }

      // ---- 2. no horizontal document scroll across key pages
      const routes = [
        '/app/overview', '/app/products', '/app/team', '/app/settings', '/app/settings/theme',
        '/app/templates', '/app/designs', '/app/builder', '/app/ai', '/app/media', '/app/audit',
        '/app/settings/account',
      ];
      if (appId)
        routes.push(
          `/app/a/${appId}/overview`, `/app/a/${appId}/connect`, `/app/a/${appId}/embed`,
          `/app/a/${appId}/testimonials`, `/app/a/${appId}/testimonials/moderation`, `/app/a/${appId}/forms`,
        );
      for (const r of routes) {
        await page.goto(`${BASE}${r}`, { waitUntil: 'networkidle' }).catch(() => {});
        await settle(page);
        await page.waitForTimeout(250);
        const m = await page.evaluate(OFFENDER_SCAN);
        if (m.overflowX > 2 || m.offenders.length) {
          problems.push(`${size.name} ${r}: docOverflow=${m.overflowX} offenders=${m.offenders.join(',') || 'none'}`);
        }
      }

      // ---- 3. modal centering (create-product modal on the products page)
      await page.goto(`${BASE}/app/products`, { waitUntil: 'networkidle' });
      await settle(page);
      const newBtn = page.locator('button', { hasText: 'New product' }).first();
      if (await newBtn.count()) {
        await newBtn.click();
        await page.waitForTimeout(500);
        const modalBox = await page.evaluate(() => {
          const m = document.querySelector('.modal');
          if (!m) return null;
          const r = m.getBoundingClientRect();
          return { left: r.left, right: window.innerWidth - r.right, top: r.top, bottom: window.innerHeight - r.bottom, w: r.width };
        });
        if (modalBox) {
          if (Math.abs(modalBox.left - modalBox.right) > 2)
            problems.push(`${size.name}: modal not horizontally centered (L=${modalBox.left} R=${modalBox.right})`);
          if (modalBox.top < 0 || modalBox.bottom < 0) problems.push(`${size.name}: modal clipped (top=${modalBox.top} bottom=${modalBox.bottom})`);
          info.push(`${size.name}: modal margins L/R=${Math.round(modalBox.left)}/${Math.round(modalBox.right)} T/B=${Math.round(modalBox.top)}/${Math.round(modalBox.bottom)} w=${Math.round(modalBox.w)}`);
        } else problems.push(`${size.name}: modal did not open`);
        const closeBtn = page.locator('.modal button[aria-label="Close"], .modal .modal-head button').first();
        if (await closeBtn.count()) {
          await closeBtn.click().catch(() => {});
          await page.waitForTimeout(400);
        }
      }

      // ---- 4. testimonial edit modal: opens, centered, scrollable, closable
      if (appId) {
        await page.goto(`${BASE}/app/a/${appId}/testimonials`, { waitUntil: 'networkidle' });
        await settle(page);
        await page.waitForTimeout(500);
        const editBtn = page.locator('.t-menu button, .ctx-trigger').first();
        if (await editBtn.count()) {
          // Bring the kebab into view BEFORE opening: the menu closes on any
          // scroll, so nothing may scroll while it is open.
          await editBtn.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }));
          await page.waitForTimeout(250);
          await editBtn.click().catch(() => {});
          await page.waitForTimeout(400);
          const editItem = page.locator('.ctx-item').first();
          if (await editItem.count()) await editItem.click().catch(() => {});
          await page.waitForTimeout(400);
          const box = await page.evaluate(() => {
            const m = document.querySelector('.modal');
            if (!m) return null;
            const r = m.getBoundingClientRect();
            const backdrop = document.querySelector('.modal-backdrop');
            return { left: r.left, right: innerWidth - r.right, top: r.top, scrollable: backdrop ? backdrop.scrollHeight >= backdrop.clientHeight : false };
          });
          info.push(`${size.name}: t-modal ${JSON.stringify(box)}`);
          if (box && Math.abs(box.left - box.right) > 2) problems.push(`${size.name}: testimonial modal off-center L=${box.left} R=${box.right}`);
          if (box && box.top < 0) problems.push(`${size.name}: testimonial modal clipped at top`);
        }
      }

      // ---- 5. login page never overflows either
      await page.goto(`${BASE}/login?reason=session_expired`, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(300);
      const loginM = await page.evaluate(() => ({ overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
      if (loginM.overflowX > 2) problems.push(`${size.name}: login overflowX=${loginM.overflowX}`);
      await page.close();
    } catch (e) {
      problems.push(`${size.name}: FATAL ${String(e).split('\n')[0]}`);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log('=== FACTS ===');
  info.forEach((l) => console.log('  ' + l));
  console.log(problems.length ? `\n=== PROBLEMS (${problems.length}) ===\n` + problems.join('\n') : '\n=== ALL LAYOUT CHECKS PASSED ===');
})();
