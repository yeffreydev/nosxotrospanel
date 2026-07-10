import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Chip,
  SkeletonCard,
  EmptyState,
  Banner,
  Icon,
} from '../components/ui';
import { CampaignCard } from '../components/CampaignCard';
import { useCampaigns } from '../hooks/api';
import { useAuth } from '../store/auth';
import { useT } from '../lib/i18n';
import { CAMPAIGN_CATEGORY } from '../lib/format';
import type { CampaignCategory } from '../lib/types';
import type { IconName } from '../components/ui';

const CATEGORIES = Object.entries(CAMPAIGN_CATEGORY) as [
  CampaignCategory,
  { label: string; icon: IconName },
][];

export default function Campaigns() {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [category, setCategory] = useState<CampaignCategory | ''>('');

  const { data, isLoading, isError } = useCampaigns(
    category ? { category } : undefined,
  );
  const campaigns = data ?? [];

  return (
    <div className="n-page">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 'var(--sp-4)',
          flexWrap: 'wrap',
          marginBottom: 'var(--sp-5)',
        }}
      >
        <div>
          <h1 style={{ fontSize: 'var(--fs-2xl)', margin: 0 }}>{t('camp.title')}</h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>{t('camp.subtitle')}</p>
        </div>
        <Button
          icon="spark"
          variant="gold"
          onClick={() => navigate(user ? '/organizador/nueva' : '/registro?role=MANAGER')}
        >
          {t('camp.create')}
        </Button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 'var(--sp-2)',
          overflowX: 'auto',
          paddingBottom: 'var(--sp-3)',
          marginBottom: 'var(--sp-4)',
        }}
      >
        <Chip active={category === ''} onClick={() => setCategory('')}>
          {t('common.all')}
        </Chip>
        {CATEGORIES.map(([key, c]) => (
          <Chip key={key} active={category === key} onClick={() => setCategory(key)}>
            <Icon name={c.icon} size={14} /> {c.label}
          </Chip>
        ))}
      </div>

      {isError && (
        <Banner tone="error" title={t('common.error')}>
          No pudimos cargar las campañas.
        </Banner>
      )}

      {isLoading ? (
        <div className="n-grid-cards">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon="spark"
          title={t('camp.noCampaigns')}
          message="Las campañas activas aparecerán aquí."
          action={
            <Button icon="spark" onClick={() => navigate(user ? '/organizador/nueva' : '/registro?role=MANAGER')}>
              {t('camp.create')}
            </Button>
          }
        />
      ) : (
        <div className="n-grid-cards">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
}
