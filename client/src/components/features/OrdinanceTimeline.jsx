import { Check } from 'lucide-react';
import { getStagesForType } from '../../constants/stages';

export default function OrdinanceTimeline({ ordinance }) {
  const stages = getStagesForType(ordinance?.type);
  const rejectionEntry = ordinance?.timeline?.filter(entry => entry.status === 'Rejected').slice(-1)[0];
  const legacyRejection = !!ordinance?.legacyRejection || (ordinance?.type === 'Ordinance' && ordinance?.adoptionResult?.trim().toLowerCase() === 'rejected');
  const rejected = ordinance?.status === 'Rejected' || legacyRejection;
  const lastRecordedStage = ordinance?.timeline?.filter(entry => entry.status !== 'Rejected').slice(-1)[0]?.status;
  const decisionStage = ordinance?.rejection?.stage || lastRecordedStage;
  const currentIdx = stages.indexOf(rejected ? decisionStage : ordinance?.status);

  return (
    <div className="relative">
      {stages.map((stage, idx) => {
        const done = idx < currentIdx;
        const current = idx === currentIdx;
        const entry = ordinance?.timeline?.find(t => t.status === stage);
        const isLast = idx === stages.length - 1;

        return (
          <div className="relative flex gap-3 pb-5 last:pb-0" key={stage}>
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute left-[13px] top-7 bottom-0 w-px ${done ? 'bg-primary' : 'bg-border'}`}
              />
            )}
            <div
              className={`relative z-10 flex items-center justify-center shrink-0 w-7 h-7 rounded-full border-2 text-[11px] font-bold ${
                done
                  ? 'bg-primary text-primary-foreground border-primary'
                  : current
                    ? 'bg-primary/10 text-primary border-primary'
                    : 'bg-card text-muted-foreground border-border'
              }`}
            >
              {done ? <Check size={12} /> : idx + 1}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div
                className={`flex items-center flex-wrap gap-2 text-sm font-semibold ${
                  done
                    ? 'text-foreground'
                    : current
                      ? 'text-primary'
                      : 'text-muted-foreground'
                }`}
              >
                {stage}
                {current && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {rejected ? 'At rejection' : 'Current'}
                  </span>
                )}
              </div>
              {entry && (
                <>
                  {entry.updatedBy?.name && (
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {`By ${entry.updatedBy.name}`}
                      {entry.date &&
                        ` · ${new Date(entry.date).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}`}
                    </div>
                  )}
                  {entry.notes && (
                    <div className="mt-1 border-l-2 border-border pl-2.5 text-xs italic text-muted-foreground">
                      {entry.notes}
                    </div>
                  )}
                  {entry.session && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Session: <span className="font-medium text-foreground">{entry.session.title}</span>
                      {entry.session.date && ` · ${new Date(entry.session.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
      {rejected && (
        <div className="relative flex gap-3 pt-5">
          <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-destructive bg-destructive/10 text-[10px] font-bold text-destructive">×</div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-destructive">
              Rejected
              {!legacyRejection && ordinance.rejection?.stage && <span className="text-xs font-medium text-muted-foreground">at {ordinance.rejection.stage}</span>}
            </div>
            {!legacyRejection && (ordinance.rejection?.recordedBy?.name || rejectionEntry?.updatedBy?.name || ordinance.rejection?.recordedAt || rejectionEntry?.date) && (
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {ordinance.rejection?.recordedBy?.name || rejectionEntry?.updatedBy?.name || 'Recorded'}
                {(ordinance.rejection?.recordedAt || rejectionEntry?.date) && ` · ${new Date(ordinance.rejection?.recordedAt || rejectionEntry?.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </div>
            )}
            {!legacyRejection && (ordinance.rejection?.reason || rejectionEntry?.notes) && (
              <div className="mt-1 border-l-2 border-destructive/40 pl-2.5 text-xs text-muted-foreground">
                {ordinance.rejection?.reason || rejectionEntry?.notes}
              </div>
            )}
            {!legacyRejection && ordinance.rejection?.minutesReference && (
              <div className="mt-1 text-[11px] text-muted-foreground">Minutes: <span className="font-medium text-foreground">{ordinance.rejection.minutesReference}</span></div>
            )}
            {!legacyRejection && (ordinance.rejection?.session?.title || rejectionEntry?.session?.title) && (
              <div className="mt-1 text-[11px] text-muted-foreground">Session: <span className="font-medium text-foreground">{ordinance.rejection?.session?.title || rejectionEntry.session.title}</span></div>
            )}
            {!legacyRejection && ordinance.rejection?.voteTally && Object.values(ordinance.rejection.voteTally).some(value => Number.isFinite(value)) && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                Vote tally: {[
                  ['For', ordinance.rejection.voteTally.votesFor],
                  ['Against', ordinance.rejection.voteTally.votesAgainst],
                  ['Abstentions', ordinance.rejection.voteTally.abstentions],
                  ['Absent', ordinance.rejection.voteTally.absent],
                ].filter(([, value]) => Number.isFinite(value)).map(([label, value]) => `${label} ${value}`).join(' · ')}
              </div>
            )}
          </div>
        </div>
      )}
      {legacyRejection && <p className="ml-10 pt-2 text-xs text-muted-foreground">Legacy record: no formal rejection details were recorded.</p>}
    </div>
  );
}
