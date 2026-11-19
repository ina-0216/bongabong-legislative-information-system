import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { sanitizeArticleHtml } from '../utils/sanitizeHtml';
import { LanguageProvider } from '../context/LanguageContext';
import Navbar from '../components/Navbar';

describe('sanitizeArticleHtml', () => {
  it('keeps legitimate rich-text markup', () => {
    const html = '<p>Approved on <strong>first reading</strong>.</p><ul><li>Item one</li></ul>';
    const out = sanitizeArticleHtml(html);
    expect(out).toContain('<strong>first reading</strong>');
    expect(out).toContain('<li>Item one</li>');
  });

  it('removes script elements', () => {
    const out = sanitizeArticleHtml('<p>ok</p><script>alert(1)</script>');
    expect(out).not.toContain('script');
    expect(out).toContain('ok');
  });

  it('removes inline event handlers', () => {
    const out = sanitizeArticleHtml('<img src="x" onerror="alert(1)" alt="a">');
    expect(out.toLowerCase()).not.toContain('onerror');
  });

  it('removes javascript: URLs on links', () => {
    const out = sanitizeArticleHtml('<a href="javascript:alert(1)">click</a>');
    expect(out.toLowerCase()).not.toContain('javascript:');
  });

  it('removes style attributes and style elements', () => {
    const out = sanitizeArticleHtml('<p style="position:fixed">hi</p><style>body{}</style>');
    expect(out).not.toContain('position:fixed');
    expect(out).not.toContain('<style');
  });

  it('handles empty and non-string input safely', () => {
    expect(sanitizeArticleHtml('')).toBe('');
    expect(sanitizeArticleHtml(null)).toBe('');
    expect(sanitizeArticleHtml(undefined)).toBe('');
    expect(sanitizeArticleHtml(42)).toBe('');
  });
});

describe('language toggle', () => {
  const renderNav = () => render(
    <LanguageProvider>
      <MemoryRouter><Navbar /></MemoryRouter>
    </LanguageProvider>
  );

  it('starts in English and switches the nav to Tagalog', () => {
    renderNav();
    expect(screen.getByRole('button', { name: 'Switch language' })).toHaveTextContent('FL');
    expect(screen.getByRole('link', { name: 'Ordinance' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Search' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Switch language' }));

    expect(screen.getByRole('link', { name: 'Ordinansa' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ordinance' })).not.toBeInTheDocument();
  });

  it('keeps the document lang attribute in step with the toggle', () => {
    renderNav();
    expect(document.documentElement.getAttribute('lang')).toBe('en');

    fireEvent.click(screen.getByRole('button', { name: 'Switch language' }));

    expect(document.documentElement.getAttribute('lang')).toBe('tl');
  });

  it('offers a link back to English once switched', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: 'Switch language' }));

    const toggle = screen.getByRole('button', { name: 'Palitan ang wika' });
    expect(toggle).toHaveTextContent('EN');
  });

  it('keeps Filipino locale metadata while showing FL as the English-state label', () => {
    renderNav();
    const toggle = screen.getByRole('button', { name: 'Switch language' });
    expect(toggle).toHaveTextContent('FL');
    expect(toggle).toHaveAttribute('lang', 'tl');
  });
});
