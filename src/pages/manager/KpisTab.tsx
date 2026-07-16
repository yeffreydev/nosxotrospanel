import { Card, Skeleton, Banner, EmptyState, Icon, type IconName } from '../../components/ui';
import { useKpis } from '../../hooks/api';
import { useT } from '../../lib/i18n';
import { formatNumber } from '../../lib/format';
import type { DonationType } from '../../lib/types';
import { BarChart, LineChart } from './charts';
import s from './manager.module.css';

const TYPE_LABEL: Record<DonationType, string> = {
  MONEY: 'Dinero',
  GOODS: 'Bienes',
  TIME: 'Voluntariado',
};

export function KpisTab() {
  const t = useT();
  const { data, isLoading, isError } = useKpis();

  if (isLoading) {
    return (
      <div className={s.kpiList}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div className={s.kpiRow} key={i}>
            <Skeleton width={44} height={44} radius={12} />
            <Skeleton width={140} height={14} />
            <div style={{ marginLeft: 'auto' }}>
              <Skeleton width={64} height={24} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (isError || !data) {
    return <Banner tone="warn" title="Sin indicadores">Aún no hay datos suficientes para calcular los KPIs.</Banner>;
  }

  const kpis: { icon: IconName; label: string; value: string }[] = [
    { icon: 'shield', label: t('mgr.traceability'), value: `${formatNumber(data.traceabilityPct)}%` },
    { icon: 'spark', label: t('mgr.avgDeploy'), value: `${formatNumber(data.avgDeployMinutes)} min` },
    { icon: 'users', label: t('mgr.conversion'), value: `${formatNumber(data.volunteerConversionPct)}%` },
    { icon: 'checkCircle', label: t('mgr.effective'), value: `${formatNumber(data.effectiveCollectionPct)}%` },
    { icon: 'chart', label: t('mgr.nps'), value: formatNumber(data.nps) },
    { icon: 'star', label: t('mgr.ease'), value: data.easeAvg?.toFixed(1) ?? '0' },
  ];

  return (
    <div>
      <div className={s.kpiList}>
        {kpis.map((k) => (
          <div className={s.kpiRow} key={k.label}>
            <span className={s.kpiIcon}>
              <Icon name={k.icon} size={22} />
            </span>
            <span className={s.kpiLabel}>{k.label}</span>
            <span className={s.kpiValue}>{k.value}</span>
          </div>
        ))}
      </div>

      <div className={s.chartGrid}>
        <Card>
          <div className={s.cardTitle}>Tendencia de donaciones</div>
          {data.donationsTrend && data.donationsTrend.length > 0 ? (
            <LineChart data={data.donationsTrend} />
          ) : (
            <EmptyState icon="chart" title="Sin tendencia" />
          )}
        </Card>
        <Card>
          <div className={s.cardTitle}>Donaciones por tipo</div>
          {data.donationsByType && data.donationsByType.length > 0 ? (
            <BarChart
              data={data.donationsByType.map((d) => ({ label: TYPE_LABEL[d.type] ?? d.type, value: d.count }))}
            />
          ) : (
            <EmptyState icon="gift" title="Sin donaciones" />
          )}
        </Card>
      </div>

      <div style={{ marginTop: 'var(--sp-4)' }}>
        <Card>
          <div className={s.cardTitle}>Inventario por categoría</div>
          {data.inventoryByCategory && data.inventoryByCategory.length > 0 ? (
            <BarChart
              tone="gold"
              data={data.inventoryByCategory.map((c) => ({ label: c.category, value: c.quantity }))}
              formatValue={(v) => formatNumber(v)}
            />
          ) : (
            <EmptyState icon="box" title="Inventario vacío" />
          )}
        </Card>
      </div>
    </div>
  );
}
