import type { PublicDocument } from './api';
import { BONGABONG_BARANGAYS } from './barangays';

/**
 * Pure view logic for the mobile screens.
 *
 * Everything here is deliberately free of React and React Native imports so it
 * can be unit tested under the plain `node` vitest environment. The screens in
 * `app/` delegate to these helpers instead of re-implementing the same
 * filtering, grouping and validation inline.
 */

export const formatDate = (value?: string | null): string => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/** Maps a legislative status string onto a badge colour pair. */
export const statusTone = (status?: string): { bg: string; fg: string } => {
  const value = (status ?? '').toLowerCase();
  if (value.includes('approved')) return { bg: '#d1fae5', fg: '#065f46' };
  if (value.includes('consultation') || value.includes('pending')) {
    return { bg: '#fef3c7', fg: '#92400e' };
  }
  if (value.includes('rejected') || value.includes('deactivated')) {
    return { bg: '#fee2e2', fg: '#991b1b' };
  }
  if (
    value.includes('reading') ||
    value.includes('committee') ||
    value.includes('hearing')
  ) {
    return { bg: '#dbeafe', fg: '#1e40af' };
  }
  return { bg: '#f3f4f6', fg: '#4b5563' };
};

/** Only the ordinance/resolution split is public; anything else is hidden. */
export const isPublicDocumentType = (type?: string): boolean =>
  type === 'Ordinance' || type === 'Resolution';

/**
 * `/public/latest` returns one flat array. The home screen shows two capped
 * sections, so the split happens here rather than in the component.
 */
export const groupLatest = (
  docs: readonly PublicDocument[] = [],
  limitPerType = 3,
): { ordinances: PublicDocument[]; resolutions: PublicDocument[] } => ({
  ordinances: docs.filter((doc) => doc.type === 'Ordinance').slice(0, limitPerType),
  resolutions: docs.filter((doc) => doc.type === 'Resolution').slice(0, limitPerType),
});

export const DOCUMENT_TYPES = ['All', 'Ordinance', 'Resolution'] as const;
export type DocumentTypeFilter = (typeof DOCUMENT_TYPES)[number];

export const ORDINANCE_DOCUMENT_STATUSES = [
  'First Reading',
  'Committee Assignment',
  'Committee Hearing',
  'Public Consultation',
  'Second Reading',
  'Third Reading',
  "For Mayor's Signature",
  'For SP Review',
  'Approved',
  'Rejected',
] as const;

export const RESOLUTION_DOCUMENT_STATUSES = [
  'First Reading',
  'Committee Assignment',
  'Third Reading',
  "For Mayor's Signature",
  'Approved',
  'Rejected',
] as const;

export const DOCUMENT_STATUSES = ['All', ...ORDINANCE_DOCUMENT_STATUSES] as const;
export type DocumentStatusFilter = (typeof DOCUMENT_STATUSES)[number];

export const documentStatusesForType = (type: DocumentTypeFilter): readonly DocumentStatusFilter[] => {
  if (type === 'Ordinance') return ['All', ...ORDINANCE_DOCUMENT_STATUSES];
  if (type === 'Resolution') return ['All', ...RESOLUTION_DOCUMENT_STATUSES];
  return DOCUMENT_STATUSES;
};

/**
 * Builds the `/public/documents` query params. Empty search and the "All"
 * filter must be omitted rather than sent, otherwise the server treats them as
 * real filters and returns nothing.
 */
export const documentQueryParams = (
  query: string,
  type: DocumentTypeFilter,
  page: number,
  limit: number,
  status: DocumentStatusFilter = 'All',
  filters: { termId?: string; year?: string; committee?: string } = {},
): Record<string, string | number> => ({
  page,
  limit,
  ...(query.trim() ? { search: query.trim() } : {}),
  ...(type !== 'All' ? { type } : {}),
  ...(status !== 'All' ? { status } : {}),
  ...(filters.termId ? { termId: filters.termId } : {}),
  ...(filters.year ? { year: filters.year } : {}),
  ...(filters.committee ? { committee: filters.committee } : {}),
});

/** True when the paginated result has another page to fetch. */
export const hasNextPage = (
  page: number,
  pages: number,
): boolean => Number.isFinite(pages) && pages > 0 && page < pages;

export interface FeedbackDraft {
  full_name: string;
  barangay: string;
  contact_number: string;
  email: string;
  // Kept in the draft for the existing optional SMS path, whose form controls
  // are currently hidden while email verification is the shared client flow.
  otp: string;
  comment: string;
}

export interface FeedbackValidationInput {
  ordinanceId: string;
  draft: FeedbackDraft;
  verificationMethod: 'email' | 'sms';
  otpSent: boolean;
  emailVerificationToken: string;
  hasIdImage: boolean;
  hasPrivacyConsent: boolean;
  documentType: string | null;
  ordinanceStatus: string | null;
}

/** Ordered field checks so the first message always names the first problem. */
export const validateFeedback = ({
  ordinanceId,
  draft,
  verificationMethod,
  otpSent,
  emailVerificationToken,
  hasIdImage,
  hasPrivacyConsent,
  documentType,
  ordinanceStatus,
}: FeedbackValidationInput): string | null => {
  if (!ordinanceId.trim()) return 'Enter the ordinance ID you are commenting on.';
  if (!/^[a-f\d]{24}$/i.test(ordinanceId.trim())) {
    return 'Enter a valid 24-character ordinance ID.';
  }
  if (documentType !== 'Ordinance' || !ordinanceStatus) {
    return 'Check an ordinance before submitting feedback.';
  }
  if (draft.full_name.trim().length < 3) return 'Full name must be at least 3 characters.';
  if (draft.full_name.trim().length > 100) return 'Full name must be 100 characters or fewer.';
  if (!BONGABONG_BARANGAYS.includes(draft.barangay as (typeof BONGABONG_BARANGAYS)[number])) {
    return 'Select a barangay from the list.';
  }
  if (!/^09\d{9}$/.test(draft.contact_number)) {
    return 'Contact number must be a valid 11-digit mobile number starting with 09.';
  }
  if (verificationMethod === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      return 'Enter a valid email address.';
    }
    if (draft.email.trim().length > 254) return 'Email address must be 254 characters or fewer.';
    if (!emailVerificationToken) return 'Verify your email before submitting feedback.';
  } else if (!otpSent || !/^\d{6}$/.test(draft.otp.trim())) {
    return 'Request and enter the 6-digit OTP sent to your phone.';
  }
  if (ordinanceStatus !== 'Public Consultation' && draft.comment.trim().length < 5) {
    return 'Comment must be at least 5 characters.';
  }
  if (draft.comment.length > 1000) return 'Comment must be 1000 characters or fewer.';
  if (!hasIdImage) return 'A valid ID image is required.';
  if (!hasPrivacyConsent) return 'You must agree to the Data Privacy terms.';
  return null;
};

export interface GuestFeedbackFields {
  full_name: string;
  barangay: string;
  contact_number: string;
  email?: string;
  emailVerificationToken?: string;
  otp?: string;
  vote: string;
  comment: string;
  data_privacy_consent: 'true' | 'false';
}

export const guestFeedbackFields = (
  draft: FeedbackDraft,
  vote: string,
  ordinanceStatus: string,
  hasPrivacyConsent: boolean,
  verificationMethod: 'email' | 'sms',
  emailVerificationToken: string,
): GuestFeedbackFields => ({
  full_name: draft.full_name.trim(),
  barangay: draft.barangay,
  contact_number: draft.contact_number,
  ...(verificationMethod === 'email'
    ? { email: draft.email.trim(), emailVerificationToken }
    : { otp: draft.otp.trim() }),
  vote: ordinanceStatus === 'Public Consultation' ? vote : 'None',
  comment: draft.comment.trim(),
  data_privacy_consent: hasPrivacyConsent ? 'true' : 'false',
});

export const memberName = (member: {
  name?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
}): string => {
  if (member.name) return member.name;
  const joined = [member.firstName, member.middleName, member.lastName]
    .filter(Boolean)
    .join(' ');
  return joined || 'SB Member';
};

export const initials = (value: string): string =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
