import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext.jsx';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

// Navbar and Footer read their labels from LanguageContext, so the provider
// is part of the contract they are rendered under.
const renderWithRouter = (ui) => render(
  <LanguageProvider>
    <MemoryRouter>{ui}</MemoryRouter>
  </LanguageProvider>
);

describe('Public Portal Components', () => {
  describe('Navbar', () => {
    it('renders site title and navigation', () => {
      renderWithRouter(<Navbar />);
      expect(screen.getByText(/b-lis/i)).toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('renders footer text', () => {
      renderWithRouter(<Footer />);
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });
  });
});