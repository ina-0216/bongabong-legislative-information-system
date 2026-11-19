const expressAsyncHandler = require('express-async-handler');
const Term = require('../models/Term');
const SBMember = require('../models/SBMember');
const User = require('../models/User');
const Committee = require('../models/Committee');
const mongoose = require('mongoose');
const { parseName } = require('../utils/nameParser');
const SystemSetting = require('../models/SystemSetting');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const { PDFDocument } = require('pdf-lib');
const { clearPdfHeaderCache, getPdfHeaderPreview } = require('../services/pdfService');

// SEC-07: One-time migration endpoints are disabled in production.
// They completed their purpose during development and pose a data-destruction
// risk if triggered on a live database. Run locally against a local DB if
// ever needed again.

const DISABLED = expressAsyncHandler(async (req, res) => {
  res.status(403).json({
    message: 'This one-time migration endpoint is disabled. It has already run and is not needed in production.',
  });
});

// Disabled: one-time migration endpoints
exports.fixTerms       = DISABLED;
exports.fixMemberTerms = DISABLED;
exports.deleteResidents = DISABLED;
exports.migrateNames   = DISABLED;
exports.seedDemoData   = DISABLED;

// ACTIVE: syncViceMayors — still useful to re-sync after a term's presidingOfficer is updated.
exports.syncViceMayors = expressAsyncHandler(async (req, res) => {
  const terms = await Term.find({});
  const results = [];

  for (const term of terms) {
    if (!term.presidingOfficer || !term.presidingOfficer.trim()) continue;
    const { firstName, middleName, lastName } = parseName(term.presidingOfficer);
    if (!firstName) continue;

    const existing = await SBMember.findOne({ termId: term._id, position: 'Vice Mayor' });
    if (existing) {
      existing.firstName = firstName;
      existing.middleName = middleName;
      existing.lastName = lastName;
      await existing.save();
      results.push({ action: 'updated', term: term.label, name: `${firstName} ${lastName}` });
    } else {
      await SBMember.create({
        firstName, middleName, lastName,
        position: 'Vice Mayor',
        termId: term._id,
        order: 1,
        isActive: term.isCurrent,
        committees: [], biography: '', contactEmail: '', fbLink: '', sbNumber: '',
      });
      results.push({ action: 'created', term: term.label, name: `${firstName} ${lastName}` });
    }
  }
  res.json({ message: `Synced ${results.length} Vice Mayor(s).`, results });
});

// ACTIVE: migrateCommittees — seeds per-term committee records when missing.
exports.migrateCommittees = expressAsyncHandler(async (req, res) => {
  const terms = await Term.find({});
  const currentTerm = terms.find(t => t.isCurrent);
  if (!currentTerm) {
    res.status(400);
    throw new Error('No current term found.');
  }

  const globalCommittees = await Committee.find({ termId: { $exists: false } });
  if (globalCommittees.length === 0) {
    return res.json({ message: 'No global committees to migrate.' });
  }

  try { await Committee.collection.dropIndex('name_1'); } catch (e) {}

  let totalMigrated = 0;
  for (const term of terms) {
    const isCurrent = term._id.toString() === currentTerm._id.toString();
    const newCommittees = globalCommittees.map(c => ({
      name: c.name,
      termId: term._id,
      chairperson: isCurrent ? c.chairperson : '',
      members: isCurrent ? c.members : [],
      description: c.description
    }));
    await Committee.insertMany(newCommittees);
    totalMigrated += newCommittees.length;
  }

  await Committee.deleteMany({ termId: { $exists: false } });
  res.json({
    message: `Migrated ${globalCommittees.length} unique committees across ${terms.length} terms (${totalMigrated} total committee records).`,
  });
});

const PDF_HEADER_KEY = 'pdf-header';

const getPdfHeaderSettings = expressAsyncHandler(async (req, res) => {
  const setting = await SystemSetting.findOne({ key: PDF_HEADER_KEY }).lean();
  res.json({
    ...await getPdfHeaderPreview(),
    source: setting?.pdfHeaderUrl ? 'custom' : 'default',
  });
});

const validatePdfHeaderBuffer = async (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('Choose a valid PDF header file.');
  }

  let document;
  try {
    document = await PDFDocument.load(buffer);
  } catch {
    throw new Error('The uploaded file is not a valid PDF.');
  }
  if (document.getPageCount() !== 1) {
    throw new Error('The PDF header must contain exactly one page.');
  }
  return document;
};

const updatePdfHeaderSettings = expressAsyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Choose a one-page PDF header file.');
  }
  if (req.file.mimetype !== 'application/pdf') {
    res.status(400);
    throw new Error('Only PDF header files are allowed.');
  }
  try {
    await validatePdfHeaderBuffer(req.file.buffer);
  } catch (error) {
    res.status(400);
    throw error;
  }

  const publicId = `pdf-header-${Date.now()}.pdf`;
  const uploaded = await uploadToCloudinary(req.file.buffer, {
    folder: 'ibosys/settings',
    public_id: publicId,
    resource_type: 'raw',
  });

  let previous;
  try {
    previous = await SystemSetting.findOneAndUpdate(
      { key: PDF_HEADER_KEY },
      {
        $set: {
          pdfHeaderUrl: uploaded.secure_url,
          pdfHeaderPublicId: uploaded.public_id,
          pdfHeaderMimeType: 'application/pdf',
        },
      },
      { new: false, upsert: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    await deleteFromCloudinary(uploaded.public_id, 'raw').catch(() => {});
    throw error;
  }

  clearPdfHeaderCache();
  if (previous?.pdfHeaderPublicId && previous.pdfHeaderPublicId !== uploaded.public_id) {
    const previousResourceType = previous.pdfHeaderMimeType === 'application/pdf' ? 'raw' : 'image';
    await deleteFromCloudinary(previous.pdfHeaderPublicId, previousResourceType).catch(() => {});
  }

  res.json({
    ...await getPdfHeaderPreview(),
    source: 'custom',
  });
});

exports.validatePdfHeaderBuffer = validatePdfHeaderBuffer;
exports.getPdfHeaderSettings = getPdfHeaderSettings;
exports.updatePdfHeaderSettings = updatePdfHeaderSettings;
