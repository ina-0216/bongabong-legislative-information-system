import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

const baseInputStyles =
  'w-full bg-[var(--ibosys-surface-primary)] border border-[var(--ibosys-border-default)] rounded-[var(--ibosys-radius-md)] text-[var(--ibosys-text-primary)] placeholder-[var(--ibosys-text-tertiary)] transition-all duration-[var(--ibosys-transition-fast)]';

const focusStyles = 'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ibosys-border-focus)] focus-visible:border-[var(--ibosys-border-focus)]';

const errorStyles = 'border-[var(--ibosys-danger-500)] focus-visible:ring-[var(--ibosys-danger-500)]';

const disabledStyles = 'disabled:bg-[var(--ibosys-neutral-100)] disabled:cursor-not-allowed disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, fullWidth = true, className, id, disabled, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={twMerge('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className="text-[var(--ibosys-text-sm)] font-medium text-[var(--ibosys-text-primary)]">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ibosys-text-tertiary)] pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={twMerge(
              baseInputStyles,
              focusStyles,
              disabledStyles,
              error && errorStyles,
              'h-[var(--ibosys-input-height-md)] px-3',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ibosys-text-tertiary)] pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-[var(--ibosys-text-xs)] text-[var(--ibosys-danger-600)]" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="text-[var(--ibosys-text-xs)] text-[var(--ibosys-text-tertiary)]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, fullWidth = true, className, id, disabled, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText ? `${textareaId}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={twMerge('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={textareaId} className="text-[var(--ibosys-text-sm)] font-medium text-[var(--ibosys-text-primary)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={twMerge(
            baseInputStyles,
            focusStyles,
            disabledStyles,
            error && errorStyles,
            'min-h-[100px] px-3 py-3 resize-y',
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-[var(--ibosys-text-xs)] text-[var(--ibosys-danger-600)]" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="text-[var(--ibosys-text-xs)] text-[var(--ibosys-text-tertiary)]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
