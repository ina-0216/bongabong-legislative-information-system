const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const mongoose = require('mongoose');
const { EJSON } = require('bson');
const { getCurrentTermRange } = require('../utils/termCalendar');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const EXPECTED_DATABASE = 'ibosys';
const applyChanges = process.argv.includes('--apply');

function canonicalTermLabel(term) {
  return `${term.startYear}-${term.endYear} Term`;
}

function groupDuplicates(values, keyFor) {
  const counts = new Map();
  for (const value of values) {
    const key = keyFor(value);
    if (key === null) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1);
}

function sameKeyPattern(index, field) {
  return Object.keys(index.key || {}).length === 1 && index.key[field] === 1;
}

async function saveBackup(db) {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const backup = {
    format: 'canonical-extended-json',
    createdAt: new Date().toISOString(),
    database: db.databaseName,
    collections: {},
  };

  for (const { name } of collections) {
    const collection = db.collection(name);
    const [documents, indexes] = await Promise.all([
      collection.find({}).toArray(),
      collection.indexes().catch(() => []),
    ]);
    backup.collections[name] = { documents, indexes };
  }

  const backupPath = path.join(os.tmpdir(), `ibosys-pre-term-integrity-${Date.now()}.ejson`);
  fs.writeFileSync(backupPath, EJSON.stringify(backup, { relaxed: false }), { flag: 'wx' });
  return backupPath;
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured.');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  if (db.databaseName !== EXPECTED_DATABASE) {
    throw new Error(`Refusing to modify unexpected database name: ${db.databaseName}`);
  }

  const termsCollection = db.collection('terms');
  const ordinanceCollection = db.collection('ordinances');
  const usersCollection = db.collection('users');
  const terms = await termsCollection.find({}, {
    projection: { _id: 1, label: 1, startYear: 1, endYear: 1 },
  }).sort({ startYear: 1 }).toArray();

  if (!terms.length) throw new Error('No terms exist; refusing to apply cleanup.');

  const invalidTerms = terms.filter(term =>
    !Number.isInteger(term.startYear)
    || !Number.isInteger(term.endYear)
    || term.endYear - term.startYear !== 3
  );
  if (invalidTerms.length) throw new Error(`${invalidTerms.length} term(s) do not span exactly three years.`);

  const sortedTerms = [...terms].sort((a, b) => a.startYear - b.startYear);
  const overlaps = sortedTerms.filter((term, index) => index > 0 && term.startYear < sortedTerms[index - 1].endYear);
  if (overlaps.length) throw new Error(`${overlaps.length} overlapping term range(s) found.`);

  const labelsAfterNormalization = groupDuplicates(terms, canonicalTermLabel);
  if (labelsAfterNormalization.length) throw new Error('Canonical term labels would collide; no changes were made.');

  const currentRange = getCurrentTermRange();
  const currentTermCount = terms.filter(term =>
    term.startYear === currentRange.startYear && term.endYear === currentRange.endYear
  ).length;
  if (currentTermCount !== 1) {
    throw new Error(`Expected one date-matching term (${currentRange.startYear}-${currentRange.endYear}); found ${currentTermCount}.`);
  }

  const users = await usersCollection.find({}, { projection: { contactNumber: 1 } }).toArray();
  const missingContacts = users.filter(user => typeof user.contactNumber !== 'string' || !user.contactNumber.trim()).length;
  if (missingContacts) throw new Error(`${missingContacts} user(s) have a blank contact number; unique index not applied.`);
  const duplicateContacts = groupDuplicates(users, user => user.contactNumber.trim());
  if (duplicateContacts.length) throw new Error(`${duplicateContacts.length} duplicate contact-number group(s) found; unique index not applied.`);

  const ordinances = await ordinanceCollection.find({}, {
    projection: { number: 1, termId: 1 },
  }).toArray();
  const missingTermOrdinances = ordinances.filter(ordinance => !ordinance.termId).length;
  if (missingTermOrdinances) throw new Error(`${missingTermOrdinances} ordinance(s) lack a term; per-term index not changed.`);
  const duplicateNumbersPerTerm = groupDuplicates(ordinances, ordinance =>
    `${String(ordinance.termId)}\u0000${String(ordinance.number || '').trim()}`
  );
  if (duplicateNumbersPerTerm.length) throw new Error(`${duplicateNumbersPerTerm.length} duplicate ordinance-number group(s) found within terms.`);

  const ordinanceIndexes = await ordinanceCollection.indexes();
  const scopedNumberIndex = ordinanceIndexes.find(index =>
    index.unique && Object.keys(index.key || {}).length === 2
      && index.key.number === 1 && index.key.termId === 1
  );
  if (!scopedNumberIndex) throw new Error('The unique { number, termId } index is missing; refusing to drop any global index.');

  const staleGlobalNumberIndexes = ordinanceIndexes.filter(index =>
    index.unique && sameKeyPattern(index, 'number')
  );
  const userIndexes = await usersCollection.indexes();
  const contactIndexes = userIndexes.filter(index => sameKeyPattern(index, 'contactNumber'));
  const alreadyUniqueContactIndex = contactIndexes.some(index => index.unique);

  const plan = {
    database: db.databaseName,
    termLabelsToNormalize: terms.length,
    legacyTermFlagsToRemove: terms.length,
    globalOrdinanceNumberIndexesToDrop: staleGlobalNumberIndexes.map(index => index.name),
    contactNumberIndex: alreadyUniqueContactIndex ? 'already unique' : 'replace with unique index',
    currentTerm: `${currentRange.startYear}-${currentRange.endYear}`,
    duplicateContactGroups: duplicateContacts.length,
    duplicateOrdinanceNumbersPerTerm: duplicateNumbersPerTerm.length,
    mode: applyChanges ? 'apply' : 'dry-run',
  };

  if (!applyChanges) {
    console.log(JSON.stringify({ ...plan, message: 'Preflight passed. Re-run with --apply to back up and apply these changes.' }, null, 2));
    return;
  }

  const backupPath = await saveBackup(db);

  for (const index of staleGlobalNumberIndexes) {
    await ordinanceCollection.dropIndex(index.name);
  }

  if (!alreadyUniqueContactIndex) {
    for (const index of contactIndexes) await usersCollection.dropIndex(index.name);
    try {
      await usersCollection.createIndex({ contactNumber: 1 }, { unique: true, name: 'contactNumber_1' });
    } catch (error) {
      await usersCollection.createIndex({ contactNumber: 1 }, { name: 'contactNumber_1' }).catch(() => {});
      throw error;
    }
  }

  await termsCollection.bulkWrite(terms.map(term => ({
    updateOne: {
      filter: { _id: term._id },
      update: {
        $set: { label: canonicalTermLabel(term) },
        $unset: { isCurrent: '' },
      },
    },
  })));

  const [updatedTerms, updatedOrdinanceIndexes, updatedUserIndexes] = await Promise.all([
    termsCollection.find({}, { projection: { label: 1, startYear: 1, endYear: 1, isCurrent: 1 } }).sort({ startYear: 1 }).toArray(),
    ordinanceCollection.indexes(),
    usersCollection.indexes(),
  ]);
  const globalNumberIndexRemains = updatedOrdinanceIndexes.some(index => index.unique && sameKeyPattern(index, 'number'));
  const scopedNumberIndexRemains = updatedOrdinanceIndexes.some(index => index.unique && index.key.number === 1 && index.key.termId === 1);
  const uniqueContactIndexExists = updatedUserIndexes.some(index => index.unique && sameKeyPattern(index, 'contactNumber'));
  const labelsCanonical = updatedTerms.every(term => term.label === canonicalTermLabel(term));
  const legacyFlagsRemain = updatedTerms.some(term => Object.prototype.hasOwnProperty.call(term, 'isCurrent'));

  if (globalNumberIndexRemains || !scopedNumberIndexRemains || !uniqueContactIndexExists || !labelsCanonical || legacyFlagsRemain) {
    throw new Error(`Post-migration verification failed. Backup retained at ${backupPath}.`);
  }

  console.log(JSON.stringify({
    ...plan,
    mode: 'applied',
    backupPath,
    verification: {
      globalOrdinanceNumberIndexRemoved: !globalNumberIndexRemains,
      perTermOrdinanceNumberIndexPresent: scopedNumberIndexRemains,
      uniqueContactNumberIndexPresent: uniqueContactIndexExists,
      termLabelsCanonical: labelsCanonical,
      legacyTermFlagsRemoved: !legacyFlagsRemain,
    },
  }, null, 2));
}

run()
  .catch(error => {
    console.error(`Term integrity migration stopped: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect().catch(() => {}));
