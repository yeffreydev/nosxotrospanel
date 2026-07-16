import s from './ui.module.css';
import { initials } from '../../lib/format';
import { assetUrl } from '../../lib/assets';

export function Avatar({
  name,
  src,
  size = 40,
}: {
  name?: string;
  src?: string;
  size?: number;
}) {
  return (
    <span
      className={s.avatar}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden={!name}
    >
      {src ? <img src={assetUrl(src)} alt={name ?? ''} /> : initials(name)}
    </span>
  );
}
