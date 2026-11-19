const getPublicStatsQueries = (now = new Date()) => {
  // The portal serves Bongabong, so calendar-year analytics follow Philippine
  // local time even when the API host itself runs in UTC.
  const year = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
  }).format(now));
  const yearStart = new Date(`${year}-01-01T00:00:00+08:00`);
  const nextYearStart = new Date(`${year + 1}-01-01T00:00:00+08:00`);
  const publicMeasureFilter = { isDraft: { $ne: true }, status: { $ne: 'Draft' } };

  return {
    totalOrdinances: { ...publicMeasureFilter, type: 'Ordinance' },
    totalResolutions: { ...publicMeasureFilter, type: 'Resolution' },
    approvedOrdinances: { ...publicMeasureFilter, type: 'Ordinance', status: 'Approved' },
    approvedResolutions: { ...publicMeasureFilter, type: 'Resolution', status: 'Approved' },
    inConsultation: {
      ...publicMeasureFilter,
      type: 'Ordinance',
      status: 'Public Consultation',
    },
    approvedThisYear: {
      ...publicMeasureFilter,
      type: { $in: ['Ordinance', 'Resolution'] },
      status: 'Approved',
      timeline: {
        $elemMatch: {
          status: 'Approved',
          date: { $gte: yearStart, $lt: nextYearStart },
        },
      },
    },
  };
};

module.exports = { getPublicStatsQueries };
