import type {
  CampaignCategory,
  CampaignStatus,
  CenterStatus,
  DonationStatus,
  Severity,
} from './types';
import type { IconName } from '../components/ui';

export function formatSoles(value?: number): string {
  if (value == null) return 'S/ 0';
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value?: number): string {
  if (value == null) return '0';
  return new Intl.NumberFormat('es-PE').format(value);
}

export function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

export function relativeTime(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  LOW: 'var(--info-500)',
  MEDIUM: 'var(--gold-500)',
  HIGH: 'var(--warn-500)',
  CRITICAL: 'var(--danger-500)',
};

export function statusTone(status: DonationStatus): 'success' | 'info' | 'warn' | 'neutral' {
  switch (status) {
    case 'DELIVERED':
      return 'success';
    case 'IN_TRANSIT':
    case 'RECEIVED':
      return 'info';
    case 'PENDING':
      return 'warn';
    default:
      return 'neutral';
  }
}

export function centerTone(status: CenterStatus): 'success' | 'warn' | 'danger' | 'neutral' {
  switch (status) {
    case 'OPEN':
      return 'success';
    case 'NEAR_FULL':
      return 'warn';
    case 'FULL':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function initials(name?: string): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export const CAMPAIGN_CATEGORY: Record<CampaignCategory, { label: string; icon: IconName }> = {
  HEALTH: { label: 'Salud', icon: 'activity' },
  EDUCATION: { label: 'Educación', icon: 'book' },
  ENVIRONMENT: { label: 'Medio ambiente', icon: 'leaf' },
  ENTREPRENEURSHIP: { label: 'Emprendimiento', icon: 'lightbulb' },
  COMMUNITY: { label: 'Comunidad', icon: 'users' },
  EMERGENCY: { label: 'Emergencia', icon: 'alert' },
  ANIMALS: { label: 'Animales', icon: 'paw' },
  CULTURE: { label: 'Cultura', icon: 'palette' },
  TECHNOLOGY: { label: 'Tecnología', icon: 'cpu' },
  SPORTS: { label: 'Deporte', icon: 'trophy' },
  OTHER: { label: 'Otro', icon: 'spark' },
};

export const CAMPAIGN_STATUS: Record<
  CampaignStatus,
  { label: string; tone: 'success' | 'info' | 'warn' | 'danger' | 'neutral' }
> = {
  DRAFT: { label: 'Borrador', tone: 'neutral' },
  ACTIVE: { label: 'Activa', tone: 'info' },
  PAUSED: { label: 'Pausada', tone: 'warn' },
  FUNDED: { label: 'Meta alcanzada', tone: 'success' },
  COMPLETED: { label: 'Completada', tone: 'success' },
  CANCELLED: { label: 'Cancelada', tone: 'danger' },
};

export function daysLeft(iso?: string): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

/** Unidades comunes para necesidades (selector). */
export const NEED_UNITS = [
  'unidad',
  'kg',
  'litros',
  'cajas',
  'paquetes',
  'bolsas',
  'raciones',
  'pares',
];
