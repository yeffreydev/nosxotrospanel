import { useRef, useState } from 'react';
import { useUploadImage } from '../../hooks/api';
import { apiErrorMessage } from '../../lib/api';
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
    try {
      const res = await upload.mutateAsync(file);
      onChange(res.url);
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo subir la imagen.'));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className={s.field}>
      {label && (
        <span className={s.label}>
          {label}
          {hint && <span className={s.labelHint}>{hint}</span>}
        </span>
      )}

      {value ? (
        <img
          src={value}
          alt=""
          style={{
            width: '100%',
            height: previewHeight,
            objectFit: previewFit,
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
          }}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            gap: 4,
            height: previewHeight,
            borderRadius: 'var(--r-md)',
            border: '1px dashed var(--border)',
            color: 'var(--text-muted)',
            background: 'var(--surface-2)',
          }}
        >
          <Icon name="image" size={22} />
          <span style={{ fontSize: 'var(--fs-sm)' }}>Sin imagen</span>
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
          {value ? 'Cambiar imagen' : 'Subir imagen'}
        </Button>
        {value && (
          <Button type="button" variant="subtle" size="sm" onClick={() => onChange('')}>
            Quitar
          </Button>
        )}
      </div>

      {error && <span className={s.fieldError}>{error}</span>}
    </div>
  );
}
