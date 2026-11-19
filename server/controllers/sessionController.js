const asyncHandler = require('express-async-handler');
const Session = require('../models/Session');
const Ordinance = require('../models/Ordinance');
const SBMember = require('../models/SBMember');
const Term = require('../models/Term');
const mongoose = require('mongoose');
const { generateSessionPdf } = require('../services/pdfService');
const { setPdfResponseHeaders, sessionMinutesFilename } = require('../utils/pdfFilename');
const { sanitizePlainText, sanitizeSessionFields } = require('../utils/sanitize');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseSearchDate = (value) => {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const parts = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : us ? [Number(us[3]), Number(us[1]), Number(us[2])] : null;
  if (!parts) return null;
  const [year, month, day] = parts;
  const start = new Date(Date.UTC(year, month - 1, day));
  if (start.getUTCFullYear() !== year || start.getUTCMonth() !== month - 1 || start.getUTCDate() !== day) return null;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { $gte: start, $lt: end };
};

const validateDiscussedItems = async (items, res) => {
  if (items === undefined) return undefined;
  const ids = [...new Set(items)];
  const found = await Ordinance.countDocuments({ _id: { $in: ids } });
  if (found !== ids.length) {
    res.status(400);
    throw new Error('One or more linked Ordinance/Resolution records do not exist.');
  }
  return ids;
};

const validateAttendance = async (value, res) => {
  if (value === undefined || value === null || value === '') return { present: [], onOfficialBusiness: [], absent: [] };
  let attendance = value;
  if (typeof attendance === 'string') {
    try { attendance = JSON.parse(attendance); } catch {
      res.status(400);
      throw new Error('Attendance must be valid JSON.');
    }
  }
  const memberIds = [...new Set([
    ...(attendance.present || []),
    ...(attendance.onOfficialBusiness || []),
    ...(attendance.absent || []),
  ].map(String))];
  if (memberIds.length && await SBMember.countDocuments({ _id: { $in: memberIds } }) !== memberIds.length) {
    res.status(400);
    throw new Error('Attendance contains an unknown Sangguniang Bayan member.');
  }
  return attendance;
};

const getSessions = asyncHandler(async (req, res) => {
  const { page = '1', limit = '20', search = '', termId = '', status = '', sessionType = '' } = req.query;
  if (!/^\d+$/.test(String(page)) || Number(page) < 1) {
    res.status(400);
    throw new Error('Page must be a positive whole number.');
  }
  if (!/^\d+$/.test(String(limit)) || Number(limit) < 1 || Number(limit) > 100) {
    res.status(400);
    throw new Error('Limit must be a whole number from 1 to 100.');
  }
  if (typeof search !== 'string' || search.length > 100) {
    res.status(400);
    throw new Error('Search must be a string of 100 characters or fewer.');
  }
  if (typeof termId !== 'string' || (termId && !mongoose.Types.ObjectId.isValid(termId))) {
    res.status(400);
    throw new Error('Term must be a valid identifier.');
  }
  if (typeof status !== 'string' || (status && !['Draft', 'Final'].includes(status))) {
    res.status(400);
    throw new Error('Status must be Draft or Final.');
  }
  if (typeof sessionType !== 'string' || (sessionType && !['Regular Session', 'Special Session'].includes(sessionType))) {
    res.status(400);
    throw new Error('Session type must be Regular Session or Special Session.');
  }
  const safePage = Number(page);
  const safeLimit = Number(limit);
  const normalizedSearch = search.trim();
  const filter = {};
  if (normalizedSearch) {
    filter.$or = [{ title: { $regex: escapeRegex(normalizedSearch), $options: 'i' } }];
    const dateRange = parseSearchDate(normalizedSearch);
    if (dateRange) filter.$or.push({ date: dateRange });
  }
  if (termId) {
    const term = await Term.findById(termId).select('startYear endYear').lean();
    if (!term) {
      res.status(400);
      throw new Error('The selected term does not exist.');
    }
    filter.date = {
      $gte: new Date(Date.UTC(term.startYear, 0, 1)),
      $lt: new Date(Date.UTC(term.endYear + 1, 0, 1)),
    };
  }
  if (status) filter.status = status;
  if (sessionType) filter.sessionType = sessionType;
  const skip = (safePage - 1) * safeLimit;

  const [sessions, total] = await Promise.all([
    Session.find(filter)
      .populate('createdBy', 'firstName middleName lastName role')
      .populate('itemsDiscussed', 'number title type status isDraft')
      .sort({ date: -1 })
      .skip(skip)
      .limit(safeLimit),
    Session.countDocuments(filter)
  ]);

  res.json({ docs: sessions, total, page: safePage, pages: Math.max(1, Math.ceil(total / safeLimit)) });
});

const getSessionById = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id)
    .populate('createdBy', 'firstName middleName lastName role')
    .populate('itemsDiscussed', 'number title type status isDraft')
    .populate('attendance.present', 'firstName middleName lastName position photoUrl')
    .populate('attendance.onOfficialBusiness', 'firstName middleName lastName position photoUrl')
    .populate('attendance.absent', 'firstName middleName lastName position photoUrl');

  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }
  if (!session.privilegeHour && session.citizensHour) {
    session.privilegeHour = session.citizensHour;
  }
  res.json(session);
});

const createSession = asyncHandler(async (req, res) => {
  const {
    title, sessionNumber, sessionType, legislativeBody, venue, municipality,
    date, itemsDiscussed, attendance, callToOrder, invocation, rollCall,
    readingOfPreviousMinutes, orderOfBusiness, privilegeHour, citizensHour,
    questionHour, committeeReport, firstReading, unfinishedBusiness,
    referralForAction, referralForReference, referenceOfBusiness,
    otherMatters, thanksgivingPrayer, adjournment, status
  } = req.body;

  const items = await validateDiscussedItems(itemsDiscussed || [], res);

  const parsedAttendance = await validateAttendance(attendance, res);

  const effectivePrivilegeHour = privilegeHour !== undefined ? privilegeHour : (citizensHour || '');
  const effectiveCitizensHour = citizensHour !== undefined ? citizensHour : effectivePrivilegeHour;

  const sanitized = sanitizeSessionFields({
    sessionNumber, sessionType, legislativeBody, venue, municipality,
    callToOrder, invocation, rollCall, readingOfPreviousMinutes,
    orderOfBusiness, privilegeHour: effectivePrivilegeHour, citizensHour: effectiveCitizensHour,
    questionHour, committeeReport, firstReading, unfinishedBusiness,
    referralForAction, referralForReference, referenceOfBusiness,
    otherMatters, thanksgivingPrayer, adjournment,
  });

  const session = await Session.create({
    title: sanitizePlainText(title),
    sessionNumber: sanitized.sessionNumber,
    sessionType: sanitized.sessionType || 'Regular Session',
    legislativeBody: sanitized.legislativeBody || '12th Sangguniang Bayan',
    venue: sanitized.venue,
    municipality: sanitized.municipality || 'Bongabong, Oriental Mindoro',
    date,
    itemsDiscussed: items,
    createdBy: req.user._id,
    attendance: parsedAttendance,
    callToOrder: sanitized.callToOrder,
    invocation: sanitized.invocation,
    rollCall: sanitized.rollCall,
    readingOfPreviousMinutes: sanitized.readingOfPreviousMinutes,
    orderOfBusiness: sanitized.orderOfBusiness,
    privilegeHour: sanitized.privilegeHour,
    citizensHour: sanitized.citizensHour,
    questionHour: sanitized.questionHour,
    committeeReport: sanitized.committeeReport,
    firstReading: sanitized.firstReading,
    unfinishedBusiness: sanitized.unfinishedBusiness,
    referralForAction: sanitized.referralForAction,
    referralForReference: sanitized.referralForReference,
    referenceOfBusiness: sanitized.referenceOfBusiness,
    otherMatters: sanitized.otherMatters,
    thanksgivingPrayer: sanitized.thanksgivingPrayer,
    adjournment: sanitized.adjournment,
    status: status || 'Draft'
  });

  res.status(201).json(session);
});

const updateSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }

  const fields = [
    'title', 'sessionNumber', 'sessionType', 'legislativeBody', 'venue', 'municipality',
    'date', 'callToOrder', 'invocation', 'rollCall', 'readingOfPreviousMinutes',
    'orderOfBusiness', 'privilegeHour', 'citizensHour', 'questionHour',
    'committeeReport', 'firstReading', 'unfinishedBusiness', 'referralForAction',
    'referralForReference', 'referenceOfBusiness', 'otherMatters',
    'thanksgivingPrayer', 'adjournment', 'status'
  ];

  fields.forEach(f => {
    if (req.body[f] !== undefined) session[f] = req.body[f];
  });

  if (req.body.title !== undefined) session.title = sanitizePlainText(req.body.title);

  // Ensure two-way synchronization between privilegeHour and citizensHour
  if (req.body.privilegeHour !== undefined && req.body.citizensHour === undefined) {
    session.citizensHour = req.body.privilegeHour;
  } else if (req.body.citizensHour !== undefined && req.body.privilegeHour === undefined) {
    session.privilegeHour = req.body.citizensHour;
  }

  if (req.body.itemsDiscussed !== undefined) {
    session.itemsDiscussed = await validateDiscussedItems(req.body.itemsDiscussed, res);
  }
  if (req.body.attendance !== undefined) {
    session.attendance = await validateAttendance(req.body.attendance, res);
  }

  // Sanitize fields
  const sanitized = sanitizeSessionFields({
    sessionNumber: session.sessionNumber,
    sessionType: session.sessionType,
    legislativeBody: session.legislativeBody,
    venue: session.venue,
    municipality: session.municipality,
    callToOrder: session.callToOrder,
    invocation: session.invocation,
    rollCall: session.rollCall,
    readingOfPreviousMinutes: session.readingOfPreviousMinutes,
    orderOfBusiness: session.orderOfBusiness,
    privilegeHour: session.privilegeHour,
    citizensHour: session.citizensHour,
    questionHour: session.questionHour,
    committeeReport: session.committeeReport,
    firstReading: session.firstReading,
    unfinishedBusiness: session.unfinishedBusiness,
    referralForAction: session.referralForAction,
    referralForReference: session.referralForReference,
    referenceOfBusiness: session.referenceOfBusiness,
    otherMatters: session.otherMatters,
    thanksgivingPrayer: session.thanksgivingPrayer,
    adjournment: session.adjournment,
  });

  session.sessionNumber = sanitized.sessionNumber;
  session.sessionType = sanitized.sessionType;
  session.legislativeBody = sanitized.legislativeBody;
  session.venue = sanitized.venue;
  session.municipality = sanitized.municipality;
  session.callToOrder = sanitized.callToOrder;
  session.invocation = sanitized.invocation;
  session.rollCall = sanitized.rollCall;
  session.readingOfPreviousMinutes = sanitized.readingOfPreviousMinutes;
  session.orderOfBusiness = sanitized.orderOfBusiness;
  session.privilegeHour = sanitized.privilegeHour;
  session.citizensHour = sanitized.citizensHour;
  session.questionHour = sanitized.questionHour;
  session.committeeReport = sanitized.committeeReport;
  session.firstReading = sanitized.firstReading;
  session.unfinishedBusiness = sanitized.unfinishedBusiness;
  session.referralForAction = sanitized.referralForAction;
  session.referralForReference = sanitized.referralForReference;
  session.referenceOfBusiness = sanitized.referenceOfBusiness;
  session.otherMatters = sanitized.otherMatters;
  session.thanksgivingPrayer = sanitized.thanksgivingPrayer;
  session.adjournment = sanitized.adjournment;
  await session.save();
  res.json(session);
});

const deleteSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }

  // H-6 fix: block deletion if any ordinance timeline entry references this session.
  // Deleting would leave dangling ObjectId refs causing silent nulls in timeline views.
  const linkedOrdinances = await Ordinance.countDocuments({ 'timeline.session': session._id });
  if (linkedOrdinances > 0) {
    res.status(409);
    throw new Error(
      `Cannot delete this session: ${linkedOrdinances} ordinance timeline record(s) reference it. ` +
      'Remove those timeline references first or archive the session instead.'
    );
  }

  await session.deleteOne();
  res.json({ message: 'Session deleted successfully' });
});

const downloadSessionPdf = asyncHandler(async (req, res) => {
  const sessionId = req.params.id || req.params.sessionId;
  const session = await Session.findById(sessionId)
    .populate('createdBy', 'firstName middleName lastName role')
    .populate('itemsDiscussed', 'number title type status isDraft')
    .populate('attendance.present', 'firstName middleName lastName position photoUrl')
    .populate('attendance.onOfficialBusiness', 'firstName middleName lastName position photoUrl')
    .populate('attendance.absent', 'firstName middleName lastName position photoUrl');

  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }

  const pdfBuffer = await generateSessionPdf(session);

  setPdfResponseHeaders(res, sessionMinutesFilename(session));
  res.send(pdfBuffer);
});

module.exports = {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  downloadSessionPdf,
};
