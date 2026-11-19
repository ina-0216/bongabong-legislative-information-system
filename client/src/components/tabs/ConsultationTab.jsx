import { MessageSquare, ThumbsUp, ThumbsDown, Minus, User } from 'lucide-react';

const VOTE_COLORS = {
  Agree:    { bg: 'bg-emerald-50', text: 'text-emerald-800', icon: ThumbsUp },
  Disagree: { bg: 'bg-red-50', text: 'text-red-700', icon: ThumbsDown },
  Neutral:  { bg: 'bg-slate-100', text: 'text-slate-600', icon: Minus },
  None:     { bg: 'bg-surface-container', text: 'text-on-surface-variant', icon: MessageSquare },
};

export default function ConsultationTab({ ord, feedback, commentFilter, setCommentFilter, loadingFeedback }) {
  const tally = { Agree: 0, Disagree: 0, Neutral: 0, None: 0, ...(feedback?.tally || {}) };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['Agree', 'Disagree', 'Neutral', 'None'].map(v => {
          const Icon = VOTE_COLORS[v].icon;
          return (
            <div key={v} className={`p-4 rounded-xl border ${VOTE_COLORS[v].bg} border-border`}>
              <div className="flex items-center gap-2">
                <Icon size={16} className={VOTE_COLORS[v].text} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{v}</span>
              </div>
              <div className="text-2xl font-bold text-foreground mt-1 tabular-nums">{tally[v]}</div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Barangay</label>
          <select
            value={commentFilter.barangay}
            onChange={e => setCommentFilter(p => ({ ...p, barangay: e.target.value }))}
            className="px-3 py-1.5 bg-background border border-input rounded-md text-xs outline-none focus:border-primary"
          >
            <option value="">All Barangays</option>
            {(ord?._id ? [] : []).map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Sentiment</label>
          <select
            value={commentFilter.sentiment}
            onChange={e => setCommentFilter(p => ({ ...p, sentiment: e.target.value }))}
            className="px-3 py-1.5 bg-background border border-input rounded-md text-xs outline-none focus:border-primary"
          >
            <option value="">All Sentiments</option>
            <option value="Positive">Positive</option>
            <option value="Neutral">Neutral</option>
            <option value="Negative">Negative</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Keyword</label>
          <input
            value={commentFilter.search}
            onChange={e => setCommentFilter(p => ({ ...p, search: e.target.value }))}
            placeholder="Search comments…"
            className="w-full px-3 py-1.5 bg-background border border-input rounded-md text-xs outline-none focus:border-primary"
          />
        </div>
      </div>

      {loadingFeedback ? (
        <div className="flex items-center justify-center p-10"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : (feedback?.feedbacks || []).length === 0 ? (
        <div className="text-center py-12 px-4 border border-border rounded-xl bg-muted/20">
          <MessageSquare size={36} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-bold text-foreground">No public comments yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">New comments appear immediately. A comment under a hide request stays visible until an independent reviewer confirms the decision.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(feedback?.feedbacks || []).map(f => (
            <div key={f._id} className="p-4 rounded-lg border border-border bg-card space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <User size={14} className="text-primary shrink-0" />
                  <span className="text-xs font-bold text-foreground truncate">Anonymous resident</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${VOTE_COLORS[f.vote]?.bg} ${VOTE_COLORS[f.vote]?.text}`}>
                  {f.vote}
                </span>
              </div>
              {f.comment && <p className="text-sm text-foreground/80 italic">"{f.comment}"</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
