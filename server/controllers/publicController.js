const asyncHandler = require('express-async-handler');
const { randomInt, randomBytes, createHash } = require('node:crypto');
const mongoose = require('mongoose');
const Ordinance = require('../models/Ordinance');
const Session = require('../models/Session');
const SBMember = require('../models/SBMember');
const Committee = require('../models/Committee');
const Term = require('../models/Term');
const { getCurrentTermRange } = require('../utils/termCalendar');
const ConsultationFeedback = require('../models/ConsultationFeedback');
const Announcement = require('../models/Announcement');
const { analyzeSentiment } = require('../utils/sentimentAnalyzer');
const { uploadToCloudinary, deleteFromCloudinary, generateSignedUrl } = require('../utils/cloudinary');
const { setWithExpiry, getValue, deleteKey } = require('../utils/redis');
const { getOtpDeliveryMode, sendPhilSmsOtp, sendSemaphoreOtp, sendTextBeeOtp } = require('../services/smsService');
const {
  normalizeEmail,
  sendCode: sendEmailVerificationCode,
  verifyCode: verifyEmailVerificationCode,
  consumeVerificationToken,
} = require('../services/publicEmailVerificationService');
const { generateOrdinancePdf, generateResolutionPdf, generateSessionPdf } = require('../services/pdfService');
const { getCommitteeRolesForMember } = require('../utils/committeeRoleMatcher');
const { getPublicStatsQueries } = require('../utils/publicStatsQueries');
const { setPdfResponseHeaders, sessionMinutesFilename, legislativeDocumentFilename } = require('../utils/pdfFilename');
const { getManilaYearRange } = require('../utils/manilaDateRange');
const { automaticApprovalFields, buildPublicVoteFilter } = require('../utils/publicFeedback');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// M-2 + L-5 fix: validate and cap pagination across all public listing endpoints
const safePagination = (p, l, defaultLimit = 12, maxLimit = 100) => {
  const page  = Math.max(Number.parseInt(p, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(l, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

const PUBLIC_DOCUMENT_LIST_FIELDS = 'number title title_tl type status committee sectorTag createdAt filedAt effectivityDate plainLanguageSummary plainLanguageSummary_tl proponentId coAuthors pdfUrl amendsOrdinanceId amendedByOrdinanceId';

const getPublicStats = asyncHandler(async (req, res) => {
  const queries = Object.entries(getPublicStatsQueries());
  const stats = await Promise.all(queries.map(async ([key, query]) => [
    key,
    await Ordinance.countDocuments(query),
  ]));
  res.json(Object.fromEntries(stats));
});

const getPublicDocuments = asyncHandler(async (req, res) => {
  const { search = '', type = '', status = '', year = '', page: rawPage = 1, limit: rawLimit = 12, termId = '', committee = '' } = req.query;
  const { page: pageNumber, limit: pageSize, skip } = safePagination(rawPage, rawLimit, 12, 100);
  const query = { isDraft: { $ne: true }, status: { $ne: 'Draft' } };
  if (termId) query.termId = termId;
  if (committee) query.committee = committee;
  const normalizedSearch = search.trim();
  if (normalizedSearch) {
    const safeSearch = escapeRegex(normalizedSearch);
    const safeSearchTokens = normalizedSearch
      .split(/\s+/)
      .map((token) => escapeRegex(token));
    const matchingSponsors = await SBMember.find({
      $and: safeSearchTokens.map((token) => ({
        $or: ['firstName', 'middleName', 'lastName'].map((field) => ({
          [field]: { $regex: token, $options: 'i' },
        })),
      })),
    }).select('_id').lean();
    const sponsorIds = matchingSponsors.map(({ _id }) => _id);

    query.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { title_tl: { $regex: safeSearch, $options: 'i' } },
      { number: { $regex: safeSearch, $options: 'i' } },
      { committee: { $regex: safeSearch, $options: 'i' } },
      { 'committeeAssignment.committee': { $regex: safeSearch, $options: 'i' } },
      { sectorTag: { $regex: safeSearch, $options: 'i' } },
      { plainLanguageSummary: { $regex: safeSearch, $options: 'i' } },
      { plainLanguageSummary_tl: { $regex: safeSearch, $options: 'i' } },
      { proponentId: { $in: sponsorIds } },
      { coAuthors: { $in: sponsorIds } },
    ];
  }
  if (type && type !== 'All') query.type = type;
  if (status && status !== 'All') query.status = status;
  if (year) {
    const range = getManilaYearRange(year);
    if (!range) {
      res.status(400);
      throw new Error('Year must be a valid four-digit calendar year.');
    }
    query.$and = [
      ...(query.$and || []),
      {
        $or: [
          { filedAt: { $gte: range.start, $lt: range.endExclusive } },
          { filedAt: { $in: [null] }, createdAt: { $gte: range.start, $lt: range.endExclusive } },
        ],
      },
    ];
  }

  const [docs, total] = await Promise.all([
    Ordinance.find(query)
      .select(PUBLIC_DOCUMENT_LIST_FIELDS)
      .populate('proponentId', 'firstName middleName lastName')
      .populate('coAuthors', 'firstName middleName lastName')
      .populate('amendsOrdinanceId', 'number title _id')
      .populate('amendedByOrdinanceId', 'number title _id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize),
    Ordinance.countDocuments(query)
  ]);

  res.json({ docs, total, page: pageNumber, pages: Math.ceil(total / pageSize) });
});

const getPublicDocumentById = asyncHandler(async (req, res) => {
  const ord = await Ordinance.findOne({
    _id: req.params.id,
    isDraft: { $ne: true },
    status: { $ne: 'Draft' },
  })
    .select('-isLocked')
    .populate('proponentId', 'firstName middleName lastName')
    .populate('coAuthors', 'firstName middleName lastName')
    .populate('timeline.updatedBy', 'name role')
    .populate('amendedByOrdinanceId', 'number title type _id')
    .populate('amendsOrdinanceId', 'number title type _id');
  if (!ord) {
    res.status(404);
    throw new Error('Document not found');
  }

  const [sessions, feedbackTally] = await Promise.all([
    Session.find({ itemsDiscussed: ord._id, status: 'Final' }).select('title date status').sort({ date: -1 }).limit(50),
    ConsultationFeedback.aggregate([
      { $match: buildPublicVoteFilter(ord._id) },
      { $group: { _id: '$vote', count: { $sum: 1 } } },
    ]),
  ]);

  const tally = { Agree: 0, Disagree: 0, Neutral: 0 };
  let totalVotes = 0;
  feedbackTally.forEach(({ _id, count }) => {
    if (Object.prototype.hasOwnProperty.call(tally, _id)) {
      tally[_id] = count;
      totalVotes += count;
    }
  });

  const docObj = ord.toObject();

  res.json({ ...docObj, sessions, tally, totalVotes });
});

const getPublicDocumentPdf = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error('Document not found');
  }

  const document = await Ordinance.findOne({
    _id: req.params.id,
    isDraft: { $ne: true },
    status: { $ne: 'Draft' },
  })
    .populate('proponentId', 'firstName middleName lastName position photoUrl')
    .populate('coAuthors', 'firstName middleName lastName position photoUrl')
    .populate('motionBy', 'firstName middleName lastName position photoUrl')
    .populate('secondedBy', 'firstName middleName lastName position photoUrl');

  if (!document) {
    res.status(404);
    throw new Error('Document not found');
  }

  const pdfBuffer = document.type === 'Resolution'
    ? await generateResolutionPdf(document)
    : await generateOrdinancePdf(document);
  setPdfResponseHeaders(
    res,
    legislativeDocumentFilename(document),
    req.query.download === 'true' ? 'attachment' : 'inline'
  );
  res.send(pdfBuffer);
});

const getPublicSessions = asyncHandler(async (req, res) => {
  const { page: rawPage = 1, limit: rawLimit = 10 } = req.query;
  const { page: pageNumber, limit: pageSize, skip } = safePagination(rawPage, rawLimit, 10, 100);
  const [sessions, total] = await Promise.all([
    Session.find({ status: 'Final' })
      .populate({ path: 'itemsDiscussed', select: 'number title type status isDraft', match: { status: { $ne: 'Draft' }, isDraft: { $ne: true } } })
      .sort({ date: -1 })
      .skip(skip)
      .limit(pageSize),
    Session.countDocuments({ status: 'Final' })
  ]);
  res.json({ docs: sessions, total, page: pageNumber, pages: Math.ceil(total / pageSize) });
});

const getPublicMembers = asyncHandler(async (req, res) => {
  const { termId } = req.query;
  let selectedTermId = termId;
  if (!selectedTermId) {
    const currentTerm = await Term.findOne(getCurrentTermRange()).select('_id');
    if (!currentTerm) return res.json([]);
    selectedTermId = currentTerm._id;
  }
  const query = { termId: selectedTermId, isActive: { $ne: false } };
  const members = await SBMember.find(query).sort({ order: 1, name: 1 }).limit(200);
  const memberTermIds = [...new Set(members.map((member) => String(member.termId || '')).filter(Boolean))];
  const committees = memberTermIds.length
    ? await Committee.find({ termId: { $in: memberTermIds } })
      .select('termId name chairperson viceChairperson members')
      .lean()
    : [];

  res.json(members.map((member) => ({
    ...member.toJSON(),
    committeeRoles: getCommitteeRolesForMember(member, committees),
  })));
});

const getLatestDocuments = asyncHandler(async (req, res) => {
  const docs = await Ordinance.find({
    isDraft: { $ne: true },
    status: { $ne: 'Draft' },
    $or: [{ type: 'Ordinance', status: { $ne: 'Approved' } }, { type: 'Resolution' }],
  })
    .select('number title title_tl type status committee createdAt')
    .sort({ createdAt: -1 })
    .limit(5);
  res.json(docs);
});

const getRecentSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ status: 'Final' })
    .select('title date status itemsDiscussed')
    .sort({ date: -1 })
    .limit(3);
  res.json(sessions);
});

const getPublicMinutes = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.sessionId)
    .populate('createdBy', 'name')
    .populate('itemsDiscussed', 'number title type status isDraft')
    .populate('attendance.present', 'firstName middleName lastName position photoUrl')
    .populate('attendance.onOfficialBusiness', 'firstName middleName lastName position photoUrl')
    .populate('attendance.absent', 'firstName middleName lastName position photoUrl');

  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }
  if (session.status !== 'Final') {
    res.status(403);
    throw new Error('Minutes are not finalized yet');
  }

  session.itemsDiscussed = session.itemsDiscussed.filter(item => item && item.status !== 'Draft' && item.isDraft !== true);

  const pdfBuffer = await generateSessionPdf(session);
  const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
  setPdfResponseHeaders(res, sessionMinutesFilename(session), disposition);
  res.send(pdfBuffer);
});

const sendOtp = asyncHandler(async (req, res) => {
  const { contactNumber } = req.body;
  let deliveryMode;
  try {
    deliveryMode = getOtpDeliveryMode();
  } catch (error) {
    res.status(503);
    throw new Error(error.code === 'OTP_TEST_MODE_FORBIDDEN'
      ? 'Test OTP mode is disabled outside development and test environments.'
      : 'OTP delivery mode is not configured. Please contact the administrator.');
  }

  const otp = randomInt(100000, 1000000).toString();

  if (deliveryMode === 'test') {
    await setWithExpiry(`otp:${contactNumber}`, { otp }, 300);
    return res.json({
      message: 'Test OTP generated. No SMS was sent.',
      expiresInSeconds: 300,
      deliveryMode: 'test',
      testOtp: otp,
    });
  }

  try {
    const sendProviderOtp = {
      philsms: sendPhilSmsOtp,
      semaphore: sendSemaphoreOtp,
      textbee: sendTextBeeOtp,
    }[deliveryMode];
    await sendProviderOtp({ number: contactNumber, code: otp });
  } catch (error) {
    // L-4 fix: OTP was not yet stored, so no Redis cleanup needed
    console.error('[OTP] SMS delivery failed:', error.message);
    res.status(error.code === 'SMS_NOT_CONFIGURED' ? 503 : 502);
    throw new Error(error.code === 'SMS_NOT_CONFIGURED'
      ? 'SMS verification is not configured. Please contact the administrator.'
      : 'Unable to send the verification code. Please try again later.');
  }
  // L-4 fix: store OTP only after confirmed delivery — prevents stale entries on SMS failure
  await setWithExpiry(`otp:${contactNumber}`, { otp }, 300); // 5 minutes TTL
  res.json({ message: 'Verification message queued.', expiresInSeconds: 300, deliveryMode: 'sms' });
});

const sendPublicEmailVerification = asyncHandler(async (req, res) => {
  const result = await sendEmailVerificationCode(req.body.email);
  res.json({ message: 'Verification code sent. Check your email.', ...result });
});

const verifyPublicEmailCode = asyncHandler(async (req, res) => {
  const result = await verifyEmailVerificationCode(req.body.email, req.body.code);
  res.json({ message: 'Email verified.', ...result });
});

const submitGuestConsultation = asyncHandler(async (req, res) => {
  const ord = await Ordinance.findOne({
    _id: req.params.id,
    isDraft: { $ne: true },
    status: { $ne: 'Draft' },
  });
  if (!ord) {
    res.status(404);
    throw new Error('Document not found');
  }
  if (ord.type !== 'Ordinance') {
    res.status(400);
    throw new Error('Public consultation is only available for Ordinances.');
  }
  if (!req.file) {
    res.status(400);
    throw new Error('A valid ID image is required.');
  }

  const isConsultationPhase = ord.status === 'Public Consultation';
  let {
    full_name, barangay, contact_number, otp, email: rawEmail,
    emailVerificationToken, vote, comment, data_privacy_consent,
  } = req.body;
  let email;

  // Validate data privacy consent
  if (!data_privacy_consent) {
    res.status(400);
    throw new Error('You must agree to the Data Privacy terms to submit feedback.');
  }

  if (isConsultationPhase) {
    if (!vote || !['Agree', 'Neutral', 'Disagree'].includes(vote)) {
      res.status(400);
      throw new Error('A valid vote is required during the Public Consultation phase.');
    }
  } else {
    vote = 'None';
    if (!comment || comment.trim().length < 5) {
      res.status(400);
      throw new Error('A comment of at least 5 characters is required outside Public Consultation.');
    }
  }

  // Compare and consume in one Redis operation so a wrong code cannot burn a
  // valid OTP. Verify before duplicate lookup so that lookup cannot disclose
  // whether a particular person already submitted feedback. Two concurrent
  // submissions also cannot both reuse the same code.
  const { consumeValueIfEqual } = require('../utils/redis');
  let emailVerified = false;
  if (emailVerificationToken) {
    email = normalizeEmail(rawEmail);
    emailVerified = await consumeVerificationToken(email, emailVerificationToken);
    if (!emailVerified) {
      res.status(400);
      throw new Error('Email verification is invalid or expired. Verify your email again.');
    }
  }
  if (otp && !(await consumeValueIfEqual(`otp:${contact_number}`, 'otp', otp))) {
    res.status(400);
    throw new Error('Invalid or expired OTP.');
  }
  if (!emailVerified && !otp) {
    res.status(400);
    throw new Error('Verify your email or provide the SMS OTP before submitting.');
  }

  const existingFeedback = await ConsultationFeedback.findOne({ ordinanceId: req.params.id, full_name, contact_number });
  if (existingFeedback) {
    res.status(409);
    throw new Error('You have already submitted feedback for this ordinance.');
  }

  const sentiment = analyzeSentiment(comment);
  const { scanIdImage } = require('../services/consultationIdScanService');
  const idScan = await scanIdImage(req.file.buffer, full_name);

  // Upload ID image to Cloudinary (private, authenticated access only)
  const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
    folder: 'ibosys/consultation-ids',
    public_id: `guestid_${Date.now()}_${req.params.id}`,
    resource_type: 'image',
    type: 'authenticated',
  });

  const User = require('../models/User');
  const reviewers = await User.find({ role: { $in: ['Secretary', 'System Admin'] }, status: 'Active' }).select('_id').lean();
  const assignedReviewer = reviewers.length ? reviewers[randomInt(reviewers.length)]._id : null;
  const appealToken = randomBytes(32).toString('base64url');
  const approval = automaticApprovalFields(Boolean(comment?.trim()));
  const feedback = await ConsultationFeedback.create({
    ordinanceId: req.params.id,
    full_name, barangay, contact_number,
    email: emailVerified ? email : undefined,
    id_attachment_url: cloudinaryResult.secure_url,
    id_attachment_public_id: cloudinaryResult.public_id,
    id_attachment_format: cloudinaryResult.format || 'jpg',
    id_attachment_type: 'authenticated',
    vote, comment, sentiment,
    data_privacy_consent,
    ...approval,
    assigned_reviewer: assignedReviewer,
    review_due_at: new Date(Date.now() + (24 * 60 * 60 * 1000)),
    id_scan: idScan,
    appeal_token_hash: createHash('sha256').update(appealToken).digest('hex'),
    appeal_expires_at: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)),
  });

  // SEC-NOTE: Notify Secretary of pending guest submission
  try {
    const NotificationModel = require('../models/Notification');
    const UserModel = require('../models/User');
    const administrators = await UserModel.find({
      role: { $in: ['System Admin', 'Secretary'] },
      status: 'Active',
    }).select('_id');
    if (administrators.length > 0) {
      await NotificationModel.insertMany(
        administrators.map(({ _id }) => ({
          recipientId: _id,
          title: 'New Published Consultation Submission',
          message: `A new public submission for Ordinance ${ord.number} is published and available for staff moderation.`,
          link: `/consultation-verification`,
        }))
      );
    }
  } catch (notifyErr) {
    // Non-blocking: feedback is saved even if notification fails
    console.error('[Public] Notification creation failed:', notifyErr.message);
  }

  res.json({
    message: comment?.trim()
      ? 'Your vote and comment are now published. Your identity details remain private.'
      : 'Your vote is now included in the public totals. Your identity details remain private.',
    feedbackId: feedback._id,
    appealToken,
    eligibilityStatus: feedback.eligibility_status,
    commentStatus: feedback.comment_status,
    approvalSource: feedback.approval_source,
  });
});

const findAppealRecord = async ({ ordinanceId, feedbackId, token }) => {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return ConsultationFeedback.findOne({
    _id: feedbackId,
    ordinanceId,
    appeal_token_hash: tokenHash,
    appeal_expires_at: { $gt: new Date() },
  }).select('status comment eligibility_status comment_status eligibility_review_history comment_review_history public_appeals appeal_expires_at __v');
};

const buildAppealFilter = ({ feedback, ordinanceId, tokenHash, stateKey, historyKey, target, now = new Date() }) => {
  const filter = {
    _id: feedback._id,
    ordinanceId,
    appeal_token_hash: tokenHash,
    appeal_expires_at: { $gt: now },
    __v: feedback.__v === undefined ? { $exists: false } : feedback.__v,
    public_appeals: { $not: { $elemMatch: { target } } },
    [historyKey]: { $not: { $elemMatch: { action: { $in: ['AppealApprove', 'AppealReject'] } } } },
  };

  if (feedback[stateKey] === undefined) {
    filter[stateKey] = { $exists: false };
    filter.status = 'Rejected';
  } else {
    filter[stateKey] = 'Rejected';
  }
  return filter;
};

const getPublicConsultationStatus = asyncHandler(async (req, res) => {
  const feedback = await findAppealRecord({ ordinanceId: req.params.id, feedbackId: req.body.feedbackId, token: req.body.token });
  if (!feedback) {
    res.status(404);
    throw new Error('Submission status was not found or the appeal link has expired.');
  }
  res.json({
    eligibilityStatus: feedback.eligibility_status || feedback.status || 'Pending',
    commentStatus: feedback.comment_status || (feedback.status === 'Approved' ? 'Approved' : feedback.comment ? 'Pending' : 'NotProvided'),
    eligibilityDecision: [...(feedback.eligibility_review_history || [])].reverse().find((item) => item.action === 'ConfirmRejection' || item.action === 'AppealReject')?.reason || '',
    commentDecision: [...(feedback.comment_review_history || [])].reverse().find((item) => item.action === 'ConfirmRejection' || item.action === 'AppealReject')?.reason || '',
    appealAvailableUntil: feedback.appeal_expires_at,
  });
});

const submitPublicConsultationAppeal = asyncHandler(async (req, res) => {
  const { feedbackId, token, target, reason } = req.body;
  let feedback = await findAppealRecord({ ordinanceId: req.params.id, feedbackId, token });
  if (!feedback) {
    res.status(404);
    throw new Error('Submission status was not found or the appeal link has expired.');
  }

  const stateKey = target === 'eligibility' ? 'eligibility_status' : 'comment_status';
  const reviewHistory = target === 'eligibility' ? feedback.eligibility_review_history : feedback.comment_review_history;
  if ((feedback[stateKey] || (target === 'eligibility' ? feedback.status : feedback.status)) !== 'Rejected') {
    res.status(409);
    throw new Error('Only a rejected decision can be appealed.');
  }
  const alreadyAppealed = (feedback.public_appeals || []).some((appeal) => appeal.target === target);
  if (alreadyAppealed || (reviewHistory || []).some((item) => ['AppealApprove', 'AppealReject'].includes(item.action))) {
    res.status(409);
    throw new Error('An appeal has already been submitted for this decision.');
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const updatedFeedback = await ConsultationFeedback.findOneAndUpdate(
    buildAppealFilter({
      feedback,
      ordinanceId: req.params.id,
      tokenHash,
      stateKey,
      historyKey: target === 'eligibility' ? 'eligibility_review_history' : 'comment_review_history',
      target,
    }),
    {
      $set: { [stateKey]: 'AppealPending' },
      $push: { public_appeals: { target, reason: reason.trim() } },
      $inc: { __v: 1 },
    },
    { new: true, runValidators: true }
  );
  if (!updatedFeedback) {
    res.status(409);
    throw new Error('The decision changed or an appeal has already been submitted. Refresh the status and try again.');
  }
  feedback = updatedFeedback;

  try {
    const User = require('../models/User');
    const Notification = require('../models/Notification');
    const involvedReviewerIds = [...new Set((reviewHistory || []).map((entry) => String(entry.reviewerId)))];
    const uninvolvedReviewers = await User.find({
      role: { $in: ['Secretary', 'System Admin'] }, status: 'Active',
      _id: { $nin: involvedReviewerIds },
    }).select('_id').lean();
    const allEligibleReviewers = uninvolvedReviewers.length ? uninvolvedReviewers : await User.find({
      role: { $in: ['Secretary', 'System Admin'] }, status: 'Active',
    }).select('_id').lean();
    const noIndependentReviewer = uninvolvedReviewers.length === 0;
    if (allEligibleReviewers.length) {
      await Notification.insertMany(allEligibleReviewers.map(({ _id }) => ({
        recipientId: _id,
        title: noIndependentReviewer ? 'Independent Appeal Reviewer Needed' : 'Public Consultation Appeal',
        message: noIndependentReviewer
          ? 'A citizen submitted an appeal, but no active Secretary or System Admin is currently uninvolved in the prior decision. Arrange an additional eligible reviewer account before deciding.'
          : `A citizen submitted an appeal for ${target}. Please review it independently.`,
        link: '/consultation-verification',
      })));
    }
  } catch (notifyErr) {
    console.error('[Public] Appeal reviewer notification failed:', notifyErr.message);
  }
  res.json({ message: 'Your appeal has been received for independent review.', status: 'AppealPending' });
});

const getPublicCommittees = asyncHandler(async (req, res) => {
  const { termId } = req.query;
  const filter = {};
  if (termId) filter.termId = termId;
  const committees = await Committee.find(filter).sort({ name: 1 }).limit(200);
  res.json(committees);
});

const getPublicTerms = asyncHandler(async (req, res) => {
  const terms = await Term.find().sort({ startYear: -1 }).limit(100);
  res.json(terms);
});

// --- Public News/Announcements ---
const getPublicAnnouncements = asyncHandler(async (req, res) => {
  const { category, limit: rawLimit = 10, page: rawPage = 1 } = req.query;
  const filter = { isPublished: true };
  if (category && category !== 'All') filter.category = category;

  // M-2 fix: validate and cap pagination
  const { page: pageNumber, limit: pageSize, skip } = safePagination(rawPage, rawLimit, 10, 100);
  const [announcements, total] = await Promise.all([
    Announcement.find(filter)
      .select('title slug excerpt category coverImage author publishedAt isFeatured tags createdAt')
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Announcement.countDocuments(filter),
  ]);
  res.json({ data: announcements, total, page: pageNumber, pages: Math.ceil(total / pageSize) });
});

const getPublicAnnouncementById = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findOne({
    _id: req.params.id,
    isPublished: true,
  }).lean();
  if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
  res.json({ data: announcement });
});

const getFeaturedAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find({ isPublished: true, isFeatured: true })
    .select('title slug excerpt category coverImage author publishedAt')
    .sort({ publishedAt: -1 })
    .limit(5)
    .lean();
  res.json({ data: announcements });
});

module.exports = {
  getPublicStats,
  getPublicDocuments,
  getPublicDocumentById,
  getPublicDocumentPdf,
  getPublicSessions,
  getPublicMembers,
  getLatestDocuments,
  getRecentSessions,
  getPublicMinutes,
  sendOtp,
  sendPublicEmailVerification,
  verifyPublicEmailCode,
  submitGuestConsultation,
  getPublicConsultationStatus,
  submitPublicConsultationAppeal,
  buildAppealFilter,
  PUBLIC_DOCUMENT_LIST_FIELDS,
  getPublicCommittees,
  getPublicTerms,
  getPublicAnnouncements,
  getPublicAnnouncementById,
  getFeaturedAnnouncements,
};
