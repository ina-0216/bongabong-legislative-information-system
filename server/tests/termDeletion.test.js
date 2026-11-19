import { afterEach, describe, expect, it, vi } from 'vitest';
const Term = require('../models/Term');
const Ordinance = require('../models/Ordinance');
const SBMember = require('../models/SBMember');
const Committee = require('../models/Committee');
const { deleteTerm } = require('../controllers/termController');

const makeResponse = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

afterEach(() => vi.restoreAllMocks());

describe('term deletion safeguards', () => {
  it('returns a conflict with linked-record counts and preserves the term', async () => {
    const term = { _id: 'term-1', deleteOne: vi.fn() };
    vi.spyOn(Term, 'findById').mockResolvedValue(term);
    vi.spyOn(Ordinance, 'countDocuments').mockResolvedValue(2);
    vi.spyOn(SBMember, 'countDocuments').mockResolvedValue(11);
    vi.spyOn(Committee, 'countDocuments').mockResolvedValue(10);
    const res = makeResponse();
    let error;

    await deleteTerm({ params: { id: 'term-1' } }, res, (caught) => { error = caught; });

    expect(res.statusCode).toBe(409);
    expect(error.message).toContain('2 ordinances/resolutions, 11 members, 10 committees');
    expect(term.deleteOne).not.toHaveBeenCalled();
  });
});
