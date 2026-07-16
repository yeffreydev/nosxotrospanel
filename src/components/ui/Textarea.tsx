import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import s from './ui.module.css';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, required, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;
  return (
    <div className={s.field}>
      {label && (
        <label htmlFor={fieldId} className={s.label}>
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
      <textarea
        id={fieldId}
        ref={ref}
        className={`${s.control} ${s.controlArea} ${error ? s.controlError : ''} ${className ?? ''}`}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        required={required}
        {...rest}
      />
      {error && (
        <span id={errorId} className={s.fieldError}>
          {error}
        </span>
      )}
    </div>
  );
});
