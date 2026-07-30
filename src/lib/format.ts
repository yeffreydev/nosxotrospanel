import type {
  CampaignCategory,
  CampaignStatus,
  CategoryKind,
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
    case 'PROMISED':
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

/**
 * Unidades de medida comunes (selector de metas e inventario).
 *
 * La unidad forma parte de la identidad del producto: "arroz · kg" y
 * "arroz · bolsas" son dos líneas distintas del almacén a propósito.
 */
export const NEED_UNITS = [
  'unidad',
  'kg',
  'litros',
  'galón',
  'cajas',
  'paquetes',
  'bolsas',
  'sacos',
  'raciones',
  'pares',
  'kit',
  'rollos',
  'metros',
  'viaje',
  'hora',
];

/**
 * Nombre de producto normalizado, igual que `normalizeKey` del backend.
 *
 * Es la identidad con la que se agrupa el almacén: "Frazadas", "frazadas" y
 * "  FRAZADAS " son el mismo producto, así que la app puede avisar que la
 * cantidad se va a sumar antes de mandar el ingreso.
 */
export function normalizeItemName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Tipo de ayuda de una categoría (bienes, herramientas, transporte…). */
export const CATEGORY_KIND: Record<CategoryKind, { label: string; icon: string }> = {
  SUPPLY: { label: 'Bienes de acopio', icon: '📦' },
  TOOL: { label: 'Herramientas', icon: '🛠️' },
  TRANSPORT: { label: 'Transporte', icon: '🚚' },
  FUEL: { label: 'Combustible', icon: '⛽' },
  SERVICE: { label: 'Servicios', icon: '🤝' },
  OTHER: { label: 'Otro', icon: '🔹' },
};

/** Días de la semana (0=domingo … 6=sábado), como los guarda el backend. */
export const WEEKDAYS: { value: number; short: string; label: string }[] = [
  { value: 1, short: 'L', label: 'Lunes' },
  { value: 2, short: 'M', label: 'Martes' },
  { value: 3, short: 'X', label: 'Miércoles' },
  { value: 4, short: 'J', label: 'Jueves' },
  { value: 5, short: 'V', label: 'Viernes' },
  { value: 6, short: 'S', label: 'Sábado' },
  { value: 0, short: 'D', label: 'Domingo' },
];

/** Franjas horarias típicas: evita escribir horas a mano en el móvil. */
export const TIME_PRESETS: { label: string; startTime: string; endTime: string }[] = [
  { label: 'Mañana (8:00–13:00)', startTime: '08:00', endTime: '13:00' },
  { label: 'Tarde (14:00–18:00)', startTime: '14:00', endTime: '18:00' },
  { label: 'Todo el día (8:00–18:00)', startTime: '08:00', endTime: '18:00' },
  { label: 'Noche (18:00–22:00)', startTime: '18:00', endTime: '22:00' },
];

/** "L, M y V · 08:00–13:00" — resumen legible de una disponibilidad. */
export function describeWeekdays(days?: number[]): string {
  if (!days || days.length === 0) return '';
  if (days.length === 7) return 'Todos los días';
  const labels = WEEKDAYS.filter((d) => days.includes(d.value)).map((d) => d.label);
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
}

/** Fecha de hoy en formato YYYY-MM-DD (hora local, no UTC). */
export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
