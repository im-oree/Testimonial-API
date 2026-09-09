#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# setup-browser.sh — provision a headless Chromium inside restricted sandboxes
# where the usual channels are blocked (playwright CDN, apt, google dl).
#
# How it works:
#   @sparticuz/chromium (pinned in package.json) ships Chromium as a brotli
#   archive plus tarballs with the shared libraries a minimal image lacks
#   (nss/nspr from al2023.tar.br, software GL from swiftshader.tar.br).
#   Node's built-in zlib decompresses them — no external tools needed.
#
# Result (git-ignored):
#   e2e/.browser/chromium   the executable (brotli-decompressed)
#   e2e/.browser/libs/      libnss3, libnspr4, libEGL, libGLESv2, …
#
# Runtime needs on the host image: Node >= 18 (zlib.brotli), tar, and at
# least one installed font family (DejaVu in the base image is enough —
# text metrics are what the layout checks rely on).
#
# If npmjs.org is unreachable this script cannot work; nothing else is
# fetched from the network.
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")"

if [ -x .browser/chromium ] && .browser/chromium --version >/dev/null 2>&1; then
  echo "Browser already provisioned:"
  LD_LIBRARY_PATH=".browser/libs" .browser/chromium --version
  exit 0
fi

echo "Installing pinned packages (playwright's own browser download is skipped)…"
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-audit --no-fund

echo "Extracting Chromium + shared libraries…"
node - <<'EOF'
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// This script arrives on stdin, so there is no __dirname — the shell
// wrapper already cd'd into e2e/, so resolve from cwd.
const here = process.cwd();
const bin = path.join(here, 'node_modules', '@sparticuz', 'chromium', 'bin');
const out = path.join(here, '.browser');
const libs = path.join(out, 'libs');
fs.mkdirSync(libs, { recursive: true });

// 1. The executable itself (brotli -> single 150MB binary)
const exe = path.join(out, 'chromium');
fs.writeFileSync(exe, zlib.brotliDecompressSync(fs.readFileSync(path.join(bin, 'chromium.br'))));
fs.chmodSync(exe, 0o755);
console.log('  chromium binary:', (fs.statSync(exe).size / 1e6).toFixed(1), 'MB');

// 2. Shared libs the base image is missing, in two tarballs
for (const name of ['al2023.tar.br', 'swiftshader.tar.br']) {
  const tar = path.join(out, name.replace(/\.br$/, ''));
  fs.writeFileSync(tar, zlib.brotliDecompressSync(fs.readFileSync(path.join(bin, name))));
  execSync(`tar -xf "${tar}" -C "${libs}"`, { stdio: 'inherit' });
  fs.unlinkSync(tar);
}
// tarballs extract into libs/lib/ — copy flat next to it so one
// LD_LIBRARY_PATH entry covers everything
for (const f of fs.readdirSync(path.join(libs, 'lib'))) {
  fs.copyFileSync(path.join(libs, 'lib', f), path.join(libs, f));
}
console.log('  libs:', fs.readdirSync(path.join(libs, 'lib')).length, 'shared objects');
EOF

echo "Verifying it launches…"
LD_LIBRARY_PATH=".browser/libs" .browser/chromium --version

cat <<'DONE'

Ready. Useful next steps:
  npm run verify:layout    # 10-viewport layout matrix (measurement-based)
  npm run verify:surfaces  # public pages, design studio, platform console
  npm run verify:phone     # phone interaction flows (sheets, modals, toasts)
  npm run shoot            # PNG screenshots for visual inspection
See docs/visual-testing-guide.md for the full manual.
DONE
