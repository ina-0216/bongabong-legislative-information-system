import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Circle } from 'lucide-react';
import { StatCard, SectionHeader, Pagination, Modal } from '@ibosys/ui';

const MockIcon = ({ size, className }) => <Circle size={size} className={className} />;

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Client UI Components', () => {
  describe('StatCard', () => {
    it('renders label and value', () => {
      renderWithRouter(
        <StatCard
          icon={MockIcon}
          value="42"
          label="Total Ordinances"
        />
      );
      expect(screen.getByText('Total Ordinances')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders with icon', () => {
      const { container } = renderWithRouter(
        <StatCard icon={MockIcon} value="1" label="Test" />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('SectionHeader', () => {
    it('renders title and subtitle', () => {
      renderWithRouter(
        <SectionHeader
          icon={MockIcon}
          title="Ordinances"
          subtitle="Manage legislative documents"
        />
      );
      expect(screen.getByText('Ordinances')).toBeInTheDocument();
      expect(screen.getByText('Manage legislative documents')).toBeInTheDocument();
    });

    it('renders action button when provided', () => {
      renderWithRouter(
        <SectionHeader
          icon={MockIcon}
          title="Test"
          subtitle="Test"
          actionLabel="Add"
          onAction={() => {}}
        />
      );
      expect(screen.getByText('Add')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('renders page numbers', () => {
      renderWithRouter(
        <Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />
      );
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('calls onPageChange when page clicked', () => {
      const mockOnChange = vi.fn();
      renderWithRouter(
        <Pagination currentPage={1} totalPages={5} onPageChange={mockOnChange} />
      );
      fireEvent.click(screen.getByText('2'));
      expect(mockOnChange).toHaveBeenCalledWith(2);
    });
  });

  describe('Modal', () => {
    it('does not render when isOpen is false', () => {
      const { container } = renderWithRouter(
        <Modal isOpen={false} onClose={() => {}} title="Test">
          Content
        </Modal>
      );
      expect(container.querySelector('div')).toBeNull();
    });

    it('renders when isOpen is true', () => {
      renderWithRouter(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          Modal Content
        </Modal>
      );
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });
  });
});