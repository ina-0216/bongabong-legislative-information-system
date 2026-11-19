import { describe, expect, it } from 'vitest';
import { announcementPhotos, documentReference, legislativeStages, publicVoteSummary } from './publicContent';

describe('announcementPhotos', () => {
  it('keeps valid gallery images and derives useful alt text and stable keys', () => {
    expect(announcementPhotos({
      _id: 'news-1',
      title: 'Update',
      gallery: [
        { _id: 'photo-1', url: '/first.jpg', caption: 'Council meeting' },
        { publicId: 'photo-2', url: '/second.jpg', altText: 'Group photo' },
        { url: '  ' },
      ],
    })).toEqual([
      { key: 'photo-1', url: '/first.jpg', caption: 'Council meeting', altText: 'Council meeting' },
      { key: 'photo-2', url: '/second.jpg', caption: undefined, altText: 'Group photo' },
    ]);
  });
});

describe('documentReference', () => {
  it('supports populated references and raw IDs', () => {
    expect(documentReference({ _id: 'doc-1', number: '2026-001', title: 'Earlier ordinance' }))
      .toEqual({ id: 'doc-1', label: '2026-001' });
    expect(documentReference('doc-2')).toEqual({ id: 'doc-2', label: 'View related ordinance' });
    expect(documentReference(null)).toBeNull();
  });
});

describe('publicVoteSummary', () => {
  it('uses the public tally and derives total votes when needed', () => {
    expect(publicVoteSummary({ tally: { Agree: 3, Disagree: 1, Neutral: 2 } }))
      .toEqual({ tally: { Agree: 3, Disagree: 1, Neutral: 2 }, total: 6 });
  });

  it('uses the server total when available and fills missing vote buckets with zero', () => {
    expect(publicVoteSummary({ tally: { Agree: 4 }, totalVotes: 7 }))
      .toEqual({ tally: { Agree: 4, Disagree: 0, Neutral: 0 }, total: 7 });
  });
});

describe('legislativeStages', () => {
  it('tracks ordinance progress through public consultation', () => {
    expect(legislativeStages('Ordinance', 'Public Consultation').filter((stage) => stage.completed).map((stage) => stage.label))
      .toEqual(['First Reading', 'Committee Assignment', 'Committee Hearing']);
    expect(legislativeStages('Ordinance', 'Public Consultation').find((stage) => stage.current)?.label)
      .toBe('Public Consultation');
  });

  it('uses the shorter resolution process and completes all stages when approved', () => {
    const stages = legislativeStages('Resolution', 'Approved');
    expect(stages).toHaveLength(5);
    expect(stages.every((stage) => stage.completed)).toBe(true);
    expect(stages.some((stage) => stage.current)).toBe(false);
  });
});
