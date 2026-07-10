import { useState } from 'react';
import { Tabs } from '../../components/ui';
import { PageHead } from '../../components/layout/AppShell';
import { useT } from '../../lib/i18n';
import { EmergenciesTab } from './EmergenciesTab';
import { ReportsTab } from './ReportsTab';

// Coordinación global de emergencias (las emergencias son transversales y
// pueden convertirse en campañas). KPIs, centros, zonas, brigadas, donaciones,
// despachos y beneficiarios viven dentro de cada campaña (panel por campaña).
type TabKey = 'emergencies' | 'reports';

export default function ManagerHome() {
  const t = useT();
  const [tab, setTab] = useState<TabKey>('emergencies');

  return (
    <div className="n-page">
      <PageHead title={t('nav.emergencies')} subtitle="Coordinación de emergencias" />

      <div style={{ marginBottom: 'var(--sp-5)' }}>
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as TabKey)}
          items={[
            { value: 'emergencies', label: t('nav.emergencies'), icon: 'fire' },
            { value: 'reports', label: 'Reportes', icon: 'alert' },
          ]}
        />
      </div>

      {tab === 'emergencies' && <EmergenciesTab />}
      {tab === 'reports' && <ReportsTab />}
    </div>
  );
}
