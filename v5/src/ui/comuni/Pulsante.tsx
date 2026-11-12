// Pulsanti con le tre varianti del prototipo: principale (ambra), secondario, pericolo (rosso a contorno).
import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

type Variante = 'principale' | 'secondario' | 'pericolo';

const stili: Record<Variante, string> = {
  principale: 'bg-ambra text-ambra-ink',
  secondario: 'bg-lav-4 text-gesso',
  pericolo: 'bg-transparent text-rosso shadow-[inset_0_0_0_1px_rgb(232_112_91/.55)]',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; grande?: boolean };

export function Pulsante({ variante = 'secondario', grande = false, className, type = 'button', ...resto }: Props) {
  return (
    <button
      type={type}
      className={cx(
        'whitespace-nowrap rounded-xl px-3.5 font-bold tracking-wide disabled:cursor-not-allowed disabled:opacity-40',
        grande ? 'min-h-[54px] w-full text-base' : 'min-h-11 text-sm',
        stili[variante],
        className,
      )}
      {...resto}
    />
  );
}
