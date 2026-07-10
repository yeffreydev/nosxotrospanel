import s from './ui.module.css';
import { Icon, type IconName } from './Icon';

export function FAB({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" className={s.fab} onClick={onClick} aria-label={label} title={label}>
      <Icon name={icon} size={26} />
    </button>
  );
}
