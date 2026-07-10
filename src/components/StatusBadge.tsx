import { Badge, type BadgeTone } from './ui';
import { useT } from '../lib/i18n';

const TONE_MAP: Record<string, BadgeTone> = {
  // donation
  PENDING: 'warn',
  RECEIVED: 'info',
  IN_TRANSIT: 'info',
  DELIVERED: 'success',
  CANCELLED: 'neutral',
  // beneficiary
  VALIDATED: 'success',
  SERVED: 'success',
  REJECTED: 'danger',
  // emergency
  ACTIVE: 'danger',
  MONITORING: 'warn',
  RESOLVED: 'success',
  DRAFT: 'neutral',
  // center
  OPEN: 'success',
  NEAR_FULL: 'warn',
  FULL: 'danger',
  CLOSED: 'neutral',
  // shift / dispatch
  PREPARING: 'warn',
  DONE: 'success',
  IN_PROGRESS: 'info',
};

export function StatusBadge({ status, dot = true }: { status: string; dot?: boolean }) {
  const t = useT();
  const tone = TONE_MAP[status] ?? 'neutral';
  return (
    <Badge tone={tone} dot={dot}>
      {t(`status.${status}`)}
    </Badge>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const t = useT();
  const tone: BadgeTone =
    severity === 'CRITICAL'
      ? 'danger'
      : severity === 'HIGH'
        ? 'warn'
        : severity === 'MEDIUM'
          ? 'gold'
          : 'info';
  return (
    <Badge tone={tone} dot>
      {t(`sev.${severity}`)}
    </Badge>
  );
}
