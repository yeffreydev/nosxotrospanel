import { useState } from 'react';
import { Badge, Button, Card, Icon, SkeletonCard, StatCard } from './ui';
import { useCentersSummary } from '../hooks/api';
import { formatNumber } from '../lib/format';
import s from './CentersSummary.module.css';

const PREVIEW_ROWS = 8;

/**
 * Mini dashboard de acopio: indicadores arriba y, por producto, una barra
 * apilada que separa lo que está en los centros de acopio de lo que ya pasó al
 * almacén central, medida contra la meta de campaña (falta / sobra).
 *
 * Con `campaignId` resume solo esa campaña; sin él, toda la plataforma.
 */
export function CentersSummary({ campaignId }: { campaignId?: string }) {
  const { data, isLoading } = useCentersSummary(campaignId);
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className={s.statGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }
  if (!data || data.centers.total === 0) return null;

  const { centers, stock, goals, products } = data;
  const visible = showAll ? products : products.slice(0, PREVIEW_ROWS);
  const hidden = products.length - visible.length;

  return (
    <>
      <div className={s.statGrid}>
        <StatCard
          icon="box"
          label={`En acopio · ${centers.acopio} centro${centers.acopio === 1 ? '' : 's'}`}
          value={formatNumber(stock.acopioQty)}
        />
        <StatCard
          icon="home"
          label={
            centers.central > 0
              ? 'En almacén central'
              : 'En almacén central · sin almacén'
          }
          value={formatNumber(stock.centralQty)}
        />
        <StatCard icon="chart" label="Existencia total" value={formatNumber(stock.totalQty)} />
        <StatCard
          icon="checkCircle"
          label="Metas cubiertas"
          value={goals.total > 0 ? `${goals.reached}/${goals.total}` : '—'}
        />
      </div>
      {products.length > 0 && (
        <Card className={s.card}>
          <div className={s.head}>
            <div className={s.title}>
              <Icon name="list" size={18} />
              Qué hay en total, producto por producto
            </div>
            <div className={s.legend}>
              <span className={s.legendItem}>
                <span className={`${s.dot} ${s.dotAcopio}`} />
                En centros de acopio
              </span>
              <span className={s.legendItem}>
                <span className={`${s.dot} ${s.dotCentral}`} />
                En almacén central
              </span>
            </div>
          </div>
          <div className={s.rows}>
            {visible.map((p) => {
              const max = Math.max(p.targetQty, p.totalQty, 1);
              const title =
                `${p.name}: ${formatNumber(p.acopioQty)} en acopio · ` +
                `${formatNumber(p.centralQty)} en almacén central` +
                (p.targetQty > 0 ? ` · meta ${formatNumber(p.targetQty)} ${p.unit}` : '');
              return (
                <div className={s.row} key={`${p.nameKey}|${p.unit}`}>
                  <div className={s.name}>
                    {p.icon ? `${p.icon} ` : ''}
                    {p.name} <span className={s.unit}>· {p.unit}</span>
                    <div className={s.split}>
                      Acopio {formatNumber(p.acopioQty)} · Almacén {formatNumber(p.centralQty)}
                    </div>
                  </div>
                  <div className={s.bar} title={title}>
                    {p.acopioQty > 0 && (
                      <span
                        className={s.segAcopio}
                        style={{ width: `${(p.acopioQty / max) * 100}%` }}
                      />
                    )}
                    {p.centralQty > 0 && (
                      <span
                        className={s.segCentral}
                        style={{ width: `${(p.centralQty / max) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className={s.qty}>
                    <div className={s.qtyLine}>
                      <strong>{formatNumber(p.totalQty)}</strong>
                      {p.targetQty > 0 && ` / ${formatNumber(p.targetQty)}`} {p.unit}
                    </div>
                    <GoalBadge
                      remaining={p.remaining}
                      targetQty={p.targetQty}
                      totalQty={p.totalQty}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {(hidden > 0 || showAll) && (
            <div className={s.more}>
              <Button variant="subtle" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Ver menos' : `Ver los ${products.length} productos`}
              </Button>
            </div>
          )}
        </Card>
      )}
    </>
  );
}

/** Distancia a la meta: cuánto falta, cuánto sobra o si no hay meta. */
function GoalBadge({
  remaining,
  targetQty,
  totalQty,
}: {
  remaining: number | null;
  targetQty: number;
  totalQty: number;
}) {
  if (remaining === null) return <Badge tone="neutral">Sin meta</Badge>;
  if (remaining > 0) {
    // Rojo cuando ni la mitad de la meta está reunida; ámbar cuando se acerca.
    return (
      <Badge tone={totalQty < targetQty / 2 ? 'danger' : 'warn'}>
        Faltan {formatNumber(remaining)}
      </Badge>
    );
  }
  if (remaining < 0) return <Badge tone="gold">Sobran {formatNumber(-remaining)}</Badge>;
  return <Badge tone="success">Meta cumplida</Badge>;
}
