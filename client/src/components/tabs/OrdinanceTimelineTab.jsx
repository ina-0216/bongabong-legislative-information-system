import { Calendar, User } from 'lucide-react';

export default function OrdinanceTimelineTab({ ord, selectedStages }) {
  const stages = selectedStages;
  const legacyRejection = !!ord.legacyRejection || (ord.type === 'Ordinance' && ord.adoptionResult?.trim().toLowerCase() === 'rejected');
  const rejected = ord.status === 'Rejected' || legacyRejection;
  const lastRecordedStage = ord.timeline?.filter(entry => entry.status !== 'Rejected').slice(-1)[0]?.status;
  const decisionStage = ord.rejection?.stage || lastRecordedStage;
  const currentIndex = stages.indexOf(rejected ? decisionStage : ord.status);

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-border" />
        {stages.map((stage, idx) => {
          const isDone = rejected ? idx <= currentIndex : idx < currentIndex;
          const isCurrent = !rejected && ord.status === stage;
          const isFuture = idx > currentIndex;
          const entry = ord.timeline?.find(t => t.status === stage);

          return (
            <div key={stage} className="relative flex gap-4 pb-6 last:pb-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${
                isCurrent ? 'bg-primary border-primary text-white' :
                isDone ? 'bg-emerald-500 border-emerald-500 text-white' :
                'bg-card border-border text-muted-foreground'
              }`}>
                {isDone || isCurrent ? '✓' : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-bold ${isFuture ? 'text-muted-foreground' : 'text-foreground'}`}>{stage}</span>
                  {isCurrent && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Current</span>}
                </div>
                {entry && (
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar size={11} /> {new Date(entry.date).toLocaleString('en-PH')}
                    <User size={11} /> {entry.updatedBy?.name || 'Unknown'}
                  </div>
                )}
                {entry?.notes && <p className="mt-1 text-sm text-foreground/80">{entry.notes}</p>}
                {entry?.session && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Session: <span className="font-medium text-foreground">{entry.session.title}</span>
                    {entry.session.date && ` · ${new Date(entry.session.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {rejected && (
          <div className="relative flex gap-4 pb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-destructive bg-destructive/10 font-bold text-destructive">×</div>
            <div className="min-w-0 flex-1 pt-1">
              <span className="text-sm font-bold text-destructive">Rejected</span>
              {!legacyRejection && ord.rejection?.stage && <span className="ml-2 text-xs text-muted-foreground">at {ord.rejection.stage}</span>}
              {!legacyRejection && ord.rejection?.recordedAt && <p className="mt-1 text-xs text-muted-foreground">{new Date(ord.rejection.recordedAt).toLocaleString('en-PH')}</p>}
              {!legacyRejection && ord.rejection?.reason && <p className="mt-1 text-sm text-foreground/80">{ord.rejection.reason}</p>}
              {!legacyRejection && ord.rejection?.minutesReference && <p className="mt-1 text-xs text-muted-foreground">Minutes: {ord.rejection.minutesReference}</p>}
            </div>
          </div>
        )}
        {legacyRejection && <p className="ml-14 pb-4 text-xs text-muted-foreground">Legacy record: no formal rejection details were recorded.</p>}
      </div>
    </div>
  );
}
