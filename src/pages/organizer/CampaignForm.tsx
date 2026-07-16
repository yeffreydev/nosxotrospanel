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
  ImageUpload,
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

// Extrae lat/lng de un enlace de mapa pegado por el organizador. Cubre los
// formatos de Google Maps (@lat,lng / !3dlat!4dlng / ?q=lat,lng) y los de Waze
// y OSM (?ll= / #map=z/lat/lng). Si no coincide, se conserva el enlace igual:
// sirve para abrir la ruta aunque no podamos ubicar el pin en nuestro mapa.
function coordsFromMapUrl(url: string): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/, // google: /@-16.4,-71.5,17z
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, // google: place data
    /[?&](?:q|query|ll|sll|daddr)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, // google/waze: ?q= / ?query= / ?ll=
    /#map=\d+\/(-?\d+\.\d+)\/(-?\d+\.\d+)/, // osm: #map=15/lat/lng
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

function isHttpUrl(value: string): boolean {
  try {
    return /^https?:$/.test(new URL(value).protocol);
  } catch {
    return false;
  }
}

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
  const [centerMapUrl, setCenterMapUrl] = useState('');
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number } | null>(null);
  // De dónde salieron las coordenadas: lo mostramos para que el organizador
  // sepa si el pin es real o el de Arequipa por defecto.
  const [coordsSource, setCoordsSource] = useState<'gps' | 'link' | null>(null);

  const [error, setError] = useState('');
  // Los errores por campo aparecen recién al intentar guardar: no tiene sentido
  // marcar en rojo un formulario que el organizador aún no llenó.
  const [showErrors, setShowErrors] = useState(false);

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
      setCoordsSource('gps');
      // Sin enlace propio, generamos uno con las coordenadas: el donante abre
      // la ruta en su app y el organizador puede verificar el pin.
      if (!centerMapUrl.trim()) {
        setCenterMapUrl(`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`);
      }
      toast.success('Ubicación capturada');
    } catch {
      toast.warn('No se pudo obtener tu ubicación. Escribe la dirección o pega un enlace del mapa.');
    }
  }

  function onMapUrlChange(value: string) {
    setCenterMapUrl(value);
    const parsed = coordsFromMapUrl(value);
    if (parsed) {
      setCenterCoords(parsed);
      setCoordsSource('link');
    } else if (coordsSource === 'link') {
      // El enlace del que salieron las coordenadas ya no está: dejan de ser válidas.
      setCenterCoords(null);
      setCoordsSource(null);
    }
  }

  // Un error por campo. Vacío = campo correcto. Sustituye al antiguo booleano
  // `valid`, que deshabilitaba el botón sin decir qué faltaba.
  const storyLeft = 20 - story.trim().length;
  const errors: Record<string, string> = {
    title: title.trim().length < 4 ? 'El título necesita al menos 4 caracteres.' : '',
    summary: summary.trim().length < 10 ? 'El resumen necesita al menos 10 caracteres.' : '',
    story: storyLeft > 0 ? `La historia necesita ${storyLeft} caracteres más (mínimo 20).` : '',
    goalAmount:
      hasGoal && !(typeof goalAmount === 'number' && goalAmount > 0)
        ? 'Escribe un monto mayor a 0 o desmarca "Fijar una meta".'
        : '',
    centerName: addCenter && centerName.trim().length < 2 ? 'Ponle un nombre al centro.' : '',
    centerAddress: addCenter && centerAddress.trim().length < 2 ? 'Escribe la dirección del centro.' : '',
    centerMapUrl:
      addCenter && centerMapUrl.trim() && !isHttpUrl(centerMapUrl.trim())
        ? 'Pega un enlace completo, empezando con https://'
        : '',
  };
  const firstError = Object.values(errors).find(Boolean) ?? '';
  const err = (field: string) => (showErrors ? errors[field] || undefined : undefined);

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

  async function maybeCreateCenter(campaignId: string) {
    if (isEdit || !addCenter) return;
    const coords = centerCoords ?? AQP;
    try {
      await createCenter.mutateAsync({
        name: centerName.trim(),
        address: centerAddress.trim(),
        mapUrl: centerMapUrl.trim() || undefined,
        lat: coords.lat,
        lng: coords.lng,
        campaignId,
      });
    } catch {
      // No bloquea la campaña; el centro se puede crear luego.
      toast.warn('La campaña se creó, pero el centro de acopio no. Puedes crearlo luego.');
    }
  }

  async function save(status: 'DRAFT' | 'ACTIVE') {
    setShowErrors(true);
    if (firstError) {
      setError(firstError);
      return;
    }
    setError('');
    try {
      if (isEdit && id) {
        await updateCampaign.mutateAsync({ id, body: buildBody(status) });
        toast.success(t('toast.saved'));
        navigate(`/campanas/${existing?.slug ?? ''}`);
      } else {
        const created = await createCampaign.mutateAsync(buildBody(status));
        await maybeCreateCenter(created.id);
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

      <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
        Los campos con <span style={{ color: 'var(--danger-600)', fontWeight: 'var(--fw-bold)' }}>*</span> son
        obligatorios.
      </p>

      {error && <Banner tone="error" title={t('common.error')}>{error}</Banner>}

      {/* 1. Tu campaña */}
      <Section title="Tu campaña" hint="Lo esencial para presentar tu proyecto.">
        <Input
          required
          label={t('camp.fieldTitle')}
          hint="mín. 4 caracteres"
          placeholder="Agua potable para 40 familias en Yura"
          value={title}
          error={err('title')}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          required
          label={t('camp.fieldSummary')}
          hint="mín. 10 · máx. 280 caracteres"
          placeholder="Una frase que enganche y explique el impacto."
          value={summary}
          maxLength={280}
          error={err('summary')}
          onChange={(e) => setSummary(e.target.value)}
        />
        <Textarea
          required
          label={t('camp.fieldStory')}
          hint="mín. 20 caracteres"
          rows={6}
          placeholder="Explica el problema, qué harás y a quién ayuda (o cómo crece tu emprendimiento)."
          value={story}
          error={err('story')}
          onChange={(e) => setStory(e.target.value)}
        />
        <Select
          label={t('camp.fieldCategory')}
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(e) => setCategory(e.target.value as CampaignCategory)}
        />
        <ImageUpload
          label={t('camp.fieldCover')}
          hint={t('common.optional')}
          value={coverPhoto}
          onChange={setCoverPhoto}
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
            required
            label={t('camp.fieldGoal')}
            hint="mayor a 0"
            type="number"
            inputMode="numeric"
            min={1}
            prefix="S/"
            placeholder="8000"
            value={goalAmount}
            error={err('goalAmount')}
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
        <ImageUpload
          label="QR de pago"
          hint={t('common.optional')}
          value={qrImageUrl}
          onChange={setQrImageUrl}
          previewHeight={160}
          previewFit="contain"
        />
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
                required
                label="Nombre del centro"
                placeholder="Acopio Las Lomas"
                value={centerName}
                error={err('centerName')}
                onChange={(e) => setCenterName(e.target.value)}
              />
              <Input
                required
                label="Dirección"
                placeholder="Av. Principal 123, Yura"
                value={centerAddress}
                error={err('centerAddress')}
                onChange={(e) => setCenterAddress(e.target.value)}
              />

              <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
                <Input
                  label="Enlace del mapa"
                  hint={t('common.optional')}
                  type="url"
                  inputMode="url"
                  placeholder="https://maps.google.com/..."
                  value={centerMapUrl}
                  error={err('centerMapUrl')}
                  onChange={(e) => onMapUrlChange(e.target.value)}
                />
                <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
                  Pega el enlace de Google Maps o Waze del centro, o comparte tu ubicación actual si
                  estás ahí. Si el enlace trae coordenadas, el pin se ubica solo.
                </p>
                <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button variant="subtle" size="sm" icon="location" loading={geo.loading} onClick={useMyLocation}>
                    Usar mi ubicación actual
                  </Button>
                  {centerMapUrl.trim() && isHttpUrl(centerMapUrl.trim()) && (
                    <a
                      href={centerMapUrl.trim()}
                      target="_blank"
                      rel="noreferrer noopener"
                      style={{
                        fontSize: 'var(--fs-sm)',
                        color: 'var(--brand-700)',
                        fontWeight: 'var(--fw-bold)',
                        display: 'inline-flex',
                        gap: 4,
                        alignItems: 'center',
                      }}
                    >
                      <Icon name="map" size={14} /> Abrir enlace
                    </a>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 'var(--fs-sm)',
                    color: centerCoords ? 'var(--text-muted)' : 'var(--warn-500)',
                    display: 'inline-flex',
                    gap: 4,
                    alignItems: 'center',
                  }}
                >
                  <Icon name="pin" size={14} />
                  {centerCoords
                    ? `${centerCoords.lat.toFixed(4)}, ${centerCoords.lng.toFixed(4)} · ${
                        coordsSource === 'gps' ? 'tu ubicación' : 'del enlace'
                      }`
                    : 'Sin coordenadas: el pin quedará en el centro de Arequipa.'}
                </span>
              </div>
            </>
          )}
        </Section>
      )}

      {/* Los botones nunca se deshabilitan por validación: al pulsarlos se marcan
          los campos que faltan. Un botón muerto sin explicación deja al
          organizador sin saber qué corregir. */}
      <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        <Button block size="lg" variant="gold" icon="spark" loading={busy} onClick={() => save('ACTIVE')}>
          {isEdit ? t('common.save') : t('camp.publish')}
        </Button>
        {!isEdit && (
          <Button variant="ghost" disabled={busy} onClick={() => save('DRAFT')}>
            {t('camp.saveDraft')}
          </Button>
        )}
      </div>
    </div>
  );
}
