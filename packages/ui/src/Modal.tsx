import { useEffect, useRef, useCallback, useId, type ReactNode, type HTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

export interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {}
export interface ModalTitleProps extends HTMLAttributes<HTMLHeadingElement> {}
export interface ModalDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}
export interface ModalContentProps extends HTMLAttributes<HTMLDivElement> {}
export interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {}

const sizeStyles = {
  sm: 'max-w-[360px]',
  md: 'max-w-[480px]',
  lg: 'max-w-[640px]',
  xl: 'max-w-[800px]',
  full: 'max-w-[90vw]',
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  const titleId = useId();
  const descriptionId = useId();

  // Keep event handlers current without restarting the focus-management effect
  // whenever a caller creates a new inline onClose callback during a render.
  onCloseRef.current = onClose;
  closeOnEscapeRef.current = closeOnEscape;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscapeRef.current) {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!focusable.length) {
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const focusWithin = dialogRef.current.contains(active);

      if (e.shiftKey && (active === first || !focusWithin)) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && (active === last || !focusWithin)) {
        e.preventDefault();
        first?.focus();
      }
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement;
    const node = dialogRef.current;
    const preferred = node?.querySelectorAll<HTMLElement>(
      '[autofocus], input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]'
    );
    const focusable = node?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const initialTarget = preferred?.[0] ?? focusable?.[0];
    initialTarget?.focus();
    if (initialTarget && document.activeElement !== initialTarget) {
      focusable?.[0]?.focus();
    }

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={twMerge(
        'fixed inset-0 z-[var(--ibosys-z-modal)] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs',
        className
      )}
      role="presentation"
      onClick={
        closeOnOverlayClick
          ? (e) => {
              if (e.target === e.currentTarget) onClose();
            }
          : undefined
      }
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={twMerge(
          'w-full bg-[var(--ibosys-surface-primary)] border border-[var(--ibosys-border-default)] rounded-[var(--ibosys-radius-xl)] shadow-[var(--ibosys-shadow-xl)] overflow-hidden flex flex-col max-h-[90vh]',
          sizeStyles[size]
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[var(--ibosys-border-default)] bg-[var(--ibosys-surface-secondary)]">
            <div>
              {title && (
                <h3 id={titleId} className="text-[var(--ibosys-text-xl)] font-bold text-[var(--ibosys-text-primary)]">
                  {title}
                </h3>
              )}
              {description && (
                <p id={descriptionId} className="mt-1 text-[var(--ibosys-text-sm)] text-[var(--ibosys-text-secondary)]">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="shrink-0 p-1 text-[var(--ibosys-text-tertiary)] hover:text-[var(--ibosys-text-primary)] hover:bg-[var(--ibosys-neutral-100)] rounded-[var(--ibosys-radius-md)] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('flex items-center justify-between gap-4 mb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
);
ModalHeader.displayName = 'ModalHeader';

export const ModalTitle = forwardRef<HTMLHeadingElement, ModalTitleProps>(
  ({ className, children, id, ...props }, ref) => (
    <h3
      ref={ref}
      {...(id ? { id } : {})}
      className={twMerge('text-[var(--ibosys-text-xl)] font-bold text-[var(--ibosys-text-primary)]', className)}
      {...props}
    >
      {children}
    </h3>
  )
);
ModalTitle.displayName = 'ModalTitle';

export const ModalDescription = forwardRef<HTMLParagraphElement, ModalDescriptionProps>(
  ({ className, children, id, ...props }, ref) => (
    <p
      ref={ref}
      {...(id ? { id } : {})}
      className={twMerge('mt-1 text-[var(--ibosys-text-sm)] text-[var(--ibosys-text-secondary)]', className)}
      {...props}
    >
      {children}
    </p>
  )
);
ModalDescription.displayName = 'ModalDescription';

export const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={twMerge('', className)} {...props}>
      {children}
    </div>
  )
);
ModalContent.displayName = 'ModalContent';

export const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('mt-6 pt-4 border-t border-[var(--ibosys-border-light)] flex items-center justify-end gap-2', className)}
      {...props}
    >
      {children}
    </div>
  )
);
ModalFooter.displayName = 'ModalFooter';
