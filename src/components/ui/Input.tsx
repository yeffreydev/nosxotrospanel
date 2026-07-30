import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import s from './ui.module.css';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
  /** Contenido pegado al borde derecho, dentro del campo (ej. ver contraseña). */
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, prefix, suffix, className, id, required, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const control = (
    <input
      id={inputId}
      ref={ref}
      className={`${s.control} ${error ? s.controlError : ''} ${suffix ? s.controlWithSuffix : ''} ${className ?? ''}`}
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
      {prefix || suffix ? (
        <div className={s.inputAffix}>
          {prefix && <span className={s.inputPrefix}>{prefix}</span>}
          {control}
          {suffix && <span className={s.inputSuffix}>{suffix}</span>}
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
