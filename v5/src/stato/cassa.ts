// Lo store dell'app: dati nel localStorage del dispositivo, PIN della build come riserva.
import { useStore } from 'zustand';
import { PIN_BUILD } from '../dominio/pinBuild';
import { creaArchivio } from './archivio';
import { creaStore, type StatoCassa } from './store';

const archivio = creaArchivio(
  typeof localStorage === 'undefined' ? undefined : localStorage,
  // rimandato di un istante: lo store potrebbe non essere ancora creato
  () => queueMicrotask(() => { if (!cassa.getState().memoriaPiena) cassa.setState({ memoriaPiena: true }); }),
);

export const cassa = creaStore({ archivio, pinBuild: PIN_BUILD });

/** Legge una parte dello stato; il componente si ridisegna solo quando quella parte cambia. */
export const useCassa = <T,>(selettore: (s: StatoCassa) => T): T => useStore(cassa, selettore);
