/* shoot.js — screenshot harness for VISUAL inspection.
 *
 * Renders key routes at every device size and saves PNGs to e2e/shots/.
 * Use this when you have image input: run it, then open the PNGs and look
 * at them (alignment, clipping, contrast, spacing, overlap — the things
 * measurements can't judge). Without image input, use the verify-*.js
 * scripts instead: they turn the same pages into pass/fail measurements.
 *
 * Usage (from e2e/, after setup-browser.sh, with dev servers running):
 *   node shoot.js                        # everything (~26 routes x 10 sizes)
 *   ONLY=login,products node shoot.js    # route filter by name
 *   SIZE=phone node shoot.js             # one size
 *   SIZE=phone ONLY=wall,form node shoot.js
 *   FULLPAGE=1 node shoot.js             # full-page height, not just viewport
 *   WAIT=1500 node shoot.js              # extra settle time for slow pages
 *
 * Output: shots/{size}--{route}.png plus a PROBLEMS list of pages whose
 * document scrolls horizontally (screenshots of those are still taken).
 */
const fs = require('fs');
const { chromium } = require('playwright');
const { launchOptions, BASE, login, settle, SIZES } = require('./browser');

const ROUTES = [
  { name: 'login', path: '/login', auth: null },
  { name: 'form', path: '/forms/website-review', auth: null }, // public review form
  { name: 'wall', path: '/wall/acme-marketing-site', auth: null }, // public testimonial wall
  { name: 'overview', path: '/app/overview', auth: 'company' },
  { name: 'products', path: '/app/products', auth: 'company' },
  { name: 'team', path: '/app/team', auth: 'company' },
  { name: 'settings', path: '/app/settings', auth: 'company' },
  { name: 'theme', path: '/app/settings/theme', auth: 'company' },
  { name: 'templates', path: '/app/templates', auth: 'company' },
  { name: 'designs', path: '/app/designs', auth: 'company' },
  { name: 'builder', path: '/app/builder', auth: 'company' },
  { name: 'ai', path: '/app/ai', auth: 'company' },
  { name: 'media', path: '/app/media', auth: 'company' },
  { name: 'audit', path: '/app/audit', auth: 'company' },
  { name: 'account', path: '/app/settings/account', auth: 'company' },
  // product-scoped (the :appId is resolved from the demo data at runtime)
  { name: 'app-overview', path: '/app/a/{appId}/overview', auth: 'company' },
  { name: 'connect', path: '/app/a/{appId}/connect', auth: 'company' },
  { name: 'embed', path: '/app/a/{appId}/embed', auth: 'company' },
  { name: 'testimonials', path: '/app/a/{appId}/testimonials', auth: 'company' },
  { name: 'moderation', path: '/app/a/{appId}/testimonials/moderation', auth: 'company' },
  { name: 'forms', path: '/app/a/{appId}/forms', auth: 'company' },
  { name: 'studio', path: '/app/a/{appId}/studio', auth: 'company' },
  // platform console
  { name: 'platform-overview', path: '/platform/overview', auth: 'platform' },
  { name: 'platform-tenants', path: '/platform/tenants', auth: 'platform' },
  { name: 'platform-accounts', path: '/platform/accounts', auth: 'platform' },
  { name: 'platform-templates', path: '/platform/templates', auth: 'platform' },
  { name: 'platform-audit', path: '/platform/audit', auth: 'platform' },
  { name: '404', path: '/nope', auth: 'company' },
];

(async () => {
  const browser = await chromium.launch(launchOptions());
  const only = process.env.ONLY; // e.g. "login,wall"
  const routes = ROUTES.filter((r) => !only || only.split(',').includes(r.name));
  const sizes = SIZES.filter((s) => !process.env.SIZE || process.env.SIZE === s.name);
  const outDir = process.env.OUTDIR || 'shots';
  const extraWait = Number(process.env.WAIT || 600);
  const fullPage = process.env.FULLPAGE === '1';
  fs.mkdirSync(outDir, { recursive: true });

  // Resolve the demo product id once (routes use the {appId} placeholder).
  let appId = '';
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await login(ctx, 'company');
    const p = await ctx.newPage();
    await p.goto(`${BASE}/app/products`, { waitUntil: 'networkidle' });
    await settle(p);
    const href = await p.evaluate(() => document.querySelector('a[href*="/app/a/"]')?.getAttribute('href'));
    appId = href?.match(/\/app\/a\/([^/]+)/)?.[1] ?? '';
    await ctx.close();
  }

  const problems = [];
  const files = [];
  for (const size of sizes) {
    for (const route of routes) {
      const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        deviceScaleFactor: size.width >= 1280 ? 1 : 2, // phones/tablets render at 2x (retina)
        isMobile: !!size.touch,
        hasTouch: !!size.touch,
      });
      try {
        if (route.auth) await login(context, route.auth);
        const page = await context.newPage();
        const target = route.path.replace('{appId}', appId);
        await page.goto(`${BASE}${target}`, { waitUntil: 'networkidle', timeout: 25000 });
        await settle(page);
        await page.waitForTimeout(extraWait);

        if (route.auth && new URL(page.url()).pathname.startsWith('/login')) {
          problems.push(`${size.name} ${route.name}: bounced to login`);
          continue;
        }

        // cheap objective check to accompany the picture
        const m = await page.evaluate(() => ({
          overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }));
        const file = `${outDir}/${size.name}--${route.name}.png`;
        await page.screenshot({ path: file, fullPage });
        files.push(file);
        if (m.overflowX > 2) problems.push(`${size.name} ${route.name}: docOverflow=${m.overflowX}px`);
      } catch (e) {
        problems.push(`${size.name} ${route.name}: ERROR ${String(e).split('\n')[0]}`);
      } finally {
        await context.close();
      }
    }
  }
  await browser.close();
  console.log('=== SCREENSHOTS ===');
  files.forEach((f) => console.log('  ' + f));
  console.log(problems.length ? `\n=== PROBLEMS (${problems.length}) ===\n` + problems.join('\n') : '\n=== NO HORIZONTAL OVERFLOW DETECTED ===');
})();
