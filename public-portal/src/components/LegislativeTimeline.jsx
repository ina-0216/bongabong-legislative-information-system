import { Check, Clock, Circle } from 'lucide-react';
import { Badge } from '@ibosys/ui';
import { useLanguage } from '../context/LanguageContext';

const ORDINANCE_STAGES = [
  'First Reading',
  'Committee Assignment',
  'Committee Hearing',
  'Public Consultation',
  'Second Reading',
  'Third Reading',
  "For Mayor's Signature",
  'For SP Review',
  'Approved'
];

const RESOLUTION_STAGES = [
  'First Reading',
  'Committee Assignment',
  'Third Reading',
  "For Mayor's Signature",
  'Approved'
];

const getStageToken = (stage) => {
  const s = String(stage).toLowerCase();
  if (s === 'first reading') return 'firstReading';
  if (s === 'committee assignment') return 'committeeAssignment';
  if (s === 'committee hearing') return 'committeeHearing';
  if (s === 'public consultation') return 'consultation';
  if (s === 'second reading') return 'secondReading';
  if (s === 'third reading') return 'thirdReading';
  if (s === "for mayor's signature") return 'mayorSignature';
  if (s === 'for sp review') return 'spReview';
  if (s === 'approved') return 'approved';
  return 'draft';
};

const getConnectorColor = (isCompleted) =>
  isCompleted ? 'var(--ibosys-primary-500)' : 'var(--ibosys-border-light)';

const getDotStyle = (isCompleted, isCurrent, stageToken) => {
  if (isCompleted) {
    return 'bg-[var(--ibosys-primary-500)] border-[var(--ibosys-primary-500)]';
  }
  if (isCurrent) {
    return `bg-[var(--ibosys-status-${stageToken}-bg)] border-transparent`;
  }
  return 'bg-[var(--ibosys-surface-primary)] border-[var(--ibosys-border-light)]';
};

const getLabelBadge = (stage, isCompleted, isCurrent, stageToken) => {
  if (isCompleted) {
    return (
      <Badge
        variant="status"
        status="approved"
        dot
        size="sm"
        className="bg-[var(--ibosys-status-approved-bg)] text-[var(--ibosys-status-approved-text)] border-[var(--ibosys-status-approved-border)]"
      >
        {stage}
      </Badge>
    );
  }
  if (isCurrent) {
    return (
      <Badge
        variant="status"
        status={stageToken}
        dot
        size="sm"
      >
        {stage} <span className="ml-1 text-[9px] font-bold uppercase tracking-widest opacity-80">← Current</span>
      </Badge>
    );
  }
  return (
    <Badge
      variant="default"
      size="sm"
      className="bg-[var(--ibosys-surface-primary)] text-[var(--ibosys-text-tertiary)] border-[var(--ibosys-border-light)]"
    >
      {stage}
    </Badge>
  );
};

export default function LegislativeTimeline({ currentStatus, isResolution }) {
  const { t } = useLanguage();
  const stages = isResolution ? RESOLUTION_STAGES : ORDINANCE_STAGES;
  const currentIndex = stages.indexOf(currentStatus);

  return (
    <div className="flex flex-col gap-0" role="list" aria-label={t('ariaLegislativeTimeline')}>
      {stages.map((stage, idx) => {
        const isCompleted = currentStatus === 'Approved' || idx < currentIndex;
        const isCurrent = idx === currentIndex && currentStatus !== 'Approved';
        const isPending = !isCompleted && !isCurrent;
        const stageToken = getStageToken(stage);
        const connectorColor = getConnectorColor(isCompleted);
        const dotStyle = getDotStyle(isCompleted, isCurrent, stageToken);

        return (
          <div key={stage} className="flex items-start gap-3 relative" role="listitem" aria-current={isCurrent ? 'step' : undefined}>
            {/* Connector line */}
            {idx < stages.length - 1 && (
              <div
                className="absolute left-[14px] top-[28px] w-0.5 h-full -bottom-0"
                style={{ height: 'calc(100% - 4px)', backgroundColor: connectorColor }}
                aria-hidden="true"
              />
            )}

            {/* Dot */}
            <div
              className={`relative z-10 mt-1 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${dotStyle}`}
              aria-hidden="true"
            >
              {isCompleted && <Check size={12} className="text-white" strokeWidth={3} />}
              {isCurrent && <Clock size={11} className="text-white" />}
              {isPending && <Circle size={8} className="text-[var(--ibosys-text-tertiary)] opacity-30" />}
            </div>

            {/* Label */}
            <div className={`pb-4 flex-grow ${idx < stages.length - 1 ? 'border-b border-[var(--ibosys-border-light)]/30' : ''}`}>
              {getLabelBadge(stage, isCompleted, isCurrent, stageToken)}
            </div>
          </div>
        );
      })}
    </div>
  );
}