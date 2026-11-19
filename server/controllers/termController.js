const asyncHandler = require('express-async-handler');
const Term = require('../models/Term');
const SBMember = require('../models/SBMember');
const Committee = require('../models/Committee');
const Ordinance = require('../models/Ordinance');
const { parseName } = require('../utils/nameParser');
const defaultCommittees = require('../config/defaultCommittees');
const { isTermCurrent } = require('../utils/termCalendar');

const TERM_LENGTH_YEARS = 3;

function hasValidTermLength(startYear, endYear) {
  return Number.isInteger(startYear)
    && Number.isInteger(endYear)
    && endYear - startYear === TERM_LENGTH_YEARS;
}

async function rejectOverlappingTerm(startYear, endYear, excludedId, res) {
  const query = {
    startYear: { $lt: endYear },
    endYear: { $gt: startYear },
  };
  if (excludedId) query._id = { $ne: excludedId };

  if (await Term.exists(query)) {
    res.status(409);
    throw new Error('This term overlaps an existing legislative term.');
  }
}

async function syncViceMayor(term) {
  if (!term.presidingOfficer || !term.presidingOfficer.trim()) return;
  const { firstName, middleName, lastName } = parseName(term.presidingOfficer);
  if (!firstName) return;

  const existing = await SBMember.findOne({ termId: term._id, position: 'Vice Mayor' });
  if (existing) {
    existing.firstName = firstName;
    existing.middleName = middleName || '';
    existing.lastName = lastName;
    existing.isActive = isTermCurrent(term.startYear, term.endYear);
    await existing.save();
  } else {
    await SBMember.create({
      firstName, middleName: middleName || '', lastName,
      position: 'Vice Mayor',
      termId: term._id,
      order: 1,
      isActive: isTermCurrent(term.startYear, term.endYear),
      committees: [],
      biography: '',
      contactEmail: '',
      fbLink: '',
      sbNumber: '',
    });
  }
}

const getTerms = asyncHandler(async (req, res) => {
  const terms = await Term.find().sort({ startYear: -1 });
  res.json(terms);
});

const getTerm = asyncHandler(async (req, res) => {
  const term = await Term.findById(req.params.id);
  if (!term) {
    res.status(404);
    throw new Error('Term not found');
  }
  res.json(term);
});

const createTerm = asyncHandler(async (req, res) => {
  const { startYear, endYear } = req.body;
  await rejectOverlappingTerm(startYear, endYear, null, res);

  const term = new Term(req.body);
  await term.save();
  await syncViceMayor(term);

  const previousTerm = await Term.findOne({ _id: { $ne: term._id } }).sort({ startYear: -1 });
  
  let committeeNamesToCreate = defaultCommittees;

  if (previousTerm) {
    const prevCommittees = await Committee.find({ termId: previousTerm._id });
    if (prevCommittees.length > 0) {
      committeeNamesToCreate = prevCommittees.map(c => c.name);
    }
  }

  const newCommittees = committeeNamesToCreate.map(name => ({
    name,
    termId: term._id,
    chairperson: '',
    members: []
  }));

  await Committee.insertMany(newCommittees);

  res.status(201).json(term);
});

const updateTerm = asyncHandler(async (req, res) => {
  const term = await Term.findById(req.params.id);
  if (!term) {
    res.status(404);
    throw new Error('Term not found');
  }

  // H-5 fix: prevent changing date boundaries when records are already linked
  const datesChanging =
    (req.body.startYear !== undefined && Number(req.body.startYear) !== term.startYear) ||
    (req.body.endYear   !== undefined && Number(req.body.endYear)   !== term.endYear);

  if (datesChanging) {
    const [ordCount, memCount] = await Promise.all([
      Ordinance.countDocuments({ termId: term._id }),
      SBMember.countDocuments({ termId: term._id }),
    ]);
    if (ordCount || memCount) {
      res.status(409);
      throw new Error(
        `Cannot change term dates: this term has ${ordCount} ordinance(s) and ${memCount} member(s) linked to it.`
      );
    }
  }

  Object.assign(term, req.body);
  if (!hasValidTermLength(term.startYear, term.endYear)) {
    res.status(400);
    throw new Error('Legislative terms must span exactly three years.');
  }
  await rejectOverlappingTerm(term.startYear, term.endYear, term._id, res);
  await term.save();
  await syncViceMayor(term);
  
  res.json(term);
});

const deleteTerm = asyncHandler(async (req, res) => {
  const term = await Term.findById(req.params.id);
  if (!term) {
    res.status(404);
    throw new Error('Term not found');
  }

  const [ordinances, members, committees] = await Promise.all([
    Ordinance.countDocuments({ termId: term._id }),
    SBMember.countDocuments({ termId: term._id }),
    Committee.countDocuments({ termId: term._id }),
  ]);
  if (ordinances || members || committees) {
    res.status(409);
    throw new Error(`Cannot delete this term while it has linked records (${ordinances} ordinances/resolutions, ${members} members, ${committees} committees).`);
  }

  await term.deleteOne();
  res.json({ message: 'Term deleted successfully' });
});

module.exports = {
  getTerms,
  getTerm,
  createTerm,
  updateTerm,
  deleteTerm,
};
