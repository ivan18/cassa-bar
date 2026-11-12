// Azioni dell'interfaccia che coinvolgono entrambi gli store (dati e UI): un solo posto, chiamate dai componenti.
import type { DatiChiusura } from '../dominio/chiusura';
import { destinatari, totale } from '../dominio/comanda';
import type { Tavolo } from '../dominio/costanti';
import { euro } from '../dominio/formato';
import { cassa } from '../stato/cassa';
import { socioEffettivo, ui } from '../stato/ui';

/** Chi riceve un prodotto battuto ora: tutti i seduti in modalità TUTTI, altrimenti il socio attivo. */
function aChi(): string[] {
  const s = cassa.getState();
  const u = ui.getState();
  const seduti = s.seduti[s.comanda.tavolo] ?? [];
  return destinatari(seduti, socioEffettivo(seduti, u.socioAttivo), u.tutti);
}

export function selezionaTavolo(tavolo: Tavolo) {
  cassa.getState().selezionaTavolo(tavolo);
  ui.getState().azzeraSocio();
}

export const batti = (prodottoId: string) => cassa.getState().aggiungiProdotto(prodottoId, aChi());

export const battiExtra = (prezzo: number, descrizione: string) => cassa.getState().aggiungiExtra(prezzo, descrizione, aChi());

export function salvaConto() {
  const tavolo = cassa.getState().comanda.tavolo;
  if (!cassa.getState().salvaConto(new Date())) return;
  ui.getState().azzeraSocio();
  ui.getState().chiudiFoglio();
  ui.getState().avvisa(`Conto del ${tavolo} salvato.`);
}

export function svuotaComanda() {
  const tavolo = cassa.getState().comanda.tavolo;
  ui.getState().chiediConferma({
    titolo: 'Svuotare la comanda?',
    testo: `Si tolgono tutte le voci di ${tavolo}.`,
    si: 'Svuota',
    no: 'Annulla',
    pericolo: true,
    azione: () => cassa.getState().svuotaComanda(),
  });
}

export function modificaConto(tavolo: Tavolo) {
  selezionaTavolo(tavolo);
  ui.getState().vai('cassa');
}

/** Elimina un conto aperto: cancella soldi già registrati, quindi chiede il PIN (D3). */
export function eliminaConto(tavolo: Tavolo) {
  const conto = cassa.getState().contiAperti.find(c => c.tavolo === tavolo);
  if (!conto) return;
  ui.getState().chiediPin({
    motivo: `Elimina il conto del ${tavolo} (${euro(totale(conto.voci))}).`,
    azione: () => {
      cassa.getState().eliminaConto(tavolo);
      ui.getState().avvisa(`Conto del ${tavolo} eliminato.`);
    },
  });
}

/** Elimina un credito: cancella un debito, quindi chiede il PIN (D3). */
export function eliminaCredito(id: string) {
  const credito = cassa.getState().crediti.find(c => c.id === id);
  if (!credito) return;
  ui.getState().chiediPin({
    motivo: `Elimina il credito del ${credito.tavolo} del ${credito.dataChiusura} (${euro(totale(credito.voci))}).`,
    azione: () => {
      cassa.getState().eliminaCredito(id);
      ui.getState().avvisa('Credito eliminato.');
    },
  });
}

export function impostaFondo(fondo: number) {
  cassa.getState().impostaFondo(fondo);
  ui.getState().avvisa(`Fondo cassa impostato a ${euro(cassa.getState().fondo)}.`);
}

export function azzeraFondo() {
  ui.getState().chiediConferma({
    titolo: 'Azzerare il fondo cassa?',
    testo: `Il fondo passa da ${euro(cassa.getState().fondo)} a ${euro(0)}.`,
    si: 'Azzera',
    no: 'Annulla',
    pericolo: true,
    azione: () => {
      cassa.getState().impostaFondo(0);
      ui.getState().avvisa('Fondo cassa azzerato.');
    },
  });
}

/** Registra la chiusura, torna al menu della Gestione e propone di stampare il report (D12). */
export function registraChiusura(dati: DatiChiusura) {
  const c = cassa.getState().chiudiCassa(dati, new Date());
  const conti = c.creditiCreati === 0 ? 'Nessun conto aperto.'
    : c.creditiCreati === 1 ? '1 conto aperto è passato nei crediti.'
      : `${c.creditiCreati} conti aperti sono passati nei crediti.`;
  ui.getState().apriVoceGestione('menu');
  ui.getState().chiediConferma({
    titolo: 'Chiusura registrata',
    testo: `${conti} I tavoli sono liberi.\nConsegnato al presidente: ${euro(c.consegnato)}.\nNuovo fondo cassa: ${euro(c.fondoSuccessivo)}.\n\nVuoi stampare il report della chiusura?`,
    si: 'Stampa report',
    no: 'Non ora',
    azione: () => ui.getState().apriReport({ tipo: 'chiusura', id: c.id }),
  });
}

/** Elimina una chiusura dall'archivio (siamo già in Gestione: basta la conferma). */
export function eliminaChiusura(id: string) {
  const c = cassa.getState().chiusure.find(x => x.id === id);
  if (!c) return;
  const n = c.vendite?.length ?? 0;
  ui.getState().chiediConferma({
    titolo: `Eliminare la chiusura del ${c.data.slice(0, 5)}?`,
    testo: n > 0
      ? `Si perdono anche ${n === 1 ? 'la vendita archiviata' : `le ${n} vendite archiviate`}. Conviene esportare un backup prima.`
      : "La chiusura viene tolta dall'archivio.",
    si: 'Elimina',
    no: 'Annulla',
    pericolo: true,
    azione: () => {
      cassa.getState().eliminaChiusura(id);
      ui.getState().avvisa('Chiusura eliminata.');
    },
  });
}
