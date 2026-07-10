import s from './manager.module.css';

type BarTone = 'brand' | 'gold' | 'info';

const barToneClass: Record<BarTone, string> = {
  brand: '',
  gold: s.barFillGold,
  info: s.barFillInfo,
};

export function BarChart({
  data,
  tone = 'brand',
  formatValue,
}: {
  data: { label: string; value: number }[];
  tone?: BarTone;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={s.bars}>
      {data.map((d, i) => (
        <div className={s.barRow} key={`${d.label}-${i}`}>
          <span className={s.barLabel} title={d.label}>
            {d.label}
          </span>
          <span className={s.barTrack}>
            <span
              className={`${s.barFill} ${barToneClass[tone]}`}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </span>
          <span className={s.barValue}>{formatValue ? formatValue(d.value) : d.value}</span>
        </div>
      ))}
    </div>
  );
}

export function LineChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return null;
  const W = 320;
  const H = 130;
  const pad = 10;
  const max = Math.max(1, ...data.map((d) => d.value));
  const min = Math.min(0, ...data.map((d) => d.value));
  const span = max - min || 1;
  const stepX = data.length > 1 ? (W - pad * 2) / (data.length - 1) : 0;
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);
  const coords = data.map((d, i) => [pad + i * stepX, y(d.value)] as const);
  const line = coords.map((c) => `${c[0]},${c[1]}`).join(' ');
  const area =
    `M ${coords[0][0]},${H - pad} ` +
    coords.map((c) => `L ${c[0]},${c[1]}`).join(' ') +
    ` L ${coords[coords.length - 1][0]},${H - pad} Z`;

  return (
    <div>
      <svg className={s.lineSvg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Tendencia de donaciones">
        <defs>
          <linearGradient id="nx-trend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(60,193,57,0.32)" />
            <stop offset="100%" stopColor="rgba(60,193,57,0)" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#nx-trend)" />
        <polyline points={line} fill="none" stroke="var(--brand-500)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c[0]} cy={c[1]} r={3} fill="#fff" stroke="var(--brand-600)" strokeWidth={2} />
        ))}
      </svg>
      <div className={s.lineLabels}>
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}
