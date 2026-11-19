import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<AlertVariant, string> = {
  info: 'bg-[var(--ibosys-primary-50)] border-[var(--ibosys-primary-200)] text-[var(--ibosys-primary-700)]',
  success: 'bg-[var(--ibosys-success-50)] border-[var(--ibosys-success-100)] text-[var(--ibosys-success-700)]',
  warning: 'bg-[var(--ibosys-warning-50)] border-[var(--ibosys-warning-100)] text-[var(--ibosys-warning-700)]',
  danger: 'bg-[var(--ibosys-danger-50)] border-[var(--ibosys-danger-100)] text-[var(--ibosys-danger-700)]',
};

const variantIcons: Record<AlertVariant, ReactNode> = {
  info: <Info size={18} aria-hidden="true" />,
  success: <CheckCircle size={18} aria-hidden="true" />,
  warning: <AlertTriangle size={18} aria-hidden="true" />,
  danger: <AlertCircle size={18} aria-hidden="true" />,
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'info', title, children, dismissible = false, onDismiss, className, role = 'alert', ...props }, ref) => (
    <div
      ref={ref}
      role={role}
      className={twMerge(
        'flex items-start gap-3 p-4 rounded-[var(--ibosys-radius-lg)] border',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
        {variantIcons[variant]}
      </div>
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-semibold text-[var(--ibosys-text-sm)]">{title}</h4>}
        <div className={title ? 'mt-1' : ''} style={{ lineHeight: 1.6 }}>
          {children}
        </div>
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 p-1 text-current opacity-50 hover:opacity-100 rounded-[var(--ibosys-radius-md)] transition-opacity cursor-pointer"
          aria-label="Dismiss"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  )
);

Alert.displayName = 'Alert';