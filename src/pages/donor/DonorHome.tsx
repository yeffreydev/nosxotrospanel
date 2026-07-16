import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../components/layout/AppShell';
import {
  Button,
  Card,
  StatCard,
  ProgressBar,
  EmptyState,
  SkeletonCard,
  Banner,
  Icon,
  type IconName,
} from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';
import { useMyDonations } from '../../hooks/api';
import { useT } from '../../lib/i18n';
import { formatSoles, formatDate } from '../../lib/format';
import type { Donation, DonationStatus, DonationType } from '../../lib/types';

const TYPE_ICON: Record<DonationType, IconName> = {
  MONEY: 'heart',
  GOODS: 'gift',
  TIME: 'clock',
};

const STATUS_PROGRESS: Record<DonationStatus, number> = {
  PROMISED: 20,
  RECEIVED: 50,
  IN_TRANSIT: 75,
  DELIVERED: 100,
  CANCELLED: 0,
};

function donationLabel(d: Donation): string {
  if (d.type === 'MONEY') return formatSoles(d.amount);
  if (d.type === 'GOODS') {
    const qty = d.quantity != null ? `${d.quantity}${d.unit ? ' ' + d.unit : ''} · ` : '';
    return `${qty}${d.description ?? 'Bienes'}`;
  }
  const hrs = d.quantity != null ? `${d.quantity} h · ` : '';
  return `${hrs}${d.description ?? 'Voluntariado'}`;
}

export default function DonorHome() {
  const t = useT();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useMyDonations();

  const donations = data ?? [];
  const totalMoney = donations
    .filter((d) => d.type === 'MONEY')
    .reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const deliveredCount = donations.filter((d) => d.status === 'DELIVERED').length;

  return (
    <div className="n-page">
      <PageHead
        title={t('donor.title')}
        subtitle={t('donor.impactSummary')}
        action={
          <Button icon="gift" onClick={() => navigate('/donar')}>
            {t('donor.redonate')}
          </Button>
        }
      />

      <section
        aria-label={t('donor.impactSummary')}
        style={{
          display: 'grid',
          gap: 'var(--sp-4)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          marginBottom: 'var(--sp-6)',
        }}
      >
        <StatCard value={formatSoles(totalMoney)} label="Total aportado" icon="heart" />
        <StatCard value={donations.length} label={t('donor.myDonations')} icon="gift" />
        <StatCard value={deliveredCount} label={t('status.DELIVERED')} icon="checkCircle" />
      </section>

      <h2 style={{ fontSize: 'var(--fs-xl)', marginBottom: 'var(--sp-4)' }}>{t('donor.myDonations')}</h2>

      {isError && (
        <Banner tone="error" title={t('common.error')}>
          No pudimos cargar tus donaciones.
        </Banner>
      )}

      {isLoading ? (
        <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : donations.length === 0 ? (
        <EmptyState
          icon="heart"
          title="Aún no has donado"
          message="Tu primer aporte puede cambiar el día de alguien en Arequipa."
          action={
            <Button icon="gift" onClick={() => navigate('/donar')}>
              {t('landing.donateNow')}
            </Button>
          }
        />
      ) : (
        <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
          {donations.map((d) => (
            <Card key={d.id}>
              <div style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-start' }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 48,
                    height: 48,
                    flex: 'none',
                    borderRadius: 'var(--r-md)',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--brand-50)',
                    color: 'var(--brand-600)',
                  }}
                >
                  <Icon name={TYPE_ICON[d.type]} size={24} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 'var(--sp-3)',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <strong style={{ fontSize: 'var(--fs-lg)' }}>{donationLabel(d)}</strong>
                    <StatusBadge status={d.status} />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--sp-3)',
                      flexWrap: 'wrap',
                      color: 'var(--text-muted)',
                      fontSize: 'var(--fs-sm)',
                      margin: '4px 0 var(--sp-3)',
                    }}
                  >
                    <span style={{ fontFamily: 'monospace', fontWeight: 'var(--fw-bold)', color: 'var(--brand-700)' }}>
                      {d.code}
                    </span>
                    <span>· {formatDate(d.createdAt)}</span>
                  </div>
                  <ProgressBar
                    value={STATUS_PROGRESS[d.status]}
                    tone={d.status === 'CANCELLED' ? 'danger' : 'brand'}
                    showPct={false}
                  />
                  <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
                    <Button variant="ghost" size="sm" icon="pin" onClick={() => navigate(`/seguir/${d.code}`)}>
                      {t('nav.track')}
                    </Button>
                    <Button variant="subtle" size="sm" icon="gift" onClick={() => navigate('/donar')}>
                      {t('donor.redonate')}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
