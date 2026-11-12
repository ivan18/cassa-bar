// Dati: backup (esporta, importa), configurazione dell'associazione (soci e PIN), intestazione, memoria del dispositivo.
// I file si scelgono con il selettore del dispositivo; il contenuto passa allo store, che lo accetta tutto o niente.
import { useRef, type ChangeEvent } from 'react';
import { spazioUsato, useCassa } from '../../stato/cassa';
import { ui } from '../../stato/ui';
import { caricaConfigurazione, esportaBackup, importaBackup } from '../azioni';
import { cx } from '../comuni/cx';

/** localStorage tiene circa 5 milioni di caratteri per sito. */
const CAPIENZA = 5_000_000;

const voce = 'grid min-h-[60px] w-full grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-0.5 rounded-[14px] bg-lav-2 p-3.5 text-left shadow-[inset_0_0_0_1px_theme(colors.lav.3)]';
const gruppo = 'text-[11px] font-semibold uppercase tracking-widest text-gesso-dim';

function Voce({ titolo, descrizione, segno, testId, onClick }: { titolo: string; descrizione: string; segno: string; testId: string; onClick: () => void }) {
  return (
    <button type="button" data-testid={testId} onClick={onClick} className={voce}>
      <b className="text-[15px]">{titolo}</b>
      <span className="col-start-1 text-xs text-gesso-dim">{descrizione}</span>
      <span aria-hidden="true" className="col-start-2 row-span-2 row-start-1 self-center text-xl leading-none text-gesso-dim">{segno}</span>
    </button>
  );
}

/** Legge il file scelto e svuota il selettore, così lo stesso file si può scegliere di nuovo. */
const leggiFile = (dopo: (testo: string, nome: string) => void) => async (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (file) dopo(await file.text(), file.name);
};

const mb = (caratteri: number) => (caratteri / 1_000_000).toFixed(2).replace('.', ',');

export function Dati() {
  const intestazione = useCassa(s => s.intestazione);
  const memoriaPiena = useCassa(s => s.memoriaPiena);
  useCassa(s => s.chiusure); // ridisegna la memoria usata quando l'archivio cambia
  const backup = useRef<HTMLInputElement>(null);
  const configurazione = useRef<HTMLInputElement>(null);
  const usato = spazioUsato();
  const quota = Math.min(1, usato / CAPIENZA);

  return (
    <>
      <h1 className="font-display text-3xl font-bold leading-none">Dati</h1>

      <section aria-label="Backup" className="flex flex-col gap-2">
        <span className={gruppo}>Backup</span>
        <Voce testId="esporta-backup" titolo="Esporta backup" descrizione="Tutti i dati in un file JSON; il PIN solo come hash" segno="↓" onClick={esportaBackup} />
        <Voce testId="scegli-backup" titolo="Importa backup" descrizione="Ripristina un file esportato da questa versione" segno="↑" onClick={() => backup.current?.click()} />
        <input ref={backup} type="file" accept=".json,application/json" hidden data-testid="importa-backup" onChange={leggiFile(importaBackup)} />
      </section>

      <section aria-label="Configurazione" className="flex flex-col gap-2">
        <span className={gruppo}>Configurazione</span>
        <Voce testId="scegli-configurazione" titolo="Carica configurazione" descrizione="Soci e PIN da un file privato dell'associazione" segno="↑" onClick={() => configurazione.current?.click()} />
        <input ref={configurazione} type="file" accept=".json,application/json" hidden data-testid="carica-configurazione" onChange={leggiFile(t => void caricaConfigurazione(t))} />
        <Voce testId="modifica-intestazione" titolo="Intestazione" descrizione={`${intestazione.associazione} · ${intestazione.cassa}`} segno="›" onClick={() => ui.getState().apriFoglio('intestazione')} />
      </section>

      <section aria-label="Memoria del dispositivo" className="flex flex-col gap-2.5 rounded-[14px] bg-lav-2 p-3.5 shadow-[inset_0_0_0_1px_theme(colors.lav.3)]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className={gruppo}>Memoria del dispositivo</span>
          <small data-testid="memoria-usata" className="text-xs tabular-nums text-gesso-dim">{mb(usato)} MB di circa 5 MB</small>
        </div>
        <div role="meter" aria-label="Memoria usata" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(quota * 100)} className="h-2 overflow-hidden rounded-full bg-lav-4">
          <span className={cx('block h-full rounded-full', memoriaPiena || quota > 0.85 ? 'bg-rosso' : 'bg-verde')} style={{ width: `${Math.max(quota * 100, 1)}%` }} />
        </div>
        <span className="text-xs text-gesso-dim">L'archivio delle chiusure cresce a ogni serata. Quando la memoria si riempie: esporta un backup, poi elimina le chiusure più vecchie dall'archivio.</span>
      </section>
    </>
  );
}
