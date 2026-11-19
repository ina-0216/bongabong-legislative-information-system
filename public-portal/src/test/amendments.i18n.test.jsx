import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import DocumentDetail from '../pages/DocumentDetail.jsx';
import { LanguageProvider, useLanguage } from '../context/LanguageContext.jsx';

const { api } = vi.hoisted(() => ({
  api: {
    getDocumentDetail: vi.fn(),
    getPublicFeedback: vi.fn(),
  },
}));

vi.mock('../utils/api', () => ({
  api,
  mediaUrl: (url) => url,
  publicDocumentPdfUrl: (id, download = false) => `/api/public/documents/${id}/pdf${download ? '?download=true' : ''}`,
  createPdfFilename: (...parts) => `${parts.filter(Boolean).join(' - ')}.pdf`,
  cloudinaryPdfDownloadUrl: (url) => url,
}));

function LanguageToggle() {
  const { language, toggle } = useLanguage();
  return <button type="button" onClick={toggle}>{language}</button>;
}

const amendedDocument = {
  _id: 'measure-1',
  type: 'Ordinance',
  number: 'Ord. 2026-001',
  title: 'A measure title',
  status: 'Approved',
  pdfUrl: 'https://res.cloudinary.com/ibosys/raw/upload/official-measure.pdf',
  amendedByOrdinanceId: { _id: 'measure-2', number: 'Ord. 2026-002' },
  amendsOrdinanceId: {
    _id: 'measure-0',
    number: 'Ord. 2025-099',
    title: 'Earlier title (Original)',
  },
};

function renderDetail() {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/document/measure-1']}>
        <LanguageToggle />
        <Routes>
          <Route path="/document/:id" element={<DocumentDetail />} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>
  );
}

describe('amendment notices', () => {
  beforeEach(() => {
    api.getDocumentDetail.mockReset();
    api.getPublicFeedback.mockReset();
    api.getDocumentDetail.mockResolvedValue(amendedDocument);
  });

  it('renders amendment relationships and dynamic document details in English and Tagalog', async () => {
    renderDetail();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This measure has been amended and superseded by a newer version.'
    );
    expect(screen.getByRole('link', { name: /View Ord\. 2026-002/ })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(
      'This measure amends Ord. 2025-099 — Earlier title.'
    );
    expect(screen.getByRole('link', { name: 'View PDF' })).toHaveAttribute(
      'href',
      amendedDocument.pdfUrl
    );
    expect(screen.getByRole('link', { name: 'Download Copy' })).toHaveAttribute(
      'href',
      amendedDocument.pdfUrl
    );
    expect(screen.getByRole('link', { name: 'Download Copy' })).toHaveAttribute('download');

    fireEvent.click(screen.getByRole('button', { name: 'en' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ang panukalang ito ay sinusugan at pinalitan ng mas bagong bersyon.'
    );
    expect(screen.getByRole('link', { name: /Tingnan ang Ord\. 2026-002/ })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(
      'Ang panukalang ito ay nag-aamyenda sa Ord. 2025-099 — Earlier title.'
    );
  });

  it('offers the generated public PDF when no official PDF was uploaded', async () => {
    api.getDocumentDetail.mockResolvedValue({ ...amendedDocument, pdfUrl: undefined });
    renderDetail();

    await screen.findByText(amendedDocument.title, { selector: '.v11-doc-title' });
    expect(screen.getByRole('link', { name: 'View PDF' })).toHaveAttribute(
      'href',
      '/api/public/documents/measure-1/pdf'
    );
    expect(screen.getByRole('link', { name: 'Download Copy' })).toHaveAttribute(
      'href',
      '/api/public/documents/measure-1/pdf?download=true'
    );
  });

  it('renders public feedback without legacy submitter identity fields', async () => {
    api.getPublicFeedback.mockResolvedValue([{
      _id: 'feedback-1',
      vote: 'Agree',
      comment: 'Residents support the change.',
      sentiment: 'Positive',
      createdAt: '2026-10-10T00:00:00.000Z',
      full_name: 'Private Resident',
      barangay: 'Private Barangay',
    }]);
    renderDetail();

    await userEvent.click(await screen.findByRole('tab', { name: 'Public comments' }));
    await waitFor(() => expect(api.getPublicFeedback).toHaveBeenCalled());

    expect(await screen.findByText('Anonymous resident')).toBeInTheDocument();
    expect(screen.getByText('Residents support the change.')).toBeInTheDocument();
    expect(screen.queryByText('Private Resident')).not.toBeInTheDocument();
    expect(screen.queryByText('Private Barangay')).not.toBeInTheDocument();
  });
});
