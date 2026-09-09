/* payload-check.js — how much JS does a given page actually download?
 *
 * Loads a page in a fresh context and lists every JS response with sizes —
 * the honest number for "is this fast on a phone?" (raw bytes; gzip is
 * roughly 1/3 of that for JS).
 *
 * Usage (from e2e/):
 *   node payload-check.js                          # public wall on :3001
 *   BASE_URL=http://127.0.0.1:4173 node payload-check.js   # production build
 *   node payload-check.js /forms/website-review    # any path
 */
const { chromium } = require('playwright');
const { launchOptions, BASE } = require('./browser');

(async () => {
  const path = process.argv[2] || '/wall/acme-marketing-site';
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // a phone, the worst case
  const files = [];
  page.on('response', async (r) => {
    if (r.url().endsWith('.js')) {
      try {
        files.push([r.url().split('/').pop(), (await r.body()).length]);
      } catch {
        /* cached / opaque bodies are skipped */
      }
    }
  });
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500); // let lazy route chunks + data settle
  await browser.close();

  files.sort((a, b) => b[1] - a[1]).forEach(([f, s]) => console.log(`  ${(s / 1024).toFixed(0).padStart(6)} KB  ${f}`));
  const total = files.reduce((a, [, s]) => a + s, 0);
  console.log(`  ${'─'.repeat(34)}`);
  console.log(`  ${path}: ${files.length} JS files, ${(total / 1024).toFixed(0)} KB raw (~${(total / 1024 / 3).toFixed(0)} KB gzip)`);
})();
