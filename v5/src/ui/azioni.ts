// Azioni dell'interfaccia che coinvolgono entrambi gli store (dati e UI): un solo posto, chiamate dai componenti.
import { leggiBackup } from '../dominio/backup';
import type { DatiChiusura } from '../dominio/chiusura';
import { articoli, destinatari, totale } from '../dominio/comanda';
import { vociNonSalvate } from '../dominio/conti';
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

function apriTavolo(tavolo: Tavolo) {
  cassa.getState().selezionaTavolo(tavolo);
  ui.getState().azzeraSocio();
}

/**
 * Passa a un altro tavolo. Se la comanda ha voci non salvate, prima chiede cosa farne:
 * salvarle nel conto, scartarle o restare. Toccare il tavolo già aperto non cambia nulla.
 */
export function selezionaTavolo(tavolo: Tavolo, dopo: () => void = () => {}) {
  const s = cassa.getState();
  const attuale = s.comanda.tavolo;
  if (tavolo === attuale) { dopo(); return; }
  if (!vociNonSalvate(s.comanda, s.contiAperti)) { apriTavolo(tavolo); dopo(); return; }
  const n = articoli(s.comanda.voci);
  ui.getState().chiediConferma({
    titolo: `Voci non salvate al ${attuale}`,
    testo: `${n === 1 ? '1 articolo' : `${n} articoli`} (${euro(totale(s.comanda.voci))}) non ${n === 1 ? 'è' : 'sono'} nel conto. Cosa vuoi fare prima di passare al ${tavolo}?`,
    si: 'Salva e cambia',
    no: 'Resta qui',
    azione: () => {
      cassa.getState().salvaConto(new Date());
      apriTavolo(tavolo);
      ui.getState().avvisa(`Conto del ${attuale} salvato.`);
      dopo();
    },
    altra: {
      testo: 'Scarta',
      pericolo: true,
      azione: () => { apriTavolo(tavolo); dopo(); },
    },
  });
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
  selezionaTavolo(tavolo, () => ui.getState().vai('cassa'));
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

export function eliminaProdotto(id: string, dopo: () => void) {
  const p = cassa.getState().prodotti.find(x => x.id === id);
  if (!p) return;
  ui.getState().chiediConferma({
    titolo: `Eliminare ${p.nome}?`,
    testo: 'Il prodotto sparisce dal listino. Le voci già battute restano nei conti.',
    si: 'Elimina',
    no: 'Annulla',
    pericolo: true,
    azione: () => {
      cassa.getState().eliminaProdotto(id);
      dopo();
      ui.getState().avvisa(`${p.nome} eliminato.`);
    },
  });
}

/** Iscrive un socio; true se il campo si può svuotare. */
export function iscriviSocio(nome: string): boolean {
  const esito = cassa.getState().aggiungiSocio(nome);
  const pulito = nome.trim().replace(/\s+/g, ' ');
  if (esito === 'vuoto') { ui.getState().avvisa('Scrivi il nome del socio.'); return false; }
  ui.getState().avvisa(esito === 'aggiunto' ? `${pulito} iscritto.` : `${pulito} è già iscritto.`);
  return esito === 'aggiunto';
}

/** Elimina un socio dall'anagrafica e dai tavoli (D10), con conferma. */
export function eliminaSocio(nome: string) {
  const tavoli = Object.entries(cassa.getState().seduti).filter(([, m]) => m?.includes(nome)).map(([t]) => t);
  ui.getState().chiediConferma({
    titolo: `Eliminare ${nome}?`,
    testo: tavoli.length
      ? `${nome} è seduto al ${tavoli.join(', ')}: verrà tolto anche dal tavolo. Le voci già battute restano nel conto.`
      : `${nome} viene tolto dall'anagrafica.`,
    si: 'Elimina',
    no: 'Annulla',
    pericolo: true,
    azione: () => {
      cassa.getState().eliminaSocio(nome);
      ui.getState().avvisa(`${nome} eliminato.`);
    },
  });
}

/** Scarica il backup come file JSON (Blob + link temporaneo: funziona offline). */
export function esportaBackup() {
  const { nomeFile, contenuto } = cassa.getState().esportaBackup(new Date());
  const url = URL.createObjectURL(new Blob([contenuto], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeFile;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  ui.getState().chiediConferma({
    titolo: 'Backup esportato',
    testo: `File ${nomeFile}\n\nContiene prodotti, soci, conti aperti, crediti, storico, chiusure archiviate, fondo cassa, intestazione e il PIN solo come hash.\n\nConservalo in un posto privato: contiene i nomi dei soci.`,
    si: 'OK',
  });
}

const rifiutato = (titolo: string, errore: string) => ui.getState().chiediConferma({
  titolo,
  testo: `${errore.charAt(0).toUpperCase()}${errore.slice(1)}\nNessuna modifica applicata.`,
  si: 'OK',
  pericolo: true,
});

/** Importa un backup: controlla il file, chiede conferma, poi sostituisce i dati del dispositivo. */
export function importaBackup(testo: string, nomeFile: string) {
  const letto = leggiBackup(testo);
  if (!letto.ok) return rifiutato('Backup non importato', letto.errore);
  ui.getState().chiediConferma({
    titolo: 'Sostituire i dati attuali?',
    testo: `Il backup ${nomeFile} sostituisce prodotti, soci, conti, crediti, storico e chiusure di questo dispositivo. Se il backup non contiene il PIN, il PIN del dispositivo non cambia.`,
    si: 'Ripristina',
    no: 'Annulla',
    pericolo: true,
    azione: () => {
      const esito = cassa.getState().importaBackup(testo);
      if (!esito.ok) return rifiutato('Backup non importato', esito.errore);
      ui.getState().azzeraSocio();
      ui.getState().chiediConferma({ titolo: 'Backup ripristinato', testo: 'I dati del backup sono ora su questo dispositivo.', si: 'OK' });
    },
  });
}

export async function caricaConfigurazione(testo: string) {
  const esito = await cassa.getState().caricaConfigurazione(testo);
  if (!esito.ok) return rifiutato('Configurazione non caricata', esito.errore);
  ui.getState().chiediConferma({ titolo: 'Configurazione caricata', testo: esito.valore.join('\n'), si: 'OK' });
}

/** Dall'avviso di memoria piena all'archivio delle chiusure (D14); se serve, prima il PIN. */
export function liberaSpazio() {
  ui.getState().vai('gestione');
  ui.getState().apriVoceGestione('archivio');
}
