import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Badge,
  Chip,
  Input,
  Checkbox,
  ProgressBar,
  Avatar,
  Banner,
  Icon,
  Modal,
  CenteredSpinner,
  EmptyState,
  useToast,
} from '../components/ui';
import {
  useCampaign,
  useCreateDonation,
  useConfirmPayment,
  useMyCampaignEnrollment,
  useEnrollAsVolunteer,
  useLeaveCampaign,
} from '../hooks/api';
import type { CreateDonationBody } from '../hooks/api';
import { useAuth } from '../store/auth';
import { useT } from '../lib/i18n';
import { apiErrorMessage } from '../lib/api';
import {
  CAMPAIGN_CATEGORY,
  CAMPAIGN_STATUS,
  formatSoles,
  formatNumber,
  formatDate,
  relativeTime,
  daysLeft,
} from '../lib/format';
import type { PaymentMethod } from '../lib/types';

const VOL_SKILL_LABEL: Record<string, string> = {
  MEDIC: 'Médicos',
  LOGISTICS: 'Logística',
  DRIVER: 'Conductores',
  COOK: 'Cocina',
  PSYCHOLOGY: 'Psicología',
  CONSTRUCTION: 'Construcción',
  COMMS: 'Comunicación',
  GENERAL: 'General',
};

const AMOUNT_PRESETS = [20, 50, 100, 200];
const PAY_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'YAPE', label: 'Yape' },
  { value: 'PLIN', label: 'Plin' },
  { value: 'CARD', label: 'Tarjeta' },
];

export default function CampaignDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();

  const { data: campaign, isLoading, isError } = useCampaign(slug);
  const createDonation = useCreateDonation();
  const confirmPayment = useConfirmPayment();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | ''>(50);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('YAPE');
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState('');

  if (isLoading) return <CenteredSpinner />;
  if (isError || !campaign) {
    return (
      <div className="n-page">
        <EmptyState
          icon="alert"
          title="Campaña no encontrada"
          message="El enlace puede haber cambiado o la campaña ya no existe."
          action={<Button onClick={() => navigate('/campanas')}>{t('camp.explore')}</Button>}
        />
      </div>
    );
  }

  const cat = CAMPAIGN_CATEGORY[campaign.category];
  const st = CAMPAIGN_STATUS[campaign.status];
  const funded = campaign.progressPct >= 100 || campaign.status === 'FUNDED';
  const dleft = daysLeft(campaign.deadline);
  const isOwner = user?.id === campaign.organizerId;
  const closed = ['COMPLETED', 'CANCELLED', 'PAUSED'].includes(campaign.status);
  const submitting = createDonation.isPending || confirmPayment.isPending;

  async function support() {
    if (!campaign) return;
    setError('');
    if (typeof amount !== 'number' || amount <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }
    const body: CreateDonationBody = {
      type: 'MONEY',
      amount,
      campaignId: campaign.id,
      paymentMethod,
      anonymous: !user ? anonymous : undefined,
    };
    try {
      const donation = await createDonation.mutateAsync(body);
      await confirmPayment.mutateAsync({ id: donation.id, reference: 'SIM' });
      toast.success('¡Gracias por impulsar esta campaña!', { title: 'Aporte confirmado' });
      setOpen(false);
      navigate(`/seguir/${donation.code}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="n-page" style={{ maxWidth: 760, margin: '0 auto' }}>
      <button
        type="button"
        onClick={() => navigate('/campanas')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          marginBottom: 'var(--sp-3)',
        }}
      >
        <Icon name="chevronLeft" size={18} /> {t('camp.explore')}
      </button>

      {/* Hero */}
      <div
        style={{
          height: 200,
          borderRadius: 'var(--r-lg)',
          background: campaign.coverPhoto
            ? `center/cover no-repeat url(${campaign.coverPhoto})`
            : 'var(--brand-600)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 72,
          marginBottom: 'var(--sp-4)',
          color: campaign.coverPhoto ? undefined : '#fff',
        }}
        aria-hidden={!campaign.coverPhoto}
      >
        {!campaign.coverPhoto && <Icon name={cat.icon} size={64} strokeWidth={1.4} />}
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', marginBottom: 'var(--sp-2)' }}>
        <Badge tone="neutral"><Icon name={cat.icon} size={13} /> {cat.label}</Badge>
        <Badge tone={st.tone}>{st.label}</Badge>
        {campaign.featured && <Badge tone="gold"><Icon name="star" size={13} /> Destacada</Badge>}
        {campaign.district && <Badge tone="neutral"><Icon name="pin" size={13} /> {campaign.district}</Badge>}
      </div>

      <h1 style={{ fontSize: 'var(--fs-2xl)', margin: '0 0 8px' }}>{campaign.title}</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-lg)', margin: '0 0 var(--sp-4)' }}>
        {campaign.summary}
      </p>

      {isOwner && (
        <Banner tone="info" title="Eres el organizador">
          <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <Button size="sm" icon="settings" onClick={() => navigate(`/organizador/${campaign.id}/editar`)}>
              {t('common.edit')}
            </Button>
            <Button size="sm" variant="ghost" icon="chart" onClick={() => navigate('/organizador')}>
              {t('camp.myCampaigns')}
            </Button>
          </div>
        </Banner>
      )}

      {/* Progress + support */}
      <Card style={{ marginTop: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <strong style={{ fontSize: 'var(--fs-2xl)', color: 'var(--brand-700)' }}>
            {formatSoles(campaign.raisedAmount)}
          </strong>
          <span style={{ color: 'var(--text-muted)' }}>
            {campaign.goalAmount != null ? `de ${formatSoles(campaign.goalAmount)}` : 'recaudado · sin meta fija'}
          </span>
        </div>
        {campaign.goalAmount != null && (
          <div style={{ margin: '10px 0' }}>
            <ProgressBar value={campaign.progressPct} tone={funded ? 'gold' : 'brand'} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 'var(--sp-5)', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
          <span><strong style={{ color: 'var(--text)' }}>{formatNumber(campaign.backersCount)}</strong> donantes</span>
          {dleft != null && campaign.status === 'ACTIVE' && (
            <span><strong style={{ color: 'var(--text)' }}>{dleft}</strong> {t('camp.daysLeft')}</span>
          )}
        </div>

        {!open ? (
          <Button
            block
            size="lg"
            variant="gold"
            icon="heart"
            disabled={closed}
            onClick={() => setOpen(true)}
            style={{ marginTop: 'var(--sp-4)' }}
          >
            {closed ? st.label : t('camp.support')}
          </Button>
        ) : (
          <div style={{ marginTop: 'var(--sp-4)', display: 'grid', gap: 'var(--sp-3)' }}>
            {error && <Banner tone="error" title={t('common.error')}>{error}</Banner>}
            <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
              {AMOUNT_PRESETS.map((p) => (
                <Chip key={p} active={amount === p} onClick={() => setAmount(p)}>
                  {formatSoles(p)}
                </Chip>
              ))}
            </div>
            <Input
              label={t('donate.amount')}
              type="number"
              inputMode="numeric"
              min={1}
              prefix="S/"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
              {PAY_OPTIONS.map((p) => (
                <Chip key={p.value} active={paymentMethod === p.value} onClick={() => setPaymentMethod(p.value)}>
                  {p.label}
                </Chip>
              ))}
            </div>
            {!user && (
              <Checkbox checked={anonymous} onChange={setAnonymous}>
                {t('donate.anonymous')}
              </Checkbox>
            )}
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              <Button block size="lg" variant="gold" icon="heart" loading={submitting} onClick={support}>
                {t('camp.supportNow')} {typeof amount === 'number' ? formatSoles(amount) : ''}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Organizer */}
      {campaign.organizer && (
        <Card style={{ marginTop: 'var(--sp-4)', display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
          <Avatar name={campaign.organizer.fullName} src={campaign.organizer.avatarUrl} />
          <div>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>{t('camp.organizer')}</div>
            <strong>{campaign.organizer.fullName}</strong>
          </div>
        </Card>
      )}

      {/* Voluntarios que busca + inscripción */}
      {campaign.volunteerSkills && campaign.volunteerSkills.length > 0 && (
        <Card style={{ marginTop: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
            <Icon name="users" size={18} />
            <strong>Voluntarios que busca</strong>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            {campaign.volunteerSkills.map((sk) => (
              <Badge key={sk} tone="info">{VOL_SKILL_LABEL[sk] ?? sk}</Badge>
            ))}
          </div>
          <VolunteerEnroll campaignId={campaign.id} skills={campaign.volunteerSkills} isOwner={isOwner} />
        </Card>
      )}

      {/* Story */}
      <h2 style={{ fontSize: 'var(--fs-xl)', margin: 'var(--sp-6) 0 var(--sp-3)' }}>{t('camp.story')}</h2>
      <Card>
        <p style={{ whiteSpace: 'pre-line', margin: 0, lineHeight: 1.6 }}>{campaign.story}</p>
      </Card>

      {/* Updates */}
      {campaign.updates && campaign.updates.length > 0 && (
        <>
          <h2 style={{ fontSize: 'var(--fs-xl)', margin: 'var(--sp-6) 0 var(--sp-3)' }}>
            {t('camp.updates')} ({campaign.updates.length})
          </h2>
          <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
            {campaign.updates.map((u) => (
              <Card key={u.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  <strong>{u.title}</strong>
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>{relativeTime(u.createdAt)}</span>
                </div>
                <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>{u.body}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Recent donors */}
      {campaign.recentDonors && campaign.recentDonors.length > 0 && (
        <>
          <h2 style={{ fontSize: 'var(--fs-xl)', margin: 'var(--sp-6) 0 var(--sp-3)' }}>{t('camp.recentDonors')}</h2>
          <Card>
            <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
              {campaign.recentDonors.map((d) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    <Avatar name={d.name} size={32} />
                    <span>{d.name}</span>
                  </span>
                  <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    {d.amount != null && <strong style={{ color: 'var(--brand-700)' }}>{formatSoles(d.amount)}</strong>}
                    <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>{formatDate(d.createdAt)}</span>
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/* ───────── Inscripción como voluntario ─────────
   El organizador solo puede sumar a sus brigadas a gente inscrita aquí. */
function VolunteerEnroll({
  campaignId,
  skills,
  isOwner,
}: {
  campaignId: string;
  skills: string[];
  isOwner: boolean;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const enrollmentQ = useMyCampaignEnrollment(campaignId, !!user && !isOwner);
  const enroll = useEnrollAsVolunteer(campaignId);
  const leave = useLeaveCampaign(campaignId);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  if (isOwner) return null;

  if (!user) {
    return (
      <div style={{ marginTop: 'var(--sp-3)' }}>
        <Button variant="subtle" icon="users" onClick={() => navigate('/login')}>
          Inicia sesión para ser voluntario
        </Button>
      </div>
    );
  }

  const enrolled = enrollmentQ.data?.enrolled;

  const submit = async () => {
    setError('');
    try {
      await enroll.mutateAsync({ skills: picked.length ? picked : undefined, note: note.trim() || undefined });
      toast.success('¡Te inscribiste como voluntario!');
      setOpen(false);
      setPicked([]);
      setNote('');
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const quit = async () => {
    setError('');
    try {
      await leave.mutateAsync();
      toast.success('Saliste de la campaña');
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  return (
    <div style={{ marginTop: 'var(--sp-3)' }}>
      {error && <div style={{ marginBottom: 'var(--sp-2)' }}><Banner tone="error">{error}</Banner></div>}
      {enrolled ? (
        <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge tone="success">Ya estás inscrito</Badge>
          <Button variant="ghost" size="sm" loading={leave.isPending} onClick={quit}>
            Salir de la campaña
          </Button>
        </div>
      ) : (
        <Button icon="users" onClick={() => setOpen(true)}>Inscribirme como voluntario</Button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Inscribirme como voluntario"
        footer={
          <>
            <Button variant="subtle" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button icon="check" loading={enroll.isPending} onClick={submit}>Inscribirme</Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
          <div>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: 6 }}>
              ¿En qué puedes ayudar? (opcional)
            </div>
            <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
              {skills.map((sk) => (
                <Chip
                  key={sk}
                  active={picked.includes(sk)}
                  onClick={() =>
                    setPicked((prev) => (prev.includes(sk) ? prev.filter((s) => s !== sk) : [...prev, sk]))
                  }
                >
                  {VOL_SKILL_LABEL[sk] ?? sk}
                </Chip>
              ))}
            </div>
          </div>
          <Input
            label="Mensaje para el organizador"
            hint="opcional"
            placeholder="Disponible fines de semana"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
