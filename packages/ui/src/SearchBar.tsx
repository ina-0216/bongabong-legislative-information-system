import { useState, useRef, useEffect, type ReactNode, type KeyboardEvent, type ChangeEvent } from 'react';
import { forwardRef, type HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import { Search, X } from 'lucide-react';

export interface SearchBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  clearable?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export const SearchBar = forwardRef<HTMLDivElement, SearchBarProps>(
  (
    {
      value = '',
      onChange,
      onSearch,
      placeholder = 'Search...',
      debounceMs = 300,
      leftIcon,
      rightIcon,
      clearable = true,
      fullWidth = true,
      className,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const controlled = value !== undefined;
    const currentValue = controlled ? value : internalValue;

    useEffect(() => {
      if (controlled) {
        setInternalValue(value);
      }
    }, [value, controlled]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (!controlled) setInternalValue(newValue);
      onChange?.(newValue);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearch?.(newValue);
      }, debounceMs);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!controlled) setInternalValue('');
      onChange?.('');
      onSearch?.('');
      inputRef.current?.focus();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onSearch?.(currentValue);
      }
    };

    return (
      <div
        ref={ref}
        className={twMerge('relative flex items-center', fullWidth && 'w-full', className)}
        {...props}
      >
        {(leftIcon || <Search size={18} aria-hidden="true" />) && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ibosys-text-tertiary)] pointer-events-none transition-colors">
            {leftIcon || <Search size={18} aria-hidden="true" />}
          </div>
        )}
        <input
          ref={inputRef}
          type="search"
          value={currentValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={twMerge(
            'w-full bg-[var(--ibosys-surface-primary)] border rounded-[var(--ibosys-radius-md)] text-[var(--ibosys-text-primary)] placeholder-[var(--ibosys-text-tertiary)] transition-all duration-[var(--ibosys-transition-fast)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ibosys-border-focus)]',
            leftIcon ? 'pl-10' : 'pl-4',
            rightIcon || (clearable && currentValue) ? 'pr-10' : 'pr-4',
            'py-2.5'
          )}
          {...props}
        />
        {clearable && currentValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--ibosys-text-tertiary)] hover:text-[var(--ibosys-text-primary)] rounded-[var(--ibosys-radius-md)] transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ibosys-text-tertiary)] pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';