import { Link } from 'react-router-dom';
import { Badge } from '@ibosys/ui';
import CommitteeBadge from './CommitteeBadge';
import TypeBadge from './TypeBadge';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { normalizeStatus } from '../../constants/stages';

export default function OrdinanceCard({ ord }) {
  const isAmended = !!ord.amendedByOrdinanceId;
  const displayStatus = ord.legacyRejection || (ord.type === 'Ordinance' && ord.adoptionResult?.trim().toLowerCase() === 'rejected')
    ? 'Rejected'
    : ord.status || 'Draft';

  return (
    <Link
      to={`/ordinances/${ord._id}`}
      // The card's visible text is a title, a number, badges and a summary.
      // A screen reader would read all of that; the label names the record
      // and the action so the destination is unambiguous.
      aria-label={`View ${ord.type || 'Ordinance'} ${ord.number}: ${ord.title}`}
      className="group flex flex-col justify-between bg-card border border-border hover:border-primary/40 rounded-xl p-5 shadow-xs hover:shadow-md transition-all text-decoration-none"
    >
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-1.5 gap-y-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <TypeBadge type={ord.type} size="xs" />
            <span className="inline-block whitespace-nowrap font-mono text-[10px] font-bold text-primary bg-primary/8 border border-primary/20 px-1 py-0.5 rounded shrink-0 leading-none">
              {ord.number}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {isAmended && (
              <Badge variant="default" size="sm" className="shrink-0 whitespace-nowrap bg-rose-50 border-rose-200 text-rose-700 text-[10px] tracking-wide px-1.5 gap-1">
                <AlertTriangle size={10} className="shrink-0" /> Amended
              </Badge>
            )}
            <Badge variant="status" status={normalizeStatus(displayStatus)} dot size="sm" className="shrink-0 whitespace-nowrap text-[10px] tracking-wide px-1.5 gap-1">
              {displayStatus}
            </Badge>
          </div>
        </div>

        <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2 mb-3">
          {ord.title}
        </h3>

        <div className="mb-3">
          <CommitteeBadge committee={ord.committee} />
        </div>

        {ord.plainLanguageSummary && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {ord.plainLanguageSummary}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 mt-4 border-t border-border text-xs text-muted-foreground">
        <span>{new Date(ord.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform text-muted-foreground group-hover:text-primary" />
      </div>
    </Link>
  );
}
