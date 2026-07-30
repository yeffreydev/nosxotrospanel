import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Chip,
  Input,
  Select,
  SegmentedControl,
  Badge,
  Icon,
  Banner,
  Tabs,
  Modal,
  ConfirmDialog,
  CenteredSpinner,
  ProgressBar,
  ImageUpload,
  useToast,
  type BadgeTone,
  type IconName,
} from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';
import { AvailabilityEditor } from '../../components/AvailabilityEditor';
import {
  useCampaign,
  useCampaignOperations,
  useCampaignBrigades,
  useCampaignDonations,
  useCampaignVolunteers,
  useAddCampaignVolunteer,
  useRemoveCampaignVolunteer,
  useCreateZone,
  useUpdateZone,
  useDeleteZone,
  useAddZoneNeed,
  useCreateBrigade,
  useUpdateBrigade,
  useDeleteBrigade,
  useAddBrigadeMember,
  useRemoveBrigadeMember,
  useCreateCenter,
  useUpdateCenter,
  useCenter,
  useCategories,
  useCreateCategory,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useCenterMovements,
  useCampaignGoals,
  useCreateCampaignNeed,
  useUpdateCampaignNeed,
  useDeleteCampaignNeed,
  useCampaignAvailability,
  useDeleteVolunteerSchedule,
  useCreateDonation,
  useConfirmPayment,
  useUpdateDonationStatus,
  useBeneficiaries,
  useCreateBeneficiary,
  useUpdateBeneficiary,
  useDeleteBeneficiary,
  useDispatchCenterItem,
  useCreateVolunteer,
  useAddVolunteerSchedule,
  useVolunteerSchedules,
  useCreateUser,
  useCampaignCollaborators,
  useAddCollaborator,
  useRemoveCollaborator,
  useUpdateCampaign,
} from '../../hooks/api';
import { useT } from '../../lib/i18n';
import { apiErrorMessage } from '../../lib/api';
import {
  formatSoles,
  formatDate,
  formatDateTime,
  NEED_UNITS,
  CAMPAIGN_STATUS,
  CATEGORY_KIND,
  WEEKDAYS,
  TIME_PRESETS,
  describeWeekdays,
  normalizeItemName,
  todayISO,
} from '../../lib/format';
import { coordsFromMapUrl, isHttpUrl, AQP } from '../../lib/geo';
import type {
  Severity,
  CampaignStatus,
  CampaignOperations,
  Campaign,
  CampaignItemGoal,
  Category,
  CategoryKind,
  Zone,
  Brigade,
  Center,
  Beneficiary,
  DonationStatus,
} from '../../lib/types';

const SEV_TONE: Record<Severity, BadgeTone> = {
  LOW: 'info',
  MEDIUM: 'warn',
  HIGH: 'warn',
  CRITICAL: 'danger',
};
const SEVERITIES: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const DONATION_STATUSES: DonationStatus[] = ['PROMISED', 'RECEIVED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
const BRIGADE_ROLES = ['Líder', 'Conductor', 'Logística', 'Médico', 'Comunicaciones'];
const CATEGORY_KINDS: CategoryKind[] = ['SUPPLY', 'TOOL', 'TRANSPORT', 'FUEL', 'SERVICE', 'OTHER'];

const isLeaderRole = (role?: string | null) => !!role && /l[ií]der|leader/i.test(role);

// Resumen de despacho de una zona: total necesitado, despachado (entregado),
// asignado (reservado desde un centro pero aún no entregado) y beneficiarios.
function zoneStats(z: Zone) {
  const target = (z.needs ?? []).reduce((n, x) => n + (x.targetQty ?? 0), 0);
  let dispatched = 0;
  let assigned = 0;
  for (const d of z.dispatches ?? []) {
    const qty = (d.items ?? []).reduce((n, it) => n + (it.quantity ?? 0), 0);
    if (d.status === 'DELIVERED') dispatched += qty;
    else if (d.status !== 'CANCELLED') assigned += qty;
  }
  const beneficiaries = z.beneficiaries ?? [];
  const served = beneficiaries.filter((b) => b.status === 'SERVED').length;
  return { target, dispatched, assigned, served, beneficiaries: beneficiaries.length };
}
type TabKey = 'resumen' | 'metas' | 'zonas' | 'brigadas' | 'centros' | 'voluntarios' | 'donaciones' | 'beneficiarios' | 'ajustes';

async function shareUrl(url: string | undefined, toast: ReturnType<typeof useToast>, ok: string) {
  if (!url) return;
  try {
    if (navigator.share) await navigator.share({ url, title: 'NOSXOTROS' });
    else {
      await navigator.clipboard.writeText(url);
      toast.success(ok);
    }
  } catch {
    /* cancelled */
  }
}

export default function CampaignPanel() {
  const t = useT();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabKey>('resumen');
  const campaignQ = useCampaign(id);
  const opsQ = useCampaignOperations(id);

  if (campaignQ.isLoading || opsQ.isLoading) {
    return (
      <div className="n-page">
        <CenteredSpinner label={t('common.loading')} />
      </div>
    );
  }
  if (campaignQ.isError || !campaignQ.data || opsQ.isError || !opsQ.data) {
    return (
      <div className="n-page" style={{ maxWidth: 520, margin: '0 auto' }}>
        <Banner tone="error" title={t('common.error')} />
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <Button variant="subtle" icon="chevronLeft" block onClick={() => navigate('/organizador')}>
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  const campaign = campaignQ.data;
  const ops = opsQ.data;

  return (
    <div className="n-page" style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
        <Button variant="subtle" icon="chevronLeft" onClick={() => navigate('/organizador')}>
          {t('common.back')}
        </Button>
        <h1 style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-black)', flex: 1 }}>{campaign.title}</h1>
        <StatusBadge status={campaign.status} />
      </div>

      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as TabKey)}
          items={[
            { value: 'resumen', label: t('mgr.kpis'), icon: 'chart' },
            { value: 'metas', label: 'Metas', icon: 'trophy' },
            { value: 'zonas', label: t('ops.zones'), icon: 'pin' },
            { value: 'brigadas', label: t('ops.brigades'), icon: 'users' },
            { value: 'centros', label: t('ops.centers'), icon: 'box' },
            { value: 'voluntarios', label: t('nav.volunteers'), icon: 'users' },
            { value: 'donaciones', label: t('stats.donations'), icon: 'heart' },
            { value: 'beneficiarios', label: t('nav.beneficiaries'), icon: 'users' },
            { value: 'ajustes', label: t('nav.settings'), icon: 'settings' },
          ]}
        />
      </div>

      {tab === 'resumen' && <Resumen campaign={campaign} ops={ops} />}
      {tab === 'metas' && <Metas campaign={campaign} ops={ops} />}
      {tab === 'zonas' && <Zonas id={id} ops={ops} />}
      {tab === 'brigadas' && <Brigadas id={id} ops={ops} />}
      {tab === 'centros' && <Centros id={id} ops={ops} />}
      {tab === 'voluntarios' && <Voluntarios id={id} />}
      {tab === 'donaciones' && <Donaciones id={id} />}
      {tab === 'beneficiarios' && <Beneficiarios campaignId={id} emergencyId={campaign.emergencyId} ops={ops} />}
      {tab === 'ajustes' && <Ajustes campaign={campaign} onEdit={() => navigate(`/organizador/${id}/editar`)} />}
    </div>
  );
}

/* ───────── Resumen / KPIs ───────── */
function Resumen({ campaign, ops }: { campaign: Campaign; ops: CampaignOperations }) {
  const t = useT();
  const brigades = ops.zones.reduce((n, z) => n + (z.brigades?.length ?? 0), 0);
  const rows: { key: string; icon: IconName; label: string; value: string | number }[] = [
    { key: 'r', icon: 'heart', label: t('camp.raised'), value: formatSoles(campaign.raisedAmount) },
    { key: 'b', icon: 'users', label: t('camp.backers'), value: campaign.backersCount },
    { key: 'g', icon: 'chart', label: t('camp.goal'), value: campaign.goalAmount ? `${campaign.progressPct}%` : '—' },
    { key: 'z', icon: 'pin', label: t('ops.zones'), value: ops.zones.length },
    { key: 'br', icon: 'users', label: t('ops.brigades'), value: brigades },
    { key: 'c', icon: 'box', label: t('ops.centers'), value: ops.centers.length },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      {rows.map((r) => (
        <Card key={r.key}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', color: 'var(--text-muted)' }}>
              <Icon name={r.icon} size={18} /> {r.label}
            </span>
            <strong style={{ fontSize: 'var(--fs-lg)' }}>{r.value}</strong>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ───────── Zonas ───────── */
interface ZoneDraft {
  name: string;
  mapUrl: string;
  reference: string;
  severity: Severity;
}
const EMPTY_ZONE: ZoneDraft = { name: '', mapUrl: '', reference: '', severity: 'MEDIUM' };

function Zonas({ id, ops }: { id?: string; ops: CampaignOperations }) {
  const t = useT();
  const toast = useToast();
  const createZone = useCreateZone(id);
  const updateZone = useUpdateZone(id);
  const deleteZone = useDeleteZone(id);
  const addNeed = useAddZoneNeed(id);
  // null = cerrado; sin `id` = alta; con `id` = edición.
  const [editing, setEditing] = useState<{ id?: string; draft: ZoneDraft } | null>(null);
  const [toDelete, setToDelete] = useState<Zone | null>(null);
  const [details, setDetails] = useState<Zone | null>(null);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setError('');
    try {
      await fn();
      after?.();
      toast.success(t('toast.saved'));
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const save = () => {
    if (!editing) return;
    const { id: zoneId, draft } = editing;
    const body = {
      name: draft.name.trim(),
      mapUrl: draft.mapUrl.trim() || undefined,
      reference: draft.reference.trim() || undefined,
      severity: draft.severity,
    };
    return run(
      () => (zoneId ? updateZone.mutateAsync({ id: zoneId, body }) : createZone.mutateAsync(body)),
      () => setEditing(null),
    );
  };

  const draft = editing?.draft ?? EMPTY_ZONE;
  const setDraft = (patch: Partial<ZoneDraft>) =>
    setEditing((prev) => (prev ? { ...prev, draft: { ...prev.draft, ...patch } } : prev));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--sp-3)' }}>
        <Button icon="plus" onClick={() => setEditing({ draft: EMPTY_ZONE })}>{t('ops.newZone')}</Button>
      </div>
      {error && <div style={{ marginBottom: 'var(--sp-3)' }}><Banner tone="error">{error}</Banner></div>}
      {ops.zones.length === 0 && <p style={{ color: 'var(--text-muted)' }}>{t('ops.noZones')}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {ops.zones.map((z) => (
          <Card key={z.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                  <strong>{z.name}</strong>
                  <Badge tone={SEV_TONE[z.severity]} dot>{t(`sev.${z.severity}`)}</Badge>
                  {/* Zona creada con la ubicación declarada al crear la campaña. */}
                  {z.isPrimary && <Badge tone="info">Principal</Badge>}
                </div>
                {z.reference && <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{z.reference}</div>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {z.mapUrl && <Button size="sm" variant="ghost" icon="share" onClick={() => shareUrl(z.mapUrl, toast, t('common.copied'))}>{t('ops.shareZone')}</Button>}
                <Button
                  size="sm"
                  variant="ghost"
                  icon="settings"
                  aria-label={t('common.edit')}
                  onClick={() =>
                    setEditing({
                      id: z.id,
                      draft: {
                        name: z.name,
                        mapUrl: z.mapUrl ?? '',
                        reference: z.reference ?? '',
                        severity: z.severity,
                      },
                    })
                  }
                />
                <Button size="sm" variant="ghost" icon="close" onClick={() => setToDelete(z)} aria-label={t('common.delete')} />
              </div>
            </div>
            <div style={{ marginTop: 'var(--sp-2)' }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>{t('ops.needs')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(z.needs ?? []).map((n) => <Badge key={n.id} tone="neutral">{n.title} · {n.targetQty}{n.unit ? ` ${n.unit}` : ''}</Badge>)}
                {(z.needs ?? []).length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>—</span>}
              </div>
              <AddNeedInline label={t('ops.addNeed')} onAdd={(title, qty, unit) => run(() => addNeed.mutateAsync({ zoneId: z.id, body: { title, targetQty: qty, unit } }))} />
            </div>
            {(() => {
              const st = zoneStats(z);
              return (
                <div style={{ marginTop: 'var(--sp-3)', borderTop: '1px solid var(--line)', paddingTop: 'var(--sp-2)' }}>
                  <ProgressBar
                    value={st.dispatched}
                    max={st.target || 1}
                    tone="brand"
                    label={t('ops.dispatched')}
                    rightLabel={`${st.dispatched}/${st.target}`}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
                      {t('ops.assigned')}: {st.assigned} · {t('ops.served')}: {st.served}
                    </span>
                    <Button size="sm" variant="subtle" icon="chart" onClick={() => setDetails(z)}>{t('common.details')}</Button>
                  </div>
                </div>
              );
            })()}
          </Card>
        ))}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? t('common.edit') : t('ops.newZone')}
        footer={
          <>
            <Button variant="subtle" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button
              icon={editing?.id ? 'check' : 'plus'}
              disabled={!draft.name.trim()}
              loading={createZone.isPending || updateZone.isPending}
              onClick={save}
            >
              {editing?.id ? t('common.save') : t('common.create')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          <Input label={t('ops.zoneName')} value={draft.name} onChange={(e) => setDraft({ name: e.target.value })} autoFocus />
          <Input label={t('ops.mapUrl')} value={draft.mapUrl} onChange={(e) => setDraft({ mapUrl: e.target.value })} placeholder="https://maps.google.com/?q=..." />
          <Input label={t('ops.reference')} value={draft.reference} onChange={(e) => setDraft({ reference: e.target.value })} />
          <Select label={t('ops.level')} value={draft.severity} onChange={(e) => setDraft({ severity: e.target.value as Severity })} options={SEVERITIES.map((s) => ({ value: s, label: t(`sev.${s}`) }))} />
        </div>
      </Modal>

      <Modal open={!!details} onClose={() => setDetails(null)} title={`${t('common.details')}: ${details?.name ?? ''}`}>
        {details && (() => {
          const st = zoneStats(details);
          const items = (details.dispatches ?? []).flatMap((d) =>
            (d.items ?? []).map((it) => ({ ...it, status: d.status })),
          );
          return (
            <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)' }}>
                <Card><div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{t('ops.dispatched')}</div><strong style={{ fontSize: 'var(--fs-lg)' }}>{st.dispatched}/{st.target}</strong></Card>
                <Card><div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{t('ops.assigned')}</div><strong style={{ fontSize: 'var(--fs-lg)' }}>{st.assigned}</strong></Card>
              </div>
              <div>
                <div style={{ fontWeight: 'var(--fw-bold)', marginBottom: 4 }}>{t('ops.needs')}</div>
                {(details.needs ?? []).length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>—</span>}
                {(details.needs ?? []).map((n) => (
                  <div key={n.id} style={{ marginBottom: 6 }}>
                    <ProgressBar value={n.fulfilledQty ?? 0} max={n.targetQty || 1} tone="gold" label={n.title} rightLabel={`${n.fulfilledQty ?? 0}/${n.targetQty}${n.unit ? ` ${n.unit}` : ''}`} />
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontWeight: 'var(--fw-bold)', marginBottom: 4 }}>{t('ops.deliveries')} ({st.served}/{st.beneficiaries} {t('ops.served').toLowerCase()})</div>
                {items.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>—</span>}
                {items.map((it) => (
                  <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)', padding: '2px 0' }}>
                    <span>{it.description} · {it.quantity}</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {it.beneficiary?.fullName ?? '—'} · {t(`status.${it.status}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        danger
        title={`${t('common.delete')}: ${toDelete?.name ?? ''}`}
        message="Se eliminarán también sus necesidades. Esta acción no se puede deshacer."
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleteZone.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => run(() => deleteZone.mutateAsync(toDelete!.id), () => setToDelete(null))}
      />
    </div>
  );
}

/* ───────── Brigadas ───────── */
interface BrigadeDraft {
  name: string;
  zoneId: string;
  meetingPoint: string;
  meetingPointMapUrl: string;
  contactPhone: string;
}
const EMPTY_BRIGADE: BrigadeDraft = {
  name: '',
  zoneId: '',
  meetingPoint: '',
  meetingPointMapUrl: '',
  contactPhone: '',
};

function Brigadas({ id, ops }: { id?: string; ops: CampaignOperations }) {
  const t = useT();
  const toast = useToast();
  const brigadesQ = useCampaignBrigades(id);
  const volunteersQ = useCampaignVolunteers(id);
  const createBrigade = useCreateBrigade(id);
  const updateBrigade = useUpdateBrigade(id);
  const deleteBrigade = useDeleteBrigade(id);
  const addMember = useAddBrigadeMember(id);
  const removeMember = useRemoveBrigadeMember(id);
  const [editing, setEditing] = useState<{ id?: string; draft: BrigadeDraft } | null>(null);
  const [toDelete, setToDelete] = useState<Brigade | null>(null);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setError('');
    try {
      await fn();
      after?.();
      toast.success(t('toast.saved'));
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const zoneOptions = [{ value: '', label: 'Sin zona' }, ...ops.zones.map((z) => ({ value: z.id, label: z.name }))];
  const brigades = brigadesQ.data ?? [];
  const volunteers = volunteersQ.data ?? [];
  // Solo se puede sumar a una brigada a un voluntario inscrito y todavía sin brigada.
  // Solo los que tienen perfil: una brigada se arma con voluntarios con cuenta,
  // así que los invitados de la web no son elegibles.
  const freeVolunteers = volunteers.filter((v) => !v.brigade && v.volunteerId);

  const save = () => {
    if (!editing) return;
    const { id: brigadeId, draft } = editing;
    const body = {
      name: draft.name.trim(),
      zoneId: draft.zoneId || undefined,
      meetingPoint: draft.meetingPoint.trim() || undefined,
      meetingPointMapUrl: draft.meetingPointMapUrl.trim() || undefined,
      contactPhone: draft.contactPhone.trim() || undefined,
    };
    return run(
      () => (brigadeId ? updateBrigade.mutateAsync({ id: brigadeId, body }) : createBrigade.mutateAsync(body)),
      () => setEditing(null),
    );
  };

  const draft = editing?.draft ?? EMPTY_BRIGADE;
  const setDraft = (patch: Partial<BrigadeDraft>) =>
    setEditing((prev) => (prev ? { ...prev, draft: { ...prev.draft, ...patch } } : prev));

  if (brigadesQ.isLoading) return <CenteredSpinner label={t('common.loading')} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--sp-3)' }}>
        <Button icon="plus" onClick={() => setEditing({ draft: EMPTY_BRIGADE })}>{t('ops.newBrigade')}</Button>
      </div>
      {error && <div style={{ marginBottom: 'var(--sp-3)' }}><Banner tone="error">{error}</Banner></div>}
      {brigades.length === 0 && <p style={{ color: 'var(--text-muted)' }}>{t('ops.noBrigades')}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {brigades.map((b) => (
          <Card key={b.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
              <div>
                <strong>{b.name}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
                  {t('ops.assignZone')}: {b.zone?.name ?? 'Sin zona'}
                </div>
                {(() => {
                  const lead = (b.members ?? []).find((m) => isLeaderRole(m.role));
                  return lead ? (
                    <div style={{ fontSize: 'var(--fs-sm)' }}>👑 {t('ops.leader')}: {lead.volunteer?.user?.fullName ?? lead.user?.fullName ?? '—'}</div>
                  ) : null;
                })()}
                {b.meetingPoint && <div style={{ fontSize: 'var(--fs-sm)' }}>📍 {b.meetingPoint}</div>}
                {b.contactPhone && <div style={{ fontSize: 'var(--fs-sm)' }}>📞 {b.contactPhone}</div>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {b.meetingPointMapUrl && <Button size="sm" variant="ghost" icon="share" onClick={() => shareUrl(b.meetingPointMapUrl, toast, t('common.copied'))} aria-label={t('ops.shareBrigade')} />}
                <Button
                  size="sm"
                  variant="ghost"
                  icon="settings"
                  aria-label={t('common.edit')}
                  onClick={() =>
                    setEditing({
                      id: b.id,
                      draft: {
                        name: b.name,
                        zoneId: b.zoneId ?? '',
                        meetingPoint: b.meetingPoint ?? '',
                        meetingPointMapUrl: b.meetingPointMapUrl ?? '',
                        contactPhone: b.contactPhone ?? '',
                      },
                    })
                  }
                />
                <Button size="sm" variant="ghost" icon="close" onClick={() => setToDelete(b)} aria-label={t('common.delete')} />
              </div>
            </div>
            <div style={{ marginTop: 'var(--sp-2)' }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>{t('ops.members')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[...(b.members ?? [])]
                  .sort((a, z) => Number(isLeaderRole(z.role)) - Number(isLeaderRole(a.role)))
                  .map((m) => (
                    <Badge key={m.id} tone={isLeaderRole(m.role) ? 'gold' : 'neutral'}>
                      {isLeaderRole(m.role) ? '👑 ' : ''}
                      {m.volunteer?.user?.fullName ?? m.user?.fullName ?? '—'}
                      {m.role ? ` · ${m.role}` : ''}
                      <button type="button" style={{ marginLeft: 6, cursor: 'pointer', background: 'none', border: 'none' }}
                        onClick={() => run(() => removeMember.mutateAsync({ brigadeId: b.id, memberId: m.id }))}>×</button>
                    </Badge>
                  ))}
                {(b.members ?? []).length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>—</span>}
              </div>
              <AddMemberInline
                label={t('ops.addMember')}
                volunteers={freeVolunteers.map((v) => ({ value: v.volunteerId!, label: v.fullName }))}
                loading={addMember.isPending}
                onAdd={(volunteerId, role) =>
                  run(() => addMember.mutateAsync({ brigadeId: b.id, body: { volunteerId, role: role || undefined } }))
                }
              />
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? t('common.edit') : t('ops.newBrigade')}
        footer={
          <>
            <Button variant="subtle" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button
              icon={editing?.id ? 'check' : 'plus'}
              disabled={!draft.name.trim()}
              loading={createBrigade.isPending || updateBrigade.isPending}
              onClick={save}
            >
              {editing?.id ? t('common.save') : t('common.create')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          <Input label={t('ops.brigadeName')} value={draft.name} onChange={(e) => setDraft({ name: e.target.value })} autoFocus />
          <Select label={t('ops.assignZone')} value={draft.zoneId} onChange={(e) => setDraft({ zoneId: e.target.value })} options={zoneOptions} />
          <Input label={t('ops.meetingPoint')} value={draft.meetingPoint} onChange={(e) => setDraft({ meetingPoint: e.target.value })} />
          <Input label={t('ops.mapUrl')} value={draft.meetingPointMapUrl} onChange={(e) => setDraft({ meetingPointMapUrl: e.target.value })} placeholder="https://maps.google.com/?q=..." />
          <Input label={t('ops.contactPhone')} type="tel" value={draft.contactPhone} onChange={(e) => setDraft({ contactPhone: e.target.value })} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        danger
        title={`${t('common.delete')}: ${toDelete?.name ?? ''}`}
        message="Se eliminará la brigada; sus miembros quedarán sin brigada."
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleteBrigade.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => run(() => deleteBrigade.mutateAsync(toDelete!.id), () => setToDelete(null))}
      />
    </div>
  );
}

/* ───────── Centros ───────── */
interface CenterDraft {
  name: string;
  address: string;
  reference: string;
  openingHours: string;
  contactPhone: string;
  capacity: string;
  mapUrl: string;
  photoUrl: string;
}
const EMPTY_CENTER: CenterDraft = {
  name: '',
  address: '',
  reference: '',
  openingHours: '',
  contactPhone: '',
  capacity: '',
  mapUrl: '',
  photoUrl: '',
};

function Centros({ id, ops }: { id?: string; ops: CampaignOperations }) {
  const t = useT();
  const toast = useToast();
  const createCenter = useCreateCenter();
  const updateCenter = useUpdateCenter();
  const { data: goals } = useCampaignGoals(id);
  const [editing, setEditing] = useState<{ id?: string; draft: CenterDraft } | null>(null);
  const [error, setError] = useState('');

  // Un centro nuevo sin enlace de mapa hereda el pin de la zona principal (la
  // ubicación que el organizador declaró al crear la campaña).
  const primaryZone = ops.zones.find((z) => z.isPrimary) ?? ops.zones[0];
  const campaignCoords =
    primaryZone?.lat != null && primaryZone?.lng != null
      ? { lat: primaryZone.lat, lng: primaryZone.lng }
      : null;

  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setError('');
    try {
      await fn();
      after?.();
      toast.success(t('toast.saved'));
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const save = () => {
    if (!editing) return;
    const { id: centerId, draft } = editing;
    const capacity = Number(draft.capacity);
    const mapUrl = draft.mapUrl.trim();
    // Si el enlace del mapa trae coordenadas, el pin del centro queda ubicado
    // sin pedirle nada más al organizador.
    const coords = mapUrl ? coordsFromMapUrl(mapUrl) : null;
    const body: Partial<Center> = {
      name: draft.name.trim(),
      address: draft.address.trim(),
      reference: draft.reference.trim() || undefined,
      openingHours: draft.openingHours.trim() || undefined,
      contactPhone: draft.contactPhone.trim() || undefined,
      photoUrl: draft.photoUrl.trim() || undefined,
      ...(mapUrl && isHttpUrl(mapUrl) ? { mapUrl } : {}),
      ...(coords ?? {}),
      ...(Number.isFinite(capacity) && capacity > 0 ? { capacity } : {}),
    };
    if (mapUrl && !isHttpUrl(mapUrl)) {
      setError('Pega un enlace completo del mapa, empezando con https://');
      return;
    }
    return run(
      () =>
        centerId
          ? updateCenter.mutateAsync({ id: centerId, body })
          : createCenter.mutateAsync({
              ...body,
              campaignId: id,
              lat: coords?.lat ?? campaignCoords?.lat ?? AQP.lat,
              lng: coords?.lng ?? campaignCoords?.lng ?? AQP.lng,
            } as Partial<Center>),
      () => setEditing(null),
    );
  };

  const draft = editing?.draft ?? EMPTY_CENTER;
  const setDraft = (patch: Partial<CenterDraft>) =>
    setEditing((prev) => (prev ? { ...prev, draft: { ...prev.draft, ...patch } } : prev));

  // Al ingresar productos se sugieren los nombres de las metas de la campaña:
  // escribiendo el mismo nombre, la meta avanza sola.
  const suggestions = [...new Set((goals?.items ?? []).map((n) => n.title))];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--sp-3)' }}>
        <Button icon="plus" onClick={() => setEditing({ draft: EMPTY_CENTER })}>{t('ops.newCenter')}</Button>
      </div>
      {error && <div style={{ marginBottom: 'var(--sp-3)' }}><Banner tone="error">{error}</Banner></div>}
      {ops.centers.length === 0 && <p style={{ color: 'var(--text-muted)' }}>{t('ops.noCenters')}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {ops.centers.map((c) => (
          <CenterCard
            key={c.id}
            center={c}
            zones={ops.zones}
            campaignId={id}
            suggestions={suggestions}
            onEdit={() =>
              setEditing({
                id: c.id,
                draft: {
                  name: c.name,
                  address: c.address ?? '',
                  reference: c.reference ?? '',
                  openingHours: c.openingHours ?? '',
                  contactPhone: c.contactPhone ?? '',
                  capacity: c.capacity ? String(c.capacity) : '',
                  mapUrl: c.mapUrl ?? '',
                  photoUrl: c.photoUrl ?? '',
                },
              })
            }
          />
        ))}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? t('common.edit') : t('ops.newCenter')}
        footer={
          <>
            <Button variant="subtle" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button
              icon={editing?.id ? 'check' : 'plus'}
              disabled={!draft.name.trim() || !draft.address.trim()}
              loading={createCenter.isPending || updateCenter.isPending}
              onClick={save}
            >
              {editing?.id ? t('common.save') : t('common.create')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          <Input label="Nombre del centro" value={draft.name} onChange={(e) => setDraft({ name: e.target.value })} autoFocus />
          <Input label={t('mgr.address')} value={draft.address} onChange={(e) => setDraft({ address: e.target.value })} />
          <Input
            label="Referencia"
            hint={t('common.optional')}
            placeholder="Frente al mercado central"
            value={draft.reference}
            onChange={(e) => setDraft({ reference: e.target.value })}
          />
          <Input
            label="Enlace del mapa"
            hint="Google Maps o Waze · el donante abre la ruta desde aquí"
            type="url"
            inputMode="url"
            placeholder="https://maps.google.com/..."
            value={draft.mapUrl}
            onChange={(e) => setDraft({ mapUrl: e.target.value })}
          />
          {draft.mapUrl.trim() && (
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              <Icon name="pin" size={14} />
              {(() => {
                const c = coordsFromMapUrl(draft.mapUrl.trim());
                return c
                  ? `Pin ubicado: ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`
                  : 'El enlace no trae coordenadas: se guardará igual para abrir la ruta.';
              })()}
            </span>
          )}
          <ImageUpload
            label="Foto del centro"
            hint={`${t('common.optional')} · ayuda al donante a reconocer el local`}
            value={draft.photoUrl}
            onChange={(v) => setDraft({ photoUrl: v })}
            previewHeight={160}
          />
          <Input label={t('mgr.hours')} placeholder={t('mgr.hoursPlaceholder')} value={draft.openingHours} onChange={(e) => setDraft({ openingHours: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <Input label={t('ops.contactPhone')} type="tel" value={draft.contactPhone} onChange={(e) => setDraft({ contactPhone: e.target.value })} />
            <Input
              label="Capacidad"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="1000"
              value={draft.capacity}
              onChange={(e) => setDraft({ capacity: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ───────── Ficha de un centro de acopio + su almacén ───────── */
interface ItemDraft {
  name: string;
  categoryId: string;
  unit: string;
  quantity: string;
  expiresAt: string;
  note: string;
}
const EMPTY_ITEM: ItemDraft = {
  name: '',
  categoryId: '',
  unit: '',
  quantity: '1',
  expiresAt: '',
  note: '',
};

// Etiqueta de categoría con su icono y su tipo de ayuda: en un solo <select> se
// distingue "🛠️ Herramientas" de "🍚 Alimentos" sin abrir otra pantalla.
function categoryLabel(cat: Category): string {
  const icon = cat.icon ? `${cat.icon} ` : '';
  const kind = cat.kind && cat.kind !== 'SUPPLY' ? ` · ${CATEGORY_KIND[cat.kind].label}` : '';
  return `${icon}${cat.name}${kind}`;
}

function CenterCard({ center: c, zones, campaignId, suggestions, onEdit }: {
  center: Center;
  zones: Zone[];
  campaignId?: string;
  suggestions: string[];
  onEdit: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const { data: center } = useCenter(open ? c.id : undefined);
  const { data: categories } = useCategories();
  const createItem = useCreateInventoryItem(campaignId);
  const updateItem = useUpdateInventoryItem(campaignId);
  const createCategory = useCreateCategory();
  const [showMovements, setShowMovements] = useState(false);
  const { data: movements } = useCenterMovements(c.id, open && showMovements);

  const [item, setItem] = useState<ItemDraft>(EMPTY_ITEM);
  const [showMore, setShowMore] = useState(false);
  const [newCat, setNewCat] = useState<{ name: string; unit: string; kind: CategoryKind } | null>(null);
  const [editing, setEditing] = useState<(ItemDraft & { id: string }) | null>(null);
  const [error, setError] = useState('');
  const [dispatchItem, setDispatchItem] = useState<{ id: string; name: string; quantity: number; unit?: string } | null>(null);

  const doPrint = () => window.print();
  const qty = Number(item.quantity);
  const qtyValid = Number.isFinite(qty) && qty > 0;
  const category = (categories ?? []).find((cat) => cat.id === item.categoryId);
  // La unidad por defecto sale de la categoría; el organizador puede cambiarla.
  const unit = item.unit || category?.unit || 'unidad';
  const unitOptions = [...new Set([...(category?.unit ? [category.unit] : []), ...NEED_UNITS])];
  const inventory = center?.inventoryByCategory ?? [];
  // Nombres ya usados: ingresarlos otra vez suma al mismo producto en vez de duplicarlo.
  const knownNames = [
    ...new Set([...suggestions, ...inventory.flatMap((g) => g.items.map((i) => i.name))]),
  ];
  const existing = inventory
    .flatMap((g) => g.items)
    .find((i) => normalizeItemName(i.name) === normalizeItemName(item.name) && (i.unit ?? 'unidad') === unit);

  const addItem = async () => {
    if (!item.name.trim() || !item.categoryId || !qtyValid) return;
    setError('');
    try {
      const saved = await createItem.mutateAsync({
        centerId: c.id,
        body: {
          name: item.name.trim(),
          categoryId: item.categoryId,
          quantity: qty,
          unit,
          expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString() : undefined,
          note: item.note.trim() || undefined,
        },
      });
      toast.success(
        saved.merged
          ? `Sumado: ${saved.name} ahora tiene ${saved.quantity} ${saved.unit ?? ''}`.trim()
          : t('toast.saved'),
      );
      // Se conservan categoría y unidad: normalmente se ingresan varios
      // productos parecidos seguidos.
      setItem((d) => ({ ...d, name: '', quantity: '1', expiresAt: '', note: '' }));
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const n = Number(editing.quantity);
    setError('');
    try {
      await updateItem.mutateAsync({
        centerId: c.id,
        itemId: editing.id,
        body: {
          name: editing.name.trim(),
          categoryId: editing.categoryId || undefined,
          unit: editing.unit || undefined,
          quantity: Number.isFinite(n) && n >= 0 ? n : undefined,
          expiresAt: editing.expiresAt ? new Date(editing.expiresAt).toISOString() : undefined,
        },
      });
      toast.success(t('toast.saved'));
      setEditing(null);
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const addCategory = async () => {
    if (!newCat?.name.trim()) return;
    setError('');
    try {
      const created = await createCategory.mutateAsync({
        name: newCat.name.trim(),
        unit: newCat.unit.trim() || undefined,
        kind: newCat.kind,
      });
      setItem((d) => ({ ...d, categoryId: created.id, unit: created.unit ?? '' }));
      setNewCat(null);
      toast.success(t('toast.saved'));
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', minWidth: 0 }}>
          {c.photoUrl && (
            <img
              src={c.photoUrl}
              alt={c.name}
              style={{ width: 56, height: 56, borderRadius: 'var(--r-md)', objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <div style={{ minWidth: 0 }}>
            <strong>{c.name}</strong>
            {c.address && <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{c.address}</div>}
            {c.reference && <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>{c.reference}</div>}
            {c.openingHours && <div style={{ fontSize: 'var(--fs-sm)' }}><Icon name="clock" size={14} /> {c.openingHours}</div>}
            {c.contactPhone && <div style={{ fontSize: 'var(--fs-sm)' }}><Icon name="phone" size={14} /> {c.contactPhone}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          <Badge tone="neutral">{c.loadPct ?? 0}%</Badge>
          <Button size="sm" variant="ghost" icon="settings" aria-label={t('common.edit')} onClick={onEdit} />
          <Button size="sm" variant="ghost" icon={open ? 'chevronDown' : 'box'} onClick={() => setOpen((v) => !v)}>
            {t('mgr.inventory')}
          </Button>
        </div>
      </div>

      {c.mapUrl && (
        <div style={{ display: 'flex', gap: 6, marginTop: 'var(--sp-2)', flexWrap: 'wrap' }}>
          <a
            href={c.mapUrl}
            target="_blank"
            rel="noreferrer noopener"
            style={{ fontSize: 'var(--fs-sm)', color: 'var(--brand-700)', fontWeight: 'var(--fw-bold)', display: 'inline-flex', gap: 4, alignItems: 'center' }}
          >
            <Icon name="map" size={14} /> Cómo llegar
          </a>
          <Button size="sm" variant="ghost" icon="share" onClick={() => shareUrl(c.mapUrl, toast, t('common.copied'))}>
            Compartir ubicación
          </Button>
        </div>
      )}

      {open && (
        <div style={{ marginTop: 'var(--sp-3)' }}>
          <div className="nx-print-area">
            <h3 style={{ fontSize: 'var(--fs-md)', marginBottom: 'var(--sp-2)' }}>{c.name} — {t('mgr.inventory')}</h3>
            {inventory.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{t('common.empty')}</p>
            )}
            {inventory.map((g) => (
              <div key={g.categoryId} style={{ marginBottom: 'var(--sp-2)' }}>
                <div style={{ fontWeight: 'var(--fw-bold)', fontSize: 'var(--fs-sm)' }}>
                  {g.icon ? `${g.icon} ` : ''}{g.category} · {g.totalQuantity}
                </div>
                {g.items.map((it) => (
                  <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
                    <span style={{ flex: 1 }}>
                      {it.name}
                      {it.expiresAt && (
                        <span style={{ fontSize: 'var(--fs-xs)' }}> · vence {formatDate(it.expiresAt)}</span>
                      )}
                    </span>
                    <span>{it.quantity}{it.unit ? ` ${it.unit}` : ''}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="settings"
                      aria-label={t('common.edit')}
                      onClick={() =>
                        setEditing({
                          id: it.id,
                          name: it.name,
                          categoryId: it.categoryId ?? g.categoryId,
                          unit: it.unit ?? 'unidad',
                          quantity: String(it.quantity),
                          expiresAt: it.expiresAt ? it.expiresAt.slice(0, 10) : '',
                          note: '',
                        })
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="truck"
                      disabled={it.quantity <= 0}
                      aria-label={t('ops.dispatch')}
                      onClick={() => setDispatchItem({ id: it.id, name: it.name, quantity: it.quantity, unit: it.unit })}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <Button size="sm" variant="subtle" icon="download" onClick={doPrint}>
              {t('mgr.printInventory')}
            </Button>
            <Button size="sm" variant="ghost" icon="list" onClick={() => setShowMovements((v) => !v)}>
              {showMovements ? 'Ocultar movimientos' : 'Ver movimientos'}
            </Button>
          </div>

          {showMovements && (
            <div style={{ marginTop: 'var(--sp-2)', borderTop: '1px solid var(--line)', paddingTop: 'var(--sp-2)' }}>
              {(movements ?? []).length === 0 && (
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{t('common.empty')}</span>
              )}
              {(movements ?? []).map((m) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 'var(--fs-sm)' }}>
                  <span>
                    <Badge tone={m.type === 'IN' ? 'success' : m.type === 'OUT' ? 'warn' : 'neutral'}>
                      {m.type === 'IN' ? 'Entrada' : m.type === 'OUT' ? 'Salida' : 'Ajuste'}
                    </Badge>{' '}
                    {m.item?.name ?? '—'} · {m.quantity}{m.item?.unit ? ` ${m.item.unit}` : ''}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {formatDateTime(m.createdAt)}{m.user ? ` · ${m.user.fullName}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          {error && <div style={{ marginTop: 'var(--sp-2)' }}><Banner tone="error">{error}</Banner></div>}

          {/* Ingreso de producto: nombre + categoría + unidad + cantidad. */}
          <div style={{ marginTop: 'var(--sp-3)', borderTop: '1px solid var(--line)', paddingTop: 'var(--sp-3)' }}>
            <div style={{ fontWeight: 'var(--fw-bold)', fontSize: 'var(--fs-sm)', marginBottom: 6 }}>
              Ingresar producto
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr', gap: 6 }}>
              <div>
                <Input
                  label="Producto"
                  placeholder="Frazadas"
                  list={`items-${c.id}`}
                  value={item.name}
                  onChange={(e) => setItem((d) => ({ ...d, name: e.target.value }))}
                />
                <datalist id={`items-${c.id}`}>
                  {knownNames.map((n) => <option key={n} value={n} />)}
                </datalist>
              </div>
              <Select
                label="Categoría"
                value={item.categoryId}
                onChange={(e) => {
                  const id = e.target.value;
                  const cat = (categories ?? []).find((x) => x.id === id);
                  // Al cambiar de categoría se propone su unidad; si ya se eligió
                  // una a mano, se respeta.
                  setItem((d) => ({ ...d, categoryId: id, unit: d.unit || cat?.unit || '' }));
                }}
                options={[
                  { value: '', label: 'Elige una categoría' },
                  ...(categories ?? []).map((cat) => ({ value: cat.id, label: categoryLabel(cat) })),
                ]}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, alignItems: 'flex-end', marginTop: 6 }}>
              <Select
                label="Unidad de medida"
                value={unit}
                onChange={(e) => setItem((d) => ({ ...d, unit: e.target.value }))}
                options={unitOptions.map((u) => ({ value: u, label: u }))}
              />
              <QtyInput label="Cantidad" value={item.quantity} onChange={(v) => setItem((d) => ({ ...d, quantity: v }))} width={110} />
              <Button
                icon="plus"
                disabled={!item.name.trim() || !item.categoryId || !qtyValid}
                loading={createItem.isPending}
                onClick={addItem}
              >
                {existing ? 'Sumar' : 'Ingresar'}
              </Button>
            </div>
            {existing && (
              <p style={{ margin: '6px 0 0', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                Ya hay {existing.quantity} {existing.unit ?? ''} de «{existing.name}»: se sumará a ese producto.
              </p>
            )}

            <Button size="sm" variant="ghost" icon={showMore ? 'chevronDown' : 'chevronRight'} onClick={() => setShowMore((v) => !v)} style={{ marginTop: 6 }}>
              {showMore ? 'Menos opciones' : 'Vencimiento, nota y categorías'}
            </Button>

            {showMore && (
              <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <Input
                    label="Vence"
                    hint={t('common.optional')}
                    type="date"
                    value={item.expiresAt}
                    onChange={(e) => setItem((d) => ({ ...d, expiresAt: e.target.value }))}
                  />
                  <Input
                    label="Nota del ingreso"
                    hint={t('common.optional')}
                    placeholder="Donación de la parroquia"
                    value={item.note}
                    onChange={(e) => setItem((d) => ({ ...d, note: e.target.value }))}
                  />
                </div>

                {newCat ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr auto auto', gap: 6, alignItems: 'flex-end' }}>
                    <Input label="Nueva categoría" placeholder="Combustible" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} autoFocus />
                    <Select
                      label="Unidad"
                      value={newCat.unit}
                      onChange={(e) => setNewCat({ ...newCat, unit: e.target.value })}
                      options={NEED_UNITS.map((u) => ({ value: u, label: u }))}
                    />
                    <Select
                      label="Tipo"
                      value={newCat.kind}
                      onChange={(e) => setNewCat({ ...newCat, kind: e.target.value as CategoryKind })}
                      options={CATEGORY_KINDS.map((k) => ({ value: k, label: `${CATEGORY_KIND[k].icon} ${CATEGORY_KIND[k].label}` }))}
                    />
                    <Button size="sm" icon="check" disabled={!newCat.name.trim()} loading={createCategory.isPending} onClick={addCategory} />
                    <Button size="sm" variant="ghost" icon="close" onClick={() => setNewCat(null)} />
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="subtle"
                    icon="plus"
                    onClick={() => setNewCat({ name: '', unit: 'unidad', kind: 'SUPPLY' })}
                  >
                    Crear categoría (comida, herramientas, transporte…)
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Corrección de un producto ya registrado. */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`${t('common.edit')}: ${editing?.name ?? ''}`}
        footer={
          <>
            <Button variant="subtle" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button icon="check" loading={updateItem.isPending} onClick={saveEdit}>{t('common.save')}</Button>
          </>
        }
      >
        {editing && (
          <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
            <Input label="Producto" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Select
              label="Categoría"
              value={editing.categoryId}
              onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
              options={(categories ?? []).map((cat) => ({ value: cat.id, label: categoryLabel(cat) }))}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <Select
                label="Unidad de medida"
                value={editing.unit}
                onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                options={[...new Set([editing.unit, ...NEED_UNITS])].map((u) => ({ value: u, label: u }))}
              />
              <Input
                label="Stock real"
                hint="queda como ajuste"
                type="number"
                inputMode="numeric"
                min={0}
                value={editing.quantity}
                onChange={(e) => setEditing({ ...editing, quantity: e.target.value })}
              />
            </div>
            <Input
              label="Vence"
              hint={t('common.optional')}
              type="date"
              value={editing.expiresAt}
              onChange={(e) => setEditing({ ...editing, expiresAt: e.target.value })}
            />
          </div>
        )}
      </Modal>

      {dispatchItem && (
        <DispatchModal
          centerId={c.id}
          campaignId={campaignId}
          zones={zones}
          item={dispatchItem}
          onClose={() => setDispatchItem(null)}
        />
      )}
    </Card>
  );
}

/* ───────── Despacho de un ítem del inventario ───────── */
function DispatchModal({ centerId, campaignId, zones, item, onClose }: {
  centerId: string;
  campaignId?: string;
  zones: Zone[];
  item: { id: string; name: string; quantity: number; unit?: string };
  onClose: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const dispatch = useDispatchCenterItem(campaignId);
  const { data: beneficiaries } = useBeneficiaries(campaignId ? { campaignId } : undefined);
  const [qty, setQty] = useState('1');
  // Zona de atención: se propone la principal para no dejar el despacho sin destino.
  const [zoneId, setZoneId] = useState(() => (zones.find((z) => z.isPrimary) ?? zones[0])?.id ?? '');
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [driverName, setDriverName] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const n = Number(qty);
  const valid = Number.isFinite(n) && n > 0 && n <= item.quantity && !!zoneId;
  const zone = zones.find((z) => z.id === zoneId);
  // Beneficiarios de la zona elegida primero: es a quienes se les va a entregar.
  const zoneBeneficiaries = (beneficiaries ?? []).filter((b) => !zoneId || b.zoneId === zoneId);
  const others = (beneficiaries ?? []).filter((b) => zoneId && b.zoneId !== zoneId);
  // Lo que esa zona todavía necesita, para no mandar de más.
  const pending = (zone?.needs ?? []).filter((need) => (need.targetQty ?? 0) > (need.fulfilledQty ?? 0));

  const submit = async () => {
    setError('');
    try {
      await dispatch.mutateAsync({
        centerId,
        body: {
          itemId: item.id,
          quantity: n,
          zoneId: zoneId || undefined,
          beneficiaryId: beneficiaryId || undefined,
          destAddress: destAddress.trim() || undefined,
          driverName: driverName.trim() || undefined,
          note: note.trim() || undefined,
        },
      });
      toast.success(t('toast.saved'));
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${t('ops.dispatch')}: ${item.name}`}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>{t('common.cancel')}</Button>
          <Button icon="truck" disabled={!valid} loading={dispatch.isPending} onClick={submit}>{t('ops.dispatch')}</Button>
        </>
      }
    >
      {error && <div style={{ marginBottom: 'var(--sp-2)' }}><Banner tone="error">{error}</Banner></div>}
      <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
          Stock: {item.quantity}{item.unit ? ` ${item.unit}` : ''}
          {Number.isFinite(n) && n > 0 && n <= item.quantity && (
            <> · queda {item.quantity - n}{item.unit ? ` ${item.unit}` : ''}</>
          )}
        </div>
        <QtyInput label={t('donate.quantity')} value={qty} onChange={setQty} width={120} />

        {zones.length === 0 ? (
          <Banner tone="warn" title="No hay zonas de atención">
            Crea una zona en la pestaña Zonas para poder despachar: es el destino de la ayuda.
          </Banner>
        ) : (
          <Select
            label="Zona de atención"
            hint="a dónde va la ayuda"
            value={zoneId}
            onChange={(e) => {
              setZoneId(e.target.value);
              setBeneficiaryId('');
            }}
            options={zones.map((z) => ({
              value: z.id,
              label: `${z.name}${z.isPrimary ? ' (principal)' : ''} · ${t(`sev.${z.severity}`)}`,
            }))}
          />
        )}

        {zone && (
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'grid', gap: 2 }}>
            {zone.reference && <span><Icon name="pin" size={12} /> {zone.reference}</span>}
            {pending.length > 0 && (
              <span>
                Pendiente en la zona: {pending.map((p) => `${p.title} ${(p.targetQty ?? 0) - (p.fulfilledQty ?? 0)}${p.unit ? ` ${p.unit}` : ''}`).join(' · ')}
              </span>
            )}
            {zone.mapUrl && (
              <a href={zone.mapUrl} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--brand-700)', fontWeight: 'var(--fw-bold)' }}>
                Ver zona en el mapa
              </a>
            )}
          </div>
        )}

        <Select
          label={`${t('nav.beneficiaries')} (${t('common.optional')})`}
          value={beneficiaryId}
          onChange={(e) => setBeneficiaryId(e.target.value)}
          options={[
            { value: '', label: '— Sin beneficiario (queda asignado a la zona)' },
            ...zoneBeneficiaries.map((b) => ({ value: b.id, label: `${b.fullName} · ${b.docNumber}` })),
            ...others.map((b) => ({ value: b.id, label: `${b.fullName} · ${b.docNumber} (otra zona)` })),
          ]}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <Input label="Punto de entrega" hint={t('common.optional')} placeholder="Losa deportiva" value={destAddress} onChange={(e) => setDestAddress(e.target.value)} />
          <Input label="Quién lo lleva" hint={t('common.optional')} value={driverName} onChange={(e) => setDriverName(e.target.value)} />
        </div>
        <Input label={t('common.note')} hint={t('common.optional')} value={note} onChange={(e) => setNote(e.target.value)} />
        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
          {beneficiaryId
            ? 'Se entregará al beneficiario: el despacho queda entregado y la persona marcada como atendida.'
            : 'Sin beneficiario queda asignado a la zona, listo para repartir.'}
        </p>
      </div>
    </Modal>
  );
}

/* ───────── Voluntarios inscritos en la campaña ───────── */
function Voluntarios({ id }: { id?: string }) {
  const t = useT();
  const toast = useToast();
  const volunteersQ = useCampaignVolunteers(id);
  const brigadesQ = useCampaignBrigades(id);
  const addVolunteer = useAddCampaignVolunteer(id);
  const removeVolunteer = useRemoveCampaignVolunteer(id);
  const addMember = useAddBrigadeMember(id);
  const removeMember = useRemoveBrigadeMember(id);
  const createVolunteer = useCreateVolunteer();
  // Día que se está mirando: por defecto hoy, para responder de un vistazo
  // "¿con qué voluntarios cuento?".
  const [day, setDay] = useState(todayISO());
  const availabilityQ = useCampaignAvailability(id, day);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [createDraft, setCreateDraft] = useState<{ fullName: string; phone: string; availability: string } | null>(null);
  const [scheduleFor, setScheduleFor] = useState<{ volunteerId: string; name: string } | null>(null);
  const [toRemove, setToRemove] = useState<{ volunteerId: string; name: string } | null>(null);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setError('');
    try {
      await fn();
      after?.();
      toast.success(t('toast.saved'));
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  if (volunteersQ.isLoading || brigadesQ.isLoading) return <CenteredSpinner label={t('common.loading')} />;

  const volunteers = volunteersQ.data ?? [];
  const brigades = brigadesQ.data ?? [];
  const availability = availabilityQ.data;
  const availableById = new Map(
    (availability?.volunteers ?? [])
      .filter((a) => a.available)
      .map((a) => [a.id, a]),
  );
  const isToday = day === todayISO();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 'var(--sp-3)' }}>
        <Button variant="subtle" icon="plus" onClick={() => setCreateDraft({ fullName: '', phone: '', availability: '' })}>{t('ops.newVolunteer')}</Button>
        <Button icon="mail" onClick={() => setOpen(true)}>Agregar por correo</Button>
      </div>
      {error && <div style={{ marginBottom: 'var(--sp-3)' }}><Banner tone="error">{error}</Banner></div>}

      {/* Con quién se cuenta ese día: cruza inscritos y disponibilidad declarada. */}
      <Card style={{ marginBottom: 'var(--sp-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Input
              label={isToday ? 'Disponibles hoy' : 'Disponibles el día'}
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </div>
          <Button size="sm" variant={isToday ? 'primary' : 'subtle'} icon="calendar" onClick={() => setDay(todayISO())}>
            Hoy
          </Button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-black)' }}>
              {availability?.availableCount ?? 0}
              <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', fontWeight: 'var(--fw-bold)' }}>
                {' '}/ {availability?.total ?? volunteers.length}
              </span>
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>voluntarios disponibles</div>
          </div>
        </div>
        {(availability?.availableCount ?? 0) === 0 ? (
          <p style={{ margin: '8px 0 0', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
            Nadie declaró disponibilidad para ese día. Registra los horarios con el botón del reloj
            de cada voluntario (puedes marcar días fijos de la semana).
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'var(--sp-2)' }}>
            {(availability?.volunteers ?? [])
              .filter((a) => a.available)
              .map((a) => (
                <Badge key={a.id} tone="success">
                  {a.fullName} · {a.slots.map((sl) => `${sl.startTime}–${sl.endTime}`).join(', ')}
                </Badge>
              ))}
          </div>
        )}
      </Card>

      {volunteers.length === 0 ? (
        <Banner tone="info" title="Todavía no hay voluntarios inscritos">
          Los voluntarios se inscriben desde la página de la campaña. También puedes agregarlos tú por correo.
        </Banner>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {volunteers.map((v) => (
            <Card key={v.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
                <div>
                  <strong>{v.fullName}</strong>{' '}
                  {v.isGuest && <Badge tone="warn">Sin cuenta</Badge>}
                  {availableById.has(v.id) && (
                    <Badge tone="success" dot>
                      {isToday ? 'Hoy' : 'Ese día'}:{' '}
                      {availableById.get(v.id)!.slots.map((sl) => `${sl.startTime}–${sl.endTime}`).join(', ')}
                    </Badge>
                  )}
                  <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
                    {v.email ?? 'sin correo'}
                    {v.phone ? ` · 📞 ${v.phone}` : ''}
                  </div>
                  {v.skills.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {v.skills.map((sk) => <Badge key={sk} tone="info">{sk}</Badge>)}
                    </div>
                  )}
                  {v.note && <div style={{ fontSize: 'var(--fs-sm)', marginTop: 4 }}>{v.note}</div>}
                  {v.isGuest && (
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                      Se ofreció desde la web. Contáctalo para que cree su cuenta y así
                      puedas sumarlo a una brigada.
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {/* Horarios y brigadas cuelgan del perfil de voluntario: un
                      invitado no tiene, así que no se le pueden registrar. */}
                  {v.volunteerId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="clock"
                      aria-label={t('ops.registerVolunteer')}
                      onClick={() => setScheduleFor({ volunteerId: v.volunteerId!, name: v.fullName })}
                    >
                      {t('ops.registerVolunteer')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="close"
                    aria-label="Quitar de la campaña"
                    onClick={() => setToRemove({ volunteerId: v.volunteerId ?? v.id, name: v.fullName })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 'var(--sp-2)', display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                {!v.volunteerId ? null : v.brigade ? (
                  <>
                    <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>{t('ops.brigades')}:</span>
                    <Badge tone="success">{v.brigade.name}</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        run(() => removeMember.mutateAsync({ brigadeId: v.brigade!.id, memberId: v.brigade!.memberId }))
                      }
                    >
                      Quitar de la brigada
                    </Button>
                  </>
                ) : brigades.length === 0 ? (
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
                    Crea una brigada para poder asignarlo.
                  </span>
                ) : (
                  <div style={{ minWidth: 220 }}>
                    <Select
                      label="Asignar a brigada"
                      value=""
                      onChange={(e) => {
                        const brigadeId = e.target.value;
                        if (brigadeId) {
                          run(() => addMember.mutateAsync({ brigadeId, body: { volunteerId: v.volunteerId! } }));
                        }
                      }}
                      options={[
                        { value: '', label: 'Elige una brigada' },
                        ...brigades.map((b) => ({ value: b.id, label: b.name })),
                      ]}
                    />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Agregar voluntario"
        footer={
          <>
            <Button variant="subtle" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button
              icon="plus"
              disabled={!email.includes('@')}
              loading={addVolunteer.isPending}
              onClick={() => run(() => addVolunteer.mutateAsync({ email: email.trim() }), () => { setEmail(''); setOpen(false); })}
            >
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          <Input
            label="Correo del voluntario"
            hint="debe tener cuenta en NOSXOTROS"
            type="email"
            placeholder="voluntario@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>

      {/* Crear voluntario sin cuenta (lo da de alta el gestor) */}
      <Modal
        open={!!createDraft}
        onClose={() => setCreateDraft(null)}
        title={t('ops.newVolunteer')}
        footer={
          <>
            <Button variant="subtle" onClick={() => setCreateDraft(null)}>{t('common.cancel')}</Button>
            <Button
              icon="plus"
              disabled={!createDraft?.fullName.trim()}
              loading={createVolunteer.isPending || addVolunteer.isPending}
              onClick={() =>
                run(async () => {
                  const created = await createVolunteer.mutateAsync({
                    fullName: createDraft!.fullName.trim(),
                    phone: createDraft!.phone.trim() || undefined,
                    availability: createDraft!.availability.trim() || undefined,
                  });
                  // Inscribe al voluntario recién creado en esta campaña.
                  if (created?.email) await addVolunteer.mutateAsync({ email: created.email });
                }, () => setCreateDraft(null))
              }
            >
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          <Input label={t('census.fullName')} value={createDraft?.fullName ?? ''} onChange={(e) => setCreateDraft((d) => d && { ...d, fullName: e.target.value })} autoFocus />
          <Input label={t('donate.phone')} type="tel" value={createDraft?.phone ?? ''} onChange={(e) => setCreateDraft((d) => d && { ...d, phone: e.target.value })} />
          <Input label={t('ops.availability')} placeholder="Lun-Vie 8:00-13:00" value={createDraft?.availability ?? ''} onChange={(e) => setCreateDraft((d) => d && { ...d, availability: e.target.value })} />
        </div>
      </Modal>

      {scheduleFor && (
        <ScheduleModal
          volunteerId={scheduleFor.volunteerId}
          name={scheduleFor.name}
          campaignId={id}
          onClose={() => setScheduleFor(null)}
        />
      )}

      <ConfirmDialog
        open={!!toRemove}
        danger
        title={`Quitar a ${toRemove?.name ?? ''}`}
        message="Saldrá de la campaña y de la brigada en la que esté."
        confirmLabel="Quitar"
        cancelLabel={t('common.cancel')}
        loading={removeVolunteer.isPending}
        onCancel={() => setToRemove(null)}
        onConfirm={() => run(() => removeVolunteer.mutateAsync(toRemove!.volunteerId), () => setToRemove(null))}
      />
    </div>
  );
}

/* ───────── Registrar horario de trabajo de un voluntario ───────── */
function ScheduleModal({ volunteerId, name, campaignId, onClose }: {
  volunteerId: string;
  name: string;
  campaignId?: string;
  onClose: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const addSchedule = useAddVolunteerSchedule(campaignId);
  const deleteSchedule = useDeleteVolunteerSchedule(campaignId);
  const { data: schedules } = useVolunteerSchedules(volunteerId);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Disponibilidad: ${name}`}
      footer={<Button variant="subtle" onClick={onClose}>{t('common.close')}</Button>}
    >
      <AvailabilityEditor
        schedules={schedules ?? []}
        campaignId={campaignId}
        adding={addSchedule.isPending}
        deleting={deleteSchedule.isPending}
        onAdd={async (body) => {
          await addSchedule.mutateAsync({ volunteerId, body });
          toast.success(t('toast.saved'));
        }}
        onDelete={(scheduleId) => deleteSchedule.mutate({ volunteerId, scheduleId })}
      />
    </Modal>
  );
}

/* ───────── Metas de la campaña: dinero, voluntarios y especies ───────── */
interface NeedDraft {
  title: string;
  categoryId: string;
  unit: string;
  targetQty: string;
  priority: Severity;
  zoneId: string;
}
const EMPTY_NEED: NeedDraft = {
  title: '',
  categoryId: '',
  unit: '',
  targetQty: '10',
  priority: 'MEDIUM',
  zoneId: '',
};

function Metas({ campaign, ops }: { campaign: Campaign; ops: CampaignOperations }) {
  const t = useT();
  const toast = useToast();
  const id = campaign.id;
  const { data: goals, isLoading } = useCampaignGoals(id);
  const { data: categories } = useCategories();
  const createNeed = useCreateCampaignNeed(id);
  const updateNeed = useUpdateCampaignNeed(id);
  const deleteNeed = useDeleteCampaignNeed(id);
  const createCategory = useCreateCategory();
  const updateCampaign = useUpdateCampaign();

  const [draft, setDraft] = useState<NeedDraft>(EMPTY_NEED);
  const [newCat, setNewCat] = useState<{ name: string; unit: string; kind: CategoryKind } | null>(null);
  const [editing, setEditing] = useState<{ id: string; title: string; targetQty: string; unit: string } | null>(null);
  const [toDelete, setToDelete] = useState<CampaignItemGoal | null>(null);
  // Metas de dinero y voluntarios: se editan aquí mismo, sin ir a Ajustes.
  const [goalAmount, setGoalAmount] = useState(campaign.goalAmount != null ? String(campaign.goalAmount) : '');
  const [volunteerGoal, setVolunteerGoal] = useState(campaign.volunteerGoal != null ? String(campaign.volunteerGoal) : '');
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setError('');
    try {
      await fn();
      after?.();
      toast.success(t('toast.saved'));
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const category = (categories ?? []).find((c) => c.id === draft.categoryId);
  const unit = draft.unit || category?.unit || 'unidad';
  const target = Number(draft.targetQty);
  const targetValid = Number.isFinite(target) && target > 0;

  const addNeed = () =>
    run(
      () =>
        createNeed.mutateAsync({
          title: draft.title.trim(),
          targetQty: target,
          unit,
          categoryId: draft.categoryId || undefined,
          priority: draft.priority,
          zoneId: draft.zoneId || undefined,
        }),
      () => setDraft({ ...EMPTY_NEED, categoryId: draft.categoryId, unit: draft.unit }),
    );

  const addCategory = () => {
    if (!newCat?.name.trim()) return;
    return run(async () => {
      const created = await createCategory.mutateAsync({
        name: newCat.name.trim(),
        unit: newCat.unit.trim() || undefined,
        kind: newCat.kind,
      });
      setDraft((d) => ({ ...d, categoryId: created.id, unit: created.unit ?? '' }));
      setNewCat(null);
    });
  };

  // Dejar el campo vacío quita la meta (manda null); un número la fija. Un valor
  // inválido no se manda, para no borrar una meta por un dedazo.
  const goalValue = (raw: string): number | null | undefined => {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const saveMoneyGoals = () => {
    const money = goalValue(goalAmount);
    const vol = goalValue(volunteerGoal);
    if (money === undefined && goalAmount.trim() !== '') {
      setError('La meta de dinero debe ser un número mayor que cero.');
      return;
    }
    if (vol === undefined && volunteerGoal.trim() !== '') {
      setError('La meta de voluntarios debe ser un número mayor que cero.');
      return;
    }
    return run(() =>
      updateCampaign.mutateAsync({
        id,
        body: {
          ...(money !== undefined ? { goalAmount: money } : {}),
          ...(vol !== undefined ? { volunteerGoal: vol } : {}),
        },
      }),
    );
  };

  if (isLoading) return <CenteredSpinner label={t('common.loading')} />;

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
      {error && <Banner tone="error">{error}</Banner>}

      {/* Dinero y voluntarios */}
      <Card>
        <div style={{ fontWeight: 'var(--fw-bold)', marginBottom: 'var(--sp-2)' }}>Metas generales</div>
        <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
          <div>
            <ProgressBar
              value={goals?.money.raised ?? 0}
              max={goals?.money.goal || 1}
              tone="gold"
              label={t('camp.raised')}
              rightLabel={
                goals?.money.goal
                  ? `${formatSoles(goals.money.raised)} / ${formatSoles(goals.money.goal)}`
                  : formatSoles(goals?.money.raised ?? 0)
              }
            />
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
              {goals?.money.backers ?? 0} {t('camp.backers').toLowerCase()}
            </div>
          </div>
          <div>
            <ProgressBar
              value={goals?.volunteers.enrolled ?? 0}
              max={goals?.volunteers.goal || 1}
              tone="brand"
              label="Voluntarios inscritos"
              rightLabel={
                goals?.volunteers.goal
                  ? `${goals.volunteers.enrolled} / ${goals.volunteers.goal}`
                  : String(goals?.volunteers.enrolled ?? 0)
              }
            />
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
              Hoy cuentas con {goals?.volunteers.availableToday ?? 0} disponible(s)
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, alignItems: 'flex-end' }}>
            <Input
              label="Meta de dinero"
              type="number"
              inputMode="numeric"
              min={1}
              prefix="S/"
              placeholder="8000"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
            />
            <Input
              label="Meta de voluntarios"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="20"
              value={volunteerGoal}
              onChange={(e) => setVolunteerGoal(e.target.value)}
            />
            <Button icon="check" loading={updateCampaign.isPending} onClick={saveMoneyGoals}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Metas en especie */}
      <Card>
        <div style={{ fontWeight: 'var(--fw-bold)' }}>Qué se necesita</div>
        <p style={{ margin: '2px 0 var(--sp-2)', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
          Escribe el producto tal como lo vas a registrar en el almacén ("frazadas", "arroz"):
          cada ingreso al centro de acopio con ese nombre y esa unidad avanza la meta solo.
        </p>

        {(goals?.items ?? []).length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
            Todavía no hay metas en especie.
          </p>
        )}

        <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
          {(goals?.items ?? []).map((n) => (
            <div key={n.id}>
              <ProgressBar
                value={n.collectedQty}
                max={n.targetQty || 1}
                tone={n.isBlocked ? 'warn' : 'brand'}
                label={`${n.category?.icon ? `${n.category.icon} ` : ''}${n.title}${n.zone ? ` · ${n.zone.name}` : ''}`}
                rightLabel={`${n.collectedQty}/${n.targetQty} ${n.unit}`}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                  {n.isBlocked ? 'No traer más · ' : ''}
                  Faltan {n.remaining} {n.unit} · en almacén {n.inStock} · entregado {n.deliveredQty}
                </span>
                <span style={{ display: 'flex', gap: 2 }}>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={n.isBlocked ? 'check' : 'minus'}
                    aria-label={n.isBlocked ? 'Volver a pedir' : 'No traer más'}
                    onClick={() => run(() => updateNeed.mutateAsync({ id: n.id, body: { isBlocked: !n.isBlocked } }))}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="settings"
                    aria-label={t('common.edit')}
                    onClick={() =>
                      setEditing({ id: n.id, title: n.title, targetQty: String(n.targetQty), unit: n.unit })
                    }
                  />
                  <Button size="sm" variant="ghost" icon="close" aria-label={t('common.delete')} onClick={() => setToDelete(n)} />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Alta de meta */}
        <div style={{ marginTop: 'var(--sp-3)', borderTop: '1px solid var(--line)', paddingTop: 'var(--sp-3)', display: 'grid', gap: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr', gap: 6 }}>
            <Input
              label="Qué se necesita"
              placeholder="Frazadas"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <Select
              label="Categoría"
              value={draft.categoryId}
              onChange={(e) => {
                const cat = (categories ?? []).find((x) => x.id === e.target.value);
                setDraft({ ...draft, categoryId: e.target.value, unit: draft.unit || cat?.unit || '' });
              }}
              options={[
                { value: '', label: 'Sin categoría' },
                ...(categories ?? []).map((cat) => ({ value: cat.id, label: categoryLabel(cat) })),
              ]}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 6, alignItems: 'flex-end' }}>
            <QtyInput label="Cantidad" value={draft.targetQty} onChange={(v) => setDraft({ ...draft, targetQty: v })} width={100} />
            <Select
              label={t('ops.unit')}
              value={unit}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
              options={[...new Set([unit, ...NEED_UNITS])].map((u) => ({ value: u, label: u }))}
            />
            <Select
              label="Prioridad"
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: e.target.value as Severity })}
              options={SEVERITIES.map((s) => ({ value: s, label: t(`sev.${s}`) }))}
            />
            <Button
              icon="plus"
              disabled={!draft.title.trim() || !targetValid}
              loading={createNeed.isPending}
              onClick={addNeed}
            >
              {t('common.add')}
            </Button>
          </div>
          {ops.zones.length > 0 && (
            <Select
              label="Solo para una zona"
              hint={t('common.optional')}
              value={draft.zoneId}
              onChange={(e) => setDraft({ ...draft, zoneId: e.target.value })}
              options={[
                { value: '', label: 'Toda la campaña' },
                ...ops.zones.map((z) => ({ value: z.id, label: z.name })),
              ]}
            />
          )}

          {newCat ? (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr auto auto', gap: 6, alignItems: 'flex-end' }}>
              <Input label="Nueva categoría" placeholder="Combustible" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} autoFocus />
              <Select
                label="Unidad"
                value={newCat.unit}
                onChange={(e) => setNewCat({ ...newCat, unit: e.target.value })}
                options={NEED_UNITS.map((u) => ({ value: u, label: u }))}
              />
              <Select
                label="Tipo"
                value={newCat.kind}
                onChange={(e) => setNewCat({ ...newCat, kind: e.target.value as CategoryKind })}
                options={CATEGORY_KINDS.map((k) => ({ value: k, label: `${CATEGORY_KIND[k].icon} ${CATEGORY_KIND[k].label}` }))}
              />
              <Button size="sm" icon="check" disabled={!newCat.name.trim()} loading={createCategory.isPending} onClick={addCategory} />
              <Button size="sm" variant="ghost" icon="close" onClick={() => setNewCat(null)} />
            </div>
          ) : (
            <Button size="sm" variant="subtle" icon="plus" onClick={() => setNewCat({ name: '', unit: 'unidad', kind: 'SUPPLY' })}>
              Crear categoría (comida, herramientas, transporte, combustible…)
            </Button>
          )}
        </div>
      </Card>

      {/* Resumen por categoría */}
      {(goals?.byCategory ?? []).length > 0 && (
        <Card>
          <div style={{ fontWeight: 'var(--fw-bold)', marginBottom: 'var(--sp-2)' }}>Por categoría</div>
          <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
            {(goals?.byCategory ?? []).map((row) => (
              <ProgressBar
                key={row.id ?? row.name}
                value={row.collectedQty}
                max={row.targetQty || 1}
                tone="gold"
                label={`${row.icon ? `${row.icon} ` : ''}${row.name}`}
                rightLabel={`${row.collectedQty}/${row.targetQty}`}
              />
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`${t('common.edit')}: ${editing?.title ?? ''}`}
        footer={
          <>
            <Button variant="subtle" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button
              icon="check"
              loading={updateNeed.isPending}
              onClick={() =>
                editing &&
                run(
                  () =>
                    updateNeed.mutateAsync({
                      id: editing.id,
                      body: {
                        title: editing.title.trim(),
                        targetQty: Number(editing.targetQty) || 0,
                        unit: editing.unit,
                      },
                    }),
                  () => setEditing(null),
                )
              }
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        {editing && (
          <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
            <Input label="Qué se necesita" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <Input
                label="Cantidad"
                type="number"
                inputMode="numeric"
                min={0}
                value={editing.targetQty}
                onChange={(e) => setEditing({ ...editing, targetQty: e.target.value })}
              />
              <Select
                label={t('ops.unit')}
                value={editing.unit}
                onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                options={[...new Set([editing.unit, ...NEED_UNITS])].map((u) => ({ value: u, label: u }))}
              />
            </div>
            <p style={{ margin: 0, fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
              Si cambias el nombre, la meta se enlazará con los productos que se registren con ese
              nombre nuevo.
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        danger
        title={`${t('common.delete')}: ${toDelete?.title ?? ''}`}
        message="Se quitará la meta. Lo que ya está en el almacén no se toca."
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleteNeed.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => run(() => deleteNeed.mutateAsync(toDelete!.id), () => setToDelete(null))}
      />
    </div>
  );
}

/* ───────── Donaciones (dinero / especies) + alta manual ───────── */
function Donaciones({ id }: { id?: string }) {
  const t = useT();
  const toast = useToast();
  const { data, isLoading } = useCampaignDonations(id);
  const createDonation = useCreateDonation();
  const confirmPayment = useConfirmPayment();
  const updateStatus = useUpdateDonationStatus();

  const [open, setOpen] = useState(false);
  const [dType, setDType] = useState<'MONEY' | 'GOODS'>('MONEY');
  const [amount, setAmount] = useState('');
  const [qty, setQty] = useState('1');
  const [desc, setDesc] = useState('');
  const [donor, setDonor] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const donations = (data ?? []).filter((d) => d.type !== 'TIME');

  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
      toast.success(t('toast.saved'));
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const submit = async () => {
    setError('');
    try {
      const body: Parameters<typeof createDonation.mutateAsync>[0] = {
        type: dType,
        campaignId: id,
        donorName: donor || undefined,
        donorPhone: phone || undefined,
        description: desc || undefined,
      };
      if (dType === 'MONEY') {
        body.amount = Number(amount) || 0;
        body.paymentMethod = 'YAPE';
      } else {
        body.quantity = Number(qty);
        body.paymentMethod = 'IN_KIND';
      }
      const created = await createDonation.mutateAsync(body);
      if (dType === 'MONEY') await confirmPayment.mutateAsync({ id: created.id, reference: 'MANUAL' });
      toast.success(t('toast.donationDone'));
      setAmount(''); setQty('1'); setDesc(''); setDonor(''); setPhone(''); setOpen(false);
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const valid = dType === 'MONEY' ? Number(amount) > 0 : Number(qty) > 0 && desc.trim().length > 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--sp-3)' }}>
        <Button icon="plus" onClick={() => setOpen(true)}>{t('donate.title')}</Button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('donate.title')}
        footer={
          <>
            <Button variant="subtle" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button icon="plus" disabled={!valid} loading={createDonation.isPending || confirmPayment.isPending} onClick={submit}>
              {t('common.create')}
            </Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 'var(--sp-2)' }}><Banner tone="error">{error}</Banner></div>}
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          <Select label={t('donate.chooseType')} value={dType} onChange={(e) => setDType(e.target.value as 'MONEY' | 'GOODS')}
            options={[{ value: 'MONEY', label: t('donate.money') }, { value: 'GOODS', label: t('donate.goods') }]} />
          {dType === 'MONEY' ? (
            <Input label={t('donate.amount')} type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 6 }}>
              <Input label={t('donate.quantity')} type="number" inputMode="numeric" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
              <Input label={t('donate.whatDonate')} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <Input label={t('donate.name')} value={donor} onChange={(e) => setDonor(e.target.value)} />
            <Input label={t('donate.phone')} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
      </Modal>

      {error && !open && <div style={{ marginBottom: 'var(--sp-3)' }}><Banner tone="error">{error}</Banner></div>}
      {isLoading ? (
        <CenteredSpinner label={t('common.loading')} />
      ) : donations.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>{t('common.empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {donations.map((d) => (
            <Card key={d.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <div>
                  <strong>{d.type === 'MONEY' ? formatSoles(d.amount) : `${d.quantity ?? ''} ${d.description ?? ''}`}</strong>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                    {d.anonymous ? t('donate.anonymous') : d.donorName ?? d.donorEmail ?? d.donorPhone ?? '—'} · {d.code}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StatusBadge status={d.status} />
                  <div style={{ width: 140 }}>
                    <Select
                      aria-label={t('donate.changeStatus')}
                      value={d.status}
                      disabled={updateStatus.isPending}
                      onChange={(e) => {
                        const status = e.target.value as DonationStatus;
                        if (status !== d.status) run(() => updateStatus.mutateAsync({ id: d.id, body: { status } }));
                      }}
                      options={DONATION_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── Beneficiarios de la campaña ───────── */
interface BeneficiaryDraft {
  docNumber: string;
  fullName: string;
  householdSize: string;
  phone: string;
  address: string;
}
const EMPTY_BENEFICIARY: BeneficiaryDraft = {
  docNumber: '',
  fullName: '',
  householdSize: '1',
  phone: '',
  address: '',
};

function Beneficiarios({ campaignId, emergencyId, ops }: { campaignId?: string; emergencyId?: string; ops: CampaignOperations }) {
  const t = useT();
  const toast = useToast();
  const { data, isLoading } = useBeneficiaries(campaignId ? { campaignId } : undefined);
  const createBen = useCreateBeneficiary();
  const updateBen = useUpdateBeneficiary();
  const deleteBen = useDeleteBeneficiary();
  const [editing, setEditing] = useState<{ id?: string; draft: BeneficiaryDraft } | null>(null);
  const [toDelete, setToDelete] = useState<Beneficiary | null>(null);
  const [enroll, setEnroll] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setError('');
    try {
      await fn();
      after?.();
      toast.success(t('toast.saved'));
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const save = () => {
    if (!editing) return;
    const { id, draft } = editing;
    const household = Number(draft.householdSize);
    const body = {
      docNumber: draft.docNumber.trim(),
      fullName: draft.fullName.trim(),
      householdSize: Number.isFinite(household) && household > 0 ? household : 1,
      phone: draft.phone.trim() || undefined,
      address: draft.address.trim() || undefined,
    };
    return run(
      () =>
        id
          ? updateBen.mutateAsync({ id, body })
          : createBen.mutateAsync({ ...body, campaignId, emergencyId }),
      () => setEditing(null),
    );
  };

  const draft = editing?.draft ?? EMPTY_BENEFICIARY;
  const setDraft = (patch: Partial<BeneficiaryDraft>) =>
    setEditing((prev) => (prev ? { ...prev, draft: { ...prev.draft, ...patch } } : prev));
  const beneficiaries = data ?? [];
  const valid = draft.docNumber.trim().length >= 3 && draft.fullName.trim().length >= 2;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 'var(--sp-3)' }}>
        <Button variant="subtle" icon="plus" onClick={() => setEditing({ draft: EMPTY_BENEFICIARY })}>Agregar beneficiario</Button>
        <Button icon="gift" onClick={() => setEnroll(true)}>{t('ops.enroll')}</Button>
      </div>
      {error && <div style={{ marginBottom: 'var(--sp-3)' }}><Banner tone="error">{error}</Banner></div>}

      {enroll && (
        <EnrollModal
          campaignId={campaignId}
          emergencyId={emergencyId}
          ops={ops}
          onClose={() => setEnroll(false)}
        />
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? t('common.edit') : 'Agregar beneficiario'}
        footer={
          <>
            <Button variant="subtle" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button
              icon={editing?.id ? 'check' : 'plus'}
              disabled={!valid}
              loading={createBen.isPending || updateBen.isPending}
              onClick={save}
            >
              {editing?.id ? t('common.save') : t('common.create')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          <Input label={t('census.docNumber')} value={draft.docNumber} onChange={(e) => setDraft({ docNumber: e.target.value })} autoFocus />
          <Input label={t('census.fullName')} value={draft.fullName} onChange={(e) => setDraft({ fullName: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <Input
              label={t('census.household')}
              type="number"
              inputMode="numeric"
              min={1}
              value={draft.householdSize}
              onChange={(e) => setDraft({ householdSize: e.target.value })}
            />
            <Input label={t('donate.phone')} type="tel" value={draft.phone} onChange={(e) => setDraft({ phone: e.target.value })} />
          </div>
          <Input label={t('mgr.address')} value={draft.address} onChange={(e) => setDraft({ address: e.target.value })} />
        </div>
      </Modal>

      {isLoading ? (
        <CenteredSpinner label={t('common.loading')} />
      ) : beneficiaries.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>{t('common.empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {beneficiaries.map((b) => (
            <Card key={b.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <div>
                  <strong>{b.fullName}</strong>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                    {b.docType ?? 'DNI'} {b.docNumber}
                    {b.householdSize ? ` · ${b.householdSize} pers.` : ''}
                    {b.phone ? ` · 📞 ${b.phone}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <StatusBadge status={b.status} />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="settings"
                    aria-label={t('common.edit')}
                    onClick={() =>
                      setEditing({
                        id: b.id,
                        draft: {
                          docNumber: b.docNumber,
                          fullName: b.fullName,
                          householdSize: b.householdSize ? String(b.householdSize) : '1',
                          phone: b.phone ?? '',
                          address: b.address ?? '',
                        },
                      })
                    }
                  />
                  <Button size="sm" variant="ghost" icon="close" aria-label={t('common.delete')} onClick={() => setToDelete(b)} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        danger
        title={`${t('common.delete')}: ${toDelete?.fullName ?? ''}`}
        message="Se eliminará del censo de la campaña. Esta acción no se puede deshacer."
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleteBen.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => run(() => deleteBen.mutateAsync(toDelete!.id), () => setToDelete(null))}
      />
    </div>
  );
}

/* ───────── Empadronar con entrega (beneficiario + descuento de almacén) ───────── */
function EnrollModal({ campaignId, emergencyId, ops, onClose }: {
  campaignId?: string;
  emergencyId?: string;
  ops: CampaignOperations;
  onClose: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const createBen = useCreateBeneficiary();
  const dispatch = useDispatchCenterItem(campaignId);
  const [docNumber, setDocNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [centerId, setCenterId] = useState('');
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('1');
  const [error, setError] = useState('');
  const { data: center } = useCenter(centerId || undefined);
  const items = (center?.inventoryByCategory ?? []).flatMap((g) => g.items).filter((it) => it.quantity > 0);
  const n = Number(qty);
  const valid = docNumber.trim().length >= 3 && fullName.trim().length >= 2;

  const submit = async () => {
    setError('');
    try {
      const created = await createBen.mutateAsync({
        docNumber: docNumber.trim(),
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        photoUrl: photoUrl || undefined,
        zoneId: zoneId || undefined,
        campaignId,
        emergencyId,
      });
      // Entrega opcional: descuenta del almacén y registra la salida.
      if (centerId && itemId && Number.isFinite(n) && n > 0) {
        await dispatch.mutateAsync({
          centerId,
          body: { itemId, quantity: n, zoneId: zoneId || undefined, beneficiaryId: created.id },
        });
      }
      toast.success(t('toast.saved'));
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('ops.enroll')}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>{t('common.cancel')}</Button>
          <Button icon="check" disabled={!valid} loading={createBen.isPending || dispatch.isPending} onClick={submit}>{t('common.save')}</Button>
        </>
      }
    >
      {error && <div style={{ marginBottom: 'var(--sp-2)' }}><Banner tone="error">{error}</Banner></div>}
      <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        <ImageUpload label={t('census.photo')} value={photoUrl} onChange={setPhotoUrl} previewHeight={140} />
        <Input label={t('census.fullName')} value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <Input label={t('census.docNumber')} value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
          <Input label={t('donate.phone')} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Select
          label={`${t('ops.zones')} (${t('common.optional')})`}
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
          options={[{ value: '', label: '—' }, ...ops.zones.map((z) => ({ value: z.id, label: z.name }))]}
        />
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--sp-2)' }}>
          <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', marginBottom: 4 }}>{t('ops.deliveries')} ({t('common.optional')})</div>
          <div style={{ display: 'grid', gap: 6 }}>
            <Select
              label={t('ops.centers')}
              value={centerId}
              onChange={(e) => { setCenterId(e.target.value); setItemId(''); }}
              options={[{ value: '', label: '—' }, ...ops.centers.map((c) => ({ value: c.id, label: c.name }))]}
            />
            {centerId && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 6 }}>
                <Select
                  label="Ítem"
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  options={[{ value: '', label: '—' }, ...items.map((it) => ({ value: it.id, label: `${it.name} (${it.quantity})` }))]}
                />
                <QtyInput label={t('donate.quantity')} value={qty} onChange={setQty} width={90} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ───────── Ajustes ───────── */

// Estados que el organizador decide. FUNDED no está: lo pone el sistema solo al
// alcanzar la meta, así que solo se ofrece si la campaña ya está ahí.
const MANAGER_STATUSES: { value: CampaignStatus; label: string }[] = [
  { value: 'DRAFT', label: 'No publicada — borrador' },
  { value: 'ACTIVE', label: 'Publicada — recaudando' },
  { value: 'PAUSED', label: 'Pausada — visible, sin recibir aportes' },
  { value: 'COMPLETED', label: 'Cerrada con éxito' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

function EstadoCampana({ campaign }: { campaign: Campaign }) {
  const update = useUpdateCampaign();
  const toast = useToast();
  const [status, setStatus] = useState<CampaignStatus>(campaign.status);
  const [error, setError] = useState('');

  // Si la campaña cambia por fuera (otra pestaña, meta alcanzada), sigue al dato.
  useEffect(() => setStatus(campaign.status), [campaign.status]);

  const options = MANAGER_STATUSES.some((s) => s.value === campaign.status)
    ? MANAGER_STATUSES
    : [...MANAGER_STATUSES, { value: campaign.status, label: CAMPAIGN_STATUS[campaign.status].label }];

  const dirty = status !== campaign.status;
  const willHide = status === 'DRAFT';

  const save = async () => {
    setError('');
    try {
      await update.mutateAsync({ id: campaign.id, body: { status } });
      toast.success(willHide ? 'Campaña despublicada' : 'Estado actualizado');
    } catch (err) {
      setError(apiErrorMessage(err));
      setStatus(campaign.status);
    }
  };

  return (
    <Card>
      <div style={{ fontWeight: 'var(--fw-bold)', marginBottom: 'var(--sp-2)' }}>
        Estado de la campaña
      </div>
      <div style={{ marginBottom: 'var(--sp-2)' }}>
        <StatusBadge status={campaign.status} />{' '}
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
          {campaign.status === 'DRAFT'
            ? 'No aparece en el sitio público.'
            : 'Visible en el sitio público.'}
        </span>
      </div>
      {error && <div style={{ marginBottom: 'var(--sp-2)' }}><Banner tone="error" title="Error">{error}</Banner></div>}
      <Select
        label="Cambiar estado"
        value={status}
        onChange={(e) => setStatus(e.target.value as CampaignStatus)}
        options={options}
      />
      {dirty && willHide && (
        <div style={{ marginTop: 'var(--sp-2)' }}>
          <Banner tone="warn" title="Se quitará del sitio público">
            Nadie podrá verla ni donar hasta que la vuelvas a publicar.
          </Banner>
        </div>
      )}
      <div style={{ marginTop: 'var(--sp-2)' }}>
        <Button icon="check" onClick={save} disabled={!dirty} loading={update.isPending}>
          Guardar estado
        </Button>
      </div>
    </Card>
  );
}

function Ajustes({ campaign, onEdit }: { campaign: Campaign; onEdit: () => void }) {
  const t = useT();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      <EstadoCampana campaign={campaign} />
      <Card>
        <div style={{ fontWeight: 'var(--fw-bold)', marginBottom: 'var(--sp-2)' }}>{t('camp.payInfo')}</div>
        <div style={{ fontSize: 'var(--fs-sm)', display: 'grid', gap: 4 }}>
          <div>{t('camp.yapeNumber')}: <strong>{campaign.yapeNumber || '—'}</strong></div>
          <div>{t('camp.bankName')}: <strong>{campaign.bankName || '—'}</strong></div>
          <div>{t('camp.bankAccount')}: <strong>{campaign.bankAccount || '—'}</strong></div>
          <div>{t('camp.accountHolder')}: <strong>{campaign.accountHolder || '—'}</strong></div>
        </div>
      </Card>
      <Button icon="settings" onClick={onEdit}>{t('camp.editCampaign')}</Button>
      <Colaboradores campaignId={campaign.id} />
    </div>
  );
}

/* ───────── Colaboradores: crear usuarios con rol y asignarlos a la campaña ───────── */
const COLLAB_ROLES: { value: string; label: string }[] = [
  { value: 'MANAGER', label: 'Gestor (opera la campaña)' },
  { value: 'REGISTRAR', label: 'Empadronador' },
  { value: 'VOLUNTEER', label: 'Voluntario' },
  { value: 'DONOR', label: 'Donante' },
];
function Colaboradores({ campaignId }: { campaignId: string }) {
  const t = useT();
  const toast = useToast();
  const { data: collaborators } = useCampaignCollaborators(campaignId);
  const addCollab = useAddCollaborator(campaignId);
  const removeCollab = useRemoveCollaborator(campaignId);
  const createUser = useCreateUser();
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ email: '', fullName: '', role: 'MANAGER', password: '', phone: '' });
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setError('');
    try {
      await fn();
      after?.();
      toast.success(t('toast.saved'));
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
        <div style={{ fontWeight: 'var(--fw-bold)' }}>{t('ops.collaborators')}</div>
        <Button size="sm" variant="subtle" icon="user" onClick={() => setCreating(true)}>{t('ops.createUser')}</Button>
      </div>
      <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>
        Los colaboradores pueden realizar todos los cambios de la campaña excepto Ajustes.
      </p>
      {error && <div style={{ marginBottom: 'var(--sp-2)' }}><Banner tone="error">{error}</Banner></div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(collaborators ?? []).length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>—</span>}
        {(collaborators ?? []).map((c) => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 'var(--fs-sm)' }}>
              <strong>{c.user.fullName}</strong>
              <span style={{ color: 'var(--text-muted)' }}> · {c.user.email} · <Badge tone="neutral">{c.user.role}</Badge></span>
            </div>
            <Button size="sm" variant="ghost" icon="close" aria-label={t('common.delete')} onClick={() => run(() => removeCollab.mutateAsync(c.userId))} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 'var(--sp-2)', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <Input label={t('ops.addCollaborator')} type="email" placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button size="sm" icon="plus" disabled={!email.includes('@')} loading={addCollab.isPending} onClick={() => run(() => addCollab.mutateAsync({ email: email.trim() }), () => setEmail(''))} />
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={t('ops.createUser')}
        footer={
          <>
            <Button variant="subtle" onClick={() => setCreating(false)}>{t('common.cancel')}</Button>
            <Button
              icon="plus"
              disabled={!draft.email.includes('@') || draft.fullName.trim().length < 2}
              loading={createUser.isPending || addCollab.isPending}
              onClick={() =>
                run(async () => {
                  await createUser.mutateAsync({
                    email: draft.email.trim(),
                    fullName: draft.fullName.trim(),
                    role: draft.role,
                    password: draft.password.trim() || undefined,
                    phone: draft.phone.trim() || undefined,
                  });
                  await addCollab.mutateAsync({ email: draft.email.trim() });
                }, () => { setCreating(false); setDraft({ email: '', fullName: '', role: 'MANAGER', password: '', phone: '' }); })
              }
            >
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          <Input label={t('census.fullName')} value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} autoFocus />
          <Input label={t('donate.email')} type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <Select label="Rol" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} options={COLLAB_ROLES} />
            <Input label={t('donate.phone')} type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          </div>
          <Input label="Contraseña (opcional)" type="password" hint="para que pueda iniciar sesión" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
        </div>
      </Modal>
    </Card>
  );
}

/* ───────── Helpers ───────── */
// Cantidad como texto: un input numérico con valor mínimo forzado no deja vaciar
// el campo, así que el usuario no podía borrar el 1 para escribir otra cifra.
function QtyInput({ value, onChange, label, width = 80 }: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  width?: number;
}) {
  return (
    <Input
      label={label}
      type="number"
      inputMode="numeric"
      min={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width }}
    />
  );
}

function AddNeedInline({ onAdd, label }: { onAdd: (title: string, qty: number, unit: string) => void; label: string }) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('');
  const parsed = Number(qty);
  const qtyValid = Number.isFinite(parsed) && parsed > 0;
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'flex-end' }}>
      <Input label={label} value={title} onChange={(e) => setTitle(e.target.value)} />
      <QtyInput value={qty} onChange={setQty} />
      <div style={{ width: 140 }}>
        <Select label={t('ops.unit')} placeholder={t('common.select')} value={unit} onChange={(e) => setUnit(e.target.value)} options={NEED_UNITS.map((u) => ({ value: u, label: u }))} />
      </div>
      <Button
        size="sm"
        icon="plus"
        disabled={!title.trim() || !qtyValid}
        onClick={() => { onAdd(title.trim(), parsed, unit); setTitle(''); setQty('1'); setUnit(''); }}
      />
    </div>
  );
}

// Miembros de brigada: se eligen entre los voluntarios inscritos en la campaña
// que aún no pertenecen a ninguna brigada.
function AddMemberInline({ onAdd, label, volunteers, loading }: {
  onAdd: (volunteerId: string, role: string) => void;
  label: string;
  volunteers: { value: string; label: string }[];
  loading?: boolean;
}) {
  const [volunteerId, setVolunteerId] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    // Si el voluntario elegido fue asignado a otra brigada, limpia la selección.
    if (volunteerId && !volunteers.some((v) => v.value === volunteerId)) setVolunteerId('');
  }, [volunteers, volunteerId]);

  if (volunteers.length === 0) {
    return (
      <p style={{ marginTop: 6, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
        No hay voluntarios inscritos sin brigada. Súmalos desde la pestaña Voluntarios.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'flex-end' }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <Select
          label={label}
          value={volunteerId}
          onChange={(e) => setVolunteerId(e.target.value)}
          options={[{ value: '', label: 'Elige un voluntario' }, ...volunteers]}
        />
      </div>
      <div style={{ width: 150 }}>
        <Select
          label="Rol"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={[{ value: '', label: 'Miembro' }, ...BRIGADE_ROLES.map((r) => ({ value: r, label: r }))]}
        />
      </div>
      <Button
        size="sm"
        icon="plus"
        disabled={!volunteerId}
        loading={loading}
        onClick={() => { onAdd(volunteerId, role.trim()); setVolunteerId(''); setRole(''); }}
      />
    </div>
  );
}
