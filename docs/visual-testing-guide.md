# Visual & layout testing guide (e2e/)

How to verify this app's UI in a sandbox **without** a display, a browser
installer, or human eyes — using either **measurements** (works for anyone,
including text-only AI agents) or **screenshots** (for humans and AI agents
with image input).

Everything lives in [`e2e/`](../e2e/). No test framework, no globals — plain
Node scripts that print `FACTS` (what was measured) and `PROBLEMS` (what
failed). If the `PROBLEMS` section is empty, the check passed.

> Need just the browser stack (Playwright + headless Chromium in a locked-down
> environment), independent of this app's suites? See the self-contained
> **[Playwright sandbox setup guide](playwright-sandbox-setup.md)**.

---

## 1. Why this exists

Restricted sandboxes usually cannot install a browser the normal way:

| Channel | Status in sandboxes |
|---|---|
| Playwright browser CDN (`cdn.playwright.dev`) | blocked |
| `apt install chromium` | blocked (no distro mirrors) |
| Google Chrome `.deb` | blocked |
| **npm registry (`registry.npmjs.org`)** | **works** |

So the browser comes from npm: [`@sparticuz/chromium`](https://www.npmjs.com/package/@sparticuz/chromium)
ships Chromium as a brotli archive plus tarballs of the shared libraries a
minimal image lacks (NSS/NSPR from `al2023.tar.br`, software GL from
`swiftshader.tar.br`). Node's built-in `zlib` decompresses everything — the
setup script needs nothing but Node ≥ 18 and `tar`.

## 2. Setup

```bash
# 1. Dev servers must be running (API :3000, web :3001)
npm run dev            # from the repo root

# 2. Provision the browser (~1 min once; ~70 MB from npm)
cd e2e
bash setup-browser.sh  # or: npm run setup
```

The script is idempotent — re-running it when `e2e/.browser/` already exists
is a no-op. It prints the Chromium version when done.

**If `npmjs.org` is unreachable, nothing here works** — that is the only
network dependency. Everything else (Node, tar, DejaVu fonts) is already in
the base image.

### Demo accounts (server demo data)

| Console | Login | Password |
|---|---|---|
| Company workspace | `owner@acme.test` | `demo1234` |
| Platform admin | `admin@zojatech.test` | `demo1234` |

Platform staff sign in at **`/login?mode=platform`** — the scripts handle
this; keep it in mind if you write your own. Restart the API server to reset
demo data after destructive test runs.

## 3. Two ways to test — pick per capability

### 3a. Measurement mode — `verify-*.js` (no image input needed)

Each script drives a real Chromium, reads computed styles and geometry, and
decides pass/fail itself:

| Script | What it proves |
|---|---|
| `verify-layout.js` | 10 viewport classes × ~18 routes: the document **never scrolls sideways**; phones get the bottom tab bar, landscape phones the 62px rail, desktop the left sidebar; both modals are centered, unclipped and scroll internally |
| `verify-surfaces.js` | Public form + wall (fit-scaled hero, full-width CTAs, ≥40px rating stars), the immersive design studio (panels on-screen), the platform console pages incl. tenant detail and 404, touch-target sizes |
| `verify-phone.js` | Interaction flows on a 390×844 phone: tab-bar taps navigate, kebab menus open as bottom sheets, modals center/scroll-lock/close correctly, actions fire visible toasts, wide tables swipe inside their card |
| `verify-modals.js` | Every remaining dialog (team invite, new testimonial, AI apply confirm, create tenant, create staff, manage staff) opens, centers, scroll-locks and closes on a phone |
| `verify-embed.js` | The customer-facing integration: the external-site demo page (embed.js iframe + modal.js review popup at phone/tablet/desktop widths — popup goes fullscreen ≤520px) and the public form's full submission flow (fill → submit → thank-you + snapshot) |

```bash
cd e2e
node verify-layout.js                 # all sizes
SIZES=phone-390,desktop-1920 node verify-layout.js   # subset (fast)
node verify-surfaces.js
node verify-phone.js
node verify-modals.js
node verify-embed.js
```

Reading output:

```
=== FACTS ===
  phone-390: shell=column sidebar=row bar=390x57 labels=13/11   ← measurements
  phone-390: modal margins L/R=10/10 T/B=233/235 w=370
=== ALL LAYOUT CHECKS PASSED ===                                   ← verdict
```

`FATAL` lines mean the script itself broke (server down, login failed) — fix
that before trusting anything else.

### 3b. Screenshot mode — `shoot.js` (needs eyes: yours or a vision model)

Renders routes at every device size and saves viewport screenshots:

```bash
cd e2e
node shoot.js                          # everything (slow: ~28 routes × 10 sizes)
ONLY=login,wall,form node shoot.js     # named routes only
SIZE=phone-390 node shoot.js           # one size — names match browser.js SIZES:
                                       #   fold-280 se-320 phone-390 phablet-430
                                       #   landscape-phone tablet-768 tablet-1024
                                       #   laptop-1280 desktop-1920 tall-412x1500
FULLPAGE=1 WAIT=1500 node shoot.js     # full page height + extra settle time
```

Files land in `e2e/shots/{size}--{route}.png` (git-ignored). Phones and
tablets render at `deviceScaleFactor: 2` — what a retina screen shows.

**Worked example — an AI agent with image input** (this is the exact loop
that was used to harden the current UI):

```
1. bash e2e/setup-browser.sh                 # once per sandbox
2. cd e2e && SIZE=phone-390 node shoot.js    # 28 phone screenshots
3. Read the PNGs one by one (workspace read_file on each path):
     shots/phone-390--login.png
     shots/phone-390--wall.png
     shots/phone-390--testimonials.png
     …
4. For each, judge what measurements CANNOT:
     · text clipped mid-word or colliding with neighbours
     · buttons that visually group apart from their action
     · contrast problems (muted grey on grey)
     · spacing rhythm (one 8px gap, one 17px gap = bug)
     · alignment (labels not sharing a left edge)
     · anything that *looks* broken at 2x scale
5. Anything suspicious → confirm with a targeted measurement before
   changing code, e.g. in a scratch script:
     const r = await page.evaluate(() =>
       document.querySelector('.X').getBoundingClientRect().toJSON());
6. Fix, re-run shoot for that route, re-read the PNG. Repeat.
```

What each route is expected to show (the visual contract):

| Route | Look for |
|---|---|
| `login` | card centered, mode switch shares the row, no sideways scroll |
| `form` (public) | full-width submit CTA in thumb space, big rating stars, brand tokens applied |
| `wall` (public) | hero widget **scaled** to the column (never cropped), CTA full-width above the fold |
| `testimonials` | table rows swipe inside the card, kebab reachable, bulk bar floats at the bottom |
| `studio` | phone: full-bleed canvas, panels as bottom sheets; desktop: panels docked, toolbar on one row |
| `platform-*` | same table/grid rules as company pages |

Dynamic states (an open modal, a toast, an open action sheet) are not in the
screenshots — `verify-phone.js` asserts them by geometry instead, and you can
always add a `page.screenshot()` line inside any custom flow.

### 3c. Static mode — `css-check.js` (no browser at all)

```bash
cd e2e && node css-check.js
```

Checks CSS brace balance, cross-references every literal `className` in TSX
against the stylesheets (catches the "class I swore I defined" bug), and
prints the media-query census. Run it after any CSS surgery.

## 4. Writing your own check

`e2e/browser.js` is the shared library — require it instead of repeating
plumbing:

```js
const { chromium } = require('playwright');
const { launchOptions, BASE, login, settle, OFFENDER_SCAN, pickSizes } = require('./browser');

(async () => {
  const browser = await chromium.launch(launchOptions());
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await login(context, 'company');
  const page = await context.newPage();
  await page.goto(`${BASE}/app/products`, { waitUntil: 'networkidle' });
  await settle(page);                       // ALWAYS after first authed load
  // ...interact, then measure with page.evaluate...
  const m = await page.evaluate(OFFENDER_SCAN);   // overflow check helper
  console.log(JSON.stringify(m, null, 2));
  await browser.close();
})();
```

`launchOptions()` alone encodes the correct executable path, library path and
flags — never copy raw launch args into new scripts.

## 5. Gotchas (all learned the hard way)

1. **Boot intro animation.** The app root has an `app-boot` class for a short
   scale-in; measuring during it yields garbage. `settle(page)` waits it out.
2. **framer-motion exits linger ~0.5–1s.** After closing a modal/sheet, wait
   ~1.1s before asserting it's gone, or you'll chase ghosts.
3. **Kebab menus close on scroll.** `scrollIntoView()` the trigger *before*
   clicking, never after. Playwright auto-scrolls on `click()`, which is
   exactly wrong here.
4. **Platform login is a different mode.** `/login?mode=platform`, and clear
   cookies + localStorage before switching roles in one context.
5. **Dirty-checked buttons.** Save buttons disable until the value really
   changes (trim-aware). Change the value first; restore it after.
6. **Don't launch with `--single-process`.** It crashes once a second browser
   context opens. The flags in `browser.js` are the working set.
7. **Demo data mutates.** Unpublish a form in a test and it stays unpublished;
   restart the API server to reset.
8. **`networkidle` is usually enough**, but skeleton → data swaps can take a
   beat; use `WAIT=` (shoot.js) or an extra `waitForTimeout(400)`.
9. **Sandbox resets wipe `node_modules/` and `e2e/.browser/`** (they are
   snapshot-excluded). After a reset: `npm install` at the repo root, restart
   `npm run dev`, then re-run `bash e2e/setup-browser.sh` — it is idempotent
   and takes ~6s. Dev servers do not survive resets either.
10. **Testing the PRODUCTION build, not just dev.** `npm --prefix client run
    preview` serves `dist/` on :4173 (API proxy included). Run the suites
    with `BASE_URL=http://127.0.0.1:4173` — this is the only way to catch
    bundling bugs (e.g. a `manualChunks` split that broke React's chunk-init
    order was invisible in dev).

## 6. CI notes

These scripts assume a sandbox/CI host: they run headless, need no display,
and install nothing outside `e2e/`. `e2e/.browser/`, `e2e/node_modules/` and
`e2e/shots/` are git-ignored. The pinned versions
(`playwright@1.63.0`, `@sparticuz/chromium@152.0.0`) are known-good together —
bump deliberately and re-run all three verify scripts.
