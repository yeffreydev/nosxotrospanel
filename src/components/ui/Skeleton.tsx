import s from './ui.module.css';

export function Skeleton({
  width = '100%',
  height = 16,
  radius,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={s.skeleton}
      aria-hidden="true"
      style={{ display: 'block', width, height, borderRadius: radius, ...style }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className={`${s.card} ${s.cardPad}`} aria-hidden="true">
      <Skeleton height={20} width="60%" />
      <div style={{ height: 'var(--sp-3)' }} />
      <Skeleton height={12} />
      <div style={{ height: 6 }} />
      <Skeleton height={12} width="80%" />
      <div style={{ height: 'var(--sp-4)' }} />
      <Skeleton height={10} radius="var(--r-full)" />
    </div>
  );
}
