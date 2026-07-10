import { useNavigate } from 'react-router-dom';
import s from './landing.module.css';
import { Button, Card, SkeletonCard, EmptyState, Icon, useToast, type IconName } from '../components/ui';
import { CampaignCard } from '../components/CampaignCard';
import { useCampaigns } from '../hooks/api';
import { useAuth } from '../store/auth';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { useT } from '../lib/i18n';
import { formatSoles, formatNumber } from '../lib/format';

interface GuideStep {
  icon: IconName;
  title: string;
  body: string;
}

const GUIDE: GuideStep[] = [
  {
    icon: 'user',
    title: 'Regístrate como organizador',
    body: 'Crea tu cuenta gratis. Al lanzar tu primera campaña activas tu perfil de organizador.',
  },
  {
    icon: 'spark',
    title: 'Define tu objetivo y meta',
    body: 'Elige un título claro, la categoría y cuánto dinero necesitas recaudar.',
  },
  {
    icon: 'gift',
    title: 'Cuenta tu historia',
    body: 'Explica el problema, a quién ayudas y en qué se usará cada sol. Agrega una portada.',
  },
  {
    icon: 'share',
    title: 'Publica y comparte',
    body: 'Publica tu campaña y difunde el enlace por WhatsApp y redes para sumar donantes.',
  },
  {
    icon: 'bell',
    title: 'Publica avances',
    body: 'Mantén informados a tus donantes con novedades. La confianza impulsa más aportes.',
  },
  {
    icon: 'trophy',
    title: 'Alcanza tu meta',
    body: 'Sigue el progreso en tiempo real con trazabilidad total hasta lograr tu objetivo.',
  },
];

export default function Landing() {
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { data: campaigns, isLoading } = useCampaigns();
  const { canInstall, installed, isIOS, promptInstall } = usePwaInstall();

  const createCampaign = () =>
    navigate(user ? '/organizador/nueva' : '/registro?role=MANAGER');

  const handleInstall = async () => {
    if (canInstall) {
      const ok = await promptInstall();
      if (ok) toast.success('¡Listo! NOSXOTROS se está instalando.');
    } else if (isIOS) {
      toast.info('En iPhone: toca Compartir → «Añadir a pantalla de inicio».');
    }
  };
  const showInstall = !installed && (canInstall || isIOS);

  const list = campaigns ?? [];
  const activeCount = list.filter((c) => c.status === 'ACTIVE' || c.status === 'FUNDED').length;
  const totalRaised = list.reduce((sum, c) => sum + c.raisedAmount, 0);
  const totalBackers = list.reduce((sum, c) => sum + c.backersCount, 0);

  return (
    <div className="n-page">
      {/* HERO — único objetivo: crear campaña */}
      <section className={s.hero} aria-labelledby="hero-title">
        <div className={s.heroGlow} aria-hidden="true" />
        <div className={s.heroInner}>
          <img src="/nosxotros_logo_white.svg" alt="NOSXOTROS" className={s.heroLogo} />
          <span className={s.heroBadge}>
            <Icon name="spark" size={16} /> Plataforma de campañas · Arequipa
          </span>
          <h1 className={s.heroTitle} id="hero-title">
            Crea tu campaña y hazla <span className={s.heroAccent}>crecer</span>
          </h1>
          <p className={s.heroSub}>
            Lanza una campaña de crecimiento, comparte tu causa y recibe aportes con
            trazabilidad total. Tu idea merece despegar.
          </p>
          <div className={s.heroCtas}>
            <Button variant="gold" size="lg" icon="spark" onClick={createCampaign}>
              {t('camp.create')}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              icon="arrowRight"
              iconRight="arrowRight"
              onClick={() => navigate('/campanas')}
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}
            >
              {t('camp.explore')}
            </Button>
            {showInstall && (
              <Button
                variant="ghost"
                size="lg"
                icon="download"
                onClick={handleInstall}
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}
              >
                Instalar app
              </Button>
            )}
          </div>

          {!isLoading && list.length > 0 && (
            <div className={s.heroStats}>
              <div className={s.heroStat}>
                <span className={s.heroStatVal}>{formatNumber(activeCount)}</span>
                <span className={s.heroStatLabel}>campañas activas</span>
              </div>
              <div className={s.heroStat}>
                <span className={s.heroStatVal}>{formatSoles(totalRaised)}</span>
                <span className={s.heroStatLabel}>recaudado</span>
              </div>
              <div className={s.heroStat}>
                <span className={s.heroStatVal}>{formatNumber(totalBackers)}</span>
                <span className={s.heroStatLabel}>donantes</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* GUÍA — pasos que sigue quien quiere crear una campaña */}
      <section className={s.section} aria-labelledby="guide-title">
        <div className={s.sectionHead}>
          <div>
            <div className={s.sectionEyebrow}>Paso a paso</div>
            <h2 className={s.sectionTitle} id="guide-title">
              Cómo crear tu campaña
            </h2>
          </div>
        </div>
        <ol className={s.guide}>
          {GUIDE.map((step, i) => (
            <li key={i} className={s.guideStep}>
              <span className={s.guideNum} aria-hidden="true">
                {i + 1}
              </span>
              <Card className={s.guideCard}>
                <span className={s.guideIcon} aria-hidden="true">
                  <Icon name={step.icon} size={22} />
                </span>
                <div>
                  <div className={s.guideStepTitle}>{step.title}</div>
                  <p className={s.guideStepBody}>{step.body}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
        <div style={{ textAlign: 'center', marginTop: 'var(--sp-5)' }}>
          <Button variant="gold" size="lg" icon="spark" onClick={createCampaign}>
            {t('camp.create')}
          </Button>
        </div>
      </section>

      {/* GALERÍA DE CAMPAÑAS */}
      <section className={s.section} aria-labelledby="camp-title">
        <div className={s.sectionHead}>
          <div>
            <div className={s.sectionEyebrow}>Inspírate</div>
            <h2 className={s.sectionTitle} id="camp-title">
              Campañas en marcha
            </h2>
          </div>
          <Button variant="ghost" icon="arrowRight" iconRight="arrowRight" onClick={() => navigate('/campanas')}>
            {t('common.viewAll')}
          </Button>
        </div>
        {isLoading ? (
          <div className="n-grid-cards">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : list.length === 0 ? (
          <Card>
            <EmptyState
              icon="spark"
              title={t('camp.noCampaigns')}
              action={
                <Button icon="spark" onClick={createCampaign}>
                  {t('camp.create')}
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="n-grid-cards">
            {list.slice(0, 6).map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </section>

      {/* BANDA CTA FINAL */}
      <section className={s.ctaBand} aria-label="Crear campaña">
        <div className={s.ctaGlow} aria-hidden="true" />
        <div className={s.ctaInner}>
          <h2 className={s.ctaTitle}>¿Tienes una idea que merece crecer?</h2>
          <p className={s.ctaSub}>Crea tu campaña hoy. Es gratis y toma minutos.</p>
          <Button variant="gold" size="lg" icon="spark" onClick={createCampaign}>
            {t('camp.create')}
          </Button>
        </div>
      </section>

      <footer className={s.footer}>
        <div className={s.footerBrand}>
          NOS<span>X</span>OTROS
        </div>
        <p className={s.footerSmall}>{t('app.tagline')}</p>
        <p className={s.footerSmall}>© 2026 NOSXOTROS · Arequipa, Perú</p>
      </footer>
    </div>
  );
}
