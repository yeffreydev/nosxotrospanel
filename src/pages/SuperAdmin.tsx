import { useCallback, useEffect, useState } from 'react';
import { Card, Input, Button, Banner, Badge, Icon, ConfirmDialog } from '../components/ui';
import { formatSoles } from '../lib/format';

const SA_KEY = 'nx_sa_token';

interface Organizer {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  emailVerified: boolean;
  isActive: boolean;
  organization?: { id: string; name: string; ruc?: string | null; verified: boolean } | null;
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

async function saFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/superadmin${path}`, {
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
    throw new Error(msg);
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
      const res = await fetch('/api/superadmin/login', {
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
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState<SaCampaign | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [orgs, camps] = await Promise.all([
        saFetch<Organizer[]>('/organizers', token),
        saFetch<SaCampaign[]>('/campaigns', token),
      ]);
      setOrganizers(orgs);
      setCampaigns(camps);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error';
      setError(msg);
      if (/superadmin/i.test(msg) || /401/.test(msg)) onExpired();
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

      {/* Organizadores */}
      <h2 style={{ fontSize: 'var(--fs-lg)', margin: 'var(--sp-4) 0 var(--sp-3)' }}>
        <Icon name="users" size={18} /> Organizadores ({organizers.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {organizers.map((o) => {
          const verified = o.organization?.verified || o.emailVerified;
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
                {!verified && (
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
        {campaigns.map((c) => (
          <Card key={c.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <div>
                <strong>{c.title}</strong> <Badge tone="neutral">{c.status}</Badge>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                  {c.organizer?.fullName ?? '—'} · {formatSoles(c.raisedAmount)} · {c.backersCount} donantes · {c.donationsCount} donaciones · {c.zonesCount} zonas
                </div>
              </div>
              <Button size="sm" variant="danger" icon="close" onClick={() => setToDelete(c)}>Eliminar</Button>
            </div>
          </Card>
        ))}
        {campaigns.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Sin campañas.</p>}
      </div>

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
