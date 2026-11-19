import { forwardRef, type HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: boolean;
  maxVisiblePages?: number;
  className?: string;
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showPageNumbers = true,
  maxVisiblePages = 5,
  className,
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];

    if (safeTotalPages <= maxVisiblePages) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', safeTotalPages);
      } else if (safeCurrentPage >= safeTotalPages - 2) {
        pages.push(1, '...', safeTotalPages - 3, safeTotalPages - 2, safeTotalPages - 1, safeTotalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', safeTotalPages);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav
      className={twMerge(
        'flex items-center justify-between px-6 py-4 border-t border-[var(--ibosys-border-light)] bg-[var(--ibosys-surface-secondary)]',
        className
      )}
      aria-label="Pagination"
    >
      <button
        type="button"
        className={twMerge(
          'inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--ibosys-surface-primary)] border border-[var(--ibosys-border-default)]',
          'hover:bg-[var(--ibosys-neutral-100)] text-[var(--ibosys-text-primary)] font-medium text-xs rounded-[var(--ibosys-radius-md)]',
          'transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
        )}
        disabled={safeCurrentPage === 1}
        onClick={() => onPageChange(safeCurrentPage - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={14} aria-hidden="true" />
        <span>Previous</span>
      </button>

      {showPageNumbers && (
        <div className="flex items-center gap-1.5" role="navigation" aria-label="Page numbers">
          {pageNumbers.map((page, index) => (
            <button
              type="button"
              key={index}
              className={twMerge(
                'min-w-[32px] h-8 px-2 flex items-center justify-center text-xs font-semibold rounded-[var(--ibosys-radius-md)] transition-all',
                page === safeCurrentPage
                  ? 'bg-[var(--ibosys-primary-500)] text-white shadow-[var(--ibosys-shadow-xs)]'
                  : page === '...'
                  ? 'text-[var(--ibosys-text-tertiary)] cursor-default'
                  : 'bg-[var(--ibosys-surface-primary)] hover:bg-[var(--ibosys-neutral-100)] text-[var(--ibosys-text-tertiary)] hover:text-[var(--ibosys-text-primary)] cursor-pointer border border-transparent hover:border-[var(--ibosys-border-default)]'
              )}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...'}
              aria-label={page === '...' ? undefined : `Page ${page}`}
              aria-current={page === safeCurrentPage ? 'page' : undefined}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className={twMerge(
          'inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--ibosys-surface-primary)] border border-[var(--ibosys-border-default)]',
          'hover:bg-[var(--ibosys-neutral-100)] text-[var(--ibosys-text-primary)] font-medium text-xs rounded-[var(--ibosys-radius-md)]',
          'transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
        )}
        disabled={safeCurrentPage === safeTotalPages}
        onClick={() => onPageChange(safeCurrentPage + 1)}
        aria-label="Next page"
      >
        <span>Next</span>
        <ChevronRight size={14} aria-hidden="true" />
      </button>
    </nav>
  );
};
