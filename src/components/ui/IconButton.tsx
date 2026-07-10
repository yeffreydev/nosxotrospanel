import type { ButtonHTMLAttributes } from 'react';
import s from './ui.module.css';
import { Icon, type IconName } from './Icon';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  size?: 'sm' | 'md';
  solid?: boolean;
  iconSize?: number;
}

export function IconButton({
  icon,
  label,
  size = 'md',
  solid,
  iconSize,
  className,
  ...rest
}: IconButtonProps) {
  const cls = [s.iconBtn, size === 'sm' ? s.iconBtnSm : '', solid ? s.iconBtnSolid : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={cls} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={iconSize ?? (size === 'sm' ? 18 : 20)} />
    </button>
  );
}
