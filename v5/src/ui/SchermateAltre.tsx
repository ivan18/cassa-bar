// Storico e Gestione. In Fase 3: lo Storico è un segnaposto; la Gestione ha già il PIN unico con blocco
// automatico (D8), il contenuto delle voci arriva nelle Fasi 5 e 6.
import { ui, useUi } from '../stato/ui';
import { InserimentoPin } from './comuni/InserimentoPin';
import { Pulsante } from './comuni/Pulsante';
import { Intestazione } from './Intestazione';

export function SchermataStorico() {
  return (
    <>
      <Intestazione />
      <h1 className="font-display text-3xl font-bold leading-none">Storico</h1>
      <p className="text-gesso-dim">Le vendite dall'ultima chiusura arrivano nella Fase 5 della v5.</p>
    </>
  );
}

const VOCI_GESTIONE = [
  ['Chiusura cassa', 'Fine serata: fondo, consegna al presidente, conti in crediti'],
  ['Archivio chiusure', 'Chiusure registrate, con i report'],
  ['Prodotti', 'Listino: aggiungi, modifica, elimina'],
  ['Soci', 'Iscrizioni ed eliminazioni'],
  ['Dati', 'Backup, configurazione, intestazione, memoria'],
] as const;

export function SchermataGestione() {
  const sbloccata = useUi(s => s.gestioneSbloccata);

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <Intestazione />
      <h1 className="font-display text-3xl font-bold leading-none">Gestione</h1>
      {!sbloccata ? (
        <div data-testid="gestione-bloccata" className="flex flex-col gap-3.5 rounded-[14px] bg-lav-2 p-3.5 shadow-[inset_0_0_0_1px_theme(colors.lav.3)]">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-gesso-dim">Area protetta</span>
          <p className="text-gesso-dim">Chiusura cassa, archivio, prodotti, soci e dati. Inserisci il PIN.</p>
          <InserimentoPin onCorretto={() => ui.getState().sbloccaGestione(Date.now())} />
        </div>
      ) : (
        <>
          <div data-testid="gestione-menu" className="flex flex-col gap-2">
            {VOCI_GESTIONE.map(([titolo, descrizione]) => (
              <div key={titolo} className="grid min-h-[60px] grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-0.5 rounded-[14px] bg-lav-2 p-3.5 opacity-60 shadow-[inset_0_0_0_1px_theme(colors.lav.3)]">
                <b className="text-[15px]">{titolo}</b>
                <span className="col-start-1 text-xs text-gesso-dim">{descrizione}</span>
                <span className="col-start-2 row-span-2 row-start-1 self-center text-xs text-gesso-dim">in arrivo</span>
              </div>
            ))}
          </div>
          <Pulsante data-testid="blocca" onClick={() => ui.getState().bloccaGestione()}>Blocca</Pulsante>
        </>
      )}
    </div>
  );
}
