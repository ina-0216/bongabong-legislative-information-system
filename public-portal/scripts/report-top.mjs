#!/usr/bin/env node
/**
 * Prints the largest modules in a rollup-plugin-visualizer report so bundle
 * composition can be read from the terminal instead of only in a browser.
 * Usage: node scripts/report-top.mjs [limit]
 */
import { readFileSync } from 'node:fs';

const reportPath = 'dist/bundle-report.html';
const limit = Number(process.argv[2]) || 25;

const html = readFileSync(reportPath, 'utf8');

const match = html.match(/const data\s*=\s*(\{[\s\S]*?\})\s*;?\s*\n/);
if (!match) {
  console.error('Could not locate the visualizer data payload in', reportPath);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(match[1]);
} catch (error) {
  console.error('Failed to parse the visualizer payload:', error.message);
  process.exit(1);
}

// nodeParts maps partId -> sizes; nodeMetas maps metaUid -> module identity.
const parts = data.nodeParts || {};
const metas = data.nodeMetas || {};

const sizeOf = (partId) => parts[partId] || { renderedLength: 0, gzipLength: 0 };
const nameOf = (partId) => {
  const metaUid = sizeOf(partId).metaUid;
  const meta = metas[metaUid];
  return meta?.id || meta?.name || partId;
};

const rows = [];
const chunkTotals = new Map();
const chunkGzip = new Map();

const walk = (node) => {
  (node.children || []).forEach(walk);
  if (!node.uid) return;
  const { renderedLength = 0, gzipLength = 0 } = sizeOf(node.uid);
  const name = nameOf(node.uid);
  rows.push({ name, renderedLength, gzipLength });

  // The emitted filename is the tree root child's name at depth 1.
  const chunk = node.name && /assets\/.*\.js$/.test(node.name) ? node.name : null;
  if (chunk) {
    chunkTotals.set(chunk, (chunkTotals.get(chunk) || 0) + renderedLength);
    chunkGzip.set(chunk, (chunkGzip.get(chunk) || 0) + gzipLength);
  }
};
walk(data.tree);

const kb = (bytes) => (bytes / 1024).toFixed(1);

const shorten = (name) => {
  // Module ids are absolute paths. The package tail is the informative part,
  // so show the end rather than the start.
  const parts = name.split(/[\\/]/);
  const tail = parts.length > 4 ? `.../${parts.slice(-4).join('/')}` : name;
  return tail.length > 76 ? `...${tail.slice(-73)}` : tail;
};

console.log(`Top ${Math.min(limit, rows.length)} modules by rendered size`);
console.log('============================================');
for (const row of [...rows].sort((a, b) => b.renderedLength - a.renderedLength).slice(0, limit)) {
  console.log(`  ${kb(row.renderedLength).padStart(7)} KB  (gz ${kb(row.gzipLength).padStart(6)})  ${shorten(row.name)}`);
}

if (chunkTotals.size) {
  console.log('');
  console.log('Per-emitted-chunk totals');
  console.log('-----------------------');
  for (const [chunk, raw] of [...chunkTotals.entries()].sort((a, b) => b[1] - a[1])) {
    const gz = chunkGzip.get(chunk) || 0;
    console.log(`  ${kb(raw).padStart(7)} KB  (gz ${kb(gz).padStart(6)})  ${chunk.split('/').pop()}`);
  }
}