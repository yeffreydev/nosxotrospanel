import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import s from './ui.module.css';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, ...rest },
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
      <textarea
        id={fieldId}
        ref={ref}
        className={`${s.control} ${s.controlArea} ${error ? s.controlError : ''} ${className ?? ''}`}
        aria-invalid={!!error}
        {...rest}
      />
      {error && <span className={s.fieldError}>{error}</span>}
    </div>
  );
});
