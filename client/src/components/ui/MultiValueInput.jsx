import { useId, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';

const normalized = (value) => String(value ?? '').trim();
const comparisonKey = (value) => normalized(value).toLocaleLowerCase();

export default function MultiValueInput({
  value = [],
  onChange,
  suggestions = [],
  id,
  placeholder = 'Type and press Enter',
  ariaLabel = 'Add item',
}) {
  const [draft, setDraft] = useState('');
  const generatedId = useId();
  const inputId = id || generatedId;
  const selectedKeys = useMemo(() => new Set(value.map(comparisonKey)), [value]);
  const matches = useMemo(() => {
    const query = comparisonKey(draft);
    if (!query) return [];
    const seen = new Set();
    return suggestions
      .map(normalized)
      .filter((item) => {
        const key = comparisonKey(item);
        if (!key || selectedKeys.has(key) || !key.includes(query) || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }, [draft, selectedKeys, suggestions]);

  const addItem = (item) => {
    const next = normalized(item);
    const key = comparisonKey(next);
    if (!key || selectedKeys.has(key)) {
      setDraft('');
      return;
    }
    onChange([...value, next]);
    setDraft('');
  };

  const removeItem = (item) => {
    const key = comparisonKey(item);
    onChange(value.filter((current) => comparisonKey(current) !== key));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addItem(draft);
    } else if (event.key === 'Backspace' && !draft && value.length) {
      removeItem(value[value.length - 1]);
    }
  };

  return (
    <div>
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
        {value.map((item) => (
          <span key={comparisonKey(item)} className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary">
            <span className="truncate">{item}</span>
            <button
              type="button"
              onClick={() => removeItem(item)}
              aria-label={`Remove ${item}`}
              className="rounded-full p-0.5 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ))}
        <div className="flex min-w-36 flex-1 items-center gap-1">
          <input
            id={inputId}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label={ariaLabel}
            aria-describedby={`${inputId}-help`}
            placeholder={placeholder}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-0"
          />
          <button
            type="button"
            onClick={() => addItem(draft)}
            disabled={!normalized(draft)}
            aria-label="Add item"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary disabled:hidden"
          >
            <Plus size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
      {draft.trim() && matches.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Matching suggestions">
          <span className="mr-1 text-[11px] text-muted-foreground">Suggestions:</span>
          {matches.map((match) => (
            <button
              key={comparisonKey(match)}
              type="button"
              onClick={() => addItem(match)}
              className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {match}
            </button>
          ))}
        </div>
      )}
      <p id={`${inputId}-help`} className="mt-1.5 text-xs text-muted-foreground">
        Press Enter or comma to add. Select a suggestion or enter a new item.
      </p>
    </div>
  );
}
