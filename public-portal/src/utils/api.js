/**
 * Public portal API adapter.
 *
 * All transport lives in the shared `@ibosys/api` package; this module only
 * preserves the call surface the portal components already use so no page has
 * to change. See production_checklist.md section 8.
 */
import { cloudinaryPdfDownloadUrl, createApiClient, createPdfFilename, mediaUrl as sharedMediaUrl } from '@ibosys/api';

const configuredApi = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
const BASE = configuredApi
  ? (configuredApi.endsWith('/public') ? configuredApi : `${configuredApi}/public`)
  : 'http://localhost:5001/api/public';

const client = createApiClient({ baseURL: BASE, isPublic: true }).client;

export const mediaUrl = (value) => sharedMediaUrl(value, import.meta.env.VITE_API_URL);
export { cloudinaryPdfDownloadUrl, createPdfFilename };

// Document PDF URLs now use signed tokens instead of exposing raw ObjectIds.
// The server generates time-limited signed URLs for PDF downloads.
export const publicDocumentPdfUrl = (id, download = false) =>
  `${BASE}/documents/${encodeURIComponent(id)}/pdf${download ? '?download=true' : ''}`;
export const publicSessionMinutesUrl = (id) => `${BASE}/minutes/${encodeURIComponent(id)}`;

export const api = {
  getStats: () => client.get('/stats'),
  getDocuments: (params) => client.get('/documents', { params }),
  getDocumentDetail: (id) => client.get(`/documents/${id}`),
  getSessions: (params) => client.get('/sessions', { params }),
  getMembers: (params) => client.get('/members', { params }),
  getTerms: () => client.get('/terms'),
  getLatestDocs: () => client.get('/latest'),
  getRecentSessions: () => client.get('/recent-sessions'),
  // The shared client's getCommittees() takes no params, but the portal filters
  // by term, so the raw instance is used to keep `params` support.
  getCommittees: (params) => client.get('/committees', { params }),
  getNews: (params) => client.get('/news', { params }),
  getNewsDetail: (id) => client.get(`/news/${id}`),
  getPublicFeedback: (ordinanceId) => client.get(`/consult/${ordinanceId}/public`),
  sendOtp: (contactNumber) => client.post('/send-otp', { contactNumber }),
  sendEmailVerification: (email) => client.post('/send-email-verification', { email }),
  verifyEmailCode: (email, code) => client.post('/verify-email-code', { email, code }),
  submitGuestForm: (id, formData) =>
    client.post(`/consult/${id}/guest`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
