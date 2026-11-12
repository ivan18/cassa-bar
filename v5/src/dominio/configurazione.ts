// File di configurazione (soci + PIN): { "tipo": "cassa-bar-config", "versione": 1, "soci"?: [...], "pin"?: "cifre" }.
// Un file non valido si rifiuta per intero, senza applicare nulla. Formato in docs/PIANO-v4.md.
import { pinValido } from './pin';
import type { Esito } from './tipi';

export const CONFIG_TIPO = 'cassa-bar-config';
export const CONFIG_VERSIONE = 1;

export interface Configurazione {
  soci?: string[];
  pin?: string;
}

/** Legge e controlla il file. L'errore spiega cosa non va; la UI aggiunge "Nessuna modifica applicata". */
export function leggiConfigurazione(testo: string): Esito<Configurazione> {
  let dati: unknown;
  try { dati = JSON.parse(testo); } catch { return { ok: false, errore: 'il file non è un JSON valido.' }; }
  const d = (dati ?? {}) as Record<string, unknown>;
  if (typeof dati !== 'object' || d.tipo !== CONFIG_TIPO) {
    return { ok: false, errore: `il file non è una configurazione della cassa (serve "tipo": "${CONFIG_TIPO}").` };
  }
  if (d.versione !== CONFIG_VERSIONE) {
    return { ok: false, errore: `versione ${String(d.versione)} non supportata (serve ${CONFIG_VERSIONE}).` };
  }
  const haSoci = d.soci !== undefined;
  const haPin = d.pin !== undefined;
  if (!haSoci && !haPin) return { ok: false, errore: 'il file non contiene né "soci" né "pin".' };
  if (haSoci && (!Array.isArray(d.soci) || d.soci.some(s => typeof s !== 'string'))) {
    return { ok: false, errore: '"soci" deve essere un elenco di nomi tra virgolette.' };
  }
  if (haPin && (typeof d.pin !== 'string' || !pinValido(d.pin))) {
    // niente PIN di esempio nel messaggio: finirebbe nel codice pubblico
    return { ok: false, errore: 'il PIN deve essere un testo di sole cifre tra virgolette, almeno 4.' };
  }
  return {
    ok: true,
    valore: { ...(haSoci ? { soci: d.soci as string[] } : {}), ...(haPin ? { pin: d.pin as string } : {}) },
  };
}
