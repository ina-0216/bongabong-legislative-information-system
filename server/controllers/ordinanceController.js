/**
 * Ordinance & resolution lifecycle controller.
 *
 * Route handlers for CRUD, status advancement, amendment linking, committee
 * reports, PDF download and Tagalog translation backfill. All handlers are
 * wrapped by `express-async-handler` so rejected promises propagate to the
 * Express error middleware automatically. Input mutations are validated by the
 * Zod schemas in `server/validations/ordinanceValidation.js` (see
 * `server/routes/ordinance.js`), and rich-text payloads are sanitized via
 * `utils/sanitize.js`.
 */
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Ordinance = require('../models/Ordinance');
const Session = require('../models/Session');
const ConsultationFeedback = require('../models/ConsultationFeedback');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Term = require('../models/Term');
const { getCurrentTermRange } = require('../utils/termCalendar');
const Committee = require('../models/Committee');
const SBMember = require('../models/SBMember');
const { translateToTagalog } = require('../utils/translator');
const { generateOrdinancePdf, generateResolutionPdf } = require('../services/pdfService');
const { setPdfResponseHeaders, legislativeDocumentFilename } = require('../utils/pdfFilename');
const { MANILA_TIME_ZONE, getManilaYearRange, getManilaDayRange } = require('../utils/manilaDateRange');
const { STAGES, RESOLUTION_STAGES } = require('../utils/constants');
const { sanitizePlainText, sanitizeOrdinanceFields } = require('../utils/sanitize');
const { uploadFileToCloudinary } = require('../utils/cloudinary');
const { promoteVerifiedPdfUpload } = require('../utils/cloudinaryDirectPdfUpload');

const notifyNewMeasure = async (measure, actorId) => {
  try {
    const recipients = await User.find({
      role: { $in: ['SB Member', 'Vice Mayor'] },
      status: 'Active',
      _id: { $ne: actorId },
    }).select('_id');
    if (recipients.length) {
      await Notification.insertMany(recipients.map(({ _id }) => ({
        recipientId: _id,
        title: `New ${measure.type}`,
        message: `${measure.type} ${measure.number}: "${measure.title}" has been filed and is ready for review.`,
        link: `/ordinances/${measure._id}`,
      })));
    }
  } catch (notifyErr) {
    console.error('[Ordinance] New measure notification failed:', notifyErr.message);
  }
};

const parseArrayField = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* return a clear validation error below */ }
  const error = new Error(`${fieldName} must be a valid JSON array.`);
  error.statusCode = 400;
  throw error;
};

const parseBooleanField = (value) => value === true || value === 'true';

const isRejectedResult = (value) => typeof value === 'string' && value.trim().toLowerCase() === 'rejected';
const isLegacyRejectedOrdinance = (ordinance) => ordinance?.type === 'Ordinance' && isRejectedResult(ordinance?.adoptionResult);
const isTerminallyRejected = (ordinance) => ordinance?.status === 'Rejected' || isLegacyRejectedOrdinance(ordinance);
const presentRejectionState = (record) => {
  const ordinance = typeof record?.toObject === 'function' ? record.toObject() : record;
  return isLegacyRejectedOrdinance(ordinance)
    ? { ...ordinance, status: 'Rejected', legacyRejection: true }
    : ordinance;
};

const ensureMemberIdsExist = async (ids, fieldName) => {
  const uniqueIds = [...new Set((ids || []).map(String))];
  if (!uniqueIds.length) return;
  const count = await SBMember.countDocuments({ _id: { $in: uniqueIds } });
  if (count !== uniqueIds.length) {
    const error = new Error(`${fieldName} contains an unknown Sangguniang Bayan member.`);
    error.statusCode = 400;
    throw error;
  }
};

const getOrdinances = asyncHandler(async (req, res) => {
  const { search, status, committee, sectorTag, year, isLocked, date, limit = 20, page = 1, type, termId, isDraft } = req.query;
  const filter = {};
  if (isDraft !== undefined) filter.isDraft = String(isDraft) === 'true';
  if (termId) filter.termId = termId;
  const searchFilter = search ? { $or: [
    { title: { $regex: search, $options: 'i' } },
    { number: { $regex: search, $options: 'i' } }
  ] } : null;
  const rejectedFilter = { $or: [
    { status: 'Rejected' },
    { type: 'Ordinance', adoptionResult: { $regex: /^\s*rejected\s*$/i } },
  ] };
  if (search && status === 'Rejected') filter.$and = [searchFilter, rejectedFilter];
  else if (search) filter.$or = searchFilter.$or;
  else if (status === 'Rejected') filter.$or = rejectedFilter.$or;
  else if (status) filter.status = status;
  if (type) filter.type = type;
  if (committee) filter.committee = committee;
  if (sectorTag) filter.sectorTag = sectorTag;
  if (isLocked !== undefined) filter.isLocked = JSON.parse(String(isLocked)).valueOf() === true;
  if (date) {
    const range = getManilaDayRange(date);
    if (!range) {
      res.status(400);
      throw new Error('Date must be a valid calendar date in YYYY-MM-DD format.');
    }
    filter.createdAt = { $gte: range.start, $lt: range.endExclusive };
  } else if (year) {
    const range = getManilaYearRange(year);
    if (!range) {
      res.status(400);
      throw new Error('Year must be a valid four-digit calendar year.');
    }
    filter.createdAt = { $gte: range.start, $lt: range.endExclusive };
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [ordinances, total] = await Promise.all([
    Ordinance.find(filter)
      .populate('proponentId', 'firstName middleName lastName position photoUrl')
      .populate('termId', 'label startYear endYear')
      .populate('amendedByOrdinanceId', 'number title')
      .populate('amendsOrdinanceId', 'number title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Ordinance.countDocuments(filter)
  ]);
  
  res.json({ docs: ordinances.map(presentRejectionState), total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

const getOrdinanceStats = asyncHandler(async (req, res) => {
  // H-1 fix: single $facet aggregate replaces 7 sequential countDocuments round-trips
  const [counts] = await Ordinance.aggregate([{
    $facet: {
      total:        [{ $count: 'n' }],
      ordinances:   [{ $match: { type: 'Ordinance' } }, { $count: 'n' }],
      resolutions:  [{ $match: { type: 'Resolution' } }, { $count: 'n' }],
      approved:     [{ $match: { isDraft: { $ne: true }, status: 'Approved' } }, { $count: 'n' }],
      rejected:     [{ $match: { isDraft: { $ne: true }, $or: [{ status: 'Rejected' }, { type: 'Ordinance', adoptionResult: { $regex: /^\s*rejected\s*$/i } }] } }, { $count: 'n' }],
      inProgress:   [{ $match: { isDraft: { $ne: true }, status: { $nin: ['Approved', 'Rejected', 'Draft'] }, $nor: [{ type: 'Ordinance', adoptionResult: { $regex: /^\s*rejected\s*$/i } }] } }, { $count: 'n' }],
      drafts:       [{ $match: { $or: [{ isDraft: true }, { status: 'Draft' }] } }, { $count: 'n' }],
      consultation: [{ $match: { isDraft: { $ne: true }, status: 'Public Consultation' } }, { $count: 'n' }],
    }
  }]);

  const pick = (key) => counts?.[key]?.[0]?.n ?? 0;
  const total            = pick('total');
  const totalOrdinances  = pick('ordinances');
  const totalResolutions = pick('resolutions');
  const approved         = pick('approved');
  const rejected         = pick('rejected');
  const inProgress       = pick('inProgress');
  const drafts           = pick('drafts');
  const consultation     = pick('consultation');

  const byCommittee = await Ordinance.aggregate([
    { $group: { _id: '$committee', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const byYear = await Ordinance.aggregate([
    { $group: { _id: { $year: { date: '$createdAt', timezone: MANILA_TIME_ZONE } }, count: { $sum: 1 } } },
    { $sort: { '_id': 1 } }
  ]);

  const terms = await Term.find().sort({ startYear: 1 });
  const termCounts = await Ordinance.aggregate([
    { $group: { _id: '$termId', count: { $sum: 1 } } }
  ]);
  const countMap = {};
  termCounts.forEach(t => {
    if (t._id) countMap[t._id.toString()] = t.count;
  });

  const byTerm = terms.map(term => ({
    _id: term.label,
    termId: term._id,
    startYear: term.startYear,
    count: countMap[term._id.toString()] || 0
  }));

  const unassignedCount = termCounts.find(t => !t._id)?.count || 0;
  if (unassignedCount > 0) {
    byTerm.push({
      _id: 'Unassigned',
      termId: null,
      startYear: 9999,
      count: unassignedCount
    });
  }

  // M-3 fix: include all non-draft measures so resolution-heavy proponents are counted
  const byProponent = await Ordinance.aggregate([
    { $match: { isDraft: { $ne: true } } },
    { $group: { _id: '$proponentId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 }
  ]);
  
  const proponentIds = byProponent.map(b => b._id);
  const proponents = await SBMember.find({ _id: { $in: proponentIds } }).select('firstName middleName lastName position name');
  const proponentMap = {};
  proponents.forEach(p => { 
    proponentMap[p._id.toString()] = p.name || [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' '); 
  });
  
  const byProponentNamed = byProponent.map(b => ({
    name: proponentMap[b._id?.toString()] || 'Unknown',
    count: b.count
  }));

  // Per-proponent outcomes include formal rejection dispositions and retain
  // the legacy text result for historical records. Drafts remain excluded.
  const byProponentOutcomes = await Ordinance.aggregate([
    { $match: { isDraft: { $ne: true } } },
    {
      $group: {
        _id: '$proponentId',
        approved: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
        rejected: {
          $sum: {
            $cond: [
              { $or: [
                { $eq: ['$status', 'Rejected'] },
                { $eq: [{ $toLower: { $trim: { input: { $ifNull: ['$adoptionResult', ''] } } } }, 'rejected'] },
              ] },
              1,
              0,
            ],
          },
        },
      },
    },
    { $addFields: { total: { $add: ['$approved', '$rejected'] } } },
    { $match: { total: { $gt: 0 } } },
    { $sort: { total: -1, approved: -1, rejected: -1 } },
    { $limit: 8 },
  ]);

  const outcomeIds = byProponentOutcomes.map(o => o._id).filter(Boolean);
  const outcomeMembers = outcomeIds.length
    ? await SBMember.find({ _id: { $in: outcomeIds } }).select('firstName middleName lastName position name')
    : [];
  const outcomeNameMap = {};
  outcomeMembers.forEach(p => {
    outcomeNameMap[p._id.toString()] = p.name || [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
  });

  const byProponentOutcomesNamed = byProponentOutcomes.map(o => ({
    name: outcomeNameMap[o._id?.toString()] || 'Unknown',
    approved: o.approved,
    rejected: o.rejected,
  }));

  const sentimentAgg = await ConsultationFeedback.aggregate([
    { $match: { status: 'Approved' } },
    { $group: { _id: '$vote', count: { $sum: 1 } } }
  ]);
  
  const sentimentOverview = { Agree: 0, Disagree: 0, Neutral: 0, total: 0 };
  sentimentAgg.forEach(s => {
    if (sentimentOverview.hasOwnProperty(s._id)) sentimentOverview[s._id] = s.count;
    sentimentOverview.total += s.count;
  });

  res.json({ total, totalOrdinances, totalResolutions, approved, rejected, inProgress, drafts, consultation, byCommittee, byYear, byTerm, byProponent: byProponentNamed, byProponentOutcomes: byProponentOutcomesNamed, sentimentOverview });
});

const getNextOrdinanceNumber = asyncHandler(async (req, res) => {
  const year = Number(req.query.seriesYear);
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    res.status(400);
    throw new Error('Series year must be a valid four-digit year.');
  }

  const pattern = new RegExp(`^${year}-(\\d+)$`);
  const numberedOrdinances = await Ordinance.find({ type: 'Ordinance', number: pattern }).select('number').lean();
  const highestSequence = numberedOrdinances.reduce((highest, ordinance) => {
    const match = pattern.exec(ordinance.number);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  res.json({ number: `${year}-${String(highestSequence + 1).padStart(3, '0')}`, seriesYear: year });
});

const getOrdinanceById = asyncHandler(async (req, res) => {
  const ord = await Ordinance.findById(req.params.id)
    .populate('proponentId', 'firstName middleName lastName position photoUrl')
    .populate('amendsOrdinanceId', 'number title')
    .populate('amendedByOrdinanceId', 'number title')
    .populate('coAuthors', 'firstName middleName lastName position photoUrl')
    .populate('motionBy', 'firstName middleName lastName position photoUrl')
    .populate('secondedBy', 'firstName middleName lastName position photoUrl')
    .populate('committeeAssignment.assignedBy', 'name role')
    .populate('timeline.updatedBy', 'name role')
    .populate('timeline.session', 'title sessionNumber date status')
    .populate('rejection.recordedBy', 'name role')
    .populate('rejection.session', 'title sessionNumber date status')
    .populate('termId', 'label startYear endYear');
    
  if (!ord) {
    res.status(404);
    throw new Error('Ordinance not found');
  }
  
  const sessions = await mongoose.model('Session').find({ itemsDiscussed: ord._id }).select('title date minutesPdfUrl').sort({ date: -1 });
  
  res.json({ ...presentRejectionState(ord), sessions });
});

const createOrdinance = asyncHandler(async (req, res) => {
  const {
    type, number, title, title_tl, proponentId, sectorTag, explanatoryNote,
    definitionsOfTerms,
    enactingClause, provisions, penaltyClause, effectivityDate, plainLanguageSummary,
    plainLanguageSummary_tl, sections, termId, isDraft: rawIsDraft, seriesYear,
    coAuthors: rawCoAuthors, motionBy, secondedBy: rawSecondedBy, adoptionResult,
    adoptionDate, distribution: rawDistribution, amendsOrdinanceId,
    pdfUpload,
  } = req.body;
  const verifiedPdfUpload = pdfUpload ? await promoteVerifiedPdfUpload(pdfUpload) : null;
  const isDraft = parseBooleanField(rawIsDraft);
  if (type === 'Ordinance' && isRejectedResult(adoptionResult)) {
    res.status(400);
    throw new Error('Record an official Sangguniang Bayan decision using the formal Reject Ordinance action; Adoption Result is not a rejection control.');
  }
  let amendmentParent = null;
  if (amendsOrdinanceId) {
    if (isDraft) {
      res.status(400);
      throw new Error('An amendment can only be linked when it is filed, not while it is a draft.');
    }
    amendmentParent = await Ordinance.findById(amendsOrdinanceId);
    if (!amendmentParent) {
      res.status(404);
      throw new Error('The earlier measure selected for amendment was not found.');
    }
    if (amendmentParent.type !== type) {
      res.status(400);
      throw new Error(`A ${type.toLowerCase()} can only amend another ${type.toLowerCase()}.`);
    }
    if (amendmentParent.isDraft || amendmentParent.status === 'Draft') {
      res.status(400);
      throw new Error('A draft measure cannot be amended. File the earlier measure first.');
    }
    if (amendmentParent.amendedByOrdinanceId) {
      res.status(409);
      throw new Error('The selected measure already has a newer amendment. Select its latest version instead.');
    }
  }
  const ordinanceNumberMatch = type === 'Ordinance' ? /^(\d{4})-(\d{3,})$/.exec(number) : null;
  if (type === 'Ordinance' && !ordinanceNumberMatch) {
    res.status(400);
    throw new Error('Ordinance number must use YYYY-NNN format, for example 2026-001.');
  }
  const finalSeriesYear = type === 'Ordinance'
    ? Number(seriesYear || ordinanceNumberMatch[1])
    : (seriesYear ? Number(seriesYear) : undefined);
  if (type === 'Ordinance' && finalSeriesYear !== Number(ordinanceNumberMatch[1])) {
    res.status(400);
    throw new Error('Series year must match the year at the start of the ordinance number.');
  }

  let finalTermId = termId;
  if (!finalTermId) {
    const term = await Term.findOne(getCurrentTermRange());
    if (!term) {
      res.status(400);
      throw new Error('No legislative term is active for today. Create the term covering the current date before creating a measure.');
    }
    finalTermId = term._id;
  } else if (!await Term.exists({ _id: finalTermId })) {
    res.status(400);
    throw new Error('Invalid legislative term.');
  }

  // Ordinance numbers are unique across the municipality; resolution numbering remains term-scoped.
  const exists = type === 'Ordinance'
    ? await Ordinance.findOne({ type, number })
    : await Ordinance.findOne({ number, termId: finalTermId });
  if (exists) {
    res.status(400);
    throw new Error(type === 'Ordinance'
      ? `Ordinance number ${number} is already assigned. Refresh the generated number and try again.`
      : `Ordinance number ${number} already exists in the selected term.`);
  }

  // DATA-02: Validate proponentId exists
  const proponentExists = await SBMember.findById(proponentId);
  if (!proponentExists) {
    res.status(400);
    throw new Error('Invalid proponentId: SB Member not found');
  }

  const coAuthors = parseArrayField(rawCoAuthors, 'Co-authors');
  const secondedBy = parseArrayField(rawSecondedBy, 'Seconded-by');
  const distribution = parseArrayField(rawDistribution, 'Distribution');
  const parsedSections = parseArrayField(sections, 'Sections');
  await ensureMemberIdsExist([...coAuthors, ...secondedBy, ...(motionBy ? [motionBy] : [])], 'Resolution and author fields');

  // SEC-02: Sanitize plain-text and HTML fields
  const plainSanitized = {
    title: sanitizePlainText(title),
    number: sanitizePlainText(number),
    title_tl: title_tl !== undefined ? sanitizePlainText(title_tl) : undefined,
    sectorTag: sanitizePlainText(sectorTag),
  };

  const finalTitleTl = title_tl !== undefined
    ? plainSanitized.title_tl
    : await translateToTagalog(plainSanitized.title);
  const finalSummaryTl = plainLanguageSummary_tl !== undefined
    ? sanitizePlainText(plainLanguageSummary_tl)
    : plainLanguageSummary
      ? await translateToTagalog(sanitizePlainText(plainLanguageSummary))
      : '';

  // Sanitize all HTML inputs
  const sanitized = sanitizeOrdinanceFields({
    explanatoryNote,
    definitionsOfTerms,
    enactingClause,
    provisions,
    penaltyClause,
    plainLanguageSummary,
    plainLanguageSummary_tl: finalSummaryTl,
    sections: parsedSections,
  });

  const ordinanceData = {
    type,
    number: plainSanitized.number,
    title: plainSanitized.title,
    title_tl: finalTitleTl,
    proponentId,
    sectorTag: plainSanitized.sectorTag || 'General',
    seriesYear: finalSeriesYear,
    coAuthors,
    motionBy: motionBy || undefined,
    secondedBy,
    adoptionResult: adoptionResult ? sanitizePlainText(adoptionResult) : '',
    adoptionDate: adoptionDate || undefined,
    distribution: distribution.map(item => sanitizePlainText(item)),
    isDraft,
    status: isDraft ? 'Draft' : 'First Reading',
    filedBy: isDraft ? undefined : req.user._id,
    filedAt: isDraft ? undefined : new Date(),
    explanatoryNote: sanitized.explanatoryNote,
    definitionsOfTerms: sanitized.definitionsOfTerms,
    enactingClause: sanitized.enactingClause,
    provisions: sanitized.provisions,
    penaltyClause: sanitized.penaltyClause,
    effectivityDate,
    plainLanguageSummary: sanitized.plainLanguageSummary,
    plainLanguageSummary_tl: sanitized.plainLanguageSummary_tl,
    sections: sanitized.sections,
    termId: finalTermId,
    amendsOrdinanceId: amendmentParent?._id || null,
    pdfUrl: verifiedPdfUpload?.secure_url || (req.file ? (await uploadFileToCloudinary(req.file.path, { folder: 'ibosys/ordinances', resource_type: 'raw' })).secure_url : undefined),
    timeline: [{
      status: isDraft ? 'Draft' : 'First Reading',
      updatedBy: req.user._id,
      notes: isDraft ? `${type} saved as a working draft.` : `${type} proposed and introduced.`,
    }]
  };

  let ordinance;
  if (amendmentParent) {
    const dbSession = await mongoose.startSession();
    try {
      await dbSession.withTransaction(async () => {
        const currentParent = await Ordinance.findById(amendmentParent._id).session(dbSession);
        if (!currentParent) {
          res.status(404);
          throw new Error('The earlier measure selected for amendment was not found.');
        }
        if (currentParent.type !== type || currentParent.isDraft || currentParent.status === 'Draft') {
          res.status(400);
          throw new Error('The selected earlier measure is no longer eligible for amendment.');
        }
        if (currentParent.amendedByOrdinanceId) {
          res.status(409);
          throw new Error('The selected measure already has a newer amendment. Select its latest version instead.');
        }
        [ordinance] = await Ordinance.create([ordinanceData], { session: dbSession });
        currentParent.amendedByOrdinanceId = ordinance._id;
        await currentParent.save({ session: dbSession });
      });
    } finally {
      await dbSession.endSession();
    }
  } else {
    ordinance = await Ordinance.create(ordinanceData);
  }

  if (!isDraft) await notifyNewMeasure(ordinance, req.user._id);

  res.status(201).json(ordinance);
});

const updateOrdinanceStatus = asyncHandler(async (req, res) => {
  const { status, notes, sessionId } = req.body;

  const ord = await Ordinance.findById(req.params.id);
  if (!ord) {
    res.status(404);
    throw new Error('Ordinance not found');
  }
  if (ord.isLocked) {
    res.status(400);
    throw new Error('Ordinance is locked (Approved) and cannot be edited.');
  }
  if (isTerminallyRejected(ord)) {
    res.status(400);
    throw new Error('A rejected ordinance is terminal and cannot advance to another stage.');
  }

  const previousStatus = ord.status;
  const stages = ord.type === 'Resolution' ? RESOLUTION_STAGES : STAGES;
  const currentIndex = stages.indexOf(ord.status);
  const newIndex = stages.indexOf(status);
  if (currentIndex < 0 || newIndex !== currentIndex + 1) {
    res.status(400);
    throw new Error(`Invalid transition for ${ord.type}: move only to the next permitted stage.`);
  }
  if (status === 'First Reading' && (!ord.explanatoryNote?.trim() || !ord.provisions?.trim())) {
    res.status(400);
    throw new Error('Complete the explanatory note and provisions before filing at First Reading.');
  }
  if (ord.status === 'Committee Assignment' && !ord.committee?.trim()) {
    res.status(400);
    throw new Error('Assign a lead committee before advancing beyond Committee Assignment.');
  }

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    let linkedSession = null;
    if (sessionId) {
      linkedSession = await Session.findById(sessionId).session(dbSession);
      if (!linkedSession) {
        res.status(404);
        throw new Error('Selected session was not found. Refresh the page and select an existing session.');
      }
      const alreadyDiscussed = linkedSession.itemsDiscussed.some(item => String(item) === String(ord._id));
      if (!alreadyDiscussed) {
        linkedSession.itemsDiscussed.push(ord._id);
        await linkedSession.save({ session: dbSession });
      }
    }

    ord.status = status;
    ord.timeline.push({
      status,
      notes: notes?.trim() || undefined,
      session: linkedSession?._id || null,
      updatedBy: req.user._id,
    });
    if (status === 'First Reading') {
      ord.isDraft = false;
      ord.filedBy = req.user._id;
      ord.filedAt = new Date();
    }
    if (status === 'Approved') ord.isLocked = true;
    await ord.save({ session: dbSession });

    if (status === 'Approved') {
      const allStaff = await User.find({ role: { $in: ['SB Member', 'Vice Mayor', 'Secretary'] }, status: 'Active' }).session(dbSession);
      const approvedNotifs = allStaff.map(m => ({
        recipientId: m._id,
        title: `${ord.type || 'Ordinance'} Approved`,
        message: `${ord.type || 'Ordinance'} ${ord.number}: "${ord.title}" has been approved.`,
        link: `/ordinances/${ord._id}`
      }));
      await Notification.insertMany(approvedNotifs, { session: dbSession });
    }

    await dbSession.commitTransaction();
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }

  if (status === 'First Reading' && previousStatus === 'Draft') {
    await notifyNewMeasure(ord, req.user._id);
  }

  if (status === 'Public Consultation') {
    try {
      const recipients = await User.find({
        role: { $in: ['System Admin', 'Secretary'] },
        status: 'Active',
        _id: { $ne: req.user._id },
      }).select('_id');
      if (recipients.length) {
        await Notification.insertMany(recipients.map(({ _id }) => ({
          recipientId: _id,
          title: 'Public Consultation Opened',
          message: `${ord.type || 'Ordinance'} ${ord.number}: "${ord.title}" is now open for public feedback.`,
          link: `/ordinances/${ord._id}`,
        })));
      }
    } catch (notifyErr) {
      console.error('[Ordinance] Public consultation notification failed:', notifyErr.message);
    }
  }

  const populated = await Ordinance.findById(ord._id)
    .populate('proponentId', 'firstName middleName lastName position photoUrl')
    .populate('timeline.updatedBy', 'name role')
    .populate('timeline.session', 'title sessionNumber date status');
  res.json(populated);
});

const rejectOrdinance = asyncHandler(async (req, res) => {
  const { reason, minutesReference, sessionId, voteTally } = req.body;
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();
  let rejectedId;

  try {
    const ord = await Ordinance.findById(req.params.id).session(dbSession);
    if (!ord) {
      res.status(404);
      throw new Error('Ordinance not found');
    }
    if (ord.type !== 'Ordinance') {
      res.status(400);
      throw new Error('This rejection action is currently available for ordinances only.');
    }
    if (ord.isDraft || ord.status === 'Draft') {
      res.status(400);
      throw new Error('A draft cannot be formally rejected. File the ordinance before recording a decision.');
    }
    if (ord.isLocked) {
      res.status(400);
      throw new Error('This ordinance is locked and cannot be changed.');
    }
    if (isTerminallyRejected(ord)) {
      res.status(409);
      throw new Error('This ordinance has already been recorded as rejected.');
    }
    const rejectableStages = [
      'First Reading',
      'Committee Assignment',
      'Committee Hearing',
      'Public Consultation',
      'Second Reading',
      'Third Reading',
    ];
    if (!rejectableStages.includes(ord.status)) {
      res.status(400);
      throw new Error('An ordinance can be marked rejected only during its proposed-measure stages, from First Reading through Third Reading.');
    }

    let linkedSession = null;
    if (sessionId) {
      linkedSession = await Session.findById(sessionId).session(dbSession);
      if (!linkedSession) {
        res.status(404);
        throw new Error('Selected session was not found. Refresh the page and select an existing session.');
      }
      const alreadyDiscussed = linkedSession.itemsDiscussed.some(item => String(item) === String(ord._id));
      if (!alreadyDiscussed) {
        linkedSession.itemsDiscussed.push(ord._id);
        await linkedSession.save({ session: dbSession });
      }
    }

    const recordedAt = new Date();
    const sanitizedReason = sanitizePlainText(reason);
    const sanitizedReference = sanitizePlainText(minutesReference || '');
    const stage = ord.status;

    ord.status = 'Rejected';
    ord.rejection = {
      reason: sanitizedReason,
      minutesReference: sanitizedReference,
      stage,
      recordedAt,
      recordedBy: req.user._id,
      session: linkedSession?._id || null,
      voteTally: voteTally || {},
    };
    ord.timeline.push({
      status: 'Rejected',
      notes: sanitizedReason,
      session: linkedSession?._id || null,
      updatedBy: req.user._id,
      date: recordedAt,
    });
    await ord.save({ session: dbSession });
    await dbSession.commitTransaction();
    rejectedId = ord._id;
  } catch (error) {
    if (dbSession.inTransaction()) await dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }

  const populated = await Ordinance.findById(rejectedId)
    .populate('proponentId', 'firstName middleName lastName position photoUrl')
    .populate('rejection.recordedBy', 'name role')
    .populate('rejection.session', 'title sessionNumber date status')
    .populate('timeline.updatedBy', 'name role')
    .populate('timeline.session', 'title sessionNumber date status');
  res.json(populated);
});

const amendOrdinance = asyncHandler(async (req, res) => {
  const { newOrdinanceId } = req.body;
  const oldOrd = await Ordinance.findById(req.params.id);
  if (!oldOrd) {
    res.status(404);
    throw new Error('Ordinance not found');
  }
  const newOrd = await Ordinance.findById(newOrdinanceId);
  if (!newOrd) {
    res.status(404);
    throw new Error('New ordinance not found');
  }
  if (oldOrd._id.equals(newOrd._id)) {
    res.status(400);
    throw new Error('A measure cannot amend itself.');
  }
  if (oldOrd.type !== newOrd.type) {
    res.status(400);
    throw new Error(`A ${newOrd.type.toLowerCase()} can only amend another ${newOrd.type.toLowerCase()}.`);
  }
  if (isTerminallyRejected(oldOrd) || isTerminallyRejected(newOrd)) {
    res.status(400);
    throw new Error('Rejected measures cannot be linked as amendments.');
  }
  if (oldOrd.isDraft || oldOrd.status === 'Draft' || newOrd.isDraft || newOrd.status === 'Draft') {
    res.status(400);
    throw new Error('Only filed measures can be linked as amendments.');
  }

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const currentOld = await Ordinance.findById(oldOrd._id).session(dbSession);
    const currentNew = await Ordinance.findById(newOrd._id).session(dbSession);
    if (!currentOld || !currentNew) {
      res.status(404);
      throw new Error('One of the measures could not be found. Refresh and try again.');
    }
    if (currentOld.amendedByOrdinanceId && !currentOld.amendedByOrdinanceId.equals(currentNew._id)) {
      res.status(409);
      throw new Error('The earlier measure already has a newer amendment.');
    }
    if (currentNew.amendsOrdinanceId && !currentNew.amendsOrdinanceId.equals(currentOld._id)) {
      res.status(409);
      throw new Error('The new measure is already linked to a different earlier measure.');
    }
    currentOld.amendedByOrdinanceId = currentNew._id;
    currentNew.amendsOrdinanceId = currentOld._id;
    await currentOld.save({ session: dbSession });
    await currentNew.save({ session: dbSession });
    await dbSession.commitTransaction();
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }

  res.json({ message: 'Amendatory link established', oldOrdinance: oldOrd.number, newOrdinance: newOrd.number });
});

const updateOrdinance = asyncHandler(async (req, res) => {
  const ord = await Ordinance.findById(req.params.id);
  if (!ord) {
    res.status(404);
    throw new Error('Ordinance not found');
  }
  if (ord.isLocked || isTerminallyRejected(ord)) {
    res.status(400);
    throw new Error('Cannot edit a locked or rejected ordinance.');
  }
  const verifiedPdfUpload = req.body.pdfUpload
    ? await promoteVerifiedPdfUpload(req.body.pdfUpload)
    : null;
  if (ord.type === 'Ordinance' && req.body.adoptionResult !== undefined && isRejectedResult(req.body.adoptionResult)) {
    res.status(400);
    throw new Error('Record an official Sangguniang Bayan decision using the formal Reject Ordinance action; Adoption Result is not a rejection control.');
  }

  const requestedDraft = req.body.isDraft !== undefined ? parseBooleanField(req.body.isDraft) : undefined;
  if (requestedDraft === true && ord.status !== 'Draft') {
    res.status(400);
    throw new Error('A filed measure cannot be returned to Draft.');
  }
  if (requestedDraft === false && ord.status === 'Draft' && (!req.body.explanatoryNote?.trim() || !req.body.provisions?.trim())) {
    res.status(400);
    throw new Error('Complete the explanatory note and provisions before filing at First Reading.');
  }

  // Validate all member and term references before applying edits.
  if (req.body.proponentId !== undefined) {
    const proponentExists = await SBMember.findById(req.body.proponentId);
    if (!proponentExists) {
      res.status(400);
      throw new Error('Invalid proponentId: SB Member not found');
    }
  }

  if (req.body.termId !== undefined && !await Term.exists({ _id: req.body.termId })) {
    res.status(400);
    throw new Error('Invalid legislative term.');
  }

  const coAuthors = req.body.coAuthors !== undefined ? parseArrayField(req.body.coAuthors, 'Co-authors') : undefined;
  const secondedBy = req.body.secondedBy !== undefined ? parseArrayField(req.body.secondedBy, 'Seconded-by') : undefined;
  const distribution = req.body.distribution !== undefined ? parseArrayField(req.body.distribution, 'Distribution') : undefined;
  const sections = req.body.sections !== undefined ? parseArrayField(req.body.sections, 'Sections') : undefined;
  await ensureMemberIdsExist([
    ...(coAuthors || []),
    ...(secondedBy || []),
    ...(req.body.motionBy ? [req.body.motionBy] : []),
  ], 'Author and Resolution fields');

  const targetTermId = req.body.termId !== undefined ? req.body.termId : ord.termId;
  const targetNumber = req.body.number !== undefined ? sanitizePlainText(req.body.number) : ord.number;
  const targetSeriesYear = req.body.seriesYear !== undefined ? Number(req.body.seriesYear) : ord.seriesYear;
  if (ord.type === 'Ordinance') {
    const match = /^(\d{4})-(\d{3,})$/.exec(targetNumber);
    const numberChanged = targetNumber !== ord.number;
    if (numberChanged && !match) {
      res.status(400);
      throw new Error('Ordinance number must use YYYY-NNN format, for example 2026-001.');
    }
    if (match && targetSeriesYear !== undefined && targetSeriesYear !== Number(match[1])) {
      res.status(400);
      throw new Error('Series year must match the year at the start of the ordinance number.');
    }
  }
  if (req.body.number !== undefined || req.body.termId !== undefined) {
    const duplicate = await Ordinance.findOne(ord.type === 'Ordinance'
      ? { _id: { $ne: ord._id }, type: 'Ordinance', number: targetNumber }
      : { _id: { $ne: ord._id }, number: targetNumber, termId: targetTermId || null });
    if (duplicate) {
      res.status(400);
      throw new Error(`Measure number ${targetNumber} already exists in the selected term.`);
    }
  }

  const fields = [
    'title', 'title_tl', 'proponentId', 'sectorTag', 'explanatoryNote', 'definitionsOfTerms', 'enactingClause',
    'provisions', 'penaltyClause', 'effectivityDate', 'plainLanguageSummary',
    'plainLanguageSummary_tl', 'termId', 'motionBy', 'adoptionDate',
  ];
  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      if (['title', 'title_tl', 'sectorTag'].includes(field)) ord[field] = sanitizePlainText(req.body[field]);
      else if (field === 'motionBy' && !req.body[field]) ord.motionBy = null;
      else if (['adoptionDate', 'effectivityDate'].includes(field) && !req.body[field]) ord[field] = null;
      else ord[field] = req.body[field];
    }
  });
  if (req.body.number !== undefined) ord.number = targetNumber;
  if (req.body.seriesYear !== undefined) ord.seriesYear = Number(req.body.seriesYear);
  else if (ord.type === 'Ordinance' && req.body.number !== undefined) {
    const match = /^(\d{4})-(\d{3,})$/.exec(targetNumber);
    if (match) ord.seriesYear = Number(match[1]);
  }
  if (coAuthors !== undefined) ord.coAuthors = coAuthors;
  if (secondedBy !== undefined) ord.secondedBy = secondedBy;
  if (distribution !== undefined) ord.distribution = distribution.map(item => sanitizePlainText(item));
  if (req.body.adoptionResult !== undefined) ord.adoptionResult = sanitizePlainText(req.body.adoptionResult);
  
  if (!ord.title_tl || ord.title_tl.trim() === '') {
    if (req.body.title_tl === undefined) {
      ord.title_tl = await translateToTagalog(ord.title);
    } else {
      // Keep the caller-supplied value, but sanitized — the raw request body
      // must never overwrite the field that was already cleaned above.
      ord.title_tl = sanitizePlainText(req.body.title_tl);
    }
  }
  if (ord.plainLanguageSummary && (!ord.plainLanguageSummary_tl || ord.plainLanguageSummary_tl.trim() === '')) {
    if (req.body.plainLanguageSummary_tl === undefined) {
      // Translate the sanitized summary, never the raw rich-text payload, so
      // HTML markup is not carried into the Tagalog version.
      ord.plainLanguageSummary_tl = await translateToTagalog(
        sanitizePlainText(ord.plainLanguageSummary)
      );
    } else {
      ord.plainLanguageSummary_tl = sanitizePlainText(req.body.plainLanguageSummary_tl);
    }
  }

  if (sections !== undefined) ord.sections = sections;

  if (verifiedPdfUpload) {
    ord.pdfUrl = verifiedPdfUpload.secure_url;
  } else if (req.file) {
    const uploaded = await uploadFileToCloudinary(req.file.path, { folder: 'ibosys/ordinances', resource_type: 'raw' });
    ord.pdfUrl = uploaded.secure_url;
  }

  // Sanitize HTML fields
  const sanitized = sanitizeOrdinanceFields({
    explanatoryNote: ord.explanatoryNote,
    definitionsOfTerms: ord.definitionsOfTerms,
    enactingClause: ord.enactingClause,
    provisions: ord.provisions,
    penaltyClause: ord.penaltyClause,
    plainLanguageSummary: ord.plainLanguageSummary,
    plainLanguageSummary_tl: ord.plainLanguageSummary_tl,
    sections: ord.sections,
  });

  ord.explanatoryNote = sanitized.explanatoryNote;
  ord.definitionsOfTerms = sanitized.definitionsOfTerms;
  ord.enactingClause = sanitized.enactingClause;
  ord.provisions = sanitized.provisions;
  ord.penaltyClause = sanitized.penaltyClause;
  ord.plainLanguageSummary = sanitized.plainLanguageSummary;
  ord.plainLanguageSummary_tl = sanitized.plainLanguageSummary_tl;
  ord.sections = sanitized.sections;

  if (requestedDraft === true) {
    ord.isDraft = true;
  } else if (requestedDraft === false && ord.status === 'Draft') {
    ord.status = 'First Reading';
    ord.isDraft = false;
    ord.filedBy = req.user._id;
    ord.filedAt = new Date();
    ord.timeline.push({
      status: 'First Reading',
      notes: `${ord.type} filed and introduced.`,
      updatedBy: req.user._id,
    });
  }

  await ord.save();
  const populated = await Ordinance.findById(ord._id).populate('proponentId', 'firstName middleName lastName position photoUrl');
  res.json(populated);
});

const saveCommitteeReport = asyncHandler(async (req, res) => {
  const { findings, recommendation, viceSecretaryName } = req.body;
  const ord = await Ordinance.findById(req.params.id);
  if (!ord) {
    res.status(404);
    throw new Error('Ordinance not found');
  }
  if (isTerminallyRejected(ord)) {
    res.status(400);
    throw new Error('A rejected ordinance is terminal and cannot receive a committee report.');
  }
  if (ord.type !== 'Ordinance' || ord.status !== 'Committee Hearing' || !ord.committee?.trim()) {
    res.status(400);
    throw new Error('A committee report can be saved only for an assigned Ordinance at Committee Hearing.');
  }

  const sanitized = sanitizeOrdinanceFields({
    committeeReport: {
      findings: findings || '',
      recommendation: recommendation || '',
      viceSecretaryName: viceSecretaryName || '',
    },
  });

  ord.committeeReport = {
    findings: sanitized.committeeReport.findings,
    recommendation: sanitized.committeeReport.recommendation,
    viceSecretaryName: sanitized.committeeReport.viceSecretaryName,
    createdAt: new Date(),
    createdBy: req.user._id
  };
  await ord.save();

  const populated = await Ordinance.findById(ord._id)
    .populate('proponentId', 'firstName middleName lastName position photoUrl')
    .populate('committeeReport.createdBy', 'name role')
    .populate('timeline.updatedBy', 'name role');
  res.json(populated);
});


const assignCommittee = asyncHandler(async (req, res) => {
  const { committee, notes } = req.body;
  const ord = await Ordinance.findById(req.params.id);
  if (!ord) {
    res.status(404);
    throw new Error('Ordinance not found');
  }
  if (ord.isLocked || isTerminallyRejected(ord)) {
    res.status(400);
    throw new Error('Cannot assign committee on a locked or rejected document');
  }
  if (ord.status !== 'Committee Assignment') {
    res.status(400);
    throw new Error('Committee assignment is only permitted during the Committee Assignment stage');
  }

  let assignmentTermId = ord.termId;
  if (!assignmentTermId) {
    const currentTerm = await Term.findOne(getCurrentTermRange()).select('_id');
    if (!currentTerm) {
      res.status(400);
      throw new Error('No legislative term is active for today. Create the term covering the current date before assigning a committee.');
    }
    assignmentTermId = currentTerm._id;
  }
  const committeeFilter = { name: committee };
  committeeFilter.termId = assignmentTermId;
  const committeeRecord = await Committee.findOne(committeeFilter);
  if (!committeeRecord) {
    res.status(400);
    throw new Error('Select a committee configured for this legislative term.');
  }

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    ord.committee = committee;
    ord.committeeAssignment = {
      committee,
      assignedBy: req.user._id,
      assignedAt: new Date(),
      notes: sanitizePlainText(notes || ''),
    };
    ord.timeline.push({
      status: 'Committee Assignment',
      notes: sanitizePlainText(notes || `Assigned to lead committee: ${committee}`),
      updatedBy: req.user._id,
    });
    await ord.save({ session: dbSession });

    const memberFilter = { isActive: true, committees: committee };
    if (assignmentTermId) memberFilter.termId = assignmentTermId;
    const committeeMembers = await SBMember.find(memberFilter).select('contactEmail').session(dbSession);
    const memberEmails = committeeMembers.map(member => member.contactEmail?.trim().toLowerCase()).filter(Boolean);
    const recipients = memberEmails.length
      ? await User.find({ email: { $in: memberEmails }, role: { $in: ['SB Member', 'Vice Mayor'] }, status: 'Active' }).session(dbSession)
      : [];
    const notifications = recipients.map(member => ({
      recipientId: member._id,
      title: `${ord.type || 'Ordinance'} Committee Assignment`,
      message: `${ord.type || 'Ordinance'} ${ord.number}: "${ord.title}" was referred to the ${committee} committee.`,
      link: `/ordinances/${ord._id}`
    }));
    if (notifications.length) await Notification.insertMany(notifications, { session: dbSession });

    await dbSession.commitTransaction();
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }

  const populated = await Ordinance.findById(ord._id)
    .populate('proponentId', 'firstName middleName lastName position photoUrl')
    .populate('coAuthors', 'firstName middleName lastName position photoUrl')
    .populate('motionBy', 'firstName middleName lastName position photoUrl')
    .populate('secondedBy', 'firstName middleName lastName position photoUrl')
    .populate('committeeAssignment.assignedBy', 'name role')
    .populate('timeline.updatedBy', 'name role');

  res.json(populated);
});

const downloadOrdinancePdf = asyncHandler(async (req, res) => {
  const ord = await Ordinance.findById(req.params.id).populate('proponentId', 'firstName middleName lastName position photoUrl');
  if (!ord) {
    res.status(404);
    throw new Error('Ordinance not found');
  }

  const pdfBuffer = ord.type === 'Resolution' ? await generateResolutionPdf(ord) : await generateOrdinancePdf(ord);

  setPdfResponseHeaders(res, legislativeDocumentFilename(ord));
  res.send(pdfBuffer);
});

const backfillTranslations = asyncHandler(async (req, res) => {
  const ordinances = await Ordinance.find({
    $or: [{ title_tl: { $exists: false } }, { title_tl: '' }, { title_tl: null }]
  });

  let count = 0;
  for (let ord of ordinances) {
    const tl = await translateToTagalog(ord.title);
    if (tl) {
      ord.title_tl = tl;
      count++;
    }
    if (ord.plainLanguageSummary && (!ord.plainLanguageSummary_tl || ord.plainLanguageSummary_tl === '')) {
      const summaryTl = await translateToTagalog(ord.plainLanguageSummary);
      if (summaryTl) ord.plainLanguageSummary_tl = summaryTl;
    }
    await ord.save();
  }
  res.json({ message: `Backfilled ${count} documents.` });
});

module.exports = {
  getOrdinances,
  getOrdinanceStats,
  getOrdinanceById,
  getNextOrdinanceNumber,
  createOrdinance,
  updateOrdinanceStatus,
  rejectOrdinance,
  amendOrdinance,
  updateOrdinance,
  saveCommitteeReport,
  assignCommittee,
  downloadOrdinancePdf,
  backfillTranslations,
};
