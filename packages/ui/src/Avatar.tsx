import { forwardRef, type HTMLAttributes, type ReactNode, useState } from 'react';
import { twMerge } from 'tailwind-merge';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
  status?: 'online' | 'offline' | 'busy' | 'away';
  statusPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const sizeStyles = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-[13px]',
  lg: 'w-12 h-12 text-[15px]',
  xl: 'w-16 h-16 text-[18px]',
};

const statusStyles = {
  online: 'bg-[var(--ibosys-success-500)]',
  offline: 'bg-[var(--ibosys-neutral-400)]',
  busy: 'bg-[var(--ibosys-danger-500)]',
  away: 'bg-[var(--ibosys-warning-500)]',
};

const statusPositionStyles = {
  'bottom-right': 'bottom-0 right-0',
  'bottom-left': 'bottom-0 left-0',
  'top-right': 'top-0 right-0',
  'top-left': 'top-0 left-0',
};

const statusSize = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4',
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt = '',
      fallback,
      size = 'md',
      shape = 'circle',
      status,
      statusPosition = 'bottom-right',
      className,
      ...props
    },
    ref
  ) => {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const imageError = !src || failedSrc === src;

    return (
      <div
        ref={ref}
        className={twMerge(
          'relative inline-flex shrink-0 overflow-hidden',
          sizeStyles[size],
          shape === 'circle' ? 'rounded-full' : 'rounded-[var(--ibosys-radius-lg)]',
          className
        )}
        {...props}
      >
        {!imageError && src && (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => setFailedSrc(src)}
            aria-hidden={!!fallback}
          />
        )}
        {(imageError || !src) && (
          <div
            className={twMerge(
              'w-full h-full flex items-center justify-center bg-[var(--ibosys-neutral-100)]',
              shape === 'circle' ? 'rounded-full' : 'rounded-[var(--ibosys-radius-lg)]'
            )}
            aria-hidden="true"
          >
            {fallback || (
              <span className="font-medium text-[var(--ibosys-text-tertiary)]">
                {alt?.charAt(0).toUpperCase() || '?'}
              </span>
            )}
          </div>
        )}
        {status && (
          <span
            className={twMerge(
              'absolute border-2 border-[var(--ibosys-surface-primary)] rounded-full',
              statusStyles[status],
              statusPositionStyles[statusPosition],
              statusSize[size]
            )}
            aria-label={`Status: ${status}`}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';
