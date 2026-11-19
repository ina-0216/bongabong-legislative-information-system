const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const mongoose = require('mongoose');
const { EJSON } = require('bson');
const Ordinance = require('../models/Ordinance');
const { mergeLegacySectionsIntoProvisions } = require('../utils/ordinanceBody');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const EXPECTED_DATABASE = 'ibosys';
const applyChanges = process.argv.includes('--apply');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured.');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  if (db.databaseName !== EXPECTED_DATABASE) {
    throw new Error(`Refusing to modify unexpected database name: ${db.databaseName}`);
  }

  const collection = db.collection(Ordinance.collection.collectionName);
  const documents = await collection.find({ sections: { $type: 'array', $ne: [] } }).toArray();
  const plans = documents.map((document) => ({
    document,
    provisions: mergeLegacySectionsIntoProvisions(document.provisions, document.sections),
  }));

  const summary = {
    database: db.databaseName,
    mode: applyChanges ? 'apply' : 'dry-run',
    affectedDocuments: plans.length,
    legacySectionsToFold: plans.reduce((total, { document }) => total + document.sections.length, 0),
    documents: plans.map(({ document }) => ({
      id: String(document._id),
      type: document.type,
      number: document.number,
      sectionCount: document.sections.length,
    })),
  };

  if (!applyChanges) {
    console.log(JSON.stringify({
      ...summary,
      message: 'Preflight complete. Re-run with --apply to back up affected documents and fold their sections into provisions.',
    }, null, 2));
    return;
  }

  if (!plans.length) {
    console.log(JSON.stringify({ ...summary, mode: 'applied', backupPath: null }, null, 2));
    return;
  }

  const backupPath = path.join(os.tmpdir(), `ibosys-pre-provisions-migration-${Date.now()}.ejson`);
  fs.writeFileSync(backupPath, EJSON.stringify({
    format: 'canonical-extended-json',
    createdAt: new Date().toISOString(),
    database: db.databaseName,
    collection: collection.collectionName,
    documents: documents,
  }, { relaxed: false }), { flag: 'wx' });

  await collection.bulkWrite(plans.map(({ document, provisions }) => ({
    updateOne: {
      filter: { _id: document._id, updatedAt: document.updatedAt },
      update: { $set: { provisions, sections: [], updatedAt: new Date() } },
    },
  })), { ordered: true });

  const updatedDocuments = await collection.find(
    { _id: { $in: documents.map(({ _id }) => _id) } },
    { projection: { _id: 1, provisions: 1, sections: 1 } },
  ).toArray();
  const byId = new Map(updatedDocuments.map((document) => [String(document._id), document]));
  const unverified = plans.filter(({ document, provisions }) => {
    const updated = byId.get(String(document._id));
    return !updated
      || updated.provisions !== provisions
      || !Array.isArray(updated.sections)
      || updated.sections.length !== 0;
  });

  if (unverified.length) {
    throw new Error(`Post-migration verification failed for ${unverified.length} document(s). Backup retained at ${backupPath}.`);
  }

  console.log(JSON.stringify({
    ...summary,
    mode: 'applied',
    backupPath,
    verification: { everyLegacySectionMerged: true, everyLegacySectionArrayCleared: true },
  }, null, 2));
}

run()
  .catch((error) => {
    console.error(`Ordinance sections migration stopped: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
