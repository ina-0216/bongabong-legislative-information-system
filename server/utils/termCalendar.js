const TERM_LENGTH_YEARS = 3;
const TERM_TIME_ZONE = 'Asia/Manila';
const TERM_CYCLE_ANCHOR_YEAR = 2010;

function getPhilippineDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TERM_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);

  return Object.fromEntries(parts
    .filter(({ type }) => ['year', 'month', 'day', 'hour'].includes(type))
    .map(({ type, value }) => [type, Number(value)]));
}

function getCurrentTermRange(date = new Date()) {
  const { year, month, day, hour } = getPhilippineDateParts(date);
  const termChangeoverHasPassed = month > 6 || (month === 6 && (day > 30 || (day === 30 && hour >= 12)));
  const cycleYear = termChangeoverHasPassed ? year : year - 1;
  const completedTerms = Math.floor((cycleYear - TERM_CYCLE_ANCHOR_YEAR) / TERM_LENGTH_YEARS);
  const startYear = TERM_CYCLE_ANCHOR_YEAR + completedTerms * TERM_LENGTH_YEARS;

  return {
    startYear,
    endYear: startYear + TERM_LENGTH_YEARS,
  };
}

function isTermCurrent(startYear, endYear, date = new Date()) {
  const currentRange = getCurrentTermRange(date);
  return Number(startYear) === currentRange.startYear && Number(endYear) === currentRange.endYear;
}

function isTermUpcoming(startYear, date = new Date()) {
  return Number(startYear) > getCurrentTermRange(date).startYear;
}

module.exports = {
  TERM_LENGTH_YEARS,
  TERM_TIME_ZONE,
  TERM_CYCLE_ANCHOR_YEAR,
  getPhilippineDateParts,
  getCurrentTermRange,
  isTermCurrent,
  isTermUpcoming,
};
