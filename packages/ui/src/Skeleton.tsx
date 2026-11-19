import { forwardRef, type HTMLAttributes, useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animated?: boolean;
}

const baseStyles = 'bg-[var(--ibosys-neutral-200)] rounded-[var(--ibosys-radius-md)] overflow-hidden';
const animatedStyles = 'animate-pulse relative';

const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = 'text', width, height, lines = 1, animated = true, className, style, ...props }, ref) => {
    const [mounted, setMounted] = useState(false);
    const isAnimated = animated && mounted;

    useEffect(() => {
      setMounted(true);
    }, []);

    // Inject shimmer keyframes once on mount
    useEffect(() => {
      if (typeof document === 'undefined') return;
      const styleId = 'ibosys-skeleton-shimmer';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = shimmerKeyframes;
        document.head.appendChild(style);
      }
      return () => {
        const style = document.getElementById(styleId);
        if (style) style.remove();
      };
    }, []);

    if (variant === 'circular') {
      return (
        <div
          ref={ref}
          className={twMerge(baseStyles, 'rounded-full', animated && mounted && 'animate-pulse', className)}
          style={{ width, height, borderRadius: '50%', ...style }}
          {...props}
        />
      );
    }

    if (variant === 'rectangular') {
      return (
        <div
          ref={ref}
          className={twMerge(baseStyles, animated && mounted && 'animate-pulse', className)}
          style={{ width, height, ...style }}
          {...props}
        />
      );
    }

    if (variant === 'card') {
      return (
        <div
          ref={ref}
          className={twMerge('bg-[var(--ibosys-surface-primary)] border border-[var(--ibosys-border-default)] rounded-[var(--ibosys-radius-lg)] p-[var(--ibosys-card-padding)]', animated && mounted && 'animate-pulse', className)}
          style={{ ...style }}
          {...props}
        >
          <div className="h-6 w-3/4 bg-[var(--ibosys-neutral-200)] rounded-[var(--ibosys-radius-md)] mb-4 animate-pulse" />
          <div className="space-y-3">
            <div className="h-4 w-1/2 bg-[var(--ibosys-neutral-200)] rounded-[var(--ibosys-radius-md)] animate-pulse" />
            <div className="h-4 w-1/3 bg-[var(--ibosys-neutral-200)] rounded-[var(--ibosys-radius-md)] animate-pulse" />
            <div className="h-4 w-1/4 bg-[var(--ibosys-neutral-200)] rounded-[var(--ibosys-radius-md)] animate-pulse" />
          </div>
        </div>
      );
    }

    // Text variant with multiple lines
    return (
      <div
        ref={ref}
        className={twMerge(baseStyles, animated && mounted && 'animate-pulse', className)}
        style={{ width, ...style }}
        {...props}
      >
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={twMerge(
              'h-4 bg-[var(--ibosys-neutral-200)] rounded-[var(--ibosys-radius-md)]',
              isAnimated &&
                'bg-gradient-to-r from-[var(--ibosys-neutral-200)] via-[var(--ibosys-neutral-100)] to-[var(--ibosys-neutral-200)] bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]'
            )}
            style={{
              width: i === lines - 1 && lines > 1 ? '60%' : width,
              marginBottom: i < lines - 1 ? '8px' : 0,
            }}
          />
        ))}
      </div>
    );
  }
);

Skeleton.displayName = 'Skeleton';