/** Unisce classi CSS saltando quelle false/vuote: cx('a', cond && 'b'). */
export const cx = (...classi: (string | false | null | undefined)[]) => classi.filter(Boolean).join(' ');

/** Elenco vuoto condiviso: i selettori di Zustand devono restituire sempre lo stesso riferimento. */
export const NESSUNO: readonly string[] = Object.freeze([]);
