const normalizeCouncilName = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\b(?:hon|atty)\.?/gi, '')
  .replace(/[^a-z0-9]/gi, '')
  .toLowerCase();

const getMemberName = (member) => member.name || [member.firstName, member.middleName, member.lastName].filter(Boolean).join(' ');

const getCommitteeRolesForMember = (member, committees) => {
  const memberName = normalizeCouncilName(getMemberName(member));
  if (!memberName || !member.termId) return [];

  const termId = String(member.termId);
  return committees.flatMap((committee) => {
    if (String(committee.termId) !== termId) return [];

    let role;
    if (normalizeCouncilName(committee.chairperson) === memberName) {
      role = 'Chair';
    } else if (normalizeCouncilName(committee.viceChairperson) === memberName) {
      role = 'Vice Chair';
    } else if ((committee.members || []).some((name) => normalizeCouncilName(name) === memberName)) {
      role = 'Member';
    }

    return role ? [{ committeeName: committee.name, role }] : [];
  }).sort((a, b) => a.committeeName.localeCompare(b.committeeName));
};

module.exports = { getCommitteeRolesForMember, normalizeCouncilName };
