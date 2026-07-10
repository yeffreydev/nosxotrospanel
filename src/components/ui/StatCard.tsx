import s from './ui.module.css';
import { Icon, type IconName } from './Icon';

export function StatCard({
  value,
  label,
  icon,
  trend,
  accent,
}: {
  value: string | number;
  label: string;
  icon?: IconName;
  trend?: { dir: 'up' | 'down'; text: string };
  accent?: string;
}) {
  return (
    <div className={s.statCard}>
      {icon && (
        <span className={s.statIcon} style={accent ? { background: 'transparent', color: accent } : undefined}>
          <Icon name={icon} size={22} />
        </span>
      )}
      <div className={s.statBody}>
        <div className={s.statLabel}>{label}</div>
        <div className={s.statValueRow}>
          <span className={s.statValue}>{value}</span>
          {trend && (
            <span className={`${s.statTrend} ${trend.dir === 'up' ? s.trendUp : s.trendDown}`}>
              <Icon name={trend.dir === 'up' ? 'trendUp' : 'trendDown'} size={14} />
              {trend.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
