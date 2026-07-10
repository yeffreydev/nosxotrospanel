import { useState } from 'react';
import { Button, Modal, Icon, useToast } from './ui';
import { Brand } from './Brand';
import { usePwaInstall } from '../hooks/usePwaInstall';

const DISMISS_KEY = 'nx_install_dismissed';

/**
 * Banner flotante de instalación de la PWA + instrucciones para iOS.
 * Aparece una sola vez (se recuerda el descarte) cuando la app es instalable
 * y todavía no corre en modo standalone.
 */
export function InstallPrompt() {
  const { canInstall, installed, isIOS, promptInstall } = usePwaInstall();
  const toast = useToast();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  );
  const [iosOpen, setIosOpen] = useState(false);

  const show = !installed && !dismissed && (canInstall || isIOS);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (isIOS && !canInstall) {
      setIosOpen(true);
      return;
    }
    const ok = await promptInstall();
    if (ok) {
      toast.success('¡Listo! NOSXOTROS se está instalando.');
      setDismissed(true);
    }
  };

  return (
    <>
      {show && (
        <div role="region" aria-label="Instalar aplicación" style={bannerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', minWidth: 0 }}>
            <span style={iconBadge} aria-hidden>
              <Icon name="download" size={20} />
            </span>
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: 'var(--fs-sm)' }}>
                Instala NOSXOTROS
              </strong>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                Acceso rápido y uso offline en campo.
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexShrink: 0 }}>
            <Button size="sm" icon="download" onClick={handleInstall}>
              Instalar
            </Button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Cerrar"
              style={closeBtn}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>
      )}

      <Modal
        open={iosOpen}
        onClose={() => setIosOpen(false)}
        size="md"
        title="Instalar en iPhone / iPad"
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--sp-4)' }}>
          <Brand />
        </div>
        <ol style={{ paddingLeft: 'var(--sp-5)', lineHeight: 'var(--lh-base)', margin: 0 }}>
          <li style={{ marginBottom: 'var(--sp-2)' }}>
            Toca el botón <strong>Compartir</strong>{' '}
            <Icon name="share" size={15} style={{ verticalAlign: 'middle' }} /> en Safari.
          </li>
          <li style={{ marginBottom: 'var(--sp-2)' }}>
            Elige <strong>«Añadir a pantalla de inicio»</strong>{' '}
            <Icon name="plus" size={15} style={{ verticalAlign: 'middle' }} />.
          </li>
          <li>
            Confirma con <strong>«Añadir»</strong>. ¡Listo!
          </li>
        </ol>
      </Modal>
    </>
  );
}

const bannerStyle: React.CSSProperties = {
  position: 'fixed',
  left: '50%',
  transform: 'translateX(-50%)',
  bottom: 'calc(var(--tabbar-h, 0px) + env(safe-area-inset-bottom, 0px) + 12px)',
  width: 'min(560px, calc(100vw - 24px))',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--sp-3)',
  padding: 'var(--sp-3) var(--sp-4)',
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-lg)',
  boxShadow: 'var(--sh-lg)',
  zIndex: 'var(--z-toast)' as unknown as number,
};

const iconBadge: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 38,
  height: 38,
  flexShrink: 0,
  borderRadius: 'var(--r-md)',
  background: 'var(--brand-50)',
  color: 'var(--brand-700)',
};

const closeBtn: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 34,
  height: 34,
  borderRadius: 'var(--r-full)',
  color: 'var(--text-muted)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
};
