const MANILA_TIME_ZONE = 'Asia/Manila';
const MANILA_UTC_OFFSET = '+08:00';

const getManilaYearRange = (year) => {
  const parsedYear = Number(year);
  if (!Number.isInteger(parsedYear) || parsedYear < 1000 || parsedYear > 9998) return null;

  return {
    start: new Date(`${String(parsedYear).padStart(4, '0')}-01-01T00:00:00${MANILA_UTC_OFFSET}`),
    endExclusive: new Date(`${String(parsedYear + 1).padStart(4, '0')}-01-01T00:00:00${MANILA_UTC_OFFSET}`),
  };
};

const getManilaDayRange = (date) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const start = new Date(`${date}T00:00:00${MANILA_UTC_OFFSET}`);
  if (!Number.isFinite(start.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(start);
  const normalized = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  if (`${normalized.year}-${normalized.month}-${normalized.day}` !== date) return null;

  return {
    start,
    endExclusive: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  };
};

module.exports = { MANILA_TIME_ZONE, getManilaYearRange, getManilaDayRange };
