import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import s from './ui.module.css';
import { Icon } from './Icon';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, placeholder, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={s.field}>
      {label && (
        <label htmlFor={fieldId} className={s.label}>
          {label}
          {hint && <span className={s.labelHint}>{hint}</span>}
        </label>
      )}
      <div className={s.selectWrap}>
        <select
          id={fieldId}
          ref={ref}
          className={`${s.control} ${error ? s.controlError : ''} ${className ?? ''}`}
          aria-invalid={!!error}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className={s.selectArrow}>
          <Icon name="chevronDown" size={18} />
        </span>
      </div>
      {error && <span className={s.fieldError}>{error}</span>}
    </div>
  );
});
