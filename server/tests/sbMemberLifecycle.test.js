import { afterEach, describe, expect, it, vi } from 'vitest';
const SBMember = require('../models/SBMember');
const Ordinance = require('../models/Ordinance');
const Session = require('../models/Session');
const Committee = require('../models/Committee');
const { getSbMembers, deleteSbMember } = require('../controllers/sbMemberController');
const { getPublicMembers } = require('../controllers/publicController');

const makeResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

afterEach(() => vi.restoreAllMocks());

describe('SB member lifecycle and pagination', () => {
  it('uses bounded pagination when no limit is supplied', async () => {
    const query = { sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([]) };
    const find = vi.spyOn(SBMember, 'find').mockReturnValue(query);
    vi.spyOn(SBMember, 'countDocuments').mockResolvedValue(0);

    await getSbMembers({ query: {} }, makeResponse(), vi.fn());

    expect(query.skip).toHaveBeenCalledWith(0);
    expect(query.limit).toHaveBeenCalledWith(20);
    expect(find.mock.calls[0][0].isActive).toEqual({ $ne: false });
  });

  it('rejects malformed and excessive limits instead of using the fetch-all path', async () => {
    const find = vi.spyOn(SBMember, 'find');
    for (const limit of ['20items', '101', '-1']) {
      const res = makeResponse();
      let error;
      await getSbMembers({ query: { limit } }, res, (caught) => { error = caught; });
      expect(res.statusCode).toBe(400);
      expect(error).toBeInstanceOf(Error);
    }
    expect(find).not.toHaveBeenCalled();
  });

  it('includes active and legacy records by default but supports inactive-only queries', async () => {
    const query = { sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([]) };
    const find = vi.spyOn(SBMember, 'find').mockReturnValue(query);
    vi.spyOn(SBMember, 'countDocuments').mockResolvedValue(0);

    await getSbMembers({ query: { page: '1', limit: '10' } }, makeResponse(), vi.fn());
    expect(find.mock.calls[0][0].isActive).toEqual({ $ne: false });

    await getSbMembers({ query: { page: '1', limit: '10', includeInactive: 'true' } }, makeResponse(), vi.fn());
    expect(find.mock.calls[1][0].isActive).toBe(false);
  });

  it('deactivates members with linked history instead of deleting them', async () => {
    const member = {
      _id: 'member-1', name: 'Taylor Example', isActive: true,
      save: vi.fn().mockResolvedValue(undefined), deleteOne: vi.fn(),
    };
    vi.spyOn(SBMember, 'findById').mockResolvedValue(member);
    vi.spyOn(Ordinance, 'countDocuments').mockResolvedValue(1);
    vi.spyOn(Session, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(Committee, 'countDocuments').mockResolvedValue(0);
    const res = makeResponse();

    await deleteSbMember({ params: { id: 'member-1' } }, res, vi.fn());

    expect(member.isActive).toBe(false);
    expect(member.save).toHaveBeenCalledOnce();
    expect(member.deleteOne).not.toHaveBeenCalled();
    expect(res.body.deactivated).toBe(true);
  });

  it('excludes deactivated members from the public roster', async () => {
    const query = { sort: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([]) };
    const find = vi.spyOn(SBMember, 'find').mockReturnValue(query);
    const res = makeResponse();

    await getPublicMembers({ query: { termId: 'term-1' } }, res, vi.fn());

    expect(find).toHaveBeenCalledWith({ termId: 'term-1', isActive: { $ne: false } });
    expect(res.body).toEqual([]);
  });
});
