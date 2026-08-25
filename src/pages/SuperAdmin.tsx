import { useCallback, useEffect, useState } from 'react';
import { Card, Input, Button, Banner, Badge, Icon, ConfirmDialog } from '../components/ui';
import { formatSoles } from '../lib/format';

const SA_KEY = 'nx_sa_token';

// Misma base que el cliente axios (lib/api.ts): sin VITE_API_URL usa el proxy
// de Vite; publicado apunta al backend. Con "/api" fijo, el host estático
// reescribe a index.html y el POST responde 405.
const SA_BASE = `${import.meta.env.VITE_API_URL || '/api'}/superadmin`;

interface Organizer {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  emailVerified: boolean;
  isActive: boolean;
  organization?: { id: string; name: string; ruc?: string | null; verified: boolean } | null;
}
interface SaPayment {
  id: string;
  code: string;
  amount: number | null;
  currency: string;
  createdAt: string;
  anonymous: boolean;
  donorName?: string | null;
  donorEmail?: string | null;
  campaign?: { id: string; slug: string; title: string } | null;
  payment: {
    status: 'PENDING' | 'PAID' | string;
    method: string;
    payerAccountNumber?: string | null;
    operationNumber?: string | null;
    receiptUrl?: string | null;
    reference?: string | null;
    paidAt?: string | null;
  } | null;
}
interface SaCampaign {
  id: string;
  slug: string;
  title: string;
  status: string;
  raisedAmount: number;
  backersCount: number;
  organizer?: { id: string; fullName: string; email: string };
  donationsCount: number;
  zonesCount: number;
}

// Error con el status HTTP a mano: la sesión solo se da por vencida con un 401
// real, no por cualquier mensaje que mencione "superadmin" (un 404 de un
// backend desactualizado deslogueaba al instante).
class SaError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function saFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SA_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const b = await res.json();
      msg = Array.isArray(b?.message) ? b.message.join(', ') : b?.message ?? msg;
    } catch {
      /* sin cuerpo */
    }
    throw new SaError(msg, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export default function SuperAdmin() {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SA_KEY);
    } catch {
      return null;
    }
  });

  const logout = () => {
    try {
      localStorage.removeItem(SA_KEY);
    } catch {
      /* ignore */
    }
    setToken(null);
  };

  if (!token) return <LoginView onToken={(tk) => { try { localStorage.setItem(SA_KEY, tk); } catch { /* ignore */ } setToken(tk); }} />;
  return <Dashboard token={token} onLogout={logout} onExpired={logout} />;
}

function LoginView({ onToken }: { onToken: (t: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${SA_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.message ?? 'No se pudo iniciar sesión');
      }
      const data = (await res.json()) as { token: string };
      onToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '10vh auto', padding: 'var(--sp-4)' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--sp-4)' }}>
        <Icon name="shield" size={40} />
        <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-black)' }}>Superadmin</h1>
        <p style={{ color: 'var(--text-muted)' }}>Acceso restringido</p>
      </div>
      <Card>
        <form onSubmit={submit} style={{ display: 'grid', gap: 'var(--sp-3)' }}>
          {error && <Banner tone="error" title="Error">{error}</Banner>}
          <Input label="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          <Input label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" block size="lg" loading={loading} disabled={!username || !password}>
            Ingresar
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Dashboard({ token, onLogout, onExpired }: { token: string; onLogout: () => void; onExpired: () => void }) {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [campaigns, setCampaigns] = useState<SaCampaign[]>([]);
  const [payments, setPayments] = useState<SaPayment[]>([]);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState<SaCampaign | null>(null);
  const [toUnverify, setToUnverify] = useState<Organizer | null>(null);
  const [toConfirmPay, setToConfirmPay] = useState<SaPayment | null>(null);
  const [showPaid, setShowPaid] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [orgs, camps, pays] = await Promise.all([
        saFetch<Organizer[]>('/organizers', token),
        saFetch<SaCampaign[]>('/campaigns', token),
        saFetch<SaPayment[]>('/payments', token),
      ]);
      setOrganizers(orgs);
      setCampaigns(camps);
      setPayments(pays);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error';
      setError(msg);
      if (err instanceof SaError && err.status === 401) onExpired();
    }
  }, [token, onExpired]);

  useEffect(() => {
    load();
  }, [load]);

  const verify = async (id: string) => {
    try {
      await saFetch(`/organizers/${id}/verify`, token, { method: 'POST', body: '{}' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const doUnverify = async () => {
    if (!toUnverify) return;
    setBusy(true);
    try {
      await saFetch(`/organizers/${toUnverify.id}/verify`, token, { method: 'DELETE' });
      setToUnverify(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  // Publicada = cualquier estado menos DRAFT, que es el único que el listado
  // público oculta. Publicar la pone ACTIVE; despublicar, DRAFT.
  const setPublished = async (c: SaCampaign, published: boolean) => {
    try {
      await saFetch(`/campaigns/${c.id}/published`, token, {
        method: 'PATCH',
        body: JSON.stringify({ published }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const doConfirmPay = async () => {
    if (!toConfirmPay) return;
    setBusy(true);
    try {
      await saFetch(`/payments/${toConfirmPay.id}/confirm`, token, {
        method: 'POST',
        body: '{}',
      });
      setToConfirmPay(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await saFetch(`/campaigns/${toDelete.id}`, token, { method: 'DELETE' });
      setToDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
        <h1 style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-black)' }}>
          <Icon name="shield" size={20} /> Superadmin
        </h1>
        <Button variant="ghost" icon="logout" onClick={onLogout}>Salir</Button>
      </div>

      {error && <div style={{ marginBottom: 'var(--sp-3)' }}><Banner tone="error" title="Error">{error}</Banner></div>}

      {/* Pagos: todo el dinero que llega, para cotejarlo y acreditarlo aquí. */}
      {(() => {
        const pending = payments.filter((p) => p.payment?.status !== 'PAID');
        const paid = payments.filter((p) => p.payment?.status === 'PAID');
        const visible = showPaid ? payments : pending;
        return (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 'var(--sp-4) 0 var(--sp-3)' }}>
              <h2 style={{ fontSize: 'var(--fs-lg)', margin: 0 }}>
                <Icon name="chart" size={18} /> Pagos por verificar ({pending.length})
              </h2>
              <Button size="sm" variant="ghost" onClick={() => setShowPaid((v) => !v)}>
                {showPaid ? 'Ocultar acreditados' : `Ver acreditados (${paid.length})`}
              </Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {visible.map((p) => {
                const isPaid = p.payment?.status === 'PAID';
                return (
                  <Card key={p.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
                        <strong>{formatSoles(p.amount ?? 0)}</strong>{' '}
                        {isPaid
                          ? <Badge tone="success" dot>Acreditado</Badge>
                          : <Badge tone="warn" dot>Por verificar</Badge>}{' '}
                        <Badge tone="neutral">{p.payment?.method ?? '—'}</Badge>
                        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                          {p.anonymous ? 'Donante anónimo' : (p.donorName ?? 'Sin nombre')}
                          {p.donorEmail ? ` (${p.donorEmail})` : ''}
                          {p.campaign ? ` · ${p.campaign.title}` : ' · sin campaña'}
                          {` · ${new Date(p.createdAt).toLocaleString()}`}
                        </div>
                        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                          Cuenta origen: {p.payment?.payerAccountNumber ?? '—'}
                          {' · '}Operación: {p.payment?.operationNumber ?? '—'}
                          {' · '}Código: {p.code}
                          {isPaid && p.payment?.paidAt ? ` · acreditado el ${new Date(p.payment.paidAt).toLocaleString()}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexShrink: 0 }}>
                        {p.payment?.receiptUrl && (
                          <a
                            href={p.payment.receiptUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            style={{ fontSize: 'var(--fs-sm)', color: 'var(--brand-700)', fontWeight: 'var(--fw-bold)' }}
                          >
                            Ver voucher
                          </a>
                        )}
                        {!isPaid && (
                          <Button size="sm" icon="check" onClick={() => setToConfirmPay(p)}>
                            Acreditar
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
              {visible.length === 0 && (
                <p style={{ color: 'var(--text-muted)' }}>
                  {showPaid ? 'Sin pagos registrados.' : 'No hay pagos pendientes de verificar.'}
                </p>
              )}
            </div>
          </>
        );
      })()}

      {/* Organizadores */}
      <h2 style={{ fontSize: 'var(--fs-lg)', margin: 'var(--sp-4) 0 var(--sp-3)' }}>
        <Icon name="users" size={18} /> Organizadores ({organizers.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {organizers.map((o) => {
          // Con organización manda su verificación: quitarla deja emailVerified
          // intacto, así que mirarlo también dejaría la fila "Verificada" para
          // siempre. Sin organización solo queda el correo como señal.
          const verified = o.organization ? o.organization.verified : o.emailVerified;
          return (
            <Card key={o.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <div>
                  <strong>{o.fullName}</strong>{' '}
                  {verified ? <Badge tone="success" dot>Verificado</Badge> : <Badge tone="warn" dot>Pendiente</Badge>}
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                    {o.email}{o.phone ? ` · ${o.phone}` : ''}
                    {o.organization ? ` · ${o.organization.name} (RUC ${o.organization.ruc ?? '—'})` : ' · sin organización'}
                  </div>
                </div>
                {verified ? (
                  // Solo se puede quitar la verificación de una organización.
                  o.organization && (
                    <Button size="sm" variant="ghost" icon="close" onClick={() => setToUnverify(o)}>
                      Quitar verificación
                    </Button>
                  )
                ) : (
                  <Button size="sm" icon="check" onClick={() => verify(o.id)}>Verificar</Button>
                )}
              </div>
            </Card>
          );
        })}
        {organizers.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Sin organizadores.</p>}
      </div>

      {/* Campañas */}
      <h2 style={{ fontSize: 'var(--fs-lg)', margin: 'var(--sp-5) 0 var(--sp-3)' }}>
        <Icon name="spark" size={18} /> Campañas ({campaigns.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {campaigns.map((c) => {
          const published = c.status !== 'DRAFT';
          return (
            <Card key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <div>
                  <strong>{c.title}</strong> <Badge tone="neutral">{c.status}</Badge>{' '}
                  {published ? <Badge tone="success" dot>Publicada</Badge> : <Badge tone="warn" dot>No publicada</Badge>}
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                    {c.organizer?.fullName ?? '—'} · {formatSoles(c.raisedAmount)} · {c.backersCount} donantes · {c.donationsCount} donaciones · {c.zonesCount} zonas
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--sp-2)', flexShrink: 0 }}>
                  <Button
                    size="sm"
                    variant={published ? 'ghost' : 'primary'}
                    icon={published ? 'close' : 'globe'}
                    onClick={() => setPublished(c, !published)}
                  >
                    {published ? 'Despublicar' : 'Publicar'}
                  </Button>
                  <Button size="sm" variant="danger" icon="close" onClick={() => setToDelete(c)}>Eliminar</Button>
                </div>
              </div>
            </Card>
          );
        })}
        {campaigns.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Sin campañas.</p>}
      </div>

      <ConfirmDialog
        open={!!toUnverify}
        title="Quitar verificación"
        message={
          toUnverify
            ? `¿Quitar la verificación de "${toUnverify.organization?.name ?? toUnverify.fullName}"? La organización volverá a aparecer como pendiente. Puedes verificarla de nuevo cuando quieras.`
            : undefined
        }
        confirmLabel="Quitar verificación"
        cancelLabel="Cancelar"
        loading={busy}
        onConfirm={doUnverify}
        onCancel={() => setToUnverify(null)}
      />

      <ConfirmDialog
        open={!!toConfirmPay}
        title="Acreditar pago"
        message={
          toConfirmPay
            ? `¿Acreditar ${formatSoles(toConfirmPay.amount ?? 0)} de ${toConfirmPay.anonymous ? 'donante anónimo' : (toConfirmPay.donorName ?? 'sin nombre')}${toConfirmPay.campaign ? ` para "${toConfirmPay.campaign.title}"` : ''}? El aporte sumará al recaudado público de la campaña. Verifica antes el abono en el estado de cuenta.`
            : undefined
        }
        confirmLabel="Acreditar"
        cancelLabel="Cancelar"
        loading={busy}
        onConfirm={doConfirmPay}
        onCancel={() => setToConfirmPay(null)}
      />

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Eliminar campaña"
        message={toDelete ? `¿Eliminar "${toDelete.title}"? Esta acción no se puede deshacer. Las donaciones y centros se desvincularán; zonas y brigadas se eliminarán.` : undefined}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        loading={busy}
        onConfirm={doDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
