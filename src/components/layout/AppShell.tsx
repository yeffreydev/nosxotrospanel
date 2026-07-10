import { NavLink, Outlet } from 'react-router-dom';
import s from './layout.module.css';
import { AppHeader } from './AppHeader';
import { BottomTabBar } from './BottomTabBar';
import { InstallPrompt } from '../InstallPrompt';
import { Avatar, Button, Icon } from '../ui';
import { useAuth } from '../../store/auth';
import { useT } from '../../lib/i18n';
import { ROLE_NAV, PUBLIC_NAV } from './nav';

export function AppShell() {
  const t = useT();
  const { user, logout } = useAuth();
  const links = user ? ROLE_NAV[user.role] : PUBLIC_NAV;

  return (
    <div className={s.shell}>
      <AppHeader />
      <div className={s.withSidebar}>
        {user && (
          <aside className={s.sidebar} aria-label="Menú lateral">
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === '/'}
                  className={({ isActive }) =>
                    `${s.sidebarLink} ${isActive ? s.sidebarLinkActive : ''}`
                  }
                >
                  <Icon name={l.icon} size={20} />
                  {t(l.labelKey)}
                </NavLink>
              ))}
            </nav>
            <div className={s.sidebarSpacer} />
            <div className={s.userCard}>
              <Avatar name={user.fullName} src={user.avatarUrl} size={40} />
              <div style={{ minWidth: 0 }}>
                <div className={s.userName} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.fullName}
                </div>
                <div className={s.userRole}>{t(`role.${user.role}`)}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" icon="logout" block onClick={logout} style={{ marginTop: 'var(--sp-2)' }}>
              {t('nav.logout')}
            </Button>
          </aside>
        )}
        <main className={s.content}>
          <Outlet />
        </main>
      </div>
      {user && <BottomTabBar links={links} />}
      <InstallPrompt />
    </div>
  );
}

export function PageHead({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className={s.pageHead} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--sp-3)' }}>
      <div>
        <h1 className={s.pageTitle}>{title}</h1>
        {subtitle && <p className={s.pageSub}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
