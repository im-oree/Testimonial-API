/* verify-phone.js — real interaction flows on a phone viewport (390x844, touch):
 *   1. bottom tab-bar tap navigates
 *   2. kebab menu opens as a bottom action sheet, edge-to-edge, on screen
 *   3. edit modal: centered, body scroll-locked, primary action at the bottom
 *      of the stacked actions (thumb zone), Escape closes, scroll restored
 *   4. a moderation action produces a visible toast
 *   5. wide tables scroll INSIDE their card, never the page
 *   6. create-product modal: centered + backdrop click closes
 *
 * Usage: node verify-phone.js
 */
const { chromium } = require('playwright');
const { launchOptions, BASE, login, settle } = require('./browser');

(async () => {
  const browser = await chromium.launch(launchOptions());
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const problems = [];
  const info = [];

  await login(context, 'company');
  await settle(page);

  await page.goto(`${BASE}/app/products`, { waitUntil: 'networkidle' });
  await settle(page);
  const href = await page.evaluate(() => document.querySelector('a[href*="/app/a/"]')?.getAttribute('href'));
  const appId = href?.match(/\/app\/a\/([^/]+)/)?.[1];
  info.push(`appId=${appId}`);

  // ---- 1. bottom tab bar tap navigates
  const teamTab = page.locator('.sidebar .nav-link', { hasText: 'Team' }).first();
  if (await teamTab.count()) {
    await teamTab.click();
    await page.waitForTimeout(600);
    const onTeam = page.url().includes('/team');
    info.push(`tab tap -> ${page.url()} ok=${onTeam}`);
    if (!onTeam) problems.push('bottom tab tap did not navigate to team');
  } else problems.push('no Team tab in bottom bar');

  // ---- 2. kebab menu becomes a bottom action sheet
  await page.goto(`${BASE}/app/a/${appId}/testimonials`, { waitUntil: 'networkidle' });
  await settle(page);
  await page.waitForTimeout(400);
  const kebab = page.locator('.t-menu button, .ctx-trigger').first();
  await kebab.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }));
  await page.waitForTimeout(200);
  await kebab.click();
  await page.waitForTimeout(350);
  const sheet = await page.evaluate(() => {
    const p = document.querySelector('.ctx-panel');
    if (!p) return null;
    const r = p.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(innerWidth - r.right), top: Math.round(r.top), bottom: Math.round(innerHeight - r.bottom), w: Math.round(r.width), h: Math.round(r.height) };
  });
  info.push(`kebab sheet: ${JSON.stringify(sheet)}`);
  if (!sheet) problems.push('kebab sheet did not open');
  else {
    if (sheet.left < 8 || sheet.right < 8) problems.push(`kebab sheet not edge-to-edge: L=${sheet.left} R=${sheet.right}`);
    if (sheet.bottom > 20) problems.push(`kebab sheet not at screen bottom (bottom gap ${sheet.bottom})`);
    if (sheet.top < 8) problems.push('kebab sheet off top of screen');
  }

  // ---- 3. edit modal opens from the sheet; centered, locked, stacked actions
  const editItem = page.locator('.ctx-item').first();
  await editItem.click();
  await page.waitForTimeout(450);
  const modal = await page.evaluate(() => {
    const m = document.querySelector('.modal');
    if (!m) return null;
    const r = m.getBoundingClientRect();
    return { w: Math.round(r.width), centered: Math.abs(r.left - (innerWidth - r.right)) < 3, bodyScrollLocked: document.body.style.overflow === 'hidden' };
  });
  info.push(`edit modal: ${JSON.stringify(modal)}`);
  if (!modal) problems.push('edit modal did not open from sheet');
  else {
    if (!modal.centered) problems.push('edit modal not centered');
    if (!modal.bodyScrollLocked) problems.push('body not scroll-locked under modal');
  }
  const editActions = await page.evaluate(() => {
    const actions = document.querySelector('.modal .modal-actions');
    if (!actions) return null;
    const btns = [...actions.querySelectorAll('.btn')];
    if (btns.length < 2) return { n: btns.length };
    return { n: btns.length, primaryLabel: btns[btns.length - 1].textContent?.trim().slice(0, 18), primaryAtBottom: btns[btns.length - 1].getBoundingClientRect().top > btns[0].getBoundingClientRect().top };
  });
  info.push(`edit modal actions: ${JSON.stringify(editActions)}`);
  if (editActions && editActions.primaryAtBottom === false) problems.push('edit modal primary action not at bottom of stacked actions');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1100); // framer-motion spring exit can linger ~0.5s
  const closed = await page.evaluate(() => !document.querySelector('.modal-backdrop'));
  const unlocked = await page.evaluate(() => document.body.style.overflow !== 'hidden');
  info.push(`escape closed=${closed} scrollUnlocked=${unlocked}`);
  if (!closed) problems.push('Escape did not close modal');
  if (!unlocked) problems.push('body scroll stayed locked after modal closed');

  // ---- 4. an action produces a toast (toggle wall visibility via the sheet)
  const kebab2 = page.locator('.t-menu button, .ctx-trigger').first();
  await kebab2.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }));
  await page.waitForTimeout(200);
  await kebab2.click();
  await page.waitForTimeout(350);
  const items = await page.locator('.ctx-item').allTextContents();
  const statusItem = items.find((t) => /approve|reject|archive|wall|publish|unpublish|feature/i.test(t));
  if (statusItem) {
    await page.locator('.ctx-item', { hasText: statusItem.trim().slice(0, 18) }).first().click();
    await page.waitForTimeout(700);
    const toastInfo = await page.evaluate(() => {
      const t = document.querySelector('.toast');
      if (!t) return null;
      const r = t.getBoundingClientRect();
      return { text: t.textContent?.trim().slice(0, 40), visible: r.top > 0 && r.bottom < innerHeight };
    });
    info.push(`toast: ${JSON.stringify(toastInfo)} (sheet item: ${statusItem.trim().slice(0, 30)})`);
    if (!toastInfo) problems.push('status change produced no toast');
    else if (!toastInfo.visible) problems.push('toast not fully visible');
    await page.waitForTimeout(3000); // let it auto-dismiss
  }

  // ---- 5. wide table scrolls inside its card, not the page
  const tableScroll = await page.evaluate(() => {
    const card = document.querySelector('.table-card');
    if (!card) return null;
    const canScroll = card.scrollWidth > card.clientWidth;
    const pageOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    card.scrollLeft = 40;
    const moved = card.scrollLeft > 0;
    return { canScroll, pageOverflow, moved, sw: card.scrollWidth, cw: card.clientWidth };
  });
  info.push(`table scroll: ${JSON.stringify(tableScroll)}`);
  if (tableScroll && tableScroll.canScroll && !tableScroll.moved) problems.push('table card cannot scroll horizontally');
  if (tableScroll && tableScroll.pageOverflow > 2) problems.push('page scrolls sideways instead of the table');

  // ---- 6. create-product modal + backdrop close
  await page.goto(`${BASE}/app/products`, { waitUntil: 'networkidle' });
  await settle(page);
  const newBtn = page.locator('button', { hasText: 'New product' }).first();
  if (await newBtn.count()) {
    await newBtn.click();
    await page.waitForTimeout(400);
    const box = await page.evaluate(() => {
      const m = document.querySelector('.modal');
      if (!m) return null;
      const r = m.getBoundingClientRect();
      return { centered: Math.abs(r.left - (innerWidth - r.right)) < 3 };
    });
    info.push(`product modal: ${JSON.stringify(box)}`);
    if (box && !box.centered) problems.push('product modal not centered on phone');
    await page.mouse.click(4, 100); // the backdrop strip left of the modal
    await page.waitForTimeout(1100);
    const closed2 = await page.evaluate(() => !document.querySelector('.modal-backdrop'));
    info.push(`backdrop closed=${closed2}`);
    if (!closed2) problems.push('backdrop click did not close modal');
  }

  await browser.close();
  console.log('=== FACTS ===');
  info.forEach((l) => console.log('  ' + l));
  console.log(problems.length ? `\n=== PROBLEMS (${problems.length}) ===\n` + problems.join('\n') : '\n=== ALL PHONE FLOW CHECKS PASSED ===');
})();
