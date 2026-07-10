import { useState } from 'react';
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
  CenteredSpinner,
  useToast,
  type BadgeTone,
  type IconName,
} from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';
import {
  useCampaign,
  useCampaignOperations,
  useCampaignDonations,
  useCreateZone,
  useDeleteZone,
  useAddZoneNeed,
  useCreateBrigade,
  useDeleteBrigade,
  useAddBrigadeMember,
  useRemoveBrigadeMember,
  useCreateCenter,
  useCenter,
  useCategories,
  useCreateInventoryItem,
  useCreateDonation,
  useConfirmPayment,
  useBeneficiaries,
  useCreateBeneficiary,
} from '../../hooks/api';
import { useT } from '../../lib/i18n';
import { apiErrorMessage } from '../../lib/api';
import { formatSoles, NEED_UNITS } from '../../lib/format';
import type { Severity, CampaignOperations, Campaign } from '../../lib/types';

const SEV_TONE: Record<Severity, BadgeTone> = {
  LOW: 'info',
  MEDIUM: 'warn',
  HIGH: 'warn',
  CRITICAL: 'danger',
};
const SEVERITIES: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
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
      {tab === 'beneficiarios' && <Beneficiarios emergencyId={campaign.emergencyId} />}
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
function Zonas({ id, ops }: { id?: string; ops: CampaignOperations }) {
  const t = useT();
  const toast = useToast();
  const createZone = useCreateZone(id);
  const deleteZone = useDeleteZone(id);
  const addNeed = useAddZoneNeed(id);
  const [open, setOpen] = useState(false);
  const [zName, setZName] = useState('');
  const [zMapUrl, setZMapUrl] = useState('');
  const [zRef, setZRef] = useState('');
  const [zSev, setZSev] = useState<Severity>('MEDIUM');
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--sp-3)' }}>
        <Button icon="plus" onClick={() => setOpen(true)}>{t('ops.newZone')}</Button>
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
                <Button size="sm" variant="ghost" icon="close" onClick={() => run(() => deleteZone.mutateAsync(z.id))} aria-label={t('common.close')} />
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
          </Card>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('ops.newZone')}
        footer={
          <>
            <Button variant="subtle" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button icon="plus" disabled={!zName.trim()} loading={createZone.isPending}
              onClick={() => run(() => createZone.mutateAsync({ name: zName.trim(), mapUrl: zMapUrl || undefined, reference: zRef || undefined, severity: zSev }),
                () => { setZName(''); setZMapUrl(''); setZRef(''); setZSev('MEDIUM'); setOpen(false); })}>
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          <Input label={t('ops.zoneName')} value={zName} onChange={(e) => setZName(e.target.value)} autoFocus />
          <Input label={t('ops.mapUrl')} value={zMapUrl} onChange={(e) => setZMapUrl(e.target.value)} placeholder="https://maps.google.com/?q=..." />
          <Input label={t('ops.reference')} value={zRef} onChange={(e) => setZRef(e.target.value)} />
          <Select label={t('ops.level')} value={zSev} onChange={(e) => setZSev(e.target.value as Severity)} options={SEVERITIES.map((s) => ({ value: s, label: t(`sev.${s}`) }))} />
        </div>
      </Modal>
    </div>
  );
}

/* ───────── Brigadas ───────── */
function Brigadas({ id, ops }: { id?: string; ops: CampaignOperations }) {
  const t = useT();
  const toast = useToast();
  const createBrigade = useCreateBrigade(id);
  const deleteBrigade = useDeleteBrigade(id);
  const addMember = useAddBrigadeMember(id);
  const removeMember = useRemoveBrigadeMember(id);
  const [open, setOpen] = useState(false);
  const [bName, setBName] = useState('');
  const [bZone, setBZone] = useState('');
  const [bMeeting, setBMeeting] = useState('');
  const [bMapUrl, setBMapUrl] = useState('');
  const [bPhone, setBPhone] = useState('');
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

  const zoneOptions = [{ value: '', label: '—' }, ...ops.zones.map((z) => ({ value: z.id, label: z.name }))];
  const brigades = ops.zones.flatMap((z) => (z.brigades ?? []).map((b) => ({ zone: z, b })));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--sp-3)' }}>
        <Button icon="plus" onClick={() => setOpen(true)}>{t('ops.newBrigade')}</Button>
      </div>
      {error && <div style={{ marginBottom: 'var(--sp-3)' }}><Banner tone="error">{error}</Banner></div>}
      {brigades.length === 0 && <p style={{ color: 'var(--text-muted)' }}>{t('ops.noBrigades')}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {brigades.map(({ zone, b }) => (
          <Card key={b.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
              <div>
                <strong>{b.name}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{t('ops.assignZone')}: {zone.name}</div>
                {b.meetingPoint && <div style={{ fontSize: 'var(--fs-sm)' }}>📍 {b.meetingPoint}</div>}
                {b.contactPhone && <div style={{ fontSize: 'var(--fs-sm)' }}>📞 {b.contactPhone}</div>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {b.meetingPointMapUrl && <Button size="sm" variant="ghost" icon="share" onClick={() => shareUrl(b.meetingPointMapUrl, toast, t('common.copied'))} aria-label={t('ops.shareBrigade')} />}
                <Button size="sm" variant="ghost" icon="close" onClick={() => run(() => deleteBrigade.mutateAsync(b.id))} aria-label={t('common.close')} />
              </div>
            </div>
            <div style={{ marginTop: 'var(--sp-2)' }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>{t('ops.members')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(b.members ?? []).map((m) => (
                  <Badge key={m.id} tone="neutral">
                    {m.volunteer?.user?.fullName ?? m.user?.fullName ?? m.userId ?? m.volunteerId}
                    <button type="button" style={{ marginLeft: 6, cursor: 'pointer', background: 'none', border: 'none' }}
                      onClick={() => run(() => removeMember.mutateAsync({ brigadeId: b.id, memberId: m.id }))}>×</button>
                  </Badge>
                ))}
                {(b.members ?? []).length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>—</span>}
              </div>
              <AddMemberInline label={t('ops.addMember')} onAdd={(userId) => run(() => addMember.mutateAsync({ brigadeId: b.id, body: { userId } }))} />
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('ops.newBrigade')}
        footer={
          <>
            <Button variant="subtle" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button icon="plus" disabled={!bName.trim()} loading={createBrigade.isPending}
              onClick={() => run(() => createBrigade.mutateAsync({ name: bName.trim(), zoneId: bZone || undefined, meetingPoint: bMeeting || undefined, meetingPointMapUrl: bMapUrl || undefined, contactPhone: bPhone || undefined }),
                () => { setBName(''); setBZone(''); setBMeeting(''); setBMapUrl(''); setBPhone(''); setOpen(false); })}>
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          <Input label={t('ops.brigadeName')} value={bName} onChange={(e) => setBName(e.target.value)} autoFocus />
          <Select label={t('ops.assignZone')} value={bZone} onChange={(e) => setBZone(e.target.value)} options={zoneOptions} />
          <Input label={t('ops.meetingPoint')} value={bMeeting} onChange={(e) => setBMeeting(e.target.value)} />
          <Input label={t('ops.mapUrl')} value={bMapUrl} onChange={(e) => setBMapUrl(e.target.value)} placeholder="https://maps.google.com/?q=..." />
          <Input label={t('ops.contactPhone')} type="tel" value={bPhone} onChange={(e) => setBPhone(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}

/* ───────── Centros ───────── */
function Centros({ id, ops }: { id?: string; ops: CampaignOperations }) {
  const t = useT();
  const toast = useToast();
  const createCenter = useCreateCenter();
  const [open, setOpen] = useState(false);
  const [cName, setCName] = useState('');
  const [cAddress, setCAddress] = useState('');
  const [cHours, setCHours] = useState('');
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--sp-3)' }}>
        <Button icon="plus" onClick={() => setOpen(true)}>{t('ops.newCenter')}</Button>
      </div>
      {error && <div style={{ marginBottom: 'var(--sp-3)' }}><Banner tone="error">{error}</Banner></div>}
      {ops.centers.length === 0 && <p style={{ color: 'var(--text-muted)' }}>{t('ops.noCenters')}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {ops.centers.map((c) => (
          <CenterCard key={c.id} centerId={c.id} name={c.name} address={c.address} openingHours={c.openingHours} loadPct={c.loadPct} />
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('ops.newCenter')}
        footer={
          <>
            <Button variant="subtle" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button icon="plus" disabled={!cName.trim() || !cAddress.trim()} loading={createCenter.isPending}
              onClick={() => run(() => createCenter.mutateAsync({ name: cName.trim(), address: cAddress.trim(), openingHours: cHours || undefined, campaignId: id, lat: 0, lng: 0 }),
                () => { setCName(''); setCAddress(''); setCHours(''); setOpen(false); })}>
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          <Input label={t('camp.fieldTitle')} value={cName} onChange={(e) => setCName(e.target.value)} autoFocus />
          <Input label={t('mgr.address')} value={cAddress} onChange={(e) => setCAddress(e.target.value)} />
          <Input label={t('mgr.hours')} placeholder={t('mgr.hoursPlaceholder')} value={cHours} onChange={(e) => setCHours(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}

function CenterCard({ centerId, name, address, openingHours, loadPct }: {
  centerId: string; name: string; address?: string; openingHours?: string; loadPct?: number;
}) {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const { data: center } = useCenter(open ? centerId : undefined);
  const { data: categories } = useCategories();
  const createItem = useCreateInventoryItem();
  const [iName, setIName] = useState('');
  const [iCat, setICat] = useState('');
  const [iQty, setIQty] = useState(1);

  const doPrint = () => window.print();

  const addItem = async () => {
    if (!iName.trim() || !iCat) return;
    try {
      await createItem.mutateAsync({ centerId, body: { name: iName.trim(), categoryId: iCat, quantity: iQty } });
      toast.success(t('toast.saved'));
      setIName(''); setIQty(1);
    } catch { /* ignore */ }
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
        <div>
          <strong>{name}</strong>
          {address && <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{address}</div>}
          {openingHours && <div style={{ fontSize: 'var(--fs-sm)' }}><Icon name="clock" size={14} /> {openingHours}</div>}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Badge tone="neutral">{loadPct ?? 0}%</Badge>
          <Button size="sm" variant="ghost" icon={open ? 'chevronDown' : 'box'} onClick={() => setOpen((v) => !v)}>
            {t('mgr.inventory')}
          </Button>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 'var(--sp-3)' }}>
          <div className="nx-print-area">
            <h3 style={{ fontSize: 'var(--fs-md)', marginBottom: 'var(--sp-2)' }}>{name} — {t('mgr.inventory')}</h3>
            {(center?.inventoryByCategory ?? []).length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{t('common.empty')}</p>
            )}
            {(center?.inventoryByCategory ?? []).map((g) => (
              <div key={g.categoryId} style={{ marginBottom: 'var(--sp-2)' }}>
                <div style={{ fontWeight: 'var(--fw-bold)', fontSize: 'var(--fs-sm)' }}>{g.category} · {g.totalQuantity}</div>
                {g.items.map((it) => (
                  <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
                    <span>{it.name}</span><span>{it.quantity}{it.unit ? ` ${it.unit}` : ''}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <Button size="sm" variant="subtle" icon="download" onClick={doPrint} style={{ marginTop: 'var(--sp-2)' }}>
            {t('mgr.printInventory')}
          </Button>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: 6, marginTop: 'var(--sp-3)', alignItems: 'flex-end' }}>
            <Input label={t('camp.fieldTitle')} value={iName} onChange={(e) => setIName(e.target.value)} />
            <Select label={t('camp.fieldCategory')} value={iCat} onChange={(e) => setICat(e.target.value)}
              options={[{ value: '', label: '—' }, ...(categories ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
            <input type="number" min={1} value={iQty} onChange={(e) => setIQty(Number(e.target.value) || 1)}
              style={{ width: 64, padding: 8, borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }} />
            <Button size="sm" icon="plus" disabled={!iName.trim() || !iCat} loading={createItem.isPending} onClick={addItem} />
          </div>
        </div>
      )}
    </Card>
  );
}

/* ───────── Voluntarios (donaciones tipo voluntariado / TIME) ───────── */
function Voluntarios({ id }: { id?: string }) {
  const t = useT();
  const { data, isLoading } = useCampaignDonations(id);
  if (isLoading) return <CenteredSpinner label={t('common.loading')} />;
  const volunteers = (data ?? []).filter((d) => d.type === 'TIME');
  if (volunteers.length === 0) return <p style={{ color: 'var(--text-muted)' }}>{t('common.empty')}</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      {volunteers.map((d) => (
        <Card key={d.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <div>
              <strong>{d.donorName ?? '—'}</strong>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
                {d.donorPhone && <span>📞 {d.donorPhone} · </span>}
                {d.quantity ?? 0} {t('vol.hours').toLowerCase()}
                {d.description ? ` · ${d.description}` : ''}
              </div>
            </div>
            <StatusBadge status={d.status} />
          </div>
        </Card>
      ))}
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

  const [open, setOpen] = useState(false);
  const [dType, setDType] = useState<'MONEY' | 'GOODS'>('MONEY');
  const [amount, setAmount] = useState('');
  const [qty, setQty] = useState(1);
  const [desc, setDesc] = useState('');
  const [donor, setDonor] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const donations = (data ?? []).filter((d) => d.type !== 'TIME');

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
        body.quantity = qty;
        body.paymentMethod = 'IN_KIND';
      }
      const created = await createDonation.mutateAsync(body);
      if (dType === 'MONEY') await confirmPayment.mutateAsync({ id: created.id, reference: 'MANUAL' });
      toast.success(t('toast.donationDone'));
      setAmount(''); setQty(1); setDesc(''); setDonor(''); setPhone(''); setOpen(false);
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const valid = dType === 'MONEY' ? Number(amount) > 0 : qty > 0 && desc.trim().length > 0;

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
              <Input label={t('donate.quantity')} type="number" value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} />
              <Input label={t('donate.whatDonate')} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <Input label={t('donate.name')} value={donor} onChange={(e) => setDonor(e.target.value)} />
            <Input label={t('donate.phone')} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
      </Modal>

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
                <StatusBadge status={d.status} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── Beneficiarios (de la emergencia de la campaña) ───────── */
function Beneficiarios({ emergencyId }: { emergencyId?: string }) {
  const t = useT();
  const toast = useToast();
  const { data, isLoading } = useBeneficiaries(emergencyId ? { emergencyId } : undefined);
  const createBen = useCreateBeneficiary();
  const [open, setOpen] = useState(false);
  const [doc, setDoc] = useState('');
  const [name, setName] = useState('');
  const [household, setHousehold] = useState(1);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  if (!emergencyId) {
    return (
      <Banner tone="info" title={t('nav.beneficiaries')}>
        Esta campaña no proviene de una emergencia. Los beneficiarios se registran por emergencia.
      </Banner>
    );
  }

  const submit = async () => {
    setError('');
    try {
      await createBen.mutateAsync({
        docNumber: doc.trim(),
        fullName: name.trim(),
        householdSize: household,
        phone: phone || undefined,
        emergencyId,
      });
      toast.success(t('toast.saved'));
      setDoc(''); setName(''); setHousehold(1); setPhone(''); setOpen(false);
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const beneficiaries = data ?? [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--sp-3)' }}>
        <Button icon="plus" onClick={() => setOpen(true)}>{t('census.save')}</Button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('nav.beneficiaries')}
        footer={
          <>
            <Button variant="subtle" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button icon="plus" disabled={doc.trim().length < 3 || name.trim().length < 2} loading={createBen.isPending} onClick={submit}>
              {t('common.create')}
            </Button>
          </>
        }
      >
        {error && <div style={{ marginBottom: 'var(--sp-2)' }}><Banner tone="error">{error}</Banner></div>}
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          <Input label={t('census.docNumber')} value={doc} onChange={(e) => setDoc(e.target.value)} autoFocus />
          <Input label={t('census.fullName')} value={name} onChange={(e) => setName(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <Input label={t('census.household')} type="number" value={household} onChange={(e) => setHousehold(Number(e.target.value) || 1)} />
            <Input label={t('donate.phone')} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
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
                <StatusBadge status={b.status} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── Ajustes ───────── */
function Ajustes({ campaign, onEdit }: { campaign: Campaign; onEdit: () => void }) {
  const t = useT();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
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
    </div>
  );
}

/* ───────── Helpers ───────── */
function AddNeedInline({ onAdd, label }: { onAdd: (title: string, qty: number, unit: string) => void; label: string }) {
  const [title, setTitle] = useState('');
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState(NEED_UNITS[0]);
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'flex-end' }}>
      <Input label={label} value={title} onChange={(e) => setTitle(e.target.value)} />
      <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)}
        style={{ width: 64, padding: 8, borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }} />
      <div style={{ width: 110 }}>
        <Select value={unit} onChange={(e) => setUnit(e.target.value)} options={NEED_UNITS.map((u) => ({ value: u, label: u }))} />
      </div>
      <Button size="sm" icon="plus" disabled={!title.trim()} onClick={() => { onAdd(title.trim(), qty, unit); setTitle(''); setQty(1); setUnit(NEED_UNITS[0]); }} />
    </div>
  );
}

function AddMemberInline({ onAdd, label }: { onAdd: (userId: string) => void; label: string }) {
  const [userId, setUserId] = useState('');
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'flex-end' }}>
      <Input label={`${label} (userId)`} value={userId} onChange={(e) => setUserId(e.target.value)} />
      <Button size="sm" icon="plus" disabled={!userId.trim()} onClick={() => { onAdd(userId.trim()); setUserId(''); }} />
    </div>
  );
}
