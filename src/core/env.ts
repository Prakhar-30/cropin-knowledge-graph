/**
 * Loads `.env` into `process.env` if the file is there.
 *
 * No dependency: the format we need is `KEY=value` lines with optional `#` comments, and a 25-line
 * reader is easier to reason about than a package. Values already present in the real environment win,
 * so a CI secret or a shell export is never overwritten by a file on someone's laptop.
 *
 * Imported for its side effect by the CLI and the server, before anything reads a credential.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Look in the working directory first, then next to the repo, so it works from anywhere. */
const CANDIDATES = [resolve(process.cwd(), '.env'), resolve(HERE, '../../.env')];

let loadedFrom: string | null = null;

function parse(text: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip one layer of matching quotes, which people add out of habit.
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) out.push([key, value]);
  }
  return out;
}

export function loadEnv(): { path: string | null; keys: string[] } {
  if (loadedFrom !== null) return { path: loadedFrom, keys: [] };
  for (const path of CANDIDATES) {
    if (!existsSync(path)) continue;
    const keys: string[] = [];
    for (const [key, value] of parse(readFileSync(path, 'utf8'))) {
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = value;
        keys.push(key);
      }
    }
    loadedFrom = path;
    return { path, keys };
  }
  loadedFrom = '';
  return { path: null, keys: [] };
}

loadEnv();
