import s from './ui.module.css';
import { Icon } from './Icon';

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  ariaLabel?: string;
}) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className={s.field}>
      {label && <span className={s.label}>{label}</span>}
      <div className={s.stepper}>
        <button
          type="button"
          className={s.stepperBtn}
          onClick={() => set(value - step)}
          disabled={value <= min}
          aria-label={`Disminuir ${ariaLabel ?? label ?? ''}`}
        >
          <Icon name="minus" size={26} />
        </button>
        <span className={s.stepperValue} aria-live="polite" aria-label={ariaLabel ?? label}>
          {value}
        </span>
        <button
          type="button"
          className={s.stepperBtn}
          onClick={() => set(value + step)}
          disabled={value >= max}
          aria-label={`Aumentar ${ariaLabel ?? label ?? ''}`}
        >
          <Icon name="plus" size={26} />
        </button>
      </div>
    </div>
  );
}
