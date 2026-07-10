import s from './ui.module.css';
import { Icon, type IconName } from './Icon';

export interface TimelineStep {
  title: string;
  subtitle?: string;
  time?: string;
  icon?: IconName;
  done?: boolean;
}

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className={s.timeline}>
      {steps.map((step, i) => (
        <div className={s.timelineItem} key={i}>
          <div className={s.timelineRail}>
            <span className={`${s.timelineDot} ${step.done ? s.timelineDotDone : ''}`}>
              <Icon name={step.icon ?? (step.done ? 'check' : 'clock')} size={15} strokeWidth={2.5} />
            </span>
          </div>
          <div className={s.timelineContent}>
            <div style={{ fontWeight: 'var(--fw-semibold)' }}>{step.title}</div>
            {step.subtitle && (
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{step.subtitle}</div>
            )}
            {step.time && (
              <div style={{ color: 'var(--ink-300)', fontSize: 'var(--fs-xs)', marginTop: 2 }}>{step.time}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
