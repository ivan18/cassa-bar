// Modello dei dati della cassa. Importi in centesimi interi; orari "HH:MM", date "gg/mm" o "gg/mm/aaaa".
import type { Categoria, Tavolo } from './costanti';

export type Centesimi = number;

export interface Prodotto {
  id: string;
  nome: string;
  categoria: Categoria;
  prezzo: Centesimi;
  colore: string;
}

/** Riga della comanda. `socio` vuoto = Tavolo generico. `prodottoId` null = battuta extra. */
export interface Voce {
  id: string;
  prodottoId: string | null;
  nome: string;
  prezzo: Centesimi;
  qta: number;
  socio: string;
}

/** Comanda su cui si sta lavorando alla cassa (salvata anche lei: sopravvive a un ricaricamento). */
export interface Comanda {
  tavolo: Tavolo;
  voci: Voce[];
}

/** Conto salvato con "Salva conto". `ora` = ultimo salvataggio. */
export interface Conto {
  id: string;
  tavolo: Tavolo;
  voci: Voce[];
  ora: string;
}

/** Conto rimasto aperto alla chiusura cassa. */
export interface Credito {
  id: string;
  tavolo: Tavolo;
  voci: Voce[];
  ora: string;
  dataChiusura: string;
}

/** Incasso registrato nello storico. */
export interface Vendita {
  id: string;
  ora: string;
  tavolo: Tavolo;
  pagatoDa: string;
  voci: Voce[];
  totale: Centesimi;
}

/** Vendita conservata nell'archivio delle chiusure: solo ciò che serve al rendiconto. */
export interface VenditaArchiviata {
  ora: string;
  tavolo: Tavolo;
  pagatoDa: string;
  totale: Centesimi;
  voci: { nome: string; qta: number; prezzo: Centesimi; socio: string }[];
}

export interface Chiusura {
  id: string;
  data: string;
  ora: string;
  cassiere: string;
  fondoIniziale: Centesimi;
  incassato: Centesimi;
  consegnato: Centesimi;
  causale: string;
  fondoSuccessivo: Centesimi;
  creditiCreati: number;
  /** null = chiusura senza dettaglio delle vendite (es. importata da una versione vecchia) */
  vendite: VenditaArchiviata[] | null;
}

export interface PinSalvato {
  salt: string;
  hash: string;
}

export interface Intestazione {
  associazione: string;
  cassa: string;
}

/** Tutti i dati della cassa che si salvano sul dispositivo e finiscono nel backup. */
export interface StatoDominio {
  intestazione: Intestazione;
  prodotti: Prodotto[];
  soci: string[];
  seduti: Partial<Record<Tavolo, string[]>>;
  comanda: Comanda;
  contiAperti: Conto[];
  crediti: Credito[];
  /** vendite dall'ultima chiusura, la più recente per prima */
  vendite: Vendita[];
  /** chiusure registrate, la più recente per prima */
  chiusure: Chiusura[];
  fondo: Centesimi;
  /** PIN del dispositivo (da configurazione o backup); null = vale quello della build */
  pin: PinSalvato | null;
}

export type Esito<T> = { ok: true; valore: T } | { ok: false; errore: string };
