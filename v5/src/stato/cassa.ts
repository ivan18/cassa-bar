// Lo store dell'app: dati nel localStorage del dispositivo, PIN della build come riserva.
import { useStore } from 'zustand';
import { PIN_BUILD } from '../dominio/pinBuild';
import { creaArchivio } from './archivio';
import { CHIAVE_ARCHIVIO, creaStore, type StatoCassa } from './store';

const archivio = creaArchivio(
  typeof localStorage === 'undefined' ? undefined : localStorage,
  // rimandato di un istante: lo store potrebbe non essere ancora creato
  () => queueMicrotask(() => { if (!cassa.getState().memoriaPiena) cassa.setState({ memoriaPiena: true }); }),
  () => queueMicrotask(() => { if (cassa.getState().memoriaPiena) cassa.setState({ memoriaPiena: false }); }),
);

/** Spazio occupato dai dati della cassa sul dispositivo, in caratteri (localStorage ne tiene circa 5 milioni). */
export function spazioUsato(): number {
  try { return localStorage.getItem(CHIAVE_ARCHIVIO)?.length ?? 0; } catch { return 0; }
}

export const cassa = creaStore({ archivio, pinBuild: PIN_BUILD });

/** Legge una parte dello stato; il componente si ridisegna solo quando quella parte cambia. */
export const useCassa = <T,>(selettore: (s: StatoCassa) => T): T => useStore(cassa, selettore);
