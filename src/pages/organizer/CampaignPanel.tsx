import { useEffect, useState, type CSSProperties } from 'react';
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
  Checkbox,
  CenteredSpinner,
  ProgressBar,
  ImageUpload,
  useToast,
  type BadgeTone,
  type IconName,
} from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';
import { AvailabilityEditor } from '../../components/AvailabilityEditor';
import { CentersSummary } from '../../components/CentersSummary';
import { DonationReceiptModal, type ReceiptData } from '../../components/DonationReceipt';
import { useAuth } from '../../store/auth';
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
  useConfirmPayment,
  useUpdateDonationStatus,
  useBeneficiaries,
  useCreateBeneficiary,
  useUpdateBeneficiary,
  useDeleteBeneficiary,
  useDispatchCenterItem,
  useTransferCenterItems,
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
type TabKey = 'resumen' | 'zonas' | 'centros' | 'beneficiarios' | 'ajustes';

/* Dos secciones lado a lado dentro de una pestaña; en angosto se apilan. */
const TWO_COLS: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
  gap: 'var(--sp-4)',
  alignItems: 'start',
};

function SectionTitle({ icon, label }: { icon: IconName; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)', minHeight: 40 }}>
      <Icon name={icon} size={18} />
      <strong style={{ fontSize: 'var(--fs-base)' }}>{label}</strong>
    </div>
  );
}

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
    // 1080 en vez de 820: la pestaña de acopio pone centros y donaciones lado
    // a lado y necesita el ancho; el resto de pestañas siguen siendo una columna.
    <div className="n-page" style={{ maxWidth: 1080, margin: '0 auto' }}>
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
            { value: 'resumen', label: 'Indicadores y metas', icon: 'chart' },
            { value: 'zonas', label: 'Zonas, equipos y voluntarios', icon: 'pin' },
            { value: 'centros', label: 'Acopio y donaciones', icon: 'box' },
            { value: 'beneficiarios', label: t('nav.beneficiaries'), icon: 'users' },
            { value: 'ajustes', label: t('nav.settings'), icon: 'settings' },
          ]}
        />
      </div>

      {/* Indicadores clave y metas de la campaña, lado a lado. */}
      {tab === 'resumen' && (
        <div style={TWO_COLS}>
          <div style={{ minWidth: 0 }}>
            <SectionTitle icon="chart" label={t('mgr.kpis')} />
            <Resumen campaign={campaign} ops={ops} />
          </div>
          <div style={{ minWidth: 0 }}>
            <SectionTitle icon="trophy" label="Metas" />
            <Metas campaign={campaign} ops={ops} />
          </div>
        </div>
      )}
      {/* Zonas con sus equipos a la izquierda; el padrón de voluntarios al lado. */}
      {tab === 'zonas' && (
        <div style={TWO_COLS}>
          <div style={{ minWidth: 0 }}>
            <SectionTitle icon="pin" label="Zonas y equipos" />
            <Zonas id={id} ops={ops} />
          </div>
          <div style={{ minWidth: 0 }}>
            <SectionTitle icon="users" label={t('nav.volunteers')} />
            <Voluntarios id={id} />
          </div>
        </div>
      )}
      {tab === 'centros' && <Centros id={id} ops={ops} />}
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
  // Los equipos (brigadas) y sus voluntarios se organizan aquí, dentro de
  // cada zona: una brigada trabaja EN una zona, así que se gestiona en ella.
  const brigadesQ = useCampaignBrigades(id);
  const volunteersQ = useCampaignVolunteers(id);
  const createBrigade = useCreateBrigade(id);
  const updateBrigade = useUpdateBrigade(id);
  const deleteBrigade = useDeleteBrigade(id);
  const addMember = useAddBrigadeMember(id);
  const removeMember = useRemoveBrigadeMember(id);
  // null = cerrado; sin `id` = alta; con `id` = edición.
  const [editing, setEditing] = useState<{ id?: string; draft: ZoneDraft } | null>(null);
  const [toDelete, setToDelete] = useState<Zone | null>(null);
  const [details, setDetails] = useState<Zone | null>(null);
  const [brigadeEditing, setBrigadeEditing] = useState<{ id?: string; draft: BrigadeDraft } | null>(null);
  const [brigadeToDelete, setBrigadeToDelete] = useState<Brigade | null>(null);
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

  const brigades = brigadesQ.data ?? [];
  const volunteers = volunteersQ.data ?? [];
  // Elegibles para un equipo: inscritos con cuenta y todavía sin brigada.
  const freeVolunteers = volunteers
    .filter((v) => !v.brigade && v.volunteerId)
    .map((v) => ({ value: v.volunteerId!, label: v.fullName }));
  const unassignedBrigades = brigades.filter((b) => !b.zoneId);

  const saveBrigade = () => {
    if (!brigadeEditing) return;
    const { id: brigadeId, draft: bd } = brigadeEditing;
    const body = {
      name: bd.name.trim(),
      zoneId: bd.zoneId || undefined,
      meetingPoint: bd.meetingPoint.trim() || undefined,
      meetingPointMapUrl: bd.meetingPointMapUrl.trim() || undefined,
      contactPhone: bd.contactPhone.trim() || undefined,
    };
    return run(
      () => (brigadeId ? updateBrigade.mutateAsync({ id: brigadeId, body }) : createBrigade.mutateAsync(body)),
      () => setBrigadeEditing(null),
    );
  };
  const brigadeDraft = brigadeEditing?.draft ?? EMPTY_BRIGADE;
  const setBrigadeDraft = (patch: Partial<BrigadeDraft>) =>
    setBrigadeEditing((prev) => (prev ? { ...prev, draft: { ...prev.draft, ...patch } } : prev));
  const editBrigade = (b: Brigade) =>
    setBrigadeEditing({
      id: b.id,
      draft: {
        name: b.name,
        zoneId: b.zoneId ?? '',
        meetingPoint: b.meetingPoint ?? '',
        meetingPointMapUrl: b.meetingPointMapUrl ?? '',
        contactPhone: b.contactPhone ?? '',
      },
    });
  // Mover un equipo de zona sin abrir el modal: es la acción más frecuente.
  // '' = quitar de la zona (el backend recibe null y la deja sin zona).
  const moveBrigade = (b: Brigade, zoneId: string) =>
    run(() => updateBrigade.mutateAsync({ id: b.id, body: { zoneId: zoneId || null } }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 'var(--sp-3)' }}>
        <Button variant="subtle" icon="users" onClick={() => setBrigadeEditing({ draft: EMPTY_BRIGADE })}>
          {t('ops.newBrigade')}
        </Button>
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
            {/* Equipos (brigadas) que trabajan esta zona, con sus voluntarios:
                se crean, se traen de otra zona y se arman aquí mismo. */}
            <div style={{ marginTop: 'var(--sp-3)', borderTop: '1px solid var(--line)', paddingTop: 'var(--sp-2)' }}>
              {(() => {
                const zoneBrigades = brigades.filter((b) => b.zoneId === z.id);
                const people = zoneBrigades.reduce((s, b) => s + (b.members?.length ?? 0), 0);
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                      <Icon name="users" size={14} />
                      <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)' }}>
                        Equipos de la zona
                      </span>
                      <Badge tone="neutral">{zoneBrigades.length} equipo{zoneBrigades.length === 1 ? '' : 's'}</Badge>
                      <Badge tone="info">{people} voluntario{people === 1 ? '' : 's'}</Badge>
                      <div style={{ flex: 1 }} />
                      <Button
                        size="sm"
                        variant="subtle"
                        icon="plus"
                        onClick={() => setBrigadeEditing({ draft: { ...EMPTY_BRIGADE, zoneId: z.id } })}
                      >
                        Nuevo equipo
                      </Button>
                    </div>
                    {zoneBrigades.length === 0 && (
                      <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
                        Sin equipos todavía: crea uno con «Nuevo equipo» o asigna uno desde «Equipos sin zona».
                      </p>
                    )}
                    {zoneBrigades.map((b) => (
                      <BrigadeBlock
                        key={b.id}
                        brigade={b}
                        zones={ops.zones}
                        freeVolunteers={freeVolunteers}
                        addPending={addMember.isPending}
                        onEdit={() => editBrigade(b)}
                        onDelete={() => setBrigadeToDelete(b)}
                        onMove={(zid) => moveBrigade(b, zid)}
                        onAddMember={(volunteerId, role) =>
                          run(() => addMember.mutateAsync({ brigadeId: b.id, body: { volunteerId, role: role || undefined } }))
                        }
                        onRemoveMember={(memberId) => run(() => removeMember.mutateAsync({ brigadeId: b.id, memberId }))}
                      />
                    ))}
                  </>
                );
              })()}
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

      {/* Equipos que aún no trabajan ninguna zona: se asignan desde aquí. */}
      {unassignedBrigades.length > 0 && (
        <Card style={{ marginTop: 'var(--sp-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Icon name="users" size={16} />
            <strong>Equipos sin zona</strong>
            <Badge tone="warn">{unassignedBrigades.length}</Badge>
          </div>
          <p style={{ margin: '0 0 4px', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            Asigna cada equipo a la zona donde va a trabajar con el selector «Zona».
          </p>
          {unassignedBrigades.map((b) => (
            <BrigadeBlock
              key={b.id}
              brigade={b}
              zones={ops.zones}
              freeVolunteers={freeVolunteers}
              addPending={addMember.isPending}
              onEdit={() => editBrigade(b)}
              onDelete={() => setBrigadeToDelete(b)}
              onMove={(zid) => moveBrigade(b, zid)}
              onAddMember={(volunteerId, role) =>
                run(() => addMember.mutateAsync({ brigadeId: b.id, body: { volunteerId, role: role || undefined } }))
              }
              onRemoveMember={(memberId) => run(() => removeMember.mutateAsync({ brigadeId: b.id, memberId }))}
            />
          ))}
        </Card>
      )}

      {/* Voluntarios inscritos que aún no están en ningún equipo. */}
      {freeVolunteers.length > 0 && (
        <Card style={{ marginTop: 'var(--sp-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Icon name="user" size={16} />
            <strong>Voluntarios sin equipo</strong>
            <Badge tone="neutral">{freeVolunteers.length}</Badge>
          </div>
          <p style={{ margin: '0 0 var(--sp-2)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            Súmalos a un equipo y quedarán organizados en la zona de ese equipo.
          </p>
          {brigades.length === 0 ? (
            <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
              Primero crea un equipo (botón «{t('ops.newBrigade')}» arriba).
            </p>
          ) : (
            freeVolunteers.map((v) => (
              <div
                key={v.value}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderTop: '1px dashed var(--line)', flexWrap: 'wrap' }}
              >
                <span style={{ flex: 1, minWidth: 140, fontSize: 'var(--fs-sm)' }}>{v.label}</span>
                <div style={{ minWidth: 220 }}>
                  <Select
                    aria-label={`Asignar a ${v.label} a un equipo`}
                    value=""
                    disabled={addMember.isPending}
                    onChange={(e) => {
                      const brigadeId = e.target.value;
                      if (brigadeId) run(() => addMember.mutateAsync({ brigadeId, body: { volunteerId: v.value } }));
                    }}
                    options={[
                      { value: '', label: 'Elige un equipo…' },
                      ...brigades.map((b) => ({
                        value: b.id,
                        label: `${b.name} · ${b.zone?.name ?? 'sin zona'}`,
                      })),
                    ]}
                  />
                </div>
              </div>
            ))
          )}
        </Card>
      )}

      {/* Alta / edición de un equipo (brigada). */}
      <Modal
        open={!!brigadeEditing}
        onClose={() => setBrigadeEditing(null)}
        title={brigadeEditing?.id ? t('common.edit') : t('ops.newBrigade')}
        footer={
          <>
            <Button variant="subtle" onClick={() => setBrigadeEditing(null)}>{t('common.cancel')}</Button>
            <Button
              icon={brigadeEditing?.id ? 'check' : 'plus'}
              disabled={!brigadeDraft.name.trim()}
              loading={createBrigade.isPending || updateBrigade.isPending}
              onClick={saveBrigade}
            >
              {brigadeEditing?.id ? t('common.save') : t('common.create')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          <Input label={t('ops.brigadeName')} value={brigadeDraft.name} onChange={(e) => setBrigadeDraft({ name: e.target.value })} autoFocus />
          <Select
            label={t('ops.assignZone')}
            value={brigadeDraft.zoneId}
            onChange={(e) => setBrigadeDraft({ zoneId: e.target.value })}
            options={[{ value: '', label: 'Sin zona' }, ...ops.zones.map((z) => ({ value: z.id, label: z.name }))]}
          />
          <Input label={t('ops.meetingPoint')} value={brigadeDraft.meetingPoint} onChange={(e) => setBrigadeDraft({ meetingPoint: e.target.value })} />
          <Input label={t('ops.mapUrl')} value={brigadeDraft.meetingPointMapUrl} onChange={(e) => setBrigadeDraft({ meetingPointMapUrl: e.target.value })} placeholder="https://maps.google.com/?q=..." />
          <Input label={t('ops.contactPhone')} type="tel" value={brigadeDraft.contactPhone} onChange={(e) => setBrigadeDraft({ contactPhone: e.target.value })} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!brigadeToDelete}
        danger
        title={`${t('common.delete')}: ${brigadeToDelete?.name ?? ''}`}
        message="Se eliminará el equipo; sus miembros quedarán sin equipo."
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleteBrigade.isPending}
        onCancel={() => setBrigadeToDelete(null)}
        onConfirm={() => run(() => deleteBrigade.mutateAsync(brigadeToDelete!.id), () => setBrigadeToDelete(null))}
      />

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

/**
 * Un equipo (brigada) tal como se ve dentro de la vista de zonas: cabecera con
 * líder y datos de encuentro, selector para moverlo de zona, y sus voluntarios
 * con alta y baja en línea.
 */
function BrigadeBlock({ brigade: b, zones, freeVolunteers, addPending, onEdit, onDelete, onMove, onAddMember, onRemoveMember }: {
  brigade: Brigade;
  zones: Zone[];
  freeVolunteers: { value: string; label: string }[];
  addPending?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (zoneId: string) => void;
  onAddMember: (volunteerId: string, role: string) => void;
  onRemoveMember: (memberId: string) => void;
}) {
  const t = useT();
  const toast = useToast();
  const lead = (b.members ?? []).find((m) => isLeaderRole(m.role));
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3)', marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <strong>{b.name}</strong>
          {lead && (
            <div style={{ fontSize: 'var(--fs-sm)' }}>
              👑 {t('ops.leader')}: {lead.volunteer?.user?.fullName ?? lead.user?.fullName ?? '—'}
            </div>
          )}
          {b.meetingPoint && <div style={{ fontSize: 'var(--fs-sm)' }}>📍 {b.meetingPoint}</div>}
          {b.contactPhone && <div style={{ fontSize: 'var(--fs-sm)' }}>📞 {b.contactPhone}</div>}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Mover el equipo de zona sin abrir el modal. */}
          <div style={{ width: 170 }}>
            <Select
              aria-label={`Zona de ${b.name}`}
              label="Zona"
              value={b.zoneId ?? ''}
              onChange={(e) => {
                if ((b.zoneId ?? '') !== e.target.value) onMove(e.target.value);
              }}
              options={[{ value: '', label: 'Sin zona' }, ...zones.map((z) => ({ value: z.id, label: z.name }))]}
            />
          </div>
          {b.meetingPointMapUrl && (
            <Button size="sm" variant="ghost" icon="share" onClick={() => shareUrl(b.meetingPointMapUrl, toast, t('common.copied'))} aria-label={t('ops.shareBrigade')} />
          )}
          <Button size="sm" variant="ghost" icon="settings" aria-label={t('common.edit')} onClick={onEdit} />
          <Button size="sm" variant="ghost" icon="close" aria-label={t('common.delete')} onClick={onDelete} />
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
                <button
                  type="button"
                  aria-label="Quitar del equipo"
                  style={{ marginLeft: 6, cursor: 'pointer', background: 'none', border: 'none' }}
                  onClick={() => onRemoveMember(m.id)}
                >
                  ×
                </button>
              </Badge>
            ))}
          {(b.members ?? []).length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>—</span>}
        </div>
        <AddMemberInline label={t('ops.addMember')} volunteers={freeVolunteers} loading={addPending} onAdd={onAddMember} />
      </div>
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
  /** Almacén central: consolida lo recaudado y es el único que despacha. */
  isCentral: boolean;
  /** Si el central además acopia (recibe donaciones y aparece en público). */
  acceptsDonations: boolean;
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
  isCentral: false,
  acceptsDonations: true,
};

// Selector de horario: guarda el mismo formato de texto libre que ya usa el
// backend ("Lun-Vie 8:00-18:00"), solo cambia cómo el organizador lo arma.
const OPENING_DAYS = [
  { code: 'Lun', label: 'Lun' },
  { code: 'Mar', label: 'Mar' },
  { code: 'Mie', label: 'Mié' },
  { code: 'Jue', label: 'Jue' },
  { code: 'Vie', label: 'Vie' },
  { code: 'Sab', label: 'Sáb' },
  { code: 'Dom', label: 'Dom' },
];
const OPENING_TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const value = `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`;
  return { value, label: value };
});
function parseOpeningHours(raw: string): { days: string[]; start: string; end: string } | null {
  const m = raw.trim().match(/^([A-Za-zÁáÉéÍíÓóÚúñÑ,\s-]+?)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (!m) return null;
  const [, dayPart, start, end] = m;
  const codes = OPENING_DAYS.map((d) => d.code);
  const norm = (s: string) => s.trim().replace(/é/gi, 'e').replace(/á/gi, 'a');
  let days: string[] = [];
  const rangeMatch = dayPart.match(/^(\S+)\s*-\s*(\S+)$/);
  if (rangeMatch) {
    const i1 = codes.findIndex((c) => c.toLowerCase() === norm(rangeMatch[1]).toLowerCase());
    const i2 = codes.findIndex((c) => c.toLowerCase() === norm(rangeMatch[2]).toLowerCase());
    if (i1 >= 0 && i2 >= 0 && i2 >= i1) days = codes.slice(i1, i2 + 1);
  } else {
    days = dayPart
      .split(',')
      .map((s) => norm(s))
      .map((s) => codes.find((c) => c.toLowerCase() === s.toLowerCase()))
      .filter((c): c is string => !!c);
  }
  if (!days.length) return null;
  return { days, start, end };
}
function serializeOpeningHours(days: string[], start: string, end: string): string {
  if (!days.length) return '';
  const codes = OPENING_DAYS.map((d) => d.code);
  const idxs = days.map((d) => codes.indexOf(d)).sort((a, b) => a - b);
  const contiguous = idxs.every((v, i) => i === 0 || v === idxs[i - 1] + 1);
  const dayStr =
    contiguous && idxs.length > 1
      ? `${codes[idxs[0]]}-${codes[idxs[idxs.length - 1]]}`
      : idxs.map((i) => codes[i]).join(', ');
  return `${dayStr} ${start}-${end}`;
}
function OpeningHoursPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = parseOpeningHours(value) ?? { days: [] as string[], start: '08:00', end: '18:00' };
  const toggleDay = (code: string) => {
    const days = parsed.days.includes(code) ? parsed.days.filter((d) => d !== code) : [...parsed.days, code];
    onChange(serializeOpeningHours(days, parsed.start, parsed.end));
  };
  return (
    <div>
      <label style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, marginBottom: 4, display: 'block' }}>
        Horario de atención <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span>
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {OPENING_DAYS.map((d) => (
          <Chip key={d.code} active={parsed.days.includes(d.code)} onClick={() => toggleDay(d.code)}>
            {d.label}
          </Chip>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'center' }}>
        <Select
          options={OPENING_TIME_OPTIONS}
          value={parsed.start}
          disabled={!parsed.days.length}
          onChange={(e) => onChange(serializeOpeningHours(parsed.days, e.target.value, parsed.end))}
        />
        <span style={{ color: 'var(--text-muted)' }}>a</span>
        <Select
          options={OPENING_TIME_OPTIONS}
          value={parsed.end}
          disabled={!parsed.days.length}
          onChange={(e) => onChange(serializeOpeningHours(parsed.days, parsed.start, e.target.value))}
        />
      </div>
      {value && !parsed.days.length && (
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
          Horario actual: "{value}". Elige días para reemplazarlo con el selector.
        </span>
      )}
    </div>
  );
}

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
      isCentral: draft.isCentral,
      acceptsDonations: draft.isCentral ? draft.acceptsDonations : true,
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

  // Almacén central de la campaña (máximo uno): consolida lo recaudado.
  const central = ops.centers.find((c) => c.isCentral);

  return (
    <div>
      {/* Resumen de la campaña: cuánto hay de cada producto entre todos los
          centros, separando acopio de almacén central y contra la meta. */}
      <CentersSummary campaignId={id} />
      {/* Centros a la izquierda, donaciones al lado: lo que entra por un
          acopio aparece de inmediato en la lista de la derecha. En pantallas
          angostas las columnas se apilan. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 'var(--sp-4)',
          alignItems: 'start',
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--sp-3)' }}>
            <Button icon="plus" onClick={() => setEditing({ draft: EMPTY_CENTER })}>{t('ops.newCenter')}</Button>
          </div>
          {error && <div style={{ marginBottom: 'var(--sp-3)' }}><Banner tone="error">{error}</Banner></div>}
          {ops.centers.length === 0 && <p style={{ color: 'var(--text-muted)' }}>{t('ops.noCenters')}</p>}
          {central && ops.centers.length > 1 && (
            <div style={{ marginBottom: 'var(--sp-3)' }}>
              <Banner tone="info">
                Con almacén central, los centros de acopio le transfieren lo
                recaudado y las entregas a beneficiarios salen solo de «{central.name}».
              </Banner>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {ops.centers.map((c) => (
              <CenterCard
                key={c.id}
                center={c}
                central={central ?? null}
                zones={ops.zones}
                campaignId={id}
                campaignTitle={ops.campaign.title}
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
                      isCentral: !!c.isCentral,
                      acceptsDonations: c.acceptsDonations !== false,
                    },
                  })
                }
              />
            ))}
          </div>
        </div>
        <Donaciones id={id} ops={ops} />
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
          <OpeningHoursPicker value={draft.openingHours} onChange={(v) => setDraft({ openingHours: v })} />
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
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--sp-2)', display: 'grid', gap: 6 }}>
            <Checkbox checked={draft.isCentral} onChange={(v) => setDraft({ isCentral: v })}>
              Almacén central de la campaña
            </Checkbox>
            {draft.isCentral && (
              <>
                <Checkbox
                  checked={draft.acceptsDonations}
                  onChange={(v) => setDraft({ acceptsDonations: v })}
                >
                  También recibe donaciones (aparece al público como centro de acopio)
                </Checkbox>
                <p style={{ margin: 0, fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                  Los centros de acopio le transfieren lo recaudado y las
                  entregas a beneficiarios salen solo de aquí.
                  {!draft.acceptsDonations &&
                    ' Como no recibe donaciones, es bodega interna: no se muestra a los donantes.'}
                </p>
              </>
            )}
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

function CenterCard({ center: c, central, zones, campaignId, campaignTitle, suggestions, onEdit }: {
  center: Center;
  /** Almacén central de la campaña, si existe. */
  central: Center | null;
  zones: Zone[];
  campaignId?: string;
  campaignTitle?: string;
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
  // Quién trae la donación. El flujo por defecto ES una donación (con datos
  // del donante para su comprobante); "Anónima" la registra sin datos y
  // "Sin donante" queda para ingresos internos (compras, ajustes) que no
  // generan donación ni comprobante.
  const [donorMode, setDonorMode] = useState<'NONE' | 'NAMED' | 'ANON'>('NAMED');
  const [donor, setDonor] = useState({ name: '', phone: '', email: '' });
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const me = useAuth((st) => st.user);
  const [showMore, setShowMore] = useState(false);
  const [newCat, setNewCat] = useState<{ name: string; unit: string; kind: CategoryKind } | null>(null);
  const [editing, setEditing] = useState<(ItemDraft & { id: string }) | null>(null);
  const [error, setError] = useState('');
  const [dispatchItem, setDispatchItem] = useState<{ id: string; name: string; quantity: number; unit?: string } | null>(null);
  // Con almacén central, este centro no despacha: transfiere lo recaudado.
  const mustTransfer = !!central && !c.isCentral;
  const [transferItem, setTransferItem] = useState<
    { id: string; name: string; quantity: number; unit?: string } | 'ALL' | null
  >(null);

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

  const donorReady = donorMode !== 'NAMED' || !!donor.name.trim();

  const addItem = async () => {
    if (!item.name.trim() || !item.categoryId || !qtyValid || !donorReady) return;
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
          ...(donorMode === 'ANON' ? { donorAnonymous: true } : {}),
          ...(donorMode === 'NAMED'
            ? {
                donorName: donor.name.trim(),
                donorPhone: donor.phone.trim() || undefined,
                donorEmail: donor.email.trim() || undefined,
              }
            : {}),
        },
      });
      toast.success(
        saved.merged
          ? `Sumado: ${saved.name} ahora tiene ${saved.quantity} ${saved.unit ?? ''}`.trim()
          : t('toast.saved'),
      );
      // Donación registrada: se abre el comprobante listo para imprimir.
      if (saved.donation) {
        setReceipt({
          code: saved.donation.code,
          date: new Date().toISOString(),
          centerName: c.name,
          centerAddress: c.address,
          campaignTitle,
          itemName: item.name.trim(),
          quantity: qty,
          unit,
          anonymous: donorMode === 'ANON',
          donorName: donorMode === 'NAMED' ? donor.name.trim() : null,
          donorPhone: donorMode === 'NAMED' ? donor.phone.trim() || null : null,
          donorEmail: donorMode === 'NAMED' ? donor.email.trim() || null : null,
          receivedBy: me?.fullName ?? null,
        });
      }
      // Se conservan categoría y unidad: normalmente se ingresan varios
      // productos parecidos seguidos. El donante se limpia: es por entrega.
      setItem((d) => ({ ...d, name: '', quantity: '1', expiresAt: '', note: '' }));
      setDonorMode('NAMED');
      setDonor({ name: '', phone: '', email: '' });
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
            {c.isCentral && (
              <span style={{ marginLeft: 6, display: 'inline-flex', gap: 4 }}>
                <Badge tone="success">Almacén central</Badge>
                {c.acceptsDonations === false && <Badge tone="neutral">interno · no público</Badge>}
              </span>
            )}
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
                      aria-label={mustTransfer ? 'Transferir al almacén central' : t('ops.dispatch')}
                      onClick={() =>
                        mustTransfer
                          ? setTransferItem({ id: it.id, name: it.name, quantity: it.quantity, unit: it.unit })
                          : setDispatchItem({ id: it.id, name: it.name, quantity: it.quantity, unit: it.unit })
                      }
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
            {mustTransfer && inventory.some((g) => g.items.some((it) => it.quantity > 0)) && (
              <Button size="sm" icon="truck" onClick={() => setTransferItem('ALL')}>
                Transferir todo al central
              </Button>
            )}
          </div>
          {mustTransfer && (
            <p style={{ margin: '6px 0 0', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
              Lo recaudado se transfiere al almacén central «{central?.name}»;
              las entregas a beneficiarios salen desde ahí.
            </p>
          )}

          {showMovements && (
            <div style={{ marginTop: 'var(--sp-2)', borderTop: '1px solid var(--line)', paddingTop: 'var(--sp-2)' }}>
              {(movements ?? []).length === 0 && (
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{t('common.empty')}</span>
              )}
              {(movements ?? []).map((m) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)' }}>
                  <span>
                    <Badge tone={m.type === 'IN' || m.type === 'TRANSFER_IN' ? 'success' : m.type === 'ADJUST' ? 'neutral' : 'warn'}>
                      {m.type === 'IN'
                        ? 'Entrada'
                        : m.type === 'OUT'
                          ? 'Salida'
                          : m.type === 'TRANSFER_IN'
                            ? 'Transferencia recibida'
                            : m.type === 'TRANSFER_OUT'
                              ? 'Transferencia enviada'
                              : 'Ajuste'}
                    </Badge>{' '}
                    {m.item?.name ?? '—'} · {m.quantity}{m.item?.unit ? ` ${m.item.unit}` : ''}
                    {m.donation && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        {' '}· {m.donation.anonymous ? 'donante anónimo' : `donó ${m.donation.donorName ?? '—'}`}
                      </span>
                    )}
                  </span>
                  <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {formatDateTime(m.createdAt)}{m.user ? ` · ${m.user.fullName}` : ''}
                    {m.donation && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="download"
                        aria-label="Imprimir comprobante"
                        onClick={() =>
                          setReceipt({
                            code: m.donation!.code,
                            date: m.createdAt,
                            centerName: c.name,
                            centerAddress: c.address,
                            campaignTitle,
                            itemName: m.item?.name ?? 'Donación en especie',
                            quantity: m.quantity,
                            unit: m.item?.unit,
                            anonymous: m.donation!.anonymous,
                            donorName: m.donation!.donorName,
                            donorPhone: m.donation!.donorPhone,
                            donorEmail: m.donation!.donorEmail,
                            receivedBy: m.user?.fullName ?? null,
                          })
                        }
                      />
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {error && <div style={{ marginTop: 'var(--sp-2)' }}><Banner tone="error">{error}</Banner></div>}

          {/* Agregar donación: qué producto entra + quién lo dona. Es el alta
              de inventario del centro; con donante crea además la donación. */}
          <div style={{ marginTop: 'var(--sp-3)', borderTop: '1px solid var(--line)', paddingTop: 'var(--sp-3)' }}>
            <div style={{ fontWeight: 'var(--fw-bold)', fontSize: 'var(--fs-sm)', marginBottom: 6 }}>
              Agregar donación
            </div>
            {/* Política de plataforma: el backend también lo rechaza. */}
            <div style={{ marginBottom: 'var(--sp-2)' }}>
              <Banner tone="warn">
                No se reciben medicamentos: no registres fármacos en el inventario
                (los botiquines de primeros auxilios sí se aceptan).
              </Banner>
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
            {/* Quién dona: con datos sale el comprobante a su nombre; anónima
                se registra igual (código + comprobante) pero sin datos. */}
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 6 }}>
                ¿Quién dona?
              </span>
              <SegmentedControl
                value={donorMode}
                onChange={(v) => setDonorMode(v)}
                options={[
                  { value: 'NAMED', label: 'Con sus datos' },
                  { value: 'ANON', label: 'Anónima' },
                  { value: 'NONE', label: 'Sin donante' },
                ]}
              />
              {donorMode === 'NAMED' && (
                <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                  <Input
                    label="Nombre del donante"
                    placeholder="María Quispe"
                    value={donor.name}
                    onChange={(e) => setDonor((d) => ({ ...d, name: e.target.value }))}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 6 }}>
                    <Input
                      label="Teléfono"
                      hint={t('common.optional')}
                      type="tel"
                      inputMode="tel"
                      placeholder="987 654 321"
                      value={donor.phone}
                      onChange={(e) => setDonor((d) => ({ ...d, phone: e.target.value }))}
                    />
                    <Input
                      label="Correo"
                      hint={t('common.optional')}
                      type="email"
                      inputMode="email"
                      placeholder="maria@correo.com"
                      value={donor.email}
                      onChange={(e) => setDonor((d) => ({ ...d, email: e.target.value }))}
                    />
                  </div>
                </div>
              )}
              <p style={{ margin: '6px 0 0', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                {donorMode === 'ANON'
                  ? 'Se registra la donación sin datos personales y sale el comprobante con su código.'
                  : donorMode === 'NAMED'
                    ? 'Con el correo o teléfono, el donante puede consultar su donación en la web; el comprobante sale a su nombre.'
                    : 'Ingreso interno al stock (compra, ajuste): no genera donación ni comprobante.'}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, alignItems: 'flex-end', marginTop: 6 }}>
              <Select
                label="Unidad de medida"
                value={unit}
                onChange={(e) => setItem((d) => ({ ...d, unit: e.target.value }))}
                options={unitOptions.map((u) => ({ value: u, label: u }))}
              />
              <QtyInput label="Cantidad" value={item.quantity} onChange={(v) => setItem((d) => ({ ...d, quantity: v }))} width={110} />
            </div>
            <div style={{ marginTop: 6 }}>
              <Button
                icon="plus"
                block
                disabled={!item.name.trim() || !item.categoryId || !qtyValid || !donorReady}
                loading={createItem.isPending}
                onClick={addItem}
              >
                {donorMode !== 'NONE' ? 'Agregar donación' : existing ? 'Sumar al stock' : 'Ingresar al stock'}
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
                    Crear categoría nueva
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

      {transferItem && central && (
        <TransferModal
          centerId={c.id}
          campaignId={campaignId}
          central={central}
          item={transferItem === 'ALL' ? null : transferItem}
          onClose={() => setTransferItem(null)}
        />
      )}

      {receipt && <DonationReceiptModal data={receipt} onClose={() => setReceipt(null)} />}
    </Card>
  );
}

/* ───────── Transferencia al almacén central ───────── */
function TransferModal({ centerId, campaignId, central, item, onClose }: {
  centerId: string;
  campaignId?: string;
  central: Center;
  /** Ítem a transferir; null = todo el stock del centro. */
  item: { id: string; name: string; quantity: number; unit?: string } | null;
  onClose: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const transfer = useTransferCenterItems(campaignId);
  const [qty, setQty] = useState(item ? String(item.quantity) : '');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const n = Number(qty);
  const valid = !item || (Number.isFinite(n) && n > 0 && n <= item.quantity);

  const submit = async () => {
    setError('');
    try {
      const res = await transfer.mutateAsync({
        centerId,
        body: item
          ? { items: [{ itemId: item.id, quantity: n }], note: note.trim() || undefined }
          : { all: true, note: note.trim() || undefined },
      });
      const total = res.items.reduce((s, i) => s + i.quantity, 0);
      toast.success(`Transferido a ${central.name}: ${total} en ${res.items.length} producto${res.items.length === 1 ? '' : 's'}`);
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? `Transferir: ${item.name}` : 'Transferir todo al central'}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>{t('common.cancel')}</Button>
          <Button icon="truck" disabled={!valid} loading={transfer.isPending} onClick={submit}>
            Transferir
          </Button>
        </>
      }
    >
      {error && <div style={{ marginBottom: 'var(--sp-2)' }}><Banner tone="error">{error}</Banner></div>}
      <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
          Destino: <strong>{central.name}</strong> (almacén central)
        </div>
        {item ? (
          <>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
              Stock: {item.quantity}{item.unit ? ` ${item.unit}` : ''}
              {Number.isFinite(n) && n > 0 && n <= item.quantity && (
                <> · queda {item.quantity - n}{item.unit ? ` ${item.unit}` : ''}</>
              )}
            </div>
            <QtyInput label={t('donate.quantity')} value={qty} onChange={setQty} width={120} />
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
            Se transfiere todo el stock disponible de este centro al almacén
            central. El inventario del centro queda en cero.
          </p>
        )}
        <Input label={t('common.note')} hint={t('common.optional')} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
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
            Crea una zona en la pestaña «Zonas, equipos y voluntarios» para poder despachar: es el destino de la ayuda.
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
              Crear categoría nueva (comida, herramientas…)
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

/* ───────── Donaciones de la campaña (solo lectura + gestión de estado) ─────────
   Ya no hay alta manual aquí: las donaciones en especie nacen al ingresarlas en
   el centro de acopio (sección "Agregar donación" de cada centro) y las de
   dinero llegan desde la web pública; aquí se listan, se acreditan y se les
   cambia el estado. */
function Donaciones({ id }: { id?: string; ops?: CampaignOperations }) {
  const t = useT();
  const toast = useToast();
  const { data, isLoading } = useCampaignDonations(id);
  const confirmPayment = useConfirmPayment();
  const updateStatus = useUpdateDonationStatus();
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)', minHeight: 40 }}>
        <Icon name="heart" size={18} />
        <strong style={{ fontSize: 'var(--fs-base)' }}>{t('stats.donations')}</strong>
        <Badge tone="neutral">{donations.length}</Badge>
      </div>
      <p style={{ margin: '0 0 var(--sp-3)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
        Las donaciones en especie se agregan desde su centro de acopio; las de
        dinero llegan desde la web pública y aquí se acreditan.
      </p>

      {error && <div style={{ marginBottom: 'var(--sp-3)' }}><Banner tone="error">{error}</Banner></div>}
      {isLoading ? (
        <CenteredSpinner label={t('common.loading')} />
      ) : donations.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>{t('common.empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {donations.map((d) => (
            <Card key={d.id}>
              {/* En columna angosta (junto a los centros) las acciones bajan de línea. */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                <div>
                  <strong>{d.type === 'MONEY' ? formatSoles(d.amount) : `${d.quantity ?? ''} ${d.description ?? ''}`}</strong>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                    {d.anonymous ? t('donate.anonymous') : d.donorName ?? d.donorEmail ?? d.donorPhone ?? '—'} · {d.code}
                  </div>
                  {d.type === 'MONEY' && d.payment?.payerAccountNumber && (
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                      Cuenta origen: {d.payment.payerAccountNumber}
                    </div>
                  )}
                  {/* Con qué cotejar el abono antes de acreditarlo. */}
                  {d.type === 'MONEY' && (d.payment?.operationNumber || d.payment?.receiptUrl) && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 'var(--fs-xs)',
                        color: 'var(--text-muted)',
                        marginTop: 2,
                      }}
                    >
                      {d.payment?.operationNumber && <span>Operación: {d.payment.operationNumber}</span>}
                      {d.payment?.receiptUrl && (
                        <a
                          href={d.payment.receiptUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                        >
                          <Icon name="image" size={13} /> Ver comprobante
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {d.type === 'MONEY' && (
                    <Badge tone={d.payment?.status === 'PAID' ? 'success' : 'warn'}>
                      {d.payment?.status === 'PAID' ? 'Acreditado' : 'No acreditado'}
                    </Badge>
                  )}
                  {d.type === 'MONEY' && d.payment?.status !== 'PAID' && (
                    <Button
                      size="sm"
                      icon="check"
                      loading={confirmPayment.isPending}
                      onClick={() => run(() => confirmPayment.mutateAsync({ id: d.id, reference: 'MANUAL' }))}
                    >
                      Acreditar
                    </Button>
                  )}
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
  // Con almacén central, la entrega solo puede salir de ahí: los centros de
  // acopio transfieren, no entregan.
  const central = ops.centers.find((c) => c.isCentral);
  const deliveryCenters = central ? [central] : ops.centers;

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
              label={central ? 'Almacén central' : t('ops.centers')}
              value={centerId}
              onChange={(e) => { setCenterId(e.target.value); setItemId(''); }}
              options={[
                { value: '', label: '—' },
                ...deliveryCenters.map((c) => ({
                  value: c.id,
                  label: c.isCentral ? `${c.name} (almacén central)` : c.name,
                })),
              ]}
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
        No hay voluntarios inscritos sin equipo. Súmalos desde la sección Voluntarios, al lado.
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
