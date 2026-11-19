import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';

const state = vi.hoisted(() => ({
  stats: {},
  ordinancePage: { docs: [] },
  committeePage: { docs: [] },
}));

vi.mock('../utils/api', () => ({
  api: { getStats: vi.fn(), getOrdinances: vi.fn(), getCommittees: vi.fn() },
}));

vi.mock('../hooks/useApi', () => ({
  useApiQuery: (key) => {
    if (key === 'stats') return { data: state.stats, isLoading: false };
    if (Array.isArray(key)) {
      return { data: key[0] === 'ordinances' ? state.ordinancePage : state.committeePage, isLoading: false };
    }
    return { data: state.ordinancePage, isLoading: false };
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Test User' } }),
}));

vi.mock('recharts', async () => {
  const React = await import('react');
  const Wrapper = ({ children }) => React.createElement('div', null, children);
  return {
    ResponsiveContainer: Wrapper,
    BarChart: ({ children, data }) => React.createElement(
      'div',
      { 'data-testid': 'bar-chart', 'data-chart': JSON.stringify(data ?? []) },
      children,
    ),
    Bar: ({ dataKey, name }) => React.createElement('div', { 'data-series': dataKey, 'data-bar-name': name }),
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    LabelList: () => null,
    Cell: () => null,
  };
});

const renderDashboard = () => render(
  <MemoryRouter>
    <Dashboard />
  </MemoryRouter>,
);

const outcomeCard = () => screen.getByTestId('proponent-outcomes-card');

const outcomeSeries = () => JSON.parse(
  outcomeCard().querySelector('[data-testid="bar-chart"]').getAttribute('data-chart'),
);

beforeEach(() => {
  state.stats = {};
});

describe('proponent outcomes card', () => {
  it('maps outcome counts to numbers and labels both series', () => {
    state.stats = {
      byProponentOutcomes: [{ name: 'Maria Santos', approved: '4', rejected: '2' }],
    };

    renderDashboard();

    const card = outcomeCard();
    expect(within(card).getByText('Proponent Outcomes')).toBeInTheDocument();
    expect(within(card).getByText('Approved')).toBeInTheDocument();
    expect(within(card).getByText('Rejected')).toBeInTheDocument();
    expect(outcomeSeries()).toEqual([{ name: 'Maria Santos', approved: 4, rejected: 2 }]);

    const approvedBar = card.querySelector('[data-series="approved"]');
    const rejectedBar = card.querySelector('[data-series="rejected"]');
    expect(approvedBar).toHaveAttribute('data-bar-name', 'Approved');
    expect(rejectedBar).toHaveAttribute('data-bar-name', 'Rejected');
  });

  it('falls back to Unknown for an unnamed proponent', () => {
    state.stats = { byProponentOutcomes: [{ approved: 1, rejected: 0 }] };

    renderDashboard();

    expect(outcomeSeries()).toEqual([{ name: 'Unknown', approved: 1, rejected: 0 }]);
  });

  it('shows the empty state when no outcomes are recorded', () => {
    state.stats = { byProponentOutcomes: [] };

    renderDashboard();

    expect(screen.getByText('No approved or rejected measures recorded yet.')).toBeInTheDocument();
    expect(outcomeCard().querySelector('[data-testid="bar-chart"]')).toBeNull();
    expect(outcomeCard().querySelector('[data-series="approved"]')).toBeNull();
    expect(outcomeCard().querySelector('[data-series="rejected"]')).toBeNull();
  });
});

describe('dashboard stat cards', () => {
  it('renders all seven stat cards with the rejected total', () => {
    state.stats = {
      totalOrdinances: 12,
      totalResolutions: 3,
      approved: 7,
      rejected: 2,
      inProgress: 5,
      drafts: 4,
      consultation: 1,
    };

    renderDashboard();

    const labels = [
      'Total Ordinances',
      'Resolutions',
      'Approved Measures',
      'Rejected Measures',
      'In Progress',
      'Drafts',
      'Open Consultations',
    ];
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    expect(screen.getByText('Rejected Measures').previousElementSibling).toHaveTextContent('2');
  });

  it('falls back to zero when the rejected total is absent', () => {
    state.stats = {};

    renderDashboard();

    expect(screen.getByText('Rejected Measures').previousElementSibling).toHaveTextContent('0');
  });
});
