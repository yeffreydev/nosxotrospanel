import { NavLink } from 'react-router-dom';
import s from './layout.module.css';
import { Icon } from '../ui';
import { useT } from '../../lib/i18n';
import type { NavLink as NavLinkType } from './nav';

export function BottomTabBar({ links }: { links: NavLinkType[] }) {
  const t = useT();
  return (
    <nav className={s.tabbar} aria-label="Navegación principal">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/'}
          className={({ isActive }) => `${s.tabItem} ${isActive ? s.tabItemActive : ''}`}
        >
          <Icon name={l.icon} size={22} />
          <span>{t(l.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
