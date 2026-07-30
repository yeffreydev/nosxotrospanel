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
import { AQP, coordsFromMapUrl, isHttpUrl, loadPeruUbigeo, mapUrlFromCoords } from '../../lib/geo';
import type { PeruUbigeo } from '../../lib/geo';
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
  const [deadline, setDeadline] = useState('');

  // Meta de recaudación (obligatoria, mínimo 10,000 soles)
  const MIN_GOAL = 10000;
  const [goalAmount, setGoalAmount] = useState<number | ''>('');

  // Ubicación de la campaña: con ella el backend crea la "zona principal".
  // Región/provincia/distrito se eligen de un selector (no texto libre); se
  // guardan como código mientras se edita y se traducen a nombre recién al
  // enviar, porque el backend solo entiende el nombre en texto plano.
  const [ubigeo, setUbigeo] = useState<PeruUbigeo | null>(null);
  const [regionCode, setRegionCode] = useState('');
  const [provinciaCode, setProvinciaCode] = useState('');
  const [distritoCode, setDistritoCode] = useState('');
  const [address, setAddress] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coordsSource, setCoordsSource] = useState<'gps' | 'link' | null>(null);

  // Voluntarios que busca
  const [skills, setSkills] = useState<string[]>([]);
  const [volunteerGoal, setVolunteerGoal] = useState<number | ''>('');

  // Información de pago (Yape / depósito bancario)
  const [yapeNumber, setYapeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [cci, setCci] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');

  // Centro de acopio (opcional, solo al crear)
  const [addCenter, setAddCenter] = useState(false);
  const [centerName, setCenterName] = useState('');
  const [centerAddress, setCenterAddress] = useState('');
  const [centerMapUrl, setCenterMapUrl] = useState('');
  const [centerPhoto, setCenterPhoto] = useState('');
  // Por defecto el centro está en la misma ubicación que la campaña: es lo
  // normal y evita pedir dos veces el mismo enlace.
  const [centerSameLocation, setCenterSameLocation] = useState(true);

  const [error, setError] = useState('');
  // Los errores por campo aparecen recién al intentar guardar: no tiene sentido
  // marcar en rojo un formulario que el organizador aún no llenó.
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    loadPeruUbigeo().then(setUbigeo);
  }, []);

  // La campaña guarda región/provincia/distrito como nombre (texto), pero el
  // selector trabaja con códigos: recién con el árbol cargado se puede buscar
  // a qué código corresponde cada nombre guardado.
  useEffect(() => {
    if (!existing || !ubigeo) return;
    const region = ubigeo.regiones.find((r) => r.name === existing.region);
    const provincia = ubigeo.provincias.find(
      (p) => p.name === existing.province && (!region || p.region === region.code),
    );
    const distrito = ubigeo.distritos.find(
      (d) => d.name === existing.district && (!provincia || d.province === provincia.code),
    );
    setRegionCode(region?.code ?? '');
    setProvinciaCode(provincia?.code ?? '');
    setDistritoCode(distrito?.code ?? '');
  }, [existing, ubigeo]);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setSummary(existing.summary);
      setStory(existing.story);
      setCategory(existing.category);
      setCoverPhoto(existing.coverPhoto ?? '');
      setDeadline(existing.deadline ? existing.deadline.slice(0, 10) : '');
      setGoalAmount(existing.goalAmount ?? '');
      setSkills(existing.volunteerSkills ?? []);
      setVolunteerGoal(existing.volunteerGoal ?? '');
      setAddress(existing.address ?? '');
      setMapUrl(existing.mapUrl ?? '');
      if (existing.lat != null && existing.lng != null) {
        setCoords({ lat: existing.lat, lng: existing.lng });
        setCoordsSource('link');
      }
      setYapeNumber(existing.yapeNumber ?? '');
      setBankName(existing.bankName ?? '');
      setBankAccount(existing.bankAccount ?? '');
      setCci(existing.cci ?? '');
      setAccountHolder(existing.accountHolder ?? '');
      setQrImageUrl(existing.qrImageUrl ?? '');
    }
  }, [existing]);

  function toggleSkill(v: string) {
    setSkills((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  }

  // Provincia depende de la región elegida; distrito depende de la provincia.
  // Al cambiar un nivel se limpian los de abajo: si no, quedaría un distrito
  // de una región que ya no es la seleccionada.
  const regionOptions = (ubigeo?.regiones ?? []).map((r) => ({ value: r.code, label: r.name }));
  const provinciaOptions = (ubigeo?.provincias ?? [])
    .filter((p) => p.region === regionCode)
    .map((p) => ({ value: p.code, label: p.name }));
  const distritoOptions = (ubigeo?.distritos ?? [])
    .filter((d) => d.province === provinciaCode)
    .map((d) => ({ value: d.code, label: d.name }));

  function onRegionChange(value: string) {
    setRegionCode(value);
    setProvinciaCode('');
    setDistritoCode('');
  }

  function onProvinciaChange(value: string) {
    setProvinciaCode(value);
    setDistritoCode('');
  }

  async function useMyLocation() {
    try {
      const c = await geo.locate();
      setCoords(c);
      setCoordsSource('gps');
      // Sin enlace propio, generamos uno con las coordenadas: el donante abre
      // la ruta en su app y el organizador puede verificar el pin.
      if (!mapUrl.trim()) setMapUrl(mapUrlFromCoords(c.lat, c.lng));
      toast.success('Ubicación capturada');
    } catch {
      toast.warn('No se pudo obtener tu ubicación. Escribe la dirección o pega un enlace del mapa.');
    }
  }

  function onMapUrlChange(value: string) {
    setMapUrl(value);
    const parsed = coordsFromMapUrl(value);
    if (parsed) {
      setCoords(parsed);
      setCoordsSource('link');
    } else if (coordsSource === 'link') {
      // El enlace del que salieron las coordenadas ya no está: dejan de ser válidas.
      setCoords(null);
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
  goalAmount: !(typeof goalAmount === 'number' && goalAmount > MIN_GOAL)
    ? `La meta de recaudación debe ser al menos ${MIN_GOAL} Soles`
    : '',
  mapUrl: mapUrl.trim() && !isHttpUrl(mapUrl.trim())
    ? 'Pega un enlace completo del mapa, empezando con https://'
    : '',
  volunteerGoal: volunteerGoal !== '' && !(typeof volunteerGoal === 'number' && volunteerGoal > 0)
    ? 'La meta de voluntarios debe ser mayor a 0.'
    : '',
  centerName: addCenter && centerName.trim().length < 2 ? 'Ponle un nombre al centro.' : '',
  centerAddress: addCenter && centerAddress.trim().length < 2 ? 'Escribe la dirección del centro.' : '',
  centerMapUrl:
    addCenter && !centerSameLocation && centerMapUrl.trim() && !isHttpUrl(centerMapUrl.trim())
      ? 'Pega un enlace completo, empezando con https://'
      : '',
};
  const firstError = Object.values(errors).find(Boolean) ?? '';
  const err = (field: string) => (showErrors ? errors[field] || undefined : undefined);

  // Sin `status` el PATCH no lo toca. Al editar se omite a propósito: el estado
  // se cambia desde Ajustes, y mandarlo aquí republicaba en silencio una campaña
  // pausada o cancelada solo por guardar un cambio de texto.
  function buildBody(status?: 'DRAFT' | 'ACTIVE'): CreateCampaignBody {
    return {
      title: title.trim(),
      summary: summary.trim(),
      story: story.trim(),
      category,
      goalAmount: typeof goalAmount === 'number' ? goalAmount : MIN_GOAL,
      volunteerSkills: skills.length ? skills : undefined,
      volunteerGoal: typeof volunteerGoal === 'number' && volunteerGoal > 0 ? volunteerGoal : undefined,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      region: ubigeo?.regiones.find((r) => r.code === regionCode)?.name,
      province: ubigeo?.provincias.find((p) => p.code === provinciaCode)?.name,
      district: ubigeo?.distritos.find((d) => d.code === distritoCode)?.name,
      address: address.trim() || undefined,
      mapUrl: mapUrl.trim() || undefined,
      lat: coords?.lat,
      lng: coords?.lng,
      coverPhoto: coverPhoto.trim() || undefined,
      yapeNumber: yapeNumber.trim() || undefined,
      bankName: bankName.trim() || undefined,
      bankAccount: bankAccount.trim() || undefined,
      cci: cci.trim() || undefined,
      accountHolder: accountHolder.trim() || undefined,
      qrImageUrl: qrImageUrl.trim() || undefined,
      ...(status ? { status } : {}),
    };
  }

  async function maybeCreateCenter(campaignId: string) {
    if (isEdit || !addCenter) return;
    const link = centerSameLocation ? mapUrl.trim() : centerMapUrl.trim();
    const centerCoords =
      (centerSameLocation ? coords : coordsFromMapUrl(centerMapUrl.trim())) ?? coords ?? AQP;
    try {
      await createCenter.mutateAsync({
        name: centerName.trim(),
        address: centerAddress.trim(),
        mapUrl: link && isHttpUrl(link) ? link : undefined,
        photoUrl: centerPhoto.trim() || undefined,
        lat: centerCoords.lat,
        lng: centerCoords.lng,
        campaignId,
      });
    } catch {
      // No bloquea la campaña; el centro se puede crear luego.
      toast.warn('La campaña se creó, pero el centro de acopio no. Puedes crearlo luego.');
    }
  }

  async function save(status?: 'DRAFT' | 'ACTIVE') {
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
        <Input
          label={t('camp.fieldDeadline')}
          hint={t('common.optional')}
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </Section>

      {/* 2. Ubicación: se convierte en la zona principal de la campaña */}
      <Section
        title="¿Dónde se trabaja?"
        hint="Elige región, provincia y distrito, y con esta ubicación se crea sola la zona principal de tu campaña, donde luego despachas la ayuda."
      >
        <div style={{ display: 'grid', gap: 'var(--sp-4)', gridTemplateColumns: '1fr 1fr 1fr' }}>
          <Select
            label="Región"
            hint={t('common.optional')}
            placeholder={ubigeo ? 'Elige región' : 'Cargando...'}
            options={regionOptions}
            value={regionCode}
            disabled={!ubigeo}
            onChange={(e) => onRegionChange(e.target.value)}
          />
          <Select
            label="Provincia"
            hint={t('common.optional')}
            placeholder={regionCode ? 'Elige provincia' : 'Elige región primero'}
            options={provinciaOptions}
            value={provinciaCode}
            disabled={!regionCode}
            onChange={(e) => onProvinciaChange(e.target.value)}
          />
          <Select
            label="Distrito"
            hint={t('common.optional')}
            placeholder={provinciaCode ? 'Elige distrito' : 'Elige provincia primero'}
            options={distritoOptions}
            value={distritoCode}
            disabled={!provinciaCode}
            onChange={(e) => setDistritoCode(e.target.value)}
          />
        </div>
        <Input
          label="Dirección o referencia"
          hint={t('common.optional')}
          placeholder="Av. Principal 123, Yura · frente al mercado"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <Input
          label="Enlace del mapa"
          hint={t('common.optional')}
          type="url"
          inputMode="url"
          placeholder="https://maps.google.com/..."
          value={mapUrl}
          error={err('mapUrl')}
          onChange={(e) => onMapUrlChange(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="subtle" size="sm" icon="location" loading={geo.loading} onClick={useMyLocation}>
            Usar mi ubicación actual
          </Button>
          {mapUrl.trim() && isHttpUrl(mapUrl.trim()) && (
            <a
              href={mapUrl.trim()}
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
            color: coords ? 'var(--text-muted)' : 'var(--warn-500)',
            display: 'inline-flex',
            gap: 4,
            alignItems: 'center',
          }}
        >
          <Icon name="pin" size={14} />
          {coords
            ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} · ${
                coordsSource === 'gps' ? 'tu ubicación' : 'del enlace'
              }`
            : 'Sin coordenadas: no habrá pin, pero el mapa zonifica el distrito elegido.'}
        </span>
      </Section>

      {/* 2. Meta de recaudación (obligatoria) */}
      <Section title="Meta de recaudación" hint="Tu campaña debe tener una meta mínima de 10,000 Soles.">
        <Input
          required
          label={t('camp.fieldGoal')}
          hint={`mínimo ${MIN_GOAL} Soles`}
          type="number"
          inputMode="numeric"
          min={MIN_GOAL}
          prefix="S/"
          placeholder="10000"
          value={goalAmount}
          error={err('goalAmount')}
          onChange={(e) => setGoalAmount(e.target.value === '' ? '' : Number(e.target.value))}
        />
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
          label={t('camp.cci')}
          hint={t('common.optional')}
          placeholder="002-191-001234567890-12"
          value={cci}
          onChange={(e) => setCci(e.target.value)}
        />
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
      <Section title="Voluntarios que buscas" hint="Opcional. Marca las habilidades que necesitas y cuántas personas.">
        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          {SKILLS.map((sk) => (
            <Chip key={sk.value} active={skills.includes(sk.value)} onClick={() => toggleSkill(sk.value)}>
              {sk.label}
            </Chip>
          ))}
        </div>
        <Input
          label="Meta de voluntarios"
          hint={`${t('common.optional')} · cuántas personas necesitas`}
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="20"
          value={volunteerGoal}
          error={err('volunteerGoal')}
          onChange={(e) => setVolunteerGoal(e.target.value === '' ? '' : Number(e.target.value))}
        />
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
              <ImageUpload
                label="Foto del centro"
                hint={`${t('common.optional')} · así el donante reconoce el local al llegar`}
                value={centerPhoto}
                onChange={setCenterPhoto}
                previewHeight={160}
              />

              <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
                <Checkbox checked={centerSameLocation} onChange={setCenterSameLocation}>
                  Está en la misma ubicación de la campaña
                </Checkbox>
                {centerSameLocation ? (
                  <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
                    Usará el enlace y el pin que pusiste arriba en «¿Dónde se trabaja?».
                  </p>
                ) : (
                  <>
                    <Input
                      label="Enlace del mapa del centro"
                      hint={t('common.optional')}
                      type="url"
                      inputMode="url"
                      placeholder="https://maps.google.com/..."
                      value={centerMapUrl}
                      error={err('centerMapUrl')}
                      onChange={(e) => setCenterMapUrl(e.target.value)}
                    />
                    <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
                      Pega el enlace de Google Maps o Waze del centro. Si trae coordenadas, el pin se
                      ubica solo; si no, se usará el de la campaña.
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </Section>
      )}

      {/* Los botones nunca se deshabilitan por validación: al pulsarlos se marcan
          los campos que faltan. Un botón muerto sin explicación deja al
          organizador sin saber qué corregir. */}
      <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        <Button
          block
          size="lg"
          variant="gold"
          icon="spark"
          loading={busy}
          onClick={() => save(isEdit ? undefined : 'ACTIVE')}
        >
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
