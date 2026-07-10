import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import s from './layout.module.css';
import { Brand } from '../Brand';
import { IconButton, Button, Avatar } from '../ui';
import { SettingsSheet } from '../SettingsSheet';
import { NotificationsSheet } from '../NotificationsSheet';
import { useAuth } from '../../store/auth';
import { useT } from '../../lib/i18n';
import { useNotifications } from '../../hooks/api';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { PUBLIC_NAV } from './nav';

export function AppHeader() {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: notifs } = useNotifications(!!user);
  const unread = (notifs ?? []).filter((n) => !n.read).length;
  const { canInstall, installed, isIOS, promptInstall } = usePwaInstall();

  const showInstall = !installed && (canInstall || isIOS);
  const onInstall = () => {
    if (isIOS && !canInstall) {
      alert('En iPhone/iPad: toca Compartir → «Añadir a pantalla de inicio».');
      return;
    }
    promptInstall();
  };

  return (
    <header className={s.header}>
      <div className={s.headerInner}>
        <Brand logo />
        {!user && (
          <nav className={s.headerNav} aria-label="Principal">
            {PUBLIC_NAV.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `${s.headerLink} ${isActive ? s.headerLinkActive : ''}`
                }
              >
                {t(l.labelKey)}
              </NavLink>
            ))}
          </nav>
        )}

        <div className={s.headerRight}>
          {showInstall && (
            <Button size="sm" variant="gold" icon="download" onClick={onInstall}>
              {t('nav.install')}
            </Button>
          )}
          {user && (
            <span className={s.bellWrap}>
              <IconButton icon="bell" label={t('nav.notifications')} onClick={() => setNotifOpen(true)} />
              {unread > 0 && <span className={s.bellDot}>{unread > 9 ? '9+' : unread}</span>}
            </span>
          )}
          <IconButton icon="settings" label={t('nav.settings')} onClick={() => setSettingsOpen(true)} />
          {user ? (
            <button
              type="button"
              onClick={() => navigate(homeFor(user.role))}
              aria-label={user.fullName}
              style={{ borderRadius: '50%' }}
            >
              <Avatar name={user.fullName} src={user.avatarUrl} size={38} />
            </button>
          ) : (
            <Button size="sm" onClick={() => navigate('/login')}>
              {t('nav.login')}
            </Button>
          )}
        </div>
      </div>
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} />
    </header>
  );
}

function homeFor(role: string): string {
  switch (role) {
    case 'DONOR':
      return '/donante';
    case 'VOLUNTEER':
      return '/voluntario';
    case 'REGISTRAR':
      return '/empadronar';
    default:
      return '/gestor';
  }
}
