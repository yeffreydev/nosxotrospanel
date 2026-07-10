import { useState } from 'react';
import { PageHead } from '../../components/layout/AppShell';
import {
  Button,
  IconButton,
  Card,
  Badge,
  Chip,
  CenteredSpinner,
  SkeletonCard,
  ProgressBar,
  StatCard,
  EmptyState,
  Banner,
  Tabs,
  Icon,
  useToast,
  type IconName,
} from '../../components/ui';
import {
  useShifts,
  useEnrollShift,
  useCheckin,
  useCheckout,
  usePassport,
  useVolunteerMe,
} from '../../hooks/api';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useAuth } from '../../store/auth';
import { useT } from '../../lib/i18n';
import { formatDateTime, formatTime, formatDate } from '../../lib/format';
import type { Shift } from '../../lib/types';

type TabKey = 'available' | 'mine' | 'passport';

const SKILLS = ['Logística', 'Salud', 'Cocina', 'Rescate'];

export default function VolunteerHome() {
  const t = useT();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('available');

  return (
    <div className="n-page">
      <PageHead title={`¡Hola, ${user?.fullName?.split(' ')[0] ?? ''}!`} subtitle={t('app.tagline')} />
      <MyBrigadeCard />
      <div style={{ marginBottom: 'var(--sp-5)' }}>
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as TabKey)}
          items={[
            { value: 'available', label: t('vol.available'), icon: 'spark' },
            { value: 'mine', label: t('vol.mine'), icon: 'calendar' },
            { value: 'passport', label: t('vol.passport'), icon: 'trophy' },
          ]}
        />
      </div>

      {tab === 'available' && <AvailableTab />}
      {tab === 'mine' && <MineTab />}
      {tab === 'passport' && <PassportTab />}
    </div>
  );
}

function MyBrigadeCard() {
  const t = useT();
  const toast = useToast();
  const { data } = useVolunteerMe();
  const brigades = data?.brigades ?? [];
  if (brigades.length === 0) return null;

  const share = async (url?: string) => {
    if (!url) return;
    try {
      if (navigator.share) await navigator.share({ url, title: 'NOSXOTROS' });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t('common.copied'));
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <div style={{ marginBottom: 'var(--sp-4)' }}>
      <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--sp-3)' }}>
        <Icon name="users" size={18} /> {t('vol.myBrigade')}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {brigades.map((b) => (
          <Card key={b.memberId}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
              <div>
                <strong>{b.name}</strong>
                {b.campaign && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{b.campaign.title}</div>
                )}
              </div>
              {b.zone && <Badge tone="warn" dot>{t(`sev.${b.zone.severity}`)}</Badge>}
            </div>
            {b.zone && (
              <div style={{ marginTop: 'var(--sp-2)', fontSize: 'var(--fs-sm)' }}>
                <div><strong>{t('vol.zone')}:</strong> {b.zone.name}{b.zone.reference ? ` · ${b.zone.reference}` : ''}</div>
                {b.zone.mapUrl && (
                  <Button size="sm" variant="ghost" icon="share" onClick={() => share(b.zone?.mapUrl)} style={{ marginTop: 4 }}>
                    {t('vol.openMap')}
                  </Button>
                )}
              </div>
            )}
            {b.meetingPoint && (
              <div style={{ marginTop: 'var(--sp-2)', fontSize: 'var(--fs-sm)' }}>
                📍 <strong>{t('vol.meetingPoint')}:</strong> {b.meetingPoint}
                {b.meetingPointMapUrl && (
                  <Button size="sm" variant="ghost" icon="share" onClick={() => share(b.meetingPointMapUrl)} style={{ marginLeft: 6 }}>
                    {t('vol.openMap')}
                  </Button>
                )}
              </div>
            )}
            {b.contactPhone && (
              <div style={{ marginTop: 4, fontSize: 'var(--fs-sm)' }}>📞 {b.contactPhone}</div>
            )}
            {b.zone?.needs && b.zone.needs.length > 0 && (
              <div style={{ marginTop: 'var(--sp-2)' }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{t('vol.zoneNeeds')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {b.zone.needs.map((n) => (
                    <Badge key={n.id} tone="neutral">{n.title} · {n.targetQty}{n.unit ? ` ${n.unit}` : ''}</Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function ShiftMeta({ shift }: { shift: Shift }) {
  const where = shift.center?.name ?? shift.emergency?.title;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--sp-3)',
        color: 'var(--text-muted)',
        fontSize: 'var(--fs-sm)',
        marginTop: 4,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Icon name="calendar" size={15} /> {formatDateTime(shift.startAt)} – {formatTime(shift.endAt)}
      </span>
      {where && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon name="pin" size={15} /> {where}
        </span>
      )}
      {shift.distanceKm != null && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon name="location" size={15} /> {shift.distanceKm.toFixed(1)} km
        </span>
      )}
    </div>
  );
}

function AvailableTab() {
  const t = useT();
  const toast = useToast();
  const geo = useGeolocation();
  const [skill, setSkill] = useState<string | undefined>();
  const [near, setNear] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>();

  const { data, isLoading, isError } = useShifts({
    skill,
    status: 'OPEN',
    ...(near && coords ? { near: 1, lat: coords.lat, lng: coords.lng } : {}),
  });
  const enroll = useEnrollShift();

  const toggleNear = async () => {
    if (near) {
      setNear(false);
      return;
    }
    try {
      const c = await geo.locate();
      setCoords(c);
      setNear(true);
    } catch {
      toast.error('No pudimos obtener tu ubicación');
    }
  };

  const onEnroll = (id: string) => {
    enroll.mutate(id, {
      onSuccess: () => toast.success(t('toast.enrolled')),
      onError: () => toast.error(t('common.error')),
    });
  };

  const shifts = data ?? [];

  return (
    <>
      <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', marginBottom: 'var(--sp-4)' }}>
        <Chip active={!skill} onClick={() => setSkill(undefined)}>
          {t('common.all')}
        </Chip>
        {SKILLS.map((sk) => (
          <Chip key={sk} active={skill === sk} onClick={() => setSkill(sk)}>
            {sk}
          </Chip>
        ))}
        <Chip active={near} onClick={toggleNear} icon="location">
          {t('vol.nearMe')}
        </Chip>
      </div>

      {isError && (
        <Banner tone="error" title={t('common.error')}>
          No pudimos cargar los turnos.
        </Banner>
      )}

      {isLoading ? (
        <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : shifts.length === 0 ? (
        <EmptyState icon="spark" title="No hay turnos disponibles" message="Vuelve pronto, siempre se necesita ayuda." />
      ) : (
        <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
          {shifts.map((shift) => (
            <Card key={shift.id}>
              <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 'var(--fs-lg)' }}>{shift.title}</strong>
                    {shift.skill && <Badge tone="info">{shift.skill}</Badge>}
                  </div>
                  <ShiftMeta shift={shift} />
                  <div style={{ marginTop: 'var(--sp-3)', maxWidth: 280 }}>
                    <ProgressBar
                      value={shift.enrolledCount}
                      max={shift.capacity}
                      tone={shift.enrolledCount >= shift.capacity ? 'warn' : 'brand'}
                      label={`${shift.enrolledCount}/${shift.capacity} voluntarios`}
                      showPct={false}
                    />
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 'var(--sp-4)' }}>
                {shift.enrolled ? (
                  <Badge tone="success" dot>
                    {t('vol.enrolled')}
                  </Badge>
                ) : (
                  <Button
                    icon="checkCircle"
                    size="sm"
                    onClick={() => onEnroll(shift.id)}
                    loading={enroll.isPending && enroll.variables === shift.id}
                    disabled={shift.enrolledCount >= shift.capacity}
                  >
                    {t('vol.enroll')}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function MineTab() {
  const t = useT();
  const toast = useToast();
  const geo = useGeolocation();
  const { data, isLoading } = useShifts({});
  const checkin = useCheckin();
  const checkout = useCheckout();

  const mine = (data ?? []).filter((s) => s.enrolled);

  const onCheckin = async (id: string) => {
    try {
      const c = await geo.locate();
      checkin.mutate(
        { id, lat: c.lat, lng: c.lng },
        {
          onSuccess: () => toast.success(t('toast.checkedIn')),
          onError: () => toast.error(t('common.error')),
        },
      );
    } catch {
      toast.error('Activa tu ubicación para marcar entrada');
    }
  };

  const onCheckout = (id: string) => {
    checkout.mutate(id, {
      onSuccess: () => toast.success(t('toast.checkedOut')),
      onError: () => toast.error(t('common.error')),
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (mine.length === 0) {
    return <EmptyState icon="calendar" title="No tienes turnos" message="Inscríbete en un turno disponible para empezar." />;
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
      {mine.map((shift) => {
        const a = shift.assignment;
        const checkedIn = !!a?.checkinAt;
        const checkedOut = !!a?.checkoutAt;
        return (
          <Card key={shift.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 'var(--fs-lg)' }}>{shift.title}</strong>
              {checkedOut && a?.hours != null && (
                <Badge tone="success" dot>
                  {a.hours.toFixed(1)} {t('vol.hours')}
                </Badge>
              )}
            </div>
            <ShiftMeta shift={shift} />
            <div style={{ marginTop: 'var(--sp-4)' }}>
              {!checkedIn ? (
                <Button icon="location" size="sm" onClick={() => onCheckin(shift.id)} loading={geo.loading || checkin.isPending}>
                  {t('vol.checkin')}
                </Button>
              ) : !checkedOut ? (
                <Button
                  icon="checkCircle"
                  variant="gold"
                  size="sm"
                  onClick={() => onCheckout(shift.id)}
                  loading={checkout.isPending}
                >
                  {t('vol.checkout')}
                </Button>
              ) : (
                <Badge tone="success" dot>
                  Turno completado · ¡Gracias!
                </Badge>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

const BADGE_ICONS: IconName[] = ['award', 'trophy', 'star', 'shield'];

function PassportTab() {
  const t = useT();
  const toast = useToast();
  const { data, isLoading, isError } = usePassport();

  if (isLoading) return <CenteredSpinner label={t('common.loading')} />;
  if (isError || !data)
    return (
      <EmptyState icon="trophy" title="Tu pasaporte aún no está listo" message="Completa tu primer turno para empezar a sumar impacto." />
    );

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(data.passportCode);
      toast.success(t('toast.copied'));
    } catch {
      toast.info(data.passportCode, { silent: true });
    }
  };

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-5)' }}>
      <div
        style={{
          borderRadius: 'var(--r-xl)',
          padding: 'var(--sp-6)',
          color: '#fff',
          background: 'var(--brand-600)',
          boxShadow: 'var(--sh-brand)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', opacity: 0.9 }}>
          <Icon name="trophy" size={20} />
          <span style={{ fontWeight: 'var(--fw-semibold)' }}>{t('vol.passport')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
          <span style={{ fontSize: 'var(--fs-4xl)', fontWeight: 'var(--fw-black)', lineHeight: 1 }}>
            {data.totalHours.toFixed(1)}
          </span>
          <span style={{ fontSize: 'var(--fs-lg)' }}>{t('vol.hours')}</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-2)',
            marginTop: 'var(--sp-4)',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 'var(--r-full)',
            padding: '6px 6px 6px 14px',
            width: 'fit-content',
          }}
        >
          <span style={{ fontSize: 'var(--fs-xs)', opacity: 0.85 }}>{t('vol.passportCode')}:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 'var(--fw-bold)', letterSpacing: '0.05em' }}>
            {data.passportCode}
          </span>
          <IconButton icon="copy" label={t('common.copy')} size="sm" onClick={copyCode} />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 'var(--sp-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <StatCard value={data.totalHours.toFixed(1)} label={t('vol.hours')} icon="clock" />
        <StatCard value={data.impactPoints} label={t('vol.points')} icon="star" />
        <StatCard value={data.badges.length} label={t('vol.badges')} icon="award" />
      </div>

      <section>
        <h2 style={{ fontSize: 'var(--fs-xl)', marginBottom: 'var(--sp-4)' }}>{t('vol.badges')}</h2>
        {data.badges.length === 0 ? (
          <EmptyState icon="award" title="Aún sin insignias" message="Cada turno te acerca a tu primera insignia." />
        ) : (
          <div style={{ display: 'grid', gap: 'var(--sp-4)', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {data.badges.map((badge, i) => (
              <Card key={badge.id} style={{ textAlign: 'center' }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 56,
                    height: 56,
                    margin: '0 auto var(--sp-2)',
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--gold-300)',
                    color: 'var(--gold-700)',
                  }}
                >
                  <Icon name={BADGE_ICONS[i % BADGE_ICONS.length]} size={28} />
                </span>
                <strong style={{ display: 'block', fontSize: 'var(--fs-sm)' }}>{badge.name}</strong>
                {badge.description && (
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{badge.description}</span>
                )}
                {badge.earnedAt && (
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-300)', marginTop: 4 }}>
                    {formatDate(badge.earnedAt)}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {data.history && data.history.length > 0 && (
        <section>
          <h2 style={{ fontSize: 'var(--fs-xl)', marginBottom: 'var(--sp-4)' }}>Historial reciente</h2>
          <Card pad={false}>
            {data.history.map((h, i) => (
              <div
                key={h.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--sp-3) var(--sp-4)',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 'var(--fw-semibold)' }}>{h.title}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{formatDate(h.date)}</div>
                </div>
                <Badge tone="success">+{h.hours.toFixed(1)} h</Badge>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
