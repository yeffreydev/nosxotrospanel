import s from './ui.module.css';

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <span
      className={s.spinner}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Cargando"
    />
  );
}

export function CenteredSpinner({ label }: { label?: string }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: 'var(--sp-8)', gap: 'var(--sp-3)' }}>
      <Spinner size={32} />
      {label && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{label}</span>}
    </div>
  );
}
