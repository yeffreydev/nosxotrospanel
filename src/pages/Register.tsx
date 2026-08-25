import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import css from './auth.module.css';
import { Card, Input, PasswordInput, Button, Banner, RadioCard, Icon } from '../components/ui';
import type { IconName } from '../components/ui';
import { useRegister, useGoogleLogin, useCreateOrganization } from '../hooks/api';
import { useAuth, ROLE_HOME } from '../store/auth';
import { useT } from '../lib/i18n';
import { apiErrorMessage } from '../lib/api';
import type { Role } from '../lib/types';
import GoogleButton from '../components/GoogleButton';

const ROLES: { value: Role; icon: IconName }[] = [
  { value: 'DONOR', icon: 'heart' },
  { value: 'VOLUNTEER', icon: 'spark' },
  { value: 'MANAGER', icon: 'shield' },
  { value: 'REGISTRAR', icon: 'user' },
];

const TOTAL_STEPS = 2;

// Destino tras registrarse. Solo rutas internas: un "next" externo sería un
// redirect abierto desde la landing pública.
function safeNext(value: string | null): string | undefined {
  if (!value) return undefined;
  return value.startsWith('/') && !value.startsWith('//') ? value : undefined;
}

export default function Register() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  // Origen (p.ej. /organizador/nueva): tras registrarse se va directo ahí.
  // Puede venir por state (navegación interna) o por ?next= (landing pública).
  const nextParam = safeNext(params.get('next'));
  const from = (location.state as { from?: string } | null)?.from ?? nextParam;
  const register = useRegister();
  const googleLogin = useGoogleLogin();
  const createOrg = useCreateOrganization();
  const setSession = useAuth((s) => s.setSession);

  const initialRole = (params.get('role') as Role | null) ?? 'DONOR';
  // Datos que llegan prellenados desde la landing: se salta la elección de rol.
  const prefilled = ['name', 'email', 'phone', 'org', 'ruc'].some((k) => !!params.get(k));
  const [step, setStep] = useState<1 | 2>(prefilled ? 2 : 1);
  const [fullName, setFullName] = useState(params.get('name') ?? '');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(params.get('phone') ?? '');
  const [orgName, setOrgName] = useState(params.get('org') ?? '');
  const [ruc, setRuc] = useState((params.get('ruc') ?? '').replace(/\D/g, '').slice(0, 11));
  const [role, setRole] = useState<Role>(
    ROLES.some((r) => r.value === initialRole) ? initialRole : 'DONOR',
  );
  const [error, setError] = useState('');

  const isOrg = role === 'MANAGER';

  // Con sesión abierta no hay nada que registrar: al destino pedido.
  const user = useAuth((s) => s.user);
  useEffect(() => {
    if (user && from) navigate(from, { replace: true });
  }, [user, from, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (isOrg && (ruc.trim().length !== 11 || !orgName.trim())) {
      setError(t('auth.rucRequired'));
      return;
    }
    let data;
    try {
      data = await register.mutateAsync({
        fullName,
        email,
        password,
        phone: phone || undefined,
        role,
      });
    } catch (err) {
      // El backend responde con el dato exacto en conflicto (teléfono o email
      // duplicado): se muestra tal cual y además marcado en el campo.
      setError(apiErrorMessage(err));
      return;
    }
    setSession(data);
    // Organización (RUC obligatorio) para gestores/ONG.
    if (isOrg) {
      try {
        await createOrg.mutateAsync({
          name: orgName.trim(),
          ruc: ruc.trim(),
          contactEmail: email || undefined,
          contactPhone: phone || undefined,
        });
      } catch (err) {
        // La cuenta ya quedó creada: sin esta aclaración la persona reintenta
        // todo el formulario y choca con "email ya registrado".
        setError(
          `Tu cuenta se creó, pero la organización no: ${apiErrorMessage(err)} Puedes iniciar sesión y completar tu organización desde tu panel.`,
        );
        return;
      }
    }
    navigate(from ?? ROLE_HOME[data.user.role] ?? '/', { replace: true });
  }

  // Conflictos que devuelve el backend (409): además del banner, se marca el
  // campo exacto para que la persona sepa qué dato cambiar.
  const phoneFieldError = /tel[ée]fono/i.test(error) ? error : undefined;
  const emailFieldError =
    !phoneFieldError && /email|correo/i.test(error) ? error : undefined;

  async function onGoogle(idToken: string) {
    setError('');
    try {
      // el rol seleccionado se aplica sólo si es una cuenta nueva
      const data = await googleLogin.mutateAsync({ idToken, role });
      setSession(data);
      navigate(from ?? ROLE_HOME[data.user.role] ?? '/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const googleBlock = (
    <>
      <div className={css.divider}>{t('auth.orContinue')}</div>
      <div className={css.oauth}>
        <GoogleButton
          onCredential={onGoogle}
          text="signup_with"
          disabled
          label={t('auth.google')}
          soon={t('auth.googleSoon')}
        />
      </div>
    </>
  );

  return (
    <div className={`n-page ${css.wrap}`}>
      <div className={css.head}>
        <h1 className={css.title}>{t('auth.registerTitle')}</h1>
        <div className={css.steps} aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              className={`${css.stepDot} ${i + 1 <= step ? css.stepDotOn : ''}`}
            />
          ))}
        </div>
        <p className={css.sub}>
          {t('auth.stepOf', { n: step, total: TOTAL_STEPS })}
        </p>
      </div>

      <Card>
        {error && (
          <Banner tone="error" title={t('common.error')}>
            {error}
          </Banner>
        )}

        {step === 1 && (
          <div className={css.form}>
            <div>
              <div className={css.label}>{t('auth.chooseRole')}</div>
              <p className={css.stepHint}>{t('auth.chooseRoleHint')}</p>
            </div>
            <div className={css.roleList}>
              {ROLES.map((r) => (
                <RadioCard
                  key={r.value}
                  icon={r.icon}
                  title={t(`role.${r.value}`)}
                  desc={t(`roleDesc.${r.value}`)}
                  active={role === r.value}
                  onClick={() => setRole(r.value)}
                />
              ))}
            </div>
            <Button
              type="button"
              block
              size="lg"
              iconRight="arrowRight"
              onClick={() => {
                setError('');
                setStep(2);
              }}
            >
              {t('common.continue')}
            </Button>
            {googleBlock}
          </div>
        )}

        {step === 2 && (
          <form className={css.form} onSubmit={onSubmit}>
            <button
              type="button"
              className={css.backLink}
              onClick={() => setStep(1)}
            >
              <Icon name="chevronLeft" size={16} />
              {t('common.back')}
            </button>

            <div className={css.rolePill}>
              <Icon
                name={ROLES.find((r) => r.value === role)?.icon ?? 'user'}
                size={16}
              />
              {t(`role.${role}`)}
            </div>

            <Input
              label={t('auth.fullName')}
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label={t('auth.email')}
              type="email"
              required
              autoComplete="email"
              value={email}
              error={emailFieldError}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
            <PasswordInput
              label={t('auth.password')}
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
            <Input
              label={t('auth.phone')}
              hint={isOrg ? undefined : t('common.optional')}
              type="tel"
              autoComplete="tel"
              value={phone}
              error={phoneFieldError}
              onChange={(e) => setPhone(e.target.value)}
            />

            {isOrg && (
              <>
                <div className={css.label} style={{ marginTop: 'var(--sp-2)' }}>
                  {t('auth.orgStep')}
                </div>
                <Input
                  label={t('auth.orgName')}
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
                <Input
                  label={t('auth.ruc')}
                  hint={t('auth.rucHint')}
                  required
                  inputMode="numeric"
                  maxLength={11}
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value.replace(/\D/g, ''))}
                  placeholder="20481234567"
                />
              </>
            )}

            <Button type="submit" block size="lg" loading={register.isPending || createOrg.isPending}>
              {t('auth.register')}
            </Button>
            {googleBlock}
          </form>
        )}
      </Card>

      <p className={css.foot}>
        {t('auth.hasAccount')}{' '}
        <Link to={from ? `/login?next=${encodeURIComponent(from)}` : '/login'}>{t('auth.login')}</Link>
      </p>
    </div>
  );
}
