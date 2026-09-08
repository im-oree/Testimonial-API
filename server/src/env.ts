/**
 * Tiny .env loader — zero dependencies.
 *
 * Reads `server/.env` (and `server/.env.local` on top, which wins) into
 * process.env BEFORE any config is read. Rules:
 *
 *   · Real environment variables always win — a .env file never overrides
 *     something set explicitly in the shell / by the platform.
 *   · Lines look like `KEY=value`; `#` starts a comment, blank lines are
 *     ignored, surrounding quotes are stripped ("value" / 'value').
 *   · Missing files are fine — the app runs with built-in defaults.
 *
 * Copy server/.env.example to server/.env to configure the API.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(moduleDir, '..');

let loaded = false;

function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip inline trailing comments on unquoted values (KEY=value # comment)
    const hash = value.indexOf(' #');
    if (hash >= 0) value = value.slice(0, hash).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** Idempotent: safe to call from every entry point (dev, start, tests). */
export function loadEnvFile(): void {
  if (loaded) return;
  loaded = true;
  for (const name of ['.env', '.env.local']) {
    const file = path.join(SERVER_DIR, name);
    try {
      const parsed = parseEnvFile(fs.readFileSync(file, 'utf8'));
      for (const [key, value] of Object.entries(parsed)) {
        if (process.env[key] === undefined) process.env[key] = value;
      }
    } catch {
      // file doesn't exist (or unreadable) — defaults apply
    }
  }
}

loadEnvFile();
