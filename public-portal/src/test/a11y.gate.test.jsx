import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axe from 'axe-core';

import { LanguageProvider } from '../context/LanguageContext.jsx';
import Home from '../pages/Home.jsx';
import Ordinances from '../pages/Ordinances.jsx';
import Resolutions from '../pages/Resolutions.jsx';
import Sessions from '../pages/Sessions.jsx';
import Members from '../pages/Members.jsx';
import Committees from '../pages/Committees.jsx';
import About from '../pages/About.jsx';
import MissionVision from '../pages/MissionVision.jsx';
import News from '../pages/News.jsx';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

const { fetchers } = vi.hoisted(() => {
  const recordDocs = [
    { _id: 'd1', number: 'Ord. 2025-001', title: 'A measure about something', description: 'A summary.', status: 'First Reading', committee: 'Committee on Public Works', createdAt: '2025-10-01T00:00:00.000Z', author: 'Hon. Example' },
  ];
  const consultationDocs = [
    { _id: 'd2', number: 'Ord. 2025-002', title: 'An open measure', description: 'Open for comment.', status: 'Public Consultation', committee: 'Committee on Health', createdAt: '2025-10-05T00:00:00.000Z', author: 'Hon. Sample' },
  ];
  return {
    fetchers: {
      getStats: vi.fn(async () => ({ totalOrdinances: 12, totalResolutions: 7, approved: 4 })),
      getDocuments: vi.fn(async (params) => (params?.status === 'Public Consultation' ? { docs: consultationDocs, pages: 1 } : { docs: recordDocs, pages: 1 })),
      getNews: vi.fn(async () => ({ data: [{ _id: 'n1', title: 'An update', category: 'Agriculture', publishedAt: '2025-10-17T00:00:00.000Z' }] })),
      getSessions: vi.fn(async () => ({ docs: [{ _id: 's1', date: '2025-10-18T00:00:00.000Z', title: 'Regular session', status: 'Final' }], pages: 1 })),
      getMembers: vi.fn(async () => [{ _id: 'm1', name: 'Dela Cruz, Juan', position: 'Councilor' }]),
      getTerms: vi.fn(async () => [{ _id: 't1', label: '2025-2026', isCurrent: true }]),
      getCommittees: vi.fn(async () => [{ _id: 'c1', name: 'Committee on Public Works', chairperson: 'Hon. Example', members: ['Hon. Sample'] }]),
      getRecentSessions: vi.fn(async () => [{ _id: 's1', date: '2025-10-18T00:00:00.000Z', title: 'Regular session' }]),
    },
  };
});

vi.mock('../utils/api', () => ({
  api: fetchers,
  mediaUrl: (value) => (value ? String(value) : ''),
  publicDocumentPdfUrl: (id, download = false) => `/api/public/documents/${id}/pdf${download ? '?download=true' : ''}`,
  createPdfFilename: (...parts) => `${parts.filter(Boolean).join(' - ')}.pdf`,
  cloudinaryPdfDownloadUrl: (url) => url,
}));

const renderPage = (ui) => render(
  <LanguageProvider>
    <MemoryRouter>{ui}</MemoryRouter>
  </LanguageProvider>
);

/**
 * axe cannot compute colour contrast in jsdom (no layout, no resolved
 * stylesheet), so that rule is disabled here. Contrast is verified
 * numerically in the token audit instead; claiming it here would be false.
 */
const AXE_OPTIONS = {
  rules: {
    'color-contrast': { enabled: false },
  },
};

async function expectNoA11yViolations(container, label) {
  const results = await axe.run(container, AXE_OPTIONS);
  const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  const messages = serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length} node/s) [${v.nodes[0]?.target}]`);
  expect(messages, `axe violations on ${label}`).toEqual([]);
}

beforeEach(() => {
  Object.values(fetchers).forEach((fn) => fn.mockClear());
});

describe('axe-core accessibility gate', () => {
  // Component references rather than elements: it.each instantiates one per
  // case, so no key prop is required.
  const pages = [
    ['Home', Home],
    ['Ordinances', Ordinances],
    ['Resolutions', Resolutions],
    ['Sessions', Sessions],
    ['Members', Members],
    ['Committees', Committees],
    ['About', About],
    ['MissionVision', MissionVision],
    ['News', News],
    ['Navbar', Navbar],
    ['Footer', Footer],
  ];

  it.each(pages)('%s has no serious or critical axe violations', async (_label, Component) => {
    const { container } = renderPage(<Component />);
    // let the mocked fetches settle so data-driven content is in the DOM
    await new Promise((resolve) => setTimeout(resolve, 20));
    await expectNoA11yViolations(container, _label);
  });
});
