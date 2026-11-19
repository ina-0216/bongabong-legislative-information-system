import { describe, expect, it } from 'vitest';
import { getCommitteeRolesForMember, normalizeCouncilName } from '../utils/committeeRoleMatcher.js';

const termId = 'term-current';

describe('committee role matching', () => {
  it('matches chair, vice-chair, and member roles for the same term', () => {
    const member = { name: 'Hon. Atty. Cindee V. Guno-Sibulan', termId };
    const committees = [
      { termId, name: 'Committee on Education', chairperson: member.name, members: [member.name] },
      { termId, name: 'Committee on Health', viceChairperson: member.name },
      { termId, name: 'Committee on Youth', members: [member.name] },
    ];

    expect(getCommitteeRolesForMember(member, committees)).toEqual([
      { committeeName: 'Committee on Education', role: 'Chair' },
      { committeeName: 'Committee on Health', role: 'Vice Chair' },
      { committeeName: 'Committee on Youth', role: 'Member' },
    ]);
  });

  it('normalizes honorifics, case, punctuation, and diacritics', () => {
    expect(normalizeCouncilName('Hon. NIÑA F. ATIENZA, DMD'))
      .toBe(normalizeCouncilName('Nina F. Atienza DMD'));

    expect(getCommitteeRolesForMember(
      { name: 'Hon. NIÑA F. ATIENZA, DMD', termId },
      [{ termId, name: 'Committee on Health', chairperson: 'Hon. Niña F. Atienza, DMD' }],
    )).toEqual([{ committeeName: 'Committee on Health', role: 'Chair' }]);
  });

  it('keeps one role per committee and prioritizes leadership over membership', () => {
    const member = { name: 'Hon. Example Member', termId };
    const committees = [{
      termId,
      name: 'Committee on Records',
      chairperson: member.name,
      viceChairperson: member.name,
      members: [member.name],
    }];

    expect(getCommitteeRolesForMember(member, committees)).toEqual([
      { committeeName: 'Committee on Records', role: 'Chair' },
    ]);
  });

  it('does not match another term, an unknown person, or a member with no term id', () => {
    const committee = { termId, name: 'Committee on Health', chairperson: 'Hon. Example Member' };
    expect(getCommitteeRolesForMember({ name: 'Hon. Example Member', termId: 'term-past' }, [committee])).toEqual([]);
    expect(getCommitteeRolesForMember({ name: 'Hon. Different Person', termId }, [committee])).toEqual([]);
    expect(getCommitteeRolesForMember({ name: 'Hon. Example Member' }, [committee])).toEqual([]);
  });

  it('returns an empty role list when the term has no committee records', () => {
    expect(getCommitteeRolesForMember({ name: 'Hon. Example Member', termId }, [])).toEqual([]);
  });
});
