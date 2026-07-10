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
  useToast,
} from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';
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
import type { Center, CenterStatus } from '../../lib/types';
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
              {c.district && <div className={s.muted}>{c.district}</div>}
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
        {detail.openingHours && (
          <div className={s.hoursLine}>
            <Icon name="clock" size={14} />
            <span>{detail.openingHours}</span>
          </div>
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
      {addOpen && <AddItemModal centerId={detail.id} onClose={() => setAddOpen(false)} />}
    </>
  );
}

function CreateCenterModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const createCenter = useCreateCenter();
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError('Ingresa el nombre del centro.');
      return;
    }
    setError(null);
    try {
      await createCenter.mutateAsync({
        name: name.trim(),
        district: district.trim() || undefined,
        address: address.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        openingHours: openingHours.trim() || undefined,
        capacity,
        lat: lat.trim() ? Number(lat) : undefined,
        lng: lng.trim() ? Number(lng) : undefined,
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
          <Button icon="plus" onClick={submit} loading={createCenter.isPending}>
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
        <div className={s.formRow2}>
          <Input label="Distrito" hint={t('common.optional')} value={district} onChange={(e) => setDistrict(e.target.value)} />
          <NumberStepper value={capacity} onChange={setCapacity} min={1} max={999999} label={t('mgr.capacity')} />
        </div>
        <Input
          label={t('mgr.address')}
          hint={t('common.optional')}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
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

function AddItemModal({ centerId, onClose }: { centerId: string; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const { data: categories } = useCategories();
  const createItem = useCreateInventoryItem();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = [
    { value: '', label: 'Selecciona categoría' },
    ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

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
      await createItem.mutateAsync({
        centerId,
        body: {
          name: name.trim(),
          categoryId,
          quantity,
          unit: unit.trim() || undefined,
          expiresAt: expiresAt || undefined,
        },
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
      title="Agregar artículo al inventario"
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button icon="plus" onClick={submit} loading={createItem.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className={s.formGrid}>
        {error && <Banner tone="error">{error}</Banner>}
        <Input
          label="Artículo"
          placeholder="Ej. Frazadas de lana"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <Select
          label="Categoría"
          options={categoryOptions}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        />
        <div className={s.formRow2}>
          <NumberStepper value={quantity} onChange={setQuantity} min={1} max={99999} label={t('donate.quantity')} />
          <Input label="Unidad" hint={t('common.optional')} placeholder="uds, kg, L" value={unit} onChange={(e) => setUnit(e.target.value)} />
        </div>
        <Input
          label="Vence"
          hint={t('common.optional')}
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
        <Banner tone="info">Sin QR: se genera el código del artículo automáticamente.</Banner>
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
