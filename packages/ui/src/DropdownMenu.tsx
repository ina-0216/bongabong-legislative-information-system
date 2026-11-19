import { useState, useRef, useEffect, useCallback, useContext, createContext, type ReactNode } from 'react';
import { forwardRef, type HTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

export interface DropdownMenuProps {
  children: ReactNode | ((props: { isOpen: boolean; onToggle: () => void; onClose: () => void }) => ReactNode);
  trigger?: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export interface DropdownMenuTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
  asChild?: boolean;
}

export interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right';
}

export interface DropdownMenuItemProps extends HTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  icon?: ReactNode;
  className?: string;
}

export interface DropdownMenuSeparatorProps extends HTMLAttributes<HTMLDivElement> {}

const DropdownMenuContext = createContext<{
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  align: 'left' | 'right';
} | null>(null);

export const DropdownMenu = ({
  children,
  trigger,
  align = 'left',
  className,
}: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const onToggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const onClose = useCallback(() => setIsOpen(false), []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown as unknown as (e: KeyboardEvent) => void);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown as unknown as (e: KeyboardEvent) => void);
    };
  }, [isOpen]);

  const contextValue = {
    isOpen,
    onToggle,
    onClose,
    triggerRef,
    contentRef,
    align,
  };

  return (
    <DropdownMenuContext.Provider value={contextValue}>
      <div className={twMerge('relative inline-block', className)} onKeyDown={handleKeyDown}>
        {typeof children === 'function' ? children({ isOpen, onToggle, onClose }) : children}
        {trigger && (
          <DropdownMenuTrigger>
            {trigger}
          </DropdownMenuTrigger>
        )}
        {isOpen && createPortal(
          <DropdownMenuContent
            ref={contentRef}
            align={align}
            onKeyDown={handleKeyDown}
          >
            {typeof children === 'function' ? null : children}
          </DropdownMenuContent>,
          document.body
        )}
      </div>
    </DropdownMenuContext.Provider>
  );
};

export const DropdownMenuTrigger = forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ children, className, asChild = false, ...props }, ref) => {
    const { isOpen, onToggle, triggerRef } = useContext(DropdownMenuContext) || {};

    const Component = asChild ? 'span' : 'button';

    return (
      <Component
        ref={(el) => {
          if (triggerRef) triggerRef.current = el as HTMLButtonElement;
          if (ref) {
            if (typeof ref === 'function') ref(el);
            else if (ref) ref.current = el;
          }
        }}
        type={asChild ? undefined : 'button'}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={onToggle}
        className={twMerge(
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--ibosys-text-primary)]',
          'bg-[var(--ibosys-surface-primary)] border border-[var(--ibosys-border-default)] rounded-[var(--ibosys-radius-md)]',
          'hover:bg-[var(--ibosys-neutral-100)] transition-colors cursor-pointer focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-[var(--ibosys-border-focus)]',
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown size={14} aria-hidden="true" />
      </Component>
    )
  }
);

DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

export const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ children, className, align = 'left', ...props }, ref) => {
    const context = useContext(DropdownMenuContext);
    const onClose = context?.onClose;
    const contentRef = context?.contentRef;

    useEffect(() => {
      if (!onClose) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return createPortal(
      <div
        ref={(el) => {
          if (contentRef) contentRef.current = el;
          if (ref) {
            if (typeof ref === 'function') ref(el);
            else if (ref) ref.current = el;
          }
        }}
        className={twMerge(
          'fixed z-[var(--ibosys-z-dropdown)] mt-1.5 min-w-[180px] bg-[var(--ibosys-surface-primary)] border border-[var(--ibosys-border-default)] rounded-[var(--ibosys-radius-lg)] shadow-[var(--ibosys-shadow-lg)] py-1.5',
          align === 'right' ? 'right-0' : 'left-0',
          className
        )}
        {...props}
        role="menu"
      >
        {children}
      </div>,
      document.body
    );
  }
);

DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ children, disabled = false, destructive = false, icon, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      role="menuitem"
      className={twMerge(
        'w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--ibosys-text-primary)]',
        'hover:bg-[var(--ibosys-neutral-100)] focus-visible:outline-none focus-visible:bg-[var(--ibosys-neutral-100)]',
        'rounded-none transition-colors cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        destructive && 'text-[var(--ibosys-danger-600)]',
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  )
);

DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuSeparator = forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      className={twMerge('h-px bg-[var(--ibosys-border-default)] my-1.5', className)}
      {...props}
    />
  )
);

DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';