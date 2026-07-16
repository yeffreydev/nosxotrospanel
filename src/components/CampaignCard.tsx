import { useNavigate } from 'react-router-dom';
import { Card, Badge, ProgressBar, Icon } from './ui';
import type { Campaign } from '../lib/types';
import { assetUrl } from '../lib/assets';
import {
  CAMPAIGN_CATEGORY,
  CAMPAIGN_STATUS,
  formatSoles,
  formatNumber,
  daysLeft,
} from '../lib/format';

/** Tarjeta de campaña reutilizable (lista pública + panel del organizador). */
export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const navigate = useNavigate();
  const cat = CAMPAIGN_CATEGORY[campaign.category];
  const st = CAMPAIGN_STATUS[campaign.status];
  const dleft = daysLeft(campaign.deadline);
  const funded = campaign.progressPct >= 100 || campaign.status === 'FUNDED';
  const cover = assetUrl(campaign.coverPhoto);

  return (
    <Card
      pad={false}
      hover
      onClick={() => navigate(`/campanas/${campaign.slug}`)}
      style={{ cursor: 'pointer', overflow: 'hidden' }}
    >
      <div
        aria-hidden="true"
        style={{
          height: 132,
          background: cover ? `center/cover no-repeat url(${cover})` : 'var(--brand-600)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 44,
          position: 'relative',
          color: cover ? undefined : '#fff',
        }}
      >
        {!cover && <Icon name={cat.icon} size={40} strokeWidth={1.6} />}
        <span style={{ position: 'absolute', top: 10, left: 10 }}>
          <Badge tone="neutral">
            <Icon name={cat.icon} size={13} /> {cat.label}
          </Badge>
        </span>
        {campaign.featured && (
          <span style={{ position: 'absolute', top: 10, right: 10 }}>
            <Badge tone="gold"><Icon name="star" size={13} /> Destacada</Badge>
          </span>
        )}
      </div>

      <div style={{ padding: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-2)', alignItems: 'center' }}>
          <Badge tone={st.tone}>{st.label}</Badge>
          {dleft != null && campaign.status === 'ACTIVE' && (
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              <Icon name="clock" size={14} /> {dleft} días
            </span>
          )}
        </div>

        <h3 style={{ fontSize: 'var(--fs-lg)', margin: '8px 0 4px', lineHeight: 1.25 }}>
          {campaign.title}
        </h3>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: 'var(--fs-sm)',
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {campaign.summary}
        </p>

        <div style={{ marginTop: 'var(--sp-4)' }}>
          {campaign.goalAmount != null && (
            <ProgressBar value={campaign.progressPct} tone={funded ? 'gold' : 'brand'} showPct={false} />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <strong style={{ color: 'var(--brand-700)' }}>{formatSoles(campaign.raisedAmount)}</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
              {campaign.goalAmount != null
                ? `${campaign.progressPct}% · meta ${formatSoles(campaign.goalAmount)}`
                : 'sin meta fija'}
            </span>
          </div>
          <div style={{ marginTop: 4, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <Icon name="heart" size={14} /> {formatNumber(campaign.backersCount)} donantes
          </div>
        </div>
      </div>
    </Card>
  );
}
