// Anagrafica dei soci e soci seduti ai tavoli.
import type { Tavolo } from './costanti';
import type { StatoDominio } from './tipi';

const chiave = (nome: string) => nome.toLocaleLowerCase('it');
const pulisci = (nome: string) => nome.trim().replace(/\s+/g, ' ');

/** Ordine alfabetico italiano, senza differenze tra maiuscole, minuscole e accenti. */
export const ordinaSoci = (soci: readonly string[]) =>
  [...soci].sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));

export type EsitoSocio = 'aggiunto' | 'gia-presente' | 'vuoto';

/** Iscrive un socio; i doppioni (maiuscole/minuscole indifferenti) vengono ignorati. */
export function aggiungiSocio(soci: readonly string[], nome: string): { soci: string[]; esito: EsitoSocio; nome: string } {
  const pulito = pulisci(nome);
  if (!pulito) return { soci: [...soci], esito: 'vuoto', nome: pulito };
  if (soci.some(s => chiave(s) === chiave(pulito))) return { soci: [...soci], esito: 'gia-presente', nome: pulito };
  return { soci: ordinaSoci([...soci, pulito]), esito: 'aggiunto', nome: pulito };
}

/** Aggiunge in blocco (file di configurazione): niente vuoti, niente doppioni nel file né con l'anagrafica. */
export function aggiungiSoci(soci: readonly string[], nomi: readonly string[]): { soci: string[]; aggiunti: number; giaPresenti: number } {
  const dalFile: string[] = [];
  const visti = new Set<string>();
  for (const n of nomi.map(pulisci).filter(Boolean)) {
    if (!visti.has(chiave(n))) { visti.add(chiave(n)); dalFile.push(n); }
  }
  const noti = new Set(soci.map(chiave));
  const nuovi = dalFile.filter(n => !noti.has(chiave(n)));
  return { soci: ordinaSoci([...soci, ...nuovi]), aggiunti: nuovi.length, giaPresenti: dalFile.length - nuovi.length };
}

/** Elimina un socio dall'anagrafica e da ogni tavolo dove è seduto (D10). Le voci già battute restano. */
export function eliminaSocio(stato: Pick<StatoDominio, 'soci' | 'seduti'>, nome: string): Pick<StatoDominio, 'soci' | 'seduti'> {
  const seduti: StatoDominio['seduti'] = {};
  for (const [t, m] of Object.entries(stato.seduti) as [Tavolo, string[]][]) seduti[t] = m.filter(s => s !== nome);
  return { soci: stato.soci.filter(s => s !== nome), seduti };
}

/** Siede o alza un socio al tavolo. */
export function cambiaSeduto(seduti: StatoDominio['seduti'], tavolo: Tavolo, socio: string): StatoDominio['seduti'] {
  const attuali = seduti[tavolo] ?? [];
  return { ...seduti, [tavolo]: attuali.includes(socio) ? attuali.filter(s => s !== socio) : [...attuali, socio] };
}
