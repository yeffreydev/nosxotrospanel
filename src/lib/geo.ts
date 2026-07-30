/**
 * Utilidades de ubicación compartidas por los formularios que piden un enlace
 * de mapa (campaña, centro de acopio, zona).
 */

/**
 * Extrae lat/lng de un enlace de mapa pegado por el organizador. Cubre los
 * formatos de Google Maps (@lat,lng / !3dlat!4dlng / ?q=lat,lng) y los de Waze
 * y OSM (?ll= / #map=z/lat/lng). Si no coincide, se conserva el enlace igual:
 * sirve para abrir la ruta aunque no podamos ubicar el pin en nuestro mapa.
 */
export function coordsFromMapUrl(url: string): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/, // google: /@-16.4,-71.5,17z
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, // google: place data
    /[?&](?:q|query|ll|sll|daddr)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, // google/waze: ?q= / ?query= / ?ll=
    /#map=\d+\/(-?\d+\.\d+)\/(-?\d+\.\d+)/, // osm: #map=15/lat/lng
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

export function isHttpUrl(value: string): boolean {
  try {
    return /^https?:$/.test(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** Enlace de Google Maps a unas coordenadas, para compartir la ruta. */
export function mapUrlFromCoords(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** Coordenadas por defecto (centro de Arequipa) cuando no hay ubicación. */
export const AQP = { lat: -16.409, lng: -71.537 };

/**
 * Centroide aproximado de cada distrito de la provincia de Arequipa (fuente:
 * jmcastagnetto/ubigeo-peru-aumentado). Sirve para zonificar en el mapa las
 * campañas que no tienen coordenadas exactas: en vez de un pin puntual, se
 * sombrea la zona del distrito elegido. No son los límites reales del
 * distrito, solo un punto central aproximado.
 */
export const AREQUIPA_DISTRICT_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  'Alto Selva Alegre': { lat: -16.38, lng: -71.5211111111111 },
  Arequipa: { lat: -16.3933333333333, lng: -71.5288888888889 },
  Cayma: { lat: -16.3625, lng: -71.5441666666667 },
  'Cerro Colorado': { lat: -16.3763888888889, lng: -71.5608333333333 },
  Characato: { lat: -16.4686111111111, lng: -71.4844444444445 },
  Chiguata: { lat: -16.4036111111111, lng: -71.3916666666667 },
  'Jacobo Hunter': { lat: -16.4413888888889, lng: -71.5586111111111 },
  'Jose Luis Bustamante y Rivero': { lat: -16.4266666666667, lng: -71.5238888888889 },
  'La Joya': { lat: -16.4230555555556, lng: -71.8183333333333 },
  'Mariano Melgar': { lat: -16.4072222222222, lng: -71.5055555555555 },
  Miraflores: { lat: -16.3947222222222, lng: -71.5225 },
  Mollebaya: { lat: -16.4872222222222, lng: -71.4669444444445 },
  Paucarpata: { lat: -16.4327777777778, lng: -71.5047222222222 },
  Pocsi: { lat: -16.5177777777778, lng: -71.3897222222222 },
  Polobaya: { lat: -16.5658333333333, lng: -71.3683333333333 },
  Quequeqa: { lat: -16.5572222222222, lng: -71.4513888888889 },
  Sabandia: { lat: -16.4569444444444, lng: -71.4947222222222 },
  Sachaca: { lat: -16.4244444444444, lng: -71.5663888888889 },
  'San Juan de Siguas': { lat: -16.3461111111111, lng: -72.1283333333333 },
  'San Juan de Tarucani': { lat: -16.1836111111111, lng: -71.0619444444444 },
  'Santa Isabel de Siguas': { lat: -16.3208333333333, lng: -72.0988888888889 },
  'Santa Rita de Siguas': { lat: -16.4936111111111, lng: -72.0947222222222 },
  Socabaya: { lat: -16.4675, lng: -71.5286111111111 },
  Tiabaya: { lat: -16.4494444444444, lng: -71.5916666666667 },
  Uchumayo: { lat: -16.4252777777778, lng: -71.6725 },
  Vitor: { lat: -16.4658333333333, lng: -71.9358333333333 },
  Yanahuara: { lat: -16.3819444444444, lng: -71.5363888888889 },
  Yarabamba: { lat: -16.5466666666667, lng: -71.4755555555556 },
  Yura: { lat: -16.2469444444444, lng: -71.7063888888889 },
};

// ───────── Selector región / provincia / distrito (Perú) ─────────

export interface UbigeoRegion {
  code: string;
  name: string;
}
export interface UbigeoProvincia {
  code: string;
  name: string;
  region: string;
}
export interface UbigeoDistrito {
  code: string;
  name: string;
  province: string;
}
export interface PeruUbigeo {
  regiones: UbigeoRegion[];
  provincias: UbigeoProvincia[];
  distritos: UbigeoDistrito[];
}

let ubigeoCache: Promise<PeruUbigeo> | null = null;

/**
 * Carga el árbol región → provincia → distrito del Perú. Se pide como chunk
 * aparte (import dinámico) porque solo lo usa el formulario de campaña: no
 * tiene sentido meter ~100 KB de datos en el bundle principal.
 */
export function loadPeruUbigeo(): Promise<PeruUbigeo> {
  if (!ubigeoCache) {
    ubigeoCache = import('./peru-ubigeo.json').then((m) => m.default as PeruUbigeo);
  }
  return ubigeoCache;
}
