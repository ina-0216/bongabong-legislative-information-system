'use strict';

const { createWorker } = require('tesseract.js');

const MIN_READABLE_CONFIDENCE = 45;
let workerPromise;
let scanQueue = Promise.resolve();

const normalizeText = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const getNameMatch = (text, fullName) => {
  const expected = normalizeText(fullName).split(/\s+/).filter((part) => part.length > 1);
  const observed = normalizeText(text);
  if (!expected.length) return 'NotChecked';
  const found = expected.filter((part) => observed.includes(part)).length;
  if (found === expected.length) return 'Match';
  return found ? 'Partial' : 'NotFound';
};

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('eng').catch((error) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

async function runScan(buffer, fullName) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { status: 'Unavailable', confidence: null, nameMatch: 'NotChecked', flags: ['scan_unavailable'], scannedAt: new Date() };
  }

  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(buffer);
    const confidence = Number.isFinite(data?.confidence)
      ? Math.max(0, Math.min(100, Math.round(data.confidence)))
      : 0;
    const text = typeof data?.text === 'string' ? data.text : '';
    const nameMatch = getNameMatch(text, fullName);
    const flags = [];
    if (confidence < MIN_READABLE_CONFIDENCE || !text.trim()) flags.push('low_confidence');
    if (nameMatch === 'NotFound' || nameMatch === 'Partial') flags.push('name_not_clearly_found');

    return {
      status: flags.includes('low_confidence') ? 'LowConfidence' : 'Complete',
      confidence,
      nameMatch,
      flags,
      scannedAt: new Date(),
    };
  } catch (_error) {
    // Scanner outages must send the submission to ordinary manual review.
    return { status: 'Unavailable', confidence: null, nameMatch: 'NotChecked', flags: ['scan_unavailable'], scannedAt: new Date() };
  }
}

function scanIdImage(buffer, fullName) {
  const task = scanQueue.then(() => runScan(buffer, fullName));
  // Keep the queue usable after any rejected task.
  scanQueue = task.catch(() => {});
  return task;
}

async function shutdownIdScanner() {
  if (!workerPromise) return;
  const worker = await workerPromise.catch(() => null);
  workerPromise = null;
  if (worker) await worker.terminate();
}

module.exports = { scanIdImage, shutdownIdScanner, normalizeText, getNameMatch };
