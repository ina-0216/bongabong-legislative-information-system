import { forwardRef, type HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const baseStyles = 'rounded-[var(--ibosys-radius-xl)] transition-shadow';

const variantStyles = {
  default: 'bg-[var(--ibosys-surface-primary)] border border-[var(--ibosys-border-default)] shadow-[var(--ibosys-shadow-xs)]',
  outlined: 'bg-transparent border-2 border-[var(--ibosys-border-default)]',
  elevated: 'bg-[var(--ibosys-surface-primary)] border border-[var(--ibosys-border-default)] shadow-[var(--ibosys-shadow-md)]',
};

const paddingStyles = {
  none: '',
  sm: 'p-[var(--ibosys-space-3)]',
  md: 'p-[var(--ibosys-card-padding)]',
  lg: 'p-[var(--ibosys-space-8)]',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', hoverable = false, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge(
        baseStyles,
        variantStyles[variant],
        paddingStyles[padding],
        hoverable ? 'hover:shadow-[var(--ibosys-shadow-sm)]' : '',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('mb-[var(--ibosys-space-4)]', className)}
      {...props}
    >
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={twMerge('text-[var(--ibosys-text-xl)] font-bold text-[var(--ibosys-text-primary)]', className)}
      {...props}
    >
      {children}
    </h3>
  )
);
CardTitle.displayName = 'CardTitle';

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={twMerge('mt-1 text-[var(--ibosys-text-sm)] text-[var(--ibosys-text-secondary)]', className)}
      {...props}
    >
      {children}
    </p>
  )
);
CardDescription.displayName = 'CardDescription';

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('', className)}
      {...props}
    >
      {children}
    </div>
  )
);
CardContent.displayName = 'CardContent';

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('mt-[var(--ibosys-space-4)] flex items-center gap-2', className)}
      {...props}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';