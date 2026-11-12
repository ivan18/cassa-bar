// Tastierino numerico a schermo: cifre, ⌫ e un tasto a sinistra dello zero (virgola per gli importi, C per il PIN).
export type Tasto = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | ',' | 'C' | '⌫';

type Props = { onTasto: (t: Tasto) => void; sinistro: ',' | 'C' };

const CIFRE: Tasto[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function Tastierino({ onTasto, sinistro }: Props) {
  const tasto = (t: Tasto, etichetta: string, aria?: string, secondario = false) => (
    <button
      key={t}
      type="button"
      data-tasto={t}
      aria-label={aria}
      onClick={() => onTasto(t)}
      className={secondario
        ? 'min-h-[50px] rounded-xl bg-lav-3 text-[15px] text-gesso-dim'
        : 'min-h-[50px] rounded-xl bg-lav-3 font-display text-2xl font-semibold'}
    >
      {etichetta}
    </button>
  );
  return (
    <div className="grid grid-cols-3 gap-[7px]">
      {CIFRE.map(c => tasto(c, c))}
      {tasto(sinistro, sinistro, sinistro === 'C' ? 'Cancella tutto' : 'Virgola', true)}
      {tasto('0', '0')}
      {tasto('⌫', '⌫', "Cancella l'ultima cifra", true)}
    </div>
  );
}

/** Aggiorna un importo digitato ("12,5") con un tasto: al massimo due decimali e sei cifre. */
export function digitaImporto(attuale: string, t: Tasto): string {
  if (t === '⌫') return attuale.slice(0, -1);
  if (t === 'C') return '';
  if (t === ',') return attuale.includes(',') ? attuale : (attuale || '0') + ',';
  const [, decimali] = attuale.split(',');
  if (decimali !== undefined && decimali.length >= 2) return attuale;
  if (attuale.replace(',', '').length >= 6) return attuale;
  return (attuale === '0' ? '' : attuale) + t;
}
