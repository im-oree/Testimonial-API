/** Shared launch config for the sandbox Chromium (see setup-browser.sh).
 *  All scripts require this so the binary location is configured in ONE place.
 *
 *  Env overrides (rarely needed):
 *    BROWSER_PATH  path to the chromium executable (default e2e/.browser/chromium)
 *    LIBS_PATH     LD_LIBRARY_PATH for the bundled nss/swiftshader libs
 *    BASE_URL      the dev server to test (default http://127.0.0.1:3001)
 */
const path = require('path');

const DIR = path.join(__dirname, '.browser');

function launchOptions() {
  return {
    executablePath: process.env.BROWSER_PATH || path.join(DIR, 'chromium'),
    env: { ...process.env, LD_LIBRARY_PATH: process.env.LIBS_PATH || path.join(DIR, 'libs') },
    // --no-sandbox / --disable-setuid-sandbox: required in containers without user namespaces
    // --disable-dev-shm-usage: /dev/shm is tiny in sandboxes; use /tmp instead
    // --disable-gpu + --enable-unsafe-swiftshader: software GL via the bundled libs
    // (do NOT add --single-process: it crashes as soon as a second context opens)
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--enable-unsafe-swiftshader'],
  };
}

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3001';

/** Demo logins (server/src/demo-data.ts). */
const ACCOUNTS = {
  company: { email: 'owner@acme.test', password: 'demo1234' },
  platform: { email: 'admin@zojatech.test', password: 'demo1234' },
};

/** Log a fresh context in as `kind` ('company' | 'platform').
 *  Platform staff sign in at /login?mode=platform — the plain endpoint
 *  rejects their accounts. */
async function login(context, kind) {
  const page = await context.newPage();
  const account = ACCOUNTS[kind];
  await page.goto(`${BASE}/login${kind === 'platform' ? '?mode=platform' : ''}`, { waitUntil: 'networkidle' });
  await page.fill('#login-email', account.email);
  await page.fill('#login-password', account.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app|\/platform/, { timeout: 15000 });
  await page.close();
}

/** The app plays a short scale-in intro on first load (class `app-boot` on
 *  .app-root). Measuring during it produces garbage — every script waits it
 *  out with this. */
const settle = (page) =>
  page
    .waitForFunction(() => !document.querySelector('.app-root')?.className.includes('app-boot'), null, { timeout: 8000 })
    .catch(() => {});

/** Walk the DOM reporting elements that overflow the viewport, but STOP
 *  descending once inside a horizontal scroll container that actually
 *  scrolls (its children are clipped there — a swipe table is FINE, only
 *  page-level overflow is a bug). Runs inside page.evaluate. */
const OFFENDER_SCAN = `(() => {
  const offenders = [];
  const vw = document.documentElement.clientWidth;
  const walk = (el, scrollAncestor) => {
    for (const c of el.children) {
      const cs = getComputedStyle(c);
      const scrolls = scrollAncestor || (/(auto|scroll)/.test(cs.overflowX) && c.scrollWidth > c.clientWidth);
      const r = c.getBoundingClientRect();
      if (!scrolls && r.width > 1 && r.right > vw + 3 && !c.closest('.studio-viewport') && !c.closest('.studio-world')) {
        offenders.push(c.tagName.toLowerCase() + '.' + String(c.className).split(' ')[0] + '(+' + Math.round(r.right - vw) + 'px)');
      }
      walk(c, scrolls);
    }
  };
  walk(document.body, false);
  return { overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth, offenders: offenders.slice(0, 5) };
})()`;

/** Standard viewport classes every check runs against. */
const SIZES = [
  { name: 'fold-280', width: 280, height: 653, touch: true }, // Galaxy Fold
  { name: 'se-320', width: 320, height: 568, touch: true }, // iPhone SE
  { name: 'phone-390', width: 390, height: 844, touch: true }, // iPhone 12/13/14
  { name: 'phablet-430', width: 430, height: 932, touch: true }, // iPhone Pro Max
  { name: 'landscape-phone', width: 844, height: 390, touch: true }, // phone on its side
  { name: 'tablet-768', width: 768, height: 1024 }, // iPad portrait
  { name: 'tablet-1024', width: 1024, height: 768 }, // iPad landscape
  { name: 'laptop-1280', width: 1280, height: 800 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'tall-412x1500', width: 412, height: 1500, touch: true }, // tall narrow
];

function pickSizes() {
  const filter = process.env.SIZES; // e.g. SIZES=phone-390,desktop-1920
  return filter ? SIZES.filter((s) => filter.split(',').includes(s.name)) : SIZES;
}

module.exports = { launchOptions, BASE, ACCOUNTS, login, settle, OFFENDER_SCAN, SIZES, pickSizes };
