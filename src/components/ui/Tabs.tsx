import type { ReactNode } from 'react';
import s from './ui.module.css';
import { Icon, type IconName } from './Icon';

export interface TabItem {
  value: string;
  label: string;
  icon?: IconName;
  badge?: ReactNode;
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: TabItem[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={s.tabs} role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={value === it.value}
          className={`${s.tab} ${value === it.value ? s.tabActive : ''}`}
          onClick={() => onChange(it.value)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)' }}
        >
          {it.icon && <Icon name={it.icon} size={18} />}
          {it.label}
          {it.badge}
        </button>
      ))}
    </div>
  );
}
