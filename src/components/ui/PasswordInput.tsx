import { forwardRef, useState } from 'react';
import { Input, type InputProps } from './Input';
import { Icon } from './Icon';
import s from './ui.module.css';

/**
 * Campo de contraseña con botón para verla.
 *
 * Escribir una contraseña a ciegas en el móvil es la causa más común de "no
 * puedo entrar": el ojo deja comprobar lo tecleado sin borrar y reescribir.
 * Arranca siempre oculta y vuelve a ocultarse en cada montaje, para no dejarla
 * a la vista de quien mire la pantalla.
 */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'suffix'>>(
  function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <Input
        {...props}
        ref={ref}
        type={visible ? 'text' : 'password'}
        suffix={
          <button
            type="button"
            className={s.inputSuffixBtn}
            // El botón no es parte del formulario: al tabular se salta.
            tabIndex={-1}
            aria-pressed={visible}
            aria-label={visible ? 'Ocultar contraseña' : 'Ver contraseña'}
            title={visible ? 'Ocultar contraseña' : 'Ver contraseña'}
            onClick={() => setVisible((v) => !v)}
          >
            <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
          </button>
        }
      />
    );
  },
);
