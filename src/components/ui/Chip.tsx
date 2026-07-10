import type { ReactNode } from 'react';
import s from './ui.module.css';
import { Icon, type IconName } from './Icon';

export function Chip({
  active,
  onClick,
  icon,
  children,
  ariaLabel,
}: {
  active?: boolean;
  onClick?: () => void;
  icon?: IconName;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className={`${s.chip} ${active ? s.chipActive : ''}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}
