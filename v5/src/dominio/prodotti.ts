// Listino: aggiunta, modifica, eliminazione.
import { CATEGORIE, COLORI, type Categoria } from './costanti';
import { leggiImporto, nuovoId } from './formato';
import type { Esito, Prodotto } from './tipi';

export interface DatiProdotto {
  /** assente = prodotto nuovo */
  id?: string;
  nome: string;
  categoria: Categoria;
  /** come scritto nel campo, es. "2,50" */
  prezzo: string;
  colore: string;
}

export function salvaProdotto(prodotti: readonly Prodotto[], dati: DatiProdotto): Esito<Prodotto[]> {
  const nome = dati.nome.trim().replace(/\s+/g, ' ');
  if (!nome) return { ok: false, errore: 'Scrivi il nome del prodotto.' };
  const prezzo = leggiImporto(dati.prezzo);
  if (prezzo === null || prezzo <= 0) return { ok: false, errore: 'Il prezzo deve essere un importo maggiore di zero, es. 2,50.' };
  if (!CATEGORIE.includes(dati.categoria)) return { ok: false, errore: 'Categoria non valida.' };
  const colore = (COLORI as readonly string[]).includes(dati.colore) ? dati.colore : COLORI[0];
  if (dati.id !== undefined) {
    if (!prodotti.some(p => p.id === dati.id)) return { ok: false, errore: 'Il prodotto da modificare non esiste più.' };
    return { ok: true, valore: prodotti.map(p => (p.id === dati.id ? { ...p, nome, categoria: dati.categoria, prezzo, colore } : p)) };
  }
  return { ok: true, valore: [...prodotti, { id: nuovoId(), nome, categoria: dati.categoria, prezzo, colore }] };
}

/** Le voci già battute restano nei conti: sono copie. */
export const eliminaProdotto = (prodotti: readonly Prodotto[], id: string) => prodotti.filter(p => p.id !== id);
