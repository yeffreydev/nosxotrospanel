import { useState } from 'react';
import { PageHead } from '../components/layout/AppShell';
import { OpsMap } from '../components/maps';
import { Card, SegmentedControl, Badge, CenteredSpinner, Banner } from '../components/ui';
import { useEmergencyMap, useCenters } from '../hooks/api';
import { useT } from '../lib/i18n';
import { SEVERITY_COLOR } from '../lib/format';
import type { Severity } from '../lib/types';

export default function MapView() {
  const t = useT();
  const [layer, setLayer] = useState<'all' | 'emergencies' | 'centers'>('all');
  const { data: emergencies, isLoading: le, isError } = useEmergencyMap();
  const { data: centers, isLoading: lc } = useCenters();

  const showE = layer !== 'centers';
  const showC = layer !== 'emergencies';

  return (
    <div className="n-page">
      <PageHead
        title={t('map.title')}
        subtitle="Arequipa"
        action={
          <SegmentedControl
            value={layer}
            onChange={setLayer}
            options={[
              { value: 'all', label: t('common.all') },
              { value: 'emergencies', label: t('map.emergencies') },
              { value: 'centers', label: t('map.centers') },
            ]}
          />
        }
      />

      {isError && (
        <div style={{ marginBottom: 'var(--sp-4)' }}>
          <Banner tone="warn" title="Mapa sin datos">
            Aún no hay puntos para mostrar.
          </Banner>
        </div>
      )}

      <Card pad={false} style={{ overflow: 'hidden' }}>
        {le && lc ? (
          <CenteredSpinner label={t('common.loading')} />
        ) : (
          <OpsMap
            emergencies={showE ? (emergencies ?? []) : []}
            centers={showC ? (centers ?? []) : []}
            height="min(68vh, 640px)"
          />
        )}
      </Card>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
        {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map((sev) => (
          <span key={sev} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: SEVERITY_COLOR[sev] }} />
            {t(`sev.${sev}`)}
          </span>
        ))}
        <Badge tone="success" dot>
          {t('map.centers')}
        </Badge>
      </div>
    </div>
  );
}
