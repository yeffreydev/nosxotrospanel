import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import css from './auth.module.css';
import { Card, Input, Button, Banner, RadioCard, Icon } from '../components/ui';
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

export default function Register() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const register = useRegister();
  const googleLogin = useGoogleLogin();
  const createOrg = useCreateOrganization();
  const setSession = useAuth((s) => s.setSession);

  const initialRole = (params.get('role') as Role | null) ?? 'DONOR';
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [orgName, setOrgName] = useState('');
  const [ruc, setRuc] = useState('');
  const [role, setRole] = useState<Role>(
    ROLES.some((r) => r.value === initialRole) ? initialRole : 'DONOR',
  );
  const [error, setError] = useState('');

  const isOrg = role === 'MANAGER';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (isOrg && (ruc.trim().length !== 11 || !orgName.trim())) {
      setError(t('auth.rucRequired'));
      return;
    }
    try {
      const data = await register.mutateAsync({
        fullName,
        email,
        password,
        phone: phone || undefined,
        role,
      });
      setSession(data);
      // Organización (RUC obligatorio) para gestores/ONG.
      if (isOrg) {
        await createOrg.mutateAsync({
          name: orgName.trim(),
          ruc: ruc.trim(),
          contactEmail: email || undefined,
          contactPhone: phone || undefined,
        });
      }
      navigate(ROLE_HOME[data.user.role] ?? '/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function onGoogle(idToken: string) {
    setError('');
    try {
      // el rol seleccionado se aplica sólo si es una cuenta nueva
      const data = await googleLogin.mutateAsync({ idToken, role });
      setSession(data);
      navigate(ROLE_HOME[data.user.role] ?? '/', { replace: true });
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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
            <Input
              label={t('auth.password')}
              type="password"
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
        {t('auth.hasAccount')} <Link to="/login">{t('auth.login')}</Link>
      </p>
    </div>
  );
}
