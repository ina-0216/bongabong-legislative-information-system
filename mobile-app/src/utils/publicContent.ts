import type { PublicAnnouncement, PublicDocument, PublicDocumentReference } from './api';

export interface AnnouncementPhoto {
  key: string;
  url: string;
  caption?: string;
  altText: string;
}

export function announcementPhotos(item: PublicAnnouncement): AnnouncementPhoto[] {
  return (item.gallery ?? [])
    .filter((photo) => Boolean(photo.url?.trim()))
    .map((photo, index) => ({
      key: photo._id || photo.publicId || `${item._id}-photo-${index}`,
      url: photo.url,
      caption: photo.caption,
      altText: photo.altText || photo.caption || `Announcement photo ${index + 1}`,
    }));
}

export function documentReference(reference?: PublicDocumentReference | string | null) {
  if (!reference) return null;
  if (typeof reference === 'string') return { id: reference, label: 'View related ordinance' };
  return {
    id: reference._id,
    label: reference.number || reference.title || 'View related ordinance',
  };
}

export function publicVoteSummary(document: Pick<PublicDocument, 'tally' | 'totalVotes'>) {
  const tally = {
    Agree: document.tally?.Agree ?? 0,
    Disagree: document.tally?.Disagree ?? 0,
    Neutral: document.tally?.Neutral ?? 0,
  };
  return {
    tally,
    total: document.totalVotes ?? tally.Agree + tally.Disagree + tally.Neutral,
  };
}

const ORDINANCE_STAGES = [
  'First Reading',
  'Committee Assignment',
  'Committee Hearing',
  'Public Consultation',
  'Second Reading',
  'Third Reading',
  "For Mayor's Signature",
  'For SP Review',
  'Approved',
];

const RESOLUTION_STAGES = [
  'First Reading',
  'Committee Assignment',
  'Third Reading',
  "For Mayor's Signature",
  'Approved',
];

export function legislativeStages(type: PublicDocument['type'], status: string) {
  const stages = type === 'Resolution' ? RESOLUTION_STAGES : ORDINANCE_STAGES;
  const currentIndex = stages.indexOf(status);
  return stages.map((label, index) => ({
    label,
    completed: status === 'Approved' || index < currentIndex,
    current: index === currentIndex && status !== 'Approved',
  }));
}
