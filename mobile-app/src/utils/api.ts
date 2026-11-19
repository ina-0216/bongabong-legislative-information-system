import axios, { AxiosInstance } from 'axios';

// ============================================================================
// Types
//
// These shapes mirror what `server/controllers/publicController.js` actually
// returns. The public endpoints are NOT uniform, so each one is modelled
// individually rather than sharing a single envelope:
//   - `/public/stats`            -> flat counters object
//   - `/public/documents`       -> { docs, total, page, pages }
//   - `/public/news`            -> { data, total, page, pages }   (note: `data`)
//   - `/public/members`         -> bare array
//   - `/public/latest`          -> bare array (not grouped by type)
//   - `/public/minutes/:id`     -> binary PDF stream, not JSON
// ============================================================================

/** Envelope returned by `/public/documents` and `/public/sessions`. */
export interface Paginated<T> {
  docs: T[];
  total: number;
  page: number;
  pages: number;
}

/** Envelope returned by `/public/news` (uses `data`, not `docs`). */
export interface NewsPage {
  data: PublicAnnouncement[];
  total: number;
  page: number;
  pages: number;
}

export interface PublicStats {
  totalOrdinances: number;
  totalResolutions: number;
  approvedOrdinances: number;
  approvedResolutions: number;
  inConsultation: number;
  approvedThisYear: number;
}

export interface PublicDocument {
  _id: string;
  type: 'Ordinance' | 'Resolution';
  number: string;
  title: string;
  title_tl?: string;
  status: string;
  committee: string;
  sectorTag?: string;
  /** `filedAt` is the official filing timestamp; `createdAt` is the fallback for older records. */
  createdAt: string;
  filedAt?: string;
  effectivityDate?: string;
  plainLanguageSummary?: string;
  plainLanguageSummary_tl?: string;
  pdfUrl?: string;
  totalVotes?: number;
  tally?: { Agree?: number; Neutral?: number; Disagree?: number };
  sessions?: Array<Pick<PublicSession, '_id' | 'title' | 'date' | 'status'>>;
  amendsOrdinanceId?: PublicDocumentReference | string;
  amendedByOrdinanceId?: PublicDocumentReference | string;
  proponentId?: PublicMember | string;
  coAuthors?: Array<PublicMember | string>;
}

export interface PublicDocumentReference {
  _id: string;
  number?: string;
  title?: string;
}

export interface PublicSession {
  _id: string;
  title: string;
  date: string;
  location?: string;
  venue?: string;
  sessionNumber?: string;
  status?: string;
  itemsDiscussed?: Array<{ _id: string; number: string; title: string }>;
}

export interface PublicMember {
  _id: string;
  name?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  position?: string;
  photoUrl?: string;
  biography?: string;
  termId?: string;
  order?: number;
  isActive?: boolean;
}

export function getDocumentSponsorNames(document: Pick<PublicDocument, 'proponentId' | 'coAuthors'>): string[] {
  const members = [document.proponentId, ...(document.coAuthors ?? [])];
  const names = members
    .filter((member): member is PublicMember => Boolean(member) && typeof member !== 'string')
    .map((member) => [member.firstName, member.middleName, member.lastName]
      .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()))
      .join(' ')
      .trim())
    .filter(Boolean);
  return [...new Set(names)];
}

export interface PublicAnnouncement {
  _id: string;
  title: string;
  content?: string;
  category?: string;
  excerpt?: string;
  coverImage?: string;
  publishedAt?: string;
  createdAt?: string;
  author?: string;
  gallery?: Array<{
    _id?: string;
    publicId?: string;
    url: string;
    caption?: string;
    altText?: string;
  }>;
}

export interface SendOtpResponse {
  message?: string;
  expiresInSeconds?: number;
  deliveryMode?: 'test' | 'sms';
  /** Returned only by the server's development-only test OTP mode. */
  testOtp?: string;
}

export interface EmailVerificationResponse {
  message?: string;
  expiresInSeconds?: number;
  verificationToken?: string;
}

export interface Committee {
  _id: string;
  name: string;
  chairperson?: string;
  viceChairperson?: string;
  description?: string;
  termId?: string;
}

export interface Term {
  _id: string;
  label: string;
  startYear: number;
  endYear: number;
  description?: string;
  presidingOfficer?: string;
  isCurrent: boolean;
  isUpcoming?: boolean;
}

/** Only the approved, public subset of feedback is exposed by
 *  `GET /public/consult/:id/public` (no contact number, no ID attachment). */
export interface PublicFeedback {
  _id: string;
  vote: 'Agree' | 'Disagree' | 'Neutral' | 'None';
  comment?: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  createdAt: string;
}

export interface ConsultationReceipt {
  feedbackId: string;
  token: string;
}

export interface GuestConsultationSubmissionResponse {
  message?: string;
  feedbackId?: string;
  appealToken?: string;
  eligibilityStatus?: string;
  commentStatus?: string;
  approvalSource?: 'Automatic' | 'Staff';
}

export interface ConsultationReviewStatus {
  eligibilityStatus: string;
  commentStatus: string;
  eligibilityDecision?: string;
  commentDecision?: string;
  appealAvailableUntil?: string;
}

// ============================================================================
// API Client Factory
// ============================================================================

function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    // Render's free service can take close to a minute to wake after idle.
    // Give the first request time to reach the live API instead of failing
    // while the service is starting.
    timeout: 90000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Unwraps the envelope so every call below resolves to the response BODY,
  // not to an AxiosResponse. Callers must NOT access `.data` on the result.
  client.interceptors.response.use(
    (response) => response.data,
    (error) => {
      const payload = error.response?.data as { message?: string } | undefined;
      const message = payload?.message || error.message || 'Request failed';
      const err = new Error(message) as Error & { status?: number; data?: unknown };
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  );

  return client;
}

// Use the live API in Expo Go and standalone builds by default. A local API
// can still be selected explicitly through EXPO_PUBLIC_API_URL.
const configuredApi = (process.env.EXPO_PUBLIC_API_URL || 'https://ibosys-api.onrender.com/api').trim().replace(/\/+$/, '');
const BASE = configuredApi.endsWith('/public') ? configuredApi : `${configuredApi}/public`;

const client = createApiClient(BASE);

/** Exposed so tests can install a recording adapter and assert the real
 *  request shape without network access. */
export const apiClient = client;

// The response interceptor above resolves each request to the response BODY.
// Axios' own typings still describe a full AxiosResponse, so these helpers
// re-state the real contract in one place instead of casting at every call.
const get = <T>(url: string, config?: Parameters<AxiosInstance['get']>[1]): Promise<T> =>
  client.get(url, config) as unknown as Promise<T>;

const post = <T>(
  url: string,
  data?: unknown,
  config?: Parameters<AxiosInstance['post']>[2],
): Promise<T> => client.post(url, data, config) as unknown as Promise<T>;

export const api = {
  /** Flat counters: { totalOrdinances, totalResolutions, approved, ... } */
  getStats: () => get<PublicStats>('/stats'),

  /** { docs, total, page, pages } */
  getDocuments: (params?: Record<string, string | number>) =>
    get<Paginated<PublicDocument>>('/documents', { params }),

  getDocumentDetail: (id: string) => get<PublicDocument>(`/documents/${id}`),

  getDocumentPdfUrl: (id: string, download = false) =>
    `${BASE}/documents/${encodeURIComponent(id)}/pdf${download ? '?download=true' : ''}`,

  /** Bare array (up to 5) - NOT grouped by type. */
  getLatest: () => get<PublicDocument[]>('/latest'),

  /** { docs, total, page, pages } */
  getSessions: (params?: { page?: number; limit?: number }) =>
    get<Paginated<PublicSession>>('/sessions', { params }),

  getRecentSessions: () => get<PublicSession[]>('/recent-sessions'),

  /** Returns a generated PDF, so the response is binary rather than JSON. */
  getMinutesPdf: (sessionId: string) =>
    get<ArrayBuffer>(`/minutes/${sessionId}`, { responseType: 'arraybuffer' }),

  getMinutesPdfUrl: (sessionId: string, download = false) =>
    `${BASE}/minutes/${encodeURIComponent(sessionId)}${download ? '?download=true' : ''}`,

  /** Bare array - not paginated. */
  getMembers: (params?: { termId?: string }) =>
    get<PublicMember[]>('/members', { params }),

  getCommittees: (params?: { termId?: string }) =>
    get<Committee[]>('/committees', { params }),

  getTerms: () => get<Term[]>('/terms'),

  /** { data, total, page, pages } - note the `data` key. */
  getNews: (params?: Record<string, string | number>) =>
    get<NewsPage>('/news', { params }),

  /** Server returns { data: [...] }; unwrapped here to a plain array. */
  getFeaturedNews: () =>
    get<NewsPage>('/news/featured').then((page) => page.data),

  /** Single announcement endpoint wraps its record as { data: announcement }. */
  getNewsDetail: (id: string) =>
    get<{ data: PublicAnnouncement }>(`/news/${id}`).then((response) => response.data),

  sendOtp: (contactNumber: string) =>
    post<SendOtpResponse>('/send-otp', { contactNumber }),

  sendEmailVerification: (email: string) =>
    post<EmailVerificationResponse>('/send-email-verification', { email }),

  verifyEmailCode: (email: string, code: string) =>
    post<EmailVerificationResponse>('/verify-email-code', { email, code }),

  // Override the client's JSON default so Axios keeps FormData as multipart.
  // Axios then clears this header for React Native/browser transports, which
  // add the actual boundary when sending the request.
  submitGuestConsultation: (ordinanceId: string, formData: FormData) =>
    post<GuestConsultationSubmissionResponse>(`/consult/${ordinanceId}/guest`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getGuestConsultationStatus: (ordinanceId: string, receipt: ConsultationReceipt) =>
    post<ConsultationReviewStatus>(`/consult/${ordinanceId}/status`, receipt),

  appealGuestConsultation: (ordinanceId: string, receipt: ConsultationReceipt, target: 'eligibility' | 'comment', reason: string) =>
    post<{ message?: string; status?: string }>(`/consult/${ordinanceId}/appeal`, { ...receipt, target, reason }),

  getPublicFeedback: (ordinanceId: string) =>
    get<PublicFeedback[]>(`/consult/${ordinanceId}/public`),
};

/** Resolves a relative server path (e.g. a Cloudinary path) to an absolute URL. */
export const mediaUrl = (value: string): string => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const origin = BASE.replace(/\/public\/?$/, '').replace(/\/api\/?$/, '');
  return `${origin}${value.startsWith('/') ? value : `/${value}`}`;
};

export default api;
