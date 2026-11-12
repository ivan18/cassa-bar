// Azioni dell'interfaccia che coinvolgono entrambi gli store (dati e UI): un solo posto, chiamate dai componenti.
import { destinatari } from '../dominio/comanda';
import { totale } from '../dominio/comanda';
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
