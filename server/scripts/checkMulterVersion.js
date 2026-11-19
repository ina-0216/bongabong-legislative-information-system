const fs = require('node:fs');
const path = require('node:path');

const MINIMUM_VERSION = [2, 5, 0];
const manifestPath = path.resolve(__dirname, '../package.json');
const lockPath = path.resolve(__dirname, '../package-lock.json');

const versionParts = (value) => {
  const match = String(value).match(/^(?:\^|~|>=)?(\d+)\.(\d+)\.(\d+)$/);
  return match ? match.slice(1).map(Number) : null;
};

const meetsMinimum = (value) => {
  const parts = versionParts(value);
  if (!parts) return false;
  for (let index = 0; index < MINIMUM_VERSION.length; index += 1) {
    if (parts[index] > MINIMUM_VERSION[index]) return true;
    if (parts[index] < MINIMUM_VERSION[index]) return false;
  }
  return true;
};

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const declaredVersion = versionParts(manifest.dependencies?.multer);
const lockedVersion = lock.packages?.['node_modules/multer']?.version;

if (!declaredVersion || !meetsMinimum(declaredVersion.join('.')) || !meetsMinimum(lockedVersion)) {
  console.error(`Multer must be declared and locked at ${MINIMUM_VERSION.join('.')} or newer.`);
  console.error(`Declared: ${manifest.dependencies?.multer ?? 'missing'}; locked: ${lockedVersion ?? 'missing'}`);
  process.exitCode = 1;
} else {
  console.log(`Multer version check passed: declared ${manifest.dependencies.multer}, locked ${lockedVersion}.`);
}
