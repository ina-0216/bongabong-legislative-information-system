import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { z } from 'zod';

export const MAX_PHOTO_UPLOAD_BYTES = 25 * 1024 * 1024;
export const PHOTO_UPLOAD_SIZE_ERROR = 'Photo must be 25 MB or smaller.';
export const MAX_ORDINANCE_PDF_UPLOAD_BYTES = 100 * 1024 * 1024;
export const MAX_ANNOUNCEMENT_COVER_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_ANNOUNCEMENT_GALLERY_UPLOAD_BYTES = 8 * 1024 * 1024;
export const LARGE_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;

export function isPhotoUploadWithinLimit(file: Pick<File, 'size'> | null | undefined): boolean {
  return !file || file.size <= MAX_PHOTO_UPLOAD_BYTES;
}

// ============================================================================
// Types
// ============================================================================

export interface Paginated<T> {
  docs: T[];
  total: number;
  max: number;
  pages: number;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'System Admin' | 'Secretary' | 'Vice Mayor' | 'SB Member';
  contactNumber: string;
  status: 'Pending' | 'Active' | 'Deactivated';
  position?: string;
  termStart?: string;
  termEnd?: string;
  mustChangePassword: boolean;
  profilePicture: string;
  idImageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ordinance {
  _id: string;
  type: 'Ordinance' | 'Resolution';
  number: string;
  title: string;
  title_tl?: string;
  proponentId: string;
  termId?: string;
  committee: string;
  sectorTag: string;
  explanatoryNote: string;
  definitionsOfTerms?: string;
  enactingClause?: string;
  provisions: string;
  penaltyClause?: string;
  effectivityDate?: string;
  pdfUrl?: string;
  status: OrdinanceStatus;
  plainLanguageSummary?: string;
  plainLanguageSummary_tl?: string;
  isLocked: boolean;
  amendsOrdinanceId?: string | null;
  amendedByOrdinanceId?: string | null;
  sections: { title: string; content: string }[];
  committeeReport?: CommitteeReport;
  timeline: TimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export type OrdinanceStatus =
  | 'First Reading'
  | 'Committee Assignment'
  | 'Committee Hearing'
  | 'Public Consultation'
  | 'Second Reading'
  | 'Third Reading'
  | "For Mayor's Signature"
  | 'For SP Review'
  | 'Approved';

export interface CommitteeReport {
  findings: string;
  recommendation: string;
  viceSecretaryName: string;
  createdAt: string;
  createdBy: string;
}

export interface TimelineEntry {
  status: string;
  notes?: string;
  updatedBy: string;
  date: string;
}

export interface SBMember {
  _id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  position: string;
  photoUrl: string;
  biography: string;
  termId?: string;
  committees: string[];
  termStart?: string;
  termEnd?: string;
  contactEmail: string;
  fbLink: string;
  sbNumber: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Term {
  _id: string;
  label: string;
  startYear: number;
  endYear: number;
  description: string;
  presidingOfficer: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Committee {
  _id: string;
  name: string;
  chairperson: string;
  viceChairperson: string;
  members: string[];
  description: string;
  termId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  _id: string;
  title: string;
  date: string;
  itemsDiscussed: string[];
  createdBy: string;
  attendance: {
    present: string[];
    onOfficialBusiness: string[];
    absent: string[];
  };
  callToOrder: string;
  invocation: string;
  rollCall: string;
  readingOfPreviousMinutes: string;
  citizensHour: string;
  questionHour: string;
  committeeReport: string;
  firstReading: string;
  unfinishedBusiness: string;
  referralForAction: string;
  referralForReference: string;
  referenceOfBusiness: string;
  otherMatters: string;
  thanksgivingPrayer: string;
  adjournment: string;
  status: 'Draft' | 'Final';
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  coverImage?: string;
  published: boolean;
  publishedAt?: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationFeedback {
  _id: string;
  ordinanceId: string;
  full_name: string;
  barangay: string;
  contact_number: string;
  id_attachment_url: string;
  vote: 'Agree' | 'Disagree' | 'Neutral' | 'None';
  comment?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  approved_by?: string;
  approved_at?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  recipientId: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string;
  createdAt: string;
  updatedAt: string;
}

export interface CorrectionRequest {
  _id: string;
  ordinanceId: string;
  secretaryId: string;
  requestedChanges: {
    title?: string;
    committee?: string;
    explanatoryNote?: string;
    provisions?: string;
    penaltyClause?: string;
    effectivityDate?: string;
    plainLanguageSummary?: string;
  };
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  viceMayorId?: string;
  actionDate?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  totalOrdinances: number;
  totalResolutions: number;
  approvedLaws: number;
  inProgress: number;
  openConsultations: number;
}

export interface PublicStats {
  ordinances: number;
  resolutions: number;
  approved: number;
  sessions: number;
  members: number;
  committees: number;
}

export interface PublicDocument {
  _id: string;
  type: 'Ordinance' | 'Resolution';
  number: string;
  title: string;
  title_tl?: string;
  status: string;
  committee: string;
  sectorTag: string;
  dateFiled: string;
  proponentName: string;
  amendsOrdinanceId?: string;
  tally?: { Agree: number; Disagree: number; Neutral: number; None: number };
  totalVotes?: number;
  sessions?: { _id: string; title: string; date: string }[];
}

export interface PublicSession {
  _id: string;
  title: string;
  date: string;
  sessionNumber?: string;
  itemsDiscussed: PublicDocument[];
}

export interface PublicMember {
  _id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  position: string;
  photoUrl: string;
  biography: string;
  termId?: string;
  order: number;
  isActive: boolean;
}

export interface PublicAnnouncement {
  _id: string;
  title: string;
  content: string;
  coverImage?: string;
  publishedAt: string;
}

// ============================================================================
// Zod Schemas for Request Validation
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createOrdinanceSchema = z.object({
  title: z.string().min(1),
  title_tl: z.string().optional(),
  type: z.enum(['Ordinance', 'Resolution']),
  number: z.string().min(1),
  proponentId: z.string(),
  committee: z.string().min(1),
  sectorTag: z.string().optional(),
  explanatoryNote: z.string().min(1),
  enactingClause: z.string().optional(),
  provisions: z.string().min(1),
  penaltyClause: z.string().optional(),
  effectivityDate: z.string().optional(),
  plainLanguageSummary: z.string().optional(),
  plainLanguageSummary_tl: z.string().optional(),
  termId: z.string().optional(),
  sections: z.array(z.object({ title: z.string(), content: z.string() })).optional(),
});

export const updateOrdinanceStatusSchema = z.object({
  status: z.enum([
    'First Reading',
    'Committee Assignment',
    'Committee Hearing',
    'Public Consultation',
    'Second Reading',
    'Third Reading',
    "For Mayor's Signature",
    'For SP Review',
    'Approved',
  ]),
});

export const createTermSchema = z.object({
  label: z.string().min(1),
  startYear: z.number().int().min(2000).max(2100),
  endYear: z.number().int().min(2000).max(2100),
  description: z.string().optional(),
  presidingOfficer: z.string().optional(),
});

export const createAnnouncementSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  coverImage: z.string().optional(),
});

export const createSbMemberSchema = z.object({
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().min(1),
  position: z.string().min(1),
  photoUrl: z.string().optional(),
  biography: z.string().optional(),
  termId: z.string().optional(),
  committees: z.array(z.string()).optional(),
  termStart: z.string().optional(),
  termEnd: z.string().optional(),
  contactEmail: z.string().email().optional(),
  fbLink: z.string().optional(),
  sbNumber: z.string().optional(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
});

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['System Admin', 'Secretary', 'Vice Mayor', 'SB Member']),
  contactNumber: z.string().min(1),
  position: z.string().optional(),
  termStart: z.string().optional(),
  termEnd: z.string().optional(),
});

// ============================================================================
// API Client Factory
// ============================================================================

export interface ApiClientOptions {
  baseURL: string;
  getToken?: () => string | null;
  isPublic?: boolean;
}

type RetryableRequestConfig = InternalAxiosRequestConfig & { getRetryCount?: number };

const MAX_SAFE_GET_RETRIES = 1;
const SAFE_GET_RETRY_DELAY_MS = 250;
export const LOGIN_TIMEOUT_MS = 90_000;

const waitForRetry = () => new Promise<void>((resolve) => {
  setTimeout(resolve, SAFE_GET_RETRY_DELAY_MS);
});

export function createApiClient(options: ApiClientOptions) {
  const { baseURL, getToken, isPublic = false } = options;

  const client: AxiosInstance = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor for auth token
  if (!isPublic && getToken) {
    client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const token = getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response.data,
    async (error) => {
      const config = error.config as RetryableRequestConfig | undefined;
      const status = error.response?.status;
      const isSafeRead = config?.method?.toLowerCase() === 'get';
      const isRetryableFailure = status === undefined || [502, 503, 504].includes(status);
      const retryCount = config?.getRetryCount || 0;

      if (config && isSafeRead && isRetryableFailure && error.code !== 'ERR_CANCELED'
        && !config.signal?.aborted && retryCount < MAX_SAFE_GET_RETRIES) {
        config.getRetryCount = retryCount + 1;
        await waitForRetry();
        if (config.signal?.aborted) throw error;
        return client.request(config);
      }

      const message = error.response?.data?.message || error.message || 'Request failed';
      const err = new Error(message) as Error & { status?: number; data?: unknown };
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  );

  // =========================================================================
  // Auth
  // =========================================================================
  const auth = {
    login: (body: z.infer<typeof loginSchema>) =>
      client.post('/auth/login', body, { timeout: LOGIN_TIMEOUT_MS }),
    forgotPassword: (body: { email: string }) =>
      client.post('/auth/forgot-password', body),
    resetPassword: (token: string, body: { password: string }) =>
      client.post(`/auth/reset-password/${token}`, body),
    seedAdmin: () => client.post('/auth/seed-admin'),
    resetAdminPassword: (secret: string) => client.post('/auth/reset-admin-password', { secret }),
  };

  // =========================================================================
  // Users
  // =========================================================================
  const users = {
    getAll: (params?: Record<string, string>) => client.get<Paginated<User>>('/users', { params }),
    getMe: () => client.get<User>('/users/me'),
    create: (body: z.infer<typeof createUserSchema>) => client.post<User>('/users', body),
    updateProfile: (body: Partial<User>) => client.put<User>('/users/profile', body),
    changePassword: (id: string, body: { currentPassword: string; newPassword: string }) =>
      client.put(`/users/${id}/password`, body),
    updateAvatar: (formData: FormData) =>
      client.put<User>('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    adminResetPassword: (id: string, body: { password: string }) =>
      client.put(`/users/${id}/reset-password`, body),
    updateStatus: (id: string, status: User['status']) =>
      client.put(`/users/${id}/status`, { status }),
  };

  // =========================================================================
  // Ordinances
  // =========================================================================
  const ordinances = {
    getStats: () => client.get<Stats>('/ordinances/stats'),
    getAll: (params?: Record<string, string | number>) =>
      client.get<Paginated<Ordinance>>('/ordinances', { params }),
    getById: (id: string) => client.get<Ordinance>(`/ordinances/${id}`),
    create: (formData: FormData) =>
      client.post<Ordinance>('/ordinances', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    update: (id: string, formData: FormData) =>
      client.put<Ordinance>(`/ordinances/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    advanceStatus: (id: string, body: z.infer<typeof updateOrdinanceStatusSchema>) =>
      client.put(`/ordinances/${id}/status`, body),
    linkAmendment: (id: string, body: { amendsOrdinanceId: string }) =>
      client.put(`/ordinances/${id}/amend`, body),
    saveCommitteeReport: (id: string, body: { findings: string; recommendation: string; viceSecretaryName: string }) =>
      client.put(`/ordinances/${id}/committee-report`, body),
    downloadPdf: (id: string) => client.get(`/ordinances/${id}/generate-pdf`, { responseType: 'blob' }),
    backfillTranslations: () => client.post('/ordinances/backfill-translations'),
  };

  // =========================================================================
  // SB Members
  // =========================================================================
  const sbMembers = {
    getAll: (params?: { termId?: string }) =>
      client.get<Paginated<SBMember>>('/sbmembers', { params }),
    create: (formData: FormData) =>
      client.post<SBMember>('/sbmembers', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    update: (id: string, formData: FormData) =>
      client.put<SBMember>(`/sbmembers/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    delete: (id: string) => client.delete(`/sbmembers/${id}`),
  };

  // =========================================================================
  // Terms
  // =========================================================================
  const terms = {
    getAll: () => client.get<Term[]>('/terms'),
    getById: (id: string) => client.get<Term>(`/terms/${id}`),
    create: (body: z.infer<typeof createTermSchema>) => client.post<Term>('/terms', body),
    update: (id: string, body: Partial<z.infer<typeof createTermSchema>>) => client.put<Term>(`/terms/${id}`, body),
    delete: (id: string) => client.delete(`/terms/${id}`),
  };

  // =========================================================================
  // Committees
  // =========================================================================
  const committees = {
    getAll: () => client.get<Committee[]>('/committees'),
    update: (id: string, body: { chairperson?: string; viceChairperson?: string; members?: string[]; description?: string }) =>
      client.put<Committee>(`/committees/${id}`, body),
    migrate2025: () => client.post('/committees/migrate-2025'),
  };

  // =========================================================================
  // Sessions
  // =========================================================================
  const sessions = {
    getAll: (params?: Record<string, string>) =>
      client.get<Paginated<Session>>('/sessions', { params }),
    getById: (id: string) => client.get<Session>(`/sessions/${id}`),
    create: (body: Partial<Session>) => client.post<Session>('/sessions', body),
    update: (id: string, body: Partial<Session>) => client.put<Session>(`/sessions/${id}`, body),
    delete: (id: string) => client.delete(`/sessions/${id}`),
    downloadPdf: (id: string) => client.get(`/sessions/${id}/generate-pdf`, { responseType: 'blob' }),
  };

  // =========================================================================
  // Announcements
  // =========================================================================
  const announcements = {
    getAll: (params?: Record<string, string>) =>
      client.get<Paginated<Announcement>>('/announcements', { params }),
    getById: (id: string) => client.get<Announcement>(`/announcements/${id}`),
    create: (formData: FormData) =>
      client.post<Announcement>('/announcements', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: LARGE_UPLOAD_TIMEOUT_MS,
      }),
    update: (id: string, formData: FormData) =>
      client.put<Announcement>(`/announcements/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: LARGE_UPLOAD_TIMEOUT_MS,
      }),
    togglePublish: (id: string) => client.patch(`/announcements/${id}/toggle-publish`),
    delete: (id: string) => client.delete(`/announcements/${id}`),
  };

  // =========================================================================
  // Consultations
  // =========================================================================
  const consultations = {
    getPending: (params?: Record<string, string>) =>
      client.get<Paginated<ConsultationFeedback>>('/consultations/pending', { params }),
    verify: (id: string, body: { status: 'Approved' | 'Rejected'; sentiment: 'Positive' | 'Negative' | 'Neutral' }) =>
      client.put(`/consultations/${id}/verify`, body),
    getAnalytics: (ordinanceId: string, params?: Record<string, string>) =>
      client.get(`/consultations/ordinance/${ordinanceId}/feedback`, { params }),
  };

  // =========================================================================
  // Notifications
  // =========================================================================
  const notifications = {
    getAll: () => client.get<Notification[]>('/notifications'),
    markRead: (id: string) => client.put(`/notifications/${id}/read`),
    markAllRead: () => client.put('/notifications/read-all'),
  };

  // =========================================================================
  // Corrections
  // =========================================================================
  const corrections = {
    getAll: (params?: Record<string, string>) =>
      client.get<Paginated<CorrectionRequest>>('/corrections', { params }),
    create: (body: { ordinanceId: string; reason: string; requestedChanges: CorrectionRequest['requestedChanges'] }) =>
      client.post('/corrections', body),
    action: (id: string, body: { status: 'Approved' | 'Rejected'; remarks?: string }) =>
      client.put(`/corrections/${id}`, body),
  };

  // =========================================================================
  // Reports
  // =========================================================================
  const reports = {
    getCommitteeReport: (ordinanceId: string) => client.get(`/reports/committee/${ordinanceId}`, { responseType: 'blob' }),
    getAnnualReport: (year: number) => client.get(`/reports/annual?year=${year}`, { responseType: 'blob' }),
    getParticipationReport: (ordinanceId: string) => client.get(`/reports/participation/${ordinanceId}`, { responseType: 'blob' }),
    getTimelineReport: (ordinanceId: string) => client.get(`/reports/timeline/${ordinanceId}`, { responseType: 'blob' }),
    getMinutesReport: (sessionId: string) => client.get(`/reports/minutes/${sessionId}`, { responseType: 'blob' }),
    getDocumentPdf: (id: string) => client.get(`/reports/document/${id}`, { responseType: 'blob' }),
  };

  // =========================================================================
  // System (Admin Utilities)
  // =========================================================================
  const system = {
    syncViceMayors: () => client.post('/system/sync-vice-mayors'),
    migrateCommittees: () => client.post('/system/migrate-committees'),
  };

  // =========================================================================
  // Public API (unauthenticated)
  // =========================================================================
  const publicApi = {
    getStats: () => client.get<PublicStats>('/public/stats'),
    getDocuments: (params?: Record<string, string | number>) =>
      client.get<Paginated<PublicDocument>>('/public/documents', { params }),
    getDocumentById: (id: string) => client.get<PublicDocument>(`/public/documents/${id}`),
    getLatest: () => client.get<{ ordinances: PublicDocument[]; resolutions: PublicDocument[] }>('/public/latest'),
    getSessions: () => client.get<PublicSession[]>('/public/sessions'),
    getRecentSessions: () => client.get<PublicSession[]>('/public/recent-sessions'),
    getMinutes: (sessionId: string) => client.get<PublicSession>(`/public/minutes/${sessionId}`),
    getMembers: (params?: { termId?: string }) =>
      client.get<Paginated<PublicMember>>('/public/members', { params }),
    getCommittees: () => client.get<Committee[]>('/public/committees'),
    getTerms: () => client.get<Term[]>('/public/terms'),
    getNews: (params?: Record<string, string>) =>
      client.get<Paginated<PublicAnnouncement>>('/public/news', { params }),
    getFeaturedNews: () => client.get<PublicAnnouncement[]>('/public/news/featured'),
    getNewsById: (id: string) => client.get<PublicAnnouncement>(`/public/news/${id}`),
    sendOtp: (contactNumber: string) => client.post('/public/send-otp', { contactNumber }),
    submitGuestConsultation: (ordinanceId: string, formData: FormData) =>
      client.post(`/public/consult/${ordinanceId}/guest`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    getPublicFeedback: (ordinanceId: string) => client.get<ConsultationFeedback[]>(`/public/consult/${ordinanceId}/public`),
  };

  // =========================================================================
  // Health
  // =========================================================================
  const health = {
    check: () => client.get<{ status: string; timestamp: string; checks: Record<string, string> }>('/health'),
  };

  return {
    client,
    auth,
    users,
    ordinances,
    sbMembers,
    terms,
    committees,
    sessions,
    announcements,
    consultations,
    notifications,
    corrections,
    reports,
    system,
    public: publicApi,
    health,
  };
}

// ============================================================================
// Default Instances (configure via environment)
// ============================================================================

let adminClient: ReturnType<typeof createApiClient> | null = null;
let publicClient: ReturnType<typeof createApiClient> | null = null;
let configuredApiBaseUrl: string | undefined;

type ApiRuntimeGlobals = typeof globalThis & {
  __IBOSYS_API_URL__?: string;
  process?: { env?: Record<string, string | undefined> };
};

function getRuntimeApiBaseUrl(): string | undefined {
  const runtime = globalThis as ApiRuntimeGlobals;
  return runtime.__IBOSYS_API_URL__ || runtime.process?.env?.VITE_API_URL;
}

function resolveApiBaseUrl(baseURL?: string): string {
  return baseURL || configuredApiBaseUrl || getRuntimeApiBaseUrl() || 'http://localhost:5001/api';
}

/**
 * Set the default API URL for this package instance. ESM browser consumers can
 * pass `import.meta.env.VITE_API_URL`; CommonJS consumers can pass their runtime
 * configuration or set `process.env.VITE_API_URL`.
 */
export function configureApiBaseUrl(baseURL?: string): void {
  configuredApiBaseUrl = baseURL?.trim() || undefined;
  adminClient = null;
  publicClient = null;
}

export function getAdminApiClient(baseURL?: string): ReturnType<typeof createApiClient> {
  if (!adminClient) {
    const url = resolveApiBaseUrl(baseURL);
    adminClient = createApiClient({
      baseURL: url,
      getToken: () => {
        if (typeof window !== 'undefined') {
          return localStorage.getItem('ibosys_token');
        }
        return null;
      },
    });
  }
  return adminClient;
}

export function getPublicApiClient(baseURL?: string): ReturnType<typeof createApiClient> {
  if (!publicClient) {
    const configuredApi = resolveApiBaseUrl(baseURL);
    const publicBase = configuredApi.endsWith('/public') ? configuredApi : `${configuredApi}/public`;
    publicClient = createApiClient({
      baseURL: publicBase,
      isPublic: true,
    });
  }
  return publicClient;
}

// ============================================================================
// Utility Functions
// ============================================================================

export async function downloadPdf(
  fetchPromise: Promise<Blob>,
  filename: string
): Promise<void> {
  const blob = await fetchPromise;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = createPdfFilename(filename);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/** Build a readable, portable PDF filename from meaningful document details. */
export function createPdfFilename(...parts: Array<string | number | null | undefined>): string {
  const cleaned = parts
    .map((part) => String(part ?? '').normalize('NFKC').replace(/\.pdf$/i, ''))
    .map((part) => part.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').replace(/\.{2,}/g, '.').trim())
    .filter(Boolean);
  let stem = cleaned.join(' - ').replace(/^[. ]+|[. ]+$/g, '').slice(0, 175).trim();
  if (!stem) stem = 'document';
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem)) stem = `_${stem}`;
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem)) stem = `_${stem}`;
  return `${stem}.pdf`;
}

/**
 * Ask Cloudinary to deliver an uploaded raw PDF as an attachment with a
 * descriptive filename. Other hosts are returned unchanged; same-origin
 * anchors can use the `download` attribute as a fallback.
 */
export function cloudinaryPdfDownloadUrl(value: string, filename: string): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() !== 'res.cloudinary.com') return value;
    const segments = url.pathname.split('/');
    const rawIndex = segments.indexOf('raw');
    if (rawIndex < 0 || segments[rawIndex + 1] !== 'upload') return value;
    const uploadIndex = rawIndex + 1;
    const safeFilename = createPdfFilename(filename);
    const attachment = `fl_attachment:${encodeURIComponent(safeFilename)}`;
    if (segments[uploadIndex + 1]?.startsWith('fl_attachment:')) {
      segments[uploadIndex + 1] = attachment;
    } else {
      segments.splice(uploadIndex + 1, 0, attachment);
    }
    url.pathname = segments.join('/');
    return url.toString();
  } catch {
    return value;
  }
}

export async function viewPdf(fetchPromise: Promise<Blob>): Promise<void> {
  const blob = await fetchPromise;
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function mediaUrl(value: string, apiBaseUrl?: string): string {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const origin = resolveApiBaseUrl(apiBaseUrl).replace(/\/api\/?$/, '');
  return `${origin}${value.startsWith('/') ? value : `/${value}`}`;
}
