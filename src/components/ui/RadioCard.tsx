import s from './ui.module.css';
import { Icon, type IconName } from './Icon';

export function RadioCard({
  active,
  onClick,
  icon,
  title,
  desc,
  compact,
}: {
  active?: boolean;
  onClick?: () => void;
  icon?: IconName;
  title: string;
  desc?: string;
  /** Vertical tile: icon over label, no check. Good for tight grids. */
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      className={`${s.radioCard} ${compact ? s.radioCardCompact : ''} ${
        active ? s.radioCardActive : ''
      }`}
      onClick={onClick}
    >
      {icon && (
        <span className={s.radioCardIcon}>
          <Icon name={icon} size={compact ? 22 : 24} />
        </span>
      )}
      <span className={s.radioCardBody}>
        <span className={s.radioCardTitle}>{title}</span>
        {desc && <span className={s.radioCardDesc}>{desc}</span>}
      </span>
      {!compact && (
        <span className={s.radioCardCheck} aria-hidden="true">
          {active && <Icon name="check" size={16} strokeWidth={3} />}
        </span>
      )}
    </button>
  );
}
