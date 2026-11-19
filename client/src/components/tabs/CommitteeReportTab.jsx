import { FileText, User } from 'lucide-react';

export default function CommitteeReportTab({ ord, commReport, setCommReport, savingReport, saveCommitteeReport }) {
  return (
    <div className="space-y-5">
      {ord.committeeReport ? (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <FileText size={16} className="text-primary" /> Committee Hearing Report
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Findings</div>
              <p className="mt-1 text-foreground whitespace-pre-wrap">{ord.committeeReport.findings || '—'}</p>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recommendation</div>
              <p className="mt-1 text-foreground whitespace-pre-wrap">{ord.committeeReport.recommendation || '—'}</p>
            </div>
          </div>
          <div className="pt-3 border-t border-border text-xs text-muted-foreground flex items-center gap-1.5">
            <User size={12} /> Prepared by {ord.committeeReport.createdBy?.name || 'Unknown'}
            · Recorded {new Date(ord.committeeReport.createdAt).toLocaleString('en-PH')}
          </div>
        </div>
      ) : (
        <div className="bg-muted/30 border border-border rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">No committee report has been submitted for this ordinance yet.</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Submit / Edit Committee Report</h4>
        <div>
          <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Findings</label>
          <textarea
            rows={3}
            value={commReport.findings}
            onChange={e => setCommReport(p => ({ ...p, findings: e.target.value }))}
            placeholder="Write the committee hearing findings…"
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Recommendation</label>
          <textarea
            rows={2}
            value={commReport.recommendation}
            onChange={e => setCommReport(p => ({ ...p, recommendation: e.target.value }))}
            placeholder="Committee recommendation…"
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={saveCommitteeReport}
            disabled={savingReport}
            className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {savingReport ? 'Saving…' : 'Save Report'}
          </button>
        </div>
      </div>
    </div>
  );
}