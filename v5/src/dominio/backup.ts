// Backup della v5: { tipo: "cassa-bar-backup", versione: 5, esportatoIl, dati: StatoDominio }.
// Contiene il PIN solo come salt + hash. L'import dei backup della v4 arriverà con la migrazione (prima del rilascio).
import { CONFIG_TIPO } from './configurazione';
import { CATEGORIE, TAVOLI } from './costanti';
import { dataFile } from './formato';
import type { Esito, StatoDominio } from './tipi';

export const BACKUP_TIPO = 'cassa-bar-backup';
export const BACKUP_VERSIONE = 5;

export function creaBackup(stato: StatoDominio, adesso: Date): { nomeFile: string; contenuto: string } {
  const backup = { tipo: BACKUP_TIPO, versione: BACKUP_VERSIONE, esportatoIl: adesso.toISOString(), dati: stato };
  return { nomeFile: `backup_cassa_${dataFile(adesso)}.json`, contenuto: JSON.stringify(backup, null, 2) };
}

export function leggiBackup(testo: string): Esito<StatoDominio> {
  let d: Record<string, unknown>;
  try { d = JSON.parse(testo) as Record<string, unknown>; } catch { return { ok: false, errore: 'il file non è un JSON valido.' }; }
  if (!d || typeof d !== 'object') return { ok: false, errore: 'il file non è un backup della cassa.' };
  if (d.tipo === CONFIG_TIPO) return { ok: false, errore: 'questo è un file di configurazione: usa "Carica configurazione".' };
  if (d.tipo === undefined && ('products' in d || 'customerList' in d)) {
    return { ok: false, errore: 'è un backup della v4: l\'importazione dei backup v4 arriverà prima del rilascio della v5.' };
  }
  if (d.tipo !== BACKUP_TIPO) return { ok: false, errore: 'il file non è un backup della cassa.' };
  if (typeof d.versione !== 'number' || d.versione > BACKUP_VERSIONE) {
    return { ok: false, errore: 'il backup è stato creato da una versione più recente della cassa.' };
  }
  if (d.versione !== BACKUP_VERSIONE) return { ok: false, errore: `versione ${d.versione} del backup non supportata.` };
  const problema = controllaStato(d.dati);
  if (problema) return { ok: false, errore: `dati non validi (${problema}).` };
  return { ok: true, valore: d.dati as StatoDominio };
}

/** Sostituisce i dati con quelli del backup; se il backup non ha un PIN, resta quello del dispositivo (D5). */
export const applicaBackup = (attuale: StatoDominio, importato: StatoDominio): StatoDominio =>
  ({ ...importato, pin: importato.pin ?? attuale.pin });

// ---------- controllo della forma dei dati ----------
type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isImporto = (x: unknown) => Number.isInteger(x) && (x as number) >= 0;
const isTavolo = (x: unknown) => (TAVOLI as readonly unknown[]).includes(x);

function controllaElenco(x: unknown, nome: string, voce: (e: Obj) => string | null): string | null {
  if (!Array.isArray(x)) return nome;
  for (const [i, e] of x.entries()) {
    const p = isObj(e) ? voce(e) : '';
    if (p !== null) return `${nome}[${i}]${p ? '.' + p : ''}`;
  }
  return null;
}

const controllaVoce = (v: Obj): string | null =>
  !isStr(v.id) ? 'id' : !(v.prodottoId === null || isStr(v.prodottoId)) ? 'prodottoId' : !isStr(v.nome) ? 'nome'
    : !isImporto(v.prezzo) ? 'prezzo' : !(Number.isInteger(v.qta) && (v.qta as number) > 0) ? 'qta' : !isStr(v.socio) ? 'socio' : null;

const controllaVoci = (x: unknown) => controllaElenco(x, 'voci', controllaVoce);

const controllaConto = (c: Obj): string | null =>
  !isStr(c.id) ? 'id' : !isTavolo(c.tavolo) ? 'tavolo' : !isStr(c.ora) ? 'ora' : controllaVoci(c.voci);

function controllaStato(x: unknown): string | null {
  if (!isObj(x)) return 'dati';
  const s = x;
  if (!isObj(s.intestazione) || !isStr(s.intestazione.associazione) || !isStr(s.intestazione.cassa)) return 'intestazione';
  const p = controllaElenco(s.prodotti, 'prodotti', e =>
    !isStr(e.id) ? 'id' : !isStr(e.nome) ? 'nome' : !(CATEGORIE as readonly unknown[]).includes(e.categoria) ? 'categoria'
      : !isImporto(e.prezzo) ? 'prezzo' : !isStr(e.colore) ? 'colore' : null);
  if (p) return p;
  if (!Array.isArray(s.soci) || !s.soci.every(isStr)) return 'soci';
  if (!isObj(s.seduti) || !Object.entries(s.seduti).every(([t, m]) => isTavolo(t) && Array.isArray(m) && m.every(isStr))) return 'seduti';
  if (!isObj(s.comanda) || !isTavolo(s.comanda.tavolo)) return 'comanda';
  const vc = controllaVoci(s.comanda.voci);
  if (vc) return 'comanda.' + vc;
  const c = controllaElenco(s.contiAperti, 'contiAperti', controllaConto)
    ?? controllaElenco(s.crediti, 'crediti', e => controllaConto(e) ?? (isStr(e.dataChiusura) ? null : 'dataChiusura'))
    ?? controllaElenco(s.vendite, 'vendite', e =>
      !isStr(e.id) ? 'id' : !isStr(e.ora) ? 'ora' : !isTavolo(e.tavolo) ? 'tavolo' : !isStr(e.pagatoDa) ? 'pagatoDa'
        : !isImporto(e.totale) ? 'totale' : controllaVoci(e.voci))
    ?? controllaElenco(s.chiusure, 'chiusure', e =>
      !isStr(e.id) ? 'id' : !isStr(e.data) ? 'data' : !isStr(e.ora) ? 'ora' : !isStr(e.cassiere) ? 'cassiere'
        : !isImporto(e.fondoIniziale) ? 'fondoIniziale' : !isImporto(e.incassato) ? 'incassato' : !isImporto(e.consegnato) ? 'consegnato'
          : !isStr(e.causale) ? 'causale' : !isImporto(e.fondoSuccessivo) ? 'fondoSuccessivo'
            : !(Number.isInteger(e.creditiCreati) && (e.creditiCreati as number) >= 0) ? 'creditiCreati'
              : !(e.vendite === null || Array.isArray(e.vendite)) ? 'vendite' : null);
  if (c) return c;
  if (!isImporto(s.fondo)) return 'fondo';
  if (!(s.pin === null || (isObj(s.pin) && isStr(s.pin.salt) && s.pin.salt && isStr(s.pin.hash) && s.pin.hash))) return 'pin';
  return null;
}
