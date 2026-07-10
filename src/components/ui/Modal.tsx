import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import s from './ui.module.css';
import { IconButton } from './IconButton';
import { useBodyScrollLock, useFocusTrap } from './overlayUtils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const titleId = useId();
  useBodyScrollLock(open);
  const ref = useFocusTrap(open, onClose);

  if (!open) return null;

  return createPortal(
    <div
      className={s.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`${s.modal} ${size === 'lg' ? s.modalLg : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        {title && (
          <div className={s.modalHead}>
            <h2 className={s.modalTitle} id={titleId}>
              {title}
            </h2>
            <IconButton icon="close" label="Cerrar" onClick={onClose} />
          </div>
        )}
        <div className={s.modalBody}>{children}</div>
        {footer && <div className={s.modalFoot}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
