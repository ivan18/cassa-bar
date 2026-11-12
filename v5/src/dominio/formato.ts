// Conversioni tra dati e testo: importi, orari, date, iniziali, identificativi.
import type { Centesimi } from './tipi';

/** 250 → "€ 2,50" (spazio indivisibile: il simbolo non va mai a capo da solo). */
export function euro(centesimi: Centesimi): string {
  const c = Math.round(centesimi);
  const assoluto = Math.abs(c);
  const intero = Math.floor(assoluto / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimali = String(assoluto % 100).padStart(2, '0');
  return `${c < 0 ? '−' : ''}€ ${intero},${decimali}`;
}

/** Legge un importo scritto a mano ("2", "2,5", "2.50", "€ 3,00"). null se non è un importo valido. */
export function leggiImporto(testo: string): Centesimi | null {
  const pulito = testo.replace(/€/g, '').replace(/\s/g, '');
  if (!/^\d+([.,]\d{1,2})?$/.test(pulito)) return null;
  return Math.round(parseFloat(pulito.replace(',', '.')) * 100);
}

const due = (n: number) => String(n).padStart(2, '0');

/** "21:48" */
export const oraBreve = (d: Date) => `${due(d.getHours())}:${due(d.getMinutes())}`;
/** "12/11" */
export const dataBreve = (d: Date) => `${due(d.getDate())}/${due(d.getMonth() + 1)}`;
/** "12/11/2026" */
export const dataCompleta = (d: Date) => `${dataBreve(d)}/${d.getFullYear()}`;
/** "2026-11-12" (data locale, per i nomi dei file) */
export const dataFile = (d: Date) => `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;

/** Iniziale senza accenti, per il filtro A–Z: "Élia" → "E". */
export const iniziale = (nome: string) =>
  nome.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase();

/** Esadecimale casuale (crypto.getRandomValues funziona anche fuori da HTTPS). */
export function esadecimaleCasuale(byte: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(byte)), b => b.toString(16).padStart(2, '0')).join('');
}

/** Identificativo univoco per voci, conti, crediti, vendite, chiusure. */
export const nuovoId = () => `${Date.now().toString(36)}-${esadecimaleCasuale(6)}`;
