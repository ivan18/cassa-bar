// Store della cassa (Zustand). Strato sottile: ogni azione chiama le funzioni pure di dominio/ e fa un solo `set`.
// Persistenza con `persist` su un'unica chiave versionata, `cassa5_stato`, separata dalle chiavi `cassa_*` della v4.2.
import { createStore } from 'zustand/vanilla';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { applicaBackup, creaBackup, leggiBackup } from '../dominio/backup';
import { chiudiCassa as chiudi, type DatiChiusura } from '../dominio/chiusura';
import * as comanda from '../dominio/comanda';
import { leggiConfigurazione } from '../dominio/configurazione';
import { salvaConto as salva, vociDelTavolo } from '../dominio/conti';
import { FONDO_PREDEFINITO, INTESTAZIONE_PREDEFINITA, PRODOTTI_ESEMPIO, SOCI_ESEMPIO, type Tavolo } from '../dominio/costanti';
import { nuovoId, oraBreve } from '../dominio/formato';
import { dividi, etichettaPagatore, sedutiDopoIncasso, type Selezione } from '../dominio/incasso';
import { creaPin, pinVerificabile, verificaPin } from '../dominio/pin';
import { eliminaProdotto as elimina, salvaProdotto as salvaP, type DatiProdotto } from '../dominio/prodotti';
import { aggiungiSoci, aggiungiSocio as aggiungi, cambiaSeduto, eliminaSocio as eliminaS, ordinaSoci, type EsitoSocio } from '../dominio/soci';
import type { Centesimi, Chiusura, Esito, PinSalvato, StatoDominio, Vendita } from '../dominio/tipi';

export const CHIAVE_ARCHIVIO = 'cassa5_stato';
export const VERSIONE_ARCHIVIO = 1;

export type OrigineIncasso = { tipo: 'comanda' } | { tipo: 'conto'; tavolo: Tavolo } | { tipo: 'credito'; id: string };

export interface AzioniCassa {
  impostaIntestazione(associazione: string, cassa: string): void;
  selezionaTavolo(tavolo: Tavolo): void;
  cambiaSeduto(socio: string): void;
  aggiungiProdotto(prodottoId: string, destinatari: readonly string[]): void;
  aggiungiExtra(prezzo: Centesimi, descrizione: string, destinatari: readonly string[]): void;
  cambiaQuantita(voceId: string, delta: number): void;
  assegnaVoce(voceId: string, socio: string): void;
  svuotaComanda(): void;
  /** false se la comanda è vuota */
  salvaConto(adesso: Date): boolean;
  /** null se non c'è niente da incassare */
  incassa(origine: OrigineIncasso, selezione: Selezione, adesso: Date): Vendita | null;
  eliminaConto(tavolo: Tavolo): void;
  eliminaCredito(id: string): void;
  impostaFondo(fondo: Centesimi): void;
  chiudiCassa(dati: DatiChiusura, adesso: Date): Chiusura;
  eliminaChiusura(id: string): void;
  salvaProdotto(dati: DatiProdotto): Esito<null>;
  eliminaProdotto(id: string): void;
  aggiungiSocio(nome: string): EsitoSocio;
  eliminaSocio(nome: string): void;
  verificaPin(inserito: string): Promise<boolean>;
  /** Esito positivo: righe del riepilogo ("Soci aggiunti: …", "PIN aggiornato.") */
  caricaConfigurazione(testo: string): Promise<Esito<string[]>>;
  esportaBackup(adesso: Date): { nomeFile: string; contenuto: string };
  importaBackup(testo: string): Esito<null>;
}

export type StatoCassa = StatoDominio & AzioniCassa & {
  /** un salvataggio è fallito per memoria piena (non si salva) */
  memoriaPiena: boolean;
};

export function statoIniziale(): StatoDominio {
  return {
    intestazione: { ...INTESTAZIONE_PREDEFINITA },
    prodotti: PRODOTTI_ESEMPIO.map(p => ({ ...p })),
    soci: ordinaSoci(SOCI_ESEMPIO),
    seduti: {},
    comanda: { tavolo: 'Banco', voci: [] },
    contiAperti: [],
    crediti: [],
    vendite: [],
    chiusure: [],
    fondo: FONDO_PREDEFINITO,
    pin: null,
  };
}

/** Solo i dati del dominio: ciò che si salva e che va nel backup. */
export function datiDominio(s: StatoDominio): StatoDominio {
  const { intestazione, prodotti, soci, seduti, comanda: c, contiAperti, crediti, vendite, chiusure, fondo, pin } = s;
  return { intestazione, prodotti, soci, seduti, comanda: c, contiAperti, crediti, vendite, chiusure, fondo, pin };
}

export function creaStore({ archivio, pinBuild }: { archivio: StateStorage; pinBuild: PinSalvato }) {
  return createStore<StatoCassa>()(
    persist(
      (set, get) => {
        /** Aggiorna le voci della comanda in corso. */
        const voci = (f: (v: StatoDominio['comanda']['voci']) => StatoDominio['comanda']['voci']) =>
          set(s => ({ comanda: { ...s.comanda, voci: f(s.comanda.voci) } }));

        return {
          ...statoIniziale(),
          memoriaPiena: false,

          impostaIntestazione: (associazione, cassa) => set(s => ({
            intestazione: {
              associazione: associazione.trim() || s.intestazione.associazione,
              cassa: cassa.trim() || s.intestazione.cassa,
            },
          })),

          // Come nella v4.2: si apre il conto salvato del tavolo, oppure una comanda vuota.
          selezionaTavolo: tavolo => set(s => ({ comanda: { tavolo, voci: vociDelTavolo(s.contiAperti, tavolo) } })),

          cambiaSeduto: socio => set(s => ({ seduti: cambiaSeduto(s.seduti, s.comanda.tavolo, socio) })),

          aggiungiProdotto: (prodottoId, a) => {
            const prodotto = get().prodotti.find(p => p.id === prodottoId);
            if (prodotto) voci(v => comanda.aggiungiProdotto(v, prodotto, a));
          },

          aggiungiExtra: (prezzo, descrizione, a) => {
            if (Number.isInteger(prezzo) && prezzo > 0) voci(v => comanda.aggiungiExtra(v, prezzo, descrizione, a));
          },

          cambiaQuantita: (id, delta) => voci(v => comanda.cambiaQuantita(v, id, delta)),
          assegnaVoce: (id, socio) => voci(v => comanda.assegna(v, id, socio)),
          svuotaComanda: () => voci(() => []),

          salvaConto: adesso => {
            const s = get();
            if (s.comanda.voci.length === 0) return false;
            const contiAperti = salva(s.contiAperti, s.comanda, adesso);
            set({ contiAperti, comanda: { tavolo: 'Banco', voci: vociDelTavolo(contiAperti, 'Banco') } });
            return true;
          },

          incassa: (origine, selezione, adesso) => {
            const s = get();
            const credito = origine.tipo === 'credito' ? s.crediti.find(c => c.id === origine.id) : undefined;
            const conto = origine.tipo === 'conto' ? s.contiAperti.find(c => c.tavolo === origine.tavolo) : undefined;
            if ((origine.tipo === 'credito' && !credito) || (origine.tipo === 'conto' && !conto)) return null;
            const daPagare = credito?.voci ?? conto?.voci ?? s.comanda.voci;
            const tavolo = credito?.tavolo ?? conto?.tavolo ?? s.comanda.tavolo;
            if (selezione.length !== daPagare.length) return null;
            const { pagate, restanti } = dividi(daPagare, selezione);
            if (pagate.length === 0) return null;

            const vendita: Vendita = {
              id: nuovoId(), ora: oraBreve(adesso), tavolo,
              pagatoDa: etichettaPagatore(pagate, restanti, credito?.dataChiusura),
              voci: pagate, totale: comanda.totale(pagate),
            };
            const vendite = [vendita, ...s.vendite];

            if (credito) {
              set({
                vendite,
                crediti: restanti.length
                  ? s.crediti.map(c => (c.id === credito.id ? { ...c, voci: restanti } : c))
                  : s.crediti.filter(c => c.id !== credito.id),
              });
              return vendita;
            }

            const contiAperti = restanti.length
              ? s.contiAperti.map(c => (c.tavolo === tavolo ? { ...c, voci: restanti } : c))
              : s.contiAperti.filter(c => c.tavolo !== tavolo);
            const seduti = { ...s.seduti, [tavolo]: sedutiDopoIncasso(s.seduti[tavolo] ?? [], pagate, restanti) };
            // La comanda aperta su quel tavolo segue l'incasso; a conto saldato si torna al Banco.
            const comandaDopo = s.comanda.tavolo !== tavolo ? s.comanda
              : restanti.length ? { tavolo, voci: restanti } : { tavolo: 'Banco' as const, voci: vociDelTavolo(contiAperti, 'Banco') };
            set({ vendite, contiAperti, seduti, comanda: comandaDopo });
            return vendita;
          },

          // Eliminare il conto svuota anche la comanda di quel tavolo, se è aperta; i soci restano seduti.
          eliminaConto: tavolo => set(s => ({
            contiAperti: s.contiAperti.filter(c => c.tavolo !== tavolo),
            comanda: s.comanda.tavolo === tavolo ? { tavolo, voci: [] } : s.comanda,
          })),

          eliminaCredito: id => set(s => ({ crediti: s.crediti.filter(c => c.id !== id) })),

          impostaFondo: fondo => { if (Number.isInteger(fondo) && fondo >= 0) set({ fondo }); },

          chiudiCassa: (dati, adesso) => {
            const { stato, chiusura } = chiudi(datiDominio(get()), dati, adesso);
            set(stato);
            return chiusura;
          },

          eliminaChiusura: id => set(s => ({ chiusure: s.chiusure.filter(c => c.id !== id) })),

          salvaProdotto: dati => {
            const esito = salvaP(get().prodotti, dati);
            if (!esito.ok) return esito;
            set({ prodotti: esito.valore });
            return { ok: true, valore: null };
          },

          eliminaProdotto: id => set(s => ({ prodotti: elimina(s.prodotti, id) })),

          aggiungiSocio: nome => {
            const r = aggiungi(get().soci, nome);
            if (r.esito === 'aggiunto') set({ soci: r.soci });
            return r.esito;
          },

          eliminaSocio: nome => set(s => eliminaS(s, nome)),

          verificaPin: inserito => verificaPin(inserito.trim(), get().pin ?? pinBuild),

          caricaConfigurazione: async testo => {
            const letta = leggiConfigurazione(testo);
            if (!letta.ok) return letta;
            const { soci, pin } = letta.valore;
            if (pin !== undefined && !pinVerificabile()) return { ok: false, errore: 'questo browser non supporta la verifica del PIN.' };
            const righe: string[] = [];
            const modifiche: Partial<StatoDominio> = {};
            if (soci) {
              const r = aggiungiSoci(get().soci, soci);
              modifiche.soci = r.soci;
              righe.push(`Soci aggiunti: ${r.aggiunti}${r.giaPresenti ? ` (${r.giaPresenti} già ${r.giaPresenti === 1 ? 'presente' : 'presenti'})` : ''}.`);
            }
            if (pin !== undefined) {
              modifiche.pin = await creaPin(pin);
              righe.push('PIN aggiornato.');
            }
            set(modifiche);
            return { ok: true, valore: righe };
          },

          esportaBackup: adesso => creaBackup(datiDominio(get()), adesso),

          importaBackup: testo => {
            const letto = leggiBackup(testo);
            if (!letto.ok) return letto;
            set(applicaBackup(datiDominio(get()), letto.valore));
            return { ok: true, valore: null };
          },
        };
      },
      {
        name: CHIAVE_ARCHIVIO,
        version: VERSIONE_ARCHIVIO,
        storage: createJSONStorage(() => archivio),
        partialize: s => datiDominio(s),
      },
    ),
  );
}

export type StoreCassa = ReturnType<typeof creaStore>;
