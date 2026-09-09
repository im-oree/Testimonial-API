# Playwright + headless Chromium in restricted sandboxes — a self-contained guide

This doc stands on its own: everything needed to install and drive a real
browser where the usual channels are blocked — no other repo docs required.
(In this repository the same setup is packaged as [`e2e/`](../e2e/); see
[`docs/visual-testing-guide.md`](visual-testing-guide.md) for the app-specific
test suites.)

---

## 1. The problem and the trick

Sandboxed environments usually cannot install a browser the normal way:

| Channel | Typical sandbox status |
|---|---|
| Playwright's browser CDN (`cdn.playwright.dev`) | blocked |
| `apt install chromium` / distro mirrors | blocked |
| Google Chrome `.deb` (`dl.google.com`) | blocked |
| **npm registry (`registry.npmjs.org`)** | **works** |

So both the automation library AND the browser come from npm:

- **`playwright`** (the Node library) — installed with
  `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` so it never touches its CDN.
- **`@sparticuz/chromium`** — ships a Chromium build as **brotli archives**
  plus tarballs of the shared libraries minimal images lack (NSS/NSPR,
  software GL). Node's built-in `zlib.brotliDecompressSync` unpacks
  everything; `tar` is the only other tool needed.

Requirements on the host: **Node ≥ 18** (for zlib brotli), **tar**, and at
least one installed font family (DejaVu, present in most images, is enough —
layout metrics are what matter).

## 2. Install (copy-paste)

### 2a. In this repository — one command

```bash
cd e2e
bash setup-browser.sh        # idempotent; ~6s once packages are cached
```

It installs the pinned deps, decompresses the browser, extracts the libs,
and verifies the binary prints its version. Result (git-ignored):

```
e2e/.browser/chromium    the executable (~150–210 MB)
e2e/.browser/libs/       libnss3, libnspr4, libEGL, libGLESv2, …
```

### 2b. Anywhere else — the manual recipe

```bash
mkdir my-browser && cd my-browser
npm init -y
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-audit --no-fund \
  playwright@1.63.0 @sparticuz/chromium@152.0.0
```

Then unpack with this Node script (`node unpack.js`):

```js
// unpack.js — brotli-decompress Chromium + its shared libraries
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const bin = path.join(__dirname, 'node_modules', '@sparticuz', 'chromium', 'bin');
const out = path.join(__dirname, '.browser');
const libs = path.join(out, 'libs');
fs.mkdirSync(libs, { recursive: true });

// 1. The executable (single ~150 MB binary inside a .br archive)
const exe = path.join(out, 'chromium');
fs.writeFileSync(exe, zlib.brotliDecompressSync(fs.readFileSync(path.join(bin, 'chromium.br'))));
fs.chmodSync(exe, 0o755);

// 2. Shared libraries the base image is missing, in two tarballs.
//    al2023.tar.br        → nss / nspr (Chromium refuses to start without these)
//    swiftshader.tar.br   → software OpenGL (headless rendering)
for (const name of ['al2023.tar.br', 'swiftshader.tar.br']) {
  const tar = path.join(out, name.replace(/\.br$/, ''));
  fs.writeFileSync(tar, zlib.brotliDecompressSync(fs.readFileSync(path.join(bin, name))));
  execSync(`tar -xf "${tar}" -C "${libs}"`);
  fs.unlinkSync(tar);
}
// tarballs extract into libs/lib/ — flatten so one LD_LIBRARY_PATH covers all
for (const f of fs.readdirSync(path.join(libs, 'lib')))
  fs.copyFileSync(path.join(libs, 'lib', f), path.join(libs, f));

console.log('done:', exe);
```

Verify:

```bash
LD_LIBRARY_PATH=.browser/libs .browser/chromium --version
# → Chromium 152.0.7977.0
```

## 3. Launch options — the working set (and why)

```js
const { chromium } = require('playwright');

const browser = await chromium.launch({
  executablePath: '.browser/chromium',
  env: { ...process.env, LD_LIBRARY_PATH: '.browser/libs' },
  args: [
    '--no-sandbox',              // containers have no user namespaces
    '--disable-setuid-sandbox',  // same reason
    '--disable-dev-shm-usage',   // /dev/shm is tiny in sandboxes; use /tmp
    '--disable-gpu',             // no hardware GL available
    '--enable-unsafe-swiftshader'// software GL via the extracted libs
  ],
});
```

**Never add `--single-process`** — it works for one page and crashes as soon
as a second browser context opens. This cost a debugging session; don't
repeat it.

## 4. Using it

### Minimal script

```js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '.browser/chromium',
    env: { ...process.env, LD_LIBRARY_PATH: '.browser/libs' },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
           '--disable-gpu', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://127.0.0.1:3001/login', { waitUntil: 'networkidle' });

  // MEASURE — computed styles + geometry; works without human eyes
  const m = await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    title: document.title,
  }));
  console.log(m);

  // or SHOOT — a PNG you (or a vision model) can look at
  await page.screenshot({ path: 'login.png' });

  await browser.close();
})();
```

### In this repository

Dev servers on :3000/:3001 (`npm run dev` from the repo root), then from
`e2e/`:

| Command | What it does |
|---|---|
| `npm run setup` | provision the browser (section 2a) |
| `npm run verify:layout` | 10 viewport classes × ~20 routes: no sideways scroll, correct shell per device, centered modals |
| `npm run verify:surfaces` | public form/wall, design studio, platform console, touch targets |
| `npm run verify:phone` | phone interaction flows: sheets, modals, toasts, table swiping |
| `npm run verify:modals` | every dialog opens/centers/locks/closes |
| `npm run verify:embed` | external-site embed + review popup + form submission |
| `npm run shoot` | PNG screenshots per route × device size (`ONLY=login SIZE=phone-390` filters) |
| `node payload-check.js [path]` | real JS bytes a page downloads |

Useful env vars: `BASE_URL` (default `http://127.0.0.1:3001`; point it at
`http://127.0.0.1:4173` to test the production build via
`npm --prefix client run preview`), `SIZES`, `ONLY`, `WAIT`, `FULLPAGE=1`.

### The two testing modes

1. **Measurement** (no eyes needed): read `getComputedStyle` and
   `getBoundingClientRect` inside `page.evaluate` and assert math —
   centered = equal left/right margins, no overflow = `scrollWidth ==
   clientWidth`, touch target = height ≥ 40px. This is what the
   `verify-*.js` suites do; they print `FACTS` and `PROBLEMS` lines.
2. **Screenshots** (needs eyes — yours or a vision-capable model): run
   `shoot.js`, then read the PNGs one by one and judge what math can't:
   text collision, contrast, spacing rhythm, visual grouping. Confirm
   anything suspicious with a targeted measurement before changing code.

## 5. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `error while loading shared libraries: libnspr4.so` | libs not on `LD_LIBRARY_PATH` — extract `al2023.tar.br` (section 2b) and set `LD_LIBRARY_PATH=.browser/libs` |
| Browser crashes when a second context opens | you added `--single-process` — remove it |
| `net::ERR_CONNECTION_RESET` downloading anything | only npm works; make sure nothing in your flow touches playwright's CDN (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` at install) |
| Blank screenshots / no text rendered | no fonts on the image — install any font package, or check the base image ships DejaVu |
| Works once, then `Executable doesn't exist` | sandbox reset wiped git-ignored dirs — re-run `bash e2e/setup-browser.sh` |
| Tabs crash under load | `/dev/shm` too small — keep `--disable-dev-shm-usage` |
| WebGL errors in console | expected headless; keep `--enable-unsafe-swiftshader` for software GL |

## 6. Version pins

`playwright@1.63.0` + `@sparticuz/chromium@152.0.0` are known-good together
(the library only needs a Chromium ≥ its minimum supported version; the
binary only needs the flags above). Bump deliberately and re-run the suites.
The lockfile in `e2e/package-lock.json` keeps installs reproducible.
