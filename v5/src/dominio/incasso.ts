// Incasso per quantità: selezione di quante unità di ogni voce pagare, chi ha pagato, soci che escono, resto.
import { socioDi, totale } from './comanda';
import type { Centesimi, Voce } from './tipi';

/** Quantità da pagare per ogni voce, nello stesso ordine delle voci. */
export type Selezione = number[];

/** 'TUTTO' = intero tavolo, 'NIENTE' = azzera, { socio } = quota di quel socio. */
export type Preselezione = 'TUTTO' | 'NIENTE' | { socio: string };

/** All'apertura dell'incasso è selezionato tutto. */
export const selezioneCompleta = (voci: readonly Voce[]): Selezione => voci.map(v => v.qta);

export function preseleziona(voci: readonly Voce[], p: Preselezione): Selezione {
  if (p === 'TUTTO') return selezioneCompleta(voci);
  if (p === 'NIENTE') return voci.map(() => 0);
  return voci.map(v => (v.socio === p.socio ? v.qta : 0));
}

/** + / − su una voce, tra 0 e la quantità della voce. */
export function cambiaSelezione(voci: readonly Voce[], sel: Selezione, indice: number, delta: number): Selezione {
  const max = voci[indice]?.qta ?? 0;
  return sel.map((q, i) => (i === indice ? Math.min(max, Math.max(0, q + delta)) : q));
}

/** Soci che hanno una quota (le voci del Tavolo generico non sono la quota di nessuno). */
export const sociConQuota = (voci: readonly Voce[]) => [...new Set(voci.map(v => v.socio).filter(Boolean))];

export const daIncassare = (voci: readonly Voce[], sel: Selezione): Centesimi =>
  voci.reduce((s, v, i) => s + v.prezzo * (sel[i] ?? 0), 0);

/** Separa ciò che si paga ora da ciò che resta da pagare. */
export function dividi(voci: readonly Voce[], sel: Selezione): { pagate: Voce[]; restanti: Voce[] } {
  const pagate: Voce[] = [];
  const restanti: Voce[] = [];
  voci.forEach((v, i) => {
    const q = Math.min(v.qta, Math.max(0, sel[i] ?? 0));
    if (q > 0) pagate.push({ ...v, qta: q });
    if (v.qta > q) restanti.push({ ...v, qta: v.qta - q });
  });
  return { pagate, restanti };
}

/**
 * Chi ha pagato, come compare nello Storico:
 * credito → "Credito del gg/mm"; tutto pagato → "Intero tavolo"; più soci → "Parziale";
 * un socio con altre voci ancora da pagare → "Nome (parziale)"; altrimenti il nome.
 */
export function etichettaPagatore(pagate: readonly Voce[], restanti: readonly Voce[], dataCredito?: string): string {
  if (dataCredito !== undefined) return `Credito del ${dataCredito}`;
  if (restanti.length === 0) return 'Intero tavolo';
  const pagatori = [...new Set(pagate.map(socioDi))];
  if (pagatori.length !== 1) return 'Parziale';
  const pagatore = pagatori[0] as string;
  return restanti.some(v => socioDi(v) === pagatore) ? `${pagatore} (parziale)` : pagatore;
}

/** Soci seduti dopo l'incasso: esce chi ha appena pagato e non ha più voci; a conto saldato il tavolo si libera. */
export function sedutiDopoIncasso(seduti: readonly string[], pagate: readonly Voce[], restanti: readonly Voce[]): string[] {
  if (restanti.length === 0) return [];
  const ancoraDebitori = new Set(restanti.map(socioDi));
  const escono = new Set(pagate.map(socioDi).filter(s => !ancoraDebitori.has(s)));
  return seduti.filter(m => !escono.has(m));
}

export const resto = (dovuto: Centesimi, contante: Centesimi) => Math.max(0, contante - dovuto);
export const mancano = (dovuto: Centesimi, contante: Centesimi) => Math.max(0, dovuto - contante);

export { totale };
