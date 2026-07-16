import { useState } from 'react';
import {
  Card,
  Button,
  Select,
  Badge,
  type BadgeTone,
  EmptyState,
  SkeletonCard,
  useToast,
} from '../../components/ui';
import { SeverityBadge } from '../../components/StatusBadge';
import {
  useEmergencyReports,
  useUpdateEmergencyReport,
  useConvertEmergencyReport,
  useEmergencies,
} from '../../hooks/api';
import { useT } from '../../lib/i18n';
import { apiErrorMessage } from '../../lib/api';
import type { EmergencyReport, EmergencyReportStatus } from '../../lib/types';
import s from './manager.module.css';

const STATUS_META: Record<EmergencyReportStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'En revisión', tone: 'warn' },
  REVIEWED: { label: 'Revisado', tone: 'info' },
  CONVERTED: { label: 'Emergencia activada', tone: 'success' },
  REJECTED: { label: 'Descartado', tone: 'danger' },
};

const FILTER_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'En revisión' },
  { value: 'REVIEWED', label: 'Revisados' },
  { value: 'CONVERTED', label: 'Activados' },
  { value: 'REJECTED', label: 'Descartados' },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ReportsTab() {
  const t = useT();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const { data, isLoading } = useEmergencyReports(status ? { status } : undefined);
  const { data: emergencies } = useEmergencies();
  const update = useUpdateEmergencyReport();
  const convert = useConvertEmergencyReport();
  const [busyId, setBusyId] = useState<string | null>(null);

  const latestEmergencies = [...(emergencies ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  async function setReportStatus(r: EmergencyReport, next: EmergencyReportStatus) {
    setBusyId(r.id);
    try {
      await update.mutateAsync({ id: r.id, body: { status: next } });
      toast.success(t('toast.saved'));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function activate(r: EmergencyReport) {
    setBusyId(r.id);
    try {
      await convert.mutateAsync(r.id);
      toast.success('Emergencia activada desde el reporte');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <Card style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ fontWeight: 'var(--fw-bold)', marginBottom: 'var(--sp-2)' }}>
          Últimas emergencias del sistema
        </div>
        {latestEmergencies.length === 0 ? (
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>—</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {latestEmergencies.map((e) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <SeverityBadge severity={e.severity} />
                  <span style={{ fontWeight: 'var(--fw-bold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                  {e.district && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>· {e.district}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {e.mapUrl && (
                    <Button variant="ghost" size="sm" icon="map" aria-label="Mapa" onClick={() => window.open(e.mapUrl, '_blank', 'noopener')} />
                  )}
                  <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)', whiteSpace: 'nowrap' }}>{fmtDate(e.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className={s.toolbar}>
        <Select
          options={FILTER_OPTS}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filtrar por estado"
        />
        <div className={s.toolbarSpacer} />
      </div>

      {isLoading ? (
        <div className={s.cardGrid}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon="alert"
          title="Sin reportes"
          message="Aquí aparecen los reportes ciudadanos de emergencias enviados desde la web."
        />
      ) : (
        <div className={s.cardGrid}>
          {(data ?? []).map((r) => {
            const meta = STATUS_META[r.status];
            const busy = busyId === r.id;
            return (
              <Card key={r.id}>
                <div className={s.rowBetween}>
                  <strong>{r.title}</strong>
                  <SeverityBadge severity={r.severity} />
                </div>
                <div className={s.badgeRow} style={{ marginTop: 6 }}>
                  <Badge tone={meta.tone} dot>
                    {meta.label}
                  </Badge>
                  {r.district && <span className={s.muted}>{r.district}</span>}
                </div>
                <p style={{ margin: 'var(--sp-3) 0', color: 'var(--text-muted)' }}>{r.description}</p>
                <div className={s.muted} style={{ fontSize: '0.8rem' }}>
                  {r.anonymous ? 'Reporte anónimo' : r.reporterName || 'Sin nombre'}
                  {!r.anonymous && r.reporterPhone ? ` · ${r.reporterPhone}` : ''} · {fmtDate(r.createdAt)}
                </div>
                {r.emergency && (
                  <div className={s.muted} style={{ fontSize: '0.8rem', marginTop: 4 }}>
                    → Emergencia: <strong>{r.emergency.title}</strong>
                  </div>
                )}
                {r.status !== 'CONVERTED' && (
                  <div className={s.cardActions}>
                    <Button size="sm" icon="fire" loading={busy} onClick={() => activate(r)}>
                      Activar emergencia
                    </Button>
                    {r.status === 'PENDING' && (
                      <Button
                        variant="subtle"
                        size="sm"
                        loading={busy}
                        onClick={() => setReportStatus(r, 'REVIEWED')}
                      >
                        Marcar revisado
                      </Button>
                    )}
                    {r.status !== 'REJECTED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={busy}
                        onClick={() => setReportStatus(r, 'REJECTED')}
                      >
                        Descartar
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
