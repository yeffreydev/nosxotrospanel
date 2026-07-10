import L from 'leaflet';
import type { CenterStatus, Severity } from './types';
import { SEVERITY_COLOR } from './format';

// Default Leaflet marker icons break under bundlers; provide a CDN fallback once.
let fixed = false;
export function ensureLeafletIcons() {
  if (fixed) return;
  fixed = true;
  const proto = L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown };
  delete proto._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

function pinSvg(color: string, glyph = ''): string {
  return `
  <div style="position:relative;width:30px;height:40px;transform:translate(-15px,-40px);filter:drop-shadow(0 4px 6px rgba(0,0,0,.3))">
    <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 10 15 25 15 25s15-15 15-25C30 6.7 23.3 0 15 0z" fill="${color}"/>
      <circle cx="15" cy="15" r="6.5" fill="#fff"/>
    </svg>
    <span style="position:absolute;top:8px;left:0;width:30px;text-align:center;font-size:12px;font-weight:700;color:${color}">${glyph}</span>
  </div>`;
}

export function severityIcon(severity: Severity): L.DivIcon {
  ensureLeafletIcons();
  return L.divIcon({
    className: 'nx-marker',
    html: pinSvg(SEVERITY_COLOR[severity]),
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -38],
  });
}

const CENTER_COLOR: Record<CenterStatus, string> = {
  OPEN: 'var(--brand-500)',
  NEAR_FULL: '#f5b707',
  FULL: '#e23b3b',
  CLOSED: '#767676',
};

export function centerIcon(status: CenterStatus): L.DivIcon {
  ensureLeafletIcons();
  const color =
    status === 'OPEN'
      ? '#3cc139'
      : status === 'NEAR_FULL'
        ? '#f5b707'
        : status === 'FULL'
          ? '#e23b3b'
          : '#767676';
  void CENTER_COLOR;
  return L.divIcon({
    className: 'nx-marker',
    html: pinSvg(color, '◉'),
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -38],
  });
}

export const AREQUIPA_CENTER: [number, number] = [-16.409, -71.537];
