import { Tag, Landmark } from 'lucide-react';
import CommitteeBadge from '../features/CommitteeBadge';
import TypeBadge from '../features/TypeBadge';
import { Badge } from '@ibosys/ui';
import { normalizeStatus } from '../../constants/stages';

export default function OrdinanceOverviewTab({ ord }) {
  return (
    <div className="space-y-6">
      <div className="bg-muted/40 rounded-xl p-5 border border-border space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <Tag size={13} /> Committee: <span className="text-foreground normal-case font-semibold"><CommitteeBadge committee={ord.committee} /></span>
        </div>
        {ord.enactingClause && (
          <div className="bg-card border-l-4 border-primary pl-4 py-2 pr-3 rounded-r-md">
            <p className="text-sm font-medium text-foreground leading-relaxed">{ord.enactingClause}</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</div>
            <div className="mt-1"><Badge variant="status" status={normalizeStatus(ord.status)} dot size="sm">{ord.status || 'Draft'}</Badge></div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</div>
            <div className="mt-1"><TypeBadge type={ord.type} /></div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sponsor</div>
            <div className="mt-1 text-sm font-semibold text-foreground flex items-center gap-1.5"><Landmark size={13} className="text-primary" /> {ord.proponentId?.name || 'N/A'}</div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Explanatory Note</h3>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{ord.explanatoryNote}</p>
      </div>

      {ord.plainLanguageSummary && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Plain Language Summary</h4>
          <p className="text-sm text-foreground leading-relaxed">{ord.plainLanguageSummary}</p>
        </div>
      )}
    </div>
  );
}