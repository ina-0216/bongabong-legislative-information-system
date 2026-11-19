import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Radix Select in the Bayan Hall idiom: flat, square, hairline border.
 *
 * Radix forbids an empty-string item value, so "no filter" is carried as
 * ALL_VALUE and translated back to '' for the caller.
 */
export const ALL_VALUE = '__all';

export default function SelectField({
  value, onValueChange, label, options, allLabel, id, error, required, name,
  labelClassName = 'v11-field-label',
}) {
  const current = value === '' || value == null ? ALL_VALUE : value;

  return (
    <div className="v11-field">
      {label && <label className={labelClassName} htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>}
      <SelectPrimitive.Root value={current} onValueChange={(next) => onValueChange(next === ALL_VALUE ? '' : next)} name={name}>
        <SelectPrimitive.Trigger className="v11-select" id={id} aria-label={label} aria-invalid={error ? true : undefined}>
          <SelectPrimitive.Value placeholder={allLabel} />
          <SelectPrimitive.Icon className="v11-select-icon">
            <ChevronDown size={16} aria-hidden="true" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content className="v11-select-content" position="popper" sideOffset={4}>
            <SelectPrimitive.Viewport className="v11-select-viewport">
              <SelectPrimitive.Item className="v11-select-item" value={ALL_VALUE}>
                <SelectPrimitive.ItemText>{allLabel}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="v11-select-check">
                  <Check size={14} aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
              {options.length ? (
                options.map((option) => {
                  const optionValue = typeof option === 'string' ? option : option.value;
                  const optionLabel = typeof option === 'string' ? option : option.label;
                  return (
                    <SelectPrimitive.Item className="v11-select-item" value={optionValue} key={optionValue}>
                      <SelectPrimitive.ItemText>
                        {optionLabel}
                        {option === '' && <span className="v11-select-item-muted-text text-xs opacity-50"> All</span>}
                      </SelectPrimitive.ItemText>
                      <SelectPrimitive.ItemIndicator className="v11-select-check">
                        <Check size={14} aria-hidden="true" />
                      </SelectPrimitive.ItemIndicator>
                    </SelectPrimitive.Item>
                  );
                })
              ) : (
                <p className="v11-empty-text" style={{ padding: '8px 12px', color: 'var(--v11-text-tertiary)' }}>
                  No options available
                </p>
              )}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error && <p className="v11-field-error" role="alert">{error}</p>}
    </div>
  );
}
