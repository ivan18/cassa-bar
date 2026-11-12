// Conti aperti: salvataggio, ordine per tavolo, comanda di un tavolo.
import { TAVOLI, type Tavolo } from './costanti';
import { nuovoId, oraBreve } from './formato';
import type { Comanda, Conto, Voce } from './tipi';

/** Salva o aggiorna il conto del tavolo della comanda (mantiene l'id, aggiorna l'ora). Comanda vuota: niente da salvare. */
export function salvaConto(conti: readonly Conto[], comanda: Comanda, adesso: Date): Conto[] {
  if (comanda.voci.length === 0) return [...conti];
  const esistente = conti.find(c => c.tavolo === comanda.tavolo);
  const conto: Conto = { id: esistente?.id ?? nuovoId(), tavolo: comanda.tavolo, voci: comanda.voci, ora: oraBreve(adesso) };
  return esistente ? conti.map(c => (c.tavolo === comanda.tavolo ? conto : c)) : [...conti, conto];
}

/** Voci del conto aperto del tavolo, o nessuna. */
export const vociDelTavolo = (conti: readonly Conto[], tavolo: Tavolo): Voce[] =>
  conti.find(c => c.tavolo === tavolo)?.voci ?? [];

/** Conti ordinati come i tavoli: Banco, poi Tavolo 1–6. */
export const contiOrdinati = (conti: readonly Conto[]) =>
  [...conti].sort((a, b) => TAVOLI.indexOf(a.tavolo) - TAVOLI.indexOf(b.tavolo));
