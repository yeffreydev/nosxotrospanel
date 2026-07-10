import { useState } from 'react';
import {
  Card,
  Button,
  IconButton,
  Input,
  Select,
  NumberStepper,
  Banner,
  EmptyState,
  SkeletonCard,
  Modal,
  useToast,
} from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';
import {
  useDispatches,
  useCreateDispatch,
  useUpdateDispatchStatus,
  useCenters,
  useEmergencies,
} from '../../hooks/api';
import { useT } from '../../lib/i18n';
import { apiErrorMessage } from '../../lib/api';
import type { DispatchItem, DispatchStatus } from '../../lib/types';
import s from './manager.module.css';

const NEXT_STATUS: Partial<Record<DispatchStatus, DispatchStatus>> = {
  PREPARING: 'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERED',
};

export function DispatchesTab() {
  const t = useT();
  const { data, isLoading } = useDispatches();
  const advance = useUpdateDispatchStatus();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);

  const onAdvance = async (id: string, status: DispatchStatus) => {
    const next = NEXT_STATUS[status];
    if (!next) return;
    try {
      await advance.mutateAsync({ id, status: next });
      toast.success(t('toast.saved'));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <div className={s.toolbar}>
        <div className={s.toolbarSpacer} />
        <Button icon="plus" onClick={() => setFormOpen(true)}>
          {t('mgr.newDispatch')}
        </Button>
      </div>

      {isLoading ? (
        <div className={s.cardGrid}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon="truck" title="Sin despachos" message="Crea un despacho para mover ayuda a su destino." />
      ) : (
        <div className={s.cardGrid}>
          {(data ?? []).map((d) => (
            <Card key={d.id}>
              <div className={s.rowBetween}>
                <strong>{d.fromCenter?.name ?? 'Centro'}</strong>
                <StatusBadge status={d.status} />
              </div>
              {d.destAddress && <div className={s.muted}>→ {d.destAddress}</div>}
              {d.driverName && <div className={s.muted}>Conductor: {d.driverName}</div>}
              <div className={s.muted} style={{ marginTop: 6 }}>
                {d.items?.length ?? 0} ítems
              </div>
              {NEXT_STATUS[d.status] && (
                <div className={s.cardActions}>
                  <Button
                    size="sm"
                    icon="arrowRight"
                    loading={advance.isPending}
                    onClick={() => onAdvance(d.id, d.status)}
                  >
                    {t('mgr.advanceStatus')}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {formOpen && <DispatchForm onClose={() => setFormOpen(false)} />}
    </div>
  );
}

function DispatchForm({ onClose }: { onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const create = useCreateDispatch();
  const { data: centers } = useCenters();
  const { data: emergencies } = useEmergencies();
  const [fromCenterId, setFromCenterId] = useState('');
  const [emergencyId, setEmergencyId] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [driverName, setDriverName] = useState('');
  const [items, setItems] = useState<DispatchItem[]>([{ description: '', quantity: 1 }]);
  const [error, setError] = useState<string | null>(null);

  const setItem = (idx: number, patch: Partial<DispatchItem>) =>
    setItems((cur) => cur.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = () => setItems((cur) => [...cur, { description: '', quantity: 1 }]);
  const removeItem = (idx: number) => setItems((cur) => cur.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!fromCenterId) {
      setError('Selecciona un centro de origen.');
      return;
    }
    const cleanItems = items.filter((it) => it.description.trim());
    if (cleanItems.length === 0) {
      setError('Agrega al menos un ítem.');
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        fromCenterId,
        emergencyId: emergencyId || undefined,
        destAddress: destAddress || undefined,
        driverName: driverName || undefined,
        items: cleanItems,
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
      size="lg"
      title={t('mgr.newDispatch')}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button icon="truck" onClick={submit} loading={create.isPending}>
            {t('common.create')}
          </Button>
        </>
      }
    >
      <div className={s.formGrid}>
        {error && <Banner tone="error">{error}</Banner>}
        <div className={s.formRow2}>
          <Select
            label="Centro de origen"
            placeholder="Selecciona…"
            value={fromCenterId}
            onChange={(e) => setFromCenterId(e.target.value)}
            options={(centers ?? []).map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            label="Emergencia"
            placeholder="Opcional"
            value={emergencyId}
            onChange={(e) => setEmergencyId(e.target.value)}
            options={(emergencies ?? []).map((e) => ({ value: e.id, label: e.title }))}
          />
        </div>
        <div className={s.formRow2}>
          <Input label="Dirección destino" value={destAddress} onChange={(e) => setDestAddress(e.target.value)} />
          <Input label="Conductor" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
        </div>

        <div>
          <div className={s.rowBetween} style={{ marginBottom: 'var(--sp-2)' }}>
            <strong>Ítems</strong>
            <Button size="sm" variant="ghost" icon="plus" onClick={addItem}>
              Agregar
            </Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {items.map((it, i) => (
              <div className={s.itemRow} key={i}>
                <Input
                  label={i === 0 ? 'Descripción' : undefined}
                  value={it.description}
                  onChange={(e) => setItem(i, { description: e.target.value })}
                  placeholder="Ej. Cajas de agua"
                />
                <NumberStepper
                  value={it.quantity}
                  onChange={(v) => setItem(i, { quantity: v })}
                  min={1}
                  max={99999}
                  label={i === 0 ? 'Cant.' : undefined}
                />
                {items.length > 1 && (
                  <IconButton icon="close" label="Quitar ítem" onClick={() => removeItem(i)} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
