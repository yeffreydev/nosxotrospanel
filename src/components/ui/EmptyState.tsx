import type { ReactNode } from 'react';
import s from './ui.module.css';
import { Icon, type IconName } from './Icon';

export function EmptyState({
  icon = 'box',
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className={s.empty}>
      <span className={s.emptyIcon}>
        <Icon name={icon} size={32} />
      </span>
      <div className={s.emptyTitle}>{title}</div>
      {message && <p style={{ maxWidth: 320 }}>{message}</p>}
      {action}
    </div>
  );
}
