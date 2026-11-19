import { forwardRef, type HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'status';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  status?:
    | 'draft'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'consultation'
    | 'inProgress'
    | 'firstReading'
    | 'committeeAssignment'
    | 'committeeHearing'
    | 'secondReading'
    | 'thirdReading'
    | 'mayorSignature'
    | 'spReview'
    | 'active'
    | 'deactivated'
    | 'amended'
    | string;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  consultation: 'Public Consultation',
  inProgress: 'In Progress',
  firstReading: 'First Reading',
  committeeAssignment: 'Committee Assignment',
  committeeHearing: 'Committee Hearing',
  secondReading: 'Second Reading',
  thirdReading: 'Third Reading',
  mayorSignature: "For Mayor's Signature",
  spReview: 'For SP Review',
  active: 'Active',
  deactivated: 'Deactivated',
  amended: 'Amended',
  // Canonical title-case keys:
  'First Reading': 'First Reading',
  'Committee Assignment': 'Committee Assignment',
  'Committee Hearing': 'Committee Hearing',
  'Public Consultation': 'Public Consultation',
  'Second Reading': 'Second Reading',
  'Third Reading': 'Third Reading',
  "For Mayor's Signature": "For Mayor's Signature",
  'For SP Review': 'For SP Review',
  'Approved': 'Approved',
  'Pending': 'Pending',
  'Active': 'Active',
  'Deactivated': 'Deactivated',
  'Rejected': 'Rejected',
  'Amended': 'Amended',
  'Draft': 'Draft',
  'In Progress': 'In Progress',
};

export function normalizeStatusKey(s?: string): string {
  if (!s) return 'draft';
  const trimmed = s.trim().toLowerCase();
  if (trimmed === 'first reading' || trimmed === 'firstreading') return 'firstReading';
  if (trimmed === 'committee assignment' || trimmed === 'committeeassignment') return 'committeeAssignment';
  if (trimmed === 'committee hearing' || trimmed === 'committeehearing') return 'committeeHearing';
  if (trimmed === 'public consultation' || trimmed === 'consultation') return 'consultation';
  if (trimmed === 'second reading' || trimmed === 'secondreading') return 'secondReading';
  if (trimmed === 'third reading' || trimmed === 'thirdreading') return 'thirdReading';
  if (trimmed === "for mayor's signature" || trimmed === 'mayorsignature') return 'mayorSignature';
  if (trimmed === 'for sp review' || trimmed === 'spreview') return 'spReview';
  if (trimmed === 'approved') return 'approved';
  if (trimmed === 'pending') return 'pending';
  if (trimmed === 'active') return 'active';
  if (trimmed === 'deactivated') return 'deactivated';
  if (trimmed === 'rejected') return 'rejected';
  if (trimmed === 'amended') return 'amended';
  if (trimmed === 'in progress' || trimmed === 'inprogress') return 'inProgress';
  if (trimmed === 'draft') return 'draft';
  return s;
}

const baseStyles = 'inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider rounded-[var(--ibosys-badge-radius)] transition-colors';

const sizeStyles = {
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-[var(--ibosys-badge-font-size)] px-[var(--ibosys-badge-padding-x)] py-[var(--ibosys-badge-padding-y)]',
};

const variantStyles: Record<string, string> = {
  default: 'bg-[var(--ibosys-neutral-100)] text-[var(--ibosys-text-secondary)] border border-[var(--ibosys-border-default)]',
  secondary: 'bg-[var(--ibosys-neutral-100)] text-[var(--ibosys-text-secondary)] border border-[var(--ibosys-border-default)]',
  success: 'bg-[var(--ibosys-success-50)] text-[var(--ibosys-success-700)] border border-[var(--ibosys-success-100)]',
  warning: 'bg-[var(--ibosys-warning-50)] text-[var(--ibosys-warning-700)] border border-[var(--ibosys-warning-100)]',
  danger: 'bg-[var(--ibosys-danger-50)] text-[var(--ibosys-danger-700)] border border-[var(--ibosys-danger-100)]',
  info: 'bg-[var(--ibosys-primary-50)] text-[var(--ibosys-primary-700)] border border-[var(--ibosys-primary-100)]',
  status: 'bg-[var(--ibosys-status-pending-bg)] text-[var(--ibosys-status-pending-text)] border border-[var(--ibosys-status-pending-border)]',
};

const statusStyles: Record<string, string> = {
  draft: 'bg-[var(--ibosys-status-draft-bg)] text-[var(--ibosys-status-draft-text)] border border-[var(--ibosys-status-draft-border)]',
  pending: 'bg-[var(--ibosys-status-pending-bg)] text-[var(--ibosys-status-pending-text)] border border-[var(--ibosys-status-pending-border)]',
  approved: 'bg-[var(--ibosys-status-approved-bg)] text-[var(--ibosys-status-approved-text)] border border-[var(--ibosys-status-approved-border)]',
  rejected: 'bg-[var(--ibosys-status-rejected-bg)] text-[var(--ibosys-status-rejected-text)] border border-[var(--ibosys-status-rejected-border)]',
  consultation: 'bg-[var(--ibosys-status-consultation-bg)] text-[var(--ibosys-status-consultation-text)] border border-[var(--ibosys-status-consultation-border)]',
  inProgress: 'bg-[var(--ibosys-primary-50)] text-[var(--ibosys-primary-700)] border border-[var(--ibosys-primary-100)]',
  firstReading: 'bg-[var(--ibosys-status-first-reading-bg)] text-[var(--ibosys-status-first-reading-text)] border border-[var(--ibosys-status-first-reading-border)]',
  committeeAssignment: 'bg-[var(--ibosys-status-committee-assignment-bg)] text-[var(--ibosys-status-committee-assignment-text)] border border-[var(--ibosys-status-committee-assignment-border)]',
  committeeHearing: 'bg-[var(--ibosys-status-committee-hearing-bg)] text-[var(--ibosys-status-committee-hearing-text)] border border-[var(--ibosys-status-committee-hearing-border)]',
  secondReading: 'bg-[var(--ibosys-status-second-reading-bg)] text-[var(--ibosys-status-second-reading-text)] border border-[var(--ibosys-status-second-reading-border)]',
  thirdReading: 'bg-[var(--ibosys-status-third-reading-bg)] text-[var(--ibosys-status-third-reading-text)] border border-[var(--ibosys-status-third-reading-border)]',
  mayorSignature: 'bg-[var(--ibosys-status-mayor-signature-bg)] text-[var(--ibosys-status-mayor-signature-text)] border border-[var(--ibosys-status-mayor-signature-border)]',
  spReview: 'bg-[var(--ibosys-status-sp-review-bg)] text-[var(--ibosys-status-sp-review-text)] border border-[var(--ibosys-status-sp-review-border)]',
  active: 'bg-[var(--ibosys-status-active-bg)] text-[var(--ibosys-status-active-text)] border border-[var(--ibosys-status-active-border)]',
  deactivated: 'bg-[var(--ibosys-status-deactivated-bg)] text-[var(--ibosys-status-deactivated-text)] border border-[var(--ibosys-status-deactivated-border)]',
  amended: 'bg-[var(--ibosys-status-amended-bg)] text-[var(--ibosys-status-amended-text)] border border-[var(--ibosys-status-amended-border)]',
};

export const badgeVariants = (
  variant: BadgeVariant = 'default',
  status?: BadgeProps['status'],
  size: 'sm' | 'md' = 'md'
) => {
  const effectiveVariant = status && variant === 'default' ? 'status' : variant;
  if (status && effectiveVariant === 'status') {
    const key = normalizeStatusKey(status);
    const resolvedStyle = statusStyles[key] || statusStyles[status] || variantStyles.status;
    return twMerge(baseStyles, sizeStyles[size], resolvedStyle);
  }
  return twMerge(baseStyles, sizeStyles[size], variantStyles[effectiveVariant] || variantStyles.default);
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', status, size = 'md', dot = false, className, children, ...props }, ref) => {
    const effectiveVariant = status && variant === 'default' ? 'status' : variant;
    const content =
      children !== undefined && children !== null && children !== ''
        ? children
        : (status ? (STATUS_LABELS[status] || STATUS_LABELS[normalizeStatusKey(status)] || status) : null);

    return (
      <span
        ref={ref}
        className={twMerge(badgeVariants(effectiveVariant, status, size), className)}
        {...props}
      >
        {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" aria-hidden="true" />}
        {content}
      </span>
    );
  }
);

Badge.displayName = 'Badge';