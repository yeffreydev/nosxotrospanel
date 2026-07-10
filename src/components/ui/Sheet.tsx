import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import s from './ui.module.css';
import { IconButton } from './IconButton';
import { useBodyScrollLock, useFocusTrap } from './overlayUtils';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  side?: 'bottom' | 'right';
  children: ReactNode;
}

/** Bottom sheet (mobile) / right drawer. Focus-trapped, Esc to close. */
export function Sheet({ open, onClose, title, side = 'bottom', children }: SheetProps) {
  const titleId = useId();
  useBodyScrollLock(open);
  const ref = useFocusTrap(open, onClose);

  if (!open) return null;

  return createPortal(
    <div
      className={s.sheetOverlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={side === 'right' ? s.sheetRight : s.sheetBottom}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        {side === 'bottom' && <div className={s.sheetHandle} />}
        <div className={s.sheetHead}>
          <span className={s.sheetTitle} id={titleId}>
            {title}
          </span>
          <IconButton icon="close" label="Cerrar" onClick={onClose} />
        </div>
        <div className={s.sheetBody}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
