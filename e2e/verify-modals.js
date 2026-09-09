/* One-off sweep: every remaining modal opens, centers, and fits a phone. */
const { chromium } = require('playwright');
const { launchOptions, BASE, login, settle } = require('./browser');

(async () => {
  const browser = await chromium.launch(launchOptions());
  const problems = [];
  const info = [];

  async function openModal(page, label, trigger) {
    const btn = page.locator('button', { hasText: trigger }).first();
    if (!(await btn.count())) {
      info.push(`${label}: SKIPPED (no button matching ${trigger})`);
      return { skipped: true };
    }
    await btn.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }));
    await btn.click();
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const modal = document.querySelector('.modal');
      if (!modal) return null;
      const r = modal.getBoundingClientRect();
      const backdrop = document.querySelector('.modal-backdrop');
      return {
        w: Math.round(r.width),
        centered: Math.abs(r.left - (innerWidth - r.right)) < 3,
        clipped: r.top < 0 || r.bottom > innerHeight,
        scrollable: backdrop ? backdrop.scrollHeight >= backdrop.clientHeight : null,
        locked: document.body.style.overflow === 'hidden',
      };
    });
    info.push(`${label}: ${JSON.stringify(m)}`);
    if (!m) problems.push(`${label}: modal did not open`);
    else {
      if (!m.centered) problems.push(`${label}: not centered`);
      if (m.clipped && m.scrollable === false) problems.push(`${label}: clipped and not scrollable`);
      if (!m.locked) problems.push(`${label}: body not scroll-locked`);
    }
    // close via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1100);
    return { ok: !!m };
  }

  // ---- phone, company side ----
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await login(context, 'company');
    await settle(page);

    // Team invite modal
    await page.goto(`${BASE}/app/team`, { waitUntil: 'networkidle' });
    await settle(page);
    await openModal(page, 'team invite', /invite/i);

    // Product-scoped: testimonial "New testimonial" button (not kebab)
    await page.goto(`${BASE}/app/products`, { waitUntil: 'networkidle' });
    await settle(page);
    const href = await page.evaluate(() => document.querySelector('a[href*="/app/a/"]')?.getAttribute('href'));
    const appId = href?.match(/\/app\/a\/([^/]+)/)?.[1];
    await page.goto(`${BASE}/app/a/${appId}/testimonials`, { waitUntil: 'networkidle' });
    await settle(page);
    await openModal(page, 'new testimonial', /new testimonial|add testimonial/i);

    // AI studio apply confirm (ConfirmDialog with the new loading spinner)
    await page.goto(`${BASE}/app/ai`, { waitUntil: 'networkidle' });
    await settle(page);
    await page.waitForTimeout(800);
    // generate a design so the apply button enables
    const gen = page.locator('.tpl-cat-pill').first();
    if (await gen.count()) {
      await gen.click();
      await page.waitForTimeout(2500);
      const applyBtn = page.locator('button', { hasText: /apply|publish/i }).first();
      if (await applyBtn.count()) {
        await applyBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        const disabled = await applyBtn.isDisabled().catch(() => true);
        if (!disabled) await openModal(page, 'ai apply confirm', /apply|publish/i);
        else info.push('ai apply confirm: button disabled (no generation) — skipped');
      }
    } else info.push('ai: no prompt pills — skipped');
    await context.close();
  }

  // ---- phone, platform side ----
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await login(context, 'platform');
    await settle(page);

    await page.goto(`${BASE}/platform/tenants`, { waitUntil: 'networkidle' });
    await settle(page);
    await openModal(page, 'create tenant', /new tenant/i);

    await page.goto(`${BASE}/platform/accounts`, { waitUntil: 'networkidle' });
    await settle(page);
    await openModal(page, 'create staff', /add account/i);

    // manage staff: inline "Manage access" button on the first row
    const manageBtn = page.locator('button', { hasText: /manage access|view access/i }).first();
    if (await manageBtn.count()) {
      await manageBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await manageBtn.click();
      await page.waitForTimeout(500);
      const m = await page.evaluate(() => {
        const modal = document.querySelector('.modal');
        if (!modal) return null;
        const r = modal.getBoundingClientRect();
        const backdrop = document.querySelector('.modal-backdrop');
        return { w: Math.round(r.width), centered: Math.abs(r.left - (innerWidth - r.right)) < 3, clipped: r.top < 0 || r.bottom > innerHeight, scrollable: backdrop ? backdrop.scrollHeight >= backdrop.clientHeight : null, locked: document.body.style.overflow === 'hidden' };
      });
      info.push(`manage staff: ${JSON.stringify(m)}`);
      if (!m) problems.push('manage staff modal did not open');
      else {
        if (!m.centered) problems.push('manage staff modal not centered');
        if (m.clipped && m.scrollable === false) problems.push('manage staff modal clipped and not scrollable');
        if (!m.locked) problems.push('manage staff modal did not lock scroll');
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1100);
    } else info.push('manage staff: no manage button found');
    await context.close();
  }

  await browser.close();
  console.log('=== FACTS ===');
  info.forEach((l) => console.log('  ' + l));
  console.log(problems.length ? `\n=== PROBLEMS (${problems.length}) ===\n` + problems.join('\n') : '\n=== ALL MODAL SWEEP CHECKS PASSED ===');
})();
