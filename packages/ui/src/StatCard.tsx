import { type ElementType } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

export type StatIconVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'secondary'
  | 'neutral';

export interface StatCardProps {
  icon?: ElementType;
  iconVariant?: StatIconVariant;
  value: string | number;
  label: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  delay?: number;
  className?: string;
}

const iconVariantStyles: Record<StatIconVariant, string> = {
  primary: 'bg-[var(--ibosys-primary-100)] text-[var(--ibosys-primary-600)]',
  success: 'bg-[var(--ibosys-success-50)] text-[var(--ibosys-success-600)]',
  warning: 'bg-[var(--ibosys-warning-50)] text-[var(--ibosys-warning-600)]',
  danger: 'bg-[var(--ibosys-danger-50)] text-[var(--ibosys-danger-600)]',
  info: 'bg-[var(--ibosys-primary-50)] text-[var(--ibosys-primary-600)]',
  secondary: 'bg-[var(--ibosys-neutral-100)] text-[var(--ibosys-text-secondary)]',
  neutral: 'bg-[var(--ibosys-neutral-100)] text-[var(--ibosys-text-tertiary)]',
};

const changeColors = {
  positive: 'text-[var(--ibosys-success-600)]',
  negative: 'text-[var(--ibosys-danger-600)]',
  neutral: 'text-[var(--ibosys-text-tertiary)]',
};

export interface StatCardProps {
  icon?: ElementType;
  iconVariant?: StatIconVariant;
  value: string | number;
  label: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  delay?: number;
  className?: string;
}

export const StatCard = ({
  icon: Icon,
  iconVariant = 'primary',
  value,
  label,
  change,
  changeType = 'neutral',
  delay = 0,
  className,
}: StatCardProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduceMotion ? 0 : delay, duration: reduceMotion ? 0 : 0.24, ease: 'easeOut' }}
      className={twMerge(
        'bg-[var(--ibosys-surface-primary)] border border-[var(--ibosys-border-default)] rounded-[var(--ibosys-radius-lg)] p-5 flex items-center gap-4 shadow-[var(--ibosys-shadow-xs)] hover:shadow-[var(--ibosys-shadow-sm)] transition-shadow',
        className
      )}
    >
      {Icon && (
        <div className={twMerge('w-11 h-11 rounded-[var(--ibosys-radius-md)] flex items-center justify-center shrink-0', iconVariantStyles[iconVariant])}>
          <Icon size={20} aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-2xl font-bold text-[var(--ibosys-text-primary)] leading-none tabular-nums">{value}</div>
        <div className="break-words text-[11px] font-semibold uppercase tracking-wider text-[var(--ibosys-text-tertiary)] mt-1.5">{label}</div>
        {change && (
          <div className={twMerge('text-[11px] font-semibold mt-1', changeColors[changeType])}>
            {change}
          </div>
        )}
      </div>
    </motion.div>
  );
};
