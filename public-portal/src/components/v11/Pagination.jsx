import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Shared pagination. The same prev/next markup was duplicated across
 * Ordinances, Resolutions and Sessions; this is the single version.
 */
export default function Pagination({ page, pageCount, onPageChange }) {
  if (!pageCount || pageCount <= 1) return null;

  const changePage = (nextPage) => {
    onPageChange(nextPage);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  return (
    <div className="v11-pagination">
      <span className="v11-pagination-count">Page {page} of {pageCount}</span>
      <nav aria-label="Pagination" className="v11-pagination-nav">
        <button
          type="button"
          className="v11-btn v11-btn-quiet v11-btn-sm"
          disabled={page === 1}
          onClick={() => changePage(page - 1)}
        >
          <ChevronLeft size={15} aria-hidden="true" /> Previous
        </button>
        <button
          type="button"
          className="v11-btn v11-btn-quiet v11-btn-sm"
          disabled={page === pageCount}
          onClick={() => changePage(page + 1)}
        >
          Next <ChevronRight size={15} aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
