// Strumenti comuni ai test del dominio (girano in Node con il runner di Playwright, senza browser).
import { PRODOTTI_ESEMPIO } from '../../src/dominio/costanti';
import type { Prodotto, Voce } from '../../src/dominio/tipi';

export function prodotto(nome: string): Prodotto {
  const p = PRODOTTI_ESEMPIO.find(x => x.nome === nome);
  if (!p) throw new Error(`Prodotto di esempio mancante: ${nome}`);
  return p;
}

let n = 0;
/** Voce di prova: voce('Coca Cola', 150, 2, 'Chiara'); socio '' = Tavolo generico. */
export const voce = (nome: string, prezzo: number, qta: number, socio = ''): Voce =>
  ({ id: `v${++n}`, prodottoId: nome.toLowerCase(), nome, prezzo, qta, socio });

/** 12 novembre 2026, 22:14 (ora locale). */
export const ADESSO = new Date(2026, 10, 12, 22, 14);
