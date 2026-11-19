require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
let placeholdersCleared = 0;
let targetConnection;

function clearGeneratedIdPlaceholder(document) {
  if (!document.id_attachment_url?.startsWith('/uploads/id_samples/')) return;
  document.id_attachment_url = '';
  document.id_attachment_public_id = '';
  document.id_attachment_format = 'jpg';
  document.id_attachment_type = 'upload';
  document.id_attachment_legacy_public_id = '';
  placeholdersCleared++;
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Local MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI);

  const sourceDb = mongoose.connection.db;
  const sourceCollections = (await sourceDb.listCollections().toArray())
    .filter(({ name }) => !name.startsWith('system.'));
  const sourceData = [];
  let attachmentCount = 0;

  for (const { name } of sourceCollections) {
    const documents = await sourceDb.collection(name).find({}).toArray();
    if (!documents.length) continue;
    sourceData.push({ name, documents });
    if (name === 'consultationfeedbacks') {
      attachmentCount = documents.filter((document) => Boolean(document.id_attachment_url)).length;
    }
  }

  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'}: ${sourceData.length} non-empty collections, ${sourceData.reduce((sum, item) => sum + item.documents.length, 0)} local records.`);
  console.log(`Consultation attachments: ${attachmentCount} referenced; generated placeholder references will be cleared in new Atlas copies.`);

  if (!APPLY) {
    console.log('No Atlas records or Cloudinary assets were changed.');
    return;
  }

  if (!process.env.ATLAS_MONGODB_URI) throw new Error('ATLAS_MONGODB_URI is required for --apply.');

  const targetHosts = process.env.ATLAS_MONGODB_URI
    .match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?([^/?]+)/i)?.[1]
    ?.split(',')
    .map((host) => host.trim().replace(/:\d+$/, '').toLowerCase());
  if (!targetHosts?.length || targetHosts.some((host) => !host.endsWith('.mongodb.net'))) {
    throw new Error('The target URI must point to a MongoDB Atlas host.');
  }

  targetConnection = mongoose.createConnection(process.env.ATLAS_MONGODB_URI, {
    dbName: sourceDb.databaseName,
    serverSelectionTimeoutMS: 30000,
  });
  await targetConnection.asPromise();

  const pending = [];
  for (const { name, documents } of sourceData) {
    const existingIds = await targetConnection.db.collection(name)
      .find({ _id: { $in: documents.map((document) => document._id) } }, { projection: { _id: 1 } })
      .toArray();
    const existing = new Set(existingIds.map((document) => String(document._id)));
    pending.push({ name, documents: documents.filter((document) => !existing.has(String(document._id))) });
  }

  const feedback = pending.find(({ name }) => name === 'consultationfeedbacks');
  for (const document of feedback?.documents || []) clearGeneratedIdPlaceholder(document);
  console.log(`Generated placeholder references cleared in ${placeholdersCleared} new Atlas record(s); the local source records are unchanged.`);

  for (const { name, documents } of pending) {
    if (!documents.length) continue;
    await targetConnection.db.collection(name).bulkWrite(documents.map((document) => ({
      updateOne: {
        filter: { _id: document._id },
        update: { $setOnInsert: document },
        upsert: true,
      },
    })), { ordered: true });
    console.log(`${name}: ${documents.length} copied; existing Atlas records were left untouched.`);
  }
}

main()
  .catch((error) => {
    console.error(`Migration stopped: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (targetConnection && targetConnection.readyState !== 0) await targetConnection.close().catch(() => {});
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
