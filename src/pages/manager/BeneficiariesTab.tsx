import { useState } from 'react';
import { Input, Button, Banner, EmptyState, CenteredSpinner, useToast } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';
import { useBeneficiaries, useUpdateBeneficiaryStatus } from '../../hooks/api';
import { useT } from '../../lib/i18n';
import { apiErrorMessage } from '../../lib/api';
import s from './manager.module.css';

export function BeneficiariesTab() {
  const t = useT();
  const toast = useToast();
  const [q, setQ] = useState('');
  const { data, isLoading, isError } = useBeneficiaries(q ? { q } : undefined);
  const validate = useUpdateBeneficiaryStatus();

  const onValidate = async (id: string) => {
    try {
      await validate.mutateAsync({ id, status: 'VALIDATED' });
      toast.success(t('common.validate'));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const rows = data ?? [];

  return (
    <div>
      <div className={s.toolbar}>
        <div style={{ flex: 1, maxWidth: 360 }}>
          <Input
            placeholder={t('common.search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t('common.search')}
          />
        </div>
      </div>

      {isError && <Banner tone="warn" title="Sin datos">No se pudieron cargar los beneficiarios.</Banner>}

      {isLoading ? (
        <CenteredSpinner label={t('common.loading')} />
      ) : rows.length === 0 ? (
        <EmptyState icon="users" title="Sin beneficiarios" message="Aún no hay personas registradas." />
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Documento</th>
                <th>Nombre</th>
                <th>Hogar</th>
                <th>Distrito</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td>{b.docNumber}</td>
                  <td>
                    <strong>{b.fullName}</strong>
                  </td>
                  <td>{b.householdSize ?? '—'}</td>
                  <td>{b.district ?? '—'}</td>
                  <td>
                    <StatusBadge status={b.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {b.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="subtle"
                        icon="checkCircle"
                        onClick={() => onValidate(b.id)}
                        loading={validate.isPending}
                      >
                        {t('common.validate')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
