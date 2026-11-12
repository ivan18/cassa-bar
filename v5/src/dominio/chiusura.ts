// Chiusura cassa: totali, fondo per il giorno dopo, conti che diventano crediti, archivio delle vendite.
import { totale } from './comanda';
import { dataBreve, dataCompleta, nuovoId, oraBreve } from './formato';
import type { Centesimi, Chiusura, Credito, StatoDominio, Vendita, VenditaArchiviata } from './tipi';

export const incassato = (vendite: readonly Pick<Vendita, 'totale'>[]): Centesimi => vendite.reduce((s, v) => s + v.totale, 0);

export const totaleCrediti = (crediti: readonly Credito[]): Centesimi => crediti.reduce((s, c) => s + totale(c.voci), 0);

/** Numeri della serata in corso, uguali in Storico, Chiusura e report. */
export function riepilogoSerata(s: Pick<StatoDominio, 'fondo' | 'vendite' | 'crediti'>) {
  const incasso = incassato(s.vendite);
  return { fondo: s.fondo, incassato: incasso, inCassa: s.fondo + incasso, crediti: totaleCrediti(s.crediti) };
}

/** Fondo per il giorno dopo = fondo + incassato − consegnato, mai sotto zero. */
export const fondoSuccessivo = (fondo: Centesimi, incasso: Centesimi, consegnato: Centesimi) =>
  Math.max(0, fondo + incasso - consegnato);

export const archivia = (v: Vendita): VenditaArchiviata => ({
  ora: v.ora,
  tavolo: v.tavolo,
  pagatoDa: v.pagatoDa,
  totale: v.totale,
  voci: v.voci.map(({ nome, qta, prezzo, socio }) => ({ nome, qta, prezzo, socio })),
});

export interface DatiChiusura {
  cassiere: string;
  /** null = tutto l'incasso della serata */
  consegnato: Centesimi | null;
  causale: string;
}

/**
 * Registra la chiusura: archivia le vendite (dalla più vecchia), sposta i conti aperti nei crediti,
 * libera tutti i tavoli, svuota lo storico e imposta il fondo per il giorno dopo.
 */
export function chiudiCassa(stato: StatoDominio, dati: DatiChiusura, adesso: Date): { stato: StatoDominio; chiusura: Chiusura } {
  const incasso = incassato(stato.vendite);
  const consegnato = dati.consegnato ?? incasso;
  const nuoviCrediti: Credito[] = stato.contiAperti.map(c => ({
    id: nuovoId(), tavolo: c.tavolo, voci: c.voci, ora: c.ora, dataChiusura: dataBreve(adesso),
  }));
  const chiusura: Chiusura = {
    id: nuovoId(),
    data: dataCompleta(adesso),
    ora: oraBreve(adesso),
    cassiere: dati.cassiere.trim(),
    fondoIniziale: stato.fondo,
    incassato: incasso,
    consegnato,
    causale: dati.causale.trim(),
    fondoSuccessivo: fondoSuccessivo(stato.fondo, incasso, consegnato),
    creditiCreati: nuoviCrediti.length,
    vendite: [...stato.vendite].reverse().map(archivia),
  };
  return {
    chiusura,
    stato: {
      ...stato,
      crediti: [...nuoviCrediti, ...stato.crediti],
      contiAperti: [],
      seduti: {},
      comanda: { tavolo: 'Banco', voci: [] },
      vendite: [],
      chiusure: [chiusura, ...stato.chiusure],
      fondo: chiusura.fondoSuccessivo,
    },
  };
}
