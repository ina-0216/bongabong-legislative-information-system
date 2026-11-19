const memberName = (member) => {
  if (!member || typeof member === 'string') return '';
  return [member.firstName, member.middleName, member.lastName]
    .filter((part) => typeof part === 'string' && part.trim())
    .join(' ')
    .trim();
};

export const getDocumentSponsorNames = (document) => {
  const members = [document?.proponentId, ...(Array.isArray(document?.coAuthors) ? document.coAuthors : [])];
  const names = members.map(memberName).filter(Boolean);
  if (names.length) return [...new Set(names)];

  const legacyName = typeof document?.author === 'string'
    ? document.author
    : typeof document?.sponsor === 'string' ? document.sponsor : '';
  return legacyName.trim() ? [legacyName.trim()] : [];
};
