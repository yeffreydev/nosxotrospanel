import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  NumberStepper,
  Checkbox,
  Banner,
  EmptyState,
  CenteredSpinner,
  useToast,
  Icon,
  type IconName,
} from '../../components/ui';
import { PageHead } from '../../components/layout/AppShell';
import { StatusBadge } from '../../components/StatusBadge';
import {
  createOrQueueBeneficiary,
  readQueue,
  newClientId,
  type QueuedBeneficiary,
} from '../../lib/offline';
import { useOnline, useQueueCount } from '../../hooks/useOnline';
import { useBeneficiaries, useSyncBeneficiaries } from '../../hooks/api';
import { useGeolocation } from '../../hooks/useGeolocation';
import { conflictPayload, apiErrorMessage } from '../../lib/api';
import { relativeTime } from '../../lib/format';
import { useT } from '../../lib/i18n';
import type { Beneficiary } from '../../lib/types';
import s from './CensusWizard.module.css';

const DOC_TYPES = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carné de extranjería' },
  { value: 'PAS', label: 'Pasaporte' },
];

const DISTRICTS = [
  'Arequipa (Cercado)',
  'Alto Selva Alegre',
  'Cayma',
  'Cerro Colorado',
  'Characato',
  'Hunter (J. Hunter)',
  'José Luis Bustamante y Rivero',
  'Mariano Melgar',
  'Miraflores',
  'Paucarpata',
  'Sabandía',
  'Sachaca',
  'Socabaya',
  'Tiabaya',
  'Yanahuara',
  'Yura',
];

const NEED_OPTIONS = [
  'Agua',
  'Alimentos',
  'Abrigo / Frazadas',
  'Salud / Medicinas',
  'Refugio',
  'Higiene',
  'Pañales',
];

interface FormState {
  docType: string;
  docNumber: string;
  fullName: string;
  householdSize: number;
  lat?: number;
  lng?: number;
  address: string;
  district: string;
  needs: string[];
}

const EMPTY_FORM: FormState = {
  docType: 'DNI',
  docNumber: '',
  fullName: '',
  householdSize: 1,
  address: '',
  district: '',
  needs: [],
};

const STEPS: { key: string; icon: IconName }[] = [
  { key: 'doc', icon: 'list' },
  { key: 'name', icon: 'users' },
  { key: 'home', icon: 'home' },
  { key: 'loc', icon: 'location' },
  { key: 'needs', icon: 'check' },
  { key: 'confirm', icon: 'checkCircle' },
];

export default function CensusWizard() {
  const t = useT();
  const toast = useToast();
  const online = useOnline();
  const pending = useQueueCount();
  const sync = useSyncBeneficiaries();
  const geo = useGeolocation();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dupName, setDupName] = useState<string | null>(null);

  const { data: serverList, isLoading: loadingList } = useBeneficiaries();

  // Re-read the local queue whenever its size changes.
  const localQueue = useMemo<QueuedBeneficiary[]>(() => readQueue(), [pending]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleNeed = (need: string, on: boolean) =>
    setForm((f) => ({
      ...f,
      needs: on ? [...f.needs, need] : f.needs.filter((n) => n !== need),
    }));

  const canContinue = (): boolean => {
    switch (STEPS[step].key) {
      case 'doc':
        return form.docNumber.trim().length >= 6;
      case 'name':
        return form.fullName.trim().length >= 3;
      default:
        return true;
    }
  };

  const next = () => setStep((s2) => Math.min(s2 + 1, STEPS.length - 1));
  const back = () => setStep((s2) => Math.max(s2 - 1, 0));

  const reset = () => {
    setForm(EMPTY_FORM);
    setStep(0);
    setError(null);
    setDupName(null);
  };

  const handleLocate = async () => {
    try {
      const { lat, lng } = await geo.locate();
      set('lat', lat);
      set('lng', lng);
    } catch {
      /* error surfaced via geo.error */
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setDupName(null);
    try {
      const result = await createOrQueueBeneficiary({
        clientId: newClientId(),
        docType: form.docType,
        docNumber: form.docNumber.trim(),
        fullName: form.fullName.trim(),
        householdSize: form.householdSize,
        lat: form.lat,
        lng: form.lng,
        address: form.address.trim() || undefined,
        district: form.district || undefined,
        needs: form.needs.length ? form.needs : undefined,
      });
      if (result.queued) {
        toast.success(t('census.savedOffline'), { silent: true });
      } else {
        toast.success(t('toast.saved'));
      }
      reset();
    } catch (err) {
      const dup = conflictPayload<Beneficiary>(err);
      if (dup) {
        setDupName(dup.fullName ?? form.fullName);
        toast.warn(t('census.duplicate'));
      } else {
        setError(apiErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="n-page">
      <PageHead title={t('census.title')} subtitle={t('census.subtitle')} />

      <div className={s.wrap}>
        {/* Connectivity + sync banners */}
        {!online && (
          <Banner tone="warn" icon="wifiOff" title={t('common.offline')}>
            Los registros se guardan en este dispositivo y se enviarán al reconectar.
          </Banner>
        )}
        {pending > 0 && (
          <Banner
            tone="info"
            icon="wifi"
            title={`${pending} ${t('census.pendingSync')}`}
            action={
              <Button
                size="sm"
                icon="wifi"
                disabled={!online || sync.isPending}
                loading={sync.isPending}
                onClick={() =>
                  sync.mutate(undefined, {
                    onSuccess: () => toast.success(t('toast.synced')),
                    onError: (e) => toast.error(apiErrorMessage(e)),
                  })
                }
              >
                {t('census.syncNow')}
              </Button>
            }
          >
            Pendientes de sincronizar con el servidor.
          </Banner>
        )}

        {/* Wizard */}
        <Card>
          <div className={s.stepCard}>
            <div className={s.dots} aria-label={`Paso ${step + 1} de ${STEPS.length}`}>
              {STEPS.map((st, i) => (
                <span
                  key={st.key}
                  className={`${s.dot} ${i === step ? s.dotActive : i < step ? s.dotDone : ''}`}
                />
              ))}
            </div>

            <WizardStep stepKey={STEPS[step].key} icon={STEPS[step].icon} t={t}>
              {STEPS[step].key === 'doc' && (
                <>
                  <Select
                    label="Tipo de documento"
                    options={DOC_TYPES}
                    value={form.docType}
                    onChange={(e) => set('docType', e.target.value)}
                  />
                  <Input
                    label={t('census.docNumber')}
                    inputMode="numeric"
                    autoFocus
                    value={form.docNumber}
                    onChange={(e) => set('docNumber', e.target.value.replace(/[^0-9A-Za-z]/g, ''))}
                    placeholder="12345678"
                  />
                </>
              )}

              {STEPS[step].key === 'name' && (
                <Input
                  label={t('census.fullName')}
                  autoFocus
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                  placeholder="Nombres y apellidos"
                  autoCapitalize="words"
                />
              )}

              {STEPS[step].key === 'home' && (
                <NumberStepper
                  label={t('census.household')}
                  value={form.householdSize}
                  onChange={(v) => set('householdSize', v)}
                  min={1}
                  max={30}
                />
              )}

              {STEPS[step].key === 'loc' && (
                <>
                  <Button
                    size="lg"
                    variant={form.lat != null ? 'subtle' : 'primary'}
                    icon="location"
                    block
                    loading={geo.loading}
                    onClick={handleLocate}
                  >
                    {form.lat != null ? 'Ubicación capturada' : t('census.useGps')}
                  </Button>
                  {form.lat != null && form.lng != null && (
                    <Banner tone="success" icon="pin" title="Coordenadas guardadas">
                      {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                    </Banner>
                  )}
                  {geo.error && (
                    <Banner tone="warn" title="No se pudo obtener la ubicación">
                      {geo.error}
                    </Banner>
                  )}
                  <Select
                    label={t('census.district')}
                    placeholder="Selecciona un distrito"
                    options={DISTRICTS.map((d) => ({ value: d, label: d }))}
                    value={form.district}
                    onChange={(e) => set('district', e.target.value)}
                  />
                  <Input
                    label="Dirección / referencia"
                    hint={t('common.optional')}
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="Calle, mz/lote, referencia"
                  />
                </>
              )}

              {STEPS[step].key === 'needs' && (
                <div className={s.needsGrid} role="group" aria-label={t('census.needs')}>
                  {NEED_OPTIONS.map((need) => (
                    <Checkbox
                      key={need}
                      checked={form.needs.includes(need)}
                      onChange={(on) => toggleNeed(need, on)}
                    >
                      {need}
                    </Checkbox>
                  ))}
                </div>
              )}

              {STEPS[step].key === 'confirm' && (
                <div className={s.summary}>
                  <SummaryRow label="Documento" value={`${form.docType} ${form.docNumber}`} />
                  <SummaryRow label={t('census.fullName')} value={form.fullName || '—'} />
                  <SummaryRow label={t('census.household')} value={String(form.householdSize)} />
                  <SummaryRow label={t('census.district')} value={form.district || '—'} />
                  <SummaryRow
                    label={t('census.location')}
                    value={form.lat != null ? `${form.lat.toFixed(4)}, ${form.lng?.toFixed(4)}` : 'Sin GPS'}
                  />
                  <SummaryRow label={t('census.needs')} value={form.needs.join(', ') || '—'} />
                  {dupName && (
                    <Banner tone="warn" icon="alert" title={t('census.duplicate')}>
                      {dupName}
                    </Banner>
                  )}
                  {error && (
                    <Banner tone="error" title={t('common.error')}>
                      {error}
                    </Banner>
                  )}
                </div>
              )}
            </WizardStep>

            {/* Navigation */}
            <div className={s.nav}>
              {step > 0 && (
                <Button variant="subtle" size="lg" icon="chevronLeft" onClick={back} disabled={submitting}>
                  {t('common.back')}
                </Button>
              )}
              {STEPS[step].key !== 'confirm' ? (
                <Button size="lg" iconRight="arrowRight" onClick={next} disabled={!canContinue()}>
                  {t('common.next')}
                </Button>
              ) : (
                <Button size="lg" icon="check" onClick={submit} loading={submitting}>
                  {t('census.save')}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Recent registrations */}
        <Card>
          <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--sp-3)' }}>{t('census.recent')}</h2>
          {loadingList && localQueue.length === 0 ? (
            <CenteredSpinner label={t('common.loading')} />
          ) : localQueue.length === 0 && (serverList ?? []).length === 0 ? (
            <EmptyState icon="list" title={t('common.empty')} message={t('census.subtitle')} />
          ) : (
            <div>
              {localQueue.map((b) => (
                <div key={b.clientId} className={s.recentItem}>
                  <span className={s.stepIcon} style={{ width: 40, height: 40 }}>
                    <Icon name="wifiOff" size={18} />
                  </span>
                  <div className={s.recentBody}>
                    <div className={s.recentName}>{b.fullName}</div>
                    <div className={s.recentMeta}>
                      {b.docNumber}
                      {b.district ? ` · ${b.district}` : ''}
                    </div>
                  </div>
                  <div className={s.recentAside}>
                    <Badge tone="warn" dot>
                      Sin sincronizar
                    </Badge>
                    <span className={s.recentMeta}>{relativeTime(b.queuedAt)}</span>
                  </div>
                </div>
              ))}
              {(serverList ?? []).map((b) => (
                <div key={b.id} className={s.recentItem}>
                  <span className={s.stepIcon} style={{ width: 40, height: 40 }}>
                    <Icon name="users" size={18} />
                  </span>
                  <div className={s.recentBody}>
                    <div className={s.recentName}>{b.fullName}</div>
                    <div className={s.recentMeta}>
                      {b.docNumber}
                      {b.district ? ` · ${b.district}` : ''}
                    </div>
                  </div>
                  <div className={s.recentAside}>
                    <StatusBadge status={b.status} />
                    {b.createdAt && <span className={s.recentMeta}>{relativeTime(b.createdAt)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function WizardStep({
  stepKey,
  icon,
  t,
  children,
}: {
  stepKey: string;
  icon: IconName;
  t: (k: string) => string;
  children: React.ReactNode;
}) {
  const titles: Record<string, { title: string; kicker: string }> = {
    doc: { title: 'Documento', kicker: 'Identifica a la persona' },
    name: { title: t('census.fullName'), kicker: 'Datos personales' },
    home: { title: t('census.household'), kicker: '¿Cuántas personas viven en el hogar?' },
    loc: { title: t('census.location'), kicker: 'Captura la ubicación' },
    needs: { title: t('census.needs'), kicker: 'Marca lo que se requiere' },
    confirm: { title: t('common.confirm'), kicker: 'Revisa antes de registrar' },
  };
  const meta = titles[stepKey];
  return (
    <div className={s.stepCard}>
      <div className={s.stepHead}>
        <span className={s.stepIcon}>
          <Icon name={icon} size={24} />
        </span>
        <div>
          <h2 className={s.stepTitle}>{meta.title}</h2>
          <span className={s.stepKicker}>{meta.kicker}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.summaryRow}>
      <span className={s.summaryLabel}>{label}</span>
      <span className={s.summaryValue}>{value}</span>
    </div>
  );
}
