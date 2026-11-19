#!/usr/bin/env node
/**
 * Records a manifest of the visual-regression baseline.
 *
 * The baseline is meant to live in version control, but this project is not
 * yet under git, so there is no history to detect an edited baseline against.
 * A hash manifest gives that protection: if a baseline image is replaced by
 * hand, its recorded hash no longer matches.
 *
 * Usage:
 *   node scripts/baseline-manifest.mjs --write
 *   node scripts/baseline-manifest.mjs --check
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';

const BASELINE_DIR = '.visual-baseline/baseline';
const MANIFEST = join(BASELINE_DIR, 'manifest.json');
const WRITE = process.argv.includes('--write');
const CHECK = process.argv.includes('--check');

if (!existsSync(BASELINE_DIR)) {
  console.error(`FAIL: ${BASELINE_DIR} not found. Run \`npm run visual:update\` first.`);
  process.exit(1);
}

const images = readdirSync(BASELINE_DIR).filter((f) => f.endsWith('.png')).sort();
if (images.length === 0) {
  console.error(`FAIL: no baseline PNGs in ${BASELINE_DIR}.`);
  process.exit(1);
}

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

const buildManifest = () => {
  const entries = {};
  const unreadable = [];
  for (const file of images) {
    const buffer = readFileSync(join(BASELINE_DIR, file));
    // A hand-edited or truncated baseline may no longer parse as a PNG. Record
    // that as a finding rather than letting it throw a stack trace.
    let width = null;
    let height = null;
    try {
      const png = PNG.sync.read(buffer);
      width = png.width;
      height = png.height;
    } catch {
      unreadable.push(file);
    }
    entries[file] = {
      bytes: buffer.length,
      width,
      height,
      sha256: sha256(buffer),
    };
  }
  return { version: 1, count: images.length, images: entries, unreadable };
};

if (WRITE) {
  const manifest = buildManifest();
  delete manifest.unreadable;
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${MANIFEST} (${images.length} images)`);
  if (manifest.unreadable?.length) {
    console.error(`Warning: ${manifest.unreadable.length} image(s) are not readable PNGs: ${manifest.unreadable.join(', ')}`);
  }
  process.exit(0);
}

if (CHECK) {
  if (!existsSync(MANIFEST)) {
    console.error(`FAIL: ${MANIFEST} not found. Run \`npm run baseline:write\`.`);
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const current = buildManifest();

  const problems = [];

  for (const file of current.unreadable) {
    problems.push(`${file}: not a readable PNG (corrupt or truncated)`);
  }

  for (const [file, recorded] of Object.entries(manifest.images)) {
    if (!current.images[file]) {
      problems.push(`${file}: present in manifest but missing from baseline`);
      continue;
    }
    const actual = current.images[file];
    if (actual.sha256 !== recorded.sha256) {
      problems.push(`${file}: hash changed (${recorded.sha256.slice(0, 12)} -> ${actual.sha256.slice(0, 12)})`);
    } else if (actual.width !== recorded.width || actual.height !== recorded.height) {
      problems.push(`${file}: dimensions changed ${recorded.width}x${recorded.height} -> ${actual.width}x${actual.height}`);
    }
  }
  for (const file of Object.keys(current.images)) {
    if (!manifest.images[file]) problems.push(`${file}: new baseline image not in manifest`);
  }

  if (problems.length === 0) {
    console.log(`Baseline integrity OK: ${current.count} images match ${MANIFEST}`);
    process.exit(0);
  }
  console.error('Baseline integrity FAILED:');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('If the baseline was intentionally changed, re-run: npm run baseline:write');
  process.exit(1);
}

console.log('Usage: node scripts/baseline-manifest.mjs --write | --check');
process.exit(1);