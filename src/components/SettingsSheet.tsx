import { Sheet, Select, Button } from './ui';
import { Icon } from './ui';
import s from './layout/layout.module.css';
import { useSettings, LOCALES, type Locale } from '../store/settings';
import { useT } from '../lib/i18n';
import { usePwaInstall } from '../hooks/usePwaInstall';

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { locale, setLocale, sound, toggleSound } = useSettings();
  const { canInstall, installed, isIOS, promptInstall } = usePwaInstall();

  const onInstall = async () => {
    if (canInstall) {
      await promptInstall();
      return;
    }
    if (isIOS) {
      alert('En iPhone/iPad (Safari): toca Compartir → «Añadir a pantalla de inicio».');
      return;
    }
    alert(
      'Para instalar:\n' +
        '• Chrome/Edge escritorio: ícono «Instalar» en la barra de direcciones, o menú ⋮ → «Instalar app».\n' +
        '• Android (Chrome): menú ⋮ → «Instalar app» / «Añadir a pantalla de inicio».\n\n' +
        'Requiere abrir el sitio con HTTPS (o localhost) en un build de producción.',
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('nav.settings')}>
      <div className={s.settingRow}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <Icon name="globe" /> {t('settings.language')}
        </span>
        <Select
          aria-label={t('settings.language')}
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          options={LOCALES.map((l) => ({ value: l.value, label: l.native }))}
        />
      </div>
      <div className={s.settingRow} style={{ borderBottom: 'none' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <Icon name={sound ? 'sound' : 'soundOff'} /> {t('settings.sound')}
        </span>
        <button
          type="button"
          className={`${s.switch} ${sound ? s.switchOn : ''}`}
          role="switch"
          aria-checked={sound}
          aria-label={sound ? t('settings.soundOn') : t('settings.soundOff')}
          onClick={toggleSound}
        >
          <span className={s.switchKnob} />
        </button>
      </div>

      {installed ? (
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--brand-700)', marginTop: 'var(--sp-4)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <Icon name="checkCircle" size={18} /> App instalada
        </p>
      ) : (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <Button block variant="primary" icon="download" onClick={onInstall}>
            {t('nav.install')}
          </Button>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 'var(--sp-2)', textAlign: 'center' }}>
            {canInstall
              ? 'Úsala como app, incluso sin conexión.'
              : 'Si no abre el instalador, usa el menú de tu navegador → «Instalar app» / «Añadir a pantalla de inicio».'}
          </p>
        </div>
      )}
    </Sheet>
  );
}
