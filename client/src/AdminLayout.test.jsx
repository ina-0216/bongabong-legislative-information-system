import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminLayout } from './App';

vi.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: { name: 'Test Secretary', role: 'Secretary' },
    logout: vi.fn(),
    loading: false,
  }),
}));

vi.mock('./components/features/NotificationPanel', () => ({
  default: () => null,
}));

const originalMatchMedia = window.matchMedia;

function setViewport(isMobile) {
  window.matchMedia = vi.fn((query) => ({
    matches: query.includes('min-width') ? !isMobile : isMobile,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

function renderShell() {
  return render(
    <MemoryRouter>
      <AdminLayout>
        <h1>Dashboard content</h1>
      </AdminLayout>
    </MemoryRouter>,
  );
}

describe('AdminLayout responsive navigation', () => {
  beforeEach(() => {
    setViewport(true);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('opens the mobile drawer and closes it from the backdrop', () => {
    renderShell();

    const menuButton = screen.getByRole('button', { name: 'Toggle sidebar' });
    const sidebar = document.getElementById('primary-navigation');

    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveAttribute('aria-controls', 'primary-navigation');
    expect(sidebar).toHaveAttribute('aria-hidden', 'true');
    expect(sidebar).toHaveAttribute('inert');
    expect(sidebar.className).toContain('-translate-x-full');
    expect(sidebar.className).toContain('w-[min(85vw,260px)]');

    fireEvent.click(menuButton);

    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(sidebar).toHaveAttribute('aria-hidden', 'false');
    expect(sidebar).not.toHaveAttribute('inert');
    expect(sidebar.className).toContain('translate-x-0');

    fireEvent.click(screen.getByRole('button', { name: 'Close navigation' }));

    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(sidebar).toHaveAttribute('aria-hidden', 'true');
    expect(menuButton).toHaveFocus();
  });

  it('closes the mobile drawer after selecting a route', () => {
    renderShell();
    const menuButton = screen.getByRole('button', { name: 'Toggle sidebar' });

    fireEvent.click(menuButton);
    fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }));

    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveFocus();
  });

  it('exposes the compact desktop navigation when the full sidebar is collapsed', () => {
    setViewport(false);
    renderShell();

    const menuButton = screen.getByRole('button', { name: 'Toggle sidebar' });
    const sidebar = document.getElementById('primary-navigation');

    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(menuButton);

    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(sidebar).toHaveAttribute('aria-hidden', 'true');
    expect(sidebar).toHaveAttribute('inert');
    expect(sidebar.className).toContain('-translate-x-full');

    const compactNavigation = screen.getByLabelText('Collapsed navigation');
    expect(compactNavigation).toHaveAttribute('aria-hidden', 'false');
    expect(compactNavigation).not.toHaveAttribute('inert');
  });
});
