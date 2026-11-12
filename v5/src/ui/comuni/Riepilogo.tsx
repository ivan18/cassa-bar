// Fondo, incassato e totale in cassa: in tre riquadri affiancati, in righe impilate sotto i 480 px.
import { euro } from '../../dominio/formato';
import type { Centesimi } from '../../dominio/tipi';
import { cx } from './cx';

type Props = { fondo: Centesimi; incassato: Centesimi; etichettaFondo?: string };

export function Riepilogo({ fondo, incassato, etichettaFondo = 'Fondo' }: Props) {
  const riquadro = (etichetta: string, valore: Centesimi, testId: string, evidenza = false) => (
    <div className={cx(
      'flex min-w-0 items-baseline justify-between gap-2 rounded-xl px-3 py-2 min-[480px]:flex-col min-[480px]:justify-start min-[480px]:gap-0.5 min-[480px]:py-2.5',
      evidenza ? 'bg-ambra/15 shadow-[inset_0_0_0_1px_rgb(240_168_58/.4)]' : 'bg-lav-2 shadow-[inset_0_0_0_1px_theme(colors.lav.3)]',
    )}>
      <span className="text-xs text-gesso-dim">{etichetta}</span>
      <strong data-testid={testId} className={cx('whitespace-nowrap font-display text-[22px] leading-tight tabular-nums', evidenza && 'text-ambra')}>
        {euro(valore)}
      </strong>
    </div>
  );
  return (
    <div className="grid gap-1.5 min-[480px]:grid-cols-3 min-[480px]:gap-2">
      {riquadro(etichettaFondo, fondo, 'riepilogo-fondo')}
      {riquadro('Incassato', incassato, 'riepilogo-incassato', true)}
      {riquadro('In cassa', fondo + incassato, 'riepilogo-in-cassa')}
    </div>
  );
}
