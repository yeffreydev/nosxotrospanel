import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../components/layout/AppShell';
import {
  Button,
  Card,
  Badge,
  StatCard,
  ProgressBar,
  Modal,
  Input,
  Textarea,
  Banner,
  Icon,
  SkeletonCard,
  useToast,
} from '../../components/ui';
import { useMyCampaigns, usePostCampaignUpdate } from '../../hooks/api';
import { useT } from '../../lib/i18n';
import { apiErrorMessage } from '../../lib/api';
import {
  CAMPAIGN_CATEGORY,
  CAMPAIGN_STATUS,
  formatSoles,
  formatNumber,
} from '../../lib/format';
import type { Campaign } from '../../lib/types';

export default function OrganizerHome() {
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isLoading, isError } = useMyCampaigns();
  const postUpdate = usePostCampaignUpdate();

  const [updateFor, setUpdateFor] = useState<Campaign | null>(null);
  const [uTitle, setUTitle] = useState('');
  const [uBody, setUBody] = useState('');
  const [error, setError] = useState('');

  const campaigns = data ?? [];
  const totalRaised = campaigns.reduce((s, c) => s + c.raisedAmount, 0);
  const totalBackers = campaigns.reduce((s, c) => s + c.backersCount, 0);

  async function submitUpdate() {
    if (!updateFor) return;
    setError('');
    try {
      await postUpdate.mutateAsync({ id: updateFor.id, body: { title: uTitle, body: uBody } });
      toast.success('Avance publicado');
      setUpdateFor(null);
      setUTitle('');
      setUBody('');
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="n-page">
      <PageHead
        title={t('camp.myCampaigns')}
        subtitle={t('camp.subtitle')}
        action={
          <Button icon="spark" variant="gold" onClick={() => navigate('/organizador/nueva')}>
            {t('camp.newCampaign')}
          </Button>
        }
      />

      {campaigns.length > 0 && (
        <section
          style={{
            display: 'grid',
            gap: 'var(--sp-4)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            marginBottom: 'var(--sp-6)',
          }}
        >
          <StatCard value={formatSoles(totalRaised)} label={t('camp.raised')} icon="heart" />
          <StatCard value={formatNumber(totalBackers)} label={t('camp.backers')} icon="users" />
          <StatCard value={campaigns.length} label={t('camp.myCampaigns')} icon="spark" />
        </section>
      )}

      {isError && (
        <Banner tone="error" title={t('common.error')}>
          No pudimos cargar tus campañas.
        </Banner>
      )}

      {isLoading ? (
        <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : campaigns.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 'var(--sp-7) var(--sp-5)' }}>
          <span
            aria-hidden="true"
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 72,
              height: 72,
              margin: '0 auto var(--sp-4)',
              borderRadius: 'var(--r-lg)',
              background: 'var(--brand-50)',
              color: 'var(--brand-600)',
            }}
          >
            <Icon name="spark" size={36} />
          </span>
          <h2 style={{ fontSize: 'var(--fs-2xl)', margin: '0 0 8px' }}>Crea tu primera campaña</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto var(--sp-5)' }}>
            Aún no tienes campañas. Lanza una para ayudar a otros o hacer crecer tu emprendimiento:
            cuenta tu historia, define (o no) una meta, indica qué voluntarios buscas y, si quieres,
            registra un centro de acopio.
          </p>
          <Button size="lg" variant="gold" icon="spark" onClick={() => navigate('/organizador/nueva')}>
            {t('camp.newCampaign')}
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
          <h2 style={{ fontSize: 'var(--fs-lg)', margin: '0 0 var(--sp-1)' }}>{t('camp.history')}</h2>
          {campaigns.map((c) => {
            const st = CAMPAIGN_STATUS[c.status];
            const cat = CAMPAIGN_CATEGORY[c.category];
            const funded = c.progressPct >= 100 || c.status === 'FUNDED';
            const statusKey = `status.${c.status}`;
            const statusLabel = t(statusKey) !== statusKey ? t(statusKey) : st?.label ?? c.status;
            return (
              <Card key={c.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    <Icon name={cat.icon} size={22} />
                    <strong style={{ fontSize: 'var(--fs-lg)' }}>{c.title}</strong>
                  </div>
                  <Badge tone={st?.tone ?? 'neutral'}>{statusLabel}</Badge>
                </div>

                {c.goalAmount != null && (
                  <div style={{ margin: '12px 0 6px' }}>
                    <ProgressBar value={c.progressPct} tone={funded ? 'gold' : 'brand'} />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', marginTop: c.goalAmount == null ? 12 : 0 }}>
                  <span>
                    <strong style={{ color: 'var(--brand-700)' }}>{formatSoles(c.raisedAmount)}</strong>
                    {c.goalAmount != null ? ` de ${formatSoles(c.goalAmount)}` : ' · sin meta'}
                  </span>
                  <span>{formatNumber(c.backersCount)} donantes</span>
                </div>

                <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)', flexWrap: 'wrap' }}>
                  <Button size="sm" icon="chart" onClick={() => navigate(`/organizador/${c.id}`)}>
                    {t('ops.manage')}
                  </Button>
                  <Button size="sm" variant="ghost" icon="globe" onClick={() => navigate(`/campanas/${c.slug}`)}>
                    Ver pública
                  </Button>
                  <Button size="sm" variant="subtle" icon="bell" onClick={() => setUpdateFor(c)}>
                    {t('camp.postUpdate')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!updateFor}
        onClose={() => setUpdateFor(null)}
        title={t('camp.postUpdate')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setUpdateFor(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              icon="bell"
              loading={postUpdate.isPending}
              disabled={uTitle.trim().length < 3 || uBody.trim().length < 3}
              onClick={submitUpdate}
            >
              {t('camp.postUpdate')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
          {error && <Banner tone="error" title={t('common.error')}>{error}</Banner>}
          <Input label="Título del avance" value={uTitle} onChange={(e) => setUTitle(e.target.value)} />
          <Textarea label="Mensaje" rows={4} value={uBody} onChange={(e) => setUBody(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
