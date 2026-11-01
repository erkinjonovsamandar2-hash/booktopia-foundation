// Copies the API handlers into server/handlers so the server is self-contained
// (the handlers then find their dependencies in server/node_modules).
// The two copies of _orderCard.js must be identical; if not, stop.

import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const sources = [path.join(repo, 'api'), path.join(repo, 'booktopia-miniapp', 'api')];
const out = path.join(here, 'handlers');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const seen = new Map();
for (const dir of sources) {
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.js')) continue; // .ts and tests are not served
    const from = path.join(dir, file);
    if (seen.has(file)) {
      if (readFileSync(seen.get(file), 'utf8') !== readFileSync(from, 'utf8')) {
        console.error(`[sync] ${file} differs between ${seen.get(file)} and ${from}. Make them equal first.`);
        process.exit(1);
      }
      continue;
    }
    seen.set(file, from);
    copyFileSync(from, path.join(out, file));
  }
}
console.log(`[sync] copied ${seen.size} files to server/handlers: ${[...seen.keys()].join(', ')}`);
