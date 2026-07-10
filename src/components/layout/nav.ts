import type { IconName } from '../ui';
import type { Role } from '../../lib/types';

export interface NavLink {
  to: string;
  labelKey: string;
  icon: IconName;
}

export const ROLE_NAV: Record<Role, NavLink[]> = {
  DONOR: [
    { to: '/donante', labelKey: 'donor.title', icon: 'heart' },
    { to: '/campanas', labelKey: 'nav.campaigns', icon: 'spark' },
    { to: '/donar', labelKey: 'nav.donate', icon: 'gift' },
    { to: '/seguir', labelKey: 'nav.track', icon: 'pin' },
  ],
  VOLUNTEER: [
    { to: '/voluntario', labelKey: 'nav.dashboard', icon: 'spark' },
    { to: '/campanas', labelKey: 'nav.campaigns', icon: 'fire' },
    { to: '/mapa', labelKey: 'nav.map', icon: 'map' },
    { to: '/donar', labelKey: 'nav.donate', icon: 'gift' },
  ],
  MANAGER: [
    { to: '/organizador', labelKey: 'nav.campaigns', icon: 'spark' },
    { to: '/gestor', labelKey: 'nav.emergencies', icon: 'fire' },
    { to: '/mapa', labelKey: 'nav.map', icon: 'map' },
  ],
  ADMIN: [
    { to: '/organizador', labelKey: 'nav.campaigns', icon: 'spark' },
    { to: '/gestor', labelKey: 'nav.emergencies', icon: 'fire' },
    { to: '/mapa', labelKey: 'nav.map', icon: 'map' },
  ],
  REGISTRAR: [
    { to: '/empadronar', labelKey: 'nav.census', icon: 'list' },
    { to: '/mapa', labelKey: 'nav.map', icon: 'map' },
  ],
};

// App de administración: sin navegación pública (solo login/registro y paneles).
export const PUBLIC_NAV: NavLink[] = [];
