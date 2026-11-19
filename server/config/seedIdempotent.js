const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const User = require('../models/User');
const Ordinance = require('../models/Ordinance');

const Term = require('../models/Term');
const SBMember = require('../models/SBMember');
const Committee = require('../models/Committee');
const { assertFixtureSeedingAllowed, ensureSeedUser } = require('../utils/seedSafety');

const MONGODB_URI = process.env.MONGODB_URI;

const users = [
  { email: 'admin@ibosys.gov', password: 'Admin@1234', role: 'System Admin', status: 'Active', firstName: 'System', lastName: 'Administrator', contactNumber: '09000000000' },
  { email: 'secretary@ibosys.gov', password: 'Secretary@1234', role: 'Secretary', status: 'Active', firstName: 'Maria', lastName: 'Clara', contactNumber: '09111111111' },
  { email: 'vicemayor@ibosys.gov', password: 'ViceMayor@1234', role: 'Vice Mayor', status: 'Active', firstName: 'Juan', lastName: 'Dela Cruz', position: 'Vice Mayor', contactNumber: '09222222222' },
  { email: 'member1@ibosys.gov', password: 'Member@1234', role: 'SB Member', status: 'Active', firstName: 'Carlos', middleName: 'P.', lastName: 'Romulo', position: 'Committee Chair on Environment', contactNumber: '09333333333' },
  { email: 'member2@ibosys.gov', password: 'Member@1234', role: 'SB Member', status: 'Active', firstName: 'Jose', lastName: 'Rizal', position: 'Committee Chair on Peace & Order', contactNumber: '09333333334' },
];

const salt = 10;

async function seed() {
  assertFixtureSeedingAllowed();
  if (!MONGODB_URI) throw new Error('MONGODB_URI is required to seed the database.');
  await mongoose.connect(MONGODB_URI);

  console.log('[Seed] Starting idempotent seed...');

  for (const u of users) {
    const result = await ensureSeedUser(User, u, (password) => bcrypt.hash(password, salt));
    console.log(`[Seed] Fixture user ${result}.`);
  }
  console.log('[Seed] Users upserted.');

  const term = await Term.findOne({ startYear: 2025, endYear: 2028 });
  if (!term) {
    await Term.create({ label: '2025-2028', startYear: 2025, endYear: 2028 });
  }
  console.log('[Seed] Term ensured.');

  const ordinances = [
    {
      number: '2026-001', title: 'An Ordinance Regulating the Use of Single-Use Plastics within the Municipality',
      status: 'Approved', isLocked: true,
      sectorTag: 'Environment', committee: 'Environmental Protection',
    },
    {
      number: '2026-002', title: 'An Ordinance Prescribing Curfew Hours for Minors from 10:00 PM to 4:00 AM',
      status: 'Public Consultation', isLocked: false,
      sectorTag: 'Social Services', committee: 'Peace and Order',
    },
    {
      number: '2026-003', title: 'An Ordinance Establishing Barangay Health and Wellness Desks',
      status: 'First Reading', isLocked: false,
      sectorTag: 'Health', committee: 'Health and Sanitation',
    },
  ];

  for (const ord of ordinances) {
    await Ordinance.updateOne(
      { number: ord.number },
      { $setOnInsert: { ...ord, createdAt: new Date() } },
      { upsert: true, new: true }
    );
  }
  console.log('[Seed] Ordinances upserted.');

  console.log('[Seed] Idempotent seed complete!');
  await mongoose.disconnect();
}

if (require.main === module) {
  seed().catch((err) => { console.error(err); process.exitCode = 1; });
}

module.exports = { seed };
