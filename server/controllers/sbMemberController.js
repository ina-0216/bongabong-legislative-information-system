const asyncHandler = require('express-async-handler');
const SBMember = require('../models/SBMember');
const Ordinance = require('../models/Ordinance');
const Session = require('../models/Session');
const Committee = require('../models/Committee');
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require('../utils/cloudinary');

const getSbMembers = asyncHandler(async (req, res) => {
  const { termId, page = '1', limit = '20', includeInactive = 'false' } = req.query;
  const filter = {};
  if (termId) filter.termId = termId;
  if (includeInactive !== 'true' && includeInactive !== 'false') {
    res.status(400);
    throw new Error('includeInactive must be true or false.');
  }
  filter.isActive = includeInactive === 'true' ? false : { $ne: false };

  if (!/^\d+$/.test(String(page)) || Number(page) < 1) {
    res.status(400);
    throw new Error('Member page must be a positive whole number.');
  }
  if (!/^\d+$/.test(String(limit))) {
    res.status(400);
    throw new Error('Member page size must be a whole number from 0 to 100.');
  }
  const safePage = Number(page);
  const safeLimit = Number(limit);
  if (safeLimit > 100) {
    res.status(400);
    throw new Error('Member page size cannot exceed 100.');
  }

  // limit=0 is an explicit fetch-all contract reserved for dropdown callers.
  if (safeLimit === 0) {
    const members = await SBMember.find(filter).sort({ order: 1, lastName: 1, firstName: 1 });
    return res.json({ docs: members, total: members.length, page: 1, pages: 1 });
  }

  const skip = (safePage - 1) * safeLimit;
  const [members, total] = await Promise.all([
    SBMember.find(filter).sort({ order: 1, lastName: 1, firstName: 1 }).skip(skip).limit(safeLimit),
    SBMember.countDocuments(filter)
  ]);

  res.json({
    docs: members,
    total,
    page: safePage,
    pages: Math.max(1, Math.ceil(total / safeLimit)),
    includeInactive: includeInactive === 'true',
  });
});

const createSbMember = asyncHandler(async (req, res) => {
  const { firstName, middleName, lastName, position, biography, committees, termStart, termEnd, contactEmail, fbLink, sbNumber, order, termId } = req.body;
  
  let photoUrl = '';
  let photoPublicId = '';
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'ibosys/sb-members',
      public_id: `member_${Date.now()}`,
      resource_type: 'image',
    });
    photoUrl = result.secure_url;
    photoPublicId = result.public_id;
  }
  
  const member = new SBMember({
    firstName, middleName, lastName, position, biography,
    committees: (() => {
      if (!committees) return [];
      if (Array.isArray(committees)) return committees;
      try { return JSON.parse(committees); } catch {
        const err = new Error('committees must be a valid JSON array.');
        err.statusCode = 400;
        throw err;
      }
    })(),
    termStart, termEnd, contactEmail, fbLink, sbNumber,
    order: order === undefined ? 1 : Number(order),
    termId: termId || undefined,
    photoUrl,
    photoPublicId,
  });
  await member.save();
  res.status(201).json(member);
});

const updateSbMember = asyncHandler(async (req, res) => {
  const { firstName, middleName, lastName, position, biography, committees, termStart, termEnd, contactEmail, fbLink, sbNumber, order, isActive, termId } = req.body;
  const update = {
    firstName, middleName, lastName, position, biography,
    committees: (() => {
      if (!committees) return [];
      if (Array.isArray(committees)) return committees;
      try { return JSON.parse(committees); } catch {
        const err = new Error('committees must be a valid JSON array.');
        err.statusCode = 400;
        throw err;
      }
    })(),
    termStart, termEnd, contactEmail, fbLink, sbNumber,
    termId: termId || undefined,
    isActive: isActive !== undefined ? isActive === 'true' : true
  };
  if (order !== undefined) update.order = Number(order);
  const oldMember = req.file ? await SBMember.findById(req.params.id) : null;
  let replacementPhoto;
  if (req.file) {
    replacementPhoto = await uploadToCloudinary(req.file.buffer, {
      folder: 'ibosys/sb-members',
      public_id: `member_${Date.now()}`,
      resource_type: 'image',
    });
    update.photoUrl = replacementPhoto.secure_url;
    update.photoPublicId = replacementPhoto.public_id;
  }
  let member;
  try {
    member = await SBMember.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  } catch (error) {
    if (replacementPhoto) await deleteFromCloudinary(replacementPhoto.public_id).catch(() => {});
    throw error;
  }
  
  if (!member) {
    if (replacementPhoto) await deleteFromCloudinary(replacementPhoto.public_id).catch(() => {});
    res.status(404);
    throw new Error('Member not found');
  }
  if (replacementPhoto && oldMember?.photoPublicId) {
    await deleteFromCloudinary(oldMember.photoPublicId).catch((error) => {
      console.error(`[SBMember] Replaced portrait cleanup failed for ${oldMember._id}:`, error.message);
    });
  }
  res.json(member);
});

const deleteSbMember = asyncHandler(async (req, res) => {
  const member = await SBMember.findById(req.params.id);
  if (!member) {
    res.status(404);
    throw new Error('Member not found');
  }

  // NOTE: Committee membership is stored as plain strings — use an exact case-insensitive match.
  // Long-term architecture TODO: migrate Committee.chairperson/viceChairperson/members to ObjectId refs.
  const memberName = member.name;
  const escapedMemberName = memberName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const committeeNameMatcher = new RegExp(`^${escapedMemberName}$`, 'i');
  const [ordinances, sessions, committees] = await Promise.all([
    Ordinance.countDocuments({ $or: [
      { proponentId: member._id }, { coAuthors: member._id }, { motionBy: member._id }, { secondedBy: member._id },
    ] }),
    Session.countDocuments({ $or: [
      { 'attendance.present': member._id },
      { 'attendance.onOfficialBusiness': member._id },
      { 'attendance.absent': member._id },
    ] }),
    Committee.countDocuments({ $or: [
      { chairperson: committeeNameMatcher }, { viceChairperson: committeeNameMatcher }, { members: committeeNameMatcher },
    ] }),
  ]);

  if (ordinances || sessions || committees) {
    member.isActive = false;
    await member.save();
    return res.json({ message: 'Member deactivated to preserve linked legislative history.', deactivated: true });
  }

  await member.deleteOne();
  if (member.photoPublicId) {
    await deleteFromCloudinary(member.photoPublicId).catch((error) => {
      console.error(`[SBMember] Portrait cleanup failed for deleted member ${member._id}:`, error.message);
    });
  }
  res.json({ message: 'Member removed', deactivated: false });
});

module.exports = {
  getSbMembers,
  createSbMember,
  updateSbMember,
  deleteSbMember,
};
