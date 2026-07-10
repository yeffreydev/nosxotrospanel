import { Link } from 'react-router-dom';
import s from './layout/layout.module.css';

export function Brand({ to = '/', logo = false }: { to?: string; logo?: boolean }) {
  if (logo) {
    return (
      <Link to={to} className={s.brand} aria-label="NOSXOTROS inicio">
        <img
          src="/nosxotros_logo_white.svg"
          alt="NOSXOTROS"
          className={s.brandLogo}
          width={150}
          height={35}
        />
      </Link>
    );
  }
  return (
    <Link to={to} className={s.brand} aria-label="NOSXOTROS inicio">
      <span className={s.brandMark} aria-hidden="true">
        N
      </span>
      <span>
        NOS<span className={s.brandX}>X</span>OTROS
      </span>
    </Link>
  );
}
