import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import css from './auth.module.css';
import { Card, Input, Button, Banner } from '../components/ui';
import { useLogin, useGoogleLogin } from '../hooks/api';
import { useAuth, ROLE_HOME } from '../store/auth';
import { useT } from '../lib/i18n';
import { apiErrorMessage } from '../lib/api';
import GoogleButton from '../components/GoogleButton';

interface LocationState {
  from?: string;
}

export default function Login() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const googleLogin = useGoogleLogin();
  const setSession = useAuth((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function finish(data: Parameters<typeof setSession>[0]) {
    setSession(data);
    const from = (location.state as LocationState | null)?.from;
    navigate(from ?? ROLE_HOME[data.user.role] ?? '/', { replace: true });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      finish(await login.mutateAsync({ email, password }));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function onGoogle(idToken: string) {
    setError('');
    try {
      finish(await googleLogin.mutateAsync({ idToken }));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className={`n-page ${css.wrap}`}>
      <div className={css.head}>
        <h1 className={css.title}>{t('auth.loginTitle')}</h1>
      </div>

      <Card>
        <form className={css.form} onSubmit={onSubmit}>
          {error && (
            <Banner tone="error" title={t('common.error')}>
              {error}
            </Banner>
          )}
          <Input
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
          />
          <Input
            label={t('auth.password')}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Button type="submit" block size="lg" loading={login.isPending}>
            {t('auth.login')}
          </Button>
        </form>

        <div className={css.divider}>{t('auth.orContinue')}</div>
        <div className={css.oauth}>
          <GoogleButton
            onCredential={onGoogle}
            text="signin_with"
            disabled
            label={t('auth.google')}
            soon={t('auth.googleSoon')}
          />
        </div>

        <p className={css.hint}>{t('auth.demoHint')}</p>
      </Card>

      <p className={css.foot}>
        {t('auth.noAccount')} <Link to="/registro">{t('auth.register')}</Link>
      </p>
    </div>
  );
}
