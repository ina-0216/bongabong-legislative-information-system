import { Skeleton } from '@ibosys/ui';
import { useLanguage } from '../context/LanguageContext';

function Block({ className = '', height }) {
  return <Skeleton aria-hidden="true" variant="rectangular" height={height} className={`v11-skeleton-block ${className}`} />;
}

export default function PageSkeleton({ variant = 'records', rows = 5, label }) {
  const { t } = useLanguage();
  const repeated = (count, render) => Array.from({ length: count }, (_, index) => render(index));

  return (
    <div className={`v11-skeleton v11-skeleton-${variant}`} role="status" aria-live="polite" aria-busy="true" aria-label={label || t('loadingContent')}>
      {variant === 'stats' ? (
        <dl className="v11-stats" aria-hidden="true">
          {repeated(rows, (index) => <div className="v11-stat" key={index}><Block className="w-3/4" height={12} /><Block className="mt-3 w-1/3" height={34} /></div>)}
        </dl>
      ) : null}

      {variant === 'records' || variant === 'sessions' ? repeated(rows, (index) => (
        <div className="v11-record v11-record-block" key={index} aria-hidden="true">
          <Block className="w-28" height={12} />
          <Block className="w-4/5 max-w-2xl" height={22} />
          <Block className="w-full max-w-3xl" height={13} />
          <Block className="w-2/3 max-w-xl" height={12} />
          <div className="flex gap-2 pt-2"><Block className="w-24" height={30} /><Block className="w-32" height={30} /></div>
        </div>
      )) : null}

      {variant === 'members' ? (
        <div className="v11-member-grid" aria-hidden="true">
          {repeated(rows, (index) => (
            <div className="v11-member" key={index}>
              <Block className="w-full" height={150} />
              <div className="space-y-2 p-4"><Block className="w-3/4" height={18} /><Block className="w-1/2" height={12} /></div>
            </div>
          ))}
        </div>
      ) : null}

      {variant === 'committees' ? (
        <div className="v11-committee-grid" aria-hidden="true">
          {repeated(rows, (index) => (
            <div className="v11-committee-card" key={index}>
              <Block className="w-3/4" height={19} /><Block className="w-full" height={12} />
              <Block className="w-2/3" height={12} /><Block className="mt-3 w-1/2" height={28} />
            </div>
          ))}
        </div>
      ) : null}

      {variant === 'seats' ? repeated(rows, (index) => (
        <div className="v11-seat v11-seat-skeleton" key={index} aria-hidden="true">
          <Block className="shrink-0 rounded-full" height={42} />
          <div className="flex-1 space-y-2"><Block className="w-3/4" height={13} /><Block className="w-1/2" height={11} /></div>
        </div>
      )) : null}

      {variant === 'homeNews' ? (
        <div className="v11-news" aria-hidden="true">
          <div className="v11-news-lead space-y-3 p-4"><Block className="w-full" height={180} /><Block className="w-4/5" height={22} /><Block className="w-2/3" height={12} /></div>
          <div className="v11-news-list space-y-4">{repeated(3, (index) => <div className="v11-news-item space-y-2" key={index}><Block className="w-4/5" height={16} /><Block className="w-1/2" height={11} /></div>)}</div>
        </div>
      ) : null}

      {variant === 'detail' ? (
        <div className="space-y-6" aria-hidden="true">
          <div className="space-y-3 border-b border-[var(--v11-rule)] pb-6"><Block className="w-28" height={12} /><Block className="w-4/5 max-w-3xl" height={34} /><Block className="w-2/3 max-w-2xl" height={14} /></div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]"><Block className="w-full" height={390} /><Block className="w-full" height={260} /></div>
        </div>
      ) : null}

      {variant === 'article' ? (
        <div className="mx-auto max-w-4xl space-y-5" aria-hidden="true">
          <Block className="w-28" height={12} /><Block className="w-4/5" height={36} /><Block className="w-1/3" height={12} />
          <Block className="w-full" height={280} />
          <div className="space-y-3">{repeated(5, (index) => <Block className={index === 4 ? 'w-3/5' : 'w-full'} height={14} key={index} />)}</div>
        </div>
      ) : null}

      {variant === 'comments' ? repeated(rows, (index) => (
        <div className="border-b border-[var(--v11-rule)] py-4" key={index} aria-hidden="true">
          <Block className="w-1/3" height={14} /><Block className="mt-3 w-full" height={13} /><Block className="mt-2 w-2/3" height={13} />
        </div>
      )) : null}
    </div>
  );
}
