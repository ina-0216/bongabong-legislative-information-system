/**
 * normalizeArray — safely extracts an array from any API response shape.
 *
 * The shared @ibosys/api client's response interceptor unwraps `response.data`,
 * so the resolved value may be:
 *   • A bare array     → returned as-is
 *   • { docs: [] }    → paginated mongoose result
 *   • { data: [] }    → Express-style envelope
 *   • anything else   → returns []
 *
 * @param {unknown} res - The raw resolved value from any api.* call
 * @returns {Array}
 */
export function normalizeArray(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.docs)) return res.docs;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && Array.isArray(res.sessions)) return res.sessions;
  if (res && Array.isArray(res.items)) return res.items;
  return [];
}

/**
 * normalizePaginated — extracts both the docs array and pagination metadata.
 *
 * @param {unknown} res
 * @returns {{ docs: Array, total: number, pages: number }}
 */
export function normalizePaginated(res) {
  if (Array.isArray(res)) return { docs: res, total: res.length, pages: 1 };
  if (res && Array.isArray(res.docs)) {
    return {
      docs: res.docs,
      total: Number.isFinite(res.total) ? res.total : res.docs.length,
      pages: Number.isFinite(res.pages) && res.pages > 0 ? res.pages : 1,
    };
  }
  if (res && Array.isArray(res.data)) {
    return {
      docs: res.data,
      total: Number.isFinite(res.total) ? res.total : res.data.length,
      pages: Number.isFinite(res.pages) && res.pages > 0 ? res.pages : 1,
    };
  }
  if (res && Array.isArray(res.sessions)) {
    return { docs: res.sessions, total: res.sessions.length, pages: 1 };
  }
  return { docs: [], total: 0, pages: 1 };
}
