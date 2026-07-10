import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHead } from '../../components/layout/AppShell';
import {
  Button,
  Card,
  Input,
  Textarea,
  Select,
  Checkbox,
  Chip,
  Banner,
  Icon,
  CenteredSpinner,
  useToast,
} from '../../components/ui';
import {
  useCampaign,
  useCreateCampaign,
  useUpdateCampaign,
  useCreateCenter,
} from '../../hooks/api';
import type { CreateCampaignBody } from '../../hooks/api';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useT } from '../../lib/i18n';
import { apiErrorMessage } from '../../lib/api';
import { CAMPAIGN_CATEGORY } from '../../lib/format';
import type { CampaignCategory } from '../../lib/types';

const CATEGORY_OPTIONS = (Object.entries(CAMPAIGN_CATEGORY) as [CampaignCategory, { label: string; icon: string }][]).map(
  ([value, c]) => ({ value, label: c.label }),
);

const SKILLS: { value: string; label: string }[] = [
  { value: 'MEDIC', label: 'Médicos' },
  { value: 'LOGISTICS', label: 'Logística' },
  { value: 'DRIVER', label: 'Conductores' },
  { value: 'COOK', label: 'Cocina' },
  { value: 'PSYCHOLOGY', label: 'Psicología' },
  { value: 'CONSTRUCTION', label: 'Construcción' },
  { value: 'COMMS', label: 'Comunicación' },
  { value: 'GENERAL', label: 'General' },
];

// Coordenadas por defecto (centro de Arequipa) si no se geolocaliza.
const AQP = { lat: -16.409, lng: -71.537 };

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card style={{ display: 'grid', gap: 'var(--sp-4)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--fs-lg)', margin: 0 }}>{title}</h2>
        {hint && <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', margin: '2px 0 0' }}>{hint}</p>}
      </div>
      {children}
    </Card>
  );
}

export default function CampaignForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const t = useT();
  const toast = useToast();

  const { data: existing, isLoading } = useCampaign(isEdit ? id : undefined);
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const createCenter = useCreateCenter();
  const geo = useGeolocation();

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [story, setStory] = useState('');
  const [category, setCategory] = useState<CampaignCategory>('COMMUNITY');
  const [coverPhoto, setCoverPhoto] = useState('');
  const [district, setDistrict] = useState('');
  const [deadline, setDeadline] = useState('');

  // Meta opcional
  const [hasGoal, setHasGoal] = useState(true);
  const [goalAmount, setGoalAmount] = useState<number | ''>('');

  // Voluntarios que busca
  const [skills, setSkills] = useState<string[]>([]);

  // Información de pago (Yape / depósito bancario)
  const [yapeNumber, setYapeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');

  // Centro de acopio (opcional, solo al crear)
  const [addCenter, setAddCenter] = useState(false);
  const [centerName, setCenterName] = useState('');
  const [centerAddress, setCenterAddress] = useState('');
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [error, setError] = useState('');

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setSummary(existing.summary);
      setStory(existing.story);
      setCategory(existing.category);
      setCoverPhoto(existing.coverPhoto ?? '');
      setDistrict(existing.district ?? '');
      setDeadline(existing.deadline ? existing.deadline.slice(0, 10) : '');
      setHasGoal(existing.goalAmount != null);
      setGoalAmount(existing.goalAmount ?? '');
      setSkills(existing.volunteerSkills ?? []);
      setYapeNumber(existing.yapeNumber ?? '');
      setBankName(existing.bankName ?? '');
      setBankAccount(existing.bankAccount ?? '');
      setAccountHolder(existing.accountHolder ?? '');
      setQrImageUrl(existing.qrImageUrl ?? '');
    }
  }, [existing]);

  function toggleSkill(v: string) {
    setSkills((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  }

  async function useMyLocation() {
    try {
      const c = await geo.locate();
      setCenterCoords(c);
      toast.success('Ubicación capturada');
    } catch {
      toast.warn('No se pudo obtener tu ubicación. Se usará Arequipa por defecto.');
    }
  }

  const goalValid = !hasGoal || (typeof goalAmount === 'number' && goalAmount > 0);
  const valid =
    title.trim().length >= 4 &&
    summary.trim().length >= 10 &&
    story.trim().length >= 20 &&
    goalValid;

  function buildBody(status: 'DRAFT' | 'ACTIVE'): CreateCampaignBody {
    return {
      title: title.trim(),
      summary: summary.trim(),
      story: story.trim(),
      category,
      goalAmount: hasGoal && typeof goalAmount === 'number' ? goalAmount : undefined,
      volunteerSkills: skills.length ? skills : undefined,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      district: district.trim() || undefined,
      coverPhoto: coverPhoto.trim() || undefined,
      yapeNumber: yapeNumber.trim() || undefined,
      bankName: bankName.trim() || undefined,
      bankAccount: bankAccount.trim() || undefined,
      accountHolder: accountHolder.trim() || undefined,
      qrImageUrl: qrImageUrl.trim() || undefined,
      status,
    };
  }

  async function maybeCreateCenter() {
    if (isEdit || !addCenter) return;
    if (!centerName.trim() || !centerAddress.trim()) return;
    const coords = centerCoords ?? AQP;
    try {
      await createCenter.mutateAsync({
        name: centerName.trim(),
        address: centerAddress.trim(),
        lat: coords.lat,
        lng: coords.lng,
      });
    } catch {
      // No bloquea la campaña; el centro se puede crear luego.
      toast.warn('La campaña se creó, pero el centro de acopio no. Puedes crearlo luego.');
    }
  }

  async function save(status: 'DRAFT' | 'ACTIVE') {
    setError('');
    try {
      if (isEdit && id) {
        await updateCampaign.mutateAsync({ id, body: buildBody(status) });
        toast.success(t('toast.saved'));
        navigate(`/campanas/${existing?.slug ?? ''}`);
      } else {
        const created = await createCampaign.mutateAsync(buildBody(status));
        await maybeCreateCenter();
        toast.success(status === 'ACTIVE' ? t('camp.published') : t('camp.draftSaved'));
        navigate(`/campanas/${created.slug}`);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const busy = createCampaign.isPending || updateCampaign.isPending || createCenter.isPending;

  if (isEdit && isLoading) return <CenteredSpinner />;

  return (
    <div className="n-page" style={{ maxWidth: 680, margin: '0 auto', display: 'grid', gap: 'var(--sp-4)' }}>
      <PageHead
        title={isEdit ? t('camp.editCampaign') : t('camp.newCampaign')}
        subtitle="Cuenta tu proyecto: ayuda a otros o haz crecer tu emprendimiento."
      />

      {error && <Banner tone="error" title={t('common.error')}>{error}</Banner>}

      {/* 1. Tu campaña */}
      <Section title="Tu campaña" hint="Lo esencial para presentar tu proyecto.">
        <Input
          label={t('camp.fieldTitle')}
          placeholder="Agua potable para 40 familias en Yura"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          label={t('camp.fieldSummary')}
          hint="máx. 280 caracteres"
          placeholder="Una frase que enganche y explique el impacto."
          value={summary}
          maxLength={280}
          onChange={(e) => setSummary(e.target.value)}
        />
        <Textarea
          label={t('camp.fieldStory')}
          rows={6}
          placeholder="Explica el problema, qué harás y a quién ayuda (o cómo crece tu emprendimiento)."
          value={story}
          onChange={(e) => setStory(e.target.value)}
        />
        <Select
          label={t('camp.fieldCategory')}
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(e) => setCategory(e.target.value as CampaignCategory)}
        />
        <Input
          label={t('camp.fieldCover')}
          hint={t('common.optional')}
          placeholder="https://… (URL de imagen)"
          value={coverPhoto}
          onChange={(e) => setCoverPhoto(e.target.value)}
        />
        <div style={{ display: 'grid', gap: 'var(--sp-4)', gridTemplateColumns: '1fr 1fr' }}>
          <Input
            label={t('camp.fieldDeadline')}
            hint={t('common.optional')}
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          <Input
            label={t('camp.fieldDistrict')}
            hint={t('common.optional')}
            placeholder="Yura"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          />
        </div>
      </Section>

      {/* 2. Meta (opcional) */}
      <Section title="Meta de recaudación" hint="Tu campaña puede tener una meta o quedar abierta sin monto fijo.">
        <Checkbox checked={hasGoal} onChange={setHasGoal}>
          Fijar una meta de recaudación
        </Checkbox>
        {hasGoal && (
          <Input
            label={t('camp.fieldGoal')}
            type="number"
            inputMode="numeric"
            min={1}
            prefix="S/"
            placeholder="8000"
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value === '' ? '' : Number(e.target.value))}
          />
        )}
      </Section>

      {/* 3. Información de pago */}
      <Section title={t('camp.payInfo')} hint="Datos para que los donantes puedan hacer Yape o depósito.">
        <Input
          label={t('camp.yapeNumber')}
          hint={t('common.optional')}
          placeholder="987 654 321"
          value={yapeNumber}
          onChange={(e) => setYapeNumber(e.target.value)}
        />
        <div style={{ display: 'grid', gap: 'var(--sp-4)', gridTemplateColumns: '1fr 1fr' }}>
          <Input
            label={t('camp.bankName')}
            hint={t('common.optional')}
            placeholder="BCP"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
          />
          <Input
            label={t('camp.bankAccount')}
            hint={t('common.optional')}
            placeholder="191-1234567-0-00"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
          />
        </div>
        <Input
          label={t('camp.accountHolder')}
          hint={t('common.optional')}
          placeholder="Nombre del titular de la cuenta"
          value={accountHolder}
          onChange={(e) => setAccountHolder(e.target.value)}
        />
        <Input
          label="QR de pago (URL de imagen)"
          hint={t('common.optional')}
          placeholder="https://…/qr.png"
          value={qrImageUrl}
          onChange={(e) => setQrImageUrl(e.target.value)}
        />
        {qrImageUrl.trim() && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrImageUrl} alt="QR de pago" style={{ width: 140, height: 140, objectFit: 'contain', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }} />
        )}
      </Section>

      {/* 4. Voluntarios */}
      <Section title="Voluntarios que buscas" hint="Opcional. Marca las habilidades que necesitas para tu campaña.">
        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          {SKILLS.map((sk) => (
            <Chip key={sk.value} active={skills.includes(sk.value)} onClick={() => toggleSkill(sk.value)}>
              {sk.label}
            </Chip>
          ))}
        </div>
      </Section>

      {/* 5. Centro de acopio (opcional, solo al crear) */}
      {!isEdit && (
        <Section title="Centro de acopio" hint="¿Recibirás donaciones en especie? Regístralo ahora o hazlo después.">
          <Checkbox checked={addCenter} onChange={setAddCenter}>
            Registrar un centro de acopio ahora
          </Checkbox>
          {addCenter && (
            <>
              <Input
                label="Nombre del centro"
                placeholder="Acopio Las Lomas"
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
              />
              <Input
                label="Dirección"
                placeholder="Av. Principal 123, Yura"
                value={centerAddress}
                onChange={(e) => setCenterAddress(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                <Button variant="subtle" size="sm" icon="location" loading={geo.loading} onClick={useMyLocation}>
                  Usar mi ubicación
                </Button>
                <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                  <Icon name="pin" size={14} />
                  {centerCoords
                    ? `${centerCoords.lat.toFixed(4)}, ${centerCoords.lng.toFixed(4)}`
                    : 'Sin ubicación (se usará Arequipa)'}
                </span>
              </div>
            </>
          )}
        </Section>
      )}

      <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        <Button block size="lg" variant="gold" icon="spark" loading={busy} disabled={!valid} onClick={() => save('ACTIVE')}>
          {isEdit ? t('common.save') : t('camp.publish')}
        </Button>
        {!isEdit && (
          <Button variant="ghost" disabled={!valid || busy} onClick={() => save('DRAFT')}>
            {t('camp.saveDraft')}
          </Button>
        )}
      </div>
    </div>
  );
}
