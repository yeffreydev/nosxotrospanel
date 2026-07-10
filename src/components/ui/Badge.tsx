import type { ReactNode } from 'react';
import s from './ui.module.css';

export type BadgeTone = 'success' | 'info' | 'warn' | 'danger' | 'gold' | 'neutral';

const toneClass: Record<BadgeTone, string> = {
  success: s.badgeSuccess,
  info: s.badgeInfo,
  warn: s.badgeWarn,
  danger: s.badgeDanger,
  gold: s.badgeGold,
  neutral: s.badgeNeutral,
};

export function Badge({
  tone = 'neutral',
  dot,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`${s.badge} ${toneClass[tone]}`}>
      {dot && <span className={s.badgeDot} />}
      {children}
    </span>
  );
}
