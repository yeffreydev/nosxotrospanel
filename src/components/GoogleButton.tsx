import { useEffect, useRef } from 'react';
import css from './GoogleButton.module.css';

// Botón de acceso con Google (GIS).
// - Si `disabled` (o falta VITE_GOOGLE_CLIENT_ID): muestra un botón deshabilitado ("Próximamente").
// - Si está habilitado: renderiza el botón oficial de Google Identity Services y
//   devuelve el ID token (credential) al callback.

interface GsiId {
  initialize(cfg: {
    client_id: string;
    callback: (resp: { credential: string }) => void;
  }): void;
  renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GsiId } };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

let scriptPromise: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar Google Sign-In'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

function GoogleG({ muted }: { muted?: boolean }) {
  if (muted) {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Zm-8.64 9c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.98v2.33A9 9 0 0 0 9 18.2Zm-5.03-5.28A5.4 5.4 0 0 1 3.68 9c0-.35.06-.7.16-1.03V5.64H.98A9 9 0 0 0 0 9c0 1.45.35 2.82.98 4.03l2.99-2.11Zm5.03-8.6c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.47 1.16 11.43.4 9 .4A9 9 0 0 0 .98 5.64l2.99 2.33C4.68 5.85 6.66 4.32 9 4.32Z"
        />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18.2c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.98v2.33A9 9 0 0 0 9 18.2Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.92A5.4 5.4 0 0 1 3.68 9c0-.67.12-1.32.29-1.92V4.75H.98A9 9 0 0 0 0 9c0 1.45.35 2.82.98 4.03l2.99-2.11Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.47 1.16 11.43.4 9 .4A9 9 0 0 0 .98 4.75l2.99 2.33C4.68 4.96 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

interface Props {
  onCredential?: (idToken: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  /** Muestra el botón inhabilitado (por ahora Google no está activo). */
  disabled?: boolean;
  /** Etiqueta del botón deshabilitado. */
  label?: string;
  /** Texto secundario del botón deshabilitado (ej. "Próximamente"). */
  soon?: string;
}

export default function GoogleButton({
  onCredential,
  text = 'continue_with',
  disabled,
  label = 'Continuar con Google',
  soon,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;

  const inactive = disabled || !CLIENT_ID;

  useEffect(() => {
    if (inactive) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        const id = window.google?.accounts?.id;
        if (cancelled || !id || !ref.current) return;
        id.initialize({
          client_id: CLIENT_ID as string,
          callback: (resp) => cb.current?.(resp.credential),
        });
        ref.current.innerHTML = '';
        id.renderButton(ref.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'pill',
          width: 320,
          logo_alignment: 'center',
        });
      })
      .catch(() => {
        /* red/carga falló: el botón simplemente no aparece */
      });
    return () => {
      cancelled = true;
    };
  }, [text, inactive]);

  if (inactive) {
    return (
      <button
        type="button"
        className={css.disabled}
        disabled
        aria-disabled="true"
        title={soon}
      >
        <GoogleG muted />
        <span className={css.label}>{label}</span>
        {soon && <span className={css.soon}>{soon}</span>}
      </button>
    );
  }

  return (
    <div ref={ref} style={{ display: 'flex', justifyContent: 'center' }} />
  );
}
