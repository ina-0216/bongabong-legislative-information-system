const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function createBackup() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required to create a database backup.');
  console.log('[Backup] Connecting to the configured MongoDB database.');
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', '..', 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupData = {
    timestamp: new Date().toISOString(),
    database: db.databaseName,
    collections: {},
    counts: {}
  };

  for (const col of collections) {
    const docs = await db.collection(col.name).find({}).toArray();
    backupData.collections[col.name] = docs;
    backupData.counts[col.name] = docs.length;
    console.log(`[Backup] Exported ${col.name}: ${docs.length} documents`);
  }

  const backupPath = path.join(backupDir, `db-backup-full-${timestamp}.json`);
  const latestBackupPath = path.join(backupDir, `db-backup-latest.json`);

  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
  fs.writeFileSync(latestBackupPath, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log(`[Backup] Full database backup successfully saved to:`);
  console.log(` - ${backupPath}`);
  console.log(` - ${latestBackupPath}`);

  await mongoose.disconnect();
  return backupPath;
}

if (require.main === module) {
  createBackup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Backup Error]:', err);
      process.exit(1);
    });
}

module.exports = createBackup;
