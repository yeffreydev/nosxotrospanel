import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import s from './ui.module.css';
import { Icon, type IconName } from './Icon';
import { playDing } from '../../lib/sound';

type ToastKind = 'success' | 'info' | 'warn' | 'error';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title?: string;
  message: string;
}

interface ToastOptions {
  title?: string;
  duration?: number;
  silent?: boolean;
}

interface ToastApi {
  success: (message: string, opts?: ToastOptions) => void;
  info: (message: string, opts?: ToastOptions) => void;
  warn: (message: string, opts?: ToastOptions) => void;
  error: (message: string, opts?: ToastOptions) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const KIND_CLASS: Record<ToastKind, string> = {
  success: s.toastSuccess,
  info: s.toastInfo,
  warn: s.toastWarn,
  error: s.toastError,
};

const KIND_ICON: Record<ToastKind, IconName> = {
  success: 'checkCircle',
  info: 'info',
  warn: 'alert',
  error: 'alert',
};

const KIND_COLOR: Record<ToastKind, string> = {
  success: 'var(--brand-600)',
  info: 'var(--info-500)',
  warn: 'var(--warn-500)',
  error: 'var(--danger-500)',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string, opts?: ToastOptions) => {
      const id = ++idRef.current;
      setToasts((cur) => [...cur, { id, kind, message, title: opts?.title }]);
      if (!opts?.silent) {
        playDing(kind === 'error' ? 'error' : kind === 'success' ? 'success' : 'info');
      }
      const duration = opts?.duration ?? (kind === 'error' ? 6000 : 3800);
      window.setTimeout(() => remove(id), duration);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, o) => push('success', m, o),
      info: (m, o) => push('info', m, o),
      warn: (m, o) => push('warn', m, o),
      error: (m, o) => push('error', m, o),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className={s.toastViewport} role="region" aria-live="polite" aria-label="Notificaciones">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`${s.toast} ${KIND_CLASS[t.kind]}`}
              role={t.kind === 'error' ? 'alert' : 'status'}
              onClick={() => remove(t.id)}
            >
              <span className={s.toastIcon} style={{ color: KIND_COLOR[t.kind] }}>
                <Icon name={KIND_ICON[t.kind]} size={20} />
              </span>
              <div className={s.toastBody}>
                {t.title && <div className={s.toastTitle}>{t.title}</div>}
                <div className={s.toastMsg}>{t.message}</div>
              </div>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
