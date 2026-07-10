import type { ReactNode } from 'react';
import s from './ui.module.css';
import { Icon, type IconName } from './Icon';

type Tone = 'info' | 'success' | 'warn' | 'error';

const toneClass: Record<Tone, string> = {
  info: s.bannerInfo,
  success: s.bannerSuccess,
  warn: s.bannerWarn,
  error: s.bannerError,
};

const toneIcon: Record<Tone, IconName> = {
  info: 'info',
  success: 'checkCircle',
  warn: 'alert',
  error: 'alert',
};

export function Banner({
  tone = 'info',
  title,
  children,
  icon,
  action,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <div className={`${s.banner} ${toneClass[tone]}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={icon ?? toneIcon[tone]} size={20} />
      <div className={s.bannerBody}>
        {title && <div className={s.bannerTitle}>{title}</div>}
        {children && <div>{children}</div>}
      </div>
      {action}
    </div>
  );
}
