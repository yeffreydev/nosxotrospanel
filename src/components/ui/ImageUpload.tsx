import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useUploadImage } from '../../hooks/api';
import { apiErrorMessage } from '../../lib/api';
import { assetUrl } from '../../lib/assets';
import { Button } from './Button';
import { Icon } from './Icon';
import s from './ui.module.css';

const MAX_BYTES = 5 * 1024 * 1024; // debe coincidir con el límite del backend

export interface ImageUploadProps {
  label?: string;
  hint?: string;
  /** URL de la imagen actual ('' si no hay). */
  value: string;
  onChange: (url: string) => void;
  /** Alto de la vista previa. Usa 140 para cuadrados (QR). */
  previewHeight?: number;
  previewFit?: 'cover' | 'contain';
}

// Selector de imagen: sube el archivo al backend y devuelve la URL guardada.
export function ImageUpload({
  label,
  hint,
  value,
  onChange,
  previewHeight = 180,
  previewFit = 'cover',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();
  const [error, setError] = useState<string | null>(null);
  // Vista previa local: se ve apenas se elige el archivo, sin esperar al backend.
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);

  const src = localPreview ?? assetUrl(value);

  // Al cambiar de imagen hay que reevaluar carga/error: si no, una rota deja el
  // estado pegado y la siguiente nunca se muestra.
  useEffect(() => {
    setLoaded(false);
    setBroken(false);
  }, [src]);

  // Libera el object URL de la vista previa local al reemplazarla o desmontar.
  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    },
    [localPreview],
  );

  async function pick(file?: File) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('La imagen supera 5 MB. Usa una más liviana.');
      return;
    }
    const preview = URL.createObjectURL(file);
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return preview;
    });
    try {
      const res = await upload.mutateAsync(file);
      onChange(res.url);
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo subir la imagen.'));
      setLocalPreview(null);
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function clear() {
    setLocalPreview(null);
    setError(null);
    onChange('');
  }

  const frame: CSSProperties = {
    position: 'relative',
    height: previewHeight,
    borderRadius: 'var(--r-md)',
    overflow: 'hidden',
    background: 'var(--surface-2)',
    display: 'grid',
    placeItems: 'center',
  };

  return (
    <div className={s.field}>
      {label && (
        <span className={s.label}>
          {label}
          {hint && <span className={s.labelHint}>{hint}</span>}
        </span>
      )}

      {src && !broken ? (
        <div style={{ ...frame, border: '1px solid var(--border)' }}>
          <img
            src={src}
            alt=""
            onLoad={() => setLoaded(true)}
            onError={() => setBroken(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: previewFit,
              // Aparece recién cargada: sin destello ni salto de layout.
              opacity: loaded ? 1 : 0,
              transition: 'opacity .2s ease',
            }}
          />
          {(!loaded || upload.isPending) && (
            <span className={s.spinner} style={{ position: 'absolute', width: 22, height: 22 }} />
          )}
        </div>
      ) : (
        <div style={{ ...frame, gap: 4, border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
          <Icon name={broken ? 'alert' : 'image'} size={22} />
          <span style={{ fontSize: 'var(--fs-sm)', textAlign: 'center', padding: '0 var(--sp-2)' }}>
            {broken ? 'No se pudo cargar la imagen guardada' : 'Sin imagen'}
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        hidden
        onChange={(e) => void pick(e.target.files?.[0])}
      />

      <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        <Button
          type="button"
          variant="subtle"
          size="sm"
          icon="upload"
          loading={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {src ? 'Cambiar imagen' : 'Subir imagen'}
        </Button>
        {src && (
          <Button type="button" variant="subtle" size="sm" onClick={clear}>
            Quitar
          </Button>
        )}
      </div>

      {error && <span className={s.fieldError}>{error}</span>}
    </div>
  );
}
