import { afterEach, describe, expect, it, vi } from 'vitest';
const Session = require('../models/Session');
const Term = require('../models/Term');
const { getSessions } = require('../controllers/sessionController');

const makeResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const makeQuery = (docs) => ({
  populate: vi.fn().mockReturnThis(),
  sort: vi.fn().mockReturnThis(),
  skip: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue(docs),
});

afterEach(() => vi.restoreAllMocks());

describe('session server-side search', () => {
  it('applies escaped title search before pagination and counts only matches', async () => {
    const query = makeQuery([{ _id: 'session-1', title: 'Budget Review' }]);
    const find = vi.spyOn(Session, 'find').mockReturnValue(query);
    const count = vi.spyOn(Session, 'countDocuments').mockResolvedValue(1);
    const res = makeResponse();

    await getSessions({ query: { page: '2', limit: '10', search: 'Budget.*' } }, res, vi.fn());

    const filter = { $or: [{ title: { $regex: 'Budget\\.\\*', $options: 'i' } }] };
    expect(find).toHaveBeenCalledWith(filter);
    expect(count).toHaveBeenCalledWith(filter);
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(res.body).toMatchObject({ docs: [{ title: 'Budget Review' }], total: 1, page: 2, pages: 1 });
  });

  it('matches calendar dates using an inclusive start and exclusive next-day bound', async () => {
    const query = makeQuery([]);
    const find = vi.spyOn(Session, 'find').mockReturnValue(query);
    vi.spyOn(Session, 'countDocuments').mockResolvedValue(0);

    await getSessions({ query: { search: '2026-10-12' } }, makeResponse(), vi.fn());

    const dateRange = find.mock.calls[0][0].$or[1].date;
    expect(dateRange.$gte.toISOString()).toBe('2026-10-12T00:00:00.000Z');
    expect(dateRange.$lt.toISOString()).toBe('2026-10-13T00:00:00.000Z');
  });

  it('combines term-year, publication status, and session-type filters before pagination', async () => {
    const termId = '507f1f77bcf86cd799439011';
    const termQuery = { select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue({ startYear: 2025, endYear: 2028 }) };
    vi.spyOn(Term, 'findById').mockReturnValue(termQuery);
    const query = makeQuery([]);
    const find = vi.spyOn(Session, 'find').mockReturnValue(query);
    const count = vi.spyOn(Session, 'countDocuments').mockResolvedValue(0);

    await getSessions({ query: { termId, status: 'Final', sessionType: 'Regular Session' } }, makeResponse(), vi.fn());

    const filter = find.mock.calls[0][0];
    expect(filter.date.$gte.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect(filter.date.$lt.toISOString()).toBe('2029-01-01T00:00:00.000Z');
    expect(filter).toMatchObject({ status: 'Final', sessionType: 'Regular Session' });
    expect(count).toHaveBeenCalledWith(filter);
  });

  it('rejects invalid pagination and oversized search parameters', async () => {
    vi.spyOn(Session, 'find');
    for (const query of [{ page: '0' }, { limit: '101' }, { search: 'x'.repeat(101) }, { status: 'Published' }, { sessionType: 'Unknown' }]) {
      const res = makeResponse();
      let error;
      await getSessions({ query }, res, (caught) => { error = caught; });
      expect(res.statusCode).toBe(400);
      expect(error).toBeInstanceOf(Error);
    }
    expect(Session.find).not.toHaveBeenCalled();
  });
});
