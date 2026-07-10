import type { ButtonHTMLAttributes, ReactNode } from 'react';
import s from './ui.module.css';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'gold' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  children?: ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary: s.btnPrimary,
  gold: s.btnGold,
  ghost: s.btnGhost,
  danger: s.btnDanger,
  subtle: s.btnSubtle,
};

const sizeClass: Record<Size, string> = {
  sm: s.btnSm,
  md: '',
  lg: s.btnLg,
};

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  loading,
  icon,
  iconRight,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  const cls = [
    s.btn,
    variantClass[variant],
    sizeClass[size],
    block ? s.btnBlock : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={cls} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading && (
        <span className={s.btnSpinner}>
          <span className={s.spinner} style={{ width: 18, height: 18 }} />
        </span>
      )}
      <span className={loading ? s.btnLoadingLabel : undefined} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        {icon && <Icon name={icon} size={size === 'lg' ? 22 : 18} />}
        {children}
        {iconRight && <Icon name={iconRight} size={size === 'lg' ? 22 : 18} />}
      </span>
    </button>
  );
}
