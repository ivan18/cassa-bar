// Dove lo store salva i dati: localStorage, protetto da errori. Se la memoria è piena l'app non si blocca:
// il salvataggio fallisce, si avvisa e si continua (avviso "memoria piena" nella UI); al primo salvataggio
// riuscito (es. dopo aver eliminato chiusure vecchie) l'avviso sparisce.
import type { StateStorage } from 'zustand/middleware';

type Base = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function creaArchivio(base: Base | undefined, segnalaMemoriaPiena: () => void, segnalaSalvato: () => void = () => {}): StateStorage {
  return {
    getItem: nome => { try { return base?.getItem(nome) ?? null; } catch { return null; } },
    setItem: (nome, valore) => {
      try { base?.setItem(nome, valore); } catch { segnalaMemoriaPiena(); return; }
      segnalaSalvato();
    },
    removeItem: nome => { try { base?.removeItem(nome); } catch { /* niente da fare */ } },
  };
}

/** Archivio in memoria, per i test. `piena` simula la memoria esaurita. */
export function archivioInMemoria(): Base & { dati: Map<string, string>; piena: boolean } {
  const dati = new Map<string, string>();
  return {
    dati,
    piena: false,
    getItem(nome) { return dati.get(nome) ?? null; },
    setItem(nome, valore) {
      if (this.piena) throw new Error('QuotaExceededError');
      dati.set(nome, valore);
    },
    removeItem(nome) { dati.delete(nome); },
  };
}
