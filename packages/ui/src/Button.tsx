import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-[var(--ibosys-radius-md)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ibosys-border-focus)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--ibosys-primary-500)] text-[var(--ibosys-primary-foreground)] hover:bg-[var(--ibosys-primary-600)]',
  secondary: 'bg-[var(--ibosys-neutral-100)] text-[var(--ibosys-text-primary)] hover:bg-[var(--ibosys-neutral-200)] border border-[var(--ibosys-border-default)]',
  outline: 'bg-transparent text-[var(--ibosys-primary-500)] hover:bg-[var(--ibosys-primary-50)] border border-[var(--ibosys-primary-500)]',
  ghost: 'bg-transparent text-[var(--ibosys-text-primary)] hover:bg-[var(--ibosys-neutral-100)]',
  destructive: 'bg-[var(--ibosys-danger-500)] text-[var(--ibosys-danger-foreground)] hover:bg-[var(--ibosys-danger-600)]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-[var(--ibosys-btn-height-sm)] px-[var(--ibosys-btn-padding-sm)] text-[var(--ibosys-text-sm)] gap-1.5',
  md: 'h-[var(--ibosys-btn-height-md)] px-[var(--ibosys-btn-padding-md)] text-[var(--ibosys-text-sm)] gap-2',
  lg: 'h-[var(--ibosys-btn-height-lg)] px-[var(--ibosys-btn-padding-lg)] text-[var(--ibosys-text-base)] gap-2',
  icon: 'h-[var(--ibosys-btn-height-md)] w-[var(--ibosys-btn-height-md)] p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={twMerge(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
);
Button.displayName = 'Button';

export const buttonVariants = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) =>
  twMerge(baseStyles, variantStyles[variant], sizeStyles[size], className);
