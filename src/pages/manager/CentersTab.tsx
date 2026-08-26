import { useState } from 'react';
import {
  Card,
  CardButton,
  Button,
  ProgressBar,
  Modal,
  Input,
  Select,
  NumberStepper,
  SegmentedControl,
  Banner,
  EmptyState,
  SkeletonCard,
  CenteredSpinner,
  Icon,
  ImageUpload,
  useToast,
} from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';
import { CentersSummary } from '../../components/CentersSummary';
import {
  useCenters,
  useCenter,
  useScanInventory,
  useCategories,
  useCreateInventoryItem,
  useCreateCenter,
} from '../../hooks/api';
import { useT } from '../../lib/i18n';
import { apiErrorMessage } from '../../lib/api';
import { NEED_UNITS, normalizeItemName } from '../../lib/format';
import { AQP, coordsFromMapUrl, isHttpUrl } from '../../lib/geo';
import type { Center, CenterStatus, InventoryItem } from '../../lib/types';
import s from './manager.module.css';

type Tone = 'brand' | 'gold' | 'warn' | 'danger';
function loadTone(status: CenterStatus): Tone {
  if (status === 'FULL') return 'danger';
  if (status === 'NEAR_FULL') return 'gold';
  if (status === 'CLOSED') return 'warn';
  return 'brand';
}


export function CentersTab() {
  const t = useT();
  const { data, isLoading } = useCenters();
  const [selected, setSelected] = useState<Center | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading) {
    return (
      <div className={s.cardGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const centers = data ?? [];

  return (
    <>
      <CentersSummary />
      <div className={s.toolbar}>
        <div className={s.toolbarSpacer} />
        <Button icon="plus" onClick={() => setCreateOpen(true)}>
          Nuevo centro
        </Button>
      </div>
      {centers.length === 0 ? (
        <EmptyState icon="box" title="Sin centros" message="Aún no hay centros de acopio registrados." />
      ) : (
        <div className={s.cardGrid}>
          {centers.map((c) => (
            <CardButton key={c.id} onClick={() => setSelected(c)}>
              <div className={s.rowBetween}>
                <strong>{c.name}</strong>
                <StatusBadge status={c.status} />
              </div>
              {c.photoUrl && (
                <img
                  src={c.photoUrl}
                  alt={c.name}
                  style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 'var(--r-md)', margin: '6px 0' }}
                />
              )}
              {c.address && <div className={s.muted}>{c.address}</div>}
              {c.reference && <div className={s.muted}>{c.reference}</div>}
              {c.openingHours && (
                <div className={s.hoursLine}>
                  <Icon name="clock" size={14} />
                  <span>{c.openingHours}</span>
                </div>
              )}
              <div style={{ marginTop: 'var(--sp-4)' }}>
                <ProgressBar
                  value={c.loadPct}
                  tone={loadTone(c.status)}
                  label={t('mgr.load')}
                  rightLabel={`${c.currentLoad}/${c.capacity}`}
                />
              </div>
            </CardButton>
          ))}
        </div>
      )}
      {selected && <CenterModal center={selected} onClose={() => setSelected(null)} />}
      {createOpen && <CreateCenterModal onClose={() => setCreateOpen(false)} />}
    </>
  );
}

function CenterModal({ center, onClose }: { center: Center; onClose: () => void }) {
  const t = useT();
  const { data, isLoading } = useCenter(center.id);
  const [scanOpen, setScanOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const detail = data ?? center;

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="lg"
        title={detail.name}
        footer={
          <>
            <Button variant="subtle" icon="download" onClick={() => window.print()}>
              {t('mgr.printInventory')}
            </Button>
            <Button variant="subtle" icon="qr" onClick={() => setScanOpen(true)}>
              {t('mgr.scan')}
            </Button>
            <Button icon="plus" onClick={() => setAddOpen(true)}>
              Agregar artículo
            </Button>
          </>
        }
      >
        <div className={s.rowBetween} style={{ marginBottom: 'var(--sp-4)' }}>
          <StatusBadge status={detail.status} />
          <span className={s.muted}>
            {detail.currentLoad}/{detail.capacity} · {detail.loadPct}%
          </span>
        </div>
        {detail.photoUrl && (
          <img
            src={detail.photoUrl}
            alt={detail.name}
            style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-3)' }}
          />
        )}
        {detail.address && <div className={s.muted}>{detail.address}</div>}
        {detail.reference && <div className={s.muted}>{detail.reference}</div>}
        {detail.openingHours && (
          <div className={s.hoursLine}>
            <Icon name="clock" size={14} />
            <span>{detail.openingHours}</span>
          </div>
        )}
        {detail.mapUrl && (
          <a
            href={detail.mapUrl}
            target="_blank"
            rel="noreferrer noopener"
            style={{ display: 'inline-flex', gap: 4, alignItems: 'center', margin: '6px 0', color: 'var(--brand-700)', fontWeight: 'var(--fw-bold)', fontSize: 'var(--fs-sm)' }}
          >
            <Icon name="map" size={14} /> Cómo llegar
          </a>
        )}
        <ProgressBar value={detail.loadPct} tone={loadTone(detail.status)} showPct={false} />
        <div className="nx-print-area">
          <h4 style={{ margin: 'var(--sp-5) 0 var(--sp-3)' }}>
            {detail.name} · {t('mgr.inventory')}
          </h4>
          {isLoading ? (
            <CenteredSpinner />
          ) : detail.inventoryByCategory && detail.inventoryByCategory.length > 0 ? (
            detail.inventoryByCategory.map((group) => (
              <div className={s.invGroup} key={group.categoryId}>
                <div className={s.cardTitle} style={{ marginBottom: 'var(--sp-2)' }}>
                  {group.category} · {group.totalQuantity}
                </div>
                {group.items.map((item) => (
                  <div className={s.invItem} key={item.id}>
                    <span>
                      {item.name} <span className={s.sku}>{item.sku}</span>
                    </span>
                    <strong>
                      {item.quantity}
                      {item.unit ? ` ${item.unit}` : ''}
                    </strong>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <EmptyState icon="box" title="Inventario vacío" />
          )}
        </div>
      </Modal>
      {scanOpen && <ScannerModal onClose={() => setScanOpen(false)} />}
      {addOpen && (
        <AddItemModal
          centerId={detail.id}
          inventory={(detail.inventoryByCategory ?? []).flatMap((g) => g.items)}
          onClose={() => setAddOpen(false)}
        />
      )}
    </>
  );
}

function CreateCenterModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const createCenter = useCreateCenter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  // El pin del centro sale, en este orden, de: lo escrito a mano, las coordenadas
  // que trae el enlace del mapa, o el centro de Arequipa como último recurso.
  const link = mapUrl.trim();
  const fromLink = link ? coordsFromMapUrl(link) : null;
  const manual =
    lat.trim() && lng.trim() && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
      ? { lat: Number(lat), lng: Number(lng) }
      : null;
  const coords = manual ?? fromLink;

  const submit = async () => {
    if (!name.trim()) {
      setError('Ingresa el nombre del centro.');
      return;
    }
    // La dirección es obligatoria: es lo que ve el donante para llegar.
    if (address.trim().length < 2) {
      setError('Ingresa la dirección del centro: es lo que el donante necesita para llegar.');
      return;
    }
    if (link && !isHttpUrl(link)) {
      setError('Pega un enlace completo del mapa, empezando con https://');
      return;
    }
    setError(null);
    try {
      await createCenter.mutateAsync({
        name: name.trim(),
        address: address.trim(),
        reference: reference.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        openingHours: openingHours.trim() || undefined,
        mapUrl: link || undefined,
        photoUrl: photoUrl.trim() || undefined,
        capacity,
        lat: coords?.lat ?? AQP.lat,
        lng: coords?.lng ?? AQP.lng,
      });
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
      title="Nuevo centro de acopio"
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            icon="plus"
            disabled={!name.trim() || address.trim().length < 2}
            onClick={submit}
            loading={createCenter.isPending}
          >
            {t('common.create')}
          </Button>
        </>
      }
    >
      <div className={s.formGrid}>
        {error && <Banner tone="error">{error}</Banner>}
        <Input
          label="Nombre"
          placeholder="Ej. Centro de acopio Miraflores"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <Input
          label={t('mgr.address')}
          placeholder="Av. Principal 100"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <NumberStepper value={capacity} onChange={setCapacity} min={1} max={999999} label={t('mgr.capacity')} />
        <Input
          label="Teléfono de contacto"
          hint={t('common.optional')}
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
        />
        <Input
          label={t('mgr.hours')}
          hint={t('common.optional')}
          placeholder={t('mgr.hoursPlaceholder')}
          value={openingHours}
          onChange={(e) => setOpeningHours(e.target.value)}
        />
        <Input
          label="Referencia"
          hint={t('common.optional')}
          placeholder="Frente al mercado central"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        <Input
          label="Enlace del mapa"
          hint="Google Maps o Waze · el donante abre la ruta desde aquí"
          type="url"
          inputMode="url"
          placeholder="https://maps.google.com/..."
          value={mapUrl}
          onChange={(e) => setMapUrl(e.target.value)}
        />
        {/* El organizador no tiene que saber de coordenadas: se le dice dónde
            va a quedar el pin y con qué dato se calculó. */}
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
          {coords
            ? `Pin del centro: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}${manual ? '' : ' (tomado del enlace)'}`
            : 'Sin coordenadas: el pin quedará en el centro de Arequipa. Pega un enlace de Google Maps o escribe lat/lng para ubicarlo exacto.'}
        </span>
        <ImageUpload
          label="Foto del centro"
          hint={`${t('common.optional')} · ayuda a reconocer el local`}
          value={photoUrl}
          onChange={setPhotoUrl}
          previewHeight={160}
        />
        <div className={s.formRow2}>
          <Input
            label={`${t('mgr.exactLocation')} · lat`}
            hint={t('common.optional')}
            type="number"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
          <Input
            label="lng"
            hint={t('common.optional')}
            type="number"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

function AddItemModal({
  centerId,
  inventory,
  onClose,
}: {
  centerId: string;
  inventory: InventoryItem[];
  onClose: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const { data: categories } = useCategories();
  const createItem = useCreateInventoryItem();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = [
    { value: '', label: 'Selecciona categoría' },
    ...(categories ?? []).map((c) => ({ value: c.id, label: `${c.icon ? `${c.icon} ` : ''}${c.name}` })),
  ];
  const category = (categories ?? []).find((c) => c.id === categoryId);
  const unitValue = unit || category?.unit || 'unidad';

  // Mismo criterio que el backend: el producto es su nombre normalizado + unidad.
  // Así se avisa ANTES de guardar que la cantidad va a sumarse a lo que ya hay.
  const existing = inventory.find(
    (i) => normalizeItemName(i.name) === normalizeItemName(name) && (i.unit ?? 'unidad') === unitValue,
  );

  const submit = async () => {
    if (!name.trim()) {
      setError('Ingresa el nombre del artículo.');
      return;
    }
    if (!categoryId) {
      setError('Selecciona una categoría.');
      return;
    }
    setError(null);
    try {
      const saved = await createItem.mutateAsync({
        centerId,
        body: {
          name: name.trim(),
          categoryId,
          quantity,
          unit: unitValue,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          note: note.trim() || undefined,
        },
      });
      toast.success(
        saved.merged
          ? `Sumado: ${saved.name} ahora tiene ${saved.quantity} ${saved.unit ?? ''}`.trim()
          : t('toast.saved'),
      );
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Agregar artículo al inventario"
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button icon="plus" onClick={submit} loading={createItem.isPending}>
            {existing ? 'Sumar' : t('common.save')}
          </Button>
        </>
      }
    >
      <div className={s.formGrid}>
        {error && <Banner tone="error">{error}</Banner>}
        {/* Política de plataforma: el backend también lo rechaza. */}
        <Banner tone="warn">
          No se reciben medicamentos: no registres fármacos en el inventario
          (los botiquines de primeros auxilios sí se aceptan).
        </Banner>
        <Input
          label="Artículo"
          placeholder="Ej. Frazadas de lana"
          list={`items-${centerId}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        {/* Nombres ya en el almacén: elegir uno hace que la cantidad se sume ahí. */}
        <datalist id={`items-${centerId}`}>
          {[...new Set(inventory.map((i) => i.name))].map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <Select
          label="Categoría"
          options={categoryOptions}
          value={categoryId}
          onChange={(e) => {
            const id = e.target.value;
            const cat = (categories ?? []).find((c) => c.id === id);
            setCategoryId(id);
            setUnit((u) => u || cat?.unit || '');
          }}
        />
        <div className={s.formRow2}>
          <NumberStepper value={quantity} onChange={setQuantity} min={1} max={99999} label={t('donate.quantity')} />
          <Select
            label="Unidad de medida"
            value={unitValue}
            onChange={(e) => setUnit(e.target.value)}
            options={[...new Set([unitValue, ...NEED_UNITS])].map((u) => ({ value: u, label: u }))}
          />
        </div>
        <div className={s.formRow2}>
          <Input
            label="Vence"
            hint={t('common.optional')}
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <Input
            label="Nota del ingreso"
            hint={t('common.optional')}
            placeholder="Donación de la parroquia"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        {existing ? (
          <Banner tone="info">
            Ya hay {existing.quantity} {existing.unit ?? 'unidad'} de «{existing.name}»: se sumarán{' '}
            {quantity} y quedará en {existing.quantity + quantity}.
          </Banner>
        ) : (
          <Banner tone="info">
            Sin QR: se genera el código automáticamente. Si el centro ya tiene ese producto con la
            misma unidad, la cantidad se suma al existente en vez de duplicar la línea.
          </Banner>
        )}
      </div>
    </Modal>
  );
}

function ScannerModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const scan = useScanInventory();
  const [sku, setSku] = useState('');
  const [qty, setQty] = useState(1);
  const [type, setType] = useState<'IN' | 'OUT' | 'ADJUST'>('IN');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!sku.trim()) {
      setError('Ingresa el código SKU.');
      return;
    }
    setError(null);
    try {
      await scan.mutateAsync({ sku: sku.trim(), type, quantity: qty, reason: reason || undefined });
      toast.success(t('toast.scanDone'));
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('mgr.scanTitle')}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button icon="qr" onClick={submit} loading={scan.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className={s.formGrid}>
        {error && <Banner tone="error">{error}</Banner>}
        <Input
          label={t('mgr.sku')}
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="NX-SKU-0001"
          autoFocus
        />
        <div>
          <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 6 }}>
            {t('mgr.movementType')}
          </span>
          <SegmentedControl
            value={type}
            onChange={setType}
            options={[
              { value: 'IN', label: t('mgr.in') },
              { value: 'OUT', label: t('mgr.out') },
              { value: 'ADJUST', label: t('mgr.adjust') },
            ]}
          />
        </div>
        <NumberStepper value={qty} onChange={setQty} min={1} max={9999} label={t('donate.quantity')} />
        <Input label="Motivo" hint={t('common.optional')} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </Modal>
  );
}
