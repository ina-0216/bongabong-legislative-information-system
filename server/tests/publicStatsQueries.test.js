import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getPublicStatsQueries } = require('../utils/publicStatsQueries.js');

describe('public statistics queries', () => {
  it('counts approved ordinances and resolutions separately', () => {
    const queries = getPublicStatsQueries(new Date('2026-10-09T12:00:00.000Z'));

    expect(queries.approvedOrdinances).toEqual({
      isDraft: { $ne: true },
      status: 'Approved',
      type: 'Ordinance',
    });
    expect(queries.approvedResolutions).toEqual({
      isDraft: { $ne: true },
      status: 'Approved',
      type: 'Resolution',
    });
  });

  it('counts this year by the approval timeline event and uses an exclusive next-year bound', () => {
    const queries = getPublicStatsQueries(new Date('2026-10-09T12:00:00.000Z'));

    expect(queries.approvedThisYear).toEqual({
      isDraft: { $ne: true },
      status: 'Approved',
      type: { $in: ['Ordinance', 'Resolution'] },
      timeline: {
        $elemMatch: {
          status: 'Approved',
          date: {
            $gte: new Date('2025-12-31T16:00:00.000Z'),
            $lt: new Date('2026-12-31T16:00:00.000Z'),
          },
        },
      },
    });
  });

  it('uses the Philippine calendar year even when the UTC date is still in the prior year', () => {
    const queries = getPublicStatsQueries(new Date('2025-12-31T16:30:00.000Z'));
    const approvalDate = queries.approvedThisYear.timeline.$elemMatch.date;

    expect(approvalDate.$gte).toEqual(new Date('2025-12-31T16:00:00.000Z'));
    expect(approvalDate.$lt).toEqual(new Date('2026-12-31T16:00:00.000Z'));
  });

  it('counts only published ordinances in consultation', () => {
    const queries = getPublicStatsQueries(new Date('2026-10-09T12:00:00.000Z'));

    expect(queries.inConsultation).toEqual({
      isDraft: { $ne: true },
      status: 'Public Consultation',
      type: 'Ordinance',
    });
  });
});
