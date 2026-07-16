// Resuelve la URL de una imagen subida al backend.
//
// El backend devuelve URLs absolutas construidas con PUBLIC_BASE_URL. Si esa
// variable no está definida al subir, la URL queda clavada a localhost y la
// imagen no carga desde ningún otro equipo (ni en producción). Como la ruta
// /uploads/<archivo> sí es estable, aquí se vuelve a basar contra la API actual.

const API_ORIGIN = (() => {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  // Sin VITE_API_URL: dev con proxy de Vite, /uploads ya llega al backend.
  if (!raw) return '';
  try {
    return new URL(raw, window.location.origin).origin;
  } catch {
    return '';
  }
})();

const UPLOAD_PREFIX = '/uploads/';

function isLocalHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
}

export function assetUrl(url?: string | null): string {
  if (!url) return '';

  // Ruta relativa del backend → prefijar con el origen de la API.
  if (url.startsWith(UPLOAD_PREFIX)) return `${API_ORIGIN}${url}`;

  if (!/^https?:\/\//i.test(url)) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  // Absoluta hacia localhost y con nuestra ruta de subidas: es una URL guardada
  // con la base equivocada. Se rebasa; si estamos en dev, queda relativa y el
  // proxy la resuelve.
  if (parsed.pathname.startsWith(UPLOAD_PREFIX) && isLocalHost(parsed.hostname)) {
    return `${API_ORIGIN}${parsed.pathname}`;
  }

  return url;
}
