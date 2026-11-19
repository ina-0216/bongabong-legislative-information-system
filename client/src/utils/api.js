/**
 * Admin client API adapter.
 *
 * All transport, auth and error normalisation live in the shared
 * `@ibosys/api` package; this module keeps the call surface the admin pages
 * already use so no component had to change. See production_checklist.md
 * section 8.
 *
 * Compatibility notes:
 * - Report endpoints now resolve to a Blob (the shared client's response
 *   interceptor unwraps `data`, with `responseType: 'blob'`). Callers pass the
 *   promise straight into `downloadPdf`/`viewPdf`, so those call sites are
 *   unchanged.
 * - The package's `committees.getAll()` / `sbMembers.getAll()` do not accept
 *   pagination params, so those two use the shared axios instance directly to
 *   preserve `?page=…&limit=…` behaviour.
 */
import { cloudinaryPdfDownloadUrl, createApiClient, createPdfFilename, downloadPdf, viewPdf, LARGE_UPLOAD_TIMEOUT_MS } from '@ibosys/api';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const getToken = () => localStorage.getItem('ibosys_token');

/** Authenticated client for protected routes. */
const authed = createApiClient({ baseURL: BASE, getToken }).client;

/**
 * Unauthenticated client for the auth endpoints. Kept separate so a stale
 * token in localStorage is never attached to a login request.
 */
const anon = createApiClient({ baseURL: BASE }).client;

/**
 * Callers build query strings (some already percent-encoded via
 * encodeURIComponent, some via URLSearchParams which encodes spaces as `+`).
 * Values are decoded here so axios re-encodes them exactly once instead of
 * double-encoding `%` into `%25`.
 */
const decodeValue = (value) => {
  const spaced = value.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(spaced);
  } catch {
    return spaced;
  }
};

const qs = (query) => {
  if (query === null || query === undefined) return undefined;
  if (typeof query === 'object') return Object.keys(query).length ? query : undefined;
  const raw = String(query).replace(/^[?#]/, '').trim();
  if (!raw) return undefined;
  const out = {};
  for (const part of raw.split('&')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const key = decodeValue((eq === -1 ? part : part.slice(0, eq)).trim());
    if (!key) continue;
    out[key] = eq === -1 ? '' : decodeValue(part.slice(eq + 1));
  }
  return Object.keys(out).length ? out : undefined;
};

/** Splits `id` or `id?a=1` used by the timeline report call sites. */
const splitId = (value) => {
  const raw = String(value ?? '');
  const at = raw.indexOf('?');
  if (at === -1) return { id: raw, params: undefined };
  return { id: raw.slice(0, at), params: qs(raw.slice(at + 1)) };
};

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };
const largeMultipart = { ...multipart, timeout: LARGE_UPLOAD_TIMEOUT_MS };
const blob = { responseType: 'blob' };

export const api = {
  getHealth: () => anon.get('/health'),
  login: (body) => anon.post('/auth/login', body),
  seedAdmin: () => anon.post('/auth/seed-admin'),
  forgotPassword: (body) => anon.post('/auth/forgot-password', body),
  resetPasswordWithToken: (token, body) => anon.post(`/auth/reset-password/${token}`, body),

  getUsers: (params) => authed.get('/users', { params: qs(params) }),
  getMe: () => authed.get('/users/me'),
  createUser: (body) => authed.post('/users', body),
  resetPassword: (id, body = {}) => authed.put(`/users/${id}/reset-password`, body),
  updateUserStatus: (id, status) => authed.put(`/users/${id}/status`, { status }),
  updateProfile: (body) => authed.put('/users/profile', body),
  changePassword: (id, body) => authed.put(`/users/${id}/password`, body),
  uploadAvatar: (formData) => authed.put('/users/avatar', formData, multipart),

  /** @returns {Promise<import('./types.js').Paginated<import('./types.js').Ordinance>>} */
  getOrdinances: (params) => authed.get('/ordinances', { params: qs(params) }),
  getNextOrdinanceNumber: (seriesYear) => authed.get('/ordinances/next-number', { params: { seriesYear } }),
  createOrdinancePdfUploadSignature: () => authed.post('/ordinances/pdf-upload-signature', {}),
  discardOrdinancePdfUpload: (pdfUpload) => authed.post('/ordinances/pdf-upload-discard', { pdfUpload }),
  /** @returns {Promise<import('./types.js').Ordinance>} */
  getOrdinance: (id) => authed.get(`/ordinances/${id}`),
  /** @returns {Promise<import('./types.js').Stats>} */
  getStats: () => authed.get('/ordinances/stats'),
  createOrdinance: (form) => authed.post('/ordinances', form,
    form instanceof FormData ? largeMultipart : undefined),
  updateOrdinance: (id, form) => authed.put(`/ordinances/${id}`, form,
    form instanceof FormData ? largeMultipart : undefined),
  advanceStatus: (id, body) => authed.put(`/ordinances/${id}/status`, body),
  rejectOrdinance: (id, body) => authed.put(`/ordinances/${id}/reject`, body),
  assignCommittee: (id, body) => authed.put(`/ordinances/${id}/assign-committee`, body),
  linkAmendment: (id, body) => authed.put(`/ordinances/${id}/amend`, body),
  saveCommitteeReport: (id, body) => authed.put(`/ordinances/${id}/committee-report`, body),
  /**
   * Reads an uploaded PDF/DOCX and returns the extracted text plus candidate
   * values for the ordinance/resolution form fields.
   * PDF extraction receives a signed Cloudinary upload reference. DOCX extraction
   * remains multipart and carries the file under the `file` key.
   */
  extractDocumentText: (body) => body instanceof FormData
    ? authed.post('/ordinances/extract-text', body, largeMultipart)
    : authed.post('/ordinances/extract-text', body),

  /** @returns {Promise<import('./types.js').Paginated<import('./types.js').Session>>} */
  getSessions: (params) => authed.get('/sessions', { params: qs(params) }),
  /** @returns {Promise<import('./types.js').Session>} */
  getSession: (id) => authed.get(`/sessions/${id}`),
  createSession: (body) => authed.post('/sessions', body),
  updateSession: (id, body) => authed.put(`/sessions/${id}`, body),
  deleteSession: (id) => authed.delete(`/sessions/${id}`),

  /** @returns {Promise<import('./types.js').Term[]>} */
  getTerms: () => authed.get('/terms'),
  getTerm: (id) => authed.get(`/terms/${id}`),
  createTerm: (body) => authed.post('/terms', body),
  updateTerm: (id, body) => authed.put(`/terms/${id}`, body),
  deleteTerm: (id) => authed.delete(`/terms/${id}`),

  /** @returns {Promise<import('./types.js').Paginated<import('./types.js').Committee>>} */
  getCommittees: (params) => authed.get('/committees', { params: qs(params) }),
  ensureTermCommittees: (termId) => authed.post('/committees/ensure-term-defaults', { termId }),
  saveCommittee: (id, body) => authed.put(`/committees/${id}`, body),

  /** @returns {Promise<import('./types.js').Paginated<import('./types.js').SBMember>>} */
  getSBMembers: (params) => authed.get('/sbmembers', { params: qs(params) }),
  createSBMember: (form) => authed.post('/sbmembers', form, multipart),
  updateSBMember: (id, form) => authed.put(`/sbmembers/${id}`, form, multipart),
  deleteSBMember: (id) => authed.delete(`/sbmembers/${id}`),

  getPendingConsultations: (params) => authed.get('/consultations/pending', { params: qs(params) }),
  getConsultationSubmissions: (params) => authed.get('/consultations/submissions', { params: qs(params) }),
  getConsultationAttachment: (id) => authed.get(`/consultations/${id}/attachment`, { responseType: 'blob' }),
  verifyConsultation: (id, body) => authed.put(`/consultations/${id}/verify`, body),
  getConsultationAnalytics: (ordinanceId, params) =>
    authed.get(`/consultations/ordinance/${ordinanceId}/feedback`, { params: qs(params) }),


  getNotifications: () => authed.get('/notifications'),
  markRead: (id) => authed.put(`/notifications/${id}/read`),
  markAllRead: () => authed.put('/notifications/read-all'),
  deleteNotification: (id) => authed.delete(`/notifications/${id}`),
  clearReadNotifications: () => authed.delete('/notifications/clear-read'),

  getAnnouncements: (params) => authed.get('/announcements', { params: qs(params) }),
  createAnnouncement: (form) => authed.post('/announcements', form, largeMultipart),
  updateAnnouncement: (id, form) => authed.put(`/announcements/${id}`, form, largeMultipart),
  getPdfHeaderSettings: () => authed.get('/system/pdf-header'),
  updatePdfHeaderSettings: (form) => authed.put('/system/pdf-header', form, largeMultipart),
  deleteAnnouncement: (id) => authed.delete(`/announcements/${id}`),
  togglePublishAnnouncement: (id) => authed.patch(`/announcements/${id}/toggle-publish`),

  getCommitteeReport: (id) => authed.get(`/reports/committee/${id}`, blob),
  getAnnualReport: (year) => authed.get(`/reports/annual?year=${year}`, blob),
  getParticipationReport: (id) => authed.get(`/reports/participation/${id}`, blob),
  getMinutesReport: (id) => authed.get(`/reports/minutes/${id}`, blob),
  getSessionPdf: (id) => authed.get(`/sessions/${id}/generate-pdf`, blob),
  getLegislativeDocumentPdf: (id) => authed.get(`/ordinances/${id}/generate-pdf`, blob),
  getDocumentReport: (id) => authed.get(`/reports/document/${id}`, blob),
  /** Accepts `id` or `id?stages=…` as built by OrdinanceDetail/Reports. */
  getTimelineReport: (id) => {
    const { id: reportId, params } = splitId(id);
    return authed.get(`/reports/timeline/${reportId}`, { ...blob, params });
  },
};

export { cloudinaryPdfDownloadUrl, createPdfFilename, downloadPdf, viewPdf };
