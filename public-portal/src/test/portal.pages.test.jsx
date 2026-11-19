import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext.jsx';
import Home from '../pages/Home.jsx';
import Ordinances from '../pages/Ordinances.jsx';
import Sessions from '../pages/Sessions.jsx';
import Members from '../pages/Members.jsx';
import Committees from '../pages/Committees.jsx';
import About from '../pages/About.jsx';
import MissionVision from '../pages/MissionVision.jsx';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import DownloadModal from '../components/DownloadModal.jsx';

// vi.mock is hoisted above module-level consts, so the fetchers are created
// through vi.hoisted to keep them initialised before the factory runs.
// Only `fetchers` is destructured: the fixtures stay scoped to the factory.
const { fetchers } = vi.hoisted(() => {
  const recordDocs = [
    { _id: 'd1', number: 'Ord. 2025-001', title: 'A measure about something', plainLanguageSummary: 'A public summary.', sectorTag: 'Public Works', status: 'First Reading', committee: 'Committee on Public Works', createdAt: '2025-10-01T00:00:00.000Z', filedAt: '2025-10-02T00:00:00.000Z', proponentId: { firstName: 'Juan', lastName: 'Dela Cruz' } },
  ];
  const consultationDocs = [
    { _id: 'd2', number: 'Ord. 2025-002', title: 'An open measure', plainLanguageSummary: 'Open for comment.', status: 'Public Consultation', committee: 'Committee on Health', createdAt: '2025-10-05T00:00:00.000Z', filedAt: '2025-10-05T00:00:00.000Z', proponentId: { firstName: 'Example', lastName: 'Sponsor' } },
  ];
  return {
    fetchers: {
      getStats: vi.fn(async () => ({ totalOrdinances: 12, totalResolutions: 7, approvedOrdinances: 4, approvedResolutions: 2 })),
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

beforeEach(() => {
  Object.values(fetchers).forEach((fn) => fn.mockClear());
});

describe('Home — v11 band structure', () => {
  it('renders the bands in the approved order', async () => {
    const { container } = renderPage(<Home />);
    await screen.findByRole('heading', { level: 1 });

    const order = ['council', 'news', 'sessions', 'consultation', 'records', 'help'];
    const positions = order.map((id) => container.querySelector(`#${id}`)?.getAttribute('id') ?? -1);
    expect(positions.every((value) => value !== -1)).toBe(true);

    const sorted = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sorted);
  });

  it('pairs news with sessions and open comments with latest records', async () => {
    const { container } = renderPage(<Home />);
    await screen.findByRole('heading', { level: 1 });

    expect(container.querySelector('[data-home-pair="news-sessions"] #news')).toBeInTheDocument();
    expect(container.querySelector('[data-home-pair="news-sessions"] #sessions')).toBeInTheDocument();
    expect(container.querySelector('[data-home-pair="consultation-records"] #consultation')).toBeInTheDocument();
    expect(container.querySelector('[data-home-pair="consultation-records"] #records')).toBeInTheDocument();
    expect(container.querySelector('#consultation')).toHaveClass('v11-home-pair-panel');
    expect(container.querySelector('#records')).toHaveClass('v11-home-pair-panel');
  });

  it('has exactly one h1', async () => {
    const { container } = renderPage(<Home />);
    await screen.findByRole('heading', { level: 1 });
    expect(container.querySelectorAll('h1')).toHaveLength(1);
  });

  it('never places a photograph inside a records list', async () => {
    const { container } = renderPage(<Home />);
    await screen.findByRole('heading', { level: 1 });
    expect(container.querySelectorAll('.v11-records img')).toHaveLength(0);
  });

  it('shows the counts band bound to live stats', async () => {
    renderPage(<Home />);
    expect(await screen.findByText('Approved ordinances')).toBeInTheDocument();
    expect(await screen.findByText('Approved resolutions')).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
  });

  // Regression: the band used to render `consultations.length`, which comes
  // from a `limit: 3` query, so the stat claimed the portal had at most three
  // open consultations. The authoritative total is stats.inConsultation.
  it('reports the real open-for-comment total, not the length of the preview list', async () => {
    fetchers.getStats.mockResolvedValueOnce({
      totalOrdinances: 12,
      totalResolutions: 7,
      approvedOrdinances: 4,
      approvedResolutions: 2,
      inConsultation: 47,
    });
    fetchers.getDocuments.mockResolvedValueOnce({ docs: [], pages: 1 });

    renderPage(<Home />);

    // Scope to the counts band: "Open for comment" is also the consultation
    // section heading, so an unscoped text query matches twice.
    const statsBand = (await screen.findByText('Open for comment', {
      selector: '.v11-stat dt',
    })).closest('.v11-stat');
    expect(statsBand.querySelector('dd')).toHaveTextContent('47');
  });

  // Regression: the lead article was an h3 while its sibling list items were
  // h4, putting the section's secondary stories one level below the lead.
  it('keeps lead and secondary news titles at the same heading level', async () => {
    fetchers.getNews.mockResolvedValueOnce({
      data: [
        { _id: 'n1', title: 'Lead update', category: 'Agriculture', publishedAt: '2025-10-17T00:00:00.000Z' },
        { _id: 'n2', title: 'Second update', category: 'Health', publishedAt: '2025-10-16T00:00:00.000Z' },
        { _id: 'n3', title: 'Third update', category: 'Education', publishedAt: '2025-10-15T00:00:00.000Z' },
      ],
    });

    renderPage(<Home />);

    expect(await screen.findByText('Lead update')).toBeInTheDocument();
    const newsSection = document.querySelector('#news');
    const levels = [...newsSection.querySelectorAll('h3, h4')].map((el) => el.tagName);
    expect(new Set(levels).size).toBe(1);
  });
});

describe('Ordinances — archive controls', () => {
  it('renders the document type toggle and both Radix selects', async () => {
    renderPage(<Ordinances />);
    expect(await screen.findByRole('button', { name: /ordinances/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Committee' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument();
  });

  it('keeps record actions visible rather than hover-only', async () => {
    const { container } = renderPage(<Ordinances />);
    await screen.findByRole('button', { name: /ordinances/i });
    await screen.findByText('A measure about something');
    // The pre-overhaul markup hid these with `opacity-0 group-hover:opacity-100`.
    expect(container.innerHTML).not.toContain('group-hover:opacity-100');
    const actions = container.querySelector('.v11-record .v11-record-aside');
    expect(actions).toHaveTextContent('First Reading');
    expect(actions.querySelectorAll('a')).toHaveLength(2);
    expect(actions.querySelector('[aria-label*="View details"]')).toBeInTheDocument();
    expect(actions.querySelector('[aria-label*="Download PDF"]')).toBeInTheDocument();
  });

  it('renders summaries, filing dates, and sector tags from the public API contract', async () => {
    const { container } = renderPage(<Ordinances />);
    await screen.findByText('A measure about something');

    expect(screen.getByText('A public summary.')).toBeInTheDocument();
    expect(screen.getByText('Public Works')).toBeInTheDocument();
    expect(container.querySelector('.v11-record-extra')).toHaveTextContent(
      new Date('2025-10-02T00:00:00.000Z').toLocaleDateString(),
    );
  });
});

describe('Sessions', () => {
  it('renders session rows and hides pagination for a single page', async () => {
    renderPage(<Sessions />);
    expect(await screen.findByText('Regular session')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });
});

describe('Members', () => {
  it('uses a monogram instead of a stock portrait when no photo exists', async () => {
    const { container } = renderPage(<Members />);
    await screen.findByText('Sangguniang Bayan members');
    expect(container.querySelectorAll('.v11-monogram').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.v11-member img').length).toBe(0);
  });

  it('keeps full committee titles collapsed under role counts until requested', async () => {
    fetchers.getMembers.mockResolvedValue([{
      _id: 'm2',
      name: 'Hon. Example Member',
      position: 'SB Member',
      committeeRoles: [
        { committeeName: 'Committee on Health, Livelihood and Civil Society Organizations', role: 'Chair' },
        { committeeName: 'Committee on Education, Culture and Arts, Legal Matters, House Rules, Ordinances, Technical and Vocational Education, Good Governance, Public Ethics and Accountability', role: 'Vice Chair' },
        { committeeName: 'Committee on Barangay Affairs', role: 'Member' },
      ],
    }]);

    const { container } = renderPage(<Members />);
    const summary = await screen.findByText('View all 3 committee assignments');
    const disclosure = summary.closest('details');

    expect(disclosure.open).toBe(false);
    expect(container.querySelectorAll('.v11-member-role-summary li')).toHaveLength(3);
    expect(container.querySelector('.v11-member-assignment-groups')).not.toBeVisible();

    fireEvent.click(summary);

    expect(disclosure.open).toBe(true);
    expect(screen.getByText('Committee on Health, Livelihood and Civil Society Organizations')).toBeInTheDocument();
    expect(screen.getByText('Vice Chair', { selector: '.v11-member-assignment-groups h4' })).toBeInTheDocument();
  });

  it('lets readers expand a long biography without making every card tall', async () => {
    fetchers.getMembers.mockResolvedValue([{
      _id: 'm3',
      name: 'Hon. Example Member',
      position: 'SB Member',
      biography: 'A reviewed member biography with enough detail to exceed the compact three-line preview. '.repeat(5),
    }]);

    const { container } = renderPage(<Members />);
    const readMore = await screen.findByRole('button', { name: 'Read full biography' });
    expect(container.querySelector('.v11-member-biography.is-clamped')).toBeInTheDocument();

    fireEvent.click(readMore);

    expect(readMore).toHaveAttribute('aria-expanded', 'true');
    expect(container.querySelector('.v11-member-biography.is-clamped')).not.toBeInTheDocument();
  });
});

describe('Committees', () => {
  it('lists a committee with its leadership', async () => {
    renderPage(<Committees />);
    expect(await screen.findByText('Committee on Public Works')).toBeInTheDocument();
    expect(screen.getByText('Hon. Example')).toBeInTheDocument();
  });
});

describe('Static civic pages', () => {
  it('About renders the seal and the process steps', async () => {
    renderPage(<About />);
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('The official seal')).toBeInTheDocument();
    expect(screen.getByText('First reading')).toBeInTheDocument();
  });

  it('MissionVision renders the vision as a blockquote', async () => {
    renderPage(<MissionVision />);
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/To forge a resilient, transparent/)).toBeInTheDocument();
  });

});

describe('Shell', () => {
  it('Navbar keeps the brand and exposes a labelled nav toggle', () => {
    renderPage(<Navbar />);
    expect(screen.getByText(/b-lis/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Contact Me' })).not.toBeInTheDocument();
  });

  it('Footer is a contentinfo landmark', () => {
    renderPage(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('opens the Android install dialog with a working link and matching QR code', async () => {
    renderPage(<DownloadModal installUrl="https://expo.dev/install/blis" />);

    fireEvent.click(screen.getByRole('button', { name: 'Download B-LIS for Android' }));

    expect(await screen.findByRole('heading', { name: 'Get B-LIS for Android' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download B-LIS for Android' }))
      .toHaveAttribute('href', 'https://expo.dev/install/blis');
    expect(screen.getByRole('img', { name: 'QR code for the B-LIS Android install page' }))
      .toBeInTheDocument();
  });

  it('does not expose an insecure or missing Android install URL', () => {
    const { rerender } = renderPage(<DownloadModal installUrl="http://example.com/app.apk" />);
    expect(screen.queryByRole('button', { name: 'Download B-LIS for Android' })).not.toBeInTheDocument();

    rerender(
      <LanguageProvider>
        <MemoryRouter><DownloadModal installUrl="" /></MemoryRouter>
      </LanguageProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Download B-LIS for Android' })).not.toBeInTheDocument();
  });
});
