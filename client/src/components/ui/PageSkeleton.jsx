import { Skeleton } from '@ibosys/ui';

const SkeletonRow = () => (
  <div className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-b-0" aria-hidden="true">
    <Skeleton variant="circular" width={38} height={38} />
    <div className="min-w-0 flex-1 space-y-2">
      <Skeleton variant="rectangular" height={13} className="w-2/5" />
      <Skeleton variant="rectangular" height={10} className="w-3/5" />
    </div>
    <Skeleton variant="rectangular" height={24} className="w-20" />
  </div>
);

export default function PageSkeleton({ variant = 'table', rows = 6, fullScreen = false }) {
  const shellClass = fullScreen
    ? 'min-h-screen bg-background p-6'
    : 'min-h-[45vh] space-y-6 p-1';

  return (
    <div role="status" aria-live="polite" aria-label="Loading content" aria-busy="true" className={shellClass}>
      {variant === 'dashboard' ? (
        <>
          <div className="space-y-3">
            <Skeleton variant="rectangular" height={28} className="w-56" />
            <Skeleton variant="rectangular" height={14} className="w-80 max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} variant="card" className="h-32" />)}
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <Skeleton variant="card" className="h-72" />
            <Skeleton variant="card" className="h-72" />
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {Array.from({ length: 5 }, (_, index) => <SkeletonRow key={index} />)}
          </div>
        </>
      ) : variant === 'detail' ? (
        <>
          <Skeleton variant="rectangular" height={12} className="w-48" />
          <div className="space-y-3 border-b border-border pb-6">
            <Skeleton variant="rectangular" height={13} className="w-32" />
            <Skeleton variant="rectangular" height={32} className="w-4/5 max-w-3xl" />
            <Skeleton variant="rectangular" height={14} className="w-2/3 max-w-2xl" />
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
            <Skeleton variant="card" className="h-[28rem]" />
            <Skeleton variant="card" className="h-72" />
          </div>
        </>
      ) : variant === 'grid' ? (
        <>
          <div className="space-y-3">
            <Skeleton variant="rectangular" height={28} className="w-64" />
            <Skeleton variant="rectangular" height={14} className="w-96 max-w-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: rows }, (_, index) => <Skeleton key={index} variant="card" className="h-52" />)}
          </div>
        </>
      ) : variant === 'form' ? (
        <>
          <div className="space-y-3">
            <Skeleton variant="rectangular" height={28} className="w-56" />
            <Skeleton variant="rectangular" height={14} className="w-80 max-w-full" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton variant="card" className="h-56" />
            <Skeleton variant="card" className="h-56" />
          </div>
          <Skeleton variant="card" className="h-40" />
        </>
      ) : (
        <>
          <div className="space-y-3">
            <Skeleton variant="rectangular" height={28} className="w-64" />
            <Skeleton variant="rectangular" height={14} className="w-96 max-w-full" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Skeleton variant="rectangular" height={38} className="w-56" />
            <Skeleton variant="rectangular" height={38} className="w-40" />
            <Skeleton variant="rectangular" height={38} className="w-32" />
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {Array.from({ length: rows }, (_, index) => <SkeletonRow key={index} />)}
          </div>
        </>
      )}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
