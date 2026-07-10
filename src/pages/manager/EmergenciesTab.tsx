import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Badge,
  Input,
  Textarea,
  Select,
  NumberStepper,
  ProgressBar,
  Banner,
  EmptyState,
  SkeletonCard,
  Icon,
  useToast,
} from '../../components/ui';
import { Modal, ConfirmDialog } from '../../components/ui';
import { StatusBadge, SeverityBadge } from '../../components/StatusBadge';
import {
  useEmergencies,
  useCreateEmergency,
  useUpdateEmergency,
  useCreateNeed,
  useCenters,
  useCreateCampaignFromEmergency,
} from '../../hooks/api';
import { useT } from '../../lib/i18n';
import { apiErrorMessage } from '../../lib/api';
import type { Emergency, Severity, EmergencyStatus } from '../../lib/types';
import { clampPct, NEED_UNITS } from '../../lib/format';
import s from './manager.module.css';

const SEV_OPTS = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'CRITICAL', label: 'Crítica' },
];
const STATUS_OPTS = [
  { value: 'ACTIVE', label: 'Activa' },
  { value: 'MONITORING', label: 'En monitoreo' },
  { value: 'RESOLVED', label: 'Resuelta' },
];

export function EmergenciesTab() {
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isLoading } = useEmergencies();
  const createCampaign = useCreateCampaignFromEmergency();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Emergency | null>(null);
  const [needFor, setNeedFor] = useState<Emergency | null>(null);
  const [campaignFor, setCampaignFor] = useState<Emergency | null>(null);

  const confirmLaunch = async () => {
    if (!campaignFor) return;
    try {
      const camp = await createCampaign.mutateAsync(campaignFor.id);
      toast.success(t('camp.published'));
      setCampaignFor(null);
      navigate(`/organizador/${camp.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <div className={s.toolbar}>
        <div className={s.toolbarSpacer} />
        <Button
          icon="plus"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          {t('mgr.newEmergency')}
        </Button>
      </div>

      {isLoading ? (
        <div className={s.cardGrid}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon="fire" title="Sin emergencias" message="Crea la primera emergencia para empezar a coordinar." />
      ) : (
        <div className={s.cardGrid}>
          {(data ?? []).map((e) => {
            const attended = (e.campaigns?.length ?? 0) > 0;
            const campaign = e.campaigns?.[0];
            return (
            <Card
              key={e.id}
              className={`${s.emCard} ${s[`emCard${e.severity}`]}`}
              style={attended ? { opacity: 0.6, filter: 'grayscale(0.85)' } : undefined}
            >
              <div className={s.rowBetween}>
                <strong>{e.title}</strong>
                <SeverityBadge severity={e.severity} />
              </div>
              <div className={s.badgeRow} style={{ marginTop: 6 }}>
                <StatusBadge status={e.status} />
                {attended && <Badge tone="success" dot>Atendida</Badge>}
                {e.district && <span className={s.muted}>{e.district}</span>}
              </div>
              {e.primaryCenter && (
                <div className={s.primaryCenter} title={t('mgr.primaryCenter')}>
                  <Icon name="home" size={14} />
                  <span>{e.primaryCenter.name}</span>
                </div>
              )}
              {e.needs && e.needs.length > 0 && (
                <div style={{ marginTop: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                  {e.needs.slice(0, 3).map((n) => (
                    <ProgressBar
                      key={n.id}
                      value={clampPct(((n.fulfilledQty ?? 0) / (n.targetQty || 1)) * 100)}
                      label={n.title}
                      rightLabel={`${n.fulfilledQty ?? 0}/${n.targetQty}${n.unit ? ` ${n.unit}` : ''}`}
                    />
                  ))}
                </div>
              )}
              <div className={s.cardActions}>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => {
                    setEditing(e);
                    setFormOpen(true);
                  }}
                >
                  {t('common.edit')}
                </Button>
                <Button variant="ghost" size="sm" icon="plus" onClick={() => setNeedFor(e)}>
                  Necesidad
                </Button>
                {attended ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="spark"
                    onClick={() => campaign && navigate(`/organizador/${campaign.id}`)}
                  >
                    Ver campaña
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" icon="spark" onClick={() => setCampaignFor(e)}>
                    {t('camp.create')}
                  </Button>
                )}
              </div>
            </Card>
            );
          })}
        </div>
      )}

      {formOpen && <EmergencyForm emergency={editing} onClose={() => setFormOpen(false)} />}
      {needFor && <NeedForm emergency={needFor} onClose={() => setNeedFor(null)} />}

      <ConfirmDialog
        open={!!campaignFor}
        title={t('camp.create')}
        message={campaignFor ? `¿Generar una campaña para "${campaignFor.title}"? La emergencia quedará marcada como atendida.` : undefined}
        confirmLabel={t('camp.create')}
        cancelLabel={t('common.cancel')}
        loading={createCampaign.isPending}
        onConfirm={confirmLaunch}
        onCancel={() => setCampaignFor(null)}
      />
    </div>
  );
}

function EmergencyForm({ emergency, onClose }: { emergency: Emergency | null; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const create = useCreateEmergency();
  const update = useUpdateEmergency();
  const { data: centers } = useCenters();
  const [title, setTitle] = useState(emergency?.title ?? '');
  const [description, setDescription] = useState(emergency?.description ?? '');
  const [severity, setSeverity] = useState<Severity>(emergency?.severity ?? 'MEDIUM');
  const [district, setDistrict] = useState(emergency?.district ?? '');
  const [status, setStatus] = useState<EmergencyStatus>(emergency?.status ?? 'ACTIVE');
  const [primaryCenterId, setPrimaryCenterId] = useState(emergency?.primaryCenterId ?? '');
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const centerOpts = [
    { value: '', label: t('mgr.noPrimaryCenter') },
    ...(centers ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  const submit = async () => {
    if (!title.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    setError(null);
    const body = { title: title.trim(), description, severity, district, status, primaryCenterId };
    try {
      if (emergency) await update.mutateAsync({ id: emergency.id, body });
      else await create.mutateAsync(body);
      toast.success(t('toast.saved'));
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={emergency ? t('common.edit') : t('mgr.newEmergency')}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} loading={pending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className={s.formGrid}>
        {error && <Banner tone="error">{error}</Banner>}
        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <Textarea label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className={s.formRow2}>
          <Select label={t('mgr.intensity')} options={SEV_OPTS} value={severity} onChange={(e) => setSeverity(e.target.value as Severity)} />
          <Select label="Estado" options={STATUS_OPTS} value={status} onChange={(e) => setStatus(e.target.value as EmergencyStatus)} />
        </div>
        <Select
          label={t('mgr.primaryCenter')}
          options={centerOpts}
          value={primaryCenterId}
          onChange={(e) => setPrimaryCenterId(e.target.value)}
        />
        <Input label="Distrito" value={district} onChange={(e) => setDistrict(e.target.value)} />
      </div>
    </Modal>
  );
}

function NeedForm({ emergency, onClose }: { emergency: Emergency; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const createNeed = useCreateNeed();
  const [title, setTitle] = useState('');
  const [targetQty, setTargetQty] = useState(50);
  const [unit, setUnit] = useState(NEED_UNITS[0]);
  const [priority, setPriority] = useState(2);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) {
      setError('Describe la necesidad.');
      return;
    }
    setError(null);
    try {
      const priorityLevel: Severity =
        priority >= 5 ? 'CRITICAL' : priority >= 4 ? 'HIGH' : priority >= 3 ? 'MEDIUM' : 'LOW';
      await createNeed.mutateAsync({ id: emergency.id, body: { title: title.trim(), targetQty, unit, priority: priorityLevel } });
      toast.success(t('toast.saved'));
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Necesidad · ${emergency.title}`}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} loading={createNeed.isPending}>
            {t('common.create')}
          </Button>
        </>
      }
    >
      <div className={s.formGrid}>
        {error && <Banner tone="error">{error}</Banner>}
        <Input label="Necesidad" placeholder="Ej. Frazadas" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <div className={s.formRow2}>
          <NumberStepper value={targetQty} onChange={setTargetQty} min={1} max={100000} step={10} label="Meta" />
          <Select label="Unidad" value={unit} onChange={(e) => setUnit(e.target.value)}
            options={NEED_UNITS.map((u) => ({ value: u, label: u }))} />
        </div>
        <NumberStepper value={priority} onChange={setPriority} min={1} max={5} label="Prioridad (1-5)" />
      </div>
    </Modal>
  );
}
