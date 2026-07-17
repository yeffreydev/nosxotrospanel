import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Input,
  Select,
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
import { formatSoles, NEED_UNITS, CAMPAIGN_STATUS } from '../../lib/format';
import type {
  Severity,
  CampaignStatus,
  CampaignOperations,
  Campaign,
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
type TabKey = 'resumen' | 'zonas' | 'brigadas' | 'centros' | 'voluntarios' | 'donaciones' | 'beneficiarios' | 'ajustes';

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <strong>{z.name}</strong>
                  <Badge tone={SEV_TONE[z.severity]} dot>{t(`sev.${z.severity}`)}</Badge>
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
  openingHours: string;
  contactPhone: string;
  capacity: string;
}
const EMPTY_CENTER: CenterDraft = {
  name: '',
  address: '',
  openingHours: '',
  contactPhone: '',
  capacity: '',
};

function Centros({ id, ops }: { id?: string; ops: CampaignOperations }) {
  const t = useT();
  const toast = useToast();
  const createCenter = useCreateCenter();
  const updateCenter = useUpdateCenter();
  const [editing, setEditing] = useState<{ id?: string; draft: CenterDraft } | null>(null);
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
    const { id: centerId, draft } = editing;
    const capacity = Number(draft.capacity);
    const body: Partial<Center> = {
      name: draft.name.trim(),
      address: draft.address.trim(),
      openingHours: draft.openingHours.trim() || undefined,
      contactPhone: draft.contactPhone.trim() || undefined,
      ...(Number.isFinite(capacity) && capacity > 0 ? { capacity } : {}),
    };
    return run(
      () =>
        centerId
          ? updateCenter.mutateAsync({ id: centerId, body })
          : createCenter.mutateAsync({ ...body, campaignId: id, lat: 0, lng: 0 } as Partial<Center>),
      () => setEditing(null),
    );
  };

  const draft = editing?.draft ?? EMPTY_CENTER;
  const setDraft = (patch: Partial<CenterDraft>) =>
    setEditing((prev) => (prev ? { ...prev, draft: { ...prev.draft, ...patch } } : prev));

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
            onEdit={() =>
              setEditing({
                id: c.id,
                draft: {
                  name: c.name,
                  address: c.address ?? '',
                  openingHours: c.openingHours ?? '',
                  contactPhone: c.contactPhone ?? '',
                  capacity: c.capacity ? String(c.capacity) : '',
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

function CenterCard({ center: c, zones, campaignId, onEdit }: { center: Center; zones: Zone[]; campaignId?: string; onEdit: () => void }) {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const { data: center } = useCenter(open ? c.id : undefined);
  const { data: categories } = useCategories();
  const createItem = useCreateInventoryItem();
  const createCategory = useCreateCategory();
  const [iName, setIName] = useState('');
  const [iCat, setICat] = useState('');
  // Cantidad como texto: así se puede borrar el número y volver a escribirlo.
  const [iQty, setIQty] = useState('1');
  const [newCat, setNewCat] = useState('');
  const [error, setError] = useState('');
  const [dispatchItem, setDispatchItem] = useState<{ id: string; name: string; quantity: number; unit?: string } | null>(null);

  const doPrint = () => window.print();
  const qty = Number(iQty);
  const qtyValid = Number.isFinite(qty) && qty > 0;

  const addItem = async () => {
    if (!iName.trim() || !iCat || !qtyValid) return;
    setError('');
    try {
      await createItem.mutateAsync({ centerId: c.id, body: { name: iName.trim(), categoryId: iCat, quantity: qty } });
      toast.success(t('toast.saved'));
      setIName('');
      setIQty('1');
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const addCategory = async () => {
    const name = newCat.trim();
    if (!name) return;
    setError('');
    try {
      const created = await createCategory.mutateAsync({ name });
      setICat(created.id);
      setNewCat('');
      toast.success(t('toast.saved'));
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
        <div>
          <strong>{c.name}</strong>
          {c.address && <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{c.address}</div>}
          {c.openingHours && <div style={{ fontSize: 'var(--fs-sm)' }}><Icon name="clock" size={14} /> {c.openingHours}</div>}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Badge tone="neutral">{c.loadPct ?? 0}%</Badge>
          <Button size="sm" variant="ghost" icon="settings" aria-label={t('common.edit')} onClick={onEdit} />
          <Button size="sm" variant="ghost" icon={open ? 'chevronDown' : 'box'} onClick={() => setOpen((v) => !v)}>
            {t('mgr.inventory')}
          </Button>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 'var(--sp-3)' }}>
          <div className="nx-print-area">
            <h3 style={{ fontSize: 'var(--fs-md)', marginBottom: 'var(--sp-2)' }}>{c.name} — {t('mgr.inventory')}</h3>
            {(center?.inventoryByCategory ?? []).length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{t('common.empty')}</p>
            )}
            {(center?.inventoryByCategory ?? []).map((g) => (
              <div key={g.categoryId} style={{ marginBottom: 'var(--sp-2)' }}>
                <div style={{ fontWeight: 'var(--fw-bold)', fontSize: 'var(--fs-sm)' }}>{g.category} · {g.totalQuantity}</div>
                {g.items.map((it) => (
                  <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
                    <span style={{ flex: 1 }}>{it.name}</span>
                    <span>{it.quantity}{it.unit ? ` ${it.unit}` : ''}</span>
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
          <Button size="sm" variant="subtle" icon="download" onClick={doPrint} style={{ marginTop: 'var(--sp-2)' }}>
            {t('mgr.printInventory')}
          </Button>

          {error && <div style={{ marginTop: 'var(--sp-2)' }}><Banner tone="error">{error}</Banner></div>}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: 6, marginTop: 'var(--sp-3)', alignItems: 'flex-end' }}>
            <Input label="Ítem" placeholder="Arroz 5 kg" value={iName} onChange={(e) => setIName(e.target.value)} />
            <Select
              label="Categoría"
              value={iCat}
              onChange={(e) => setICat(e.target.value)}
              options={[{ value: '', label: 'Elige una categoría' }, ...(categories ?? []).map((cat) => ({ value: cat.id, label: cat.name }))]}
            />
            <QtyInput label="Cantidad" value={iQty} onChange={setIQty} />
            <Button size="sm" icon="plus" disabled={!iName.trim() || !iCat || !qtyValid} loading={createItem.isPending} onClick={addItem} />
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'flex-end' }}>
            <Input
              label="Nueva categoría"
              hint="si la que necesitas no está"
              placeholder="Herramientas"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
            />
            <Button size="sm" variant="subtle" icon="plus" disabled={!newCat.trim()} loading={createCategory.isPending} onClick={addCategory}>
              Crear
            </Button>
          </div>
        </div>
      )}

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
  const [zoneId, setZoneId] = useState('');
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [error, setError] = useState('');
  const n = Number(qty);
  const valid = Number.isFinite(n) && n > 0 && n <= item.quantity;

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
        </div>
        <QtyInput label={t('donate.quantity')} value={qty} onChange={setQty} width={120} />
        <Select
          label={`${t('ops.zones')} (${t('common.optional')})`}
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
          options={[{ value: '', label: '—' }, ...zones.map((z) => ({ value: z.id, label: z.name }))]}
        />
        <Select
          label={`${t('nav.beneficiaries')} (${t('common.optional')})`}
          value={beneficiaryId}
          onChange={(e) => setBeneficiaryId(e.target.value)}
          options={[{ value: '', label: '—' }, ...(beneficiaries ?? []).map((b) => ({ value: b.id, label: `${b.fullName} · ${b.docNumber}` }))]}
        />
        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
          {beneficiaryId ? 'Se entregará al beneficiario (queda entregado).' : 'Sin beneficiario queda asignado a la zona.'}
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 'var(--sp-3)' }}>
        <Button variant="subtle" icon="plus" onClick={() => setCreateDraft({ fullName: '', phone: '', availability: '' })}>{t('ops.newVolunteer')}</Button>
        <Button icon="mail" onClick={() => setOpen(true)}>Agregar por correo</Button>
      </div>
      {error && <div style={{ marginBottom: 'var(--sp-3)' }}><Banner tone="error">{error}</Banner></div>}

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
  const addSchedule = useAddVolunteerSchedule();
  const { data: schedules } = useVolunteerSchedules(volunteerId);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('13:00');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    try {
      await addSchedule.mutateAsync({
        volunteerId,
        body: {
          startTime,
          endTime,
          date: date || undefined,
          note: note.trim() || undefined,
          campaignId,
        },
      });
      toast.success(t('toast.saved'));
      setNote('');
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${t('ops.registerVolunteer')}: ${name}`}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>{t('common.close')}</Button>
          <Button icon="plus" disabled={!startTime || !endTime} loading={addSchedule.isPending} onClick={submit}>{t('common.add')}</Button>
        </>
      }
    >
      {error && <div style={{ marginBottom: 'var(--sp-2)' }}><Banner tone="error">{error}</Banner></div>}
      <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        <Input label={t('common.date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <Input label={t('shift.start')} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <Input label={t('shift.end')} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <Input label={t('common.note')} value={note} onChange={(e) => setNote(e.target.value)} />
        {(schedules ?? []).length > 0 && (
          <div style={{ marginTop: 'var(--sp-2)' }}>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>{t('ops.registerVolunteer')}</div>
            {(schedules ?? []).map((s) => (
              <div key={s.id} style={{ fontSize: 'var(--fs-sm)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{s.date ? new Date(s.date).toLocaleDateString() : '—'} · {s.startTime}–{s.endTime}</span>
                <span style={{ color: 'var(--text-muted)' }}>{s.note ?? ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
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
