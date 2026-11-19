const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { ObjectId } = mongoose.Types;
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const getSafeDatabaseTarget = (uri) => {
  try {
    const parsed = new URL(uri);
    const database = parsed.pathname.replace(/^\/+/, '');
    return [parsed.host, database].filter(Boolean).join('/');
  } catch {
    return 'configured database';
  }
};

function reviveEJSON(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(reviveEJSON);
  if (typeof obj === 'object') {
    // If it is a string representing a 24-hex-char ObjectId
    const keys = Object.keys(obj);
    const converted = {};
    for (const k of keys) {
      const val = obj[k];
      if (typeof val === 'string') {
        // Check for 24-char hex string on id fields or _id
        if ((k === '_id' || k.endsWith('Id') || k.endsWith('By')) && /^[0-9a-fA-F]{24}$/.test(val)) {
          converted[k] = new ObjectId(val);
        } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
          // ISO date string
          converted[k] = new Date(val);
        } else {
          converted[k] = val;
        }
      } else if (Array.isArray(val)) {
        converted[k] = val.map(item => {
          if (typeof item === 'string' && /^[0-9a-fA-F]{24}$/.test(item)) {
            return new ObjectId(item);
          }
          return reviveEJSON(item);
        });
      } else if (typeof val === 'object' && val !== null) {
        converted[k] = reviveEJSON(val);
      } else {
        converted[k] = val;
      }
    }
    return converted;
  }
  return obj;
}

async function rollback(backupFile) {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required to restore a database backup.');
  const backupPath = backupFile || path.join(__dirname, '..', '..', 'backups', 'db-backup-latest.json');

  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found at: ${backupPath}`);
  }

  console.log(`[Rollback] Reading backup file: ${backupPath}`);
  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

  console.log(`[Rollback] Connecting to MongoDB target: ${getSafeDatabaseTarget(uri)}`);
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log(`[Rollback] Restoring backup created at: ${backupData.timestamp}`);
  const restoredCounts = {};

  for (const [colName, docs] of Object.entries(backupData.collections)) {
    console.log(`[Rollback] Clearing collection: ${colName}...`);
    await db.collection(colName).deleteMany({});

    if (docs && docs.length > 0) {
      const revivedDocs = docs.map(reviveEJSON);
      await db.collection(colName).insertMany(revivedDocs);
      console.log(`[Rollback] Restored ${revivedDocs.length} documents into ${colName}`);
      restoredCounts[colName] = revivedDocs.length;
    } else {
      console.log(`[Rollback] Collection ${colName} had 0 documents in backup`);
      restoredCounts[colName] = 0;
    }
  }

  console.log('\n[Rollback Complete] Successfully restored all collections:');
  console.table(restoredCounts);

  await mongoose.disconnect();
}

if (require.main === module) {
  const targetFile = process.argv[2];
  rollback(targetFile)
    .then(() => {
      console.log('Rollback finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Rollback Error]:', err);
      process.exit(1);
    });
}

module.exports = rollback;
module.exports.getSafeDatabaseTarget = getSafeDatabaseTarget;
