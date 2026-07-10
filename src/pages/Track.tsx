import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Chip,
  Input,
  IconButton,
  Banner,
  CenteredSpinner,
  Timeline,
  Badge,
  Icon,
  useToast,
  type IconName,
  type TimelineStep,
} from '../components/ui';
import { StatusBadge } from '../components/StatusBadge';
import { MiniMap } from '../components/maps';
import { useTrackDonation, useLookupDonations } from '../hooks/api';
import { useT } from '../lib/i18n';
import { formatSoles, formatDateTime } from '../lib/format';
import type { TraceEvent } from '../lib/types';

const STATUS_ICON: Record<string, IconName> = {
  PENDING: 'clock',
  RECEIVED: 'box',
  IN_TRANSIT: 'truck',
  DELIVERED: 'checkCircle',
  CANCELLED: 'info',
};

export default function Track() {
  const t = useT();
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();

  if (!code) return <TrackSearch />;
  return <TrackResult code={code} onReset={() => navigate('/seguir')} />;
}

type Mode = 'code' | 'phone' | 'email';

function TrackSearch() {
  const t = useT();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('code');
  const [value, setValue] = useState('');
  const lookup = useLookupDonations();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    if (mode === 'code') {
      navigate(`/seguir/${v.toUpperCase()}`);
      return;
    }
    lookup.mutate(mode === 'phone' ? { phone: v } : { email: v });
  };

  const results = lookup.data ?? [];

  return (
    <div className="n-page" style={{ maxWidth: 480, margin: '0 auto' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-4)' }}>
          <span
            style={{
              display: 'inline-grid',
              placeItems: 'center',
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--brand-50)',
              color: 'var(--brand-600)',
              marginBottom: 'var(--sp-3)',
            }}
          >
            <Icon name="pin" size={30} />
          </span>
          <h1 style={{ fontSize: 'var(--fs-2xl)' }}>{t('track.title')}</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Busca por código, teléfono o correo para ver el recorrido de tu ayuda.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)', justifyContent: 'center' }}>
          <Chip active={mode === 'code'} onClick={() => setMode('code')}>{t('track.byCode')}</Chip>
          <Chip active={mode === 'phone'} onClick={() => setMode('phone')}>{t('track.byPhone')}</Chip>
          <Chip active={mode === 'email'} onClick={() => setMode('email')}>{t('track.byEmail')}</Chip>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <Input
            label={mode === 'code' ? t('track.title') : mode === 'phone' ? t('track.byPhone') : t('track.byEmail')}
            placeholder={mode === 'code' ? t('track.placeholder') : mode === 'phone' ? t('track.phonePlaceholder') : t('track.emailPlaceholder')}
            value={value}
            onChange={(e) => setValue(mode === 'code' ? e.target.value.toUpperCase() : e.target.value)}
            autoCapitalize={mode === 'code' ? 'characters' : 'off'}
            type={mode === 'email' ? 'email' : mode === 'phone' ? 'tel' : 'text'}
          />
          <Button type="submit" icon="search" block disabled={!value.trim()} loading={lookup.isPending}>
            {mode === 'code' ? t('track.cta') : t('common.search')}
          </Button>
        </form>

        {mode !== 'code' && lookup.isSuccess && (
          <div style={{ marginTop: 'var(--sp-4)' }}>
            {results.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{t('track.noResults')}</p>
            ) : (
              <>
                <h2 style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>
                  {t('track.results')} ({results.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                  {results.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => navigate(`/seguir/${d.code}`)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        gap: 'var(--sp-2)', padding: 'var(--sp-3)', textAlign: 'left',
                        background: 'var(--surface-3)', border: '1px solid var(--border)',
                        borderRadius: 'var(--r-md)', cursor: 'pointer', width: '100%',
                      }}
                    >
                      <span>
                        <span style={{ fontWeight: 'var(--fw-bold)' }}>
                          {d.type === 'MONEY' ? formatSoles(d.amount) : d.type === 'TIME' ? t('donate.voluntariado') : `${d.quantity ?? ''}`.trim()}
                        </span>
                        <span style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                          {d.code}
                        </span>
                      </span>
                      <StatusBadge status={d.status} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function TrackResult({ code, onReset }: { code: string; onReset: () => void }) {
  const t = useT();
  const toast = useToast();
  const { data, isLoading, isError } = useTrackDonation(code);

  if (isLoading) {
    return (
      <div className="n-page">
        <CenteredSpinner label={t('common.loading')} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="n-page" style={{ maxWidth: 480, margin: '0 auto' }}>
        <Banner tone="error" title={t('track.notFound')} />
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <Button variant="subtle" icon="chevronLeft" block onClick={onReset}>
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  const events: TraceEvent[] = [...(data.events ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const steps: TimelineStep[] = events.map((ev) => ({
    title: t(`status.${ev.status}`),
    subtitle: ev.note,
    time: formatDateTime(ev.createdAt),
    icon: STATUS_ICON[ev.status] ?? 'checkCircle',
    done: true,
  }));

  const lastWithCoords = [...events].reverse().find((ev) => ev.lat != null && ev.lng != null);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(data.code);
      toast.success(t('toast.copied'));
    } catch {
      toast.info(data.code, { title: t('common.copy') });
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/seguir/${data.code}`;
    const shareData = { title: 'NOSXOTROS', text: `Sigue mi donación ${data.code}`, url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t('toast.copied'));
      }
    } catch {
      /* user cancelled */
    }
  };

  const typeIcon: IconName = data.type === 'MONEY' ? 'heart' : data.type === 'TIME' ? 'spark' : 'gift';

  return (
    <div className="n-page" style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* Summary */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--sp-3)' }}>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
            <span
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--r-md)',
                display: 'grid',
                placeItems: 'center',
                background: 'var(--brand-50)',
                color: 'var(--brand-600)',
              }}
            >
              <Icon name={typeIcon} size={24} />
            </span>
            <div>
              <div style={{ fontWeight: 'var(--fw-bold)', fontSize: 'var(--fs-lg)' }}>
                {data.type === 'MONEY'
                  ? formatSoles(data.amount)
                  : data.type === 'TIME'
                    ? t('donate.voluntariado')
                    : `${data.quantity ?? ''} ${data.unit ?? ''}`.trim()}
              </div>
              {data.category && (
                <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{data.category.name}</div>
              )}
            </div>
          </div>
          <StatusBadge status={data.status} />
        </div>

        {data.description && (
          <p style={{ marginTop: 'var(--sp-3)', color: 'var(--text-muted)' }}>{data.description}</p>
        )}

        <div
          style={{
            marginTop: 'var(--sp-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--sp-2)',
            padding: 'var(--sp-3) var(--sp-4)',
            background: 'var(--surface-3)',
            borderRadius: 'var(--r-md)',
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Código de seguimiento</div>
            <div style={{ fontWeight: 'var(--fw-black)', fontSize: 'var(--fs-lg)', letterSpacing: '0.04em' }}>
              {data.code}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <IconButton icon="copy" label={t('common.copy')} onClick={copyCode} />
            <IconButton icon="share" label={t('common.share')} onClick={share} />
          </div>
        </div>

        {data.emergency && (
          <div style={{ marginTop: 'var(--sp-3)' }}>
            <Badge tone="warn" dot>
              {data.emergency.title}
            </Badge>
          </div>
        )}
      </Card>

      {/* Mini map */}
      {lastWithCoords && lastWithCoords.lat != null && lastWithCoords.lng != null && (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <MiniMap
            lat={lastWithCoords.lat}
            lng={lastWithCoords.lng}
            height={200}
            label={t(`status.${lastWithCoords.status}`)}
          />
        </div>
      )}

      {/* Timeline */}
      <Card style={{ marginTop: 'var(--sp-4)' }}>
        <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--sp-4)' }}>{t('track.timeline')}</h2>
        {steps.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Aún no hay eventos registrados.</p>
        ) : (
          <Timeline steps={steps} />
        )}
      </Card>

      <div style={{ marginTop: 'var(--sp-4)' }}>
        <Button variant="subtle" icon="search" block onClick={onReset}>
          Seguir otra donación
        </Button>
      </div>
    </div>
  );
}
