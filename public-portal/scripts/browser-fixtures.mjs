/**
 * Deterministic API fixtures for the browser-based checks.
 *
 * Shared by capture-screenshots.mjs and visual-diff.mjs on purpose: if the two
 * scripts carried separate copies of this data they could drift, and the diff
 * gate would then compare different content and report meaningless changes.
 */

export const STATS = {
  totalOrdinances: 128,
  totalResolutions: 64,
  // Match the two approved records in DOCS and the server's type-separated
  // public stats contract; the legacy `approved` field is no longer consumed.
  approvedOrdinances: 1,
  approvedResolutions: 1,
  inConsultation: 4,
};

export const TERMS = [{ _id: 't1', label: '2025-2026', isCurrent: true }];

export const DOCS = [
  {
    _id: 'doc-1',
    // `type` is a real field on the Ordinance model (enum Ordinance|Resolution,
    // default Ordinance). Omitting it left every document rendering down the
    // Resolution branch, so the comments and consultation tabs — and the entire
    // GuestForm and VoteChart — were never captured by any baseline image.
    type: 'Ordinance',
    number: 'Ord. 2025-0142',
    title: 'An ordinance regulating the operation of public utility vehicles along the national highway',
    description: 'Sets fares, routes, and terminal requirements for provincial and municipal routes serving Bongabong.',
    status: 'Approved',
    committee: 'Committee on Transportation',
    author: 'Hon. A. Dela Cruz',
    createdAt: '2025-10-02T00:00:00.000Z',
    tags: ['transport', 'fares'],
    sessions: [{ _id: 's1', title: 'Regular Session', date: '2025-09-16T00:00:00.000Z', status: 'Final' }],
    tally: { Agree: 8, Disagree: 2, Neutral: 3 },
    totalVotes: 13,
    relatedDocs: [{ _id: 'doc-2', number: 'Ord. 2025-0139' }],
  },
  {
    _id: 'doc-2',
    type: 'Ordinance',
    number: 'Ord. 2025-0139',
    title: 'An ordinance establishing a public market concession area at the municipal center',
    description: 'Allocates stall space and sets concession fees.',
    status: 'Committee Hearing',
    committee: 'Committee on Economic Affairs',
    author: 'Hon. B. Ramos',
    createdAt: '2025-09-28T00:00:00.000Z',
  },
  {
    _id: 'doc-3',
    type: 'Ordinance',
    number: 'Ord. 2025-0131',
    title: 'An ordinance appropriating funds for the repair of barangay roads',
    description: 'Appropriates funds for the 2025 road repair programme.',
    status: 'Public Consultation',
    committee: 'Committee on Public Works',
    author: 'Hon. C. Villanueva',
    createdAt: '2025-09-20T00:00:00.000Z',
    tags: ['infrastructure', 'budget'],
    sessions: [{ _id: 's3', title: 'Special Session', date: '2025-09-22T00:00:00.000Z', status: 'Final' }],
    // The consultation tab renders the vote chart and the sentiment count, so a
    // Public Consultation document without a tally renders an empty chart rather
    // than the populated one a real record would carry.
    tally: { Agree: 21, Disagree: 5, Neutral: 9 },
    totalVotes: 35,
  },
  // Resolutions share the Ordinance model but are selected by `type`. Without
  // any fixture on this side of the branch, the resolutions archive rendered
  // ordinances and every `resolutions--*` baseline image recorded the wrong
  // document type.
  {
    _id: 'res-1',
    type: 'Resolution',
    number: 'Res. 2025-0091',
    title: 'A resolution ratifying the memorandum of agreement for the hospital referral network',
    description: 'Ratifies the referral arrangement with the provincial hospital.',
    status: 'Approved',
    committee: 'Committee on Health',
    author: 'Hon. A. Bautista',
    createdAt: '2025-09-12T00:00:00.000Z',
    tags: ['health', 'agreements'],
    sessions: [{ _id: 's1', title: 'Regular Session', date: '2025-09-10T00:00:00.000Z', status: 'Final' }],
  },
  {
    _id: 'res-2',
    type: 'Resolution',
    number: 'Res. 2025-0088',
    title: 'A resolution authorizing the construction of a covered market shelter',
    description: 'Authorizes the shelter project subject to bidding.',
    status: 'First Reading',
    committee: 'Committee on Economic Affairs',
    author: 'Hon. B. Ramos',
    createdAt: '2025-09-05T00:00:00.000Z',
  },
];

export const NEWS = [
  { _id: 'news-1', title: 'Sangguniang Bayan opens public consultation on the 2026 barangay road programme', category: 'Public Consultation', excerpt: 'Residents may submit written comment until the hearing date.', content: '<p>The council invites public comment.</p>', publishedAt: '2025-10-17T00:00:00.000Z', author: 'Legislative Office' },
  { _id: 'news-2', title: 'Regular session convened at the municipal hall', category: 'Session', excerpt: 'The council met to consider eleven agenda items.', content: '<p>Eleven items were taken up.</p>', publishedAt: '2025-10-14T00:00:00.000Z' },
  { _id: 'news-3', title: 'Municipal hall extends public comment hours', category: 'Announcement', excerpt: 'Comment hours now run to five in the afternoon on weekdays.', content: '<p>Hours extended.</p>', publishedAt: '2025-10-09T00:00:00.000Z' },
  { _id: 'news-4', title: 'Committees report on hearing outcomes', category: 'Committee', excerpt: 'Three committees reported on completed hearings.', content: '<p>Three reports filed.</p>', publishedAt: '2025-10-06T00:00:00.000Z' },
];

export const SESSIONS = [
  { _id: 's1', date: '2025-10-18T00:00:00.000Z', title: 'Regular Session', location: 'Session Hall A', status: 'Final', itemsDiscussed: [{ _id: 'doc-1', number: 'Ord. 2025-0142', title: 'Public utility vehicle regulation' }] },
  { _id: 's2', date: '2025-10-25T00:00:00.000Z', title: 'Regular Session', location: 'Session Hall A', status: 'Scheduled', itemsDiscussed: [] },
  { _id: 's3', date: '2025-11-01T00:00:00.000Z', title: 'Special Session', location: 'Session Hall A', status: 'Scheduled', itemsDiscussed: [] },
  { _id: 's4', date: '2025-11-08T00:00:00.000Z', title: 'Regular Session', location: 'Session Hall A', status: 'Scheduled', itemsDiscussed: [] },
];

export const MEMBERS = [
  { _id: 'm1', name: 'Hon. Juan Dela Cruz', position: 'Municipal Vice Mayor', committee: 'Committee on Appropriations', contactEmail: 'vm@bongabong.gov.ph' },
  { _id: 'm2', name: 'Hon. Maria Ramos', position: 'Councilor', committee: 'Committee on Transportation' },
  { _id: 'm3', name: 'Hon. Liza Villanueva', position: 'Councilor', committee: 'Committee on Public Works' },
  { _id: 'm4', name: 'Hon. Antonio Bautista', position: 'Councilor', committee: 'Committee on Health' },
  { _id: 'm5', name: 'Hon. Rosa Medel', position: 'Councilor', committee: 'Committee on Education' },
];

export const COMMITTEES = [
  { _id: 'c1', name: 'Committee on Public Works', chairperson: 'Hon. Liza Villanueva', viceChairperson: 'Hon. Rosa Medel', description: 'Reviews infrastructure, water supply, and public works proposals.', members: ['Hon. Antonio Bautista', 'Hon. Juan Dela Cruz'] },
  { _id: 'c2', name: 'Committee on Transportation', chairperson: 'Hon. Maria Ramos', description: 'Covers traffic, routes, and public transport franchises.', members: ['Hon. Liza Villanueva'] },
  { _id: 'c3', name: 'Committee on Health', chairperson: 'Hon. Antonio Bautista', description: 'Oversees health services and sanitation policy.', members: ['Hon. Juan Dela Cruz', 'Hon. Rosa Medel'] },
];

/**
 * Opens the document's consultation tab and waits for the panel to settle.
 *
 * The consultation tab is not the default view, so a plain page load never shows
 * the GuestForm, the vote chart, or the sentiment count. Without an interaction
 * hook in the capture scripts, the single most stateful surface in the portal had
 * no visual coverage at all.
 */
const openConsultationTab = async (page) => {
  const tab = page.locator('button.v11-tab', { hasText: /Consultation \(Active\)|Konsultasyon \(Aktibo\)|Submit Feedback|Magbigay ng Komento/ }).first();
  await tab.waitFor({ state: 'visible', timeout: 15000 });
  await tab.click();
  // A capture taken before Radix swaps the panel would silently record the
  // previous tab's pixels under this route's name.
  await page.locator('input[name="vote"]').first().waitFor({ state: 'visible', timeout: 15000 });
};

/**
 * Route table: [name, path, prepare?].
 *
 * `prepare` runs after navigation and before the screenshot, letting a route
 * reach a state that is not the default view. capture-screenshots.mjs and
 * visual-diff.mjs both consume this table so the recorded evidence and the
 * compared evidence can never describe different states.
 */
export const ROUTES = [
  ['home', '/'],
  ['ordinances', '/ordinances'],
  ['resolutions', '/resolutions'],
  ['sessions', '/sessions'],
  ['members', '/members'],
  ['committees', '/committees'],
  ['news', '/news'],
  ['about', '/about'],
  ['mission-vision', '/mission-vision'],
  ['document-detail', '/document/doc-1'],
  ['document-resolution', '/document/res-1'],
  ['document-consultation', '/document/doc-3', openConsultationTab],
  ['news-detail', '/news/news-1'],
];

export const VIEWPORTS = [
  ['mobile', 390, 844],
  ['tablet', 768, 1024],
  ['desktop', 1440, 900],
];

const json = (route, body) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

/** Intercepts the public API so checks render real content, not empty states. */
export async function mockApi(page) {
  await page.route('**/api/public/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/stats')) return json(route, STATS);
    if (url.includes('/documents/') && !url.includes('/documents?')) {
      const id = url.split('/documents/')[1].split('?')[0];
      return json(route, DOCS.find((d) => d._id === id) || DOCS[0]);
    }
    if (url.includes('/documents')) {
      const params = new URL(url).searchParams;
      const status = params.get('status');
      const type = params.get('type');
      // Both filters are honoured. `type` was ignored, so the resolutions archive
      // was served ordinances and captured as such.
      let docs = DOCS;
      if (status && status !== 'All') docs = docs.filter((d) => d.status === status);
      if (type && type !== 'All') docs = docs.filter((d) => d.type === type);
      return json(route, { docs, pages: 1, total: docs.length });
    }
    if (url.includes('/consult/')) return json(route, { data: [] });
    if (url.includes('/news/') && !url.includes('/news?')) {
      const id = url.split('/news/')[1].split('?')[0];
      return json(route, { data: NEWS.find((n) => n._id === id) || NEWS[0] });
    }
    if (url.includes('/news')) return json(route, { data: NEWS });
    if (url.includes('/recent-sessions')) return json(route, [SESSIONS[0]]);
    if (url.includes('/sessions')) return json(route, { docs: SESSIONS, pages: 1 });
    if (url.includes('/members')) return json(route, MEMBERS);
    if (url.includes('/committees')) return json(route, { docs: COMMITTEES });
    if (url.includes('/terms')) return json(route, TERMS);
    return json(route, {});
  });

  // No check should reach the public internet.
  await page.route('https://www.youtube.com/**', (r) => r.abort());
  await page.route('https://picsum.photos/**', (r) => r.abort());
}

export async function waitForServer(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try { if ((await fetch(url)).ok) return true; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`preview server did not become ready at ${url}`);
}
