import type { ReactNode } from 'react';
import s from './ui.module.css';
import { Icon } from './Icon';

export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className={s.checkbox}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span className={`${s.checkboxBox} ${checked ? s.checkboxChecked : ''}`} aria-hidden="true">
        {checked && <Icon name="check" size={16} strokeWidth={3} />}
      </span>
      <span>{children}</span>
    </label>
  );
}
