// Filtro per iniziale su una riga scorrevole: le lettere senza nomi sono disattivate.
import { iniziale } from '../../dominio/formato';

const LETTERE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const tasto = 'h-9 min-w-9 flex-none rounded-lg bg-lav-3 px-2 text-xs font-bold aria-pressed:bg-ambra aria-pressed:text-ambra-ink disabled:opacity-30';

type Props = { nomi: readonly string[]; lettera: string; onScegli: (l: string) => void };

export function FiltroAZ({ nomi, lettera, onScegli }: Props) {
  const presenti = new Set(nomi.map(iniziale));
  return (
    <div role="group" aria-label="Filtro per iniziale" data-testid="filtro-az" className="senza-barra flex gap-1 overflow-x-auto pb-0.5">
      <button type="button" aria-pressed={lettera === ''} onClick={() => onScegli('')} className={tasto}>Tutti</button>
      {LETTERE.map(l => (
        <button key={l} type="button" aria-pressed={lettera === l} disabled={!presenti.has(l)} onClick={() => onScegli(l)} className={tasto}>{l}</button>
      ))}
    </div>
  );
}

/** Nomi che iniziano con la lettera scelta ('' = tutti). */
export const filtraPerIniziale = (nomi: readonly string[], lettera: string) => nomi.filter(n => !lettera || iniziale(n) === lettera);
