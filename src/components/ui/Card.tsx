import type { HTMLAttributes, ReactNode } from 'react';
import s from './ui.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  pad?: boolean;
  hover?: boolean;
  children: ReactNode;
}

export function Card({ pad = true, hover, className, children, ...rest }: CardProps) {
  const cls = [s.card, pad ? s.cardPad : '', hover ? s.cardHover : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export interface CardButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  pad?: boolean;
  children: ReactNode;
}

export function CardButton({ pad = true, className, children, ...rest }: CardButtonProps) {
  const cls = [s.card, s.cardHover, s.cardInteractive, pad ? s.cardPad : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
