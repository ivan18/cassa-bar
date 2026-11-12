// Comanda: voci per socio, modalità TUTTI, battuta extra, quantità, riassegnazione. Funzioni pure.
import { TAVOLO_GENERICO } from './costanti';
import { nuovoId } from './formato';
import type { Centesimi, Prodotto, Voce } from './tipi';

export const totale = (voci: readonly Voce[]): Centesimi => voci.reduce((s, v) => s + v.prezzo * v.qta, 0);

export const articoli = (voci: readonly Voce[]) => voci.reduce((s, v) => s + v.qta, 0);

/** Nome con cui una voce compare: il socio, oppure "Tavolo generico". */
export const socioDi = (v: Pick<Voce, 'socio'>) => v.socio || TAVOLO_GENERICO;

/** A chi va un prodotto battuto: a ogni socio seduto in modalità TUTTI, altrimenti al socio attivo ('' = generico). */
export function destinatari(seduti: readonly string[], attivo: string, tutti: boolean): string[] {
  return tutti && seduti.length > 0 ? [...seduti] : [attivo];
}

/** Un'unità del prodotto per ogni destinatario; si somma alla riga dello stesso prodotto e socio, se c'è. */
export function aggiungiProdotto(voci: readonly Voce[], prodotto: Prodotto, a: readonly string[]): Voce[] {
  const risultato = [...voci];
  for (const socio of a) {
    const i = risultato.findIndex(v => v.prodottoId === prodotto.id && v.socio === socio);
    const esistente = risultato[i];
    if (esistente) risultato[i] = { ...esistente, qta: esistente.qta + 1 };
    else risultato.push({ id: nuovoId(), prodottoId: prodotto.id, nome: prodotto.nome, prezzo: prodotto.prezzo, qta: 1, socio });
  }
  return risultato;
}

/** Battuta extra: nome dalla descrizione in maiuscolo (o "EXTRA"); una riga nuova per destinatario, mai unita. */
export function aggiungiExtra(voci: readonly Voce[], prezzo: Centesimi, descrizione: string, a: readonly string[]): Voce[] {
  const nome = descrizione.trim().toUpperCase() || 'EXTRA';
  return [...voci, ...a.map(socio => ({ id: nuovoId(), prodottoId: null, nome, prezzo, qta: 1, socio }))];
}

/** + / − sulla quantità; a zero la voce sparisce. */
export function cambiaQuantita(voci: readonly Voce[], id: string, delta: number): Voce[] {
  return voci.flatMap(v => (v.id !== id ? [v] : v.qta + delta > 0 ? [{ ...v, qta: v.qta + delta }] : []));
}

/** Sposta una voce su un altro socio ('' = generico). Se quel socio ha già lo stesso prodotto, le righe si uniscono. */
export function assegna(voci: readonly Voce[], id: string, socio: string): Voce[] {
  const voce = voci.find(v => v.id === id);
  if (!voce || voce.socio === socio) return [...voci];
  const gemella = voce.prodottoId !== null && voci.find(v => v.id !== id && v.prodottoId === voce.prodottoId && v.socio === socio);
  if (gemella) return voci.filter(v => v.id !== id).map(v => (v.id === gemella.id ? { ...v, qta: v.qta + voce.qta } : v));
  return voci.map(v => (v.id === id ? { ...v, socio } : v));
}

/** Voci raggruppate per chi le ha ordinate, nell'ordine in cui compaiono; Tavolo generico per ultimo. */
export function perSocio(voci: readonly Voce[]): { socio: string; voci: Voce[]; totale: Centesimi }[] {
  const gruppi = new Map<string, Voce[]>();
  for (const v of voci) gruppi.set(v.socio, [...(gruppi.get(v.socio) ?? []), v]);
  return [...gruppi.entries()]
    .sort(([a], [b]) => Number(a === '') - Number(b === ''))
    .map(([socio, vv]) => ({ socio, voci: vv, totale: totale(vv) }));
}
