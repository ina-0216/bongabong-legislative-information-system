import { FileText, Scroll } from 'lucide-react';

export default function TypeBadge({ type, size = 'sm', className = '' }) {
  const isOrd = (type || 'Ordinance').trim().toLowerCase() !== 'resolution';
  const label = isOrd ? 'Ordinance' : 'Resolution';

  const sizeClasses = size === 'xs'
    ? 'text-[10px] px-1.5 py-0.5 gap-1'
    : 'text-[11px] px-2.5 py-0.5 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wide rounded-full border shrink-0 transition-colors ${sizeClasses} ${
        isOrd
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-purple-50 text-purple-700 border-purple-200'
      } ${className}`}
    >
      {isOrd ? (
        <FileText size={size === 'xs' ? 10 : 12} className="shrink-0" />
      ) : (
        <Scroll size={size === 'xs' ? 10 : 12} className="shrink-0" />
      )}
      <span>{label}</span>
    </span>
  );
}
