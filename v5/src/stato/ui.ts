// Stato dell'interfaccia: sezione, socio attivo, fogli e finestre aperti, PIN della Gestione. Non si salva.
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { OrigineIncasso } from './store';

export type Sezione = 'cassa' | 'conti' | 'storico' | 'gestione';
export type Foglio = null | 'comanda' | 'soci' | 'extra';
export type VoceGestione = 'menu' | 'chiusura' | 'archivio';
/** Report da mostrare: la serata in corso o una chiusura dell'archivio. */
export type Report = { tipo: 'serata' } | { tipo: 'chiusura'; id: string };

export interface Conferma {
  titolo: string;
  testo: string;
  si: string;
  /** assente = semplice avviso con un solo pulsante */
  no?: string;
  /** azione distruttiva: il pulsante è rosso e non evidenziato */
  pericolo?: boolean;
  azione?: () => void;
}

export interface RichiestaPin {
  motivo: string;
  azione: () => void;
}

/** D8: la Gestione si richiude da sola dopo 2 minuti senza tocchi. */
export const BLOCCO_GESTIONE_MS = 2 * 60 * 1000;

export interface StatoUi {
  sezione: Sezione;
  /** null = automatico (primo socio seduto); '' = Tavolo generico scelto; altrimenti il nome */
  socioAttivo: string | null;
  tutti: boolean;
  categoria: string;
  foglio: Foglio;
  /** incasso aperto: da dove si incassa (comanda, conto aperto, credito) */
  incasso: OrigineIncasso | null;
  vistaConti: 'aperti' | 'crediti';
  voceGestione: VoceGestione;
  report: Report | null;
  gestioneSbloccata: boolean;
  ultimoTocco: number;
  conferma: Conferma | null;
  richiestaPin: RichiestaPin | null;
  avviso: string | null;

  vai(sezione: Sezione): void;
  apriFoglio(f: Exclude<Foglio, null>): void;
  chiudiFoglio(): void;
  apriIncasso(o: OrigineIncasso): void;
  chiudiIncasso(): void;
  /** dopo il cambio di tavolo: socio automatico, TUTTI spento */
  azzeraSocio(): void;
  scegliSocio(socio: string): void;
  cambiaTutti(): void;
  scegliCategoria(c: string): void;
  scegliVistaConti(v: 'aperti' | 'crediti'): void;
  apriVoceGestione(v: VoceGestione): void;
  apriReport(r: Report): void;
  chiudiReport(): void;
  chiediConferma(c: Conferma): void;
  chiudiConferma(): void;
  chiediPin(r: RichiestaPin): void;
  chiudiPin(): void;
  sbloccaGestione(adesso: number): void;
  bloccaGestione(): void;
  tocco(adesso: number): void;
  /** richiude la Gestione se è aperta da più di 2 minuti senza tocchi */
  controllaBlocco(adesso: number): void;
  avvisa(testo: string): void;
}

/** Richiudendo la Gestione si torna al menu e si chiude il report di una chiusura (contiene le vendite archiviate). */
const richiusa = (s: StatoUi) => ({
  gestioneSbloccata: false,
  voceGestione: 'menu' as const,
  report: s.report?.tipo === 'chiusura' ? null : s.report,
});

let timerAvviso: ReturnType<typeof setTimeout> | undefined;

export function creaUi() {
  return createStore<StatoUi>()((set, get) => ({
    sezione: 'cassa',
    socioAttivo: null,
    tutti: false,
    categoria: 'Tutti',
    foglio: null,
    incasso: null,
    vistaConti: 'aperti',
    voceGestione: 'menu',
    report: null,
    gestioneSbloccata: false,
    ultimoTocco: 0,
    conferma: null,
    richiestaPin: null,
    avviso: null,

    vai: sezione => set(s => ({
      sezione,
      foglio: null,
      incasso: null,
      report: null,
      voceGestione: 'menu',
      gestioneSbloccata: sezione === 'gestione' ? s.gestioneSbloccata : false,
    })),
    apriFoglio: foglio => set({ foglio }),
    chiudiFoglio: () => set({ foglio: null }),
    apriIncasso: incasso => set({ incasso, foglio: null }),
    chiudiIncasso: () => set({ incasso: null }),
    azzeraSocio: () => set({ socioAttivo: null, tutti: false }),
    scegliSocio: socio => set({ socioAttivo: socio, tutti: false }),
    cambiaTutti: () => set(s => ({ tutti: !s.tutti })),
    scegliCategoria: categoria => set({ categoria }),
    scegliVistaConti: vistaConti => set({ vistaConti }),
    apriVoceGestione: voceGestione => set({ voceGestione }),
    apriReport: report => set({ report }),
    chiudiReport: () => set({ report: null }),
    chiediConferma: conferma => set({ conferma }),
    chiudiConferma: () => set({ conferma: null }),
    chiediPin: richiestaPin => set({ richiestaPin }),
    chiudiPin: () => set({ richiestaPin: null }),
    sbloccaGestione: adesso => set({ gestioneSbloccata: true, ultimoTocco: adesso }),
    bloccaGestione: () => set(richiusa),
    tocco: adesso => set({ ultimoTocco: adesso }),
    controllaBlocco: adesso => {
      const s = get();
      if (s.gestioneSbloccata && adesso - s.ultimoTocco >= BLOCCO_GESTIONE_MS) {
        set(richiusa);
        get().avvisa('Gestione bloccata dopo 2 minuti senza tocchi.');
      }
    },
    avvisa: testo => {
      clearTimeout(timerAvviso);
      set({ avviso: testo });
      timerAvviso = setTimeout(() => set({ avviso: null }), 3000);
    },
  }));
}

export const ui = creaUi();
export const useUi = <T,>(selettore: (s: StatoUi) => T): T => useStore(ui, selettore);

/** Socio a cui va un prodotto battuto, dato chi è seduto e cosa è stato scelto. */
export function socioEffettivo(seduti: readonly string[], scelto: string | null): string {
  if (scelto === '') return '';
  if (scelto !== null && seduti.includes(scelto)) return scelto;
  return seduti[0] ?? '';
}
