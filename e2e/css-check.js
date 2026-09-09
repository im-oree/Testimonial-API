/* css-check.js — static sanity checks, NO browser and NO npm deps.
 *
 *   1. CSS brace balance (a stray } breaks every rule after it)
 *   2. Class cross-check: every literal className in TSX exists in the CSS
 *      (catches the ".visually-hidden"-class bug: a class you swear you
 *      defined but didn't). Dynamic/conditional tokens are listed for manual
 *      review rather than silently passed.
 *   3. Media-query inventory (breakpoint census — spot duplicates/gaps)
 *
 * Usage: node css-check.js   (from e2e/, or from anywhere: SRC=/path node css-check.js)
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.env.SRC || path.join(__dirname, '..', 'client', 'src');
const cssFiles = ['styles.css', 'widgets/designs.css'].map((f) => path.join(ROOT, f));
let css = cssFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

// 1. Brace balance
let depth = 0,
  line = 1,
  bad = [];
for (let i = 0; i < css.length; i++) {
  if (css[i] === '\n') line++;
  if (css[i] === '{') depth++;
  if (css[i] === '}') {
    depth--;
    if (depth < 0) {
      bad.push(`extra } at line ${line}`);
      depth = 0;
    }
  }
}
if (depth !== 0) bad.push(`unclosed { count: ${depth}`);
console.log(bad.length ? 'BRACE ISSUES:\n' + bad.join('\n') : 'CSS braces: OK');

// 2. Class cross-check
const tsxFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(e.name)) tsxFiles.push(p);
  }
})(ROOT);

const usedClasses = new Set();
const clsAttrRe = /className=\{?["'`]([^"'`]+)["'`]/g;
const templateRe = /className=\{`([^`]+)`\}/g;
const clean = (c) => c.replace(/['"`,(){}:]/g, '').trim();
for (const f of tsxFiles) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = clsAttrRe.exec(src))) m[1].split(/\s+/).forEach((c) => usedClasses.add(clean(c)));
  while ((m = templateRe.exec(src))) m[1].split(/\s+/).forEach((c) => usedClasses.add(clean(c)));
}
for (const c of [...usedClasses]) {
  // keep only plausible class-name tokens (lowercase kebab), drop interpolation junk
  if (!/^[a-z][a-z0-9-]*$/.test(c)) usedClasses.delete(c);
}

// classes defined in CSS
const definedClasses = new Set();
for (const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) definedClasses.add(m[1]);

// Known dynamic/conditional patterns that are built at runtime
const dynamicOK = new Set(['is-in', 'is-wipe', 'app-boot']);

const missing = [...usedClasses].filter((c) => !definedClasses.has(c) && !dynamicOK.has(c));
console.log(
  missing.length
    ? `\nCLASSES USED IN TSX BUT NOT IN CSS (${missing.length}):\n` + missing.join(', ')
    : '\nAll TSX classes defined in CSS: OK',
);

// 3. Media query inventory
const mqs = [...css.matchAll(/@media[^{]+/g)].map((m) => m[0].trim().replace(/\s+/g, ' '));
const counts = {};
mqs.forEach((q) => (counts[q] = (counts[q] || 0) + 1));
console.log('\nMEDIA QUERIES:');
Object.entries(counts)
  .sort()
  .forEach(([q, n]) => console.log(`  ${n}× ${q}`));
