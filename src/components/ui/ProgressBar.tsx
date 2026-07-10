import s from './ui.module.css';
import { clampPct } from '../../lib/format';

type Tone = 'brand' | 'gold' | 'warn' | 'danger';

const fillClass: Record<Tone, string> = {
  brand: s.progressFill,
  gold: `${s.progressFill} ${s.progressFillGold}`,
  warn: `${s.progressFill} ${s.progressFillWarn}`,
  danger: `${s.progressFill} ${s.progressFillDanger}`,
};

export function ProgressBar({
  value,
  max = 100,
  tone = 'brand',
  label,
  showPct = true,
  rightLabel,
}: {
  value: number;
  max?: number;
  tone?: Tone;
  label?: string;
  showPct?: boolean;
  rightLabel?: string;
}) {
  const pct = clampPct(max > 0 ? (value / max) * 100 : 0);
  return (
    <div className={s.progress}>
      {(label || showPct || rightLabel) && (
        <div className={s.progressMeta}>
          <span>{label}</span>
          <span>{rightLabel ?? (showPct ? <strong>{pct}%</strong> : null)}</span>
        </div>
      )}
      <div
        className={s.progressTrack}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={fillClass[tone]} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
