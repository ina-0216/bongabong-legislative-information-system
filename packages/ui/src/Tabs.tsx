import { useState, useRef, useEffect, useCallback, useContext, createContext, type ReactNode } from 'react';
import { forwardRef, type HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
  className?: string;
}

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  children: ReactNode;
  className?: string;
}

const TabsContext = createContext<{
  value: string;
  onChange: (value: string) => void;
  tabs: string[];
} | null>(null);

export const Tabs = ({
  defaultValue,
  value: controlledValue,
  onChange,
  children,
  className,
}: TabsProps) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const controlled = controlledValue !== undefined;
  const value = controlled ? controlledValue : uncontrolledValue;

  const handleChange = useCallback(
    (newValue: string) => {
      if (!controlled) setUncontrolledValue(newValue);
      onChange?.(newValue);
    },
    [controlled, onChange]
  );

  return (
    <TabsContext.Provider value={{ value, onChange: handleChange, tabs: [] }}>
      <div className={twMerge('', className)}>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      aria-orientation="horizontal"
      className={twMerge('inline-flex h-10 items-center justify-center gap-1 bg-[var(--ibosys-neutral-100)] p-1 rounded-[var(--ibosys-radius-lg)]', className)}
      {...props}
    >
      {children}
    </div>
  )
);
TabsList.displayName = 'TabsList';

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, disabled = false, className, ...props }, ref) => {
    const context = useContext(TabsContext);
    if (!context) throw new Error('TabsTrigger must be used within Tabs');
    const { value: currentValue, onChange } = context;

    const isActive = currentValue === value;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        aria-controls={`tabs-panel-${value}`}
        id={`tabs-trigger-${value}`}
        disabled={disabled}
        onClick={() => !disabled && onChange(value)}
        className={twMerge(
          'inline-flex items-center justify-center whitespace-nowrap rounded-[var(--ibosys-radius-md)] px-4 py-1.5 text-sm font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ibosys-border-focus)] focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isActive
            ? 'bg-[var(--ibosys-surface-primary)] text-[var(--ibosys-text-primary)] shadow-[var(--ibosys-shadow-xs)]'
            : 'text-[var(--ibosys-text-secondary)] hover:text-[var(--ibosys-text-primary)] hover:bg-[var(--ibosys-neutral-200)]',
          className
        )}
        {...props}
      >
        {props.children}
      </button>
    )
  }
);
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, children, className, ...props }, ref) => {
    const context = useContext(TabsContext);
    if (!context) throw new Error('TabsContent must be used within Tabs');
    const { value: currentValue } = context;

    if (currentValue !== value) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`tabs-panel-${value}`}
        aria-labelledby={`tabs-trigger-${value}`}
        className={twMerge('mt-4 animate-in fade-in-0 zoom-in-95 duration-200', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
);
TabsContent.displayName = 'TabsContent';