const asyncHandler = require('express-async-handler');
const Committee = require('../models/Committee');
const Term = require('../models/Term');
const defaultCommittees = require('../config/defaultCommittees');
const { getCurrentTermRange } = require('../utils/termCalendar');

const getCommittees = asyncHandler(async (req, res) => {
  const { termId, page = 1, limit = 0 } = req.query;
  const filter = {};
  if (termId) filter.termId = termId;

  if (parseInt(limit) === 0) {
    // M-4 fix: cap fetch-all at 500 rows to prevent unguarded large result sets
    const committees = await Committee.find(filter).sort({ name: 1 }).limit(500);
    return res.json({ docs: committees, total: committees.length, page: 1, pages: 1 });
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [committees, total] = await Promise.all([
    Committee.find(filter).sort({ name: 1 }).skip(skip).limit(parseInt(limit)),
    Committee.countDocuments(filter)
  ]);

  res.json({ docs: committees, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

const updateCommittee = asyncHandler(async (req, res) => {
  const { chairperson, viceChairperson, members, description } = req.body;
  const committee = await Committee.findById(req.params.id);
  
  if (!committee) {
    res.status(404);
    throw new Error('Committee not found'); // This goes to the error handler
  }

  if (chairperson !== undefined) committee.chairperson = chairperson;
  if (viceChairperson !== undefined) committee.viceChairperson = viceChairperson;
  if (members !== undefined) committee.members = members;
  if (description !== undefined) committee.description = description;

  await committee.save();
  res.json(committee);
});

const ensureTermCommittees = asyncHandler(async (req, res) => {
  const { termId } = req.body;
  const term = await Term.findById(termId);
  if (!term) {
    res.status(404);
    throw new Error('Term not found');
  }

  const currentTerm = await Term.findOne(getCurrentTermRange());
  const templateTermId = currentTerm?._id || term._id;
  let templates = await Committee.find({ termId: templateTermId })
    .select('name description')
    .sort({ name: 1 })
    .lean();

  if (!templates.length) {
    templates = defaultCommittees.map(name => ({ name, description: '' }));
  }

  const existing = await Committee.find({ termId: term._id }).select('name').lean();
  const existingNames = new Set(existing.map(committee => committee.name));
  const missing = templates.filter(committee => !existingNames.has(committee.name));

  if (missing.length) {
    try {
      await Committee.insertMany(missing.map(committee => ({
        name: committee.name,
        description: committee.description || '',
        termId: term._id,
        chairperson: '',
        viceChairperson: '',
        members: [],
      })), { ordered: false });
    } catch (error) {
      // Concurrent page loads can race on the unique (name, termId) index.
      // Ignore only duplicate-key races; surface all other database errors.
      if (error.code !== 11000 && !error.writeErrors?.every(writeError => writeError.code === 11000)) {
        throw error;
      }
    }
  }

  const committees = await Committee.find({ termId: term._id }).sort({ name: 1 });
  res.json({
    docs: committees,
    total: committees.length,
    page: 1,
    pages: 1,
    initializedCount: missing.length,
  });
});

module.exports = {
  getCommittees,
  updateCommittee,
  ensureTermCommittees,
};
