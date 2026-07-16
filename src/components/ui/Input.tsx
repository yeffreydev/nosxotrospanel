import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import s from './ui.module.css';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, prefix, className, id, required, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const control = (
    <input
      id={inputId}
      ref={ref}
      className={`${s.control} ${error ? s.controlError : ''} ${className ?? ''}`}
      aria-invalid={!!error}
      aria-describedby={error ? errorId : undefined}
      required={required}
      {...rest}
    />
  );
  return (
    <div className={s.field}>
      {label && (
        <label htmlFor={inputId} className={s.label}>
          <span>
            {label}
            {required && (
              <span className={s.labelReq} aria-hidden="true">
                {' '}
                *
              </span>
            )}
          </span>
          {hint && <span className={s.labelHint}>{hint}</span>}
        </label>
      )}
      {prefix ? (
        <div className={s.inputAffix}>
          <span className={s.inputPrefix}>{prefix}</span>
          {control}
        </div>
      ) : (
        control
      )}
      {error && (
        <span id={errorId} className={s.fieldError}>
          {error}
        </span>
      )}
    </div>
  );
});
