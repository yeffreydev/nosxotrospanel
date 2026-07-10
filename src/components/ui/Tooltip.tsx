import type { ReactNode } from 'react';
import s from './ui.module.css';

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className={s.tooltipWrap}>
      {children}
      <span className={s.tooltipBubble} role="tooltip">
        {label}
      </span>
    </span>
  );
}
