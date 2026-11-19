import { type ReactNode, type ElementType } from 'react';
import { twMerge } from 'tailwind-merge';
import { ArrowRight } from 'lucide-react';

export interface SectionHeaderProps {
  icon?: ElementType;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  as?: 'h2' | 'h3' | 'h4';
}

export const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  action,
  actionLabel,
  onAction,
  className,
  as: Heading = 'h2',
}: SectionHeaderProps) => {
  return (
    <div className={twMerge('flex items-start justify-between gap-4 mb-4', className)}>
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className="w-8 h-8 bg-[var(--ibosys-primary-100)] rounded-[var(--ibosys-radius-md)] flex items-center justify-center">
            <Icon size={16} className="text-[var(--ibosys-primary-500)]" aria-hidden="true" />
          </div>
        )}
        <div>
          <Heading className="text-[var(--ibosys-text-sm)] font-bold text-[var(--ibosys-text-primary)] leading-tight">{title}</Heading>
          {subtitle && <p className="text-[var(--ibosys-text-xs)] text-[var(--ibosys-text-tertiary)] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {(action || (actionLabel && onAction)) && (
        <button
          onClick={onAction}
          type="button"
          className={twMerge(
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-[var(--ibosys-text-xs)] font-semibold text-[var(--ibosys-text-secondary)]',
            'bg-[var(--ibosys-surface-secondary)] border border-[var(--ibosys-border-default)] rounded-[var(--ibosys-radius-lg)]',
            'hover:bg-[var(--ibosys-neutral-100)] hover:text-[var(--ibosys-text-primary)] transition-colors whitespace-nowrap shrink-0'
          )}
        >
          {actionLabel || action}
          {actionLabel && <ArrowRight size={12} aria-hidden="true" />}
        </button>
      )}
    </div>
  );
};