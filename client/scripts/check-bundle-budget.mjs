import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(projectDir, 'dist');
const html = readFileSync(resolve(distDir, 'index.html'), 'utf8');
const entryMatch = html.match(/<script\b[^>]*\bsrc="([^"]+\.js)"/i);

if (!entryMatch) {
  console.error('Bundle budget failed: no JavaScript entry was found in dist/index.html.');
  process.exit(1);
}

const entryPath = resolve(distDir, entryMatch[1].replace(/^\//, ''));
const rawBytes = statSync(entryPath).size;
const gzipBytes = gzipSync(readFileSync(entryPath)).byteLength;
const rawBudget = 520 * 1024;
const gzipBudget = 165 * 1024;

console.log(
  `Admin entry: ${(rawBytes / 1024).toFixed(2)} KiB raw, ${(gzipBytes / 1024).toFixed(2)} KiB gzip ` +
  `(budgets: ${rawBudget / 1024} KiB raw, ${gzipBudget / 1024} KiB gzip).`,
);

if (rawBytes > rawBudget || gzipBytes > gzipBudget) {
  console.error('Bundle budget failed: the initial admin JavaScript entry exceeds its transfer budget.');
  process.exit(1);
}
